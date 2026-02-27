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

// ── Interface ──────────────────────────────────────────────────────────

// ContentQueries defines all content-related database operations.
// Works for any content type (blog, video, tweet, comment, etc.).
// Authorization is done locally via the collaborator table — no round-trip
// to the resource_shares table, making this O(1) per check.
type ContentQueries interface {
	WithTx(tx *sql.Tx) ContentQueries
	WithContext(ctx context.Context) ContentQueries

	// Content CRUD
	CreateContent(item *models.ContentItem) error
	GetContent(id, organizationID string) (*models.ContentItem, error)
	ListContent(params ListParams, organizationID, userID, contentType string) (*ListResult[*models.ContentItem], error)
	UpdateContent(item *models.ContentItem, organizationID string) error
	DeleteContent(id, organizationID string) error

	// Status transitions
	UpdateContentStatus(id, organizationID, status string) error

	// Collaborator management
	AddCollaborator(contentID, userID, role, invitedBy string) error
	RemoveCollaborator(contentID, userID string) error
	ListCollaborators(contentID string) ([]models.ContentCollaboratorWithUser, error)
	GetCollaboratorRole(contentID, userID string) (string, error)
}

// ── Implementation ─────────────────────────────────────────────────────

type contentQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewContentQueries(db *database.DB, redis *redis.Client) ContentQueries {
	return &contentQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *contentQueries) WithTx(tx *sql.Tx) ContentQueries {
	return &contentQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *contentQueries) WithContext(ctx context.Context) ContentQueries {
	return &contentQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}

func (q *contentQueries) conn() DBTX {
	if q.tx != nil {
		return q.tx
	}
	return q.db.DB
}

// ── Content CRUD ───────────────────────────────────────────────────────

func (q *contentQueries) CreateContent(item *models.ContentItem) error {
	query := `
		INSERT INTO content_items (id, content_type, title, slug, body, summary, cover_image_url,
		                           parent_id, owner_id, organization_id, status, tags, metadata,
		                           created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	return q.conn().QueryRowContext(q.ctx, query,
		item.ID, item.ContentType, item.Title, item.Slug, item.Body, item.Summary,
		item.CoverImageURL, item.ParentID, item.OwnerID, item.OrganizationID,
		item.Status, item.Tags, item.Metadata,
	).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)
}

func (q *contentQueries) GetContent(id, organizationID string) (*models.ContentItem, error) {
	query := `
		SELECT id, content_type, title, slug, body, summary, cover_image_url,
		       parent_id, owner_id, organization_id, status, tags, metadata,
		       published_at, created_at, updated_at
		FROM content_items
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`

	c := &models.ContentItem{}
	err := q.conn().QueryRowContext(q.ctx, query, id, organizationID).Scan(
		&c.ID, &c.ContentType, &c.Title, &c.Slug, &c.Body, &c.Summary, &c.CoverImageURL,
		&c.ParentID, &c.OwnerID, &c.OrganizationID, &c.Status, &c.Tags, &c.Metadata,
		&c.PublishedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("content not found")
	}
	return c, err
}

func (q *contentQueries) ListContent(params ListParams, organizationID, userID, contentType string) (*ListResult[*models.ContentItem], error) {
	// List all content where the user is owner OR collaborator, optionally filtered by type.
	args := []interface{}{organizationID, userID}
	where := `c.organization_id = $1 AND c.deleted_at IS NULL
	           AND (c.owner_id = $2 OR EXISTS (
	               SELECT 1 FROM content_collaborators cc WHERE cc.content_id = c.id AND cc.user_id = $2
	           ))`
	if contentType != "" {
		args = append(args, contentType)
		where += fmt.Sprintf(` AND c.content_type = $%d`, len(args))
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM content_items c WHERE %s`, where)
	var total int64
	if err := q.conn().QueryRowContext(q.ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count content: %w", err)
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := params.Offset
	sortBy := "c.updated_at"
	if params.SortBy != "" {
		allowed := map[string]bool{"title": true, "status": true, "created_at": true, "updated_at": true, "content_type": true}
		if allowed[params.SortBy] {
			sortBy = "c." + params.SortBy
		}
	}
	order := "DESC"
	if strings.EqualFold(params.Order, "ASC") {
		order = "ASC"
	}

	// Append limit/offset placeholders
	limitIdx := len(args) + 1
	offsetIdx := len(args) + 2
	args = append(args, limit, offset)

	query := fmt.Sprintf(`
		SELECT c.id, c.content_type, c.title, c.slug, c.body, c.summary, c.cover_image_url,
		       c.parent_id, c.owner_id, c.organization_id, c.status, c.tags, c.metadata,
		       c.published_at, c.created_at, c.updated_at
		FROM content_items c
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`, where, sortBy, order, limitIdx, offsetIdx)

	rows, err := q.conn().QueryContext(q.ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list content: %w", err)
	}
	defer rows.Close()

	var items []*models.ContentItem
	for rows.Next() {
		ci := &models.ContentItem{}
		if err := rows.Scan(
			&ci.ID, &ci.ContentType, &ci.Title, &ci.Slug, &ci.Body, &ci.Summary, &ci.CoverImageURL,
			&ci.ParentID, &ci.OwnerID, &ci.OrganizationID, &ci.Status, &ci.Tags, &ci.Metadata,
			&ci.PublishedAt, &ci.CreatedAt, &ci.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan content: %w", err)
		}
		items = append(items, ci)
	}

	totalPages := 0
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return &ListResult[*models.ContentItem]{
		Items:      items,
		Total:      total,
		Limit:      limit,
		Offset:     offset,
		HasMore:    int64(offset+limit) < total,
		TotalPages: totalPages,
	}, nil
}

func (q *contentQueries) UpdateContent(item *models.ContentItem, organizationID string) error {
	query := `
		UPDATE content_items
		SET title = $1, slug = $2, body = $3, summary = $4, cover_image_url = $5,
		    tags = $6, metadata = $7, updated_at = NOW()
		WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL`

	res, err := q.conn().ExecContext(q.ctx, query,
		item.Title, item.Slug, item.Body, item.Summary, item.CoverImageURL,
		item.Tags, item.Metadata,
		item.ID, organizationID,
	)
	if err != nil {
		return fmt.Errorf("update content: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("content not found")
	}
	return nil
}

func (q *contentQueries) DeleteContent(id, organizationID string) error {
	query := `UPDATE content_items SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	res, err := q.conn().ExecContext(q.ctx, query, id, organizationID)
	if err != nil {
		return fmt.Errorf("delete content: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("content not found")
	}
	return nil
}

// ── Status ─────────────────────────────────────────────────────────────

func (q *contentQueries) UpdateContentStatus(id, organizationID, status string) error {
	var publishedClause string
	args := []interface{}{status, id, organizationID}
	if status == "published" {
		publishedClause = ", published_at = $4"
		args = append(args, time.Now())
	}

	query := fmt.Sprintf(`
		UPDATE content_items SET status = $1, updated_at = NOW()%s
		WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL`, publishedClause)

	res, err := q.conn().ExecContext(q.ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update content status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("content not found")
	}
	return nil
}

// ── Collaborators ──────────────────────────────────────────────────────

func (q *contentQueries) AddCollaborator(contentID, userID, role, invitedBy string) error {
	query := `
		INSERT INTO content_collaborators (content_id, user_id, role, invited_by, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (content_id, user_id) DO UPDATE SET role = EXCLUDED.role`

	_, err := q.conn().ExecContext(q.ctx, query, contentID, userID, role, invitedBy)
	if err != nil {
		return fmt.Errorf("add collaborator: %w", err)
	}
	return nil
}

func (q *contentQueries) RemoveCollaborator(contentID, userID string) error {
	query := `DELETE FROM content_collaborators WHERE content_id = $1 AND user_id = $2 AND role != 'owner'`
	res, err := q.conn().ExecContext(q.ctx, query, contentID, userID)
	if err != nil {
		return fmt.Errorf("remove collaborator: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("collaborator not found or is the content owner")
	}
	return nil
}

func (q *contentQueries) ListCollaborators(contentID string) ([]models.ContentCollaboratorWithUser, error) {
	query := `
		SELECT cc.content_id, cc.user_id, cc.role, COALESCE(cc.invited_by::text, ''), cc.created_at,
		       u.username, u.email, COALESCE(u.display_name, '')
		FROM content_collaborators cc
		JOIN users u ON u.id = cc.user_id
		WHERE cc.content_id = $1
		ORDER BY cc.created_at`

	rows, err := q.conn().QueryContext(q.ctx, query, contentID)
	if err != nil {
		return nil, fmt.Errorf("list collaborators: %w", err)
	}
	defer rows.Close()

	var collabs []models.ContentCollaboratorWithUser
	for rows.Next() {
		var c models.ContentCollaboratorWithUser
		if err := rows.Scan(
			&c.ContentID, &c.UserID, &c.Role, &c.InvitedBy, &c.CreatedAt,
			&c.Username, &c.Email, &c.DisplayName,
		); err != nil {
			return nil, fmt.Errorf("scan collaborator: %w", err)
		}
		collabs = append(collabs, c)
	}
	return collabs, nil
}

// GetCollaboratorRole returns the role a user has on a content item.
// Returns "" if the user has no access. This is a single-row PK lookup — O(1).
func (q *contentQueries) GetCollaboratorRole(contentID, userID string) (string, error) {
	query := `SELECT role FROM content_collaborators WHERE content_id = $1 AND user_id = $2`
	var role string
	err := q.conn().QueryRowContext(q.ctx, query, contentID, userID).Scan(&role)
	if err == sql.ErrNoRows {
		return "", nil // No access
	}
	return role, err
}
