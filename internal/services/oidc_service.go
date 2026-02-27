package services

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/utils"
	"golang.org/x/crypto/bcrypt"
)

const jwksKeyID = "monkeys-iam-main-key"

type OIDCService interface {
	ValidateClient(clientID, clientSecret, redirectURI string) (*models.OAuthClient, error)
	CreateAuthorizationCode(userID, orgID, clientID, scope, nonce, redirectURI string) (string, error)
	ExchangeCodeForToken(code, clientID, clientSecret string) (*TokenResponse, error)
	GetDiscoveryConfiguration() map[string]interface{}
	GetJWKS() (map[string]interface{}, error)
	UpdateClient(clientID string, client *models.OAuthClient) error
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	IDToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	Scope        string `json:"scope"`
}

type oidcService struct {
	queries    *queries.Queries
	config     *config.Config
	privateKey *rsa.PrivateKey
}

func NewOIDCService(queries *queries.Queries, cfg *config.Config) OIDCService {
	s := &oidcService{
		queries: queries,
		config:  cfg,
	}

	// Try to load private key from config
	if cfg.JWTPrivateKey != "" {
		priv, err := utils.LoadRSAPrivateKey(cfg.JWTPrivateKey)
		if err == nil {
			s.privateKey = priv
		}
	}

	// Generate a temporary key if none provided (useful for development)
	if s.privateKey == nil {
		fmt.Println("WARNING: No OIDC private key provided. Generating a temporary one...")
		key, err := rsa.GenerateKey(rand.Reader, 2048)
		if err == nil {
			s.privateKey = key
		}
	}

	return s
}

func (s *oidcService) ValidateClient(clientID, clientSecret, redirectURI string) (*models.OAuthClient, error) {
	client, err := s.queries.OIDC.GetClientByID(clientID)
	if err != nil {
		return nil, err
	}
	if client == nil {
		return nil, errors.New("invalid_client")
	}

	// Verify secret if it's a confidential client and secret is provided
	// (Secret is not required for front-channel authorize/consent requests)
	if !client.IsPublic && clientSecret != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(client.ClientSecretHash), []byte(clientSecret)); err != nil {
			return nil, errors.New("invalid_client_secret")
		}
	}

	// Validate redirect URI
	validURI := false
	for _, uri := range client.RedirectURIs {
		if uri == redirectURI {
			validURI = true
			break
		}
	}
	if !validURI {
		return nil, errors.New("invalid_redirect_uri")
	}

	return client, nil
}

func (s *oidcService) CreateAuthorizationCode(userID, orgID, clientID, scope, nonce, redirectURI string) (string, error) {
	code := uuid.New().String()
	authCode := &models.OIDCAuthCode{
		Code:           code,
		UserID:         userID,
		OrganizationID: orgID,
		ClientID:       clientID,
		Scope:          scope,
		RedirectURI:    redirectURI,
		ExpiresAt:      time.Now().Add(10 * time.Minute),
	}
	if nonce != "" {
		authCode.Nonce = &nonce
	}

	if err := s.queries.OIDC.SaveAuthCode(authCode); err != nil {
		return "", err
	}

	return code, nil
}

func (s *oidcService) ExchangeCodeForToken(code, clientID, clientSecret string) (*TokenResponse, error) {
	authCode, err := s.queries.OIDC.GetAuthCode(code)
	if err != nil {
		return nil, err
	}
	if authCode == nil || authCode.Used || authCode.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("invalid_grant")
	}

	// Validate client and secret
	client, err := s.ValidateClient(clientID, clientSecret, authCode.RedirectURI)
	if err != nil {
		return nil, err
	}

	// Enforce client secret for confidential clients during token exchange
	if !client.IsPublic && clientSecret == "" {
		return nil, errors.New("invalid_client_secret")
	}

	// Mark code as used
	if err := s.queries.OIDC.MarkAuthCodeUsed(code); err != nil {
		return nil, err
	}

	// Fetch user profile for ID token claims
	user, err := s.queries.Auth.GetUserByID(authCode.UserID, authCode.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user for ID token claims: %w", err)
	}

	// Generate ID Token (OIDC)
	now := time.Now()
	idClaims := jwt.MapClaims{
		"iss":   s.config.OIDCIssuer,
		"sub":   authCode.UserID,
		"aud":   clientID,
		"exp":   now.Add(time.Hour).Unix(),
		"iat":   now.Unix(),
		"nonce": authCode.Nonce,
	}

	// Add profile and email claims based on requested scopes
	if user != nil {
		idClaims["email"] = user.Email
		idClaims["email_verified"] = user.EmailVerified
		idClaims["name"] = user.DisplayName
		idClaims["preferred_username"] = user.Username
	}

	idToken := jwt.NewWithClaims(jwt.SigningMethodRS256, idClaims)
	idToken.Header["kid"] = jwksKeyID
	idTokenString, err := idToken.SignedString(s.privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign id_token: %w", err)
	}

	// Access Token (Structured RS256 JWT)
	accessClaims := jwt.MapClaims{
		"iss":             s.config.OIDCIssuer,
		"sub":             authCode.UserID,
		"aud":             clientID,
		"exp":             now.Add(time.Hour).Unix(),
		"iat":             now.Unix(),
		"scope":           authCode.Scope,
		"client_id":       clientID,
		"type":            "access",
		"organization_id": authCode.OrganizationID,
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodRS256, accessClaims)
	accessToken.Header["kid"] = jwksKeyID
	accessTokenString, err := accessToken.SignedString(s.privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign access_token: %w", err)
	}

	return &TokenResponse{
		AccessToken: accessTokenString,
		IDToken:     idTokenString,
		TokenType:   "Bearer",
		ExpiresIn:   3600,
		Scope:       authCode.Scope,
	}, nil
}

func (s *oidcService) GetDiscoveryConfiguration() map[string]interface{} {
	issuer := s.config.OIDCIssuer
	return map[string]interface{}{
		"issuer":                                issuer,
		"authorization_endpoint":                issuer + "/api/v1/oauth2/authorize",
		"token_endpoint":                        issuer + "/api/v1/oauth2/token",
		"userinfo_endpoint":                     issuer + "/api/v1/oauth2/userinfo",
		"jwks_uri":                              issuer + "/.well-known/jwks.json",
		"scopes_supported":                      []string{"openid", "profile", "email"},
		"response_types_supported":              []string{"code", "token", "id_token"},
		"subject_types_supported":               []string{"public"},
		"id_token_signing_alg_values_supported": []string{"RS256"},
	}
}

func (s *oidcService) UpdateClient(clientID string, client *models.OAuthClient) error {
	existing, err := s.queries.OIDC.GetClientByID(clientID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("client_not_found")
	}

	// Update fields
	existing.ClientName = client.ClientName
	existing.RedirectURIs = client.RedirectURIs
	existing.Scope = client.Scope
	existing.IsPublic = client.IsPublic
	existing.LogoURL = client.LogoURL
	existing.PolicyURI = client.PolicyURI
	existing.TosURI = client.TosURI
	existing.UpdatedAt = time.Now()

	return s.queries.OIDC.UpdateClient(existing)
}

func (s *oidcService) GetJWKS() (map[string]interface{}, error) {
	if s.privateKey == nil {
		return nil, errors.New("no_private_key_available")
	}

	publicKey := s.privateKey.Public().(*rsa.PublicKey)

	// RFC 7517: n and e must be base64url-encoded (no padding)
	nBytes := publicKey.N.Bytes()
	nBase64 := base64.RawURLEncoding.EncodeToString(nBytes)

	return map[string]interface{}{
		"keys": []map[string]interface{}{
			{
				"kty": "RSA",
				"alg": "RS256",
				"use": "sig",
				"kid": jwksKeyID,
				"n":   nBase64,
				"e":   "AQAB",
			},
		},
	}, nil
}
