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

// DBTX interface for both *sql.DB and *sql.Tx
type DBTX interface {
	ExecContext(context.Context, string, ...interface{}) (sql.Result, error)
	QueryContext(context.Context, string, ...interface{}) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...interface{}) *sql.Row
}

// ResourceQueries defines all resource management database operations
type ResourceQueries interface {
	WithTx(tx *sql.Tx) ResourceQueries
	WithContext(ctx context.Context) ResourceQueries

	// Resource CRUD operations
	ListResources(params ListParams, organizationID string) (*ListResult[*models.Resource], error)
	CreateResource(resource *models.Resource) error
	GetResource(id string) (*models.Resource, error)
	UpdateResource(resource *models.Resource) error
	DeleteResource(id string) error

	// Resource permissions
	GetResourcePermissions(resourceID string) ([]ResourcePermission, error)
	SetResourcePermissions(resourceID string, permissions []ResourcePermission) error
	GetResourceAccessLog(resourceID string, params ListParams) (*ListResult[*ResourceAccessLog], error)

	// Resource sharing
	ShareResource(share *ResourceShare) error
	UnshareResource(resourceID, principalID, principalType string) error
	GetResourceShares(resourceID string) ([]ResourceShare, error)
}

type ResourcePermission struct {
	ID            string    `json:"id" db:"id"`
	ResourceID    string    `json:"resource_id" db:"resource_id"`
	PrincipalID   string    `json:"principal_id" db:"principal_id"`
	PrincipalType string    `json:"principal_type" db:"principal_type"`
	Permission    string    `json:"permission" db:"permission"`
	Effect        string    `json:"effect" db:"effect"` // allow/deny
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	CreatedBy     string    `json:"created_by" db:"created_by"`
}

type ResourceShare struct {
	ID            string    `json:"id" db:"id"`
	ResourceID    string    `json:"resource_id" db:"resource_id"`
	PrincipalID   string    `json:"principal_id" db:"principal_id"`
	PrincipalType string    `json:"principal_type" db:"principal_type"`
	AccessLevel   string    `json:"access_level" db:"access_level"`
	ExpiresAt     time.Time `json:"expires_at" db:"expires_at"`
	SharedBy      string    `json:"shared_by" db:"shared_by"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type ResourceAccessLog struct {
	ID         string    `json:"id" db:"id"`
	ResourceID string    `json:"resource_id" db:"resource_id"`
	UserID     string    `json:"user_id" db:"user_id"`
	Action     string    `json:"action" db:"action"`
	IPAddress  string    `json:"ip_address" db:"ip_address"`
	UserAgent  string    `json:"user_agent" db:"user_agent"`
	Timestamp  time.Time `json:"timestamp" db:"timestamp"`
	Success    bool      `json:"success" db:"success"`
	Details    string    `json:"details" db:"details"`
}

type resourceQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewResourceQueries(db *database.DB, redis *redis.Client) ResourceQueries {
	return &resourceQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *resourceQueries) WithTx(tx *sql.Tx) ResourceQueries {
	return &resourceQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *resourceQueries) WithContext(ctx context.Context) ResourceQueries {
	return &resourceQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}

func (q *resourceQueries) ListResources(params ListParams, organizationID string) (*ListResult[*models.Resource], error) {
	query := `
		SELECT id, arn, name, description, type, organization_id, parent_resource_id, 
		       owner_id, owner_type, attributes, tags, encryption_key_id, lifecycle_policy,
		       access_level, content_type, size_bytes, checksum, version, status,
		       created_at, updated_at, accessed_at, deleted_at
		FROM resources 
		WHERE deleted_at IS NULL`
	args := []interface{}{}
	argCount := 0

	if organizationID != "" {
		argCount++
		query += fmt.Sprintf(" AND organization_id = $%d", argCount)
		args = append(args, organizationID)
	}

	if params.SortBy != "" {
		query += fmt.Sprintf(" ORDER BY %s %s", params.SortBy, params.Order)
	} else {
		query += " ORDER BY created_at DESC"
	}

	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount+1, argCount+2)
	args = append(args, params.Limit, params.Offset)

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list resources: %w", err)
	}
	defer rows.Close()

	var resources []models.Resource
	for rows.Next() {
		var r models.Resource
		err := rows.Scan(&r.ID, &r.ARN, &r.Name, &r.Description, &r.Type, &r.OrganizationID,
			&r.ParentResourceID, &r.OwnerID, &r.OwnerType, &r.Attributes, &r.Tags,
			&r.EncryptionKeyID, &r.LifecyclePolicy, &r.AccessLevel, &r.ContentType,
			&r.SizeBytes, &r.Checksum, &r.Version, &r.Status, &r.CreatedAt,
			&r.UpdatedAt, &r.AccessedAt, &r.DeletedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan resource: %w", err)
		}
		resources = append(resources, r)
	}

	// Convert to pointers for generic return type
	var resourcePtrs []*models.Resource
	for i := range resources {
		resourcePtrs = append(resourcePtrs, &resources[i])
	}

	// Get total count
	countQuery := `SELECT COUNT(*) FROM resources WHERE deleted_at IS NULL`
	countArgs := []interface{}{}
	if organizationID != "" {
		countQuery += " AND organization_id = $1"
		countArgs = append(countArgs, organizationID)
	}

	var total int
	err = db.QueryRowContext(q.ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count resources: %w", err)
	}

	return &ListResult[*models.Resource]{
		Items:      resourcePtrs,
		Total:      int64(total),
		Limit:      params.Limit,
		Offset:     params.Offset,
		HasMore:    (params.Offset + params.Limit) < total,
		TotalPages: (total + params.Limit - 1) / params.Limit,
	}, nil
}

func (q *resourceQueries) CreateResource(resource *models.Resource) error {
	query := `
		INSERT INTO resources (
			id, arn, name, description, type, organization_id, parent_resource_id,
			owner_id, owner_type, attributes, tags, encryption_key_id, lifecycle_policy,
			access_level, content_type, size_bytes, checksum, version, status,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		)`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	_, err := db.ExecContext(q.ctx, query,
		resource.ID, resource.ARN, resource.Name, resource.Description, resource.Type,
		resource.OrganizationID, resource.ParentResourceID, resource.OwnerID, resource.OwnerType,
		resource.Attributes, resource.Tags, resource.EncryptionKeyID, resource.LifecyclePolicy,
		resource.AccessLevel, resource.ContentType, resource.SizeBytes, resource.Checksum,
		resource.Version, resource.Status, resource.CreatedAt, resource.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create resource: %w", err)
	}

	return nil
}

func (q *resourceQueries) GetResource(id string) (*models.Resource, error) {
	query := `
		SELECT id, arn, name, description, type, organization_id, parent_resource_id,
		       owner_id, owner_type, attributes, tags, encryption_key_id, lifecycle_policy,
		       access_level, content_type, size_bytes, checksum, version, status,
		       created_at, updated_at, accessed_at, deleted_at
		FROM resources 
		WHERE id = $1 AND deleted_at IS NULL`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	var r models.Resource
	err := db.QueryRowContext(q.ctx, query, id).Scan(
		&r.ID, &r.ARN, &r.Name, &r.Description, &r.Type, &r.OrganizationID,
		&r.ParentResourceID, &r.OwnerID, &r.OwnerType, &r.Attributes, &r.Tags,
		&r.EncryptionKeyID, &r.LifecyclePolicy, &r.AccessLevel, &r.ContentType,
		&r.SizeBytes, &r.Checksum, &r.Version, &r.Status, &r.CreatedAt,
		&r.UpdatedAt, &r.AccessedAt, &r.DeletedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("resource not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get resource: %w", err)
	}

	return &r, nil
}

func (q *resourceQueries) UpdateResource(resource *models.Resource) error {
	query := `
		UPDATE resources SET
			name = $2, description = $3, type = $4, parent_resource_id = $5,
			owner_id = $6, owner_type = $7, attributes = $8, tags = $9,
			encryption_key_id = $10, lifecycle_policy = $11, access_level = $12,
			content_type = $13, size_bytes = $14, checksum = $15, version = $16,
			status = $17, updated_at = $18
		WHERE id = $1 AND deleted_at IS NULL`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query,
		resource.ID, resource.Name, resource.Description, resource.Type,
		resource.ParentResourceID, resource.OwnerID, resource.OwnerType,
		resource.Attributes, resource.Tags, resource.EncryptionKeyID,
		resource.LifecyclePolicy, resource.AccessLevel, resource.ContentType,
		resource.SizeBytes, resource.Checksum, resource.Version,
		resource.Status, time.Now())

	if err != nil {
		return fmt.Errorf("failed to update resource: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("resource not found or already deleted")
	}

	return nil
}

func (q *resourceQueries) DeleteResource(id string) error {
	query := `UPDATE resources SET deleted_at = $2 WHERE id = $1 AND deleted_at IS NULL`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query, id, time.Now())
	if err != nil {
		return fmt.Errorf("failed to delete resource: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("resource not found or already deleted")
	}

	return nil
}

func (q *resourceQueries) GetResourcePermissions(resourceID string) ([]ResourcePermission, error) {
	query := `
		SELECT id, resource_id, principal_id, principal_type, permission, effect, created_at, created_by
		FROM resource_permissions 
		WHERE resource_id = $1
		ORDER BY created_at DESC`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, resourceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get resource permissions: %w", err)
	}
	defer rows.Close()

	var permissions []ResourcePermission
	for rows.Next() {
		var p ResourcePermission
		err := rows.Scan(&p.ID, &p.ResourceID, &p.PrincipalID, &p.PrincipalType,
			&p.Permission, &p.Effect, &p.CreatedAt, &p.CreatedBy)
		if err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, p)
	}

	return permissions, nil
}

func (q *resourceQueries) SetResourcePermissions(resourceID string, permissions []ResourcePermission) error {
	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	// Delete existing permissions
	_, err := db.ExecContext(q.ctx, "DELETE FROM resource_permissions WHERE resource_id = $1", resourceID)
	if err != nil {
		return fmt.Errorf("failed to delete existing permissions: %w", err)
	}

	// Insert new permissions
	for _, p := range permissions {
		query := `
			INSERT INTO resource_permissions (id, resource_id, principal_id, principal_type, permission, effect, created_at, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

		_, err := db.ExecContext(q.ctx, query,
			p.ID, p.ResourceID, p.PrincipalID, p.PrincipalType,
			p.Permission, p.Effect, p.CreatedAt, p.CreatedBy)
		if err != nil {
			return fmt.Errorf("failed to insert permission: %w", err)
		}
	}

	return nil
}

func (q *resourceQueries) GetResourceAccessLog(resourceID string, params ListParams) (*ListResult[*ResourceAccessLog], error) {
	query := `
		SELECT id, resource_id, user_id, action, ip_address, user_agent, timestamp, success, details
		FROM resource_access_log 
		WHERE resource_id = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, resourceID, params.Limit, params.Offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get access log: %w", err)
	}
	defer rows.Close()

	var logs []ResourceAccessLog
	for rows.Next() {
		var log ResourceAccessLog
		err := rows.Scan(&log.ID, &log.ResourceID, &log.UserID, &log.Action,
			&log.IPAddress, &log.UserAgent, &log.Timestamp, &log.Success, &log.Details)
		if err != nil {
			return nil, fmt.Errorf("failed to scan access log: %w", err)
		}
		logs = append(logs, log)
	}

	// Get total count
	var total int
	err = db.QueryRowContext(q.ctx, "SELECT COUNT(*) FROM resource_access_log WHERE resource_id = $1", resourceID).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count access log: %w", err)
	}

	// Convert to pointers for generic return type
	var logPtrs []*ResourceAccessLog
	for i := range logs {
		logPtrs = append(logPtrs, &logs[i])
	}

	return &ListResult[*ResourceAccessLog]{
		Items:      logPtrs,
		Total:      int64(total),
		Limit:      params.Limit,
		Offset:     params.Offset,
		HasMore:    (params.Offset + params.Limit) < total,
		TotalPages: (total + params.Limit - 1) / params.Limit,
	}, nil
}

func (q *resourceQueries) ShareResource(share *ResourceShare) error {
	query := `
		INSERT INTO resource_shares (id, resource_id, principal_id, principal_type, access_level, expires_at, shared_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	_, err := db.ExecContext(q.ctx, query,
		share.ID, share.ResourceID, share.PrincipalID, share.PrincipalType,
		share.AccessLevel, share.ExpiresAt, share.SharedBy, share.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return fmt.Errorf("resource already shared with this principal")
		}
		return fmt.Errorf("failed to share resource: %w", err)
	}

	return nil
}

func (q *resourceQueries) UnshareResource(resourceID, principalID, principalType string) error {
	query := `DELETE FROM resource_shares WHERE resource_id = $1 AND principal_id = $2 AND principal_type = $3`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query, resourceID, principalID, principalType)
	if err != nil {
		return fmt.Errorf("failed to unshare resource: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check unshare result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("resource share not found")
	}

	return nil
}

func (q *resourceQueries) GetResourceShares(resourceID string) ([]ResourceShare, error) {
	query := `
		SELECT id, resource_id, principal_id, principal_type, access_level, expires_at, shared_by, created_at
		FROM resource_shares 
		WHERE resource_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, resourceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get resource shares: %w", err)
	}
	defer rows.Close()

	var shares []ResourceShare
	for rows.Next() {
		var s ResourceShare
		err := rows.Scan(&s.ID, &s.ResourceID, &s.PrincipalID, &s.PrincipalType,
			&s.AccessLevel, &s.ExpiresAt, &s.SharedBy, &s.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan share: %w", err)
		}
		shares = append(shares, s)
	}

	return shares, nil
}
