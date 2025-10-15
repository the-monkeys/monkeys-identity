package queries

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// UserQueries defines all user management database operations
type UserQueries interface {
	// Transaction and context support
	WithTx(tx *sql.Tx) UserQueries
	WithContext(ctx context.Context) UserQueries

	// User CRUD operations
	ListUsers(params ListParams) (*ListResult[models.User], error)
	GetUser(id string) (*models.User, error)
	CreateUser(user *models.User) error
	UpdateUser(user *models.User) error
	DeleteUser(id string) error

	// User profile operations (using User model for now)
	GetUserProfile(userID string) (*models.User, error)
	UpdateUserProfile(userID string, updates map[string]interface{}) error

	// User status operations
	SuspendUser(userID, reason string) error
	ActivateUser(userID string) error

	// User session operations
	GetUserSessions(userID string) ([]models.Session, error)
	RevokeUserSessions(userID string) error

	// Service account operations
	ListServiceAccounts(params ListParams) (*ListResult[models.ServiceAccount], error)
	CreateServiceAccount(sa *models.ServiceAccount) error
	GetServiceAccount(id string) (*models.ServiceAccount, error)
	UpdateServiceAccount(sa *models.ServiceAccount) error
	DeleteServiceAccount(id string) error

	// API key operations
	GenerateAPIKey(saID string, key *models.APIKey) error
	ListAPIKeys(saID string) ([]models.APIKey, error)
	RevokeAPIKey(saID, keyID string) error
	RotateServiceAccountKeys(saID string) error
}

// userQueries implements UserQueries
type userQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

// NewUserQueries creates a new UserQueries instance
func NewUserQueries(db *database.DB, redis *redis.Client) UserQueries {
	return &userQueries{
		db:    db,
		redis: redis,
		ctx:   context.Background(),
	}
}

// WithTx returns a new UserQueries instance that will run all SQL queries within a transaction
func (q *userQueries) WithTx(tx *sql.Tx) UserQueries {
	return &userQueries{
		db:    q.db,
		redis: q.redis,
		tx:    tx,
		ctx:   q.ctx,
	}
}

// WithContext returns a new UserQueries instance with context
func (q *userQueries) WithContext(ctx context.Context) UserQueries {
	return &userQueries{
		db:    q.db,
		redis: q.redis,
		tx:    q.tx,
		ctx:   ctx,
	}
}

// exec executes a query using either the transaction or the database
func (q *userQueries) exec(query string, args ...interface{}) (sql.Result, error) {
	if q.tx != nil {
		return q.tx.ExecContext(q.ctx, query, args...)
	}
	return q.db.ExecContext(q.ctx, query, args...)
}

// queryRow executes a query that returns a single row using either the transaction or the database
func (q *userQueries) queryRow(query string, args ...interface{}) *sql.Row {
	if q.tx != nil {
		return q.tx.QueryRowContext(q.ctx, query, args...)
	}
	return q.db.QueryRowContext(q.ctx, query, args...)
}

// query executes a query that returns multiple rows using either the transaction or the database
func (q *userQueries) query(query string, args ...interface{}) (*sql.Rows, error) {
	if q.tx != nil {
		return q.tx.QueryContext(q.ctx, query, args...)
	}
	return q.db.QueryContext(q.ctx, query, args...)
}

// Placeholder implementations - these will be implemented as needed
func (q *userQueries) ListUsers(params ListParams) (*ListResult[models.User], error) {
	// Build the query with sorting
	sortColumn := "created_at" // default
	switch params.SortBy {
	case "username", "email", "display_name", "created_at", "updated_at":
		sortColumn = params.SortBy
	}

	order := "DESC"
	if params.Order == "asc" {
		order = "ASC"
	}

	// Query to get users with pagination
	query := `
		SELECT id, username, email, email_verified, display_name, avatar_url,
		       organization_id, password_changed_at, mfa_enabled, mfa_methods,
		       mfa_backup_codes, attributes, preferences, last_login,
		       failed_login_attempts, locked_until, status, created_at, updated_at, deleted_at
		FROM users
		WHERE deleted_at IS NULL
		ORDER BY ` + sortColumn + ` ` + order + `
		LIMIT $1 OFFSET $2
	`

	rows, err := q.query(query, params.Limit, params.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var avatarURL sql.NullString
		var lastLogin sql.NullTime
		var lockedUntil sql.NullTime
		var deletedAt sql.NullTime
		var mfaMethods string
		var mfaBackupCodes sql.NullString
		var attributes string
		var preferences string

		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.EmailVerified, &user.DisplayName,
			&avatarURL, &user.OrganizationID, &user.PasswordChangedAt, &user.MFAEnabled,
			&mfaMethods, &mfaBackupCodes, &attributes, &preferences,
			&lastLogin, &user.FailedLoginAttempts, &lockedUntil, &user.Status,
			&user.CreatedAt, &user.UpdatedAt, &deletedAt,
		)
		if err != nil {
			return nil, err
		}

		// Handle nullable fields
		if avatarURL.Valid {
			user.AvatarURL = avatarURL.String
		}
		if lastLogin.Valid {
			user.LastLogin = lastLogin.Time
		}
		if lockedUntil.Valid {
			user.LockedUntil = lockedUntil.Time
		}
		if deletedAt.Valid {
			user.DeletedAt = deletedAt.Time
		}

		// For now, set these as empty slices - proper JSON unmarshaling would be needed
		user.MFAMethods = []string{}
		user.MFABackupCodes = []string{}
		user.Attributes = attributes
		user.Preferences = preferences

		users = append(users, user)
	} // Get total count for pagination
	countQuery := `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`
	var total int64
	err = q.queryRow(countQuery).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(params.Limit) - 1) / int64(params.Limit))
	hasMore := params.Offset+params.Limit < int(total)

	return &ListResult[models.User]{
		Items:      users,
		Total:      total,
		Limit:      params.Limit,
		Offset:     params.Offset,
		HasMore:    hasMore,
		TotalPages: totalPages,
	}, nil
}

func (q *userQueries) GetUser(id string) (*models.User, error) {
	query := `
		SELECT
			id, username, email, email_verified, display_name,
			avatar_url, organization_id, password_changed_at, mfa_enabled,
			mfa_methods, mfa_backup_codes, attributes, preferences,
			last_login, failed_login_attempts, locked_until, status,
			created_at, updated_at, deleted_at
		FROM users
		WHERE id = $1 AND status = 'active'
	`

	var user models.User
	var avatarURL sql.NullString
	var lastLogin sql.NullTime
	var lockedUntil sql.NullTime
	var deletedAt sql.NullTime
	var mfaMethods string
	var mfaBackupCodes sql.NullString
	var attributes string
	var preferences string

	err := q.queryRow(query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.EmailVerified,
		&user.DisplayName,
		&avatarURL,
		&user.OrganizationID,
		&user.PasswordChangedAt,
		&user.MFAEnabled,
		&mfaMethods,
		&mfaBackupCodes,
		&attributes,
		&preferences,
		&lastLogin,
		&user.FailedLoginAttempts,
		&lockedUntil,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
		&deletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	// Handle nullable fields
	if avatarURL.Valid {
		user.AvatarURL = avatarURL.String
	}
	if lastLogin.Valid {
		user.LastLogin = lastLogin.Time
	}
	if lockedUntil.Valid {
		user.LockedUntil = lockedUntil.Time
	}
	if deletedAt.Valid {
		user.DeletedAt = deletedAt.Time
	}

	// For now, set these as empty slices - proper JSON unmarshaling would be needed
	user.MFAMethods = []string{}
	user.MFABackupCodes = []string{}

	return &user, nil
}

func (q *userQueries) CreateUser(user *models.User) error {
	query := `
		INSERT INTO users (
			id, username, email, email_verified, display_name,
			avatar_url, organization_id, password_hash, password_changed_at,
			mfa_enabled, mfa_methods, mfa_backup_codes, attributes, preferences,
			last_login, failed_login_attempts, locked_until, status,
			created_at, updated_at, deleted_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13, $14,
			$15, $16, $17, $18,
			$19, $20, $21
		)
	`

	// Set default values for nullable fields
	var avatarURL *string
	if user.AvatarURL != "" {
		avatarURL = &user.AvatarURL
	}
	var lastLogin *time.Time
	if !user.LastLogin.IsZero() {
		lastLogin = &user.LastLogin
	}
	var lockedUntil *time.Time
	if !user.LockedUntil.IsZero() {
		lockedUntil = &user.LockedUntil
	}
	var deletedAt *time.Time
	if !user.DeletedAt.IsZero() {
		deletedAt = &user.DeletedAt
	}

	// Convert slices to JSON strings for now (simplified)
	mfaMethodsJSON := "[]"
	if len(user.MFAMethods) > 0 {
		// This would need proper JSON marshaling in a real implementation
		mfaMethodsJSON = "[]"
	}
	attributesJSON := "{}"
	preferencesJSON := "{}"
	var mfaBackupCodesStr *string
	if user.MFABackupCodes != nil && len(user.MFABackupCodes) > 0 {
		// For now, store as simple string - proper JSON marshaling would be needed
		codes := strings.Join(user.MFABackupCodes, ",")
		mfaBackupCodesStr = &codes
	}

	_, err := q.exec(query,
		user.ID, user.Username, user.Email, user.EmailVerified, user.DisplayName,
		avatarURL, user.OrganizationID, user.PasswordHash, user.PasswordChangedAt,
		user.MFAEnabled, mfaMethodsJSON, mfaBackupCodesStr, attributesJSON, preferencesJSON,
		lastLogin, user.FailedLoginAttempts, lockedUntil, user.Status,
		user.CreatedAt, user.UpdatedAt, deletedAt,
	)
	return err
}

func (q *userQueries) UpdateUser(user *models.User) error {
	query := `
		UPDATE users SET
			username = $2,
			email = $3,
			email_verified = $4,
			display_name = $5,
			avatar_url = $6,
			organization_id = $7,
			password_hash = $8,
			password_changed_at = $9,
			mfa_enabled = $10,
			mfa_methods = $11,
			mfa_backup_codes = $12,
			attributes = $13,
			preferences = $14,
			last_login = $15,
			failed_login_attempts = $16,
			locked_until = $17,
			status = $18,
			updated_at = $19,
			deleted_at = $20
		WHERE id = $1
	`

	// Handle nullable fields
	var avatarURL *string
	if user.AvatarURL != "" {
		avatarURL = &user.AvatarURL
	}
	var lastLogin *time.Time
	if !user.LastLogin.IsZero() {
		lastLogin = &user.LastLogin
	}
	var lockedUntil *time.Time
	if !user.LockedUntil.IsZero() {
		lockedUntil = &user.LockedUntil
	}
	var deletedAt *time.Time
	if !user.DeletedAt.IsZero() {
		deletedAt = &user.DeletedAt
	}

	// Convert slices to JSON strings (simplified)
	mfaMethodsJSON := "[]"
	attributesJSON := "{}"
	preferencesJSON := "{}"

	_, err := q.exec(query,
		user.ID, user.Username, user.Email, user.EmailVerified, user.DisplayName,
		avatarURL, user.OrganizationID, user.PasswordHash, user.PasswordChangedAt,
		user.MFAEnabled, mfaMethodsJSON, user.MFABackupCodes, attributesJSON, preferencesJSON,
		lastLogin, user.FailedLoginAttempts, lockedUntil, user.Status,
		user.UpdatedAt, deletedAt,
	)
	return err
}

func (q *userQueries) DeleteUser(id string) error {
	query := `
		UPDATE users SET
			status = 'deleted',
			deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND status != 'deleted'
	`

	result, err := q.exec(query, id)
	if err != nil {
		return err
	}

	// Check if any row was affected
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found or already deleted")
	}

	return nil
}

func (q *userQueries) GetUserProfile(userID string) (*models.User, error) {
	// For now, profile is the same as user data but without sensitive fields
	// This can be extended later to include additional profile-specific data
	return q.GetUser(userID)
}

func (q *userQueries) UpdateUserProfile(userID string, updates map[string]interface{}) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) SuspendUser(userID, reason string) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) ActivateUser(userID string) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) GetUserSessions(userID string) ([]models.Session, error) {
	// TODO: Implement
	return nil, nil
}

func (q *userQueries) RevokeUserSessions(userID string) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) ListServiceAccounts(params ListParams) (*ListResult[models.ServiceAccount], error) {
	// TODO: Implement
	return &ListResult[models.ServiceAccount]{}, nil
}

func (q *userQueries) CreateServiceAccount(sa *models.ServiceAccount) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) GetServiceAccount(id string) (*models.ServiceAccount, error) {
	// TODO: Implement
	return nil, nil
}

func (q *userQueries) UpdateServiceAccount(sa *models.ServiceAccount) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) DeleteServiceAccount(id string) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) GenerateAPIKey(saID string, key *models.APIKey) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) ListAPIKeys(saID string) ([]models.APIKey, error) {
	// TODO: Implement
	return nil, nil
}

func (q *userQueries) RevokeAPIKey(saID, keyID string) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) RotateServiceAccountKeys(saID string) error {
	// TODO: Implement
	return nil
}
