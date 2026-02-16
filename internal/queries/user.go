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
	ListUsers(params ListParams, organizationID string) (*ListResult[models.User], error)
	GetUser(id, organizationID string) (*models.User, error)
	CreateUser(user *models.User) error
	UpdateUser(user *models.User, organizationID string) error
	DeleteUser(id, organizationID string) error

	// User profile operations (using User model for now)
	GetUserProfile(userID, organizationID string) (*models.User, error)
	UpdateUserProfile(userID string, updates map[string]interface{}) error

	// User status operations
	SuspendUser(userID, organizationID, reason string) error
	ActivateUser(userID, organizationID string) error

	// User session operations
	GetUserSessions(userID, organizationID string) ([]models.Session, error)
	RevokeUserSessions(userID, organizationID string) error

	// Service account operations
	ListServiceAccounts(params ListParams, organizationID string) (*ListResult[models.ServiceAccount], error)
	CreateServiceAccount(sa *models.ServiceAccount) error
	GetServiceAccount(id, organizationID string) (*models.ServiceAccount, error)
	UpdateServiceAccount(sa *models.ServiceAccount, organizationID string) error
	DeleteServiceAccount(id, organizationID string) error

	// API key operations
	GenerateAPIKey(saID string, key *models.APIKey, organizationID string) error
	ListAPIKeys(saID, organizationID string) ([]models.APIKey, error)
	RevokeAPIKey(saID, keyID, organizationID string) error
	RotateServiceAccountKeys(saID, organizationID string) error
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
func (q *userQueries) ListUsers(params ListParams, organizationID string) (*ListResult[models.User], error) {
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
		WHERE deleted_at IS NULL AND organization_id = $3
		ORDER BY ` + sortColumn + ` ` + order + `
		LIMIT $1 OFFSET $2
	`

	rows, err := q.query(query, params.Limit, params.Offset, organizationID)
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
	countQuery := `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND organization_id = $1`
	var total int64
	err = q.queryRow(countQuery, organizationID).Scan(&total)
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

func (q *userQueries) GetUser(id, organizationID string) (*models.User, error) {
	query := `
		SELECT
			id, username, email, email_verified, display_name,
			avatar_url, organization_id, password_changed_at, mfa_enabled,
			mfa_methods, mfa_backup_codes, attributes, preferences,
			last_login, failed_login_attempts, locked_until, status,
			created_at, updated_at, deleted_at
		FROM users
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
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

	err := q.queryRow(query, id, organizationID).Scan(
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

func (q *userQueries) UpdateUser(user *models.User, organizationID string) error {
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
		WHERE id = $1 AND organization_id = $21
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

	// Use the fields from the user model
	attributesJSON := user.Attributes
	if attributesJSON == "" {
		attributesJSON = "{}"
	}
	preferencesJSON := user.Preferences
	if preferencesJSON == "" {
		preferencesJSON = "{}"
	}

	// Placeholder for MFA fields (maintaining existing logic pattern)
	mfaMethodsJSON := "{}"
	MFABackupCodesJSON := "{}"

	_, err := q.exec(query,
		user.ID, user.Username, user.Email, user.EmailVerified, user.DisplayName,
		avatarURL, user.OrganizationID, user.PasswordHash, user.PasswordChangedAt,
		user.MFAEnabled, mfaMethodsJSON, MFABackupCodesJSON, attributesJSON, preferencesJSON,
		lastLogin, user.FailedLoginAttempts, lockedUntil, user.Status,
		user.UpdatedAt, deletedAt, organizationID, // Added param
	)
	return err
}

func (q *userQueries) DeleteUser(id, organizationID string) error {
	query := `
		UPDATE users SET
			status = 'deleted',
			deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND organization_id = $2 AND status != 'deleted'
	`

	result, err := q.exec(query, id, organizationID)
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

func (q *userQueries) GetUserProfile(userID, organizationID string) (*models.User, error) {
	// For now, profile is the same as user data but without sensitive fields
	// This can be extended later to include additional profile-specific data
	return q.GetUser(userID, organizationID)
}

func (q *userQueries) UpdateUserProfile(userID string, updates map[string]interface{}) error {
	// TODO: Implement
	return nil
}

func (q *userQueries) SuspendUser(userID, organizationID, reason string) error {
	query := `
		UPDATE users SET
			status = 'suspended',
			attributes = attributes || jsonb_build_object('suspension_reason', $2::text),
			updated_at = NOW()
		WHERE id = $1 AND organization_id = $3 AND deleted_at IS NULL
	`
	result, err := q.exec(query, userID, reason, organizationID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (q *userQueries) ActivateUser(userID, organizationID string) error {
	query := `
		UPDATE users SET
			status = 'active',
			attributes = attributes - 'suspension_reason',
			updated_at = NOW()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	result, err := q.exec(query, userID, organizationID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (q *userQueries) GetUserSessions(userID, organizationID string) ([]models.Session, error) {
	query := `
		SELECT id, session_token, principal_id, principal_type, organization_id, 
		       assumed_role_id, mfa_verified, ip_address, user_agent, 
		       issued_at, expires_at, status
		FROM sessions 
		WHERE principal_id = $1 AND principal_type = 'user' AND organization_id = $2 AND status = 'active'
	`
	rows, err := q.query(query, userID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.Session
	for rows.Next() {
		var s models.Session
		var assumedRoleID sql.NullString
		var ipAddress sql.NullString
		var userAgent sql.NullString

		err := rows.Scan(
			&s.ID, &s.SessionToken, &s.PrincipalID, &s.PrincipalType, &s.OrganizationID,
			&assumedRoleID, &s.MFAVerified, &ipAddress, &userAgent,
			&s.IssuedAt, &s.ExpiresAt, &s.Status,
		)
		if err != nil {
			return nil, err
		}

		if assumedRoleID.Valid {
			s.AssumedRoleID = assumedRoleID.String
		}
		if ipAddress.Valid {
			s.IPAddress = ipAddress.String
		}
		if userAgent.Valid {
			s.UserAgent = userAgent.String
		}

		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (q *userQueries) RevokeUserSessions(userID, organizationID string) error {
	query := `UPDATE sessions SET status = 'revoked' WHERE principal_id = $1 AND principal_type = 'user' AND organization_id = $2 AND status = 'active'`
	_, err := q.exec(query, userID, organizationID)
	return err
}

func (q *userQueries) ListServiceAccounts(params ListParams, organizationID string) (*ListResult[models.ServiceAccount], error) {
	query := `
		SELECT id, name, description, organization_id, key_rotation_policy, 
		       allowed_ip_ranges, max_token_lifetime, last_key_rotation, attributes, 
		       status, created_at, updated_at, deleted_at
		FROM service_accounts 
		WHERE organization_id = $3 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.query(query, params.Limit, params.Offset, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sas []models.ServiceAccount
	for rows.Next() {
		var sa models.ServiceAccount
		var description sql.NullString
		var deletedAt sql.NullTime

		err := rows.Scan(
			&sa.ID, &sa.Name, &description, &sa.OrganizationID, &sa.KeyRotationPolicy,
			&sa.AllowedIPRanges, &sa.MaxTokenLifetime, &sa.LastKeyRotation, &sa.Attributes,
			&sa.Status, &sa.CreatedAt, &sa.UpdatedAt, &deletedAt,
		)
		if err != nil {
			return nil, err
		}

		if description.Valid {
			sa.Description = description.String
		}
		if deletedAt.Valid {
			sa.DeletedAt = deletedAt.Time
		}

		sas = append(sas, sa)
	}

	var total int64
	err = q.queryRow("SELECT COUNT(*) FROM service_accounts WHERE organization_id = $1 AND deleted_at IS NULL", organizationID).Scan(&total)
	if err != nil {
		return nil, err
	}

	return &ListResult[models.ServiceAccount]{
		Items:   sas,
		Total:   total,
		Limit:   params.Limit,
		Offset:  params.Offset,
		HasMore: params.Offset+len(sas) < int(total),
	}, nil
}

func (q *userQueries) CreateServiceAccount(sa *models.ServiceAccount) error {
	query := `
		INSERT INTO service_accounts (
			id, name, description, organization_id, key_rotation_policy, 
			allowed_ip_ranges, max_token_lifetime, attributes, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at
	`
	return q.queryRow(query,
		sa.ID, sa.Name, sa.Description, sa.OrganizationID, sa.KeyRotationPolicy,
		sa.AllowedIPRanges, sa.MaxTokenLifetime, sa.Attributes, sa.Status,
	).Scan(&sa.CreatedAt, &sa.UpdatedAt)
}

func (q *userQueries) GetServiceAccount(id, organizationID string) (*models.ServiceAccount, error) {
	query := `
		SELECT id, name, description, organization_id, key_rotation_policy, 
		       allowed_ip_ranges, max_token_lifetime, last_key_rotation, attributes, 
		       status, created_at, updated_at, deleted_at
		FROM service_accounts 
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	var sa models.ServiceAccount
	var description sql.NullString
	var deletedAt sql.NullTime

	err := q.queryRow(query, id, organizationID).Scan(
		&sa.ID, &sa.Name, &description, &sa.OrganizationID, &sa.KeyRotationPolicy,
		&sa.AllowedIPRanges, &sa.MaxTokenLifetime, &sa.LastKeyRotation, &sa.Attributes,
		&sa.Status, &sa.CreatedAt, &sa.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("service account not found")
		}
		return nil, err
	}

	if description.Valid {
		sa.Description = description.String
	}
	if deletedAt.Valid {
		sa.DeletedAt = deletedAt.Time
	}

	return &sa, nil
}

func (q *userQueries) UpdateServiceAccount(sa *models.ServiceAccount, organizationID string) error {
	query := `
		UPDATE service_accounts SET
			name = $2, description = $3, key_rotation_policy = $4, 
			allowed_ip_ranges = $5, max_token_lifetime = $6, attributes = $7, 
			status = $8, updated_at = NOW()
		WHERE id = $1 AND organization_id = $9 AND deleted_at IS NULL
	`
	result, err := q.exec(query,
		sa.ID, sa.Name, sa.Description, sa.KeyRotationPolicy,
		sa.AllowedIPRanges, sa.MaxTokenLifetime, sa.Attributes,
		sa.Status, sa.OrganizationID,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("service account not found")
	}
	return nil
}

func (q *userQueries) DeleteServiceAccount(id, organizationID string) error {
	query := `UPDATE service_accounts SET deleted_at = NOW(), status = 'deleted' WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	result, err := q.exec(query, id, organizationID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("service account not found")
	}
	return nil
}

func (q *userQueries) GenerateAPIKey(saID string, key *models.APIKey, organizationID string) error {
	query := `
		INSERT INTO api_keys (
			id, name, key_id, key_hash, service_account_id, organization_id, 
			scopes, allowed_ip_ranges, rate_limit_per_hour, expires_at, status, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING created_at
	`
	return q.queryRow(query,
		key.ID, key.Name, key.KeyID, key.KeyHash, saID, organizationID,
		key.Scopes, key.AllowedIPRanges, key.RateLimitPerHour, key.ExpiresAt, key.Status, key.CreatedBy,
	).Scan(&key.CreatedAt)
}

func (q *userQueries) ListAPIKeys(saID, organizationID string) ([]models.APIKey, error) {
	query := `
		SELECT id, name, key_id, service_account_id, organization_id, 
		       scopes, allowed_ip_ranges, rate_limit_per_hour, last_used_at, 
		       usage_count, expires_at, status, created_at, created_by
		FROM api_keys 
		WHERE service_account_id = $1 AND organization_id = $2 AND status != 'deleted'
	`
	rows, err := q.query(query, saID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var key models.APIKey
		var lastUsedAt sql.NullTime
		var createdBy sql.NullString

		err := rows.Scan(
			&key.ID, &key.Name, &key.KeyID, &key.ServiceAccountID, &key.OrganizationID,
			&key.Scopes, &key.AllowedIPRanges, &key.RateLimitPerHour, &lastUsedAt,
			&key.UsageCount, &key.ExpiresAt, &key.Status, &key.CreatedAt, &createdBy,
		)
		if err != nil {
			return nil, err
		}

		if lastUsedAt.Valid {
			key.LastUsedAt = lastUsedAt.Time
		}
		if createdBy.Valid {
			key.CreatedBy = createdBy.String
		}

		keys = append(keys, key)
	}
	return keys, nil
}

func (q *userQueries) RevokeAPIKey(saID, keyID, organizationID string) error {
	query := `UPDATE api_keys SET status = 'revoked' WHERE service_account_id = $1 AND id = $2 AND organization_id = $3`
	_, err := q.exec(query, saID, keyID, organizationID)
	return err
}

func (q *userQueries) RotateServiceAccountKeys(saID, organizationID string) error {
	// Revoke all existing keys and update last_key_rotation
	tx, err := q.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(q.ctx, `UPDATE api_keys SET status = 'revoked' WHERE service_account_id = $1 AND organization_id = $2`, saID, organizationID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(q.ctx, `UPDATE service_accounts SET last_key_rotation = NOW() WHERE id = $1 AND organization_id = $2`, saID, organizationID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
