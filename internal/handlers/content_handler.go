package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

// ContentHandler handles generic content CRUD and collaboration with scalable
// per-item authorization. Works for blogs, videos, tweets, comments, etc.
// Authorization is done locally via the content_collaborators table (O(1) PK lookup)
// rather than going through the IAM resource_shares table.
type ContentHandler struct {
	db      *database.DB
	redis   *redis.Client
	logger  *logger.Logger
	queries *queries.Queries
}

func NewContentHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *ContentHandler {
	return &ContentHandler{db: db, redis: redis, logger: logger, queries: queries.New(db, redis)}
}

// ── Helper: per-item authorization ─────────────────────────────────────

// contentRole returns the caller's role on the given content ("owner" | "co-author" | "").
func (h *ContentHandler) contentRole(c *fiber.Ctx, contentID string) (string, error) {
	userID := c.Locals("user_id").(string)

	// Fast path: check collaborator table (PK lookup)
	role, err := h.queries.Content.GetCollaboratorRole(contentID, userID)
	if err != nil {
		return "", err
	}
	if role != "" {
		return role, nil
	}

	// Fallback: check if the user is the content owner (handles race before collaborator row is inserted)
	orgID := c.Locals("organization_id").(string)
	item, err := h.queries.Content.GetContent(contentID, orgID)
	if err != nil {
		return "", err
	}
	if item.OwnerID == userID {
		return "owner", nil
	}
	return "", nil
}

func requireOwner(role string) error {
	if role != "owner" {
		return fiber.NewError(fiber.StatusForbidden, "Only the content owner can perform this action")
	}
	return nil
}

func requireCollaborator(role string) error {
	if role == "" {
		return fiber.NewError(fiber.StatusForbidden, "You do not have access to this content")
	}
	return nil
}

// ── Allowed content types ──────────────────────────────────────────────

var allowedContentTypes = map[string]bool{
	"blog":    true,
	"video":   true,
	"tweet":   true,
	"comment": true,
	"article": true,
	"post":    true,
}

func isValidContentType(ct string) bool {
	return allowedContentTypes[ct]
}

// ── Content CRUD ───────────────────────────────────────────────────────

// CreateContent creates a new content item. The caller becomes the owner.
//
//	@Summary	Create content
//	@Description	Create a new content item (blog, video, tweet, comment, etc.). The authenticated user becomes the owner.
//	@Tags		Content
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object	true	"Content details"
//	@Success	201	{object}	object	"Content created"
//	@Failure	400	{object}	object	"Invalid request"
//	@Security	BearerAuth
//	@Router		/content [post]
func (h *ContentHandler) CreateContent(c *fiber.Ctx) error {
	var req struct {
		ContentType   string  `json:"content_type"`
		Title         string  `json:"title"`
		Body          string  `json:"body"`
		Summary       string  `json:"summary"`
		CoverImageURL string  `json:"cover_image_url"`
		ParentID      *string `json:"parent_id"`
		Tags          string  `json:"tags"`
		Metadata      string  `json:"metadata"`
	}
	if err := c.BodyParser(&req); err != nil {
		return apiError(c, fiber.StatusBadRequest, "invalid_request", "Invalid JSON body")
	}
	if strings.TrimSpace(req.Title) == "" {
		return apiError(c, fiber.StatusBadRequest, "validation_error", "Title is required")
	}

	contentType := strings.ToLower(strings.TrimSpace(req.ContentType))
	if contentType == "" {
		contentType = "blog"
	}
	if !isValidContentType(contentType) {
		return apiError(c, fiber.StatusBadRequest, "validation_error",
			"Invalid content_type. Allowed: blog, video, tweet, comment, article, post")
	}

	userID := c.Locals("user_id").(string)
	orgID := c.Locals("organization_id").(string)

	item := &models.ContentItem{
		ID:             uuid.New().String(),
		ContentType:    contentType,
		Title:          req.Title,
		Slug:           slugify(req.Title),
		Body:           req.Body,
		Summary:        req.Summary,
		CoverImageURL:  req.CoverImageURL,
		ParentID:       req.ParentID,
		OwnerID:        userID,
		OrganizationID: orgID,
		Status:         "draft",
		Tags:           defaultJSON(req.Tags, "[]"),
		Metadata:       defaultJSON(req.Metadata, "{}"),
	}

	if err := h.queries.Content.CreateContent(item); err != nil {
		h.logger.Error("create content: %v", err)
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to create content")
	}

	// Auto-insert owner as collaborator so all permission checks work via PK lookup
	if err := h.queries.Content.AddCollaborator(item.ID, userID, "owner", userID); err != nil {
		h.logger.Error("add owner collaborator: %v", err)
		// Non-fatal — the fallback in contentRole() handles this
	}

	return apiSuccess(c, fiber.StatusCreated, "Content created successfully", item)
}

// GetContent returns a single content item by ID.
//
//	@Summary	Get content
//	@Description	Retrieve a content item by its ID. Requires collaborator access.
//	@Tags		Content
//	@Produce	json
//	@Param		id	path	string	true	"Content ID"
//	@Success	200	{object}	object	"Content detail"
//	@Failure	403	{object}	object	"Forbidden"
//	@Failure	404	{object}	object	"Not found"
//	@Security	BearerAuth
//	@Router		/content/{id} [get]
func (h *ContentHandler) GetContent(c *fiber.Ctx) error {
	contentID := c.Params("id")
	orgID := c.Locals("organization_id").(string)

	item, err := h.queries.Content.GetContent(contentID, orgID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}

	role, err := h.contentRole(c, contentID)
	if err != nil {
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to check access")
	}
	if err := requireCollaborator(role); err != nil {
		return apiError(c, fiber.StatusForbidden, "forbidden", "You do not have access to this content")
	}

	return apiSuccess(c, fiber.StatusOK, "Content retrieved successfully", fiber.Map{
		"content": item,
		"role":    role,
	})
}

// ListContent returns all content the caller owns or collaborates on.
//
//	@Summary	List content
//	@Description	List content items owned by or shared with the authenticated user. Optional content_type filter.
//	@Tags		Content
//	@Produce	json
//	@Param		limit			query	int		false	"Limit"
//	@Param		offset			query	int		false	"Offset"
//	@Param		content_type	query	string	false	"Filter by type (blog, video, tweet, comment)"
//	@Success	200	{object}	object	"Content list"
//	@Security	BearerAuth
//	@Router		/content [get]
func (h *ContentHandler) ListContent(c *fiber.Ctx) error {
	orgID := c.Locals("organization_id").(string)
	userID := c.Locals("user_id").(string)
	contentType := c.Query("content_type", "")

	params := queries.ListParams{Limit: 20}
	if v := c.QueryInt("limit", 20); v > 0 {
		params.Limit = v
	}
	if v := c.QueryInt("offset", 0); v >= 0 {
		params.Offset = v
	}
	params.SortBy = c.Query("sort_by", "updated_at")
	params.Order = c.Query("order", "DESC")

	result, err := h.queries.Content.ListContent(params, orgID, userID, contentType)
	if err != nil {
		h.logger.Error("list content: %v", err)
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to list content")
	}

	return apiSuccess(c, fiber.StatusOK, "Content retrieved successfully", result)
}

// UpdateContent updates a content item. Owner or co-author can edit.
//
//	@Summary	Update content
//	@Description	Update content fields. Requires owner or co-author role.
//	@Tags		Content
//	@Accept		json
//	@Produce	json
//	@Param		id		path	string	true	"Content ID"
//	@Param		request	body	object	true	"Updated fields"
//	@Success	200	{object}	object	"Content updated"
//	@Failure	403	{object}	object	"Forbidden"
//	@Security	BearerAuth
//	@Router		/content/{id} [put]
func (h *ContentHandler) UpdateContent(c *fiber.Ctx) error {
	contentID := c.Params("id")
	orgID := c.Locals("organization_id").(string)

	role, err := h.contentRole(c, contentID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}
	if err := requireCollaborator(role); err != nil {
		return apiError(c, fiber.StatusForbidden, "forbidden", "You do not have access to this content")
	}

	var req struct {
		Title         *string `json:"title"`
		Body          *string `json:"body"`
		Summary       *string `json:"summary"`
		CoverImageURL *string `json:"cover_image_url"`
		Tags          *string `json:"tags"`
		Metadata      *string `json:"metadata"`
	}
	if err := c.BodyParser(&req); err != nil {
		return apiError(c, fiber.StatusBadRequest, "invalid_request", "Invalid JSON body")
	}

	// Fetch current to merge
	item, err := h.queries.Content.GetContent(contentID, orgID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}

	if req.Title != nil {
		item.Title = *req.Title
		item.Slug = slugify(*req.Title)
	}
	if req.Body != nil {
		item.Body = *req.Body
	}
	if req.Summary != nil {
		item.Summary = *req.Summary
	}
	if req.CoverImageURL != nil {
		item.CoverImageURL = *req.CoverImageURL
	}
	if req.Tags != nil {
		item.Tags = *req.Tags
	}
	if req.Metadata != nil {
		item.Metadata = *req.Metadata
	}

	if err := h.queries.Content.UpdateContent(item, orgID); err != nil {
		h.logger.Error("update content: %v", err)
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to update content")
	}

	return apiSuccess(c, fiber.StatusOK, "Content updated successfully", item)
}

// DeleteContent soft-deletes a content item. OWNER ONLY — co-authors get 403.
//
//	@Summary	Delete content
//	@Description	Soft-delete a content item. Only the owner can delete.
//	@Tags		Content
//	@Produce	json
//	@Param		id	path	string	true	"Content ID"
//	@Success	200	{object}	object	"Content deleted"
//	@Failure	403	{object}	object	"Forbidden - only owner can delete"
//	@Security	BearerAuth
//	@Router		/content/{id} [delete]
func (h *ContentHandler) DeleteContent(c *fiber.Ctx) error {
	contentID := c.Params("id")
	orgID := c.Locals("organization_id").(string)

	role, err := h.contentRole(c, contentID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}
	if err := requireOwner(role); err != nil {
		return apiError(c, fiber.StatusForbidden, "forbidden", "Only the content owner can delete this item")
	}

	if err := h.queries.Content.DeleteContent(contentID, orgID); err != nil {
		h.logger.Error("delete content: %v", err)
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to delete content")
	}

	return apiSuccess(c, fiber.StatusOK, "Content deleted successfully", nil)
}

// ── Status transitions ─────────────────────────────────────────────────

// UpdateContentStatus changes a content item's status (draft/published/archived).
//
//	@Summary	Update content status
//	@Description	Change content status. Owner and co-authors can change status.
//	@Tags		Content
//	@Accept		json
//	@Produce	json
//	@Param		id		path	string	true	"Content ID"
//	@Param		request	body	object	true	"New status"
//	@Success	200	{object}	object	"Status updated"
//	@Failure	403	{object}	object	"Forbidden"
//	@Security	BearerAuth
//	@Router		/content/{id}/status [patch]
func (h *ContentHandler) UpdateContentStatus(c *fiber.Ctx) error {
	contentID := c.Params("id")
	orgID := c.Locals("organization_id").(string)

	role, err := h.contentRole(c, contentID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}
	if err := requireCollaborator(role); err != nil {
		return apiError(c, fiber.StatusForbidden, "forbidden", "You do not have access to this content")
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return apiError(c, fiber.StatusBadRequest, "invalid_request", "Invalid JSON body")
	}

	status := strings.ToLower(req.Status)
	if status != "draft" && status != "published" && status != "archived" {
		return apiError(c, fiber.StatusBadRequest, "validation_error", "Status must be draft, published, or archived")
	}

	if err := h.queries.Content.UpdateContentStatus(contentID, orgID, status); err != nil {
		h.logger.Error("update content status: %v", err)
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to update content status")
	}

	return apiSuccess(c, fiber.StatusOK, "Content status updated to "+status, fiber.Map{"status": status})
}

// ── Collaborator management ────────────────────────────────────────────

// InviteCollaborator adds a co-author to a content item. OWNER ONLY.
//
//	@Summary	Invite co-author
//	@Description	Add a user as co-author on a content item. Only the owner can invite.
//	@Tags		Content
//	@Accept		json
//	@Produce	json
//	@Param		id		path	string	true	"Content ID"
//	@Param		request	body	object	true	"Collaborator details"
//	@Success	201	{object}	object	"Collaborator added"
//	@Failure	403	{object}	object	"Forbidden"
//	@Security	BearerAuth
//	@Router		/content/{id}/collaborators [post]
func (h *ContentHandler) InviteCollaborator(c *fiber.Ctx) error {
	contentID := c.Params("id")

	role, err := h.contentRole(c, contentID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}
	if err := requireOwner(role); err != nil {
		return apiError(c, fiber.StatusForbidden, "forbidden", "Only the content owner can invite collaborators")
	}

	var req struct {
		UserID string `json:"user_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return apiError(c, fiber.StatusBadRequest, "invalid_request", "Invalid JSON body")
	}
	if req.UserID == "" {
		return apiError(c, fiber.StatusBadRequest, "validation_error", "user_id is required")
	}

	invitedBy := c.Locals("user_id").(string)
	if err := h.queries.Content.AddCollaborator(contentID, req.UserID, "co-author", invitedBy); err != nil {
		h.logger.Error("invite collaborator: %v", err)
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to add collaborator")
	}

	return apiSuccess(c, fiber.StatusCreated, "Collaborator invited successfully", fiber.Map{
		"content_id": contentID,
		"user_id":    req.UserID,
		"role":       "co-author",
	})
}

// RemoveCollaborator removes a co-author from a content item. OWNER ONLY.
//
//	@Summary	Remove co-author
//	@Description	Remove a co-author. Only the owner can remove. Owner cannot be removed.
//	@Tags		Content
//	@Produce	json
//	@Param		id		path	string	true	"Content ID"
//	@Param		user_id	path	string	true	"User ID to remove"
//	@Success	200	{object}	object	"Collaborator removed"
//	@Failure	403	{object}	object	"Forbidden"
//	@Security	BearerAuth
//	@Router		/content/{id}/collaborators/{user_id} [delete]
func (h *ContentHandler) RemoveCollaborator(c *fiber.Ctx) error {
	contentID := c.Params("id")

	role, err := h.contentRole(c, contentID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}
	if err := requireOwner(role); err != nil {
		return apiError(c, fiber.StatusForbidden, "forbidden", "Only the content owner can remove collaborators")
	}

	targetUserID := c.Params("user_id")
	if err := h.queries.Content.RemoveCollaborator(contentID, targetUserID); err != nil {
		if strings.Contains(err.Error(), "owner") {
			return apiError(c, fiber.StatusBadRequest, "validation_error", "Cannot remove the content owner")
		}
		return apiError(c, fiber.StatusNotFound, "not_found", "Collaborator not found")
	}

	return apiSuccess(c, fiber.StatusOK, "Collaborator removed successfully", nil)
}

// ListCollaborators lists all collaborators on a content item.
//
//	@Summary	List collaborators
//	@Description	List all collaborators on a content item with their roles.
//	@Tags		Content
//	@Produce	json
//	@Param		id	path	string	true	"Content ID"
//	@Success	200	{object}	object	"Collaborator list"
//	@Security	BearerAuth
//	@Router		/content/{id}/collaborators [get]
func (h *ContentHandler) ListCollaborators(c *fiber.Ctx) error {
	contentID := c.Params("id")

	role, err := h.contentRole(c, contentID)
	if err != nil {
		return apiError(c, fiber.StatusNotFound, "not_found", "Content not found")
	}
	if err := requireCollaborator(role); err != nil {
		return apiError(c, fiber.StatusForbidden, "forbidden", "You do not have access to this content")
	}

	collabs, err := h.queries.Content.ListCollaborators(contentID)
	if err != nil {
		h.logger.Error("list collaborators: %v", err)
		return apiError(c, fiber.StatusInternalServerError, "server_error", "Failed to list collaborators")
	}

	return apiSuccess(c, fiber.StatusOK, "Collaborators retrieved successfully", collabs)
}

// ── Utility ────────────────────────────────────────────────────────────

func slugify(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		if r == ' ' || r == '-' || r == '_' {
			return '-'
		}
		return -1
	}, s)
	// Collapse multiple dashes
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	return strings.Trim(s, "-")
}

func defaultJSON(val, fallback string) string {
	if strings.TrimSpace(val) == "" {
		return fallback
	}
	return val
}
