package handlers

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/internal/services"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

type OIDCHandler struct {
	oidc    services.OIDCService
	queries *queries.Queries
	logger  logger.Logger
}

func NewOIDCHandler(oidc services.OIDCService, q *queries.Queries, logger logger.Logger) *OIDCHandler {
	return &OIDCHandler{
		oidc:    oidc,
		queries: q,
		logger:  logger,
	}
}

// GetDiscovery returns the OIDC discovery configuration
//
//	@Summary		OIDC Discovery
//	@Description	Returns OpenID Connect discovery document
//	@Tags			Federation
//	@Produce		json
//	@Success		200	{object}	map[string]interface{}
//	@Router			/.well-known/openid-configuration [get]
func (h *OIDCHandler) GetDiscovery(c *fiber.Ctx) error {
	return c.JSON(h.oidc.GetDiscoveryConfiguration())
}

// GetJWKS returns the JSON Web Key Set
//
//	@Summary		JWKS
//	@Description	Returns JSON Web Key Set for token verification
//	@Tags			Federation
//	@Produce		json
//	@Success		200	{object}	map[string]interface{}
//	@Router			/.well-known/jwks.json [get]
func (h *OIDCHandler) GetJWKS(c *fiber.Ctx) error {
	jwks, err := h.oidc.GetJWKS()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(jwks)
}

// Authorize handles the OIDC authorization request
//
//	@Summary		OAuth2 Authorize
//	@Description	Handles initial authorization request (login/consent)
//	@Tags			Federation
//	@Param			client_id		query	string	true	"Client ID"
//	@Param			redirect_uri	query	string	true	"Redirect URI"
//	@Param			response_type	query	string	true	"Response Type (code)"
//	@Param			scope			query	string	true	"Scopes"
//	@Param			state			query	string	false	"State"
//	@Param			nonce			query	string	false	"Nonce"
//	@Router			/oauth2/authorize [get]
func (h *OIDCHandler) Authorize(c *fiber.Ctx) error {
	clientID := c.Query("client_id")
	redirectURI := c.Query("redirect_uri")
	scope := c.Query("scope")
	state := c.Query("state")
	nonce := c.Query("nonce")

	// Validate client and redirect URI
	client, err := h.oidc.ValidateClient(clientID, "", redirectURI)
	if err != nil {
		h.logger.Warn("OIDC Authorize validation failed: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Check if user is authenticated (set by auth middleware)
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "login_required",
			"message": "User must be authenticated to authorize third-party apps",
		})
	}

	// If trusted client, skip consent and issue code directly
	if client.IsTrusted {
		code, err := h.oidc.CreateAuthorizationCode(userID.(string), clientID, scope, nonce, redirectURI)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "server_error"})
		}

		// Redirect back to client with code and state
		return c.Redirect(fmt.Sprintf("%s?code=%s&state=%s", redirectURI, code, state))
	}

	// Show consent UI (returns consent data for a frontend to render)
	return c.JSON(fiber.Map{
		"consent_required": true,
		"client_name":      client.ClientName,
		"client_logo":      client.LogoURL,
		"scopes":           scope,
		"state":            state,
	})
}

// Token handles the OAuth2 token exchange
//
//	@Summary		OAuth2 Token
//	@Description	Exchanges authorization code for access/id tokens
//	@Tags			Federation
//	@Accept			x-www-form-urlencoded
//	@Produce		json
//	@Router			/oauth2/token [post]
func (h *OIDCHandler) Token(c *fiber.Ctx) error {
	grantType := c.FormValue("grant_type")
	code := c.FormValue("code")
	clientID := c.FormValue("client_id")
	clientSecret := c.FormValue("client_secret")

	// Support Basic Auth for client credentials (RFC 6749 Section 2.3.1)
	if clientID == "" {
		authHeader := c.Get("Authorization")
		if strings.HasPrefix(authHeader, "Basic ") {
			decoded, err := base64.StdEncoding.DecodeString(authHeader[6:])
			if err == nil {
				parts := strings.SplitN(string(decoded), ":", 2)
				if len(parts) == 2 {
					clientID = parts[0]
					clientSecret = parts[1]
				}
			}
		}
	}

	if grantType != "authorization_code" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported_grant_type"})
	}

	resp, err := h.oidc.ExchangeCodeForToken(code, clientID, clientSecret)
	if err != nil {
		h.logger.Warn("OIDC Token exchange failed: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

// UserInfo returns the standard OIDC user profile
//
//	@Summary		OIDC UserInfo
//	@Description	Returns user profile information based on access token
//	@Tags			Federation
//	@Security		BearerAuth
//	@Produce		json
//	@Router			/oauth2/userinfo [get]
func (h *OIDCHandler) UserInfo(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
	}

	orgID, _ := c.Locals("organization_id").(string)

	// Fetch real user data
	user, err := h.queries.Auth.GetUserByID(userID, orgID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	// Return standard OIDC claims
	profile := fiber.Map{
		"sub":                user.ID,
		"name":               user.DisplayName,
		"preferred_username": user.Username,
		"email":              user.Email,
		"email_verified":     user.EmailVerified,
		"updated_at":         user.UpdatedAt.Unix(),
	}

	if user.AvatarURL != "" {
		profile["picture"] = user.AvatarURL
	}

	return c.JSON(profile)
}
