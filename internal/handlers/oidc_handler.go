package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/internal/services"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
	"golang.org/x/crypto/bcrypt"
)

type OIDCHandler struct {
	oidc    services.OIDCService
	queries *queries.Queries
	logger  logger.Logger
	config  *config.Config
}

func NewOIDCHandler(oidc services.OIDCService, q *queries.Queries, logger logger.Logger, cfg *config.Config) *OIDCHandler {
	return &OIDCHandler{
		oidc:    oidc,
		queries: q,
		logger:  logger,
		config:  cfg,
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
	// Check if user is authenticated (set by auth middleware)
	userID := c.Locals("user_id")
	if userID == nil {
		// Redirect to frontend login with return_to
		returnTo := fmt.Sprintf("%s%s", h.config.OIDCIssuer, c.OriginalURL())
		loginURL := fmt.Sprintf("%s/login?return_to=%s", h.config.FrontendURL, url.QueryEscape(returnTo))
		return c.Redirect(loginURL)
	}

	// If trusted client, skip consent and issue code directly
	if client.IsTrusted {
		orgID, _ := c.Locals("organization_id").(string)
		code, err := h.oidc.CreateAuthorizationCode(userID.(string), orgID, clientID, scope, nonce, redirectURI)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "server_error"})
		}

		// Redirect back to client with code and state
		return c.Redirect(fmt.Sprintf("%s?code=%s&state=%s", redirectURI, code, state))
	}

	// Redirect to consent page
	consentURL := fmt.Sprintf("%s/consent?client_id=%s&scope=%s&state=%s&redirect_uri=%s",
		h.config.FrontendURL, clientID, scope, state, redirectURI)
	return c.Redirect(consentURL)
}

// GetPublicClientInfo returns public information about an OIDC client
//
//	@Summary		Get Public Client Info
//	@Description	Returns public details (name, logo) for a client ID
//	@Tags			Federation
//	@Param			client_id	query	string	true	"Client ID"
//	@Produce		json
//	@Success		200	{object}	map[string]interface{}
//	@Router			/oauth2/client-info [get]
func (h *OIDCHandler) GetPublicClientInfo(c *fiber.Ctx) error {
	clientID := c.Query("client_id")
	if clientID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "client_id_required"})
	}

	client, err := h.oidc.ValidateClient(clientID, "", "")
	// ValidateClient checks redirectURI if provided, but here we just want info.
	// However, ValidateClient might fail if we don't provide a secret for confidential clients?
	// Actually ValidateClient logic:
	// if !client.IsPublic && secret provided -> check secret.
	// if secret NOT provided -> it might fail if we reusing ValidateClient.
	// Let's check OIDCService.ValidateClient implementation.
	// It checks secret ONLY IF !client.IsPublic.
	// But wait, for consent screen, we don't have the secret. We just have client_id.
	// So we need a way to just `GetClient` without validation or use `GetClientByID` directly.
	// `OIDCHandler` has access to `queries`. Let's use `h.queries.OIDC.GetClientByID`.

	client, err = h.queries.OIDC.GetClientByID(clientID)
	if err != nil {
		h.logger.Error("Failed to fetch client info: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "server_error"})
	}
	if client == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "client_not_found"})
	}

	return c.JSON(fiber.Map{
		"client_id":   client.ID,
		"client_name": client.ClientName,
		"logo_url":    client.LogoURL,
		"policy_uri":  client.PolicyURI,
		"tos_uri":     client.TosURI,
	})
}

type ConsentRequest struct {
	ClientID    string `json:"client_id"`
	RedirectURI string `json:"redirect_uri"`
	Scope       string `json:"scope"`
	State       string `json:"state"`
	Nonce       string `json:"nonce"`
	Decision    string `json:"decision"` // "allow" or "deny"
}

// HandleConsent processes the user's consent decision
//
//	@Summary		Handle Consent
//	@Description	Processes user consent and returns redirect URL
//	@Tags			Federation
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	map[string]string
//	@Router			/oauth2/consent [post]
func (h *OIDCHandler) HandleConsent(c *fiber.Ctx) error {
	var req ConsentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	// Check Auth
	userIDRaw := c.Locals("user_id")
	if userIDRaw == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "login_required"})
	}
	userID := userIDRaw.(string)

	if req.Decision != "allow" {
		// User denied access
		redirectURL := fmt.Sprintf("%s?error=access_denied&state=%s", req.RedirectURI, req.State)
		return c.JSON(fiber.Map{"redirect_to": redirectURL})
	}

	// Validate Client/RedirectURI again to be safe
	_, err := h.oidc.ValidateClient(req.ClientID, "", req.RedirectURI)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Create Code
	orgID, _ := c.Locals("organization_id").(string)
	code, err := h.oidc.CreateAuthorizationCode(userID, orgID, req.ClientID, req.Scope, req.Nonce, req.RedirectURI)
	if err != nil {
		h.logger.Error("Failed to create auth code: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "server_error"})
	}

	redirectURL := fmt.Sprintf("%s?code=%s&state=%s", req.RedirectURI, code, req.State)
	return c.JSON(fiber.Map{"redirect_to": redirectURL})
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

	if user.AvatarURL != nil {
		profile["picture"] = *user.AvatarURL
	}

	return c.JSON(profile)
}

// RegisterClientRequest is the request body for registering a new OAuth2 client
type RegisterClientRequest struct {
	ClientName   string   `json:"client_name"`
	RedirectURIs []string `json:"redirect_uris"`
	Scope        string   `json:"scope"`
	IsPublic     bool     `json:"is_public"`
	LogoURL      *string  `json:"logo_url,omitempty"`
}

// RegisterClient registers a new OIDC client for the organization
//
//	@Summary		Register OIDC Client
//	@Description	Register a new OAuth2/OIDC client application for SSO integration
//	@Tags			Federation
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			request	body		RegisterClientRequest	true	"Client registration details"
//	@Success		201		{object}	map[string]interface{}
//	@Failure		400		{object}	map[string]interface{}
//	@Router			/oauth2/clients [post]
func (h *OIDCHandler) RegisterClient(c *fiber.Ctx) error {
	var req RegisterClientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	if req.ClientName == "" || len(req.RedirectURIs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "client_name and redirect_uris are required",
			"success": false,
		})
	}

	orgID := c.Locals("organization_id").(string)

	// Generate client ID and secret
	clientID := generateClientID()
	clientSecret := generateClientSecret()

	// Hash the secret before storing
	secretHash, err := bcrypt.GenerateFromPassword([]byte(clientSecret), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Error("Failed to hash client secret: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create client",
			"success": false,
		})
	}

	now := time.Now()
	client := &models.OAuthClient{
		ID:               clientID,
		OrganizationID:   orgID,
		ClientName:       req.ClientName,
		ClientSecretHash: string(secretHash),
		RedirectURIs:     req.RedirectURIs,
		GrantTypes:       []string{"authorization_code", "refresh_token"},
		ResponseTypes:    []string{"code"},
		Scope:            req.Scope,
		IsPublic:         req.IsPublic,
		LogoURL:          req.LogoURL,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if client.Scope == "" {
		client.Scope = "openid profile email"
	}

	err = h.queries.OIDC.CreateClient(client)
	if err != nil {
		h.logger.Error("Failed to create OIDC client: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to register client",
			"success": false,
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "OIDC client registered successfully. Save the client_secret — it cannot be retrieved later.",
		"data": fiber.Map{
			"client_id":     clientID,
			"client_secret": clientSecret,
			"client_name":   req.ClientName,
			"redirect_uris": req.RedirectURIs,
			"grant_types":   client.GrantTypes,
			"scope":         client.Scope,
		},
	})
}

// UpdateClient updates an existing OIDC client registration
func (h *OIDCHandler) UpdateClient(c *fiber.Ctx) error {
	clientID := c.Params("id")
	if clientID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "client_id is required",
			"success": false,
		})
	}

	var req RegisterClientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request format",
			"success": false,
		})
	}

	client := &models.OAuthClient{
		ClientName:   req.ClientName,
		RedirectURIs: req.RedirectURIs,
		Scope:        req.Scope,
		IsPublic:     req.IsPublic,
		LogoURL:      req.LogoURL,
	}

	err := h.oidc.UpdateClient(clientID, client)
	if err != nil {
		if err.Error() == "client_not_found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Client not found",
				"success": false,
			})
		}
		h.logger.Error("Failed to update OIDC client: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update client",
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "OIDC client updated successfully",
	})
}

// ListClients returns all OIDC clients for the user's organization
//
//	@Summary		List OIDC Clients
//	@Description	List all registered OAuth2/OIDC clients for the organization
//	@Tags			Federation
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	map[string]interface{}
//	@Router			/oauth2/clients [get]
func (h *OIDCHandler) ListClients(c *fiber.Ctx) error {
	orgID := c.Locals("organization_id").(string)

	clients, err := h.queries.OIDC.ListClientsByOrg(orgID)
	if err != nil {
		h.logger.Error("Failed to list clients: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to retrieve clients",
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    clients,
		"total":   len(clients),
	})
}

// DeleteClient deletes an OIDC client
//
//	@Summary		Delete OIDC Client
//	@Description	Delete a registered OAuth2/OIDC client application
//	@Tags			Federation
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path	string	true	"Client ID"
//	@Success		200	{object}	map[string]interface{}
//	@Failure		404	{object}	map[string]interface{}
//	@Router			/oauth2/clients/{id} [delete]
func (h *OIDCHandler) DeleteClient(c *fiber.Ctx) error {
	clientID := c.Params("id")
	orgID := c.Locals("organization_id").(string)

	err := h.queries.OIDC.DeleteClient(clientID, orgID)
	if err != nil {
		if isNotFoundErr(err) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Client not found",
				"success": false,
			})
		}
		h.logger.Error("Failed to delete OIDC client: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete client",
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "OIDC client deleted successfully",
	})
}

// generateClientID creates a valid UUID for the client identifier
func generateClientID() string {
	return uuid.New().String()
}

// generateClientSecret creates a high-entropy client secret
func generateClientSecret() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}
