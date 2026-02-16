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
