package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/the-monkeys/monkeys-identity/internal/authz"
	"github.com/the-monkeys/monkeys-identity/internal/services"
)

type AuthMiddleware struct {
	jwtSecret string
}

type Claims struct {
	UserID         string `json:"user_id"`
	OrganizationID string `json:"organization_id"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthMiddleware(jwtSecret string) *AuthMiddleware {
	return &AuthMiddleware{
		jwtSecret: jwtSecret,
	}
}

// RequireAuth validates JWT token
func (am *AuthMiddleware) RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Authorization header required",
				"success": false,
			})
		}

		// Extract token from "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Invalid authorization header format",
				"success": false,
			})
		}

		tokenString := tokenParts[1]

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(am.jwtSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Invalid or expired token",
				"success": false,
			})
		}

		// Extract claims
		claims, ok := token.Claims.(*Claims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Invalid token claims",
				"success": false,
			})
		}

		// Check token expiration
		if claims.ExpiresAt.Before(time.Now()) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Token has expired",
				"success": false,
			})
		}

		// Store user info in context
		c.Locals("user_id", claims.UserID)
		c.Locals("organization_id", claims.OrganizationID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

// RequireRole validates user has specific role
func (am *AuthMiddleware) RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("role")
		if userRole == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Role information not found",
				"success": false,
			})
		}

		role := userRole.(string)
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   "Insufficient permissions",
			"success": false,
		})
	}
}

// RequirePermission validates user has specific permission using AuthzService
func (am *AuthMiddleware) RequirePermission(authzSvc services.AuthzService, action string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)
		orgID := c.Locals("organization_id").(string)

		// Determine resource ARN.
		// For now, we use a convention: if :id is in path, it's the resource.
		// Otherwise, we use a generic resource or let the handler specify it.
		// In a real system, this might be more complex.
		resource := "*"
		if id := c.Params("id"); id != "" {
			// Extract resource type from path if possible, or use generic
			pathParts := strings.Split(strings.Trim(c.Path(), "/"), "/")
			resType := "resource"
			if len(pathParts) > 1 {
				resType = pathParts[len(pathParts)-2] // e.g. /users/:id -> users
			}
			resource = fmt.Sprintf("arn:monkeys:resource:%s:%s/%s", orgID, resType, id)
		}

		decision, err := authzSvc.Authorize(c.Context(), userID, "user", orgID, action, resource, map[string]interface{}{
			"ip": c.IP(),
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Authorization check failed",
				"success": false,
			})
		}

		if decision != authz.DecisionAllow {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Forbidden: Insufficient permissions",
				"success": false,
			})
		}

		return c.Next()
	}
}

// OptionalAuth validates token if present but doesn't require it
func (am *AuthMiddleware) OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			return c.Next()
		}

		tokenString := tokenParts[1]
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(am.jwtSecret), nil
		})

		if err == nil && token.Valid {
			if claims, ok := token.Claims.(*Claims); ok {
				c.Locals("user_id", claims.UserID)
				c.Locals("organization_id", claims.OrganizationID)
				c.Locals("email", claims.Email)
				c.Locals("role", claims.Role)
			}
		}

		return c.Next()
	}
}
