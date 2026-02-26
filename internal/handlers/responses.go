package handlers

import "github.com/gofiber/fiber/v2"

// Common response structures for API documentation

// ErrorResponse represents an error response
type ErrorResponse struct {
	Status  int    `json:"status" example:"400"`
	Error   string `json:"error" example:"invalid_request"`
	Message string `json:"message" example:"The request was invalid"`
} //@name ErrorResponse

// SuccessResponse represents a success response
type SuccessResponse struct {
	Status  int         `json:"status" example:"200"`
	Message string      `json:"message" example:"Operation completed successfully"`
	Data    interface{} `json:"data,omitempty"`
} //@name SuccessResponse

// ── Standardized response helpers ──────────────────────────────────────

// apiError sends a uniform JSON error response.
//
//	{ "success": false, "error": "<code>", "message": "<human-readable>" }
func apiError(c *fiber.Ctx, httpStatus int, code string, message string) error {
	return c.Status(httpStatus).JSON(fiber.Map{
		"success": false,
		"error":   code,
		"message": message,
	})
}

// apiSuccess sends a uniform JSON success response.
//
//	{ "success": true, "message": "<msg>", "data": <payload> }
func apiSuccess(c *fiber.Ctx, httpStatus int, message string, data interface{}) error {
	resp := fiber.Map{
		"success": true,
		"message": message,
	}
	if data != nil {
		resp["data"] = data
	}
	return c.Status(httpStatus).JSON(resp)
}

// RefreshTokenRequest represents a refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
} //@name RefreshTokenRequest

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email" example:"user@example.com"`
} //@name ForgotPasswordRequest

// ResetPasswordRequest represents a reset password request
type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required" example:"reset_token_here"`
	NewPassword string `json:"new_password" validate:"required,min=8" example:"newPassword123"`
} //@name ResetPasswordRequest

// VerifyEmailRequest represents an email verification request
type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required" example:"verification_token_here"`
} //@name VerifyEmailRequest

// ResendVerificationRequest represents a resend verification request
type ResendVerificationRequest struct {
	Email string `json:"email" validate:"required,email" example:"user@example.com"`
} //@name ResendVerificationRequest

// SuspendUserRequest represents a request to suspend a user
type SuspendUserRequest struct {
	Reason string `json:"reason" validate:"required" example:"Violation of terms of service"`
} //@name SuspendUserRequest

// ActivateUserRequest represents a request to activate a user
type ActivateUserRequest struct {
	Reason string `json:"reason,omitempty" example:"Account verified"`
} //@name ActivateUserRequest
