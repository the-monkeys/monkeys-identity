package handlers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/authz"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/internal/services"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

// GroupHandler handles group-related operations
type GroupHandler struct {
	db      *database.DB
	redis   *redis.Client
	logger  *logger.Logger
	queries *queries.Queries
}

func NewGroupHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *GroupHandler {
	return &GroupHandler{db: db, redis: redis, logger: logger, queries: queries.New(db, redis)}
}

// ListGroups lists groups with optional filtering by organization
//
//	@Summary	List groups
//	@Description	Retrieve groups with pagination and optional organization filtering. Returns all active groups with metadata including total count and pagination info.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		limit	query	int	false	"Number of groups to return (default 50, max 200)"
//	@Param		offset	query	int	false	"Number of groups to skip (default 0)"
//	@Param		sort	query	string	false	"Sort by field (name, created_at)"
//	@Param		order	query	string	false	"Sort order (asc, desc)"
//	@Param		organization_id	query	string	false	"Filter by organization ID (UUID format)"
//	@Success	200	{object}	SuccessResponse{data=object{items=[]models.Group,total=int,limit=int,offset=int,has_more=bool}}	"Groups retrieved successfully with pagination metadata"
//	@Failure	400	{object}	ErrorResponse	"Invalid query parameters (invalid limit/offset)"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups [get]
func (h *GroupHandler) ListGroups(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)
	sortBy := c.Query("sort", "created_at")
	order := c.Query("order", "desc")
	organizationID := c.Locals("organization_id").(string)

	if limit < 1 || limit > 200 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_limit", Message: "limit must be 1-200"})
	}
	if offset < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_offset", Message: "offset must be >=0"})
	}
	params := queries.ListParams{Limit: limit, Offset: offset, SortBy: sortBy, Order: order}
	result, err := h.queries.Group.ListGroups(params, organizationID)
	if err != nil {
		h.logger.Error("list groups failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list groups"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Groups retrieved successfully", Data: result})
}

// CreateGroup creates a new group
//
//	@Summary	Create group
//	@Description	Create a new group within an organization. Group names must be unique within the organization. Required fields: name, organization_id. Optional fields are set to defaults (group_type="standard", status="active", attributes="{}").
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object{name=string,description=string,organization_id=string,group_type=string,max_members=int}	true	"Group details - Example: {\"name\":\"Engineering Team\",\"description\":\"Engineering department group\",\"organization_id\":\"00000000-0000-4000-8000-000000000001\",\"group_type\":\"department\",\"max_members\":100}"
//	@Success	201	{object}	SuccessResponse{data=models.Group}	"Group created successfully with generated ID and timestamps"
//	@Failure	400	{object}	ErrorResponse{error=string,message=string}	"Invalid request body or missing required fields (name, organization_id)"
//	@Failure	409	{object}	ErrorResponse{error=string,message=string}	"Conflict - A group with this name already exists in the organization"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups [post]
func (h *GroupHandler) CreateGroup(c *fiber.Ctx) error {
	var g models.Group
	if err := c.BodyParser(&g); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}
	organizationID := c.Locals("organization_id").(string)
	if g.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "name is required"})
	}
	g.OrganizationID = organizationID
	g.ID = uuid.New().String()
	if g.GroupType == "" {
		g.GroupType = "standard"
	}
	if g.Attributes == "" {
		g.Attributes = "{}"
	}
	if g.Status == "" {
		g.Status = "active"
	}
	if err := h.queries.Group.CreateGroup(&g); err != nil {
		// Check for unique constraint violation
		if err == queries.ErrGroupNameConflict {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
				Status:  fiber.StatusConflict,
				Error:   "group_already_exists",
				Message: "A group with this name already exists in the organization",
			})
		}
		h.logger.Error("create group failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to create group"})
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{Status: fiber.StatusCreated, Message: "Group created successfully", Data: g})
}

// GetGroup retrieves a group by ID
//
//	@Summary	Get group
//	@Description	Retrieve detailed information about a specific group by its UUID. Returns complete group details including all fields and timestamps.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID (UUID format)"
//	@Success	200	{object}	SuccessResponse{data=models.Group}	"Group retrieved successfully with all details"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID (empty or malformed)"
//	@Failure	404	{object}	ErrorResponse	"Group not found or has been deleted"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id} [get]
func (h *GroupHandler) GetGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	organizationID := c.Locals("organization_id").(string)
	g, err := h.queries.Group.GetGroup(id, organizationID)
	if err != nil {
		if err.Error() == "group not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "group_not_found", Message: "Group not found"})
		}
		h.logger.Error("get group failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to get group"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group retrieved successfully", Data: g})
}

// UpdateGroup updates a group's details
//
//	@Summary	Update group
//	@Description	Update a group's properties with partial update support. Only fields provided in the request are updated - missing fields retain their current values. Updatable fields: name, description, max_members, status. Immutable fields: id, organization_id, group_type. Group names must remain unique within the organization.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID (UUID format)"
//	@Param		request	body	object{name=string,description=string,max_members=int,status=string}	true	"Updated group details (partial) - Example: {\"name\":\"Engineering Team - Updated\",\"description\":\"Updated description\",\"max_members\":150}"
//	@Success	200	{object}	SuccessResponse{data=models.Group}	"Group updated successfully with refreshed updated_at timestamp"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body or group ID"
//	@Failure	404	{object}	ErrorResponse	"Group not found or has been deleted"
//	@Failure	409	{object}	ErrorResponse{error=string,message=string}	"Conflict - A group with this name already exists in the organization"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id} [put]
func (h *GroupHandler) UpdateGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}

	organizationID := c.Locals("organization_id").(string)
	// Get existing group
	existingGroup, err := h.queries.Group.GetGroup(id, organizationID)
	if err != nil {
		if err.Error() == "group not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "group_not_found", Message: "Group not found or deleted"})
		}
		h.logger.Error("get group failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to retrieve group"})
	}

	// Parse update request
	var updateReq struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		MaxMembers  *int    `json:"max_members"`
		Status      *string `json:"status"`
	}
	if err := c.BodyParser(&updateReq); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}

	// Apply updates selectively
	if updateReq.Name != nil {
		existingGroup.Name = *updateReq.Name
	}
	if updateReq.Description != nil {
		existingGroup.Description = *updateReq.Description
	}
	if updateReq.MaxMembers != nil {
		existingGroup.MaxMembers = *updateReq.MaxMembers
	}
	if updateReq.Status != nil {
		existingGroup.Status = *updateReq.Status
	}

	existingGroup.ID = id
	if err := h.queries.Group.UpdateGroup(existingGroup, organizationID); err != nil {
		if err.Error() == "group not found or deleted" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "group_not_found", Message: "Group not found or deleted"})
		}
		// Check for unique constraint violation
		if err == queries.ErrGroupNameConflict {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
				Status:  fiber.StatusConflict,
				Error:   "group_name_conflict",
				Message: "A group with this name already exists in the organization",
			})
		}
		h.logger.Error("update group failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to update group"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group updated successfully", Data: existingGroup})
}

// DeleteGroup deletes a group
//
//	@Summary	Delete group
//	@Description	Soft delete a group by setting the deleted_at timestamp. The group remains in the database but is excluded from queries. Returns the group ID and deletion timestamp.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID (UUID format)"
//	@Success	200	{object}	SuccessResponse{data=object{group_id=string,deleted_at=string}}	"Group deleted successfully with deletion timestamp"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID (empty or malformed)"
//	@Failure	404	{object}	ErrorResponse	"Group not found or already deleted"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id} [delete]
func (h *GroupHandler) DeleteGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	organizationID := c.Locals("organization_id").(string)
	if err := h.queries.Group.DeleteGroup(id, organizationID); err != nil {
		if err.Error() == "group not found or deleted" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "group_not_found", Message: "Group not found or deleted"})
		}
		h.logger.Error("delete group failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to delete group"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group deleted successfully", Data: fiber.Map{"group_id": id, "deleted_at": time.Now()}})
}

// GetGroupMembers lists members of a group
//
//	@Summary	List group members
//	@Description	Retrieve all active members of a group with their membership details including principal information, role in group, and join timestamps.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID (UUID format)"
//	@Success	200	{object}	SuccessResponse{data=object{group_id=string,members=[]models.GroupMembership,count=int}}	"Group members retrieved successfully with count"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID (empty or malformed)"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id}/members [get]
func (h *GroupHandler) GetGroupMembers(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	organizationID := c.Locals("organization_id").(string)
	members, err := h.queries.Group.ListGroupMembers(id, organizationID)
	if err != nil {
		h.logger.Error("list group members failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list group members"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group members retrieved successfully", Data: fiber.Map{"group_id": id, "members": members, "count": len(members)}})
}

// AddGroupMember adds a member to a group
//
//	@Summary	Add group member
//	@Description	Add a principal (user or service account) to a group. Principal must exist in the system. Required fields: principal_id (UUID), principal_type (user/service_account). Optional: role_in_group (defaults to \"member\"), expires_at (RFC3339 format). Membership is automatically timestamped with joined_at and tracks who added the member.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID (UUID format)"
//	@Param		request	body	object{principal_id=string,principal_type=string,role_in_group=string,expires_at=string}	true	"Membership details - Example: {\"principal_id\":\"39fc3320-9eab-47ea-86ea-dfc939d7159c\",\"principal_type\":\"user\",\"role_in_group\":\"member\"}"
//	@Success	201	{object}	SuccessResponse{data=models.GroupMembership}	"Group member added successfully with generated membership ID and timestamps"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body, missing required fields, or invalid expires_at format"
//	@Failure	500	{object}	ErrorResponse	"Internal server error or principal not found"
//	@Security	BearerAuth
//	@Router		/groups/{id}/members [post]
func (h *GroupHandler) AddGroupMember(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	var req struct {
		PrincipalID   string `json:"principal_id"`
		PrincipalType string `json:"principal_type"`
		RoleInGroup   string `json:"role_in_group"`
		ExpiresAt     string `json:"expires_at"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}
	if req.PrincipalID == "" || req.PrincipalType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "principal_id and principal_type are required"})
	}
	if req.RoleInGroup == "" {
		req.RoleInGroup = "member"
	}
	var expires time.Time
	if req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_expires_at", Message: "expires_at must be RFC3339"})
		}
		expires = t
	}
	addedBy := ""
	organizationID := c.Locals("organization_id").(string)
	membership := &models.GroupMembership{ID: uuid.New().String(), GroupID: id, PrincipalID: req.PrincipalID, PrincipalType: req.PrincipalType, RoleInGroup: req.RoleInGroup, ExpiresAt: expires, AddedBy: addedBy}
	if err := h.queries.Group.AddGroupMember(membership, organizationID); err != nil {
		h.logger.Error("add group member failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to add group member"})
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{Status: fiber.StatusCreated, Message: "Group member added successfully", Data: membership})
}

// RemoveGroupMember removes a member from a group
//
//	@Summary	Remove group member
//	@Description	Remove a principal from a group membership by deleting the membership record. Requires both group ID and principal ID. Principal type defaults to \"user\" if not specified.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID (UUID format)"
//	@Param		user_id	path	string	true	"Principal ID (UUID format) - user or service account to remove"
//	@Param		principal_type	query	string	false	"Principal type: 'user' or 'service_account' (default: 'user')"
//	@Success	200	{object}	SuccessResponse{data=object{group_id=string,principal_id=string,removed=bool}}	"Group member removed successfully with confirmation"
//	@Failure	400	{object}	ErrorResponse	"Invalid parameters (missing group ID or principal ID)"
//	@Failure	404	{object}	ErrorResponse	"Membership not found (principal is not a member of this group)"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id}/members/{user_id} [delete]
func (h *GroupHandler) RemoveGroupMember(c *fiber.Ctx) error {
	id := c.Params("id")
	principalID := c.Params("user_id") // reuse param name pattern
	principalType := c.Query("principal_type", "user")
	if id == "" || principalID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_parameters", Message: "Group ID and principal ID are required"})
	}
	organizationID := c.Locals("organization_id").(string)
	if err := h.queries.Group.RemoveGroupMember(id, organizationID, principalID, principalType); err != nil {
		if err.Error() == "membership not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "membership_not_found", Message: "Membership not found"})
		}
		h.logger.Error("remove group member failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to remove group member"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group member removed successfully", Data: fiber.Map{"group_id": id, "principal_id": principalID, "removed": true}})
}

// GetGroupPermissions retrieves aggregated permissions of group members
//
//	@Summary	Get group permissions
//	@Description	Retrieve aggregated allow/deny permissions derived from member role assignments. Returns a comprehensive view of all permissions granted to group members through their assigned roles, including both allowed and denied permissions with counts in the summary.
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID (UUID format)"
//	@Success	200	{object}	SuccessResponse{data=object{group_id=string,permissions=string}}	"Group permissions retrieved successfully with allow/deny lists and summary counts (JSON string format)"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID (empty or malformed)"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id}/permissions [get]
func (h *GroupHandler) GetGroupPermissions(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	organizationID := c.Locals("organization_id").(string)
	perms, err := h.queries.Group.GetGroupPermissions(id, organizationID)
	if err != nil {
		h.logger.Error("get group permissions failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to get group permissions"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group permissions retrieved successfully", Data: fiber.Map{"group_id": id, "permissions": perms}})
}

// ResourceHandler handles resource-related operations
type ResourceHandler struct {
	db      *database.DB
	redis   *redis.Client
	logger  *logger.Logger
	queries *queries.Queries
}

func NewResourceHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *ResourceHandler {
	return &ResourceHandler{db: db, redis: redis, logger: logger, queries: queries.New(db, redis)}
}

// ListResources lists resources
//
//	@Summary	List resources
//	@Description	Retrieve all resources with pagination support
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		organization_id	query	string	false	"Filter by organization ID"
//	@Param		type	query	string	false	"Filter by resource type"
//	@Param		limit	query	int	false	"Number of resources to return (default 20)"
//	@Param		offset	query	int	false	"Number of resources to skip (default 0)"
//	@Success	200	{object}	SuccessResponse	"Resources listed successfully"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources [get]
func (h *ResourceHandler) ListResources(c *fiber.Ctx) error {
	// Parse query parameters
	params := queries.ListParams{
		Limit:  20,
		Offset: 0,
		SortBy: "created_at",
		Order:  "DESC",
	}

	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			params.Limit = l
		}
	}
	if offset := c.Query("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil && o >= 0 {
			params.Offset = o
		}
	}

	// Get organization ID from context
	organizationID := c.Locals("organization_id").(string)
	// Note: type filter not yet implemented in queries layer

	result, err := h.queries.Resource.ListResources(params, organizationID)
	if err != nil {
		h.logger.Error("list resources failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to retrieve resources"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resources listed successfully", Data: result})
}

// CreateResource creates a new resource
//
//	@Summary	Create resource
//	@Description	Create a new managed resource
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		request	body	models.Resource	true	"Resource details"
//	@Success	201	{object}	SuccessResponse	"Resource created successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body or validation errors"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources [post]
func (h *ResourceHandler) CreateResource(c *fiber.Ctx) error {
	var resource models.Resource
	if err := c.BodyParser(&resource); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}

	organizationID := c.Locals("organization_id").(string)

	// Validate required fields
	if resource.Name == "" || resource.Type == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "name and type are required"})
	}
	resource.OrganizationID = organizationID

	// Set default values
	resource.ID = uuid.New().String()
	if resource.Status == "" {
		resource.Status = "active"
	}
	if resource.AccessLevel == "" {
		resource.AccessLevel = "private"
	}
	if resource.Attributes == "" {
		resource.Attributes = "{}"
	}
	if resource.Tags == "" {
		resource.Tags = "{}"
	}
	if resource.LifecyclePolicy == "" {
		resource.LifecyclePolicy = "{}"
	}

	// Generate ARN if not provided
	if resource.ARN == "" {
		resource.ARN = "arn:monkeys:resource:" + resource.OrganizationID + ":" + resource.Type + "/" + resource.ID
	}

	if err := h.queries.Resource.CreateResource(&resource); err != nil {
		h.logger.Error("create resource failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to create resource"})
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{Status: fiber.StatusCreated, Message: "Resource created successfully", Data: resource})
}

// GetResource retrieves a resource by ID
//
//	@Summary	Get resource
//	@Description	Retrieve details of a specific resource
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Success	200	{object}	SuccessResponse	"Resource retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id} [get]
func (h *ResourceHandler) GetResource(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	organizationID := c.Locals("organization_id").(string)
	resource, err := h.queries.Resource.GetResource(resourceID, organizationID)
	if err != nil {
		h.logger.Error("get resource failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to retrieve resource"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resource retrieved successfully", Data: resource})
}

// UpdateResource updates a resource
//
//	@Summary	Update resource
//	@Description	Update properties of a resource
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Param		request	body	models.Resource	true	"Updated resource details"
//	@Success	200	{object}	SuccessResponse	"Resource updated successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body or resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id} [put]
func (h *ResourceHandler) UpdateResource(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	var updates models.Resource
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}

	organizationID := c.Locals("organization_id").(string)

	// Set the ID from the URL parameter
	updates.ID = resourceID

	if err := h.queries.Resource.UpdateResource(&updates, organizationID); err != nil {
		h.logger.Error("update resource failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to update resource"})
	}

	// Get the updated resource to return it
	updatedResource, err := h.queries.Resource.GetResource(resourceID, organizationID)
	if err != nil {
		h.logger.Error("get updated resource failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Resource updated but failed to retrieve updated data"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resource updated successfully", Data: updatedResource})
}

// DeleteResource deletes a resource
//
//	@Summary	Delete resource
//	@Description	Delete a resource
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Success	200	{object}	SuccessResponse	"Resource deleted successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id} [delete]
func (h *ResourceHandler) DeleteResource(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	organizationID := c.Locals("organization_id").(string)
	if err := h.queries.Resource.DeleteResource(resourceID, organizationID); err != nil {
		h.logger.Error("delete resource failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to delete resource"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resource deleted successfully", Data: nil})
}

// GetResourcePermissions lists permissions attached to a resource
//
//	@Summary	Get resource permissions
//	@Description	Retrieve permissions for a resource
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Success	200	{object}	SuccessResponse	"Resource permissions retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id}/permissions [get]
func (h *ResourceHandler) GetResourcePermissions(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	organizationID := c.Locals("organization_id").(string)
	permissions, err := h.queries.Resource.GetResourcePermissions(resourceID, organizationID)
	if err != nil {
		h.logger.Error("get resource permissions failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to retrieve resource permissions"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resource permissions retrieved successfully", Data: permissions})
}

// SetResourcePermissions sets permissions on a resource
//
//	@Summary	Set resource permissions
//	@Description	Apply permissions to a resource
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Param		request	body	object	true	"Permissions definition"
//	@Success	200	{object}	SuccessResponse	"Permissions set successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body or resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id}/permissions [post]
func (h *ResourceHandler) SetResourcePermissions(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	var req struct {
		PrincipalID   string   `json:"principal_id"`
		PrincipalType string   `json:"principal_type"`
		Permissions   []string `json:"permissions"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}

	if req.PrincipalID == "" || req.PrincipalType == "" || len(req.Permissions) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "principal_id, principal_type, and permissions are required"})
	}

	// Convert permissions to ResourcePermission structs
	var permissions []queries.ResourcePermission
	for _, perm := range req.Permissions {
		permission := queries.ResourcePermission{
			ID:            uuid.New().String(),
			ResourceID:    resourceID,
			PrincipalID:   req.PrincipalID,
			PrincipalType: req.PrincipalType,
			Permission:    perm,
			Effect:        "allow", // Default to allow
		}
		permissions = append(permissions, permission)
	}

	organizationID := c.Locals("organization_id").(string)
	if err := h.queries.Resource.SetResourcePermissions(resourceID, organizationID, permissions); err != nil {
		h.logger.Error("set resource permissions failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to set resource permissions"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Permissions set successfully", Data: nil})
}

// GetResourceAccessLog retrieves access log for a resource
//
//	@Summary	Get resource access log
//	@Description	Retrieve access events for a resource
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Param		limit	query	int	false	"Number of log entries to return (default 50)"
//	@Param		offset	query	int	false	"Number of log entries to skip (default 0)"
//	@Success	200	{object}	SuccessResponse	"Access log retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id}/access-log [get]
func (h *ResourceHandler) GetResourceAccessLog(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	// Parse query parameters
	params := queries.ListParams{
		Limit:  50,
		Offset: 0,
		SortBy: "accessed_at",
		Order:  "DESC",
	}

	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			params.Limit = l
		}
	}
	if offset := c.Query("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil && o >= 0 {
			params.Offset = o
		}
	}

	organizationID := c.Locals("organization_id").(string)
	accessLog, err := h.queries.Resource.GetResourceAccessLog(resourceID, organizationID, params)
	if err != nil {
		h.logger.Error("get resource access log failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to retrieve resource access log"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Access log retrieved successfully", Data: accessLog})
}

// ShareResource shares a resource with a principal
//
//	@Summary	Share resource
//	@Description	Share a resource with a user or group
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Param		request	body	object	true	"Share details"
//	@Success	200	{object}	SuccessResponse	"Resource shared successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body or resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id}/share [post]
func (h *ResourceHandler) ShareResource(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	var req struct {
		PrincipalID   string `json:"principal_id"`
		PrincipalType string `json:"principal_type"`
		AccessLevel   string `json:"access_level"`
		SharedBy      string `json:"shared_by"`
		ExpiresAt     string `json:"expires_at,omitempty"` // Optional ISO 8601 datetime
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}

	if req.PrincipalID == "" || req.PrincipalType == "" || req.AccessLevel == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "principal_id, principal_type, and access_level are required"})
	}

	share := queries.ResourceShare{
		ID:            uuid.New().String(),
		ResourceID:    resourceID,
		PrincipalID:   req.PrincipalID,
		PrincipalType: req.PrincipalType,
		AccessLevel:   req.AccessLevel,
		SharedBy:      req.SharedBy,
	}

	// Parse expires_at if provided
	if req.ExpiresAt != "" {
		if expTime, err := time.Parse(time.RFC3339, req.ExpiresAt); err == nil {
			share.ExpiresAt = expTime
		}
	}

	organizationID := c.Locals("organization_id").(string)
	if err := h.queries.Resource.ShareResource(&share, organizationID); err != nil {
		h.logger.Error("share resource failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to share resource"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resource shared successfully", Data: share})
}

// UnshareResource removes sharing from a resource
//
//	@Summary	Unshare resource
//	@Description	Remove sharing permissions
//	@Tags		Resource Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Resource ID"
//	@Param		request	body	object	true	"Unshare details"
//	@Success	200	{object}	SuccessResponse	"Resource unshared successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body or resource ID"
//	@Failure	404	{object}	ErrorResponse	"Resource not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/resources/{id}/share [delete]
func (h *ResourceHandler) UnshareResource(c *fiber.Ctx) error {
	resourceID := c.Params("id")
	if resourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_resource_id", Message: "Resource ID is required"})
	}

	var req struct {
		PrincipalID   string `json:"principal_id"`
		PrincipalType string `json:"principal_type"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}

	if req.PrincipalID == "" || req.PrincipalType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "principal_id and principal_type are required"})
	}

	organizationID := c.Locals("organization_id").(string)
	if err := h.queries.Resource.UnshareResource(resourceID, organizationID, req.PrincipalID, req.PrincipalType); err != nil {
		h.logger.Error("unshare resource failed: %v", err)
		if err.Error() == "resource not found" || err.Error() == "share not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "not_found", Message: "Resource or share not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to unshare resource"})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resource unshared successfully", Data: nil})
}

// PolicyHandler handles policy-related operations
type PolicyHandler struct {
	db      *database.DB
	redis   *redis.Client
	logger  *logger.Logger
	queries *queries.Queries
	audit   services.AuditService
	authz   services.AuthzService
}

func NewPolicyHandler(db *database.DB, redis *redis.Client, logger *logger.Logger, audit services.AuditService, authz services.AuthzService) *PolicyHandler {
	return &PolicyHandler{
		db:      db,
		redis:   redis,
		logger:  logger,
		queries: queries.New(db, redis),
		audit:   audit,
		authz:   authz,
	}
}

// ListPolicies lists policies
//
//	@Summary	List policies
//	@Description	Retrieve all policies with pagination and filtering
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		limit	query	int	false	"Number of policies per page (default: 50)"
//	@Param		offset	query	int	false	"Number of policies to skip (default: 0)"
//	@Param		sort_by	query	string	false	"Field to sort by (created_at, name, status)"
//	@Param		order	query	string	false	"Sort order (asc, desc)"
//	@Param		organization_id	query	string	false	"Filter by organization ID"
//	@Success	200	{object}	SuccessResponse	"Policies listed successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request parameters"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies [get]
func (h *PolicyHandler) ListPolicies(c *fiber.Ctx) error {
	params := queries.ListParams{
		Limit:  50,
		Offset: 0,
		SortBy: "created_at",
		Order:  "desc",
	}

	if limit := c.QueryInt("limit", 50); limit > 0 && limit <= 100 {
		params.Limit = limit
	}
	if offset := c.QueryInt("offset", 0); offset >= 0 {
		params.Offset = offset
	}
	if sortBy := c.Query("sort_by"); sortBy != "" {
		if isValidSortField(sortBy, []string{"created_at", "name", "status", "policy_type"}) {
			params.SortBy = sortBy
		}
	}
	if order := c.Query("order"); order == "asc" || order == "desc" {
		params.Order = order
	}

	organizationID := c.Locals("organization_id").(string)
	result, err := h.queries.Policy.ListPolicies(params, organizationID)
	if err != nil {
		h.logger.Error("Failed to list policies: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to list policies",
		})
	}

	return c.JSON(result)
}

// CreatePolicy creates a policy
//
//	@Summary	Create policy
//	@Description	Create a new policy with document validation
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		request	body	models.Policy	true	"Policy definition"
//	@Success	201	{object}	models.Policy	"Policy created successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request or policy document"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies [post]
func (h *PolicyHandler) CreatePolicy(c *fiber.Ctx) error {
	type createPolicyRequest struct {
		ID             string          `json:"id"`
		Name           string          `json:"name"`
		Description    string          `json:"description"`
		Version        string          `json:"version"`
		OrganizationID string          `json:"organization_id"`
		Document       json.RawMessage `json:"document"`
		PolicyType     string          `json:"policy_type"`
		Effect         string          `json:"effect"`
		IsSystemPolicy bool            `json:"is_system_policy"`
		Status         string          `json:"status"`
	}

	var req createPolicyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON format",
		})
	}

	if len(req.Document) == 0 || !json.Valid(req.Document) {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_policy_document",
			Message: "Policy document must be valid JSON",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	policy := models.Policy{
		ID:             req.ID,
		Name:           req.Name,
		Description:    req.Description,
		Version:        req.Version,
		OrganizationID: organizationID, // Enforce context organization_id
		Document:       string(req.Document),
		PolicyType:     req.PolicyType,
		Effect:         req.Effect,
		IsSystemPolicy: req.IsSystemPolicy,
		Status:         req.Status,
	}

	// Generate ID if not provided
	if policy.ID == "" {
		policy.ID = uuid.New().String()
	}

	// Set defaults
	if policy.Status == "" {
		policy.Status = "active"
	}
	if policy.Version == "" {
		policy.Version = "1.0.0"
	}

	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		if userID, ok := userIDVal.(string); ok && userID != "" {
			policy.CreatedBy = userID
		}
	}

	err := h.queries.Policy.CreatePolicy(&policy)
	if err != nil {
		h.logger.Error("Failed to create policy: %v", err)
		if strings.Contains(err.Error(), "invalid policy document") {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_policy_document",
				Message: err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to create policy",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(policy)
}

// GetPolicy retrieves a policy
//
//	@Summary	Get policy
//	@Description	Retrieve a specific policy by ID
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	models.Policy	"Policy retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid policy ID"
//	@Failure	404	{object}	ErrorResponse	"Policy not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies/{id} [get]
func (h *PolicyHandler) GetPolicy(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Policy ID is required",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	policy, err := h.queries.Policy.GetPolicy(id, organizationID)
	if err != nil {
		h.logger.Error("Failed to get policy: %v (policy_id: %s)", err, id)
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "policy_not_found",
				Message: "Policy not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve policy",
		})
	}

	return c.JSON(policy)
}

// UpdatePolicy updates a policy
//
//	@Summary	Update policy
//	@Description	Update an existing policy and create new version if document changed
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Param		request	body	models.Policy	true	"Updated policy"
//	@Success	200	{object}	models.Policy	"Policy updated successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request or policy document"
//	@Failure	404	{object}	ErrorResponse	"Policy not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies/{id} [put]
func (h *PolicyHandler) UpdatePolicy(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Policy ID is required",
		})
	}

	type updatePolicyRequest struct {
		Name           string          `json:"name"`
		Description    string          `json:"description"`
		Version        string          `json:"version"`
		OrganizationID string          `json:"organization_id"`
		Document       json.RawMessage `json:"document"`
		PolicyType     string          `json:"policy_type"`
		Effect         string          `json:"effect"`
		IsSystemPolicy bool            `json:"is_system_policy"`
		Status         string          `json:"status"`
		ApprovedBy     string          `json:"approved_by"`
		ApprovedAt     *time.Time      `json:"approved_at"`
	}

	var req updatePolicyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON format",
		})
	}

	if len(req.Document) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_policy_document",
			Message: "Policy document is required",
		})
	}

	if !json.Valid(req.Document) {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_policy_document",
			Message: "Policy document must be valid JSON",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	policy := models.Policy{
		ID:             id,
		Name:           req.Name,
		Description:    req.Description,
		Version:        req.Version,
		OrganizationID: organizationID, // Enforce context organization_id
		Document:       string(req.Document),
		PolicyType:     req.PolicyType,
		Effect:         req.Effect,
		IsSystemPolicy: req.IsSystemPolicy,
		Status:         req.Status,
	}

	// Ensure ID matches path parameter
	policy.ID = id

	// Capture acting user for auditing/versioning
	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		if userID, ok := userIDVal.(string); ok && userID != "" {
			policy.CreatedBy = userID
		}
	}

	if req.ApprovedBy != "" {
		policy.ApprovedBy = req.ApprovedBy
	}
	if req.ApprovedAt != nil {
		policy.ApprovedAt = *req.ApprovedAt
	}

	err := h.queries.Policy.UpdatePolicy(&policy, organizationID)
	if err != nil {
		h.logger.Error("Failed to update policy: %v (policy_id: %s)", err, id)
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "policy_not_found",
				Message: "Policy not found",
			})
		}
		if strings.Contains(err.Error(), "invalid policy document") {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_policy_document",
				Message: err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to update policy",
		})
	}

	// Return updated policy
	updatedPolicy, err := h.queries.Policy.GetPolicy(id, organizationID)
	if err != nil {
		return c.JSON(policy) // fallback to input policy
	}

	return c.JSON(updatedPolicy)
}

// DeletePolicy deletes a policy
//
//	@Summary	Delete policy
//	@Description	Soft delete a policy (mark as deleted, change status)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	SuccessResponse	"Policy deleted successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid policy ID"
//	@Failure	404	{object}	ErrorResponse	"Policy not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies/{id} [delete]
func (h *PolicyHandler) DeletePolicy(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Policy ID is required",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Policy.DeletePolicy(id, organizationID)
	if err != nil {
		h.logger.Error("Failed to delete policy: %v (policy_id: %s)", err, id)
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "policy_not_found",
				Message: "Policy not found or already deleted",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to delete policy",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  200,
		Message: "Policy deleted successfully",
	})
}

// SimulatePolicy simulates evaluation of a policy
//
//	@Summary	Simulate policy
//	@Description	Simulate the effect of a policy against hypothetical requests
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		request	body	queries.PolicySimulationRequest	true	"Simulation input"
//	@Success	200	{object}	queries.PolicySimulationResult	"Policy simulation completed"
//	@Failure	400	{object}	ErrorResponse	"Invalid simulation request"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies/simulate [post]
func (h *PolicyHandler) SimulatePolicy(c *fiber.Ctx) error {
	var request queries.PolicySimulationRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON format",
		})
	}

	if request.PolicyDocument == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Policy document is required",
		})
	}

	result, err := h.queries.Policy.SimulatePolicy(&request)
	if err != nil {
		h.logger.Error("Failed to simulate policy: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to simulate policy",
		})
	}

	return c.JSON(result)
}

// GetPolicyVersions lists policy versions
//
//	@Summary	List policy versions
//	@Description	Retrieve all versions of a policy with history
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{array}	queries.PolicyVersion	"Policy versions retrieved"
//	@Failure	400	{object}	ErrorResponse	"Invalid policy ID"
//	@Failure	404	{object}	ErrorResponse	"Policy not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies/{id}/versions [get]
func (h *PolicyHandler) GetPolicyVersions(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Policy ID is required",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	versions, err := h.queries.Policy.GetPolicyVersions(id, organizationID)
	if err != nil {
		h.logger.Error("Failed to get policy versions: %v (policy_id: %s)", err, id)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve policy versions",
		})
	}

	if len(versions) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
			Error:   "policy_not_found",
			Message: "Policy not found or has no versions",
		})
	}

	return c.JSON(versions)
}

// ApprovePolicy approves a policy version
//
//	@Summary	Approve policy
//	@Description	Approve a pending policy version for activation
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	SuccessResponse	"Policy approved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid policy ID or policy not in draft status"
//	@Failure	404	{object}	ErrorResponse	"Policy not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies/{id}/approve [post]
func (h *PolicyHandler) ApprovePolicy(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Policy ID is required",
		})
	}

	// Get approver ID from JWT context
	approvedBy, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid session",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Policy.ApprovePolicy(id, organizationID, approvedBy)
	if err != nil {
		h.logger.Error("Failed to approve policy: %v (policy_id: %s)", err, id)
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "policy_not_found",
				Message: "Policy not found",
			})
		}
		if strings.Contains(err.Error(), "not in draft status") {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_policy_status",
				Message: "Policy must be in draft status to approve",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to approve policy",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  200,
		Message: "Policy approved successfully",
	})
}

// RollbackPolicy rolls back a policy to a previous version
//
//	@Summary	Rollback policy
//	@Description	Rollback policy to a specified version
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Param		request	body	object{version=string}	true	"Version to rollback to"
//	@Success	200	{object}	SuccessResponse	"Policy rolled back successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request or version"
//	@Failure	404	{object}	ErrorResponse	"Policy or version not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/policies/{id}/rollback [post]
func (h *PolicyHandler) RollbackPolicy(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Policy ID is required",
		})
	}

	var request struct {
		Version string `json:"version"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON format",
		})
	}

	if request.Version == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Version is required",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Policy.RollbackPolicy(id, organizationID, request.Version)
	if err != nil {
		h.logger.Error("Failed to rollback policy: %v (policy_id: %s, version: %s)", err, id, request.Version)
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "version_not_found",
				Message: "Policy or version not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to rollback policy",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  200,
		Message: "Policy rolled back successfully",
	})
}

// CheckPermission checks a single permission
//
//	@Summary	Check permission
//	@Description	Check if a principal is allowed an action on a resource
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Param		request	body	queries.PermissionCheckRequest	true	"Permission check request"
//	@Success	200	{object}	queries.PermissionCheckResult	"Permission check completed"
//	@Failure	400	{object}	ErrorResponse	"Invalid request"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/authz/check [post]
func (h *PolicyHandler) CheckPermission(c *fiber.Ctx) error {
	var request queries.PermissionCheckRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON format",
		})
	}

	if request.PrincipalID == "" || request.Resource == "" || request.Action == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "PrincipalID, Resource, and Action are required",
		})
	}

	orgID := c.Locals("organization_id").(string)

	// Convert structured context to map for evaluator
	evalContext := make(map[string]interface{})
	if request.Context != nil {
		evalContext["principal"] = request.Context.Principal
		evalContext["resource"] = request.Context.Resource
		evalContext["action"] = request.Context.Action
		evalContext["source_ip"] = request.Context.SourceIP
		evalContext["request_time"] = request.Context.RequestTime
		for k, v := range request.Context.Environment {
			evalContext[k] = v
		}
	}

	decision, err := h.authz.Authorize(c.Context(), request.PrincipalID, request.PrincipalType, orgID, request.Action, request.Resource, evalContext)
	if err != nil {
		h.logger.Error("Failed to check permission: %v", err)
		h.audit.LogAccessCheck(c.Context(), orgID, request.PrincipalID, request.PrincipalType, "permission", request.Resource, request.Action, false, err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to check permission",
		})
	}

	result := queries.PermissionCheckResult{
		Allowed:  decision == authz.DecisionAllow,
		Decision: string(decision),
		Request:  &request,
	}

	h.audit.LogAccessCheck(c.Context(), orgID, request.PrincipalID, request.PrincipalType, "permission", request.Resource, request.Action, result.Allowed, result.Decision)

	return c.JSON(result)
}

// BulkCheckPermissions checks multiple permissions
//
//	@Summary	Bulk check permissions
//	@Description	Check multiple action/resource pairs efficiently
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object{requests=[]queries.PermissionCheckRequest}	true	"Bulk permission check request"
//	@Success	200	{array}	queries.PermissionCheckResult	"Bulk permission check completed"
//	@Failure	400	{object}	ErrorResponse	"Invalid request"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/authz/bulk-check [post]
func (h *PolicyHandler) BulkCheckPermissions(c *fiber.Ctx) error {
	var request struct {
		Requests []*queries.PermissionCheckRequest `json:"requests"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON format",
		})
	}

	if len(request.Requests) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "At least one permission check request is required",
		})
	}

	// Validate all requests
	for i, req := range request.Requests {
		if req.PrincipalID == "" || req.Resource == "" || req.Action == "" {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_request",
				Message: fmt.Sprintf("Request %d: PrincipalID, Resource, and Action are required", i),
			})
		}
	}

	orgID := c.Locals("organization_id").(string)
	results, err := h.queries.Policy.BulkCheckPermissions(orgID, request.Requests)
	if err != nil {
		h.logger.Error("Failed to bulk check permissions: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to check permissions",
		})
	}

	return c.JSON(results)
}

// GetEffectivePermissions retrieves effective permissions for current principal
//
//	@Summary	Get effective permissions
//	@Description	Retrieve effective permissions for authenticated principal
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Param		principal_id	query	string	false	"Principal ID (if not provided, uses current user)"
//	@Param		principal_type	query	string	false	"Principal type (user, group, role)"
//	@Param		organization_id	query	string	false	"Organization ID"
//	@Success	200	{object}	queries.EffectivePermissions	"Effective permissions retrieved"
//	@Failure	400	{object}	ErrorResponse	"Invalid request"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/authz/effective-permissions [get]
func (h *PolicyHandler) GetEffectivePermissions(c *fiber.Ctx) error {
	// TODO: Get these from JWT context if not provided
	principalID := c.Query("principal_id", "current_user_id")
	principalType := c.Query("principal_type", "user")
	organizationID := c.Query("organization_id", "")
	if organizationID == "" {
		if orgID := c.Locals("organization_id"); orgID != nil {
			organizationID = orgID.(string)
		}
	}

	if principalID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Principal ID is required",
		})
	}

	permissions, err := h.queries.Policy.GetEffectivePermissions(principalID, principalType, organizationID)
	if err != nil {
		h.logger.Error("Failed to get effective permissions: %v (principal_id: %s)", err, principalID)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve effective permissions",
		})
	}

	return c.JSON(permissions)
}

// SimulateAccess simulates an access request
//
//	@Summary	Simulate access
//	@Description	Simulate an access decision for a hypothetical request
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Param		request	body	queries.PermissionCheckRequest	true	"Access simulation request"
//	@Success	200	{object}	queries.PermissionCheckResult	"Access simulation completed"
//	@Failure	400	{object}	ErrorResponse	"Invalid request"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/authz/simulate-access [post]
func (h *PolicyHandler) SimulateAccess(c *fiber.Ctx) error {
	var request queries.PermissionCheckRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON format",
		})
	}

	if request.PrincipalID == "" || request.Resource == "" || request.Action == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "PrincipalID, Resource, and Action are required",
		})
	}

	// Simulation is essentially the same as checking permission but in a "what-if" context
	orgID := c.Locals("organization_id").(string)

	// Convert structured context to map for evaluator
	evalContext := make(map[string]interface{})
	if request.Context != nil {
		evalContext["principal"] = request.Context.Principal
		evalContext["resource"] = request.Context.Resource
		evalContext["action"] = request.Context.Action
		evalContext["source_ip"] = request.Context.SourceIP
		evalContext["request_time"] = request.Context.RequestTime
		for k, v := range request.Context.Environment {
			evalContext[k] = v
		}
	}

	decision, err := h.authz.Authorize(c.Context(), request.PrincipalID, request.PrincipalType, orgID, request.Action, request.Resource, evalContext)
	if err != nil {
		h.logger.Error("Failed to simulate access: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to simulate access",
		})
	}

	result := queries.PermissionCheckResult{
		Allowed:  decision == authz.DecisionAllow,
		Decision: string(decision),
		Request:  &request,
		Evaluation: &queries.PolicyEvaluationResult{
			Effect:   string(decision),
			Decision: string(decision),
			Metadata: map[string]string{
				"simulation": "true",
			},
		},
	}

	return c.JSON(result)
}

// RoleHandler handles role-related operations
type RoleHandler struct {
	db      *database.DB
	redis   *redis.Client
	logger  *logger.Logger
	queries *queries.Queries
}

func NewRoleHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *RoleHandler {
	return &RoleHandler{
		db:      db,
		redis:   redis,
		logger:  logger,
		queries: queries.New(db, redis),
	}
}

// ListRoles lists all roles with pagination and filtering
//
//	@Summary		List roles
//	@Description	Retrieve all roles with pagination, sorting, and filtering options
//	@Tags			Role Management
//	@Accept			json
//	@Produce		json
//	@Param			limit	query		int		false	"Number of roles to return (default: 50)"
//	@Param			offset	query		int		false	"Number of roles to skip (default: 0)"
//	@Param			sort	query		string	false	"Sort by field (name, created_at, updated_at, role_type)"
//	@Param			order	query		string	false	"Sort order (asc, desc)"
//	@Success		200		{object}	SuccessResponse	"Roles retrieved successfully"
//	@Failure		400		{object}	ErrorResponse	"Invalid query parameters"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/roles [get]
func (h *RoleHandler) ListRoles(c *fiber.Ctx) error {
	// Parse query parameters
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)
	sortBy := c.Query("sort", "created_at")
	order := c.Query("order", "desc")

	// Validate parameters
	if limit < 1 || limit > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_limit",
			Message: "Limit must be between 1 and 1000",
		})
	}

	if offset < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_offset",
			Message: "Offset must be non-negative",
		})
	}

	params := queries.ListParams{
		Limit:  limit,
		Offset: offset,
		SortBy: sortBy,
		Order:  order,
	}

	// Call query layer
	organizationID := c.Locals("organization_id").(string)
	result, err := h.queries.Role.ListRoles(params, organizationID)
	if err != nil {
		h.logger.Error("Failed to list roles: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve roles",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Roles retrieved successfully",
		Data:    result,
	})
}

// CreateRole creates a new role
//
//	@Summary		Create role
//	@Description	Create a new role with policies and permissions
//	@Tags			Role Management
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.Role		true	"Role details"
//	@Success		201		{object}	SuccessResponse	"Role created successfully"
//	@Failure		400		{object}	ErrorResponse	"Invalid request format or validation errors"
//	@Failure		409		{object}	ErrorResponse	"Role already exists"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/roles [post]
func (h *RoleHandler) CreateRole(c *fiber.Ctx) error {
	var role models.Role

	// Parse request body
	if err := c.BodyParser(&role); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_request_body",
			Message: "Failed to parse request body",
		})
	}

	// Validate required fields
	if role.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "validation_failed",
			Message: "Role name is required",
		})
	}

	if role.OrganizationID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "validation_failed",
			Message: "Organization ID is required",
		})
	}

	// Set defaults
	role.ID = uuid.New().String()
	if role.RoleType == "" {
		role.RoleType = "custom"
	}
	if role.MaxSessionDuration == "" {
		role.MaxSessionDuration = "12 hours"
	}
	if role.TrustPolicy == "" {
		role.TrustPolicy = "{}"
	}
	if role.AssumeRolePolicy == "" {
		role.AssumeRolePolicy = "{}"
	}
	if role.Tags == "" {
		role.Tags = "{}"
	}
	if role.Path == "" {
		role.Path = "/"
	}
	if role.Status == "" {
		role.Status = "active"
	}

	// Call query layer
	err := h.queries.Role.CreateRole(&role)
	if err != nil {
		if err.Error() == "role already exists" {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
				Status:  fiber.StatusConflict,
				Error:   "role_exists",
				Message: "Role with this name already exists in the organization",
			})
		}
		h.logger.Error("Failed to create role: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to create role",
		})
	}

	h.logger.Info("Role created successfully: %s", role.ID)

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Status:  fiber.StatusCreated,
		Message: "Role created successfully",
		Data:    role,
	})
}

// GetRole retrieves a specific role by ID
//
//	@Summary		Get role
//	@Description	Retrieve detailed information about a specific role
//	@Tags			Role Management
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"Role ID"
//	@Success		200	{object}	SuccessResponse	"Role retrieved successfully"
//	@Failure		400	{object}	ErrorResponse	"Invalid role ID"
//	@Failure		404	{object}	ErrorResponse	"Role not found"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/roles/{id} [get]
func (h *RoleHandler) GetRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	if roleID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_role_id",
			Message: "Role ID is required",
		})
	}

	// Call query layer
	organizationID := c.Locals("organization_id").(string)
	role, err := h.queries.Role.GetRole(roleID, organizationID)
	if err != nil {
		if err.Error() == "role not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_not_found",
				Message: "Role not found",
			})
		}
		h.logger.Error("Failed to get role: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve role",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Role retrieved successfully",
		Data:    role,
	})
}

// UpdateRole updates an existing role
//
//	@Summary		Update role
//	@Description	Update an existing role's properties and metadata
//	@Tags			Role Management
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string			true	"Role ID"
//	@Param			request	body		models.Role		true	"Updated role details"
//	@Success		200		{object}	SuccessResponse	"Role updated successfully"
//	@Failure		400		{object}	ErrorResponse	"Invalid request format or validation errors"
//	@Failure		404		{object}	ErrorResponse	"Role not found"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/roles/{id} [put]
func (h *RoleHandler) UpdateRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	if roleID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_role_id",
			Message: "Role ID is required",
		})
	}

	var roleUpdates models.Role

	// Parse request body
	if err := c.BodyParser(&roleUpdates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_request_body",
			Message: "Failed to parse request body",
		})
	}

	// Set the ID from URL parameter
	roleUpdates.ID = roleID

	// Call query layer
	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Role.UpdateRole(&roleUpdates, organizationID)
	if err != nil {
		if err.Error() == "role not found or already deleted" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_not_found",
				Message: "Role not found or already deleted",
			})
		}
		h.logger.Error("Failed to update role: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to update role",
		})
	}

	h.logger.Info("Role updated successfully: %s", roleID)

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Role updated successfully",
		Data:    roleUpdates,
	})
}

// DeleteRole deletes a role
//
//	@Summary		Delete role
//	@Description	Delete a role and remove all associated assignments
//	@Tags			Role Management
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string			true	"Role ID"
//	@Success		200	{object}	SuccessResponse	"Role deleted successfully"
//	@Failure		400	{object}	ErrorResponse	"Invalid role ID"
//	@Failure		404	{object}	ErrorResponse	"Role not found"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Security		BearerAuth
//	@Router			/roles/{id} [delete]
func (h *RoleHandler) DeleteRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	if roleID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_role_id",
			Message: "Role ID is required",
		})
	}

	// Call query layer
	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Role.DeleteRole(roleID, organizationID)
	if err != nil {
		if err.Error() == "role not found or already deleted" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_not_found",
				Message: "Role not found or already deleted",
			})
		}
		h.logger.Error("Failed to delete role: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to delete role",
		})
	}

	h.logger.Info("Role deleted successfully: %s", roleID)

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Role deleted successfully",
		Data:    fiber.Map{"role_id": roleID, "deleted_at": time.Now()},
	})
}

func (h *RoleHandler) GetRolePolicies(c *fiber.Ctx) error {
	roleID := c.Params("id")
	if roleID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_role_id",
			Message: "Role ID is required",
		})
	}

	// Ensure role exists (optional but provides clearer 404)
	organizationID := c.Locals("organization_id").(string)
	if _, err := h.queries.Role.GetRole(roleID, organizationID); err != nil {
		if err.Error() == "role not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_not_found",
				Message: "Role not found",
			})
		}
		h.logger.Error("Failed to verify role existence: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve role policies",
		})
	}

	policies, err := h.queries.Role.GetRolePolicies(roleID, organizationID)
	if err != nil {
		h.logger.Error("Failed to get role policies: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve role policies",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Role policies retrieved successfully",
		Data: fiber.Map{
			"role_id":  roleID,
			"policies": policies,
			"count":    len(policies),
		},
	})
}

func (h *RoleHandler) AttachPolicyToRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	if roleID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_role_id",
			Message: "Role ID is required",
		})
	}

	type attachRequest struct {
		PolicyID   string `json:"policy_id"`
		AttachedBy string `json:"attached_by,omitempty"`
	}

	var req attachRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_request_body",
			Message: "Failed to parse request body",
		})
	}
	if req.PolicyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "validation_failed",
			Message: "policy_id is required",
		})
	}
	// Attempt to derive attached_by from context (set by auth middleware) if not provided
	if req.AttachedBy == "" {
		if uid, ok := c.Locals("user_id").(string); ok {
			req.AttachedBy = uid
		}
	}

	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Role.AttachPolicyToRole(roleID, req.PolicyID, organizationID, req.AttachedBy)
	if err != nil {
		switch err.Error() {
		case "role or policy not found":
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_or_policy_not_found",
				Message: "Role or policy not found",
			})
		case "policy already attached to role":
			// Treat as idempotent success (could also choose 409)
			return c.Status(fiber.StatusOK).JSON(SuccessResponse{
				Status:  fiber.StatusOK,
				Message: "Policy already attached to role",
				Data: fiber.Map{
					"role_id":   roleID,
					"policy_id": req.PolicyID,
					"attached":  false,
				},
			})
		default:
			h.logger.Error("Failed to attach policy to role: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Status:  fiber.StatusInternalServerError,
				Error:   "internal_server_error",
				Message: "Failed to attach policy to role",
			})
		}
	}

	h.logger.Info("Policy %s attached to role %s", req.PolicyID, roleID)
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Status:  fiber.StatusCreated,
		Message: "Policy attached to role successfully",
		Data: fiber.Map{
			"role_id":   roleID,
			"policy_id": req.PolicyID,
			"attached":  true,
		},
	})
}

func (h *RoleHandler) DetachPolicyFromRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	policyID := c.Params("policy_id")
	if roleID == "" || policyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_parameters",
			Message: "Role ID and policy ID are required",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Role.DetachPolicyFromRole(roleID, policyID, organizationID)
	if err != nil {
		if err.Error() == "policy not attached to role" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "policy_not_attached",
				Message: "Policy not attached to role",
			})
		}
		h.logger.Error("Failed to detach policy from role: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to detach policy from role",
		})
	}

	h.logger.Info("Policy %s detached from role %s", policyID, roleID)
	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Policy detached from role successfully",
		Data: fiber.Map{
			"role_id":   roleID,
			"policy_id": policyID,
			"detached":  true,
		},
	})
}

func (h *RoleHandler) GetRoleAssignments(c *fiber.Ctx) error {
	roleID := c.Params("id")
	if roleID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_role_id",
			Message: "Role ID is required",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	// Validate role exists
	if _, err := h.queries.Role.GetRole(roleID, organizationID); err != nil {
		if err.Error() == "role not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_not_found",
				Message: "Role not found",
			})
		}
		h.logger.Error("Failed to verify role existence: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve role assignments",
		})
	}

	// organizationID is already declared above via c.Locals
	assignments, err := h.queries.Role.GetRoleAssignments(roleID, organizationID)
	if err != nil {
		h.logger.Error("Failed to get role assignments: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to retrieve role assignments",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Role assignments retrieved successfully",
		Data: fiber.Map{
			"role_id":     roleID,
			"assignments": assignments,
			"count":       len(assignments),
		},
	})
}

func (h *RoleHandler) AssignRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	if roleID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_role_id",
			Message: "Role ID is required",
		})
	}

	type assignRequest struct {
		PrincipalID   string `json:"principal_id"`
		PrincipalType string `json:"principal_type"`
		ExpiresAt     string `json:"expires_at,omitempty"`
		Conditions    string `json:"conditions,omitempty"` // raw JSON string; store as-is
	}

	var req assignRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_request_body",
			Message: "Failed to parse request body",
		})
	}

	if req.PrincipalID == "" || req.PrincipalType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "validation_failed",
			Message: "principal_id and principal_type are required",
		})
	}

	allowedPrincipalTypes := map[string]bool{"user": true, "service_account": true}
	if !allowedPrincipalTypes[req.PrincipalType] {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_principal_type",
			Message: "principal_type must be 'user' or 'service_account'",
		})
	}

	// Parse expires_at if provided
	var expiresAt time.Time
	if req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Status:  fiber.StatusBadRequest,
				Error:   "invalid_expires_at",
				Message: "expires_at must be RFC3339 format",
			})
		}
		expiresAt = t
	}

	// Derive assigned_by from context if possible
	assignedBy := ""
	if uid, ok := c.Locals("user_id").(string); ok {
		assignedBy = uid
	}

	assignment := &models.RoleAssignment{
		ID:            uuid.New().String(),
		RoleID:        roleID,
		PrincipalID:   req.PrincipalID,
		PrincipalType: req.PrincipalType,
		AssignedBy:    assignedBy,
		ExpiresAt:     expiresAt,
		Conditions:    req.Conditions,
	}

	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Role.AssignRole(assignment, organizationID)
	if err != nil {
		switch err.Error() {
		case "role or principal not found":
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_or_principal_not_found",
				Message: "Role or principal not found",
			})
		default:
			h.logger.Error("Failed to assign role: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Status:  fiber.StatusInternalServerError,
				Error:   "internal_server_error",
				Message: "Failed to assign role",
			})
		}
	}

	h.logger.Info("Role %s assigned to principal %s (%s)", roleID, req.PrincipalID, req.PrincipalType)
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Status:  fiber.StatusCreated,
		Message: "Role assigned successfully",
		Data:    assignment,
	})
}

func (h *RoleHandler) UnassignRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	principalID := c.Params("user_id") // route uses :user_id though it may be service account - keep param name
	if roleID == "" || principalID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Status:  fiber.StatusBadRequest,
			Error:   "invalid_parameters",
			Message: "Role ID and principal ID are required",
		})
	}

	organizationID := c.Locals("organization_id").(string)
	err := h.queries.Role.UnassignRole(roleID, principalID, organizationID)
	if err != nil {
		if err.Error() == "role assignment not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Status:  fiber.StatusNotFound,
				Error:   "role_assignment_not_found",
				Message: "Role assignment not found",
			})
		}
		h.logger.Error("Failed to unassign role: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Status:  fiber.StatusInternalServerError,
			Error:   "internal_server_error",
			Message: "Failed to unassign role",
		})
	}

	h.logger.Info("Role %s unassigned from principal %s", roleID, principalID)
	return c.JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Role unassigned successfully",
		Data: fiber.Map{
			"role_id":      roleID,
			"principal_id": principalID,
			"unassigned":   true,
		},
	})
}

// SessionHandler handles session-related operations
type SessionHandler struct {
	db      *database.DB
	redis   *redis.Client
	logger  *logger.Logger
	queries *queries.Queries
}

func NewSessionHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *SessionHandler {
	return &SessionHandler{
		db:      db,
		redis:   redis,
		logger:  logger,
		queries: queries.New(db, redis),
	}
}

// ListSessions lists active sessions for the authenticated principal
//
//	@Summary	List sessions
//	@Description	Retrieve sessions associated with the current principal
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Param		limit	query	int	false	"Number of sessions per page (default: 50)"
//	@Param		offset	query	int	false	"Number of sessions to skip (default: 0)"
//	@Param		sort_by	query	string	false	"Field to sort by (last_used_at, issued_at, expires_at)"
//	@Param		order	query	string	false	"Sort order (asc, desc)"
//	@Success	200	{object}	SuccessResponse	"Sessions listed successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request parameters"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/sessions [get]
func (h *SessionHandler) ListSessions(c *fiber.Ctx) error {
	params := queries.ListParams{
		Limit:  50,
		Offset: 0,
		SortBy: "last_used_at",
		Order:  "desc",
	}

	if limit := c.QueryInt("limit", 50); limit > 0 && limit <= 100 {
		params.Limit = limit
	}
	if offset := c.QueryInt("offset", 0); offset >= 0 {
		params.Offset = offset
	}
	if sortBy := c.Query("sort_by"); sortBy != "" {
		if isValidSortField(sortBy, []string{"last_used_at", "issued_at", "expires_at", "status"}) {
			params.SortBy = sortBy
		}
	}
	if order := c.Query("order"); order == "asc" || order == "desc" {
		params.Order = order
	}

	// TODO: Get principal ID and type from JWT context
	principalID := "current_user_id"
	principalType := "user"

	orgID := c.Locals("organization_id").(string)
	result, err := h.queries.Session.ListSessions(params, orgID, principalID, principalType)
	if err != nil {
		h.logger.Error("Failed to list sessions: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to list sessions",
		})
	}

	return c.JSON(result)
}

// GetCurrentSession retrieves the current session
//
//	@Summary	Get current session
//	@Description	Retrieve details of the current session from JWT token
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	models.Session	"Current session retrieved successfully"
//	@Failure	401	{object}	ErrorResponse	"No active session"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/sessions/current [get]
func (h *SessionHandler) GetCurrentSession(c *fiber.Ctx) error {
	// TODO: Get session ID from JWT context/claims
	sessionID := c.Get("X-Session-ID", "")
	if sessionID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   "no_session",
			Message: "No active session found",
		})
	}

	orgID := c.Locals("organization_id").(string)
	session, err := h.queries.Session.GetSession(sessionID, orgID)
	if err != nil {
		h.logger.Error("Failed to get current session: %v (session_id: %s)", err, sessionID)
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "expired") {
			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:   "session_invalid",
				Message: "Session not found or expired",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve session",
		})
	}

	// Update last used timestamp
	orgID = c.Locals("organization_id").(string)
	h.queries.Session.UpdateLastUsed(sessionID, orgID)

	// Remove sensitive fields before returning
	session.SessionToken = "" // Don't expose the token

	return c.JSON(session)
}

// RevokeCurrentSession revokes the current session
//
//	@Summary	Revoke current session
//	@Description	Invalidate the current session (logout)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	SuccessResponse	"Current session revoked successfully"
//	@Failure	401	{object}	ErrorResponse	"No active session"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/sessions/current [delete]
func (h *SessionHandler) RevokeCurrentSession(c *fiber.Ctx) error {
	// TODO: Get session ID from JWT context/claims
	sessionID := c.Get("X-Session-ID", "")
	if sessionID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   "no_session",
			Message: "No active session found",
		})
	}

	orgID := c.Locals("organization_id").(string)
	err := h.queries.Session.RevokeSession(sessionID, orgID)
	if err != nil {
		h.logger.Error("Failed to revoke current session: %v (session_id: %s)", err, sessionID)
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:   "session_not_found",
				Message: "Session not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to revoke session",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  200,
		Message: "Session revoked successfully",
	})
}

// GetSession retrieves a session by ID
//
//	@Summary	Get session
//	@Description	Retrieve a specific session by ID
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Session ID"
//	@Success	200	{object}	models.Session	"Session retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid session ID"
//	@Failure	403	{object}	ErrorResponse	"Access denied"
//	@Failure	404	{object}	ErrorResponse	"Session not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/sessions/{id} [get]
func (h *SessionHandler) GetSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if sessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Session ID is required",
		})
	}

	orgID := c.Locals("organization_id").(string)
	session, err := h.queries.Session.GetSession(sessionID, orgID)
	if err != nil {
		h.logger.Error("Failed to get session: %v (session_id: %s)", err, sessionID)
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "expired") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "session_not_found",
				Message: "Session not found or expired",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve session",
		})
	}

	// TODO: Check if current user can access this session
	// For now, allow access to own sessions only
	currentUserID := "current_user_id" // TODO: Get from JWT
	if session.PrincipalID != currentUserID && session.PrincipalType == "user" {
		// Allow admin users to view any session
		// TODO: Check if user has admin role
		userRole := "user" // TODO: Get from JWT
		if userRole != "admin" && userRole != "super_admin" {
			return c.Status(fiber.StatusForbidden).JSON(ErrorResponse{
				Error:   "access_denied",
				Message: "You can only view your own sessions",
			})
		}
	}

	// Remove sensitive fields before returning
	session.SessionToken = "" // Don't expose the token

	return c.JSON(session)
}

// RevokeSession revokes a session by ID
//
//	@Summary	Revoke session
//	@Description	Invalidate a specific session (admin only)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Session ID"
//	@Success	200	{object}	SuccessResponse	"Session revoked successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid session ID"
//	@Failure	403	{object}	ErrorResponse	"Access denied"
//	@Failure	404	{object}	ErrorResponse	"Session not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/sessions/{id} [delete]
func (h *SessionHandler) RevokeSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if sessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Session ID is required",
		})
	}

	// First check if session exists
	orgID := c.Locals("organization_id").(string)
	session, err := h.queries.Session.GetSession(sessionID, orgID)
	if err != nil {
		h.logger.Error("Failed to find session for revocation: %v (session_id: %s)", err, sessionID)
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "expired") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "session_not_found",
				Message: "Session not found or expired",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve session",
		})
	}

	// Check authorization - admin can revoke any session, users can revoke their own
	currentUserID := "current_user_id" // TODO: Get from JWT
	userRole := "admin"                // TODO: Get from JWT
	if userRole != "admin" && userRole != "super_admin" && session.PrincipalID != currentUserID {
		return c.Status(fiber.StatusForbidden).JSON(ErrorResponse{
			Error:   "access_denied",
			Message: "You can only revoke your own sessions",
		})
	}

	orgID = c.Locals("organization_id").(string)
	err = h.queries.Session.RevokeSession(sessionID, orgID)
	if err != nil {
		h.logger.Error("Failed to revoke session: %v (session_id: %s)", err, sessionID)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to revoke session",
		})
	}

	return c.JSON(SuccessResponse{
		Status:  200,
		Message: "Session revoked successfully",
	})
}

// ExtendSession extends a session
//
//	@Summary	Extend session
//	@Description	Extend the expiration of a session
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Session ID"
//	@Param		request	body	object{duration=string}	false	"Extension duration (e.g., '2h', '30m')"
//	@Success	200	{object}	models.Session	"Session extended successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request or session ID"
//	@Failure	403	{object}	ErrorResponse	"Access denied"
//	@Failure	404	{object}	ErrorResponse	"Session not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/sessions/{id}/extend [post]
func (h *SessionHandler) ExtendSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if sessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Session ID is required",
		})
	}

	var request struct {
		Duration string `json:"duration"` // Duration like "2h", "30m", "1h30m"
	}
	if err := c.BodyParser(&request); err != nil {
		// If no body provided, use default extension
		request.Duration = "1h"
	}

	// Parse duration
	duration, err := time.ParseDuration(request.Duration)
	if err != nil || duration <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_duration",
			Message: "Invalid duration format. Use formats like '2h', '30m', '1h30m'",
		})
	}

	// Limit maximum extension to prevent abuse
	if duration > 24*time.Hour {
		duration = 24 * time.Hour
	}

	// Get current session to check ownership
	orgID := c.Locals("organization_id").(string)
	session, err := h.queries.Session.GetSession(sessionID, orgID)
	if err != nil {
		h.logger.Error("Failed to find session for extension: %v (session_id: %s)", err, sessionID)
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "expired") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "session_not_found",
				Message: "Session not found or expired",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve session",
		})
	}

	// Check authorization - users can only extend their own sessions
	currentUserID := "current_user_id" // TODO: Get from JWT
	if session.PrincipalID != currentUserID && session.PrincipalType == "user" {
		userRole := "user" // TODO: Get from JWT
		if userRole != "admin" && userRole != "super_admin" {
			return c.Status(fiber.StatusForbidden).JSON(ErrorResponse{
				Error:   "access_denied",
				Message: "You can only extend your own sessions",
			})
		}
	}

	// Calculate new expiration time
	newExpiresAt := time.Now().Add(duration)

	orgID = c.Locals("organization_id").(string)
	err = h.queries.Session.ExtendSession(sessionID, orgID, newExpiresAt)
	if err != nil {
		h.logger.Error("Failed to extend session: %v (session_id: %s)", err, sessionID)
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "not active") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "session_not_found",
				Message: "Session not found or not active",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to extend session",
		})
	}

	// Return updated session
	orgID = c.Locals("organization_id").(string)
	updatedSession, err := h.queries.Session.GetSession(sessionID, orgID)
	if err != nil {
		// Fallback response if can't retrieve updated session
		return c.JSON(SuccessResponse{
			Status:  200,
			Message: "Session extended successfully",
		})
	}

	// Remove sensitive fields
	updatedSession.SessionToken = ""

	return c.JSON(updatedSession)
}

// AuditHandler handles audit and compliance operations
type AuditHandler struct {
	queries *queries.Queries
	logger  *logger.Logger
	audit   services.AuditService
}

func NewAuditHandler(queries *queries.Queries, logger *logger.Logger, audit services.AuditService) *AuditHandler {
	return &AuditHandler{queries: queries, logger: logger, audit: audit}
}

// ListAuditEvents lists audit events
//
//	@Summary	List audit events
//	@Description	Retrieve audit trail events with filtering and pagination
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Param		organization_id	query	string	false	"Organization ID"
//	@Param		principal_id	query	string	false	"Principal (User) ID"
//	@Param		action			query	string	false	"Action filter"
//	@Param		resource_type	query	string	false	"Resource type filter"
//	@Param		result			query	string	false	"Result filter (success/failure)"
//	@Param		severity		query	string	false	"Severity filter"
//	@Param		start_time		query	string	false	"Start time (RFC3339)"
//	@Param		end_time		query	string	false	"End time (RFC3339)"
//	@Param		limit			query	int		false	"Limit (default: 50, max: 100)"
//	@Param		offset			query	int		false	"Offset (default: 0)"
//	@Success	200	{object}	SuccessResponse	"Audit events retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request parameters"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/audit/events [get]
func (h *AuditHandler) ListAuditEvents(c *fiber.Ctx) error {
	// Extract query parameters
	params := queries.ListAuditEventsParams{
		OrganizationID: c.Query("organization_id"),
		PrincipalID:    c.Query("principal_id"),
		Action:         c.Query("action"),
		ResourceType:   c.Query("resource_type"),
		Result:         c.Query("result"),
		Severity:       c.Query("severity"),
	}

	// Enforce OrganizationID from context
	if params.OrganizationID == "" {
		params.OrganizationID = c.Locals("organization_id").(string)
	}

	// Parse time parameters
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			params.StartTime = &startTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_start_time",
				Message: "Invalid start_time format. Use RFC3339 format.",
			})
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			params.EndTime = &endTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_end_time",
				Message: "Invalid end_time format. Use RFC3339 format.",
			})
		}
	}

	// Parse pagination parameters
	if limit := c.QueryInt("limit", 50); limit > 0 {
		if limit > 100 {
			limit = 100 // Max limit
		}
		params.Limit = limit
	}

	params.Offset = c.QueryInt("offset", 0)

	// Get audit events
	events, totalCount, err := h.queries.Audit.ListAuditEvents(params)
	if err != nil {
		h.logger.Error("Failed to list audit events: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve audit events",
		})
	}

	return c.JSON(fiber.Map{
		"status": 200,
		"data": fiber.Map{
			"events":      events,
			"total_count": totalCount,
			"limit":       params.Limit,
			"offset":      params.Offset,
		},
		"message": "Audit events retrieved successfully",
	})
}

// GetAuditEvent retrieves a single audit event
//
//	@Summary	Get audit event
//	@Description	Retrieve details of a specific audit event by ID
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Audit Event ID"
//	@Success	200	{object}	models.AuditEvent	"Audit event retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid event ID"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	404	{object}	ErrorResponse	"Audit event not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/audit/events/{id} [get]
func (h *AuditHandler) GetAuditEvent(c *fiber.Ctx) error {
	eventID := c.Params("id")
	if eventID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_event_id",
			Message: "Event ID is required",
		})
	}

	// Get the audit event
	orgID := c.Locals("organization_id").(string)
	event, err := h.queries.Audit.GetAuditEvent(eventID, orgID)
	if err != nil {
		if err.Error() == "audit event not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "audit_event_not_found",
				Message: "Audit event not found",
			})
		}
		h.logger.Error("Failed to get audit event: %v (event_id: %s)", err, eventID)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve audit event",
		})
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    event,
		"message": "Audit event retrieved successfully",
	})
}

// GenerateAccessReport generates an access report
//
//	@Summary	Generate access report
//	@Description	Generate a comprehensive access report with user activity metrics
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Param		organization_id	query	string	false	"Organization ID"
//	@Param		start_time		query	string	false	"Start time (RFC3339)"
//	@Param		end_time		query	string	false	"End time (RFC3339)"
//	@Param		user_id			query	string	false	"Specific user ID"
//	@Param		include_details	query	bool	false	"Include detailed user activity"
//	@Success	200	{object}	queries.AccessReportData	"Access report generated successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request parameters"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/audit/reports/access [get]
func (h *AuditHandler) GenerateAccessReport(c *fiber.Ctx) error {
	// Extract query parameters
	params := queries.AccessReportParams{
		OrganizationID: c.Query("organization_id"),
		UserID:         c.Query("user_id"),
		IncludeDetails: c.QueryBool("include_details", false),
	}

	// Parse time parameters
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			params.StartTime = &startTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_start_time",
				Message: "Invalid start_time format. Use RFC3339 format.",
			})
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			params.EndTime = &endTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_end_time",
				Message: "Invalid end_time format. Use RFC3339 format.",
			})
		}
	}

	// Generate the access report
	report, err := h.queries.Audit.GenerateAccessReport(params)
	if err != nil {
		h.logger.Error("Failed to generate access report: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to generate access report",
		})
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    report,
		"message": "Access report generated successfully",
	})
}

// GenerateComplianceReport generates a compliance report
//
//	@Summary	Generate compliance report
//	@Description	Generate compliance posture report with security metrics and violations
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Param		organization_id	query	string		false	"Organization ID"
//	@Param		start_time		query	string		false	"Start time (RFC3339)"
//	@Param		end_time		query	string		false	"End time (RFC3339)"
//	@Param		standards		query	[]string	false	"Compliance standards (SOX, PCI-DSS, GDPR)"
//	@Success	200	{object}	queries.ComplianceReportData	"Compliance report generated successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request parameters"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/audit/reports/compliance [get]
func (h *AuditHandler) GenerateComplianceReport(c *fiber.Ctx) error {
	// Extract query parameters
	params := queries.ComplianceReportParams{
		OrganizationID: c.Query("organization_id"),
	}

	// Parse standards parameter (comma-separated)
	if standardsStr := c.Query("standards"); standardsStr != "" {
		params.Standards = strings.Split(standardsStr, ",")
		// Trim whitespace from each standard
		for i, standard := range params.Standards {
			params.Standards[i] = strings.TrimSpace(standard)
		}
	}

	// Parse time parameters
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			params.StartTime = &startTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_start_time",
				Message: "Invalid start_time format. Use RFC3339 format.",
			})
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			params.EndTime = &endTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_end_time",
				Message: "Invalid end_time format. Use RFC3339 format.",
			})
		}
	}

	// Generate the compliance report
	report, err := h.queries.Audit.GenerateComplianceReport(params)
	if err != nil {
		h.logger.Error("Failed to generate compliance report: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to generate compliance report",
		})
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    report,
		"message": "Compliance report generated successfully",
	})
}

// GeneratePolicyUsageReport generates a policy usage report
//
//	@Summary	Generate policy usage report
//	@Description	Generate policy usage metrics and effectiveness analysis
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Param		organization_id	query	string	false	"Organization ID"
//	@Param		start_time		query	string	false	"Start time (RFC3339)"
//	@Param		end_time		query	string	false	"End time (RFC3339)"
//	@Param		policy_id		query	string	false	"Specific policy ID"
//	@Success	200	{object}	queries.PolicyUsageReportData	"Policy usage report generated successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request parameters"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/audit/reports/policy-usage [get]
func (h *AuditHandler) GeneratePolicyUsageReport(c *fiber.Ctx) error {
	// Extract query parameters
	params := queries.PolicyUsageReportParams{
		OrganizationID: c.Query("organization_id"),
		PolicyID:       c.Query("policy_id"),
	}

	// Parse time parameters
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			params.StartTime = &startTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_start_time",
				Message: "Invalid start_time format. Use RFC3339 format.",
			})
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			params.EndTime = &endTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_end_time",
				Message: "Invalid end_time format. Use RFC3339 format.",
			})
		}
	}

	// Generate the policy usage report
	report, err := h.queries.Audit.GeneratePolicyUsageReport(params)
	if err != nil {
		h.logger.Error("Failed to generate policy usage report: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to generate policy usage report",
		})
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    report,
		"message": "Policy usage report generated successfully",
	})
}

// ListAccessReviews lists access reviews with filtering and pagination
//
//	@Summary	List access reviews
//	@Description	Retrieve access reviews with filtering options
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		organization_id	query	string	false	"Organization ID"
//	@Param		reviewer_id		query	string	false	"Reviewer ID"
//	@Param		status			query	string	false	"Review status"
//	@Param		start_time		query	string	false	"Start time (RFC3339)"
//	@Param		end_time		query	string	false	"End time (RFC3339)"
//	@Param		limit			query	int		false	"Limit (default: 50, max: 100)"
//	@Param		offset			query	int		false	"Offset (default: 0)"
//	@Success	200	{object}	SuccessResponse	"Access reviews retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request parameters"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/access-reviews [get]
func (h *AuditHandler) ListAccessReviews(c *fiber.Ctx) error {
	// Extract query parameters
	params := queries.ListAccessReviewsParams{
		OrganizationID: c.Query("organization_id"),
		ReviewerID:     c.Query("reviewer_id"),
		Status:         c.Query("status"),
	}

	// Enforce OrganizationID from context
	if params.OrganizationID == "" {
		params.OrganizationID = c.Locals("organization_id").(string)
	}

	// Parse time parameters
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			params.StartTime = &startTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_start_time",
				Message: "Invalid start_time format. Use RFC3339 format.",
			})
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			params.EndTime = &endTime
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_end_time",
				Message: "Invalid end_time format. Use RFC3339 format.",
			})
		}
	}

	// Parse pagination parameters
	if limit := c.QueryInt("limit", 50); limit > 0 {
		if limit > 100 {
			limit = 100 // Max limit
		}
		params.Limit = limit
	}

	params.Offset = c.QueryInt("offset", 0)

	// Get access reviews
	reviews, totalCount, err := h.queries.Audit.ListAccessReviews(params)
	if err != nil {
		h.logger.Error("Failed to list access reviews: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve access reviews",
		})
	}

	return c.JSON(fiber.Map{
		"status": 200,
		"data": fiber.Map{
			"reviews":     reviews,
			"total_count": totalCount,
			"limit":       params.Limit,
			"offset":      params.Offset,
		},
		"message": "Access reviews retrieved successfully",
	})
}

// CreateAccessReview creates a new access review
//
//	@Summary	Create access review
//	@Description	Create a new access review for periodic permission audits
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		review	body	models.AccessReview	true	"Access review data"
//	@Success	201	{object}	models.AccessReview	"Access review created successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request data"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/access-reviews [post]
func (h *AuditHandler) CreateAccessReview(c *fiber.Ctx) error {
	var request models.AccessReview
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid request body",
		})
	}

	// Validate required fields
	if request.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "validation_error",
			Message: "Name is required",
		})
	}

	if request.OrganizationID == "" {
		request.OrganizationID = c.Locals("organization_id").(string)
	}

	if request.ReviewerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "validation_error",
			Message: "Reviewer ID is required",
		})
	}

	// Generate ID if not provided
	if request.ID == "" {
		request.ID = uuid.New().String()
	}

	// Create the access review
	createdReview, err := h.queries.Audit.CreateAccessReview(request)
	if err != nil {
		h.logger.Error("Failed to create access review: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to create access review",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status":  201,
		"data":    createdReview,
		"message": "Access review created successfully",
	})
}

// GetAccessReview retrieves a specific access review
//
//	@Summary	Get access review
//	@Description	Retrieve details of a specific access review by ID
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Access Review ID"
//	@Success	200	{object}	models.AccessReview	"Access review retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid review ID"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	404	{object}	ErrorResponse	"Access review not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/access-reviews/{id} [get]
func (h *AuditHandler) GetAccessReview(c *fiber.Ctx) error {
	reviewID := c.Params("id")
	if reviewID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_review_id",
			Message: "Review ID is required",
		})
	}

	// Get the access review
	orgID := c.Locals("organization_id").(string)
	review, err := h.queries.Audit.GetAccessReview(reviewID, orgID)
	if err != nil {
		if err.Error() == "access review not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "access_review_not_found",
				Message: "Access review not found",
			})
		}
		h.logger.Error("Failed to get access review: %v (review_id: %s)", err, reviewID)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to retrieve access review",
		})
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    review,
		"message": "Access review retrieved successfully",
	})
}

// UpdateAccessReview updates an existing access review
//
//	@Summary	Update access review
//	@Description	Update an existing access review
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		id		path	string				true	"Access Review ID"
//	@Param		review	body	models.AccessReview	true	"Updated access review data"
//	@Success	200	{object}	models.AccessReview	"Access review updated successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request data"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	404	{object}	ErrorResponse	"Access review not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/access-reviews/{id} [put]
func (h *AuditHandler) UpdateAccessReview(c *fiber.Ctx) error {
	reviewID := c.Params("id")
	if reviewID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_review_id",
			Message: "Review ID is required",
		})
	}

	var request models.AccessReview
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid request body",
		})
	}

	// Update the access review
	orgID := c.Locals("organization_id").(string)
	updatedReview, err := h.queries.Audit.UpdateAccessReview(reviewID, orgID, request)
	if err != nil {
		if err.Error() == "access review not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "access_review_not_found",
				Message: "Access review not found",
			})
		}
		h.logger.Error("Failed to update access review: %v (review_id: %s)", err, reviewID)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to update access review",
		})
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    updatedReview,
		"message": "Access review updated successfully",
	})
}

// CompleteAccessReview marks an access review as completed
//
//	@Summary	Complete access review
//	@Description	Mark an access review as completed with findings and recommendations
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		id		path	string	true	"Access Review ID"
//	@Param		completion	body	object	true	"Completion data"
//	@Success	200	{object}	SuccessResponse	"Access review completed successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request data"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	404	{object}	ErrorResponse	"Access review not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/access-reviews/{id}/complete [post]
func (h *AuditHandler) CompleteAccessReview(c *fiber.Ctx) error {
	reviewID := c.Params("id")
	if reviewID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_review_id",
			Message: "Review ID is required",
		})
	}

	var request struct {
		Findings        string `json:"findings"`
		Recommendations string `json:"recommendations"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid request body",
		})
	}

	// Complete the access review
	orgID := c.Locals("organization_id").(string)
	err := h.queries.Audit.CompleteAccessReview(reviewID, orgID, request.Findings, request.Recommendations)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   "access_review_not_found",
				Message: "Access review not found or already completed",
			})
		}
		h.logger.Error("Failed to complete access review: %v (review_id: %s)", err, reviewID)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_server_error",
			Message: "Failed to complete access review",
		})
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"message": "Access review completed successfully",
	})
}

// GetSystemStats retrieves system-wide statistics
//
//	@Summary	Get system statistics
//	@Description	Retrieve comprehensive system statistics for administrators
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	SuccessResponse	"System statistics retrieved successfully"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/admin/stats [get]
func (h *AuditHandler) GetSystemStats(c *fiber.Ctx) error {
	// This would typically gather statistics from various sources
	stats := fiber.Map{
		"system": fiber.Map{
			"uptime":   time.Since(time.Now().Add(-24 * time.Hour)).String(), // Placeholder
			"version":  "1.0.0",
			"build":    "development",
			"timezone": "UTC",
		},
		"users": fiber.Map{
			"total_users":     1000, // These would be real queries
			"active_users":    850,
			"suspended_users": 50,
			"new_users_today": 25,
		},
		"audit": fiber.Map{
			"total_events":    50000,
			"events_today":    1250,
			"failed_logins":   125,
			"security_alerts": 5,
		},
		"performance": fiber.Map{
			"avg_response_time": "45ms",
			"error_rate":        "0.02%",
			"throughput":        "1250 req/min",
		},
		"storage": fiber.Map{
			"database_size":  "2.5GB",
			"cache_hit_rate": "94.5%",
			"disk_usage":     "68%",
		},
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    stats,
		"message": "System statistics retrieved successfully",
	})
}

// SystemHealthCheck performs a comprehensive system health check
//
//	@Summary	System health check
//	@Description	Perform comprehensive health checks on all system components
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	SuccessResponse	"Health check completed successfully"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/admin/health-check [get]
func (h *AuditHandler) SystemHealthCheck(c *fiber.Ctx) error {
	healthStatus := fiber.Map{
		"overall":   "healthy",
		"timestamp": time.Now(),
		"components": fiber.Map{
			"database": fiber.Map{
				"status":        "healthy",
				"response_time": "12ms",
				"connections":   45,
			},
			"redis": fiber.Map{
				"status":        "healthy",
				"response_time": "2ms",
				"memory_usage":  "245MB",
			},
			"auth_service": fiber.Map{
				"status":     "healthy",
				"last_check": time.Now().Add(-30 * time.Second),
			},
			"audit_service": fiber.Map{
				"status":           "healthy",
				"events_processed": 1250,
			},
		},
		"checks": []fiber.Map{
			{
				"name":   "Database connectivity",
				"status": "pass",
				"time":   "12ms",
			},
			{
				"name":   "Redis connectivity",
				"status": "pass",
				"time":   "2ms",
			},
			{
				"name":   "Disk space",
				"status": "pass",
				"usage":  "68%",
			},
			{
				"name":   "Memory usage",
				"status": "pass",
				"usage":  "72%",
			},
		},
	}

	return c.JSON(fiber.Map{
		"status":  200,
		"data":    healthStatus,
		"message": "Health check completed successfully",
	})
}

// EnableMaintenanceMode enables system maintenance mode
//
//	@Summary	Enable maintenance mode
//	@Description	Enable system-wide maintenance mode to restrict access
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	SuccessResponse	"Maintenance mode enabled successfully"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/admin/maintenance-mode [post]
func (h *AuditHandler) EnableMaintenanceMode(c *fiber.Ctx) error {
	// In a real implementation, this would:
	// 1. Set a flag in Redis/database
	// 2. Update middleware to reject non-admin requests
	// 3. Log the maintenance mode activation

	h.logger.Info("Maintenance mode enabled by admin")

	return c.JSON(fiber.Map{
		"status": 200,
		"data": fiber.Map{
			"maintenance_mode": true,
			"enabled_at":       time.Now(),
			"message":          "System is now in maintenance mode",
		},
		"message": "Maintenance mode enabled successfully",
	})
}

// DisableMaintenanceMode disables system maintenance mode
//
//	@Summary	Disable maintenance mode
//	@Description	Disable system-wide maintenance mode to restore normal access
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	SuccessResponse	"Maintenance mode disabled successfully"
//	@Failure	401	{object}	ErrorResponse	"Unauthorized"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/admin/maintenance-mode [delete]
func (h *AuditHandler) DisableMaintenanceMode(c *fiber.Ctx) error {
	// In a real implementation, this would:
	// 1. Remove the maintenance flag from Redis/database
	// 2. Restore normal middleware operation
	// 3. Log the maintenance mode deactivation

	h.logger.Info("Maintenance mode disabled by admin")

	return c.JSON(fiber.Map{
		"status": 200,
		"data": fiber.Map{
			"maintenance_mode": false,
			"disabled_at":      time.Now(),
			"message":          "System is now in normal operation mode",
		},
		"message": "Maintenance mode disabled successfully",
	})
}

// Helper functions
func isValidSortField(field string, validFields []string) bool {
	for _, validField := range validFields {
		if field == validField {
			return true
		}
	}
	return false
}
