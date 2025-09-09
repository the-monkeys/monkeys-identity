package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

type OrganizationHandler struct {
	db      *database.DB
	redis   *redis.Client
	logger  *logger.Logger
	queries *queries.Queries
}

func NewOrganizationHandler(db *database.DB, redis *redis.Client, logger *logger.Logger) *OrganizationHandler {
	return &OrganizationHandler{db: db, redis: redis, logger: logger, queries: queries.New(db, redis)}
}

// ListOrganizations lists tenant organizations (paginated)
// ListOrganizations
//
//	@Summary      List organizations
//	@Description  Retrieve paginated list of organizations
//	@Tags         Organization Management
//	@Accept       json
//	@Produce      json
//	@Param        limit   query   int   false  "Items per page (1-1000)"
//	@Param        offset  query   int   false  "Offset for pagination"
//	@Success      200  {object}  SuccessResponse  "Organizations retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid pagination parameters"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations [get]
func (h *OrganizationHandler) ListOrganizations(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)
	if limit < 1 || limit > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_limit", Message: "Limit must be between 1 and 1000"})
	}
	if offset < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_offset", Message: "Offset must be non-negative"})
	}
	res, err := h.queries.Organization.ListOrganizations(queries.ListParams{Limit: limit, Offset: offset})
	if err != nil {
		h.logger.Error("List organizations failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list organizations"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Organizations retrieved", Data: res})
}

// CreateOrganization creates a new organization
// CreateOrganization
//
//	@Summary      Create organization
//	@Description  Create a new organization (tenant)
//	@Tags         Organization Management
//	@Accept       json
//	@Produce      json
//	@Param        request  body    models.Organization  true  "Organization details"
//	@Success      201  {object}  SuccessResponse  "Organization created"
//	@Failure      400  {object}  ErrorResponse    "Validation error"
//	@Failure      409  {object}  ErrorResponse    "Organization already exists"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations [post]
func (h *OrganizationHandler) CreateOrganization(c *fiber.Ctx) error {
	var org models.Organization
	if err := c.BodyParser(&org); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}
	if strings.TrimSpace(org.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "name is required"})
	}
	if org.Slug == "" {
		// naive slug (lowercase, replace spaces)
		org.Slug = strings.ToLower(strings.ReplaceAll(org.Name, " ", "-"))
	}
	if _, err := uuid.Parse(org.Slug); err == nil {
		// It's okay; slug just looks like UUID—still allowed
	}
	if org.ID == "" {
		org.ID = uuid.New().String()
	}
	if org.Status == "" {
		org.Status = "active"
	}
	if org.Metadata == "" {
		org.Metadata = "{}"
	}
	if org.Settings == "" {
		org.Settings = "{}"
	}
	if org.BillingTier == "" {
		org.BillingTier = "free"
	}
	if org.MaxUsers == 0 {
		org.MaxUsers = 100
	}
	if org.MaxResources == 0 {
		org.MaxResources = 1000
	}
	if err := h.queries.Organization.CreateOrganization(&org); err != nil {
		if strings.Contains(err.Error(), "unique") {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{Status: fiber.StatusConflict, Error: "organization_exists", Message: "Organization with this name or slug already exists"})
		}
		h.logger.Error("Create organization failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to create organization"})
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{Status: fiber.StatusCreated, Message: "Organization created", Data: org})
}

// GetOrganization returns a single org by ID
// GetOrganization
//
//	@Summary      Get organization
//	@Description  Retrieve an organization by ID
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Organization retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      404  {object}  ErrorResponse    "Organization not found"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id} [get]
func (h *OrganizationHandler) GetOrganization(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	org, err := h.queries.Organization.GetOrganization(id)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "organization_not_found", Message: "Organization not found"})
		}
		h.logger.Error("Get organization failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to get organization"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Organization retrieved", Data: org})
}

// UpdateOrganization updates basic organization attributes
// UpdateOrganization
//
//	@Summary      Update organization
//	@Description  Update organization attributes
//	@Tags         Organization Management
//	@Accept       json
//	@Produce      json
//	@Param        id       path    string               true  "Organization ID"
//	@Param        request  body    models.Organization  true  "Updated organization"
//	@Success      200  {object}  SuccessResponse  "Organization updated"
//	@Failure      400  {object}  ErrorResponse    "Invalid request"
//	@Failure      404  {object}  ErrorResponse    "Organization not found"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id} [put]
func (h *OrganizationHandler) UpdateOrganization(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	_, err := h.queries.Organization.GetOrganization(id)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "organization_not_found", Message: "Organization not found"})
		}
	}
	var upd models.Organization
	if err := c.BodyParser(&upd); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}
	upd.ID = id
	if upd.Status == "" {
		upd.Status = "active"
	}
	if err := h.queries.Organization.UpdateOrganization(&upd); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "organization_not_found", Message: "Organization not found or deleted"})
		}
		h.logger.Error("Update organization failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to update organization"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Organization updated", Data: upd})
}

// DeleteOrganization soft deletes an organization
// DeleteOrganization
//
//	@Summary      Delete organization
//	@Description  Soft delete an organization
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Organization deleted"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      404  {object}  ErrorResponse    "Organization not found"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id} [delete]
func (h *OrganizationHandler) DeleteOrganization(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	if err := h.queries.Organization.DeleteOrganization(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "organization_not_found", Message: "Organization not found"})
		}
		h.logger.Error("Delete organization failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to delete organization"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Organization deleted", Data: fiber.Map{"organization_id": id, "deleted_at": time.Now()}})
}

// GetOrganizationUsers
//
//	@Summary      List organization users
//	@Description  List all users belonging to an organization
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Users retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id}/users [get]
func (h *OrganizationHandler) GetOrganizationUsers(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	users, err := h.queries.Organization.ListOrganizationUsers(orgID)
	if err != nil {
		h.logger.Error("List org users failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list users"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Users retrieved", Data: fiber.Map{"organization_id": orgID, "users": users, "count": len(users)}})
}

// GetOrganizationGroups
//
//	@Summary      List organization groups
//	@Description  List all groups belonging to an organization
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Groups retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id}/groups [get]
func (h *OrganizationHandler) GetOrganizationGroups(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	groups, err := h.queries.Organization.ListOrganizationGroups(orgID)
	if err != nil {
		h.logger.Error("List org groups failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list groups"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Groups retrieved", Data: fiber.Map{"organization_id": orgID, "groups": groups, "count": len(groups)}})
}

// GetOrganizationResources
//
//	@Summary      List organization resources
//	@Description  List all resources owned by an organization
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Resources retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id}/resources [get]
func (h *OrganizationHandler) GetOrganizationResources(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	resources, err := h.queries.Organization.ListOrganizationResources(orgID)
	if err != nil {
		h.logger.Error("List org resources failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list resources"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Resources retrieved", Data: fiber.Map{"organization_id": orgID, "resources": resources, "count": len(resources)}})
}

// GetOrganizationPolicies
//
//	@Summary      List organization policies
//	@Description  List all policies within an organization
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Policies retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id}/policies [get]
func (h *OrganizationHandler) GetOrganizationPolicies(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	policies, err := h.queries.Organization.ListOrganizationPolicies(orgID)
	if err != nil {
		h.logger.Error("List org policies failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list policies"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Policies retrieved", Data: fiber.Map{"organization_id": orgID, "policies": policies, "count": len(policies)}})
}

// GetOrganizationRoles
//
//	@Summary      List organization roles
//	@Description  List all roles defined in an organization
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Roles retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id}/roles [get]
func (h *OrganizationHandler) GetOrganizationRoles(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	roles, err := h.queries.Organization.ListOrganizationRoles(orgID)
	if err != nil {
		h.logger.Error("List org roles failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to list roles"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Roles retrieved", Data: fiber.Map{"organization_id": orgID, "roles": roles, "count": len(roles)}})
}

// GetOrganizationSettings
//
//	@Summary      Get organization settings
//	@Description  Retrieve settings JSON for an organization
//	@Tags         Organization Management
//	@Produce      json
//	@Param        id  path  string  true  "Organization ID"
//	@Success      200  {object}  SuccessResponse  "Settings retrieved"
//	@Failure      400  {object}  ErrorResponse    "Invalid organization ID"
//	@Failure      404  {object}  ErrorResponse    "Organization not found"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id}/settings [get]
func (h *OrganizationHandler) GetOrganizationSettings(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	settings, err := h.queries.Organization.GetOrganizationSettings(orgID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "organization_not_found", Message: "Organization not found"})
		}
		h.logger.Error("Get org settings failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to get settings"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Settings retrieved", Data: fiber.Map{"organization_id": orgID, "settings": settings}})
}

type updateSettingsRequest struct {
	Settings string `json:"settings"`
}

// UpdateOrganizationSettings
//
//	@Summary      Update organization settings
//	@Description  Update settings JSON for an organization
//	@Tags         Organization Management
//	@Accept       json
//	@Produce      json
//	@Param        id       path    string                true  "Organization ID"
//	@Param        request  body    updateSettingsRequest true  "Updated settings payload"
//	@Success      200  {object}  SuccessResponse  "Settings updated"
//	@Failure      400  {object}  ErrorResponse    "Invalid request"
//	@Failure      404  {object}  ErrorResponse    "Organization not found"
//	@Failure      500  {object}  ErrorResponse    "Internal server error"
//	@Security     BearerAuth
//	@Router       /organizations/{id}/settings [put]
func (h *OrganizationHandler) UpdateOrganizationSettings(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_id", Message: "Organization ID required"})
	}
	var req updateSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "invalid_request_body", Message: "Failed to parse request body"})
	}
	if strings.TrimSpace(req.Settings) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Status: fiber.StatusBadRequest, Error: "validation_failed", Message: "settings is required"})
	}
	if err := h.queries.Organization.UpdateOrganizationSettings(orgID, req.Settings); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Status: fiber.StatusNotFound, Error: "organization_not_found", Message: "Organization not found"})
		}
		h.logger.Error("Update org settings failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Status: fiber.StatusInternalServerError, Error: "internal_server_error", Message: "Failed to update settings"})
	}
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Settings updated", Data: fiber.Map{"organization_id": orgID}})
}

// Global settings (system-wide) placeholders — real implementation would use a dedicated table
// GetGlobalSettings
//
//	@Summary      Get global settings
//	@Description  Retrieve system-wide global settings
//	@Tags         System Administration
//	@Produce      json
//	@Success      200  {object}  SuccessResponse  "Global settings retrieved"
//	@Security     BearerAuth
//	@Router       /admin/settings [get]
func (h *OrganizationHandler) GetGlobalSettings(c *fiber.Ctx) error {
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Global settings retrieved", Data: fiber.Map{"settings": fiber.Map{"maintenance_mode": false}}})
}

// UpdateGlobalSettings
//
//	@Summary      Update global settings
//	@Description  Update system-wide global settings
//	@Tags         System Administration
//	@Accept       json
//	@Produce      json
//	@Success      200  {object}  SuccessResponse  "Global settings updated"
//	@Security     BearerAuth
//	@Router       /admin/settings [put]
func (h *OrganizationHandler) UpdateGlobalSettings(c *fiber.Ctx) error {
	return c.JSON(SuccessResponse{Status: fiber.StatusOK, Message: "Global settings updated", Data: fiber.Map{"updated": true}})
}
