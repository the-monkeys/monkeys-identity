// Package middleware provides HTTP middleware for the Monkeys IAM service.
//
// The tenant middleware implements multi-tenant authorization at the middleware level,
// ensuring organization-level access control is enforced consistently across all
// routes without requiring individual handlers to implement authorization logic.
//
// Architecture:
//
//	Request → RequireAuth (JWT) → ResolveTenant → [Authorization Guard] → Handler
//
// The TenantContext is resolved once per request from JWT claims and provides
// methods for authorization decisions throughout the request lifecycle. The system
// organization is resolved by slug at startup (not hardcoded by UUID) and cached.
package middleware

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// ---------------------------------------------------------------------------
// Well-known organization slugs
// ---------------------------------------------------------------------------

// These slugs are conventions established by the seed migrations and form part
// of the application's data contract. They are never hardcoded as UUIDs.
const (
	SystemOrgSlug  = "system"  // Root-level org for superadmin operations
	DefaultOrgSlug = "default" // Default org seeded for initial setup
)

// InternalOrgSlugs returns slugs of organizations that should not be exposed
// in public-facing listings. These are system-internal organizations.
func InternalOrgSlugs() []string {
	return []string{SystemOrgSlug, DefaultOrgSlug}
}

// IsInternalOrg reports whether the given slug belongs to a system-internal
// organization that should be hidden from non-root users.
func IsInternalOrg(slug string) bool {
	for _, s := range InternalOrgSlugs() {
		if s == slug {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// TenantContext
// ---------------------------------------------------------------------------

// TenantContext represents the resolved authorization context for the current
// request. It is computed once by the ResolveTenant middleware and provides
// methods for authorization decisions throughout the request lifecycle.
//
// Handlers retrieve it via GetTenantContext(c) and use its methods instead of
// making raw c.Locals() calls or embedding authorization logic.
type TenantContext struct {
	UserID         string `json:"user_id"`
	Email          string `json:"email"`
	OrganizationID string `json:"organization_id"`
	Role           string `json:"role"`
	SessionID      string `json:"session_id"`
	IsRoot         bool   `json:"is_root"`
}

const tenantContextKey = "tenant_context"

// GetTenantContext retrieves the TenantContext from the request.
// Returns nil if the ResolveTenant middleware has not run.
func GetTenantContext(c *fiber.Ctx) *TenantContext {
	tc, _ := c.Locals(tenantContextKey).(*TenantContext)
	return tc
}

// CanAccessOrg reports whether this tenant is authorized to access the given
// organization. Root users can access any organization; non-root users can
// only access their own.
func (tc *TenantContext) CanAccessOrg(orgID string) bool {
	if tc.IsRoot {
		return true
	}
	return tc.OrganizationID == orgID
}

// CanAdminOrg reports whether this tenant can perform administrative operations
// on the given organization. Root users always can; non-root users must be an
// admin of that specific organization.
func (tc *TenantContext) CanAdminOrg(orgID string) bool {
	if tc.IsRoot {
		return true
	}
	return tc.OrganizationID == orgID && tc.isAdminRole()
}

// OrgFilter returns the organization ID that queries should be scoped to.
// Returns an empty string for root users, meaning "no filter — access all".
// Handlers pass this to query methods for automatic tenant scoping.
func (tc *TenantContext) OrgFilter() string {
	if tc.IsRoot {
		return ""
	}
	return tc.OrganizationID
}

// isAdminRole reports whether the tenant's role grants administrative privileges.
func (tc *TenantContext) isAdminRole() bool {
	return tc.Role == "admin" || tc.Role == "org-admin"
}

// ---------------------------------------------------------------------------
// TenantMiddleware
// ---------------------------------------------------------------------------

// TenantMiddleware provides multi-tenant authorization middleware.
// It resolves the system organization at startup and uses it to determine
// root user status without hardcoding any UUIDs.
type TenantMiddleware struct {
	systemOrgID string // resolved from DB at startup, cached
}

// NewTenantMiddleware creates a new TenantMiddleware. The systemOrgID should
// be resolved at startup via ResolveSystemOrgID.
func NewTenantMiddleware(systemOrgID string) *TenantMiddleware {
	return &TenantMiddleware{systemOrgID: systemOrgID}
}

// ResolveTenant resolves the tenant context from the authenticated user's JWT
// claims. It must run after RequireAuth middleware which sets the Locals values.
//
// This middleware sets a TenantContext that downstream middleware and handlers
// use for authorization decisions, eliminating the need for handlers to perform
// raw role/org checks.
func (tm *TenantMiddleware) ResolveTenant() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("user_id").(string)
		email, _ := c.Locals("email").(string)
		orgID, _ := c.Locals("organization_id").(string)
		role, _ := c.Locals("role").(string)
		sessionID, _ := c.Locals("session_id").(string)

		if userID == "" || orgID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Authentication context incomplete",
				"success": false,
			})
		}

		tc := &TenantContext{
			UserID:         userID,
			Email:          email,
			OrganizationID: orgID,
			Role:           role,
			SessionID:      sessionID,
			IsRoot:         tm.systemOrgID != "" && orgID == tm.systemOrgID,
		}

		c.Locals(tenantContextKey, tc)
		return c.Next()
	}
}

// RequireOrgAccess ensures the caller can access the organization specified by
// the :id route parameter. Root users can access any org; non-root users can
// only access their own organization.
func (tm *TenantMiddleware) RequireOrgAccess() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tc := GetTenantContext(c)
		if tc == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Tenant context not resolved",
				"success": false,
			})
		}

		targetOrgID := c.Params("id")
		if targetOrgID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "Organization ID is required",
				"success": false,
			})
		}

		if !tc.CanAccessOrg(targetOrgID) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Access denied: you do not have access to this organization",
				"success": false,
			})
		}

		return c.Next()
	}
}

// RequireOrgAdmin ensures the caller has admin privileges for the organization
// specified by the :id route parameter. Root users always pass. Org admins pass
// only for their own organization.
func (tm *TenantMiddleware) RequireOrgAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tc := GetTenantContext(c)
		if tc == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Tenant context not resolved",
				"success": false,
			})
		}

		targetOrgID := c.Params("id")
		if targetOrgID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "Organization ID is required",
				"success": false,
			})
		}

		if !tc.CanAdminOrg(targetOrgID) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Access denied: admin privileges required for this organization",
				"success": false,
			})
		}

		return c.Next()
	}
}

// RequireAdmin ensures the caller has an admin role (admin or org-admin) or is
// a root user. Use this for routes that don't target a specific org, e.g.
// listing organizations.
func (tm *TenantMiddleware) RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tc := GetTenantContext(c)
		if tc == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Tenant context not resolved",
				"success": false,
			})
		}

		if !tc.IsRoot && !tc.isAdminRole() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Access denied: admin role required",
				"success": false,
			})
		}

		return c.Next()
	}
}

// RequireRoot ensures the caller is a root user (belongs to the system org).
// Use sparingly — only for operations that must be restricted to the platform
// operator, such as creating new organizations or system-wide configuration.
func (tm *TenantMiddleware) RequireRoot() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tc := GetTenantContext(c)
		if tc == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Tenant context not resolved",
				"success": false,
			})
		}

		if !tc.IsRoot {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Access denied: root privileges required",
				"success": false,
			})
		}

		return c.Next()
	}
}

// ---------------------------------------------------------------------------
// System organization resolver
// ---------------------------------------------------------------------------

const (
	systemOrgCacheKey = "iam:system_org_id"
	systemOrgCacheTTL = 24 * time.Hour
)

// ResolveSystemOrgID discovers the system organization's UUID by its well-known
// slug. The slug is a semantic convention set by the seed migration — this
// function ensures no UUIDs are ever hardcoded in application code.
//
// The resolved ID is cached in Redis so subsequent restarts are fast.
// If the system org does not exist (e.g. migrations haven't run), an empty
// string is returned and root-user detection is disabled gracefully.
func ResolveSystemOrgID(ctx context.Context, db *sql.DB, redisClient *redis.Client, slug string) string {
	// Try Redis cache first
	if redisClient != nil {
		cached, err := redisClient.Get(ctx, systemOrgCacheKey).Result()
		if err == nil && cached != "" {
			return cached
		}
	}

	// Query DB by slug
	var orgID string
	err := db.QueryRowContext(ctx,
		"SELECT id FROM organizations WHERE slug = $1 AND status = 'active'",
		slug,
	).Scan(&orgID)

	if err != nil {
		// System org not found — root detection disabled. This is not fatal;
		// it just means no user will be treated as root.
		fmt.Printf("[tenant] system organization (slug=%q) not found: %v\n", slug, err)
		return ""
	}

	// Cache for fast lookups
	if redisClient != nil {
		redisClient.Set(ctx, systemOrgCacheKey, orgID, systemOrgCacheTTL)
	}

	return orgID
}
