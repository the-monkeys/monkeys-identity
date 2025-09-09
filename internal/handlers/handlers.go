package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
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
//	@Description	Retrieve groups with pagination and optional organization filtering
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		limit	query	int	false	"Number of groups to return (default 50)"
//	@Param		offset	query	int	false	"Number of groups to skip (default 0)"
//	@Param		sort	query	string	false	"Sort by field (name, created_at)"
//	@Param		order	query	string	false	"Sort order (asc, desc)"
//	@Param		organization_id	query	string	false	"Filter by organization ID"
//	@Success	200	{object}	SuccessResponse	"Groups retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid query parameters"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups [get]
func (h *GroupHandler) ListGroups(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)
	sortBy := c.Query("sort", "created_at")
	order := c.Query("order", "desc")
	orgID := c.Query("organization_id")

	if limit < 1 || limit > 200 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_limit", Message: "limit must be 1-200"})
	}
	if offset < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_offset", Message: "offset must be >=0"})
	}
	params := queries.ListParams{Limit: limit, Offset: offset, SortBy: sortBy, Order: order}
	result, err := h.queries.Group.ListGroups(params, orgID)
	if err != nil {
		h.logger.Error("list groups failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list groups"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Groups retrieved successfully", Data: result})
}

// CreateGroup creates a new group
//
//	@Summary	Create group
//	@Description	Create a new group within an organization
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		request	body	models.Group	true	"Group details"
//	@Success	201	{object}	SuccessResponse	"Group created successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body or validation errors"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups [post]
func (h *GroupHandler) CreateGroup(c *fiber.Ctx) error {
	var g models.Group
	if err := c.BodyParser(&g); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}
	if g.Name == "" || g.OrganizationID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "name and organization_id are required"})
	}
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
		h.logger.Error("create group failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to create group"})
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{Status: fiber.StatusCreated, Message: "Group created successfully", Data: g})
}

// GetGroup retrieves a group by ID
//
//	@Summary	Get group
//	@Description	Retrieve detailed information about a specific group
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID"
//	@Success	200	{object}	SuccessResponse	"Group retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID"
//	@Failure	404	{object}	ErrorResponse	"Group not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id} [get]
func (h *GroupHandler) GetGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	g, err := h.queries.Group.GetGroup(id)
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
//	@Description	Update a group's properties
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID"
//	@Param		request	body	models.Group	true	"Updated group details"
//	@Success	200	{object}	SuccessResponse	"Group updated successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body"
//	@Failure	404	{object}	ErrorResponse	"Group not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id} [put]
func (h *GroupHandler) UpdateGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	var g models.Group
	if err := c.BodyParser(&g); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}
	g.ID = id
	if err := h.queries.Group.UpdateGroup(&g); err != nil {
		if err.Error() == "group not found or deleted" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "group_not_found", Message: "Group not found or deleted"})
		}
		h.logger.Error("update group failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to update group"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group updated successfully", Data: g})
}

// DeleteGroup deletes a group
//
//	@Summary	Delete group
//	@Description	Soft delete a group by marking it deleted
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID"
//	@Success	200	{object}	SuccessResponse	"Group deleted successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID"
//	@Failure	404	{object}	ErrorResponse	"Group not found"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id} [delete]
func (h *GroupHandler) DeleteGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	if err := h.queries.Group.DeleteGroup(id); err != nil {
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
//	@Description	Retrieve all members of a group
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID"
//	@Success	200	{object}	SuccessResponse	"Group members retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id}/members [get]
func (h *GroupHandler) GetGroupMembers(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	members, err := h.queries.Group.ListGroupMembers(id)
	if err != nil {
		h.logger.Error("list group members failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list group members"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Group members retrieved successfully", Data: fiber.Map{"group_id": id, "members": members, "count": len(members)}})
}

// AddGroupMember adds a member to a group
//
//	@Summary	Add group member
//	@Description	Add a principal (user or service account) to a group
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID"
//	@Param		request	body	object	true	"Membership details"
//	@Success	201	{object}	SuccessResponse	"Group member added successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid request body"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
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
	if uid, ok := c.Locals("user_id").(string); ok {
		addedBy = uid
	}
	membership := &models.GroupMembership{ID: uuid.New().String(), GroupID: id, PrincipalID: req.PrincipalID, PrincipalType: req.PrincipalType, RoleInGroup: req.RoleInGroup, ExpiresAt: expires, AddedBy: addedBy}
	if err := h.queries.Group.AddGroupMember(membership); err != nil {
		h.logger.Error("add group member failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to add group member"})
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{Status: fiber.StatusCreated, Message: "Group member added successfully", Data: membership})
}

// RemoveGroupMember removes a member from a group
//
//	@Summary	Remove group member
//	@Description	Remove a principal from a group membership
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID"
//	@Param		user_id	path	string	true	"Principal ID"
//	@Param		principal_type	query	string	false	"Principal type (user or service_account)"
//	@Success	200	{object}	SuccessResponse	"Group member removed successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid parameters"
//	@Failure	404	{object}	ErrorResponse	"Membership not found"
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
	if err := h.queries.Group.RemoveGroupMember(id, principalID, principalType); err != nil {
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
//	@Description	Retrieve aggregated allow/deny permissions derived from member role assignments
//	@Tags		Group Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Group ID"
//	@Success	200	{object}	SuccessResponse	"Group permissions retrieved successfully"
//	@Failure	400	{object}	ErrorResponse	"Invalid group ID"
//	@Failure	500	{object}	ErrorResponse	"Internal server error"
//	@Security	BearerAuth
//	@Router		/groups/{id}/permissions [get]
func (h *GroupHandler) GetGroupPermissions(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_group_id", Message: "Group ID is required"})
	}
	perms, err := h.queries.Group.GetGroupPermissions(id)
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

	// Get filter parameters
	organizationID := c.Query("organization_id")
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

	// Validate required fields
	if resource.Name == "" || resource.Type == "" || resource.OrganizationID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "name, type, and organization_id are required"})
	}

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

	resource, err := h.queries.Resource.GetResource(resourceID)
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

	// Set the ID from the URL parameter
	updates.ID = resourceID

	if err := h.queries.Resource.UpdateResource(&updates); err != nil {
		h.logger.Error("update resource failed: %v", err)
		if err.Error() == "resource not found" {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "resource_not_found", Message: "Resource not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to update resource"})
	}

	// Get the updated resource to return it
	updatedResource, err := h.queries.Resource.GetResource(resourceID)
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

	if err := h.queries.Resource.DeleteResource(resourceID); err != nil {
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

	permissions, err := h.queries.Resource.GetResourcePermissions(resourceID)
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

	if err := h.queries.Resource.SetResourcePermissions(resourceID, permissions); err != nil {
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

	accessLog, err := h.queries.Resource.GetResourceAccessLog(resourceID, params)
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

	if err := h.queries.Resource.ShareResource(&share); err != nil {
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

	if err := h.queries.Resource.UnshareResource(resourceID, req.PrincipalID, req.PrincipalType); err != nil {
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
	db     *database.DB
	redis  *redis.Client
	logger *logger.Logger
}

func NewPolicyHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *PolicyHandler {
	return &PolicyHandler{db: db, redis: redis, logger: logger}
}

// ListPolicies lists policies
//
//	@Summary	List policies
//	@Description	Retrieve all policies (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Policies listed placeholder"
//	@Security	BearerAuth
//	@Router		/policies [get]
func (h *PolicyHandler) ListPolicies(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "List policies endpoint"})
}

// CreatePolicy creates a policy
//
//	@Summary	Create policy
//	@Description	Create a new policy (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object	true	"Policy definition"
//	@Success	200	{object}	fiber.Map	"Policy created placeholder"
//	@Security	BearerAuth
//	@Router		/policies [post]
func (h *PolicyHandler) CreatePolicy(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Create policy endpoint"})
}

// GetPolicy retrieves a policy
//
//	@Summary	Get policy
//	@Description	Retrieve a specific policy (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	fiber.Map	"Policy retrieved placeholder"
//	@Security	BearerAuth
//	@Router		/policies/{id} [get]
func (h *PolicyHandler) GetPolicy(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get policy endpoint"})
}

// UpdatePolicy updates a policy
//
//	@Summary	Update policy
//	@Description	Update an existing policy (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Param		request	body	object	true	"Updated policy"
//	@Success	200	{object}	fiber.Map	"Policy updated placeholder"
//	@Security	BearerAuth
//	@Router		/policies/{id} [put]
func (h *PolicyHandler) UpdatePolicy(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Update policy endpoint"})
}

// DeletePolicy deletes a policy
//
//	@Summary	Delete policy
//	@Description	Delete (deactivate) a policy (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	fiber.Map	"Policy deleted placeholder"
//	@Security	BearerAuth
//	@Router		/policies/{id} [delete]
func (h *PolicyHandler) DeletePolicy(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Delete policy endpoint"})
}

// SimulatePolicy simulates evaluation of a policy
//
//	@Summary	Simulate policy
//	@Description	Simulate the effect of a policy against a hypothetical request (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Param		request	body	object	true	"Simulation input"
//	@Success	200	{object}	fiber.Map	"Policy simulation placeholder"
//	@Security	BearerAuth
//	@Router		/policies/{id}/simulate [post]
func (h *PolicyHandler) SimulatePolicy(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Simulate policy endpoint"})
}

// GetPolicyVersions lists policy versions
//
//	@Summary	List policy versions
//	@Description	Retrieve all versions of a policy (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	fiber.Map	"Policy versions placeholder"
//	@Security	BearerAuth
//	@Router		/policies/{id}/versions [get]
func (h *PolicyHandler) GetPolicyVersions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get policy versions endpoint"})
}

// ApprovePolicy approves a policy version
//
//	@Summary	Approve policy
//	@Description	Approve a pending policy version (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	fiber.Map	"Policy approved placeholder"
//	@Security	BearerAuth
//	@Router		/policies/{id}/approve [post]
func (h *PolicyHandler) ApprovePolicy(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Approve policy endpoint"})
}

// RollbackPolicy rolls back a policy to a previous version
//
//	@Summary	Rollback policy
//	@Description	Rollback policy to a specified version (placeholder)
//	@Tags		Policy Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Policy ID"
//	@Success	200	{object}	fiber.Map	"Policy rollback placeholder"
//	@Security	BearerAuth
//	@Router		/policies/{id}/rollback [post]
func (h *PolicyHandler) RollbackPolicy(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Rollback policy endpoint"})
}

// CheckPermission checks a single permission
//
//	@Summary	Check permission
//	@Description	Check if a principal is allowed an action on a resource (placeholder)
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object	true	"Permission check request"
//	@Success	200	{object}	fiber.Map	"Permission check placeholder"
//	@Security	BearerAuth
//	@Router		/authz/check [post]
func (h *PolicyHandler) CheckPermission(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Check permission endpoint"})
}

// BulkCheckPermissions checks multiple permissions
//
//	@Summary	Bulk check permissions
//	@Description	Check multiple action/resource pairs (placeholder)
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object	true	"Bulk permission check request"
//	@Success	200	{object}	fiber.Map	"Bulk permission check placeholder"
//	@Security	BearerAuth
//	@Router		/authz/bulk-check [post]
func (h *PolicyHandler) BulkCheckPermissions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Bulk check permissions endpoint"})
}

// GetEffectivePermissions retrieves effective permissions for current principal
//
//	@Summary	Get effective permissions
//	@Description	Retrieve effective permissions for authenticated principal (placeholder)
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Effective permissions placeholder"
//	@Security	BearerAuth
//	@Router		/authz/effective-permissions [get]
func (h *PolicyHandler) GetEffectivePermissions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get effective permissions endpoint"})
}

// SimulateAccess simulates an access request
//
//	@Summary	Simulate access
//	@Description	Simulate an access decision for a hypothetical request (placeholder)
//	@Tags		Authorization
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object	true	"Access simulation request"
//	@Success	200	{object}	fiber.Map	"Access simulation placeholder"
//	@Security	BearerAuth
//	@Router		/authz/simulate-access [post]
func (h *PolicyHandler) SimulateAccess(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Simulate access endpoint"})
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
	result, err := h.queries.Role.ListRoles(params)
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
	role, err := h.queries.Role.GetRole(roleID)
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
	err := h.queries.Role.UpdateRole(&roleUpdates)
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
	err := h.queries.Role.DeleteRole(roleID)
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
	if _, err := h.queries.Role.GetRole(roleID); err != nil {
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

	policies, err := h.queries.Role.GetRolePolicies(roleID)
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

	err := h.queries.Role.AttachPolicyToRole(roleID, req.PolicyID, req.AttachedBy)
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

	err := h.queries.Role.DetachPolicyFromRole(roleID, policyID)
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

	// Validate role exists
	if _, err := h.queries.Role.GetRole(roleID); err != nil {
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

	assignments, err := h.queries.Role.GetRoleAssignments(roleID)
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

	err := h.queries.Role.AssignRole(assignment)
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

	err := h.queries.Role.UnassignRole(roleID, principalID)
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
	db     *database.DB
	redis  *redis.Client
	logger *logger.Logger
}

func NewSessionHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *SessionHandler {
	return &SessionHandler{db: db, redis: redis, logger: logger}
}

// ListSessions lists active sessions for the authenticated principal
//
//	@Summary	List sessions
//	@Description	Retrieve sessions associated with the current principal (placeholder)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Sessions list placeholder"
//	@Security	BearerAuth
//	@Router		/sessions [get]
func (h *SessionHandler) ListSessions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "List sessions endpoint"})
}

// GetCurrentSession retrieves the current session
//
//	@Summary	Get current session
//	@Description	Retrieve details of the current session (placeholder)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Current session placeholder"
//	@Security	BearerAuth
//	@Router		/sessions/current [get]
func (h *SessionHandler) GetCurrentSession(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get current session endpoint"})
}

// RevokeCurrentSession revokes the current session
//
//	@Summary	Revoke current session
//	@Description	Invalidate the current session (placeholder)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Current session revoked placeholder"
//	@Security	BearerAuth
//	@Router		/sessions/current [delete]
func (h *SessionHandler) RevokeCurrentSession(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Revoke current session endpoint"})
}

// GetSession retrieves a session by ID
//
//	@Summary	Get session
//	@Description	Retrieve a specific session (placeholder)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Session ID"
//	@Success	200	{object}	fiber.Map	"Session retrieved placeholder"
//	@Security	BearerAuth
//	@Router		/sessions/{id} [get]
func (h *SessionHandler) GetSession(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get session endpoint"})
}

// RevokeSession revokes a session by ID
//
//	@Summary	Revoke session
//	@Description	Invalidate a specific session (placeholder)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Session ID"
//	@Success	200	{object}	fiber.Map	"Session revoked placeholder"
//	@Security	BearerAuth
//	@Router		/sessions/{id} [delete]
func (h *SessionHandler) RevokeSession(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Revoke session endpoint"})
}

// ExtendSession extends a session
//
//	@Summary	Extend session
//	@Description	Extend the expiration of a session (placeholder)
//	@Tags		Session Management
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Session ID"
//	@Success	200	{object}	fiber.Map	"Session extended placeholder"
//	@Security	BearerAuth
//	@Router		/sessions/{id}/extend [post]
func (h *SessionHandler) ExtendSession(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Extend session endpoint"})
}

// AuditHandler handles audit and compliance operations
type AuditHandler struct {
	db     *database.DB
	redis  *redis.Client
	logger *logger.Logger
}

func NewAuditHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *AuditHandler {
	return &AuditHandler{db: db, redis: redis, logger: logger}
}

// ListAuditEvents lists audit events
//
//	@Summary	List audit events
//	@Description	Retrieve audit trail events (placeholder)
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Audit events listed placeholder"
//	@Security	BearerAuth
//	@Router		/audit/events [get]
func (h *AuditHandler) ListAuditEvents(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "List audit events endpoint"})
}

// GetAuditEvent retrieves a single audit event
//
//	@Summary	Get audit event
//	@Description	Retrieve details of a specific audit event (placeholder)
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Audit Event ID"
//	@Success	200	{object}	fiber.Map	"Audit event retrieved placeholder"
//	@Security	BearerAuth
//	@Router		/audit/events/{id} [get]
func (h *AuditHandler) GetAuditEvent(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get audit event endpoint"})
}

// GenerateAccessReport generates an access report
//
//	@Summary	Generate access report
//	@Description	Generate a comprehensive access report (placeholder)
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Access report placeholder"
//	@Security	BearerAuth
//	@Router		/audit/reports/access [get]
func (h *AuditHandler) GenerateAccessReport(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Generate access report endpoint"})
}

// GenerateComplianceReport generates a compliance report
//
//	@Summary	Generate compliance report
//	@Description	Generate compliance posture report (placeholder)
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Compliance report placeholder"
//	@Security	BearerAuth
//	@Router		/audit/reports/compliance [get]
func (h *AuditHandler) GenerateComplianceReport(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Generate compliance report endpoint"})
}

// GeneratePolicyUsageReport generates a policy usage report
//
//	@Summary	Generate policy usage report
//	@Description	Generate policy usage metrics (placeholder)
//	@Tags		Audit & Compliance
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Policy usage report placeholder"
//	@Security	BearerAuth
//	@Router		/audit/reports/policy-usage [get]
func (h *AuditHandler) GeneratePolicyUsageReport(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Generate policy usage report endpoint"})
}

// ListAccessReviews lists access reviews
//
//	@Summary	List access reviews
//	@Description	Retrieve all access reviews (placeholder)
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Access reviews list placeholder"
//	@Security	BearerAuth
//	@Router		/access-reviews [get]
func (h *AuditHandler) ListAccessReviews(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "List access reviews endpoint"})
}

// CreateAccessReview creates an access review
//
//	@Summary	Create access review
//	@Description	Initiate a new access review (placeholder)
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		request	body	object	true	"Access review definition"
//	@Success	200	{object}	fiber.Map	"Access review created placeholder"
//	@Security	BearerAuth
//	@Router		/access-reviews [post]
func (h *AuditHandler) CreateAccessReview(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Create access review endpoint"})
}

// GetAccessReview retrieves an access review
//
//	@Summary	Get access review
//	@Description	Retrieve a specific access review (placeholder)
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Access Review ID"
//	@Success	200	{object}	fiber.Map	"Access review retrieved placeholder"
//	@Security	BearerAuth
//	@Router		/access-reviews/{id} [get]
func (h *AuditHandler) GetAccessReview(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get access review endpoint"})
}

// UpdateAccessReview updates an access review
//
//	@Summary	Update access review
//	@Description	Modify an existing access review (placeholder)
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Access Review ID"
//	@Param		request	body	object	true	"Updated access review"
//	@Success	200	{object}	fiber.Map	"Access review updated placeholder"
//	@Security	BearerAuth
//	@Router		/access-reviews/{id} [put]
func (h *AuditHandler) UpdateAccessReview(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Update access review endpoint"})
}

// CompleteAccessReview completes an access review
//
//	@Summary	Complete access review
//	@Description	Mark an access review as complete (placeholder)
//	@Tags		Access Reviews
//	@Accept		json
//	@Produce	json
//	@Param		id	path	string	true	"Access Review ID"
//	@Success	200	{object}	fiber.Map	"Access review completed placeholder"
//	@Security	BearerAuth
//	@Router		/access-reviews/{id}/complete [post]
func (h *AuditHandler) CompleteAccessReview(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Complete access review endpoint"})
}

// GetSystemStats retrieves system statistics
//
//	@Summary	Get system stats
//	@Description	Retrieve overall system statistics (placeholder)
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"System stats placeholder"
//	@Security	BearerAuth
//	@Router		/admin/stats [get]
func (h *AuditHandler) GetSystemStats(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Get system stats endpoint"})
}

// SystemHealthCheck performs a system health check
//
//	@Summary	System health check
//	@Description	Perform a health check across subsystems (placeholder)
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"System health placeholder"
//	@Security	BearerAuth
//	@Router		/admin/health-check [get]
func (h *AuditHandler) SystemHealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "System health check endpoint"})
}

// EnableMaintenanceMode enables maintenance mode
//
//	@Summary	Enable maintenance mode
//	@Description	Enable maintenance mode restricting operations (placeholder)
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Maintenance mode enabled placeholder"
//	@Security	BearerAuth
//	@Router		/admin/maintenance-mode [post]
func (h *AuditHandler) EnableMaintenanceMode(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Enable maintenance mode endpoint"})
}

// DisableMaintenanceMode disables maintenance mode
//
//	@Summary	Disable maintenance mode
//	@Description	Disable maintenance mode and resume normal operations (placeholder)
//	@Tags		Admin
//	@Accept		json
//	@Produce	json
//	@Success	200	{object}	fiber.Map	"Maintenance mode disabled placeholder"
//	@Security	BearerAuth
//	@Router		/admin/maintenance-mode [delete]
func (h *AuditHandler) DisableMaintenanceMode(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Disable maintenance mode endpoint"})
}
