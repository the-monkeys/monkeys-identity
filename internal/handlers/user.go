package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	queries *queries.Queries
	logger  *logger.Logger
}

func NewUserHandler(queries *queries.Queries, logger *logger.Logger) *UserHandler {
	return &UserHandler{
		queries: queries,
		logger:  logger,
	}
}

// Helper function to hash passwords
func hashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// ListUsers retrieves a paginated list of users
//
//	@Summary		List users
//	@Description	Retrieve a paginated list of users with filtering and sorting options
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			page	query		int		false	"Page number (default: 1)"
//	@Param			limit	query		int		false	"Items per page (default: 10, max: 100)"
//	@Param			sort	query		string	false	"Sort field (default: created_at)"
//	@Param			order	query		string	false	"Sort order: asc or desc (default: desc)"
//	@Success		200		{object}	SuccessResponse		"Successfully retrieved users list"
//	@Failure		500		{object}	ErrorResponse			"Internal server error"
//	@Security		BearerAuth
//	@Router			/users [get]
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	// Parse query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	sortBy := c.Query("sort", "created_at")
	order := c.Query("order", "desc")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	params := queries.ListParams{
		Limit:  limit,
		Offset: offset,
		SortBy: sortBy,
		Order:  order,
	}

	result, err := h.queries.User.ListUsers(params)
	if err != nil {
		h.logger.Error("Failed to list users: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to retrieve users",
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    result.Items,
		"meta": fiber.Map{
			"page":       page,
			"limit":      result.Limit,
			"total":      result.Total,
			"totalPages": result.TotalPages,
			"hasMore":    result.HasMore,
		},
	})
}

// CreateUser creates a new user account
//
//	@Summary		Create user
//	@Description	Create a new user account with the provided details
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	 @Param      request body   models.User true "User creation details"
//	@Success		201		{object}	SuccessResponse		"User created successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request format"
//	@Failure		409		{object}	ErrorResponse		"User already exists"
//	@Failure		500		{object} ErrorResponse		 "Internal server error"
//
// @Security BearerAuth
//
//	@Router			/users [post]
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {

	var req models.User

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"success": false,
		})
	}

	// Check if user already exists
	existingUser, err := h.queries.Auth.GetUserByEmail(req.Email)
	if err == nil && existingUser != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "User with this email already exists",
			"success": false,
		})
	}

	// Hash password using bcrypt
	hashedPassword, err := hashPassword(req.PasswordHash)
	if err != nil {
		h.logger.Error("Failed to hash password: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to process user creation",
			"success": false,
		})
	}

	// Create new user
	user := &models.User{
		ID:             uuid.NewString(),
		Email:          req.Email,
		Username:       req.Username,
		DisplayName:    req.DisplayName,
		OrganizationID: req.OrganizationID,
		PasswordHash:   hashedPassword,
		EmailVerified:  false,
		Status:         "active",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := h.queries.User.CreateUser(user); err != nil {
		h.logger.Error("Failed to create user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create user",
			"success": false,
		})
	}

	// Don't return password hash
	user.PasswordHash = ""

	h.logger.Info("User created successfully: %s", user.Email)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "User created successfully",
		"data":    user,
	})
}

// GetUser retrieves a user by ID
//
//	@Summary		Get user by ID
//	@Description	Retrieve a specific user's details by their ID
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"User ID"
//	@Success		200	{object}	SuccessResponse	"Successfully retrieved user"
//	@Failure		400	{object}	ErrorResponse	"Invalid user ID"
//	@Failure		404	{object}	ErrorResponse	"User not found"
//	@Security		BearerAuth
//	@Router			/users/{id} [get]
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	user, err := h.queries.User.GetUser(userID)
	if err != nil {
		h.logger.Error("Failed to get user: %v", err)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "User not found",
			"success": false,
		})
	}

	// Don't return password hash
	user.PasswordHash = ""

	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// UpdateUser updates a user's details
//
//	@Summary		Update user
//	@Description	Update a user's profile information
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string				true	"User ID"
//	@Param			request	body		SuccessResponse	true	"User update details"
//	@Success		200		{object}	SuccessResponse		"User updated successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request format or user ID"
//	@Failure		404		{object}	ErrorResponse		"User not found"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Security		BearerAuth
//	@Router			/users/{id} [put]
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	var req struct {
		Username       string `json:"username"`
		Email          string `json:"email"`
		DisplayName    string `json:"display_name"`
		OrganizationID string `json:"organization_id"`
		Status         string `json:"status"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"success": false,
		})
	}

	// Get existing user
	user, err := h.queries.User.GetUser(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "User not found",
			"success": false,
		})
	}

	// Update fields if provided
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.DisplayName != "" {
		user.DisplayName = req.DisplayName
	}
	if req.OrganizationID != "" {
		user.OrganizationID = req.OrganizationID
	}
	if req.Status != "" {
		user.Status = req.Status
	}

	user.UpdatedAt = time.Now()

	if err := h.queries.User.UpdateUser(user); err != nil {
		h.logger.Error("Failed to update user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update user",
			"success": false,
		})
	}

	// Don't return password hash
	user.PasswordHash = ""

	h.logger.Info("User updated successfully: %s", user.ID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User updated successfully",
		"data":    user,
	})
}

// DeleteUser deletes a user account
//
//	@Summary		Delete user
//	@Description	Delete a user account by ID
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"User ID"
//	@Success		200	{object}	SuccessResponse	"User deleted successfully"
//	@Failure		400	{object}	ErrorResponse	"Invalid user ID"
//	@Failure		404	{object}	ErrorResponse	"User not found"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/users/{id} [delete]
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	// Check if user exists
	_, err := h.queries.User.GetUser(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "User not found",
			"success": false,
		})
	}

	if err := h.queries.User.DeleteUser(userID); err != nil {
		h.logger.Error("Failed to delete user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete user",
			"success": false,
		})
	}

	h.logger.Info("User deleted successfully: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User deleted successfully",
	})
}

// GetUserProfile retrieves a user's profile information
//
//	@Summary		Get user profile
//	@Description	Retrieve detailed profile information for a user
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"User ID"
//	@Success		200	{object}	SuccessResponse	"Successfully retrieved user profile"
//	@Failure		400	{object}	ErrorResponse	"Invalid user ID"
//	@Failure		404	{object}	ErrorResponse	"User profile not found"
//	@Security		BearerAuth
//	@Router			/users/{id}/profile [get]
func (h *UserHandler) GetUserProfile(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	user, err := h.queries.User.GetUserProfile(userID)
	if err != nil {
		h.logger.Error("Failed to get user profile: %v", err)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "User profile not found",
			"success": false,
		})
	}

	// Don't return sensitive information
	user.PasswordHash = ""
	user.MFABackupCodes = nil

	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// UpdateUserProfile updates a user's profile information
//
//	@Summary		Update user profile
//	@Description	Update specific profile fields for a user
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string					true	"User ID"
//	@Param			request	body		SuccessResponse			true	"Profile update details"
//	@Success		200		{object}	SuccessResponse			"Profile updated successfully"
//	@Failure		400		{object}	ErrorResponse			"Invalid request format or user ID"
//	@Failure		404		{object}	ErrorResponse			"User not found"
//	@Failure		500		{object}	ErrorResponse			"Internal server error"
//	@Security		BearerAuth
//	@Router			/users/{id}/profile [put]
func (h *UserHandler) UpdateUserProfile(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	var req struct {
		DisplayName string `json:"display_name"`
		AvatarURL   string `json:"avatar_url"`
		Attributes  string `json:"attributes"`
		Preferences string `json:"preferences"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"success": false,
		})
	}

	// Build updates map
	updates := make(map[string]interface{})
	if req.DisplayName != "" {
		updates["display_name"] = req.DisplayName
	}
	if req.AvatarURL != "" {
		updates["avatar_url"] = req.AvatarURL
	}
	if req.Attributes != "" {
		updates["attributes"] = req.Attributes
	}
	if req.Preferences != "" {
		updates["preferences"] = req.Preferences
	}
	updates["updated_at"] = time.Now()

	if len(updates) == 1 { // Only updated_at
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "No valid fields to update",
			"success": false,
		})
	}

	if err := h.queries.User.UpdateUserProfile(userID, updates); err != nil {
		h.logger.Error("Failed to update user profile: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update user profile",
			"success": false,
		})
	}

	h.logger.Info("User profile updated successfully: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User profile updated successfully",
	})
}

// SuspendUser suspends a user account
//
//	@Summary		Suspend user
//	@Description	Suspend a user account with a reason
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string				true	"User ID"
// @Param			request	body		SuspendUserRequest	true	"Suspension details"
// @Success		200		{object}	SuccessResponse		"User suspended successfully"
// @Failure		400		{object}	ErrorResponse		"Invalid request format or user ID"
// @Failure		500		{object}	ErrorResponse		"Internal server error"
// @Security		BearerAuth
// @Router			/users/{id}/suspend [post]
func (h *UserHandler) SuspendUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	var req SuspendUserRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"success": false,
		})
	}

	if req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Suspension reason is required",
			"success": false,
		})
	}

	if err := h.queries.User.SuspendUser(userID, req.Reason); err != nil {
		h.logger.Error("Failed to suspend user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to suspend user",
			"success": false,
		})
	}

	h.logger.Info("User suspended successfully: %s, reason: %s", userID, req.Reason)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User suspended successfully",
	})
}

// ActivateUser activates a suspended user account
//
//	@Summary		Activate user
//	@Description	Activate a previously suspended user account
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
// @Param			request	body		ActivateUserRequest	false	"Activation details"
// @Success		200	{object}	SuccessResponse	"User activated successfully"
// @Failure		400	{object}	ErrorResponse	"Invalid user ID"
// @Failure		500	{object}	ErrorResponse	"Internal server error"
// @Security		BearerAuth
// @Router			/users/{id}/activate [post]
func (h *UserHandler) ActivateUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	var req ActivateUserRequest
	if err := c.BodyParser(&req); err != nil {
		// We don't strictly require a body for activation, but we'll try to parse it if present
		h.logger.Debug("invalid request format")
	}

	if err := h.queries.User.ActivateUser(userID); err != nil {
		h.logger.Error("Failed to activate user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to activate user",
			"success": false,
		})
	}

	h.logger.Info("User activated successfully: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User activated successfully",
	})
}

// GetUserSessions retrieves all active sessions for a user
//
//	@Summary		Get user sessions
//	@Description	Retrieve all active sessions for a specific user
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string				true	"User ID"
//	@Success		200	{object}	SuccessResponse	"Successfully retrieved user sessions"
//	@Failure		400	{object}	ErrorResponse		"Invalid user ID"
//	@Failure		500	{object}	ErrorResponse		"Internal server error"
//	@Security		BearerAuth
//	@Router			/users/{id}/sessions [get]
func (h *UserHandler) GetUserSessions(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	sessions, err := h.queries.User.GetUserSessions(userID)
	if err != nil {
		h.logger.Error("Failed to get user sessions: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to retrieve user sessions",
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    sessions,
	})
}

// RevokeUserSessions revokes all active sessions for a user
//
//	@Summary		Revoke user sessions
//	@Description	Revoke all active sessions for a specific user
//	@Tags			User Management
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"User ID"
//	@Success		200	{object}	SuccessResponse	"User sessions revoked successfully"
//	@Failure		400	{object}	ErrorResponse	"Invalid user ID"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/users/{id}/sessions [delete]
func (h *UserHandler) RevokeUserSessions(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "User ID is required",
			"success": false,
		})
	}

	if err := h.queries.User.RevokeUserSessions(userID); err != nil {
		h.logger.Error("Failed to revoke user sessions: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to revoke user sessions",
			"success": false,
		})
	}

	h.logger.Info("User sessions revoked successfully: %s", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User sessions revoked successfully",
	})
}

// Service Account endpoints

// ListServiceAccounts retrieves a paginated list of service accounts
//
//	@Summary		List service accounts
//	@Description	Retrieve a paginated list of service accounts with filtering and sorting options
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			page	query		int		false	"Page number (default: 1)"
//	@Param			limit	query		int		false	"Items per page (default: 10, max: 100)"
//	@Param			sort	query		string	false	"Sort field (default: created_at)"
//	@Param			order	query		string	false	"Sort order: asc or desc (default: desc)"
//	@Success		200		{object}	SuccessResponse		"Successfully retrieved service accounts list"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts [get]
func (h *UserHandler) ListServiceAccounts(c *fiber.Ctx) error {
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	sort := c.Query("sort", "created_at")
	order := c.Query("order", "desc")

	// Validate pagination limits
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}

	// Prepare parameters
	params := queries.ListParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
		SortBy: sort,
		Order:  order,
	}

	// Call query layer
	result, err := h.queries.User.ListServiceAccounts(params)
	if err != nil {
		h.logger.Error("Failed to list service accounts: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve service accounts",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Service accounts retrieved successfully",
		Data:    result,
	})
}

// CreateServiceAccount creates a new service account
//
//	@Summary		Create service account
//	@Description	Create a new service account with specified details
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			serviceAccount	body		models.ServiceAccount	true	"Service account data"
//	@Success		201				{object}	SuccessResponse			"Service account created successfully"
//	@Failure		400				{object}	ErrorResponse			"Invalid input data"
//	@Failure		409				{object}	ErrorResponse			"Service account already exists"
//	@Failure		500				{object}	ErrorResponse			"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts [post]
func (h *UserHandler) CreateServiceAccount(c *fiber.Ctx) error {
	var sa models.ServiceAccount

	// Parse request body
	if err := c.BodyParser(&sa); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_request",
			Message: "Invalid request body",
		})
	}

	// Basic validation
	if sa.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "validation_error",
			Message: "Service account name is required",
		})
	}

	// Set default values
	sa.Status = "active"
	sa.CreatedAt = time.Now()
	sa.UpdatedAt = time.Now()
	sa.LastKeyRotation = time.Now()

	// Call query layer to create service account
	err := h.queries.User.CreateServiceAccount(&sa)
	if err != nil {
		h.logger.Error("Failed to create service account: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to create service account",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Status:  fiber.StatusCreated,
		Message: "Service account created successfully",
		Data:    sa,
	})
}

// GetServiceAccount retrieves a specific service account by ID
//
//	@Summary		Get service account
//	@Description	Retrieve a specific service account by its ID
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"Service account ID"
//	@Success		200	{object}	SuccessResponse	"Service account retrieved successfully"
//	@Failure		404	{object}	ErrorResponse	"Service account not found"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts/{id} [get]
func (h *UserHandler) GetServiceAccount(c *fiber.Ctx) error {
	saID := c.Params("id")

	// Call query layer
	sa, err := h.queries.User.GetServiceAccount(saID)
	if err != nil {
		h.logger.Error("Failed to get service account: %v", err)
		return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
			Status:  fiber.StatusNotFound,
			Error:   "not_found",
			Message: "Service account not found",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Service account retrieved successfully",
		Data:    sa,
	})
}

// UpdateServiceAccount updates an existing service account
//
//	@Summary		Update service account
//	@Description	Update an existing service account with new information
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			id				path		string					true	"Service account ID"
//	@Param			serviceAccount	body		models.ServiceAccount	true	"Updated service account data"
//	@Success		200				{object}	SuccessResponse			"Service account updated successfully"
//	@Failure		400				{object}	ErrorResponse			"Invalid input data"
//	@Failure		404				{object}	ErrorResponse			"Service account not found"
//	@Failure		500				{object}	ErrorResponse			"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts/{id} [put]
func (h *UserHandler) UpdateServiceAccount(c *fiber.Ctx) error {
	saID := c.Params("id")
	var sa models.ServiceAccount

	// Parse request body
	if err := c.BodyParser(&sa); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_request",
			Message: "Invalid request body",
		})
	}

	// Set the ID and update timestamp
	sa.ID = saID
	sa.UpdatedAt = time.Now()

	// Call query layer
	err := h.queries.User.UpdateServiceAccount(&sa)
	if err != nil {
		h.logger.Error("Failed to update service account: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to update service account",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Service account updated successfully",
		Data:    sa,
	})
}

// DeleteServiceAccount deletes a service account
//
//	@Summary		Delete service account
//	@Description	Delete a service account and revoke all its API keys
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"Service account ID"
//	@Success		200	{object}	SuccessResponse	"Service account deleted successfully"
//	@Failure		404	{object}	ErrorResponse	"Service account not found"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts/{id} [delete]
func (h *UserHandler) DeleteServiceAccount(c *fiber.Ctx) error {
	saID := c.Params("id")

	// Call query layer
	err := h.queries.User.DeleteServiceAccount(saID)
	if err != nil {
		h.logger.Error("Failed to delete service account: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to delete service account",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Service account deleted successfully",
		Data:    fiber.Map{"id": saID},
	})
}

// GenerateAPIKey generates a new API key for a service account
//
//	@Summary		Generate API key
//	@Description	Generate a new API key for the specified service account
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string			true	"Service account ID"
//	@Param			apiKey	body		models.APIKey	true	"API key configuration"
//	@Success		201		{object}	SuccessResponse	"API key generated successfully"
//	@Failure		400		{object}	ErrorResponse	"Invalid input data"
//	@Failure		404		{object}	ErrorResponse	"Service account not found"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts/{id}/keys [post]
func (h *UserHandler) GenerateAPIKey(c *fiber.Ctx) error {
	saID := c.Params("id")
	var apiKey models.APIKey

	// Parse request body
	if err := c.BodyParser(&apiKey); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_request",
			Message: "Invalid request body",
		})
	}

	// Set default values
	apiKey.ServiceAccountID = saID
	apiKey.Status = "active"
	apiKey.CreatedAt = time.Now()

	// Set default expiration (1 year from now)
	if apiKey.ExpiresAt.IsZero() {
		apiKey.ExpiresAt = time.Now().AddDate(1, 0, 0)
	}

	// Call query layer
	err := h.queries.User.GenerateAPIKey(saID, &apiKey)
	if err != nil {
		h.logger.Error("Failed to generate API key: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to generate API key",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Status:  fiber.StatusCreated,
		Message: "API key generated successfully",
		Data:    apiKey,
	})
}

// ListAPIKeys retrieves all API keys for a service account
//
//	@Summary		List API keys
//	@Description	Retrieve all API keys for the specified service account
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"Service account ID"
//	@Success		200	{object}	SuccessResponse	"API keys retrieved successfully"
//	@Failure		404	{object}	ErrorResponse	"Service account not found"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts/{id}/keys [get]
func (h *UserHandler) ListAPIKeys(c *fiber.Ctx) error {
	saID := c.Params("id")

	// Call query layer
	keys, err := h.queries.User.ListAPIKeys(saID)
	if err != nil {
		h.logger.Error("Failed to list API keys: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve API keys",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "API keys retrieved successfully",
		Data:    keys,
	})
}

// RevokeAPIKey revokes a specific API key
//
//	@Summary		Revoke API key
//	@Description	Revoke a specific API key for the service account
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string			true	"Service account ID"
//	@Param			key_id	path		string			true	"API key ID"
//	@Success		200		{object}	SuccessResponse	"API key revoked successfully"
//	@Failure		404		{object}	ErrorResponse	"API key not found"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts/{id}/keys/{key_id} [delete]
func (h *UserHandler) RevokeAPIKey(c *fiber.Ctx) error {
	saID := c.Params("id")
	keyID := c.Params("key_id")

	// Call query layer
	err := h.queries.User.RevokeAPIKey(saID, keyID)
	if err != nil {
		h.logger.Error("Failed to revoke API key: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to revoke API key",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "API key revoked successfully",
		Data:    fiber.Map{"service_account_id": saID, "key_id": keyID},
	})
}

// RotateServiceAccountKeys rotates all API keys for a service account
//
//	@Summary		Rotate service account keys
//	@Description	Rotate all API keys for the specified service account
//	@Tags			Service Accounts
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"Service account ID"
//	@Success		200	{object}	SuccessResponse	"Keys rotated successfully"
//	@Failure		404	{object}	ErrorResponse	"Service account not found"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/service-accounts/{id}/rotate-keys [post]
func (h *UserHandler) RotateServiceAccountKeys(c *fiber.Ctx) error {
	saID := c.Params("id")

	// Call query layer
	err := h.queries.User.RotateServiceAccountKeys(saID)
	if err != nil {
		h.logger.Error("Failed to rotate service account keys: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to rotate service account keys",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Service account keys rotated successfully",
		Data:    fiber.Map{"service_account_id": saID, "rotated_at": time.Now()},
	})
}
