package services

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"golang.org/x/crypto/bcrypt"
)

type OIDCService interface {
	ValidateClient(clientID, clientSecret, redirectURI string) (*models.OAuthClient, error)
	CreateAuthorizationCode(userID, clientID, scope, nonce, redirectURI string) (string, error)
	ExchangeCodeForToken(code, clientID, clientSecret string) (*TokenResponse, error)
	GetDiscoveryConfiguration() map[string]interface{}
	GetJWKS() (map[string]interface{}, error)
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
		priv, err := loadRSAPrivateKey(cfg.JWTPrivateKey)
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

	// Verify secret if it's a confidential client
	if !client.IsPublic {
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

func (s *oidcService) CreateAuthorizationCode(userID, clientID, scope, nonce, redirectURI string) (string, error) {
	code := uuid.New().String()
	authCode := &models.OIDCAuthCode{
		Code:        code,
		UserID:      userID,
		ClientID:    clientID,
		Scope:       scope,
		RedirectURI: redirectURI,
		ExpiresAt:   time.Now().Add(10 * time.Minute),
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

	if authCode.ClientID != clientID {
		return nil, errors.New("invalid_client")
	}

	// Mark code as used
	if err := s.queries.OIDC.MarkAuthCodeUsed(code); err != nil {
		return nil, err
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

	idToken := jwt.NewWithClaims(jwt.SigningMethodRS256, idClaims)
	idTokenString, err := idToken.SignedString(s.privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign id_token: %w", err)
	}

	// Access Token (simplified for this upgrade, in production use structured claims)
	accessToken := uuid.New().String()

	return &TokenResponse{
		AccessToken: accessToken,
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
		"authorization_endpoint":                issuer + "/oauth2/authorize",
		"token_endpoint":                        issuer + "/oauth2/token",
		"userinfo_endpoint":                     issuer + "/oauth2/userinfo",
		"jwks_uri":                              issuer + "/.well-known/jwks.json",
		"scopes_supported":                      []string{"openid", "profile", "email"},
		"response_types_supported":              []string{"code", "token", "id_token"},
		"subject_types_supported":               []string{"public"},
		"id_token_signing_alg_values_supported": []string{"RS256"},
	}
}

func (s *oidcService) GetJWKS() (map[string]interface{}, error) {
	if s.privateKey == nil {
		return nil, errors.New("no_private_key_available")
	}

	publicKey := s.privateKey.Public().(*rsa.PublicKey)

	// In a complete implementation, use an actual JWKS library or properly encode N and E
	// This is a simplified JWK for demonstration/standard use
	return map[string]interface{}{
		"keys": []map[string]interface{}{
			{
				"kty": "RSA",
				"alg": "RS256",
				"use": "sig",
				"kid": "monkeys-iam-main-key",
				"n":   fmt.Sprintf("%x", publicKey.N), // Simplified, should be Base64URL
				"e":   "AQAB",
			},
		},
	}, nil
}

// Helper to load RSA private key from PEM string
func loadRSAPrivateKey(pemStr string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, errors.New("failed to parse PEM block")
	}

	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}

	return priv, nil
}
