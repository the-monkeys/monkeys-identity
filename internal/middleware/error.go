package middleware

import (
	"errors"

	"github.com/gofiber/fiber/v2"
)

// ErrorHandler handles all application errors
func ErrorHandler(c *fiber.Ctx, err error) error {
	// Default error response
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	// Check if it's a Fiber error
	var e *fiber.Error
	if errors.As(err, &e) {
		code = e.Code
		message = e.Message
	}

	// Custom error types can be handled here
	switch err.Error() {
	case "unauthorized":
		code = fiber.StatusUnauthorized
		message = "Unauthorized access"
	case "forbidden":
		code = fiber.StatusForbidden
		message = "Access forbidden"
	case "not_found":
		code = fiber.StatusNotFound
		message = "Resource not found"
	case "validation_error":
		code = fiber.StatusBadRequest
		message = "Validation failed"
	}

	return c.Status(code).JSON(fiber.Map{
		"error": fiber.Map{
			"code":    code,
			"message": message,
		},
		"success": false,
	})
}
