package queries

import (
	"context"
	"database/sql"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// AuthQueries defines all authentication-related database operations
type AuthQueries interface {
	// Transaction and context support
	WithTx(tx *sql.Tx) AuthQueries
	WithContext(ctx context.Context) AuthQueries

	// User management
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id string) (*models.User, error)
	CreateUser(user *models.User) error
	CreateAdminUser(user *models.User) error
	CheckAdminExists() (bool, error)
	UpdateUser(user *models.User) error
	UpdateLastLogin(userID string) error
	UpdatePassword(userID, passwordHash string) error
	UpdateEmailVerification(userID string, verified bool) error

	// Session management
	CreateSession(sessionID, userID, token string) error
	GetSession(sessionID string) (map[string]string, error)
	DeleteSession(sessionID string) error
	InvalidateUserSessions(userID string) error

	// Token management (Redis operations)
	SetPasswordResetToken(userID, token string, expiry time.Duration) error
	GetPasswordResetToken(token string) (string, error)
	DeletePasswordResetToken(token string) error
	SetEmailVerificationToken(userID, token string, expiry time.Duration) error
	GetEmailVerificationToken(token string) (string, error)
	DeleteEmailVerificationToken(token string) error
}

// authQueries implements AuthQueries
type authQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

// NewAuthQueries creates a new AuthQueries instance
func NewAuthQueries(db *database.DB, redis *redis.Client) AuthQueries {
	return &authQueries{
		db:    db,
		redis: redis,
		ctx:   context.Background(),
	}
}

// WithTx returns a new AuthQueries instance that will run all SQL queries within a transaction
func (q *authQueries) WithTx(tx *sql.Tx) AuthQueries {
	return &authQueries{
		db:    q.db,
		redis: q.redis,
		tx:    tx,
		ctx:   q.ctx,
	}
}

// WithContext returns a new AuthQueries instance with context
func (q *authQueries) WithContext(ctx context.Context) AuthQueries {
	return &authQueries{
		db:    q.db,
		redis: q.redis,
		tx:    q.tx,
		ctx:   ctx,
	}
}

// exec executes a query using either the transaction or the database
func (q *authQueries) exec(query string, args ...interface{}) (sql.Result, error) {
	if q.tx != nil {
		return q.tx.ExecContext(q.ctx, query, args...)
	}
	return q.db.ExecContext(q.ctx, query, args...)
}

// queryRow executes a query that returns a single row using either the transaction or the database
func (q *authQueries) queryRow(query string, args ...interface{}) *sql.Row {
	if q.tx != nil {
		return q.tx.QueryRowContext(q.ctx, query, args...)
	}
	return q.db.QueryRowContext(q.ctx, query, args...)
}

// query executes a query that returns multiple rows using either the transaction or the database
func (q *authQueries) query(query string, args ...interface{}) (*sql.Rows, error) {
	if q.tx != nil {
		return q.tx.QueryContext(q.ctx, query, args...)
	}
	return q.db.QueryContext(q.ctx, query, args...)
}

// GetUserByEmail retrieves a user by email address
func (q *authQueries) GetUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, username, email, display_name, organization_id, password_hash, 
		       status, email_verified, created_at, updated_at, last_login
		FROM users WHERE email = $1 AND deleted_at IS NULL
	`

	var user models.User
	var lastLogin *time.Time

	err := q.queryRow(query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.DisplayName,
		&user.OrganizationID, &user.PasswordHash, &user.Status,
		&user.EmailVerified, &user.CreatedAt, &user.UpdatedAt, &lastLogin,
	)

	if err != nil {
		return nil, err
	}

	if lastLogin != nil {
		user.LastLogin = *lastLogin
	}

	return &user, nil
}

// GetUserByID retrieves a user by ID
func (q *authQueries) GetUserByID(id string) (*models.User, error) {
	query := `
		SELECT id, username, email, display_name, organization_id, password_hash, 
		       status, email_verified, created_at, updated_at, last_login
		FROM users WHERE id = $1 AND deleted_at IS NULL
	`

	var user models.User
	var lastLogin *time.Time

	err := q.queryRow(query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.DisplayName,
		&user.OrganizationID, &user.PasswordHash, &user.Status,
		&user.EmailVerified, &user.CreatedAt, &user.UpdatedAt, &lastLogin,
	)

	if err != nil {
		return nil, err
	}

	if lastLogin != nil {
		user.LastLogin = *lastLogin
	}

	return &user, nil
}

// CreateUser creates a new user in the database
func (q *authQueries) CreateUser(user *models.User) error {
	query := `
		INSERT INTO users (id, username, email, display_name, organization_id, 
		                   password_hash, status, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := q.exec(query,
		user.ID, user.Username, user.Email, user.DisplayName,
		user.OrganizationID, user.PasswordHash, user.Status,
		user.EmailVerified, user.CreatedAt, user.UpdatedAt,
	)

	return err
}

// CreateAdminUser creates a new admin user with all privileges
func (q *authQueries) CreateAdminUser(user *models.User) error {
	// Start transaction
	tx, err := q.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Create default organization if it doesn't exist
	orgQuery := `
		INSERT INTO organizations (id, name, slug, status, created_at, updated_at)
		VALUES ($1, 'Default Organization', 'default', 'active', $2, $3)
		ON CONFLICT (slug) DO NOTHING
	`
	_, err = tx.ExecContext(q.ctx, orgQuery, user.OrganizationID, time.Now(), time.Now())
	if err != nil {
		return err
	}

	// Create user
	userQuery := `
		INSERT INTO users (id, username, email, display_name, organization_id, 
		                   password_hash, status, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err = tx.ExecContext(q.ctx, userQuery,
		user.ID, user.Username, user.Email, user.DisplayName,
		user.OrganizationID, user.PasswordHash, user.Status,
		user.EmailVerified, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		return err
	}

	// Create admin role if it doesn't exist
	roleQuery := `
		INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
		VALUES (gen_random_uuid(), 'admin', 'Administrator with full system access', $1, $2, $3)
		ON CONFLICT (name, organization_id) DO NOTHING
	`
	_, err = tx.ExecContext(q.ctx, roleQuery, user.OrganizationID, time.Now(), time.Now())
	if err != nil {
		return err
	}

	// Get the admin role ID
	var roleID string
	getRoleQuery := `SELECT id FROM roles WHERE name = 'admin' AND organization_id = $1`
	err = tx.QueryRowContext(q.ctx, getRoleQuery, user.OrganizationID).Scan(&roleID)
	if err != nil {
		return err
	}

	// Assign admin role to user
	assignRoleQuery := `
		INSERT INTO role_assignments (id, role_id, principal_id, principal_type, assigned_at, assigned_by)
		VALUES (gen_random_uuid(), $1, $2, 'user', $3, $2)
	`
	_, err = tx.ExecContext(q.ctx, assignRoleQuery, roleID, user.ID, time.Now())
	if err != nil {
		return err
	}

	return tx.Commit()
}

// CheckAdminExists checks if any admin user exists in the system
func (q *authQueries) CheckAdminExists() (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM role_assignments ra
			JOIN roles r ON ra.role_id = r.id
			WHERE r.name = 'admin' AND r.deleted_at IS NULL
			AND ra.principal_type = 'user'
		)
	`

	var exists bool
	err := q.queryRow(query).Scan(&exists)
	return exists, err
}

// UpdateUser updates an existing user
func (q *authQueries) UpdateUser(user *models.User) error {
	query := `
		UPDATE users 
		SET username = $2, email = $3, display_name = $4, organization_id = $5, 
		    status = $6, email_verified = $7, updated_at = $8
		WHERE id = $1 AND deleted_at IS NULL
	`

	_, err := q.exec(query,
		user.ID, user.Username, user.Email, user.DisplayName,
		user.OrganizationID, user.Status, user.EmailVerified, user.UpdatedAt,
	)

	return err
}

// UpdateLastLogin updates the last login timestamp for a user
func (q *authQueries) UpdateLastLogin(userID string) error {
	query := `UPDATE users SET last_login = $1 WHERE id = $2`
	_, err := q.exec(query, time.Now(), userID)
	return err
}

// UpdatePassword updates a user's password hash
func (q *authQueries) UpdatePassword(userID, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1, password_changed_at = $2, updated_at = $3 WHERE id = $4`
	_, err := q.exec(query, passwordHash, time.Now(), time.Now(), userID)
	return err
}

// UpdateEmailVerification updates a user's email verification status
func (q *authQueries) UpdateEmailVerification(userID string, verified bool) error {
	query := `UPDATE users SET email_verified = $1, updated_at = $2 WHERE id = $3`
	_, err := q.exec(query, verified, time.Now(), userID)
	return err
}

// CreateSession creates a new session in Redis
func (q *authQueries) CreateSession(sessionID, userID, token string) error {
	sessionKey := "session:" + sessionID

	sessionData := map[string]interface{}{
		"user_id":    userID,
		"token":      token,
		"created_at": time.Now().Unix(),
	}

	// Store session in Redis with 24 hour expiry
	return q.redis.HMSet(q.ctx, sessionKey, sessionData).Err()
}

// GetSession retrieves a session from Redis
func (q *authQueries) GetSession(sessionID string) (map[string]string, error) {
	sessionKey := "session:" + sessionID
	return q.redis.HGetAll(q.ctx, sessionKey).Result()
}

// DeleteSession removes a session from Redis
func (q *authQueries) DeleteSession(sessionID string) error {
	sessionKey := "session:" + sessionID
	return q.redis.Del(q.ctx, sessionKey).Err()
}

// InvalidateUserSessions removes all sessions for a user
func (q *authQueries) InvalidateUserSessions(userID string) error {
	pattern := "session:*"
	keys, err := q.redis.Keys(q.ctx, pattern).Result()
	if err != nil {
		return err
	}

	for _, key := range keys {
		sessionUserID, err2 := q.redis.HGet(q.ctx, key, "user_id").Result()

		if err2 == nil && sessionUserID == userID {
			q.redis.Del(q.ctx, key)
		}
	}

	return nil
}

// SetPasswordResetToken stores a password reset token in Redis
func (q *authQueries) SetPasswordResetToken(userID, token string, expiry time.Duration) error {
	key := "password_reset:" + token
	return q.redis.Set(q.ctx, key, userID, expiry).Err()
}

// GetPasswordResetToken retrieves the user ID associated with a password reset token
func (q *authQueries) GetPasswordResetToken(token string) (string, error) {
	key := "password_reset:" + token
	return q.redis.Get(q.ctx, key).Result()
}

// DeletePasswordResetToken removes a password reset token from Redis
func (q *authQueries) DeletePasswordResetToken(token string) error {
	key := "password_reset:" + token
	return q.redis.Del(q.ctx, key).Err()
}

// SetEmailVerificationToken stores an email verification token in Redis
func (q *authQueries) SetEmailVerificationToken(userID, token string, expiry time.Duration) error {
	key := "email_verification:" + token
	return q.redis.Set(q.ctx, key, userID, expiry).Err()
}

// GetEmailVerificationToken retrieves the user ID associated with an email verification token
func (q *authQueries) GetEmailVerificationToken(token string) (string, error) {
	key := "email_verification:" + token
	return q.redis.Get(q.ctx, key).Result()
}

// DeleteEmailVerificationToken removes an email verification token from Redis
func (q *authQueries) DeleteEmailVerificationToken(token string) error {
	key := "email_verification:" + token
	return q.redis.Del(q.ctx, key).Err()
}
