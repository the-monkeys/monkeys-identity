package queries

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

type OIDCQueries interface {
	WithTx(tx *sql.Tx) OIDCQueries
	WithContext(ctx context.Context) OIDCQueries

	// Client management
	GetClientByID(id string) (*models.OAuthClient, error)
	CreateClient(client *models.OAuthClient) error
	ListClientsByOrg(orgID string) ([]*models.OAuthClient, error)
	UpdateClient(client *models.OAuthClient) error
	DeleteClient(clientID, orgID string) error

	// Auth code management
	SaveAuthCode(code *models.OIDCAuthCode) error
	GetAuthCode(code string) (*models.OIDCAuthCode, error)
	MarkAuthCodeUsed(code string) error
}

type oidcQueries struct {
	db    *database.DB
	redis *redis.Client
	ctx   context.Context
	tx    *sql.Tx
}

func NewOIDCQueries(db *database.DB, redis *redis.Client) OIDCQueries {
	return &oidcQueries{
		db:    db,
		redis: redis,
		ctx:   context.Background(),
	}
}

func (q *oidcQueries) WithTx(tx *sql.Tx) OIDCQueries {
	return &oidcQueries{
		db:    q.db,
		redis: q.redis,
		ctx:   q.ctx,
		tx:    tx,
	}
}

func (q *oidcQueries) WithContext(ctx context.Context) OIDCQueries {
	return &oidcQueries{
		db:    q.db,
		redis: q.redis,
		ctx:   ctx,
		tx:    q.tx,
	}
}

func (q *oidcQueries) exec(query string, args ...interface{}) (sql.Result, error) {
	if q.tx != nil {
		return q.tx.ExecContext(q.ctx, query, args...)
	}
	return q.db.ExecContext(q.ctx, query, args...)
}

func (q *oidcQueries) queryRow(query string, args ...interface{}) *sql.Row {
	if q.tx != nil {
		return q.tx.QueryRowContext(q.ctx, query, args...)
	}
	return q.db.QueryRowContext(q.ctx, query, args...)
}

func (q *oidcQueries) GetClientByID(id string) (*models.OAuthClient, error) {
	query := `
		SELECT id, organization_id, client_name, client_secret_hash, redirect_uris, 
		       grant_types, response_types, scope, is_public, is_trusted, 
		       logo_url, policy_uri, tos_uri, created_at, updated_at
		FROM oauth_clients
		WHERE id = $1 AND deleted_at IS NULL`

	client := &models.OAuthClient{}
	var redirectURIs, grantTypes, responseTypes database.StringArray

	err := q.queryRow(query, id).Scan(
		&client.ID, &client.OrganizationID, &client.ClientName, &client.ClientSecretHash,
		&redirectURIs, &grantTypes, &responseTypes, &client.Scope, &client.IsPublic,
		&client.IsTrusted, &client.LogoURL, &client.PolicyURI, &client.TosURI,
		&client.CreatedAt, &client.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get oauth client: %w", err)
	}

	client.RedirectURIs = []string(redirectURIs)
	client.GrantTypes = []string(grantTypes)
	client.ResponseTypes = []string(responseTypes)

	return client, nil
}

func (q *oidcQueries) SaveAuthCode(code *models.OIDCAuthCode) error {
	query := `
		INSERT INTO oidc_codes (code, user_id, client_id, scope, nonce, redirect_uri, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := q.exec(query,
		code.Code, code.UserID, code.ClientID, code.Scope, code.Nonce, code.RedirectURI, code.ExpiresAt)

	if err != nil {
		return fmt.Errorf("failed to save oidc code: %w", err)
	}
	return nil
}

func (q *oidcQueries) GetAuthCode(code string) (*models.OIDCAuthCode, error) {
	query := `
		SELECT code, user_id, client_id, scope, nonce, redirect_uri, expires_at, used, created_at
		FROM oidc_codes
		WHERE code = $1`

	authCode := &models.OIDCAuthCode{}
	err := q.queryRow(query, code).Scan(
		&authCode.Code, &authCode.UserID, &authCode.ClientID, &authCode.Scope,
		&authCode.Nonce, &authCode.RedirectURI, &authCode.ExpiresAt, &authCode.Used,
		&authCode.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get oidc code: %w", err)
	}

	return authCode, nil
}

func (q *oidcQueries) MarkAuthCodeUsed(code string) error {
	query := `UPDATE oidc_codes SET used = TRUE WHERE code = $1`
	_, err := q.exec(query, code)

	if err != nil {
		return fmt.Errorf("failed to mark oidc code as used: %w", err)
	}
	return nil
}

// CreateClient registers a new OIDC client application
func (q *oidcQueries) CreateClient(client *models.OAuthClient) error {
	query := `
		INSERT INTO oauth_clients (id, organization_id, client_name, client_secret_hash, 
			redirect_uris, grant_types, response_types, scope, is_public, is_trusted,
			logo_url, policy_uri, tos_uri, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`

	_, err := q.exec(query,
		client.ID, client.OrganizationID, client.ClientName, client.ClientSecretHash,
		database.StringArray(client.RedirectURIs), database.StringArray(client.GrantTypes),
		database.StringArray(client.ResponseTypes), client.Scope, client.IsPublic, client.IsTrusted,
		client.LogoURL, client.PolicyURI, client.TosURI, client.CreatedAt, client.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create oauth client: %w", err)
	}
	return nil
}

// ListClientsByOrg returns all OIDC clients for an organization
func (q *oidcQueries) ListClientsByOrg(orgID string) ([]*models.OAuthClient, error) {
	query := `
		SELECT id, organization_id, client_name, client_secret_hash, redirect_uris, 
		       grant_types, response_types, scope, is_public, is_trusted, 
		       logo_url, policy_uri, tos_uri, created_at, updated_at
		FROM oauth_clients
		WHERE organization_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC`

	var db interface {
		QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	} = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list oauth clients: %w", err)
	}
	defer rows.Close()

	var clients []*models.OAuthClient
	for rows.Next() {
		client := &models.OAuthClient{}
		var redirectURIs, grantTypes, responseTypes database.StringArray
		err := rows.Scan(
			&client.ID, &client.OrganizationID, &client.ClientName, &client.ClientSecretHash,
			&redirectURIs, &grantTypes, &responseTypes, &client.Scope, &client.IsPublic,
			&client.IsTrusted, &client.LogoURL, &client.PolicyURI, &client.TosURI,
			&client.CreatedAt, &client.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan oauth client: %w", err)
		}
		client.RedirectURIs = []string(redirectURIs)
		client.GrantTypes = []string(grantTypes)
		client.ResponseTypes = []string(responseTypes)
		clients = append(clients, client)
	}

	return clients, nil
}

// UpdateClient updates an existing OIDC client application
func (q *oidcQueries) UpdateClient(client *models.OAuthClient) error {
	query := `
		UPDATE oauth_clients
		SET client_name = $1, redirect_uris = $2, grant_types = $3, 
		    response_types = $4, scope = $5, is_public = $6, is_trusted = $7, 
		    logo_url = $8, policy_uri = $9, tos_uri = $10, updated_at = $11
		WHERE id = $12 AND organization_id = $13 AND deleted_at IS NULL`

	_, err := q.exec(query,
		client.ClientName, database.StringArray(client.RedirectURIs),
		database.StringArray(client.GrantTypes), database.StringArray(client.ResponseTypes),
		client.Scope, client.IsPublic, client.IsTrusted, client.LogoURL,
		client.PolicyURI, client.TosURI, client.UpdatedAt, client.ID, client.OrganizationID)

	if err != nil {
		return fmt.Errorf("failed to update oauth client: %w", err)
	}
	return nil
}

// DeleteClient soft-deletes an OIDC client
func (q *oidcQueries) DeleteClient(clientID, orgID string) error {
	query := `UPDATE oauth_clients SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	result, err := q.exec(query, clientID, orgID)
	if err != nil {
		return fmt.Errorf("failed to delete oauth client: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("client not found")
	}
	return nil
}
