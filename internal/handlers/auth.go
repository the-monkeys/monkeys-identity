package handlers

import (
	"context"
	"crypto/rsa"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/internal/services"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
	"github.com/the-monkeys/monkeys-identity/pkg/utils"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	queries    *queries.Queries
	redis      *redis.Client
	logger     *logger.Logger
	config     *config.Config
	audit      services.AuditService
	mfa        services.MFAService
	email      services.EmailService
	privateKey *rsa.PrivateKey
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

type CreateAdminRequest struct {
	Username       string `json:"username" validate:"required,min=3,max=50"`
	Email          string `json:"email" validate:"required,email"`
	Password       string `json:"password" validate:"required,min=8"`
	DisplayName    string `json:"display_name" validate:"required"`
	OrganizationID string `json:"organization_id,omitempty"`
}

func NewAuthHandler(queries *queries.Queries, redis *redis.Client, logger *logger.Logger, config *config.Config, audit services.AuditService, mfa services.MFAService, email services.EmailService) *AuthHandler {
	h := &AuthHandler{
		queries: queries,
		redis:   redis,
		logger:  logger,
		config:  config,
		audit:   audit,
		mfa:     mfa,
		email:   email,
	}

	// Load RS256 private key for asymmetric token signing
	if config.JWTPrivateKey != "" {
		if priv, err := utils.LoadRSAPrivateKey(config.JWTPrivateKey); err == nil {
			h.privateKey = priv
		} else {
			logger.Error("Failed to load JWT private key: %v", err)
		}
	}

	// Generate a temporary key if none provided (useful for development)
	if h.privateKey == nil {
		h.logger.Warn("AuthHandler: No valid OIDC private key available. Token signing will fail.")
	}

	return h
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

	// Trim spaces and normalize email
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	// Validate input
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Email and password are required",
			"success": false,
		})
	}

	// Get user from database
	user, err := h.queries.Auth.GetUserByEmail(req.Email, "")
	if err != nil {
		h.logger.Warn("User not found: %s", req.Email)
		h.audit.LogLogin(c.Context(), "", "", c.IP(), c.Get("User-Agent"), false, "user_not_found")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid credentials",
			"success": false,
		})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		h.logger.Warn("Invalid password for user: %s", req.Email)
		h.audit.LogLogin(c.Context(), user.OrganizationID, user.ID, c.IP(), c.Get("User-Agent"), false, "invalid_password")
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

	// Check if MFA is enabled
	if user.MFAEnabled {
		h.logger.Info("MFA required for user: %s", user.Email)
		// Generate a temporary token for MFA verification
		mfaToken := uuid.New().String()
		// Store userID and orgID in Redis with 5 min expiry
		err = h.redis.Set(c.Context(), "mfa_login:"+mfaToken, user.ID+":"+user.OrganizationID, 5*time.Minute).Err()
		if err != nil {
			h.logger.Error("Failed to store MFA login token: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Internal server error",
				"success": false,
			})
		}

		return c.JSON(fiber.Map{
			"success":      true,
			"mfa_required": true,
			"mfa_token":    mfaToken,
		})
	}

	// Generate tokens
	accessID := uuid.New().String()
	refreshID := uuid.New().String()
	accessToken, refreshToken, expiresIn, err := h.generateTokens(user, accessID, refreshID)
	if err != nil {
		h.logger.Error("Failed to generate tokens: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate authentication tokens",
			"success": false,
		})
	}

	// Create session
	ipAddr := c.IP()
	userAgent := c.Get("User-Agent")
	session := &models.Session{
		ID:             accessID,
		SessionToken:   accessToken,
		PrincipalID:    user.ID,
		PrincipalType:  "user",
		OrganizationID: user.OrganizationID,
		Permissions:    "{}",
		Context:        "{}",
		Location:       "{}",
		MFAVerified:    user.MFAEnabled,
		IPAddress:      &ipAddr,
		UserAgent:      &userAgent,
		IssuedAt:       time.Now(),
		ExpiresAt:      time.Now().Add(time.Duration(expiresIn) * time.Second),
		LastUsedAt:     time.Now(),
		Status:         "active",
	}
	if err := h.queries.Session.CreateSession(session); err != nil {
		h.logger.Error("Failed to create session: %v", err)
	}

	// Update last login
	h.queries.Auth.UpdateLastLogin(user.ID, user.OrganizationID)

	// Log successful login
	h.audit.LogLogin(c.Context(), user.OrganizationID, user.ID, c.IP(), c.Get("User-Agent"), true, "")
	h.logger.Info("User logged in successfully: %s", user.Email)

	// Set access token cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(time.Duration(expiresIn) * time.Second),
		HTTPOnly: true,
		Secure:   h.config.Environment == "production",
		SameSite: "Lax",
		Path:     "/",
		Domain:   h.config.CookieDomain,
	})

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

// LoginMFAVerify verifies MFA code during login
func (h *AuthHandler) LoginMFAVerify(c *fiber.Ctx) error {
	var req struct {
		MFAToken string `json:"mfa_token" validate:"required"`
		Code     string `json:"code" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Get user info from Redis
	val, err := h.redis.Get(c.Context(), "mfa_login:"+req.MFAToken).Result()
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid or expired MFA token",
			"success": false,
		})
	}

	// Parse userID and orgID
	// Expecting "userID:orgID"
	parts := strings.Split(val, ":")
	if len(parts) != 2 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Internal server error",
			"success": false,
		})
	}
	userID := parts[0]
	orgID := parts[1]

	user, err := h.queries.Auth.GetUserByID(userID, orgID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "User not found",
			"success": false,
		})
	}

	// Verify TOTP
	if !h.mfa.VerifyTOTP(req.Code, user.TOTPSecret) {
		h.audit.LogEvent(c.Context(), models.AuditEvent{
			OrganizationID: user.OrganizationID,
			PrincipalID:    utils.StringPtr(user.ID),
			PrincipalType:  utils.StringPtr("user"),
			Action:         "login_mfa_failed",
			Result:         "failure",
			Severity:       "MEDIUM",
		})
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid MFA code",
			"success": false,
		})
	}

	// Generate tokens
	accessID := uuid.New().String()
	refreshID := uuid.New().String()
	accessToken, refreshToken, expiresIn, err := h.generateTokens(user, accessID, refreshID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate tokens",
			"success": false,
		})
	}

	// Create session
	ipAddr := c.IP()
	userAgent := c.Get("User-Agent")
	session := &models.Session{
		ID:             accessID,
		SessionToken:   accessToken,
		PrincipalID:    user.ID,
		PrincipalType:  "user",
		OrganizationID: user.OrganizationID,
		Permissions:    "{}",
		Context:        "{}",
		Location:       "{}",
		MFAVerified:    true,
		IPAddress:      &ipAddr,
		UserAgent:      &userAgent,
		IssuedAt:       time.Now(),
		ExpiresAt:      time.Now().Add(time.Duration(expiresIn) * time.Second),
		LastUsedAt:     time.Now(),
		Status:         "active",
	}
	if err := h.queries.Session.CreateSession(session); err != nil {
		h.logger.Error("Failed to create session: %v", err)
	}

	// Update last login
	h.queries.Auth.UpdateLastLogin(user.ID, user.OrganizationID)

	// Invalidate MFA login token
	h.redis.Del(c.Context(), "mfa_login:"+req.MFAToken)

	h.audit.LogLogin(c.Context(), user.OrganizationID, user.ID, c.IP(), c.Get("User-Agent"), true, "")

	// Set access token cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(time.Duration(expiresIn) * time.Second),
		HTTPOnly: true,
		Secure:   h.config.Environment == "production",
		SameSite: "Lax",
		Path:     "/",
		Domain:   h.config.CookieDomain,
	})

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

	// Email normalization
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	// Check if user already exists
	existingUser, _ := h.queries.Auth.GetUserByEmail(req.Email, req.OrganizationID)
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

	if err := h.queries.Auth.CreateUser(user); err != nil {
		h.logger.Error("Failed to create user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create user account",
			"success": false,
		})
	}

	// Generate email verification token
	verificationToken := uuid.New().String()
	err = h.queries.Auth.SetEmailVerificationToken(user.ID, verificationToken, time.Hour*24)
	if err != nil {
		h.logger.Error("Failed to store verification token: %v", err)
	}

	// Send verification email with verificationToken
	err = h.email.SendVerificationEmail(user.Email, user.Username, verificationToken)
	if err != nil {
		h.logger.Error("Failed to send verification email: %v", err)
		// We still return success as the user was created, but they might need to resend the verification email
	}

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
	orgID := claims["organization_id"].(string)
	user, err := h.queries.Auth.GetUserByID(userID, orgID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "User not found",
			"success": false,
		})
	}

	// Generate new access token
	accessID := uuid.New().String()
	refreshID := uuid.New().String()
	accessToken, _, expiresIn, err := h.generateTokens(user, accessID, refreshID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate new token",
			"success": false,
		})
	}

	// Update or Create session for the refreshed token if needed
	// For now, just generate the token. Ideally we'd link this to an existing session.

	// Set access token in cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(time.Duration(expiresIn) * time.Second),
		HTTPOnly: true,
		Secure:   h.config.Environment == "production",
		SameSite: "Lax",
		Path:     "/",
		Domain:   h.config.CookieDomain,
	})

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

	// Find session by token and revoke it in database
	orgID := c.Locals("organization_id").(string)
	if session, err := h.queries.Session.GetSessionByToken(token, orgID); err == nil {
		h.queries.Session.RevokeSession(session.ID, orgID)
	}

	// Invalidate legacy session in Redis if patterns match
	h.queries.Auth.DeleteSession(token)

	// Blacklist the access token
	// Parse token without validation (we just want claims) to get JTI and Exp
	parsedToken, _, err := new(jwt.Parser).ParseUnverified(token, jwt.MapClaims{})
	if err == nil {
		if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
			if jti, ok := claims["jti"].(string); ok {
				var exp int64
				if expFloat, ok := claims["exp"].(float64); ok {
					exp = int64(expFloat)
				}

				ttl := time.Duration(exp-time.Now().Unix()) * time.Second
				if ttl > 0 {
					// Store in Redis blacklist
					h.redis.Set(c.Context(), "blacklist:"+jti, "revoked", ttl)
				}
			}
		}
	}

	h.logger.Info("User logged out: %s", userID)

	// Clear access token cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HTTPOnly: true,
		Secure:   h.config.Environment == "production",
		SameSite: "Lax",
		Path:     "/",
		Domain:   h.config.CookieDomain,
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Successfully logged out",
	})
}

// CreateAdminUser creates an admin user with all privileges (bootstrap endpoint)
//
//	@Summary		Create admin user
//	@Description	Create an admin user with all privileges for initial system setup
//	@Tags			Authentication
//	@Accept			json
//	@Produce		json
//	@Param			request	body		CreateAdminRequest	true	"Admin user creation details"
//	@Success		201		{object}	SuccessResponse		"Admin user created successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request format or validation error"
//	@Failure		409		{object}	ErrorResponse		"User already exists or admin already exists"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/auth/create-admin [post]
func (h *AuthHandler) CreateAdminUser(c *fiber.Ctx) error {
	var req CreateAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Email normalization
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	// Check if any admin user already exists to prevent multiple admin creation
	adminExists, err := h.queries.Auth.CheckAdminExists()
	if err != nil {
		h.logger.Error("Failed to check admin existence: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to verify system state",
			"success": false,
		})
	}

	if adminExists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "Admin user already exists in the system",
			"success": false,
		})
	}

	// Check if user already exists
	existingUser, _ := h.queries.Auth.GetUserByEmail(req.Email, req.OrganizationID)
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

	// Use provided organization or allow query layer to fall back to default
	orgID := req.OrganizationID

	// Create admin user
	user := &models.User{
		ID:             uuid.New().String(),
		Username:       req.Username,
		Email:          req.Email,
		DisplayName:    req.DisplayName,
		OrganizationID: orgID,
		PasswordHash:   string(hashedPassword),
		Status:         "active",
		EmailVerified:  true, // Admin users are pre-verified
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Create user and assign admin role in a transaction
	err = h.queries.Auth.CreateAdminUser(user)
	if err != nil {
		if errors.Is(err, queries.ErrOrganizationNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "Specified organization does not exist",
				"success": false,
			})
		}

		h.logger.Error("Failed to create admin user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create admin user",
			"success": false,
		})
	}

	h.logger.Info("Admin user created successfully: %s", user.Email)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Admin user created successfully",
		"data": fiber.Map{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     "admin",
		},
	})
}

// generateTokens creates JWT access and refresh tokens for a user
func (h *AuthHandler) generateTokens(user *models.User, accessID, refreshID string) (string, string, int64, error) {
	now := time.Now()
	accessTokenExpiry := now.Add(time.Hour * 1)       // 1 hour
	refreshTokenExpiry := now.Add(time.Hour * 24 * 7) // 7 days

	roleName := "user"
	if h.queries != nil && h.queries.Auth != nil {
		if fetchedRole, err := h.queries.Auth.GetPrimaryRoleForUser(user.ID, user.OrganizationID); err == nil && fetchedRole != "" {
			roleName = fetchedRole
		} else if err != nil {
			h.logger.Warn("Failed to resolve primary role for user %s: %v", user.ID, err)
		}
	}

	// Access Token Claims
	accessClaims := jwt.MapClaims{
		"iss":             h.config.OIDCIssuer,
		"sub":             user.ID,
		"jti":             accessID,
		"user_id":         user.ID,
		"email":           user.Email,
		"organization_id": user.OrganizationID,
		"role":            roleName,
		"exp":             accessTokenExpiry.Unix(),
		"iat":             now.Unix(),
		"type":            "access",
	}

	// Refresh Token Claims
	refreshClaims := jwt.MapClaims{
		"sub":     user.ID,
		"jti":     refreshID,
		"user_id": user.ID,
		"exp":     refreshTokenExpiry.Unix(),
		"iat":     now.Unix(),
		"type":    "refresh",
	}

	// Generate Access Token using RS256
	accessToken := jwt.NewWithClaims(jwt.SigningMethodRS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(h.privateKey)
	if err != nil {
		return "", "", 0, err
	}

	// Generate Refresh Token using RS256
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodRS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(h.privateKey)
	if err != nil {
		return "", "", 0, err
	}

	expiresIn := accessTokenExpiry.Unix() - now.Unix()

	return accessTokenString, refreshTokenString, expiresIn, nil
}

// SetupMFA sets up multi-factor authentication for a user
//
//	@Summary		Setup MFA
//	@Description	Set up multi-factor authentication for the authenticated user
//	@Tags			MFA
//	@Accept			json
//	@Produce		json
//	@Security		Bearer
//	@Param			request	body		models.SetupMFARequest	true	"MFA setup details"
//	@Success		200		{object}	models.SetupMFAResponse
//	@Failure		400		{object}	ErrorResponse
//	@Failure		401		{object}	ErrorResponse
//	@Failure		500		{object}	ErrorResponse
//	@Router			/auth/mfa/setup [post]
func (h *AuthHandler) SetupMFA(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	orgID := c.Locals("organization_id").(string)

	// Get user to check if MFA is already enabled
	user, err := h.queries.Auth.GetUserByID(userID, orgID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to retrieve user",
			"success": false,
		})
	}

	if user.MFAEnabled {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "MFA is already enabled for this account",
			"success": false,
		})
	}

	// Generate TOTP secret and QR code
	secret, provisionURL, qrCodeBase64, err := h.mfa.GenerateTOTPSecret(userID, user.Email)
	if err != nil {
		h.logger.Error("Failed to generate TOTP secret: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate MFA secret",
			"success": false,
		})
	}

	// Store secret in Redis temporarily (10 min) until user verifies with a code
	err = h.redis.Set(c.Context(), "mfa_setup:"+userID, secret, 10*time.Minute).Err()
	if err != nil {
		h.logger.Error("Failed to store MFA setup secret: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to initiate MFA setup",
			"success": false,
		})
	}

	h.audit.LogEvent(c.Context(), models.AuditEvent{
		OrganizationID: orgID,
		PrincipalID:    utils.StringPtr(userID),
		PrincipalType:  utils.StringPtr("user"),
		Action:         "mfa_setup_initiated",
		Result:         "success",
		Severity:       "MEDIUM",
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "MFA setup initiated. Scan the QR code with your authenticator app, then verify with a code.",
		"data": models.SetupMFAResponse{
			Secret:  secret,
			QRCode:  qrCodeBase64,
			Message: provisionURL,
		},
	})
}

// VerifyMFA verifies a multi-factor authentication code
//
//	@Summary		Verify MFA
//	@Description	Verify multi-factor authentication code for login
//	@Tags			MFA
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.VerifyMFARequest	true	"MFA verification details"
//	@Success		200		{object}	LoginResponse
//	@Failure		400		{object}	ErrorResponse
//	@Failure		401		{object}	ErrorResponse
//	@Failure		500		{object}	ErrorResponse
//	@Router			/auth/mfa/verify [post]
func (h *AuthHandler) VerifyMFA(c *fiber.Ctx) error {
	var req models.VerifyMFARequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	userID := c.Locals("user_id").(string)
	orgID := c.Locals("organization_id").(string)

	// Check if this is MFA setup verification
	secret, err := h.redis.Get(c.Context(), "mfa_setup:"+userID).Result()
	if err == nil {
		if h.mfa.VerifyTOTP(req.Code, secret) {
			backupCodes := h.mfa.GenerateBackupCodes(10)
			err = h.queries.Auth.EnableMFA(userID, orgID, secret, backupCodes)
			if err != nil {
				h.logger.Error("Failed to enable MFA for user: %v", err)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":   "Failed to complete MFA setup",
					"success": false,
				})
			}

			h.redis.Del(c.Context(), "mfa_setup:"+userID)
			h.audit.LogEvent(c.Context(), models.AuditEvent{
				OrganizationID: orgID,
				PrincipalID:    utils.StringPtr(userID),
				PrincipalType:  utils.StringPtr("user"),
				Action:         "mfa_setup_complete",
				Result:         "success",
				Severity:       "MEDIUM",
			})

			return c.JSON(fiber.Map{
				"success": true,
				"message": "MFA setup complete",
				"data": models.BackupCodesResponse{
					BackupCodes: backupCodes,
					Message:     "Save these backup codes in a safe place",
				},
			})
		}
	}

	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error":   "Invalid MFA code",
		"success": false,
	})
}

// GenerateBackupCodes generates backup codes for MFA
//
//	@Summary		Generate MFA backup codes
//	@Description	Generate backup codes for multi-factor authentication recovery
//	@Tags			MFA
//	@Accept			json
//	@Produce		json
//	@Security		Bearer
//	@Success		200	{object}	models.BackupCodesResponse
//	@Failure		401	{object}	ErrorResponse
//	@Failure		500	{object}	ErrorResponse
//	@Router			/auth/mfa/backup-codes [post]
func (h *AuthHandler) GenerateBackupCodes(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	orgID := c.Locals("organization_id").(string)

	// Verify MFA is enabled before regenerating backup codes
	user, err := h.queries.Auth.GetUserByID(userID, orgID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to retrieve user",
			"success": false,
		})
	}

	if !user.MFAEnabled {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "MFA is not enabled. Please set up MFA first.",
			"success": false,
		})
	}

	// Generate new backup codes
	backupCodes := h.mfa.GenerateBackupCodes(10)

	// Update user's backup codes in database
	err = h.queries.Auth.UpdateBackupCodes(userID, orgID, backupCodes)
	if err != nil {
		h.logger.Error("Failed to update backup codes: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate backup codes",
			"success": false,
		})
	}

	h.audit.LogEvent(c.Context(), models.AuditEvent{
		OrganizationID: orgID,
		PrincipalID:    utils.StringPtr(userID),
		PrincipalType:  utils.StringPtr("user"),
		Action:         "mfa_backup_codes_regenerated",
		Result:         "success",
		Severity:       "MEDIUM",
	})

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.BackupCodesResponse{
			BackupCodes: backupCodes,
			Message:     "New backup codes generated. Save these in a safe place. Previous codes are now invalid.",
		},
	})
}

// DisableMFA disables multi-factor authentication for a user
//
//	@Summary		Disable MFA
//	@Description	Disable multi-factor authentication for the authenticated user
//	@Tags			MFA
//	@Accept			json
//	@Produce		json
//	@Security		Bearer
//	@Param			request	body		models.DisableMFARequest	true	"MFA disable details"
//	@Success		200		{object}	models.MessageResponse
//	@Failure		400		{object}	ErrorResponse
//	@Failure		401		{object}	ErrorResponse
//	@Failure		500		{object}	ErrorResponse
//	@Router			/auth/mfa/disable [delete]
func (h *AuthHandler) DisableMFA(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	orgID := c.Locals("organization_id").(string)

	var req models.DisableMFARequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	// Verify user identity with password before disabling MFA
	user, err := h.queries.Auth.GetUserByID(userID, orgID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to retrieve user",
			"success": false,
		})
	}

	if !user.MFAEnabled {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "MFA is not currently enabled",
			"success": false,
		})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		h.audit.LogEvent(c.Context(), models.AuditEvent{
			OrganizationID: orgID,
			PrincipalID:    utils.StringPtr(userID),
			PrincipalType:  utils.StringPtr("user"),
			Action:         "mfa_disable_failed",
			Result:         "failure",
			Severity:       "HIGH",
		})
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid password",
			"success": false,
		})
	}

	// Disable MFA
	err = h.queries.Auth.DisableMFA(userID, orgID)
	if err != nil {
		h.logger.Error("Failed to disable MFA: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to disable MFA",
			"success": false,
		})
	}

	h.audit.LogEvent(c.Context(), models.AuditEvent{
		OrganizationID: orgID,
		PrincipalID:    utils.StringPtr(userID),
		PrincipalType:  utils.StringPtr("user"),
		Action:         "mfa_disabled",
		Result:         "success",
		Severity:       "HIGH",
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Multi-factor authentication has been disabled",
	})
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
	user, err := h.queries.Auth.GetUserByEmail(req.Email, "") // Global fallback for forgot password? Or maybe we should take org here too.
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
	err = h.queries.Auth.SetPasswordResetToken(user.ID, resetToken, time.Hour)
	if err != nil {
		h.logger.Error("Failed to store reset token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to process password reset request",
			"success": false,
		})
	}

	// Send email with reset link containing the resetToken
	err = h.email.SendPasswordResetEmail(user.Email, user.Username, resetToken)
	if err != nil {
		h.logger.Error("Failed to send password reset email: %v", err)
		// We should probably still return success to prevent user enumeration
	}
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
	userID, err := h.queries.Auth.GetPasswordResetToken(req.Token)
	if err != nil || userID == "" {
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
	err = h.queries.Auth.UpdatePassword(userID, string(hashedPassword), "") // Need user org here, but we only have ID from Redis.
	// In a real system, SetPasswordResetToken should store OrgID too.
	// For now, passing "" to allow global lookup if ID is unique.
	if err != nil {
		h.logger.Error("Failed to update password: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update password",
			"success": false,
		})
	}

	// Delete the reset token
	h.queries.Auth.DeletePasswordResetToken(req.Token)

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
	userID, err := h.queries.Auth.GetEmailVerificationToken(req.Token)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid or expired verification token",
			"success": false,
		})
	}

	// Update email verification status
	err = h.queries.Auth.UpdateEmailVerification(userID, true, "") // Same as above, Redis token only has userID.
	if err != nil {
		h.logger.Error("Failed to verify email: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to verify email",
			"success": false,
		})
	}

	// Delete the verification token
	h.queries.Auth.DeleteEmailVerificationToken(req.Token)

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
	user, err := h.queries.Auth.GetUserByEmail(req.Email, "")
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
	err = h.queries.Auth.SetEmailVerificationToken(user.ID, verificationToken, time.Hour*24)
	if err != nil {
		h.logger.Error("Failed to store verification token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to process verification request",
			"success": false,
		})
	}

	// Send verification email with verificationToken
	err = h.email.SendVerificationEmail(user.Email, user.Username, verificationToken)
	if err != nil {
		h.logger.Error("Failed to resend verification email: %v", err)
	}
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
