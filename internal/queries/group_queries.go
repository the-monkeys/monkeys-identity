package queries

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// GroupQueries defines all group management database operations
type GroupQueries interface {
	WithTx(tx *sql.Tx) GroupQueries
	WithContext(ctx context.Context) GroupQueries

	// Group CRUD
	ListGroups(params ListParams, orgID string) (*ListResult[models.Group], error)
	CreateGroup(g *models.Group) error
	GetGroup(id string) (*models.Group, error)
	UpdateGroup(g *models.Group) error
	DeleteGroup(id string) error

	// Membership
	ListGroupMembers(groupID string) ([]models.GroupMembership, error)
	AddGroupMember(m *models.GroupMembership) error
	RemoveGroupMember(groupID, principalID, principalType string) error

	// Permissions (placeholder for future expansion)
	GetGroupPermissions(groupID string) (string, error)
}

type groupQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewGroupQueries(db *database.DB, redis *redis.Client) GroupQueries {
	return &groupQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *groupQueries) WithTx(tx *sql.Tx) GroupQueries {
	return &groupQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *groupQueries) WithContext(ctx context.Context) GroupQueries {
	return &groupQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}

// helper selection list
var groupSelectCols = `id, name, description, organization_id, parent_group_id, group_type, attributes, max_members, status, created_at, updated_at, deleted_at`

func (q *groupQueries) exec(query string, args ...interface{}) (sql.Result, error) {
	if q.tx != nil {
		return q.tx.ExecContext(q.ctx, query, args...)
	}
	return q.db.ExecContext(q.ctx, query, args...)
}

func (q *groupQueries) query(query string, args ...interface{}) (*sql.Rows, error) {
	if q.tx != nil {
		return q.tx.QueryContext(q.ctx, query, args...)
	}
	return q.db.QueryContext(q.ctx, query, args...)
}

func (q *groupQueries) queryRow(query string, args ...interface{}) *sql.Row {
	if q.tx != nil {
		return q.tx.QueryRowContext(q.ctx, query, args...)
	}
	return q.db.QueryRowContext(q.ctx, query, args...)
}

func (q *groupQueries) ListGroups(params ListParams, orgID string) (*ListResult[models.Group], error) {
	base := `SELECT ` + groupSelectCols + `, COUNT(*) OVER() as total_count FROM groups WHERE status != 'deleted'`
	args := []interface{}{}
	if orgID != "" {
		base += " AND organization_id = $1"
		args = append(args, orgID)
	}
	// Sorting
	sortBy := "created_at"
	if params.SortBy != "" {
		allowed := map[string]bool{"name": true, "created_at": true, "updated_at": true, "group_type": true}
		if allowed[params.SortBy] {
			sortBy = params.SortBy
		}
	}
	order := "DESC"
	if strings.ToUpper(params.Order) == "ASC" {
		order = "ASC"
	}
	base += fmt.Sprintf(" ORDER BY %s %s", sortBy, order)
	// Pagination placeholders
	limit := params.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}
	// add limit/offset arguments adjusting indexes
	if len(args) == 0 {
		base += " LIMIT $1 OFFSET $2"
		args = append(args, limit, offset)
	} else {
		base += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
		args = append(args, limit, offset)
	}
	rows, err := q.query(base, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.Group
	var total int64
	for rows.Next() {
		var g models.Group
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.OrganizationID, &g.ParentGroupID, &g.GroupType, &g.Attributes, &g.MaxMembers, &g.Status, &g.CreatedAt, &g.UpdatedAt, &g.DeletedAt, &total); err != nil {
			return nil, err
		}
		list = append(list, g)
	}
	return &ListResult[models.Group]{Items: list, Total: total, Limit: limit, Offset: offset, HasMore: int64(offset+len(list)) < total}, nil
}

func (q *groupQueries) CreateGroup(g *models.Group) error {
	stmt := `INSERT INTO groups (id, name, description, organization_id, parent_group_id, group_type, attributes, max_members, status)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			 RETURNING created_at, updated_at`
	return q.queryRow(stmt, g.ID, g.Name, g.Description, g.OrganizationID, g.ParentGroupID, g.GroupType, g.Attributes, g.MaxMembers, g.Status).Scan(&g.CreatedAt, &g.UpdatedAt)
}

func (q *groupQueries) GetGroup(id string) (*models.Group, error) {
	stmt := `SELECT ` + groupSelectCols + ` FROM groups WHERE id=$1 AND status != 'deleted'`
	var g models.Group
	err := q.queryRow(stmt, id).Scan(&g.ID, &g.Name, &g.Description, &g.OrganizationID, &g.ParentGroupID, &g.GroupType, &g.Attributes, &g.MaxMembers, &g.Status, &g.CreatedAt, &g.UpdatedAt, &g.DeletedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("group not found")
		}
		return nil, err
	}
	return &g, nil
}

func (q *groupQueries) UpdateGroup(g *models.Group) error {
	stmt := `UPDATE groups SET name=$2, description=$3, parent_group_id=$4, group_type=$5, attributes=$6, max_members=$7, status=$8, updated_at=NOW() WHERE id=$1 AND status != 'deleted' RETURNING updated_at`
	if err := q.queryRow(stmt, g.ID, g.Name, g.Description, g.ParentGroupID, g.GroupType, g.Attributes, g.MaxMembers, g.Status).Scan(&g.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("group not found or deleted")
		}
		return err
	}
	return nil
}

func (q *groupQueries) DeleteGroup(id string) error {
	stmt := `UPDATE groups SET status='deleted', deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND status != 'deleted'`
	res, err := q.exec(stmt, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("group not found or deleted")
	}
	return nil
}

func (q *groupQueries) ListGroupMembers(groupID string) ([]models.GroupMembership, error) {
	stmt := `SELECT id, group_id, principal_id, principal_type, role_in_group, joined_at, expires_at, added_by FROM group_memberships WHERE group_id=$1`
	rows, err := q.query(stmt, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []models.GroupMembership
	for rows.Next() {
		var m models.GroupMembership
		if err := rows.Scan(&m.ID, &m.GroupID, &m.PrincipalID, &m.PrincipalType, &m.RoleInGroup, &m.JoinedAt, &m.ExpiresAt, &m.AddedBy); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (q *groupQueries) AddGroupMember(m *models.GroupMembership) error {
	stmt := `INSERT INTO group_memberships (id, group_id, principal_id, principal_type, role_in_group, expires_at, added_by)
			 VALUES ($1,$2,$3,$4,$5,$6,$7)
			 ON CONFLICT (group_id, principal_id, principal_type) DO UPDATE SET role_in_group=EXCLUDED.role_in_group, expires_at=EXCLUDED.expires_at
			 RETURNING joined_at`
	return q.queryRow(stmt, m.ID, m.GroupID, m.PrincipalID, m.PrincipalType, m.RoleInGroup, m.ExpiresAt, m.AddedBy).Scan(&m.JoinedAt)
}

func (q *groupQueries) RemoveGroupMember(groupID, principalID, principalType string) error {
	stmt := `DELETE FROM group_memberships WHERE group_id=$1 AND principal_id=$2 AND principal_type=$3`
	res, err := q.exec(stmt, groupID, principalID, principalType)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("membership not found")
	}
	return nil
}

// GetGroupPermissions aggregates permissions for a group.
// This initial implementation approximates effective permissions by:
// 1. Finding roles assigned to members of the group (via role_assignments + group_memberships)
// 2. Collecting policies attached to those roles (role_policies -> policies.document)
// Future enhancements may include:
// - Direct group to policy attachments
// - Resource scoping
// - Policy evaluation / conditions
// - Conflict resolution precedence
func (q *groupQueries) GetGroupPermissions(groupID string) (string, error) {
	// Basic validation that group exists (optional but helpful)
	if _, err := q.GetGroup(groupID); err != nil {
		return "", err
	}

	// Query to get policy documents (JSON) via roles of group members.
	// We keep raw documents and perform a naive merge extracting allowed/denied actions.
	stmt := `
		WITH member_principals AS (
			SELECT DISTINCT principal_id, principal_type
			FROM group_memberships
			WHERE group_id = $1
		), principal_roles AS (
			SELECT DISTINCT ra.role_id
			FROM role_assignments ra
			JOIN member_principals mp ON mp.principal_id = ra.principal_id AND mp.principal_type = ra.principal_type
			WHERE (ra.expires_at IS NULL OR ra.expires_at > NOW())
		), role_policies_join AS (
			SELECT rp.policy_id
			FROM role_policies rp
			JOIN principal_roles pr ON pr.role_id = rp.role_id
		)
		SELECT p.document
		FROM policies p
		JOIN role_policies_join rpj ON rpj.policy_id = p.id
		WHERE p.status = 'active'
	`

	rows, err := q.query(stmt, groupID)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var allowActions = make(map[string]struct{})
	var denyActions = make(map[string]struct{})

	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return "", err
		}
		if raw == "" {
			continue
		}
		var doc struct {
			Statement []struct {
				Effect    string      `json:"Effect"`
				Action    interface{} `json:"Action"`
				NotAction interface{} `json:"NotAction"`
			} `json:"Statement"`
		}
		if err := json.Unmarshal([]byte(raw), &doc); err != nil {
			continue
		} // skip malformed
		for _, st := range doc.Statement {
			// Only process Action list (ignore NotAction for now)
			var actions []string
			switch v := st.Action.(type) {
			case string:
				actions = append(actions, v)
			case []interface{}:
				for _, a := range v {
					if s, ok := a.(string); ok {
						actions = append(actions, s)
					}
				}
			case []string:
				actions = append(actions, v...)
			}
			if strings.EqualFold(st.Effect, "allow") {
				for _, a := range actions {
					allowActions[a] = struct{}{}
				}
			} else if strings.EqualFold(st.Effect, "deny") {
				for _, a := range actions {
					denyActions[a] = struct{}{}
				}
			}
		}
	}
	// Build result object
	result := struct {
		GroupID string   `json:"group_id"`
		Allow   []string `json:"allow"`
		Deny    []string `json:"deny"`
		Summary struct {
			AllowCount int `json:"allow_count"`
			DenyCount  int `json:"deny_count"`
		} `json:"summary"`
	}{GroupID: groupID}
	for a := range allowActions {
		result.Allow = append(result.Allow, a)
	}
	for a := range denyActions {
		result.Deny = append(result.Deny, a)
	}
	result.Summary.AllowCount = len(result.Allow)
	result.Summary.DenyCount = len(result.Deny)
	// Simple deterministic ordering (optional) - we can sort if needed
	b, err := json.Marshal(result)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
