package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db     *database.DB
	redis  *redis.Client
	logger *logger.Logger
	config *config.Config
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type RegisterRequest struct {
	Username       string `json:"username" validate:"required,min=3,max=50"`
	Email          string `json:"email" validate:"required,email"`
	Password       string `json:"password" validate:"required,min=8"`
	DisplayName    string `json:"display_name" validate:"required"`
	OrganizationID string `json:"organization_id" validate:"required,uuid"`
}

type LoginResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	ExpiresIn    int64       `json:"expires_in"`
	TokenType    string      `json:"token_type"`
	User         models.User `json:"user"`
}

func NewAuthHandler(db *database.DB, redis *redis.Client, logger *logger.Logger, config *config.Config) *AuthHandler {
	return &AuthHandler{
		db:     db,
		redis:  redis,
		logger: logger,
		config: config,
	}
}

// Login authenticates user and returns JWT tokens
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		h.logger.Warn("Invalid login request: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Email and password are required",
			"success": false,
		})
	}

	// Get user from database
	user, err := h.getUserByEmail(req.Email)
	if err != nil {
		h.logger.Warn("User not found: %s", req.Email)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid credentials",
			"success": false,
		})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		h.logger.Warn("Invalid password for user: %s", req.Email)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid credentials",
			"success": false,
		})
	}

	// Check if user is active
	if user.Status != "active" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   "Account is not active",
			"success": false,
		})
	}

	// Generate tokens
	accessToken, refreshToken, expiresIn, err := h.generateTokens(user)
	if err != nil {
		h.logger.Error("Failed to generate tokens: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate authentication tokens",
			"success": false,
		})
	}

	// Create session
	sessionID := uuid.New().String()
	if err := h.createSession(sessionID, user.ID, accessToken); err != nil {
		h.logger.Error("Failed to create session: %v", err)
	}

	// Update last login
	h.updateLastLogin(user.ID)

	// Log successful login
	h.logger.Info("User logged in successfully: %s", user.Email)

	return c.JSON(fiber.Map{
		"success": true,
		"data": LoginResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    expiresIn,
			TokenType:    "Bearer",
			User:         *user,
		},
	})
}

// Register creates a new user account
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Check if user already exists
	existingUser, _ := h.getUserByEmail(req.Email)
	if existingUser != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "User with this email already exists",
			"success": false,
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Error("Failed to hash password: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to process password",
			"success": false,
		})
	}

	// Create user
	user := &models.User{
		ID:             uuid.New().String(),
		Username:       req.Username,
		Email:          req.Email,
		DisplayName:    req.DisplayName,
		OrganizationID: req.OrganizationID,
		PasswordHash:   string(hashedPassword),
		Status:         "active",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := h.createUser(user); err != nil {
		h.logger.Error("Failed to create user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create user account",
			"success": false,
		})
	}

	h.logger.Info("User registered successfully: %s", user.Email)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "User account created successfully",
		"data": fiber.Map{
			"user_id": user.ID,
			"email":   user.Email,
		},
	})
}

// RefreshToken generates new access token using refresh token
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token" validate:"required"`
	}

	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Validate refresh token
	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		return []byte(h.config.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid refresh token",
			"success": false,
		})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid token claims",
			"success": false,
		})
	}

	userID := claims["user_id"].(string)
	user, err := h.getUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "User not found",
			"success": false,
		})
	}

	// Generate new access token
	accessToken, _, expiresIn, err := h.generateTokens(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate new token",
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"access_token": accessToken,
			"expires_in":   expiresIn,
			"token_type":   "Bearer",
		},
	})
}

// Logout invalidates the current session
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	// Get user ID from context (set by auth middleware)
	userID := c.Locals("user_id").(string)

	// Invalidate session in Redis
	// Implementation would revoke the current session

	h.logger.Info("User logged out: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Successfully logged out",
	})
}

// Placeholder methods - these would contain actual database operations
func (h *AuthHandler) getUserByEmail(email string) (*models.User, error) {
	// TODO: Implement database query
	return nil, nil
}

func (h *AuthHandler) getUserByID(id string) (*models.User, error) {
	// TODO: Implement database query
	return nil, nil
}

func (h *AuthHandler) createUser(user *models.User) error {
	// TODO: Implement database insert
	return nil
}

func (h *AuthHandler) generateTokens(user *models.User) (string, string, int64, error) {
	// TODO: Implement JWT token generation
	return "", "", 0, nil
}

func (h *AuthHandler) createSession(sessionID, userID, token string) error {
	// TODO: Implement session creation in Redis
	return nil
}

func (h *AuthHandler) updateLastLogin(userID string) error {
	// TODO: Implement last login update
	return nil
}

// MFA placeholder methods
func (h *AuthHandler) SetupMFA(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "MFA setup endpoint"})
}

func (h *AuthHandler) VerifyMFA(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "MFA verification endpoint"})
}

func (h *AuthHandler) GenerateBackupCodes(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Generate backup codes endpoint"})
}

func (h *AuthHandler) DisableMFA(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Disable MFA endpoint"})
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Forgot password endpoint"})
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Reset password endpoint"})
}

func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Verify email endpoint"})
}

func (h *AuthHandler) ResendVerification(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Resend verification endpoint"})
}
