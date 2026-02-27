package queries

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// OrganizationQueries defines all organization management database operations
type OrganizationQueries interface {
	WithTx(tx *sql.Tx) OrganizationQueries
	WithContext(ctx context.Context) OrganizationQueries
	// Organization CRUD
	// orgFilter: empty string returns all orgs (root access); non-empty scopes to that org ID.
	ListOrganizations(params ListParams, orgFilter string) (*ListResult[models.Organization], error)
	CreateOrganization(org *models.Organization) error
	GetOrganization(id string) (*models.Organization, error)
	UpdateOrganization(org *models.Organization) error
	DeleteOrganization(id string) error

	// Organization related listings
	ListOrganizationUsers(orgID string) ([]models.User, error)
	ListOrganizationGroups(orgID string) ([]models.Group, error)
	ListOrganizationResources(orgID string) ([]models.Resource, error)
	ListOrganizationPolicies(orgID string) ([]models.Policy, error)
	ListOrganizationRoles(orgID string) ([]models.Role, error)

	// Settings
	GetOrganizationSettings(orgID string) (string, error)
	UpdateOrganizationSettings(orgID string, settings string) error
}

type organizationQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewOrganizationQueries(db *database.DB, redis *redis.Client) OrganizationQueries {
	return &organizationQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *organizationQueries) WithTx(tx *sql.Tx) OrganizationQueries {
	return &organizationQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *organizationQueries) WithContext(ctx context.Context) OrganizationQueries {
	return &organizationQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}

// ListOrganizations returns paginated organizations (excluding deleted).
//
// The orgFilter parameter controls tenant scoping:
//   - "" (empty): no filter — returns all organizations (root user view)
//   - non-empty: returns only the organization matching that ID
//
// The caller is responsible for computing orgFilter via TenantContext.OrgFilter()
// in the middleware layer. This keeps the query layer free of authorization logic.
func (q *organizationQueries) ListOrganizations(params ListParams, orgFilter string) (*ListResult[models.Organization], error) {
	limit := params.Limit
	if limit <= 0 || limit > 1000 {
		limit = 50
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	var query string
	var args []interface{}

	if orgFilter != "" {
		query = `
			SELECT id, name, slug, parent_id, description, metadata, settings, allowed_origins, billing_tier,
			       max_users, max_resources, status, created_at, updated_at, deleted_at,
			       COUNT(*) OVER() as total_count
			FROM organizations
			WHERE status != 'deleted' AND id = $3
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2`
		args = []interface{}{limit, offset, orgFilter}
	} else {
		query = `
			SELECT id, name, slug, parent_id, description, metadata, settings, allowed_origins, billing_tier,
			       max_users, max_resources, status, created_at, updated_at, deleted_at,
			       COUNT(*) OVER() as total_count
			FROM organizations
			WHERE status != 'deleted'
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2`
		args = []interface{}{limit, offset}
	}

	var rows *sql.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, args...)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, args...)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Organization
	var total int64
	for rows.Next() {
		var org models.Organization
		if err := rows.Scan(&org.ID, &org.Name, &org.Slug, &org.ParentID, &org.Description,
			&org.Metadata, &org.Settings, pq.Array(&org.AllowedOrigins), &org.BillingTier, &org.MaxUsers, &org.MaxResources,
			&org.Status, &org.CreatedAt, &org.UpdatedAt, &org.DeletedAt, &total); err != nil {
			return nil, err
		}
		if org.AllowedOrigins == nil {
			org.AllowedOrigins = []string{}
		}
		items = append(items, org)
	}
	return &ListResult[models.Organization]{
		Items: items, Total: total, Limit: limit, Offset: offset, HasMore: int64(offset+len(items)) < total,
	}, nil
}

func (q *organizationQueries) CreateOrganization(org *models.Organization) error {
	if org.AllowedOrigins == nil {
		org.AllowedOrigins = []string{}
	}
	query := `INSERT INTO organizations (id, name, slug, parent_id, description, metadata, settings, allowed_origins, billing_tier, max_users, max_resources, status)
			  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
			  RETURNING created_at, updated_at`
	var err error
	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query, org.ID, org.Name, org.Slug, org.ParentID, org.Description,
			org.Metadata, org.Settings, pq.Array(org.AllowedOrigins), org.BillingTier, org.MaxUsers, org.MaxResources, org.Status).Scan(&org.CreatedAt, &org.UpdatedAt)
	} else {
		err = q.db.QueryRowContext(q.ctx, query, org.ID, org.Name, org.Slug, org.ParentID, org.Description,
			org.Metadata, org.Settings, pq.Array(org.AllowedOrigins), org.BillingTier, org.MaxUsers, org.MaxResources, org.Status).Scan(&org.CreatedAt, &org.UpdatedAt)
	}
	return err
}

func (q *organizationQueries) GetOrganization(id string) (*models.Organization, error) {
	query := `SELECT id, name, slug, parent_id, description, metadata, settings, allowed_origins, billing_tier, max_users, max_resources, status, created_at, updated_at, deleted_at
			  FROM organizations WHERE id = $1 AND status != 'deleted'`
	var org models.Organization
	var err error
	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query, id).Scan(&org.ID, &org.Name, &org.Slug, &org.ParentID, &org.Description,
			&org.Metadata, &org.Settings, pq.Array(&org.AllowedOrigins), &org.BillingTier, &org.MaxUsers, &org.MaxResources, &org.Status, &org.CreatedAt, &org.UpdatedAt, &org.DeletedAt)
	} else {
		err = q.db.QueryRowContext(q.ctx, query, id).Scan(&org.ID, &org.Name, &org.Slug, &org.ParentID, &org.Description,
			&org.Metadata, &org.Settings, pq.Array(&org.AllowedOrigins), &org.BillingTier, &org.MaxUsers, &org.MaxResources, &org.Status, &org.CreatedAt, &org.UpdatedAt, &org.DeletedAt)
	}
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("organization not found")
		}
		return nil, err
	}
	if org.AllowedOrigins == nil {
		org.AllowedOrigins = []string{}
	}
	return &org, nil
}

func (q *organizationQueries) UpdateOrganization(org *models.Organization) error {
	query := `UPDATE organizations SET name=$2, description=$3, metadata=$4, settings=$5, billing_tier=$6, max_users=$7, max_resources=$8, status=$9, updated_at=NOW()
			  WHERE id=$1 AND status != 'deleted' RETURNING updated_at`
	var err error
	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query, org.ID, org.Name, org.Description, org.Metadata, org.Settings, org.BillingTier, org.MaxUsers, org.MaxResources, org.Status).Scan(&org.UpdatedAt)
	} else {
		err = q.db.QueryRowContext(q.ctx, query, org.ID, org.Name, org.Description, org.Metadata, org.Settings, org.BillingTier, org.MaxUsers, org.MaxResources, org.Status).Scan(&org.UpdatedAt)
	}
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("organization not found or deleted")
		}
		return err
	}
	return nil
}

func (q *organizationQueries) DeleteOrganization(id string) error {
	query := `UPDATE organizations SET status='deleted', deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND status != 'deleted'`
	var res sql.Result
	var err error
	if q.tx != nil {
		res, err = q.tx.ExecContext(q.ctx, query, id)
	} else {
		res, err = q.db.ExecContext(q.ctx, query, id)
	}
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("organization not found or deleted")
	}
	return nil
}

func (q *organizationQueries) ListOrganizationUsers(orgID string) ([]models.User, error) {
	query := `SELECT id, username, email, email_verified, display_name, avatar_url, organization_id, password_hash, password_changed_at,
				 mfa_enabled, mfa_methods, mfa_backup_codes, attributes, preferences, last_login, failed_login_attempts, locked_until,
				 status, created_at, updated_at, deleted_at
			  FROM users WHERE organization_id=$1 AND status != 'deleted'`
	var rows *sql.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, orgID)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, orgID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []models.User{}
	for rows.Next() {
		var u models.User
		var mfaMethodsJSON, mfaBackupCodesJSON sql.NullString

		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.EmailVerified, &u.DisplayName, &u.AvatarURL, &u.OrganizationID, &u.PasswordHash, &u.PasswordChangedAt,
			&u.MFAEnabled, &mfaMethodsJSON, &mfaBackupCodesJSON, &u.Attributes, &u.Preferences, &u.LastLogin, &u.FailedLoginAttempts, &u.LockedUntil, &u.Status, &u.CreatedAt, &u.UpdatedAt, &u.DeletedAt); err != nil {
			return nil, err
		}

		// Unmarshal JSONB arrays
		if mfaMethodsJSON.Valid && mfaMethodsJSON.String != "" && mfaMethodsJSON.String != "null" {
			json.Unmarshal([]byte(mfaMethodsJSON.String), &u.MFAMethods)
		} else {
			u.MFAMethods = []string{}
		}

		if mfaBackupCodesJSON.Valid && mfaBackupCodesJSON.String != "" && mfaBackupCodesJSON.String != "null" {
			json.Unmarshal([]byte(mfaBackupCodesJSON.String), &u.MFABackupCodes)
		} else {
			u.MFABackupCodes = []string{}
		}

		users = append(users, u)
	}
	return users, nil
}

func (q *organizationQueries) ListOrganizationGroups(orgID string) ([]models.Group, error) {
	query := `SELECT id, name, description, organization_id, parent_group_id, group_type, attributes, max_members, status, created_at, updated_at, deleted_at
			  FROM groups WHERE organization_id=$1 AND status != 'deleted'`
	var rows *sql.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, orgID)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, orgID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Group{}
	for rows.Next() {
		var g models.Group
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.OrganizationID, &g.ParentGroupID, &g.GroupType, &g.Attributes, &g.MaxMembers, &g.Status, &g.CreatedAt, &g.UpdatedAt, &g.DeletedAt); err != nil {
			return nil, err
		}
		list = append(list, g)
	}
	return list, nil
}

func (q *organizationQueries) ListOrganizationResources(orgID string) ([]models.Resource, error) {
	query := `SELECT id, arn, name, description, type, organization_id, parent_resource_id, owner_id, owner_type, attributes, tags, encryption_key_id,
				 lifecycle_policy, access_level, content_type, size_bytes, checksum, version, status, created_at, updated_at, accessed_at, deleted_at
			  FROM resources WHERE organization_id=$1 AND status != 'deleted'`
	var rows *sql.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, orgID)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, orgID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Resource{}
	for rows.Next() {
		var r models.Resource
		if err := rows.Scan(&r.ID, &r.ARN, &r.Name, &r.Description, &r.Type, &r.OrganizationID, &r.ParentResourceID, &r.OwnerID, &r.OwnerType, &r.Attributes, &r.Tags, &r.EncryptionKeyID,
			&r.LifecyclePolicy, &r.AccessLevel, &r.ContentType, &r.SizeBytes, &r.Checksum, &r.Version, &r.Status, &r.CreatedAt, &r.UpdatedAt, &r.AccessedAt, &r.DeletedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, nil
}

func (q *organizationQueries) ListOrganizationPolicies(orgID string) ([]models.Policy, error) {
	query := `SELECT id, name, description, version, organization_id, document, policy_type, effect, is_system_policy, created_by, approved_by, approved_at, status, created_at, updated_at, deleted_at
			  FROM policies WHERE organization_id=$1 AND status != 'deleted'`
	var rows *sql.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, orgID)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, orgID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Policy{}
	for rows.Next() {
		var p models.Policy
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Version, &p.OrganizationID, &p.Document, &p.PolicyType, &p.Effect, &p.IsSystemPolicy, &p.CreatedBy, &p.ApprovedBy, &p.ApprovedAt, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

func (q *organizationQueries) ListOrganizationRoles(orgID string) ([]models.Role, error) {
	query := `SELECT id, name, description, organization_id, role_type, max_session_duration, trust_policy, assume_role_policy, tags, is_system_role, path, permissions_boundary, status, created_at, updated_at, deleted_at
			  FROM roles WHERE organization_id=$1 AND status != 'deleted'`
	var rows *sql.Rows
	var err error
	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, orgID)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, orgID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Role{}
	for rows.Next() {
		var r models.Role

		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &r.OrganizationID, &r.RoleType, &r.MaxSessionDuration, &r.TrustPolicy, &r.AssumeRolePolicy, &r.Tags, &r.IsSystemRole, &r.Path, &r.PermissionsBoundary, &r.Status, &r.CreatedAt, &r.UpdatedAt, &r.DeletedAt); err != nil {
			return nil, err
		}

		list = append(list, r)
	}
	return list, nil
}

func (q *organizationQueries) GetOrganizationSettings(orgID string) (string, error) {
	query := `SELECT settings FROM organizations WHERE id=$1 AND status != 'deleted'`
	var settings string
	var err error
	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query, orgID).Scan(&settings)
	} else {
		err = q.db.QueryRowContext(q.ctx, query, orgID).Scan(&settings)
	}
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("organization not found")
		}
		return "", err
	}
	return settings, nil
}

func (q *organizationQueries) UpdateOrganizationSettings(orgID string, settings string) error {
	query := `UPDATE organizations SET settings=$2, updated_at=NOW() WHERE id=$1 AND status != 'deleted'`
	var res sql.Result
	var err error
	if q.tx != nil {
		res, err = q.tx.ExecContext(q.ctx, query, orgID, settings)
	} else {
		res, err = q.db.ExecContext(q.ctx, query, orgID, settings)
	}
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("organization not found or deleted")
	}
	return nil
}
