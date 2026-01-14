
query/user.go

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