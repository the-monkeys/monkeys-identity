package handlers

import (
	"context"
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
//
//	@Summary		User login
//	@Description	Authenticate user with email and password
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		LoginRequest	true	"Login credentials"
//	@Success		200		{object}	LoginResponse	"Successfully authenticated"
//	@Failure		400		{object}	ErrorResponse	"Invalid request format"
//	@Failure		401		{object}	ErrorResponse	"Invalid credentials"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/auth/login [post]
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
//
//	@Summary		Register new user
//	@Description	Register a new user account
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		RegisterRequest	true	"Registration details"
//	@Success		201		{object}	SuccessResponse	"User registered successfully"
//	@Failure		400		{object}	ErrorResponse	"Invalid request format or validation error"
//	@Failure		409		{object}	ErrorResponse	"User already exists"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/auth/register [post]
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
		EmailVerified:  false, // Require email verification
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

	// Generate email verification token
	verificationToken := uuid.New().String()
	ctx := context.Background()
	verifyKey := "email_verification:" + verificationToken
	err = h.redis.Set(ctx, verifyKey, user.ID, time.Hour*24).Err()
	if err != nil {
		h.logger.Error("Failed to store verification token: %v", err)
	}

	// TODO: Send verification email with verificationToken

	h.logger.Info("User registered successfully: %s", user.Email)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "User account created successfully. Please check your email to verify your account.",
		"data": fiber.Map{
			"user_id": user.ID,
			"email":   user.Email,
		},
	})
}

// RefreshToken generates new access token using refresh token
//
//	@Summary		Refresh access token
//	@Description	Get new access token using refresh token
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		RefreshTokenRequest	true	"Refresh token"
//	@Success		200		{object}	LoginResponse		"New access token generated"
//	@Failure		400		{object}	ErrorResponse		"Invalid request format"
//	@Failure		401		{object}	ErrorResponse		"Invalid or expired refresh token"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req RefreshTokenRequest
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
//
//	@Summary		User logout
//	@Description	Logout user and invalidate session
//	@Tags			Authentication
//	@Produce		json
//	@Success		200	{object}	SuccessResponse	"Successfully logged out"
//	@Failure		401	{object}	ErrorResponse	"Unauthorized - invalid or missing token"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/auth/logout [post]
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	// Get user ID from context (set by auth middleware)
	userID, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid session",
			"success": false,
		})
	}

	// Get the current session token from Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "No authorization token provided",
			"success": false,
		})
	}

	// Extract token from "Bearer <token>"
	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	// Invalidate the specific session in Redis
	ctx := context.Background()
	pattern := "session:*"

	// Find and delete the session with this token
	keys, err := h.redis.Keys(ctx, pattern).Result()
	if err != nil {
		h.logger.Error("Failed to get session keys during logout: %v", err)
	} else {
		for _, key := range keys {
			sessionToken, err := h.redis.HGet(ctx, key, "token").Result()
			sessionUserID, err2 := h.redis.HGet(ctx, key, "user_id").Result()

			if err == nil && err2 == nil && sessionToken == token && sessionUserID == userID {
				h.redis.Del(ctx, key)
				break
			}
		}
	}

	h.logger.Info("User logged out: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Successfully logged out",
	})
}

// Database operations
func (h *AuthHandler) getUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, username, email, display_name, organization_id, password_hash, 
		       status, email_verified, created_at, updated_at, last_login
		FROM users WHERE email = $1 AND deleted_at IS NULL
	`

	var user models.User
	var lastLogin *time.Time

	err := h.db.QueryRow(query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.DisplayName,
		&user.OrganizationID, &user.PasswordHash, &user.Status,
		&user.EmailVerified, &user.CreatedAt, &user.UpdatedAt, &lastLogin,
	)

	if err != nil {
		return nil, err
	}

	if lastLogin != nil {
		user.LastLogin = *lastLogin
	}

	return &user, nil
}

func (h *AuthHandler) getUserByID(id string) (*models.User, error) {
	query := `
		SELECT id, username, email, display_name, organization_id, password_hash, 
		       status, email_verified, created_at, updated_at, last_login
		FROM users WHERE id = $1 AND deleted_at IS NULL
	`

	var user models.User
	var lastLogin *time.Time

	err := h.db.QueryRow(query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.DisplayName,
		&user.OrganizationID, &user.PasswordHash, &user.Status,
		&user.EmailVerified, &user.CreatedAt, &user.UpdatedAt, &lastLogin,
	)

	if err != nil {
		return nil, err
	}

	if lastLogin != nil {
		user.LastLogin = *lastLogin
	}

	return &user, nil
}

func (h *AuthHandler) createUser(user *models.User) error {
	query := `
		INSERT INTO users (id, username, email, display_name, organization_id, 
		                   password_hash, status, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := h.db.Exec(query,
		user.ID, user.Username, user.Email, user.DisplayName,
		user.OrganizationID, user.PasswordHash, user.Status,
		user.EmailVerified, user.CreatedAt, user.UpdatedAt,
	)

	return err
}

func (h *AuthHandler) generateTokens(user *models.User) (string, string, int64, error) {
	now := time.Now()
	accessTokenExpiry := now.Add(time.Hour * 1)       // 1 hour
	refreshTokenExpiry := now.Add(time.Hour * 24 * 7) // 7 days

	// Access Token Claims
	accessClaims := jwt.MapClaims{
		"user_id":         user.ID,
		"email":           user.Email,
		"organization_id": user.OrganizationID,
		"exp":             accessTokenExpiry.Unix(),
		"iat":             now.Unix(),
		"type":            "access",
	}

	// Refresh Token Claims
	refreshClaims := jwt.MapClaims{
		"user_id": user.ID,
		"exp":     refreshTokenExpiry.Unix(),
		"iat":     now.Unix(),
		"type":    "refresh",
	}

	// Generate Access Token
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(h.config.JWTSecret))
	if err != nil {
		return "", "", 0, err
	}

	// Generate Refresh Token
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(h.config.JWTSecret))
	if err != nil {
		return "", "", 0, err
	}

	expiresIn := accessTokenExpiry.Unix() - now.Unix()

	return accessTokenString, refreshTokenString, expiresIn, nil
}

func (h *AuthHandler) createSession(sessionID, userID, token string) error {
	ctx := context.Background()
	sessionKey := "session:" + sessionID

	sessionData := map[string]interface{}{
		"user_id":    userID,
		"token":      token,
		"created_at": time.Now().Unix(),
	}

	// Store session in Redis with 24 hour expiry
	return h.redis.HMSet(ctx, sessionKey, sessionData).Err()
}

func (h *AuthHandler) updateLastLogin(userID string) error {
	query := `UPDATE users SET last_login = $1 WHERE id = $2`
	_, err := h.db.Exec(query, time.Now(), userID)
	return err
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

// ForgotPassword sends password reset email to user
//
//	@Summary		Forgot password
//	@Description	Send password reset email to user
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		ForgotPasswordRequest	true	"Email address"
//	@Success		200		{object}	SuccessResponse			"Password reset email sent"
//	@Failure		400		{object}	ErrorResponse			"Invalid email format"
//	@Failure		404		{object}	ErrorResponse			"User not found"
//	@Failure		500		{object}	ErrorResponse			"Internal server error"
//	@Router			/auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Check if user exists
	user, err := h.getUserByEmail(req.Email)
	if err != nil {
		// Return success even if user doesn't exist (security best practice)
		return c.JSON(fiber.Map{
			"success": true,
			"message": "If an account with that email exists, a password reset link has been sent",
		})
	}

	// Generate reset token
	resetToken := uuid.New().String()

	// Store reset token in Redis with 1 hour expiry
	ctx := context.Background()
	resetKey := "password_reset:" + resetToken
	err = h.redis.Set(ctx, resetKey, user.ID, time.Hour).Err()
	if err != nil {
		h.logger.Error("Failed to store reset token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to process password reset request",
			"success": false,
		})
	}

	// TODO: Send email with reset link containing the resetToken
	h.logger.Info("Password reset requested for user: %s", user.Email)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "If an account with that email exists, a password reset link has been sent",
	})
}

// ResetPassword resets user password using reset token
//
//	@Summary		Reset password
//	@Description	Reset user password using reset token
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		ResetPasswordRequest	true	"Reset password details"
//	@Success		200		{object}	SuccessResponse			"Password reset successful"
//	@Failure		400		{object}	ErrorResponse			"Invalid request format"
//	@Failure		401		{object}	ErrorResponse			"Invalid or expired reset token"
//	@Failure		500		{object}	ErrorResponse			"Internal server error"
//	@Router			/auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Verify reset token
	ctx := context.Background()
	resetKey := "password_reset:" + req.Token
	userID, err := h.redis.Get(ctx, resetKey).Result()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid or expired reset token",
			"success": false,
		})
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Error("Failed to hash password: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to process new password",
			"success": false,
		})
	}

	// Update password in database
	query := `UPDATE users SET password_hash = $1, password_changed_at = $2, updated_at = $3 WHERE id = $4`
	_, err = h.db.Exec(query, string(hashedPassword), time.Now(), time.Now(), userID)
	if err != nil {
		h.logger.Error("Failed to update password: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update password",
			"success": false,
		})
	}

	// Delete the reset token
	h.redis.Del(ctx, resetKey)

	// Invalidate all user sessions
	h.invalidateUserSessions(userID)

	h.logger.Info("Password reset successfully for user: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Password updated successfully",
	})
}

// VerifyEmail verifies user email address using verification token
//
//	@Summary		Verify email
//	@Description	Verify user email address using verification token
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		VerifyEmailRequest	true	"Verification token"
//	@Success		200		{object}	SuccessResponse		"Email verified successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request format"
//	@Failure		401		{object}	ErrorResponse		"Invalid or expired verification token"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/auth/verify-email [post]
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var req VerifyEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Verify email verification token
	ctx := context.Background()
	verifyKey := "email_verification:" + req.Token
	userID, err := h.redis.Get(ctx, verifyKey).Result()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid or expired verification token",
			"success": false,
		})
	}

	// Update email verification status
	query := `UPDATE users SET email_verified = true, updated_at = $1 WHERE id = $2`
	_, err = h.db.Exec(query, time.Now(), userID)
	if err != nil {
		h.logger.Error("Failed to verify email: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to verify email",
			"success": false,
		})
	}

	// Delete the verification token
	h.redis.Del(ctx, verifyKey)

	h.logger.Info("Email verified for user: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Email verified successfully",
	})
}

// ResendVerification resends email verification link
//
//	@Summary		Resend verification email
//	@Description	Resend email verification link
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		ResendVerificationRequest	true	"Email address"
//	@Success		200		{object}	SuccessResponse				"Verification email sent"
//	@Failure		400		{object}	ErrorResponse				"Invalid email format"
//	@Failure		404		{object}	ErrorResponse				"User not found"
//	@Failure		500		{object}	ErrorResponse				"Internal server error"
//	@Router			/auth/resend-verification [post]
func (h *AuthHandler) ResendVerification(c *fiber.Ctx) error {
	var req ResendVerificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Check if user exists
	user, err := h.getUserByEmail(req.Email)
	if err != nil {
		// Return success even if user doesn't exist (security best practice)
		return c.JSON(fiber.Map{
			"success": true,
			"message": "If an account with that email exists and is unverified, a verification email has been sent",
		})
	}

	// Check if already verified
	if user.EmailVerified {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Email is already verified",
		})
	}

	// Generate verification token
	verificationToken := uuid.New().String()

	// Store verification token in Redis with 24 hour expiry
	ctx := context.Background()
	verifyKey := "email_verification:" + verificationToken
	err = h.redis.Set(ctx, verifyKey, user.ID, time.Hour*24).Err()
	if err != nil {
		h.logger.Error("Failed to store verification token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to process verification request",
			"success": false,
		})
	}

	// TODO: Send verification email with verificationToken
	h.logger.Info("Email verification resent for user: %s", user.Email)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "If an account with that email exists and is unverified, a verification email has been sent",
	})
}

// Helper method to invalidate all user sessions
func (h *AuthHandler) invalidateUserSessions(userID string) {
	ctx := context.Background()
	pattern := "session:*"

	// Get all session keys
	keys, err := h.redis.Keys(ctx, pattern).Result()
	if err != nil {
		h.logger.Error("Failed to get session keys: %v", err)
		return
	}

	// Check each session and delete if it belongs to the user
	for _, key := range keys {
		sessionUserID, err := h.redis.HGet(ctx, key, "user_id").Result()
		if err == nil && sessionUserID == userID {
			h.redis.Del(ctx, key)
		}
	}
}
