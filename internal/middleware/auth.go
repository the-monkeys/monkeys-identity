package middleware

import (
	"crypto/rsa"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/authz"
	"github.com/the-monkeys/monkeys-identity/internal/services"
	"github.com/the-monkeys/monkeys-identity/pkg/utils"
)

type AuthMiddleware struct {
	jwtSecret string
	publicKey *rsa.PublicKey
	redis     *redis.Client
}

type Claims struct {
	UserID         string `json:"user_id"`
	OrganizationID string `json:"organization_id"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	JTI            string `json:"jti"`
	jwt.RegisteredClaims
}

func NewAuthMiddleware(jwtSecret string, privKeyPEM string, redis *redis.Client) *AuthMiddleware {
	am := &AuthMiddleware{
		jwtSecret: jwtSecret,
		redis:     redis,
	}

	if privKeyPEM != "" {
		if priv, err := utils.LoadRSAPrivateKey(privKeyPEM); err == nil {
			am.publicKey = &priv.PublicKey
		} else {
			fmt.Printf("Error loading RSA private key in middleware: %v\n", err)
		}
	}

	return am
}

// RequireAuth validates JWT token
func (am *AuthMiddleware) RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get Authorization header
		authHeader := c.Get("Authorization")
		var tokenString string

		if authHeader != "" {
			// Extract token from "Bearer <token>"
			tokenParts := strings.Split(authHeader, " ")
			if len(tokenParts) == 2 && tokenParts[0] == "Bearer" {
				tokenString = tokenParts[1]
			}
		}

		// Fallback to cookie
		if tokenString == "" {
			tokenString = c.Cookies("access_token")
		}

		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Authorization required",
				"success": false,
			})
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			// Check signing method
			if _, ok := token.Method.(*jwt.SigningMethodRSA); ok {
				if am.publicKey == nil {
					return nil, fmt.Errorf("public key not configured for RS256")
				}
				return am.publicKey, nil
			}
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
				return []byte(am.jwtSecret), nil
			}
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		})

		if err != nil || !token.Valid {
			fmt.Printf("Token validation failed: %v\n", err)
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

		// Check if token is blacklisted (revoked)
		if claims.JTI != "" {
			exists, err := am.redis.Exists(c.Context(), "blacklist:"+claims.JTI).Result()
			if err == nil && exists > 0 {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error":   "Token has been revoked",
					"success": false,
				})
			}
		}

		// Extract user ID, falling back to Subject (standard OIDC sub claim) if UserID is empty
		userID := claims.UserID
		if userID == "" {
			userID = claims.Subject
		}

		// Store user info in context
		c.Locals("user_id", userID)
		c.Locals("organization_id", claims.OrganizationID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)
		c.Locals("session_id", claims.JTI) // JTI == session ID stored in DB

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

// RequireOrgAccess ensures the :id route parameter matches the caller's organization_id from JWT.
// This prevents org admins from accessing resources belonging to other organizations.
func (am *AuthMiddleware) RequireOrgAccess() fiber.Handler {
	return func(c *fiber.Ctx) error {
		callerOrgID := c.Locals("organization_id")
		if callerOrgID == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Organization context not found",
				"success": false,
			})
		}

		targetOrgID := c.Params("id")
		if targetOrgID == "" {
			// No :id param — let the handler decide
			return c.Next()
		}

		if callerOrgID.(string) != targetOrgID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Access denied: you can only manage your own organization",
				"success": false,
			})
		}

		return c.Next()
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
		var tokenString string

		if authHeader != "" {
			tokenParts := strings.Split(authHeader, " ")
			if len(tokenParts) == 2 && tokenParts[0] == "Bearer" {
				tokenString = tokenParts[1]
			}
		}

		if tokenString == "" {
			tokenString = c.Cookies("access_token")
		}

		if tokenString == "" {
			return c.Next()
		}
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodRSA); ok {
				if am.publicKey == nil {
					return nil, fmt.Errorf("public key not configured for RS256")
				}
				return am.publicKey, nil
			}
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
				return []byte(am.jwtSecret), nil
			}
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		})

		if err == nil && token.Valid {
			if claims, ok := token.Claims.(*Claims); ok {
				userID := claims.UserID
				if userID == "" {
					userID = claims.Subject
				}
				c.Locals("user_id", userID)
				c.Locals("organization_id", claims.OrganizationID)
				c.Locals("email", claims.Email)
				c.Locals("role", claims.Role)
			}
		}

		return c.Next()
	}
}
