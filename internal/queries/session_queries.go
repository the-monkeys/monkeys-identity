package queries

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// SessionQueries defines all session management database operations
type SessionQueries interface {
	WithTx(tx *sql.Tx) SessionQueries
	WithContext(ctx context.Context) SessionQueries

	// Session CRUD operations
	CreateSession(session *models.Session) error
	GetSession(sessionID, organizationID string) (*models.Session, error)
	GetSessionByToken(token, organizationID string) (*models.Session, error)
	UpdateSession(session *models.Session, organizationID string) error
	DeleteSession(sessionID, organizationID string) error

	// Session listing and filtering
	ListSessions(params ListParams, organizationID, principalID, principalType string) (*ListResult[*models.Session], error)
	ListUserSessions(userID, organizationID string) ([]*models.Session, error)
	ListActiveSessions(organizationID string) ([]*models.Session, error)

	// Session management operations
	ExtendSession(sessionID, organizationID string, newExpiresAt time.Time) error
	RevokeSession(sessionID, organizationID string) error
	RevokeAllUserSessions(userID, organizationID string) error
	RevokeExpiredSessions() (int, error)
	UpdateLastUsed(sessionID, organizationID string) error

	// Session security and monitoring
	GetSessionsByIP(ipAddress, organizationID string) ([]*models.Session, error)
	GetSessionsByDeviceFingerprint(fingerprint, organizationID string) ([]*models.Session, error)
	CountActiveSessions(organizationID, principalID, principalType string) (int, error)
	GetConcurrentSessions(organizationID, principalID, principalType string) ([]*models.Session, error)

	// Session analytics
	GetSessionStats(organizationID string) (*SessionStats, error)
	GetSessionActivity(sessionID, organizationID string, limit int) ([]*SessionActivity, error)
}

// Session analytics and monitoring types
type SessionStats struct {
	TotalSessions          int64         `json:"total_sessions"`
	ActiveSessions         int64         `json:"active_sessions"`
	ExpiredSessions        int64         `json:"expired_sessions"`
	RevokedSessions        int64         `json:"revoked_sessions"`
	AverageSessionDuration time.Duration `json:"average_session_duration"`
	TotalSessionTime       time.Duration `json:"total_session_time"`
	UniqueUsers            int64         `json:"unique_users"`
	GeneratedAt            time.Time     `json:"generated_at"`
}

type SessionActivity struct {
	ID        string    `json:"id"`
	SessionID string    `json:"session_id"`
	Action    string    `json:"action"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	Timestamp time.Time `json:"timestamp"`
	Details   string    `json:"details"`
}

type sessionQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewSessionQueries(db *database.DB, redis *redis.Client) SessionQueries {
	return &sessionQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *sessionQueries) WithTx(tx *sql.Tx) SessionQueries {
	return &sessionQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *sessionQueries) WithContext(ctx context.Context) SessionQueries {
	return &sessionQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}

func (q *sessionQueries) CreateSession(session *models.Session) error {
	query := `
		INSERT INTO sessions (
			id, session_token, principal_id, principal_type, organization_id,
			assumed_role_id, permissions, context, mfa_verified, mfa_methods_used,
			ip_address, user_agent, device_fingerprint, location,
			issued_at, expires_at, last_used_at, status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	_, err := db.ExecContext(q.ctx, query,
		session.ID, session.SessionToken, session.PrincipalID, session.PrincipalType,
		session.OrganizationID, session.AssumedRoleID, session.Permissions, session.Context,
		session.MFAVerified, session.MFAMethodsUsed, session.IPAddress, session.UserAgent,
		session.DeviceFingerprint, session.Location, session.IssuedAt, session.ExpiresAt,
		session.LastUsedAt, session.Status)

	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	// Cache session in Redis for quick lookup
	if q.redis != nil {
		err = q.cacheSession(session)
		if err != nil {
			// Log error but don't fail the operation
			// TODO: Add proper logging
		}
	}

	return nil
}

func (q *sessionQueries) GetSession(sessionID, organizationID string) (*models.Session, error) {
	// Try Redis cache first
	if q.redis != nil {
		if session, err := q.getCachedSession(sessionID); err == nil && session != nil {
			// Verify organization match for cached session
			if session.OrganizationID == organizationID {
				return session, nil
			}
		}
	}

	query := `
		SELECT id, session_token, principal_id, principal_type, organization_id,
		       assumed_role_id, permissions, context, mfa_verified, mfa_methods_used,
		       ip_address, user_agent, device_fingerprint, location,
		       issued_at, expires_at, last_used_at, status
		FROM sessions 
		WHERE id = $1 AND organization_id = $2 AND status = 'active'`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	var s models.Session
	err := db.QueryRowContext(q.ctx, query, sessionID, organizationID).Scan(
		&s.ID, &s.SessionToken, &s.PrincipalID, &s.PrincipalType, &s.OrganizationID,
		&s.AssumedRoleID, &s.Permissions, &s.Context, &s.MFAVerified, &s.MFAMethodsUsed,
		&s.IPAddress, &s.UserAgent, &s.DeviceFingerprint, &s.Location,
		&s.IssuedAt, &s.ExpiresAt, &s.LastUsedAt, &s.Status)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	// Check if session is expired
	if time.Now().After(s.ExpiresAt) {
		// Mark as expired
		q.RevokeSession(sessionID, organizationID)
		return nil, fmt.Errorf("session expired")
	}

	// Cache in Redis
	if q.redis != nil {
		q.cacheSession(&s)
	}

	return &s, nil
}

func (q *sessionQueries) GetSessionByToken(token, organizationID string) (*models.Session, error) {
	query := `
		SELECT id, session_token, principal_id, principal_type, organization_id,
		       assumed_role_id, permissions, context, mfa_verified, mfa_methods_used,
		       ip_address, user_agent, device_fingerprint, location,
		       issued_at, expires_at, last_used_at, status
		FROM sessions 
		WHERE session_token = $1 AND organization_id = $2 AND status = 'active'`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	var s models.Session
	err := db.QueryRowContext(q.ctx, query, token, organizationID).Scan(
		&s.ID, &s.SessionToken, &s.PrincipalID, &s.PrincipalType, &s.OrganizationID,
		&s.AssumedRoleID, &s.Permissions, &s.Context, &s.MFAVerified, &s.MFAMethodsUsed,
		&s.IPAddress, &s.UserAgent, &s.DeviceFingerprint, &s.Location,
		&s.IssuedAt, &s.ExpiresAt, &s.LastUsedAt, &s.Status)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	// Check if session is expired
	if time.Now().After(s.ExpiresAt) {
		q.RevokeSession(s.ID, organizationID)
		return nil, fmt.Errorf("session expired")
	}

	return &s, nil
}

func (q *sessionQueries) UpdateSession(session *models.Session, organizationID string) error {
	query := `
		UPDATE sessions SET
			permissions = $2, context = $3, mfa_verified = $4, mfa_methods_used = $5,
			ip_address = $6, user_agent = $7, device_fingerprint = $8, location = $9,
			expires_at = $10, last_used_at = $11, status = $12
		WHERE id = $1 AND organization_id = $13`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query,
		session.ID, session.Permissions, session.Context, session.MFAVerified,
		session.MFAMethodsUsed, session.IPAddress, session.UserAgent, session.DeviceFingerprint,
		session.Location, session.ExpiresAt, session.LastUsedAt, session.Status, organizationID)

	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("session not found")
	}

	// Update cache
	if q.redis != nil {
		q.cacheSession(session)
	}

	return nil
}

func (q *sessionQueries) DeleteSession(sessionID, organizationID string) error {
	query := `DELETE FROM sessions WHERE id = $1 AND organization_id = $2`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query, sessionID, organizationID)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("session not found")
	}

	// Remove from cache
	if q.redis != nil {
		q.removeCachedSession(sessionID)
	}

	return nil
}

func (q *sessionQueries) ListSessions(params ListParams, organizationID, principalID, principalType string) (*ListResult[*models.Session], error) {
	query := `
		SELECT id, session_token, principal_id, principal_type, organization_id,
		       assumed_role_id, permissions, context, mfa_verified, mfa_methods_used,
		       ip_address, user_agent, device_fingerprint, location,
		       issued_at, expires_at, last_used_at, status
		FROM sessions 
		WHERE organization_id = $1`

	args := []interface{}{organizationID}
	argCount := 1

	if principalID != "" {
		argCount++
		query += fmt.Sprintf(" AND principal_id = $%d", argCount)
		args = append(args, principalID)
	}

	if principalType != "" {
		argCount++
		query += fmt.Sprintf(" AND principal_type = $%d", argCount)
		args = append(args, principalType)
	}

	query += " AND status = 'active'"

	if params.SortBy != "" {
		query += fmt.Sprintf(" ORDER BY %s %s", params.SortBy, params.Order)
	} else {
		query += " ORDER BY last_used_at DESC"
	}

	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount+1, argCount+2)
	args = append(args, params.Limit, params.Offset)

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []models.Session
	for rows.Next() {
		var s models.Session
		err := rows.Scan(&s.ID, &s.SessionToken, &s.PrincipalID, &s.PrincipalType,
			&s.OrganizationID, &s.AssumedRoleID, &s.Permissions, &s.Context,
			&s.MFAVerified, &s.MFAMethodsUsed, &s.IPAddress, &s.UserAgent,
			&s.DeviceFingerprint, &s.Location, &s.IssuedAt, &s.ExpiresAt,
			&s.LastUsedAt, &s.Status)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, s)
	}

	// Convert to pointers
	var sessionPtrs []*models.Session
	for i := range sessions {
		sessionPtrs = append(sessionPtrs, &sessions[i])
	}

	// Get total count
	countQuery := `SELECT COUNT(*) FROM sessions WHERE organization_id = $1`
	countArgs := []interface{}{organizationID}
	countArgCount := 1

	if principalID != "" {
		countArgCount++
		countQuery += fmt.Sprintf(" AND principal_id = $%d", countArgCount)
		countArgs = append(countArgs, principalID)
	}

	if principalType != "" {
		countArgCount++
		countQuery += fmt.Sprintf(" AND principal_type = $%d", countArgCount)
		countArgs = append(countArgs, principalType)
	}

	countQuery += " AND status = 'active'"

	var total int
	err = db.QueryRowContext(q.ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count sessions: %w", err)
	}

	return &ListResult[*models.Session]{
		Items:      sessionPtrs,
		Total:      int64(total),
		Limit:      params.Limit,
		Offset:     params.Offset,
		HasMore:    (params.Offset + params.Limit) < total,
		TotalPages: (total + params.Limit - 1) / params.Limit,
	}, nil
}

func (q *sessionQueries) ListUserSessions(userID, organizationID string) ([]*models.Session, error) {
	result, err := q.ListSessions(ListParams{Limit: 100, Offset: 0}, organizationID, userID, "user")
	if err != nil {
		return nil, err
	}
	return result.Items, nil
}

func (q *sessionQueries) ListActiveSessions(organizationID string) ([]*models.Session, error) {
	query := `
		SELECT id, session_token, principal_id, principal_type, organization_id,
		       assumed_role_id, permissions, context, mfa_verified, mfa_methods_used,
		       ip_address, user_agent, device_fingerprint, location,
		       issued_at, expires_at, last_used_at, status
		FROM sessions 
		WHERE organization_id = $1 AND status = 'active' AND expires_at > NOW()
		ORDER BY last_used_at DESC`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to list active sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*models.Session
	for rows.Next() {
		var s models.Session
		err := rows.Scan(&s.ID, &s.SessionToken, &s.PrincipalID, &s.PrincipalType,
			&s.OrganizationID, &s.AssumedRoleID, &s.Permissions, &s.Context,
			&s.MFAVerified, &s.MFAMethodsUsed, &s.IPAddress, &s.UserAgent,
			&s.DeviceFingerprint, &s.Location, &s.IssuedAt, &s.ExpiresAt,
			&s.LastUsedAt, &s.Status)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, &s)
	}

	return sessions, nil
}

func (q *sessionQueries) ExtendSession(sessionID, organizationID string, newExpiresAt time.Time) error {
	query := `UPDATE sessions SET expires_at = $2, last_used_at = NOW() WHERE id = $1 AND organization_id = $3 AND status = 'active'`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query, sessionID, newExpiresAt, organizationID)
	if err != nil {
		return fmt.Errorf("failed to extend session: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check extend result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("session not found or not active")
	}

	// Update cache
	if q.redis != nil {
		if session, err := q.GetSession(sessionID, organizationID); err == nil {
			session.ExpiresAt = newExpiresAt
			session.LastUsedAt = time.Now()
			q.cacheSession(session)
		}
	}

	return nil
}

func (q *sessionQueries) RevokeSession(sessionID, organizationID string) error {
	query := `UPDATE sessions SET status = 'revoked', last_used_at = NOW() WHERE id = $1 AND organization_id = $2`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query, sessionID, organizationID)
	if err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check revoke result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("session not found")
	}

	// Remove from cache
	if q.redis != nil {
		q.removeCachedSession(sessionID)
	}

	return nil
}

func (q *sessionQueries) RevokeAllUserSessions(userID, organizationID string) error {
	query := `UPDATE sessions SET status = 'revoked', last_used_at = NOW() WHERE principal_id = $1 AND principal_type = 'user' AND organization_id = $2 AND status = 'active'`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query, userID, organizationID)
	if err != nil {
		return fmt.Errorf("failed to revoke user sessions: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check revoke result: %w", err)
	}

	// Remove from cache - get all user sessions first
	if q.redis != nil && rows > 0 {
		sessions, _ := q.ListUserSessions(userID, organizationID)
		for _, session := range sessions {
			q.removeCachedSession(session.ID)
		}
	}

	return nil
}

func (q *sessionQueries) RevokeExpiredSessions() (int, error) {
	query := `UPDATE sessions SET status = 'expired' WHERE expires_at < NOW() AND status = 'active'`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to revoke expired sessions: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to check revoke result: %w", err)
	}

	return int(rows), nil
}

func (q *sessionQueries) UpdateLastUsed(sessionID, organizationID string) error {
	query := `UPDATE sessions SET last_used_at = NOW() WHERE id = $1 AND organization_id = $2 AND status = 'active'`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	_, err := db.ExecContext(q.ctx, query, sessionID, organizationID)
	if err != nil {
		return fmt.Errorf("failed to update last used: %w", err)
	}

	return nil
}

func (q *sessionQueries) GetSessionsByIP(ipAddress, organizationID string) ([]*models.Session, error) {
	query := `
		SELECT id, session_token, principal_id, principal_type, organization_id,
		       assumed_role_id, permissions, context, mfa_verified, mfa_methods_used,
		       ip_address, user_agent, device_fingerprint, location,
		       issued_at, expires_at, last_used_at, status
		FROM sessions 
		WHERE ip_address = $1 AND organization_id = $2 AND status = 'active'
		ORDER BY last_used_at DESC`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, ipAddress, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sessions by IP: %w", err)
	}
	defer rows.Close()

	var sessions []*models.Session
	for rows.Next() {
		var s models.Session
		err := rows.Scan(&s.ID, &s.SessionToken, &s.PrincipalID, &s.PrincipalType,
			&s.OrganizationID, &s.AssumedRoleID, &s.Permissions, &s.Context,
			&s.MFAVerified, &s.MFAMethodsUsed, &s.IPAddress, &s.UserAgent,
			&s.DeviceFingerprint, &s.Location, &s.IssuedAt, &s.ExpiresAt,
			&s.LastUsedAt, &s.Status)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, &s)
	}

	return sessions, nil
}

func (q *sessionQueries) GetSessionsByDeviceFingerprint(fingerprint, organizationID string) ([]*models.Session, error) {
	query := `
		SELECT id, session_token, principal_id, principal_type, organization_id,
		       assumed_role_id, permissions, context, mfa_verified, mfa_methods_used,
		       ip_address, user_agent, device_fingerprint, location,
		       issued_at, expires_at, last_used_at, status
		FROM sessions 
		WHERE device_fingerprint = $1 AND organization_id = $2 AND status = 'active'
		ORDER BY last_used_at DESC`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, fingerprint, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sessions by device fingerprint: %w", err)
	}
	defer rows.Close()

	var sessions []*models.Session
	for rows.Next() {
		var s models.Session
		err := rows.Scan(&s.ID, &s.SessionToken, &s.PrincipalID, &s.PrincipalType,
			&s.OrganizationID, &s.AssumedRoleID, &s.Permissions, &s.Context,
			&s.MFAVerified, &s.MFAMethodsUsed, &s.IPAddress, &s.UserAgent,
			&s.DeviceFingerprint, &s.Location, &s.IssuedAt, &s.ExpiresAt,
			&s.LastUsedAt, &s.Status)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, &s)
	}

	return sessions, nil
}

func (q *sessionQueries) CountActiveSessions(organizationID, principalID, principalType string) (int, error) {
	query := `SELECT COUNT(*) FROM sessions WHERE principal_id = $1 AND principal_type = $2 AND organization_id = $3 AND status = 'active' AND expires_at > NOW()`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	var count int
	err := db.QueryRowContext(q.ctx, query, principalID, principalType, organizationID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count active sessions: %w", err)
	}

	return count, nil
}

func (q *sessionQueries) GetConcurrentSessions(organizationID, principalID, principalType string) ([]*models.Session, error) {
	return q.ListUserSessions(principalID, organizationID)
}

func (q *sessionQueries) GetSessionStats(organizationID string) (*SessionStats, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'active' AND expires_at > NOW()) as active,
			COUNT(*) FILTER (WHERE status = 'expired' OR expires_at <= NOW()) as expired,
			COUNT(*) FILTER (WHERE status = 'revoked') as revoked,
			AVG(EXTRACT(EPOCH FROM (COALESCE(last_used_at, expires_at) - issued_at))) as avg_duration,
			SUM(EXTRACT(EPOCH FROM (COALESCE(last_used_at, expires_at) - issued_at))) as total_duration,
			COUNT(DISTINCT principal_id) FILTER (WHERE principal_type = 'user') as unique_users
		FROM sessions 
		WHERE organization_id = $1`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	var stats SessionStats
	var avgDuration, totalDuration sql.NullFloat64
	err := db.QueryRowContext(q.ctx, query, organizationID).Scan(
		&stats.TotalSessions, &stats.ActiveSessions, &stats.ExpiredSessions,
		&stats.RevokedSessions, &avgDuration, &totalDuration, &stats.UniqueUsers)

	if err != nil {
		return nil, fmt.Errorf("failed to get session stats: %w", err)
	}

	if avgDuration.Valid {
		stats.AverageSessionDuration = time.Duration(avgDuration.Float64) * time.Second
	}
	if totalDuration.Valid {
		stats.TotalSessionTime = time.Duration(totalDuration.Float64) * time.Second
	}
	stats.GeneratedAt = time.Now()

	return &stats, nil
}

func (q *sessionQueries) GetSessionActivity(sessionID, organizationID string, limit int) ([]*SessionActivity, error) {
	// This would typically query an audit_events table
	// For now, return empty slice as placeholder
	return []*SessionActivity{}, nil
}

// Redis caching helper methods
func (q *sessionQueries) cacheSession(session *models.Session) error {
	if q.redis == nil {
		return nil
	}

	key := fmt.Sprintf("session:%s", session.ID)
	ttl := time.Until(session.ExpiresAt)
	if ttl <= 0 {
		return nil
	}

	// Simple JSON serialization for cache
	// In production, you might want to use a more efficient serialization
	return q.redis.Set(q.ctx, key, fmt.Sprintf("%+v", session), ttl).Err()
}

func (q *sessionQueries) getCachedSession(sessionID string) (*models.Session, error) {
	if q.redis == nil {
		return nil, fmt.Errorf("redis not available")
	}

	key := fmt.Sprintf("session:%s", sessionID)
	result := q.redis.Get(q.ctx, key)
	if result.Err() != nil {
		return nil, result.Err()
	}

	// This is a simplified implementation
	// In production, you'd want proper JSON/binary serialization
	return nil, fmt.Errorf("cache deserialization not implemented")
}

func (q *sessionQueries) removeCachedSession(sessionID string) error {
	if q.redis == nil {
		return nil
	}

	key := fmt.Sprintf("session:%s", sessionID)
	return q.redis.Del(q.ctx, key).Err()
}
