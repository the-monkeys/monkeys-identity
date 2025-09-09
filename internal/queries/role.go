package queries

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// RoleQueries defines all role management database operations
type RoleQueries interface {
	WithTx(tx *sql.Tx) RoleQueries
	WithContext(ctx context.Context) RoleQueries

	// Role CRUD operations
	ListRoles(params ListParams) (*ListResult[models.Role], error)
	CreateRole(role *models.Role) error
	GetRole(id string) (*models.Role, error)
	UpdateRole(role *models.Role) error
	DeleteRole(id string) error

	// Role-Policy operations
	GetRolePolicies(roleID string) ([]models.Policy, error)
	AttachPolicyToRole(roleID, policyID, attachedBy string) error
	DetachPolicyFromRole(roleID, policyID string) error

	// Role assignment operations
	GetRoleAssignments(roleID string) ([]models.RoleAssignment, error)
	AssignRole(assignment *models.RoleAssignment) error
	UnassignRole(roleID, principalID string) error
}

type roleQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewRoleQueries(db *database.DB, redis *redis.Client) RoleQueries {
	return &roleQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *roleQueries) WithTx(tx *sql.Tx) RoleQueries {
	return &roleQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *roleQueries) WithContext(ctx context.Context) RoleQueries {
	return &roleQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}

// Role-specific query methods

// ListRoles retrieves all roles with pagination and filtering
func (q *roleQueries) ListRoles(params ListParams) (*ListResult[models.Role], error) {
	query := `
		SELECT id, name, description, organization_id, role_type, max_session_duration,
		       trust_policy, assume_role_policy, tags, is_system_role, path,
		       permissions_boundary, status, created_at, updated_at, deleted_at,
		       COUNT(*) OVER() as total_count
		FROM roles 
		WHERE status != 'deleted'
	`

	args := []interface{}{}
	argIndex := 1

	// Add sorting
	orderBy := "created_at"
	if params.SortBy != "" {
		allowedSorts := map[string]bool{
			"name": true, "created_at": true, "updated_at": true,
			"role_type": true, "organization_id": true,
		}
		if allowedSorts[params.SortBy] {
			orderBy = params.SortBy
		}
	}

	order := "DESC"
	if params.Order == "asc" {
		order = "ASC"
	}

	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, order)

	// Add pagination
	if params.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, params.Limit)
		argIndex++
	}

	if params.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, params.Offset)
		argIndex++
	}

	// Use transaction if available, otherwise use database
	if q.tx != nil {
		rows, err := q.tx.QueryContext(q.ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to query roles: %w", err)
		}
		defer rows.Close()

		var roles []models.Role
		var totalCount int64

		for rows.Next() {
			var role models.Role
			err := rows.Scan(
				&role.ID, &role.Name, &role.Description, &role.OrganizationID,
				&role.RoleType, &role.MaxSessionDuration, &role.TrustPolicy,
				&role.AssumeRolePolicy, &role.Tags, &role.IsSystemRole,
				&role.Path, &role.PermissionsBoundary, &role.Status,
				&role.CreatedAt, &role.UpdatedAt, &role.DeletedAt, &totalCount,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to scan role: %w", err)
			}
			roles = append(roles, role)
		}

		return &ListResult[models.Role]{
			Items:   roles,
			Total:   totalCount,
			Limit:   params.Limit,
			Offset:  params.Offset,
			HasMore: int64(params.Offset+len(roles)) < totalCount,
		}, nil
	}

	rows, err := q.db.QueryContext(q.ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query roles: %w", err)
	}
	defer rows.Close()

	var roles []models.Role
	var totalCount int64

	for rows.Next() {
		var role models.Role
		err := rows.Scan(
			&role.ID, &role.Name, &role.Description, &role.OrganizationID,
			&role.RoleType, &role.MaxSessionDuration, &role.TrustPolicy,
			&role.AssumeRolePolicy, &role.Tags, &role.IsSystemRole,
			&role.Path, &role.PermissionsBoundary, &role.Status,
			&role.CreatedAt, &role.UpdatedAt, &role.DeletedAt, &totalCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}
		roles = append(roles, role)
	}

	return &ListResult[models.Role]{
		Items:   roles,
		Total:   totalCount,
		Limit:   params.Limit,
		Offset:  params.Offset,
		HasMore: int64(params.Offset+len(roles)) < totalCount,
	}, nil
}

// CreateRole creates a new role
func (q *roleQueries) CreateRole(role *models.Role) error {
	query := `
		INSERT INTO roles (id, name, description, organization_id, role_type,
		                  max_session_duration, trust_policy, assume_role_policy,
		                  tags, is_system_role, path, permissions_boundary, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING created_at, updated_at
	`

	if q.tx != nil {
		err := q.tx.QueryRowContext(q.ctx, query,
			role.ID, role.Name, role.Description, role.OrganizationID,
			role.RoleType, role.MaxSessionDuration, role.TrustPolicy,
			role.AssumeRolePolicy, role.Tags, role.IsSystemRole,
			role.Path, role.PermissionsBoundary, role.Status,
		).Scan(&role.CreatedAt, &role.UpdatedAt)
		return err
	}

	err := q.db.QueryRowContext(q.ctx, query,
		role.ID, role.Name, role.Description, role.OrganizationID,
		role.RoleType, role.MaxSessionDuration, role.TrustPolicy,
		role.AssumeRolePolicy, role.Tags, role.IsSystemRole,
		role.Path, role.PermissionsBoundary, role.Status,
	).Scan(&role.CreatedAt, &role.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create role: %w", err)
	}

	return nil
}

// GetRole retrieves a role by ID
func (q *roleQueries) GetRole(id string) (*models.Role, error) {
	query := `
		SELECT id, name, description, organization_id, role_type, max_session_duration,
		       trust_policy, assume_role_policy, tags, is_system_role, path,
		       permissions_boundary, status, created_at, updated_at, deleted_at
		FROM roles 
		WHERE id = $1 AND status != 'deleted'
	`

	var role models.Role
	var err error

	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query, id).Scan(
			&role.ID, &role.Name, &role.Description, &role.OrganizationID,
			&role.RoleType, &role.MaxSessionDuration, &role.TrustPolicy,
			&role.AssumeRolePolicy, &role.Tags, &role.IsSystemRole,
			&role.Path, &role.PermissionsBoundary, &role.Status,
			&role.CreatedAt, &role.UpdatedAt, &role.DeletedAt,
		)
	} else {
		err = q.db.QueryRowContext(q.ctx, query, id).Scan(
			&role.ID, &role.Name, &role.Description, &role.OrganizationID,
			&role.RoleType, &role.MaxSessionDuration, &role.TrustPolicy,
			&role.AssumeRolePolicy, &role.Tags, &role.IsSystemRole,
			&role.Path, &role.PermissionsBoundary, &role.Status,
			&role.CreatedAt, &role.UpdatedAt, &role.DeletedAt,
		)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	return &role, nil
}

// UpdateRole updates an existing role
func (q *roleQueries) UpdateRole(role *models.Role) error {
	query := `
		UPDATE roles 
		SET name = $2, description = $3, role_type = $4, max_session_duration = $5,
		    trust_policy = $6, assume_role_policy = $7, tags = $8, path = $9,
		    permissions_boundary = $10, status = $11, updated_at = NOW()
		WHERE id = $1 AND status != 'deleted'
		RETURNING updated_at
	`

	var err error
	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query,
			role.ID, role.Name, role.Description, role.RoleType,
			role.MaxSessionDuration, role.TrustPolicy, role.AssumeRolePolicy,
			role.Tags, role.Path, role.PermissionsBoundary, role.Status,
		).Scan(&role.UpdatedAt)
	} else {
		err = q.db.QueryRowContext(q.ctx, query,
			role.ID, role.Name, role.Description, role.RoleType,
			role.MaxSessionDuration, role.TrustPolicy, role.AssumeRolePolicy,
			role.Tags, role.Path, role.PermissionsBoundary, role.Status,
		).Scan(&role.UpdatedAt)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("role not found or already deleted")
		}
		return fmt.Errorf("failed to update role: %w", err)
	}

	return nil
}

// DeleteRole soft deletes a role
func (q *roleQueries) DeleteRole(id string) error {
	query := `
		UPDATE roles 
		SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status != 'deleted'
	`

	var result sql.Result
	var err error

	if q.tx != nil {
		result, err = q.tx.ExecContext(q.ctx, query, id)
	} else {
		result, err = q.db.ExecContext(q.ctx, query, id)
	}

	if err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("role not found or already deleted")
	}

	return nil
}

// GetRolePolicies retrieves all policies attached to a role
func (q *roleQueries) GetRolePolicies(roleID string) ([]models.Policy, error) {
	query := `
		SELECT p.id, p.name, p.description, p.organization_id, p.document,
		       p.is_system_policy, p.status, p.created_at, p.updated_at, p.deleted_at
		FROM policies p
		JOIN role_policies rp ON p.id = rp.policy_id
		WHERE rp.role_id = $1 AND p.status = 'active'
		ORDER BY rp.attached_at DESC
	`

	var rows *sql.Rows
	var err error

	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, roleID)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, roleID)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to query role policies: %w", err)
	}
	defer rows.Close()

	var policies []models.Policy
	for rows.Next() {
		var policy models.Policy
		err := rows.Scan(
			&policy.ID, &policy.Name, &policy.Description, &policy.OrganizationID,
			&policy.Document, &policy.IsSystemPolicy, &policy.Status,
			&policy.CreatedAt, &policy.UpdatedAt, &policy.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan policy: %w", err)
		}
		policies = append(policies, policy)
	}

	return policies, nil
}

// AttachPolicyToRole attaches a policy to a role
func (q *roleQueries) AttachPolicyToRole(roleID, policyID, attachedBy string) error {
	query := `
		INSERT INTO role_policies (role_id, policy_id, attached_by)
		VALUES ($1, $2, $3)
		ON CONFLICT (role_id, policy_id) DO NOTHING
	`

	var result sql.Result
	var err error

	if q.tx != nil {
		result, err = q.tx.ExecContext(q.ctx, query, roleID, policyID, attachedBy)
	} else {
		result, err = q.db.ExecContext(q.ctx, query, roleID, policyID, attachedBy)
	}

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return fmt.Errorf("role or policy not found")
		}
		return fmt.Errorf("failed to attach policy to role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("policy already attached to role")
	}

	return nil
}

// DetachPolicyFromRole detaches a policy from a role
func (q *roleQueries) DetachPolicyFromRole(roleID, policyID string) error {
	query := `
		DELETE FROM role_policies
		WHERE role_id = $1 AND policy_id = $2
	`

	var result sql.Result
	var err error

	if q.tx != nil {
		result, err = q.tx.ExecContext(q.ctx, query, roleID, policyID)
	} else {
		result, err = q.db.ExecContext(q.ctx, query, roleID, policyID)
	}

	if err != nil {
		return fmt.Errorf("failed to detach policy from role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("policy not attached to role")
	}

	return nil
}

// GetRoleAssignments retrieves all assignments for a role
func (q *roleQueries) GetRoleAssignments(roleID string) ([]models.RoleAssignment, error) {
	query := `
		SELECT id, role_id, principal_id, principal_type, assigned_by,
		       assigned_at, expires_at, conditions
		FROM role_assignments
		WHERE role_id = $1
		ORDER BY assigned_at DESC
	`

	var rows *sql.Rows
	var err error

	if q.tx != nil {
		rows, err = q.tx.QueryContext(q.ctx, query, roleID)
	} else {
		rows, err = q.db.QueryContext(q.ctx, query, roleID)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to query role assignments: %w", err)
	}
	defer rows.Close()

	var assignments []models.RoleAssignment
	for rows.Next() {
		var assignment models.RoleAssignment
		err := rows.Scan(
			&assignment.ID, &assignment.RoleID, &assignment.PrincipalID,
			&assignment.PrincipalType, &assignment.AssignedBy,
			&assignment.AssignedAt, &assignment.ExpiresAt, &assignment.Conditions,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan role assignment: %w", err)
		}
		assignments = append(assignments, assignment)
	}

	return assignments, nil
}

// AssignRole assigns a role to a principal (user or service account)
func (q *roleQueries) AssignRole(assignment *models.RoleAssignment) error {
	query := `
		INSERT INTO role_assignments (id, role_id, principal_id, principal_type,
		                             assigned_by, expires_at, conditions)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (role_id, principal_id, principal_type) 
		DO UPDATE SET
			assigned_by = EXCLUDED.assigned_by,
			assigned_at = NOW(),
			expires_at = EXCLUDED.expires_at,
			conditions = EXCLUDED.conditions
		RETURNING assigned_at
	`

	var err error

	if q.tx != nil {
		err = q.tx.QueryRowContext(q.ctx, query,
			assignment.ID, assignment.RoleID, assignment.PrincipalID,
			assignment.PrincipalType, assignment.AssignedBy,
			assignment.ExpiresAt, assignment.Conditions,
		).Scan(&assignment.AssignedAt)
	} else {
		err = q.db.QueryRowContext(q.ctx, query,
			assignment.ID, assignment.RoleID, assignment.PrincipalID,
			assignment.PrincipalType, assignment.AssignedBy,
			assignment.ExpiresAt, assignment.Conditions,
		).Scan(&assignment.AssignedAt)
	}

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return fmt.Errorf("role or principal not found")
		}
		return fmt.Errorf("failed to assign role: %w", err)
	}

	return nil
}

// UnassignRole removes a role assignment from a principal
func (q *roleQueries) UnassignRole(roleID, principalID string) error {
	query := `
		DELETE FROM role_assignments
		WHERE role_id = $1 AND principal_id = $2
	`

	var result sql.Result
	var err error

	if q.tx != nil {
		result, err = q.tx.ExecContext(q.ctx, query, roleID, principalID)
	} else {
		result, err = q.db.ExecContext(q.ctx, query, roleID, principalID)
	}

	if err != nil {
		return fmt.Errorf("failed to unassign role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("role assignment not found")
	}

	return nil
}
