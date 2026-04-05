package queries

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

type GlobalSettingsQueries interface {
	GetGlobalSettings() (*models.GlobalSettings, error)
	UpdateGlobalSettings(settings models.GlobalSettings) (*models.GlobalSettings, error)
	CreateDefaultGlobalSettings() (*models.GlobalSettings, error)
	WithTx(tx *sql.Tx) GlobalSettingsQueries
	WithContext(ctx context.Context) GlobalSettingsQueries
}

type globalSettingsQueries struct {
	db     *database.DB
	tx     *sql.Tx
	ctx    context.Context
	redis  *redis.Client
	logger *logger.Logger
}

// NewGlobalSettingsQueries creates a new GlobalSettingsQueries instance
func NewGlobalSettingsQueries(db *database.DB, redis *redis.Client, logger *logger.Logger) GlobalSettingsQueries {
	return &globalSettingsQueries{
		db:     db,
		ctx:    context.Background(),
		redis:  redis,
		logger: logger,
	}
}

// WithTx returns a new GlobalSettingsQueries instance that will run all SQL queries within a transaction
func (q *globalSettingsQueries) WithTx(tx *sql.Tx) GlobalSettingsQueries {
	return &globalSettingsQueries{
		db:     q.db,
		tx:     tx,
		ctx:    q.ctx,
		redis:  q.redis,
		logger: q.logger,
	}
}

// WithContext returns a new GlobalSettingsQueries instance with context
func (q *globalSettingsQueries) WithContext(ctx context.Context) GlobalSettingsQueries {
	return &globalSettingsQueries{
		db:     q.db,
		tx:     q.tx,
		ctx:    ctx,
		redis:  q.redis,
		logger: q.logger,
	}
}

// GetGlobalSettings retrieves the current global settings
func (q *globalSettingsQueries) GetGlobalSettings() (*models.GlobalSettings, error) {
	query := `
		SELECT id, maintenance_mode, maintenance_message, max_users_per_organization, 
		       max_session_duration, password_min_length, require_mfa, allow_registration,
		       email_verification_required, token_expiration_minutes, audit_log_retention_days,
		       settings, created_at, updated_at
		FROM global_settings 
		ORDER BY created_at DESC 
		LIMIT 1`

	var settings models.GlobalSettings
	var err error

	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query).Scan(
			&settings.ID, &settings.MaintenanceMode, &settings.MaintenanceMessage,
			&settings.MaxUsersPerOrganization, &settings.MaxSessionDuration, &settings.PasswordMinLength,
			&settings.RequireMFA, &settings.AllowRegistration, &settings.EmailVerificationReq,
			&settings.TokenExpirationMinutes, &settings.AuditLogRetentionDays, &settings.Settings,
			&settings.CreatedAt, &settings.UpdatedAt,
		)
	} else {
		err = q.db.QueryRowContext(q.ctx, query).Scan(
			&settings.ID, &settings.MaintenanceMode, &settings.MaintenanceMessage,
			&settings.MaxUsersPerOrganization, &settings.MaxSessionDuration, &settings.PasswordMinLength,
			&settings.RequireMFA, &settings.AllowRegistration, &settings.EmailVerificationReq,
			&settings.TokenExpirationMinutes, &settings.AuditLogRetentionDays, &settings.Settings,
			&settings.CreatedAt, &settings.UpdatedAt,
		)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			// Create default settings if none exist
			return q.CreateDefaultGlobalSettings()
		}
		return nil, fmt.Errorf("failed to get global settings: %w", err)
	}

	return &settings, nil
}

// UpdateGlobalSettings updates the global settings
func (q *globalSettingsQueries) UpdateGlobalSettings(settings models.GlobalSettings) (*models.GlobalSettings, error) {
	// First, get the current settings to preserve the ID
	current, err := q.GetGlobalSettings()
	if err != nil {
		return nil, fmt.Errorf("failed to get current settings: %w", err)
	}

	query := `
		UPDATE global_settings 
		SET maintenance_mode = $2, maintenance_message = $3, max_users_per_organization = $4,
		    max_session_duration = $5, password_min_length = $6, require_mfa = $7,
		    allow_registration = $8, email_verification_required = $9, token_expiration_minutes = $10,
		    audit_log_retention_days = $11, settings = $12, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at`

	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query,
			current.ID, settings.MaintenanceMode, settings.MaintenanceMessage,
			settings.MaxUsersPerOrganization, settings.MaxSessionDuration, settings.PasswordMinLength,
			settings.RequireMFA, settings.AllowRegistration, settings.EmailVerificationReq,
			settings.TokenExpirationMinutes, settings.AuditLogRetentionDays, settings.Settings,
		).Scan(&settings.UpdatedAt)
	} else {
		err = q.db.QueryRowContext(q.ctx, query,
			current.ID, settings.MaintenanceMode, settings.MaintenanceMessage,
			settings.MaxUsersPerOrganization, settings.MaxSessionDuration, settings.PasswordMinLength,
			settings.RequireMFA, settings.AllowRegistration, settings.EmailVerificationReq,
			settings.TokenExpirationMinutes, settings.AuditLogRetentionDays, settings.Settings,
		).Scan(&settings.UpdatedAt)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to update global settings: %w", err)
	}

	// Copy other fields from current settings
	settings.ID = current.ID
	settings.CreatedAt = current.CreatedAt

	// Clear Redis cache if available
	if q.redis != nil {
		_ = q.redis.Del(q.ctx, "global_settings").Err()
	}

	return &settings, nil
}

// CreateDefaultGlobalSettings creates default global settings
func (q *globalSettingsQueries) CreateDefaultGlobalSettings() (*models.GlobalSettings, error) {
	settings := models.GlobalSettings{
		ID:                      "default",
		MaintenanceMode:         false,
		MaintenanceMessage:      "",
		MaxUsersPerOrganization: 1000,
		MaxSessionDuration:      480, // 8 hours
		PasswordMinLength:       8,
		RequireMFA:              false,
		AllowRegistration:       true,
		EmailVerificationReq:    true,
		TokenExpirationMinutes:  60,
		AuditLogRetentionDays:   90,
		Settings:                "{}",
	}

	query := `
		INSERT INTO global_settings (
			id, maintenance_mode, maintenance_message, max_users_per_organization,
			max_session_duration, password_min_length, require_mfa, allow_registration,
			email_verification_required, token_expiration_minutes, audit_log_retention_days, settings
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (id) DO NOTHING
		RETURNING created_at, updated_at`

	var err error
	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query,
			settings.ID, settings.MaintenanceMode, settings.MaintenanceMessage,
			settings.MaxUsersPerOrganization, settings.MaxSessionDuration, settings.PasswordMinLength,
			settings.RequireMFA, settings.AllowRegistration, settings.EmailVerificationReq,
			settings.TokenExpirationMinutes, settings.AuditLogRetentionDays, settings.Settings,
		).Scan(&settings.CreatedAt, &settings.UpdatedAt)
	} else {
		err = q.db.QueryRowContext(q.ctx, query,
			settings.ID, settings.MaintenanceMode, settings.MaintenanceMessage,
			settings.MaxUsersPerOrganization, settings.MaxSessionDuration, settings.PasswordMinLength,
			settings.RequireMFA, settings.AllowRegistration, settings.EmailVerificationReq,
			settings.TokenExpirationMinutes, settings.AuditLogRetentionDays, settings.Settings,
		).Scan(&settings.CreatedAt, &settings.UpdatedAt)
	}

	if err != nil {
		// If conflict occurred (settings already exist), fetch them
		if err.Error() == "no rows in result set" {
			return q.GetGlobalSettings()
		}
		return nil, fmt.Errorf("failed to create default global settings: %w", err)
	}

	return &settings, nil
}
