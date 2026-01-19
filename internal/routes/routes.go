package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/handlers"
	"github.com/the-monkeys/monkeys-identity/internal/middleware"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

func SetupRoutes(
	api fiber.Router,
	db *database.DB,
	redis *redis.Client,
	logger *logger.Logger,
	cfg *config.Config,
) {
	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(cfg.JWTSecret)

	// Initialize queries
	q := queries.New(db, redis)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(q, redis, logger, cfg)
	userHandler := handlers.NewUserHandler(q, logger)
	organizationHandler := handlers.NewOrganizationHandler(db, redis, logger)
	groupHandler := handlers.NewGroupHandler(db, redis, logger)
	resourceHandler := handlers.NewResourceHandler(db, redis, logger)
	policyHandler := handlers.NewPolicyHandler(db, redis, logger)
	roleHandler := handlers.NewRoleHandler(db, redis, logger)
	sessionHandler := handlers.NewSessionHandler(db, redis, logger)

	// Create queries instance for audit handler
	queries := queries.New(db, redis)
	auditHandler := handlers.NewAuditHandler(queries, logger)

	// Public routes (no authentication required)
	public := api.Group("/public")
	public.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "monkeys-iam"})
	})
	public.Get("/organizations", organizationHandler.ListPublicOrganizations)

	// Authentication routes
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/register", authHandler.Register)
	auth.Post("/refresh", authHandler.RefreshToken)
	auth.Post("/logout", authMiddleware.RequireAuth(), authHandler.Logout)
	auth.Post("/forgot-password", authHandler.ForgotPassword)
	auth.Post("/reset-password", authHandler.ResetPassword)
	auth.Post("/verify-email", authHandler.VerifyEmail)
	auth.Post("/resend-verification", authHandler.ResendVerification)

	// Bootstrap admin creation (no auth required for initial setup)
	auth.Post("/create-admin", authHandler.CreateAdminUser)

	// MFA routes
	mfa := auth.Group("/mfa")
	mfa.Post("/setup", authMiddleware.RequireAuth(), authHandler.SetupMFA)
	mfa.Post("/verify", authMiddleware.RequireAuth(), authHandler.VerifyMFA)
	mfa.Post("/backup-codes", authMiddleware.RequireAuth(), authHandler.GenerateBackupCodes)
	mfa.Delete("/disable", authMiddleware.RequireAuth(), authHandler.DisableMFA)

	// Protected routes (authentication required)
	protected := api.Group("/", authMiddleware.RequireAuth())

	// User management routes
	users := protected.Group("/users")
	users.Get("/", userHandler.ListUsers)
	users.Post("/", authMiddleware.RequireRole("admin"), userHandler.CreateUser)
	users.Get("/:id", userHandler.GetUser)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", authMiddleware.RequireRole("admin"), userHandler.DeleteUser)
	users.Get("/:id/profile", userHandler.GetUserProfile)
	users.Put("/:id/profile", userHandler.UpdateUserProfile)
	users.Post("/:id/suspend", authMiddleware.RequireRole("admin"), userHandler.SuspendUser)
	users.Post("/:id/activate", authMiddleware.RequireRole("admin"), userHandler.ActivateUser)
	users.Get("/:id/sessions", userHandler.GetUserSessions)
	users.Delete("/:id/sessions", userHandler.RevokeUserSessions)

	// Organization management routes
	orgs := protected.Group("/organizations")
	orgs.Get("/", organizationHandler.ListOrganizations)
	orgs.Post("/", authMiddleware.RequireRole("admin"), organizationHandler.CreateOrganization)
	orgs.Get("/:id", organizationHandler.GetOrganization)
	orgs.Put("/:id", authMiddleware.RequireRole("admin"), organizationHandler.UpdateOrganization)
	orgs.Delete("/:id", authMiddleware.RequireRole("admin"), organizationHandler.DeleteOrganization)
	orgs.Get("/:id/users", organizationHandler.GetOrganizationUsers)
	orgs.Get("/:id/groups", organizationHandler.GetOrganizationGroups)
	orgs.Get("/:id/resources", organizationHandler.GetOrganizationResources)
	orgs.Get("/:id/policies", organizationHandler.GetOrganizationPolicies)
	orgs.Get("/:id/roles", organizationHandler.GetOrganizationRoles)
	orgs.Get("/:id/settings", organizationHandler.GetOrganizationSettings)
	orgs.Put("/:id/settings", authMiddleware.RequireRole("admin"), organizationHandler.UpdateOrganizationSettings)

	// Group management routes
	groups := protected.Group("/groups")
	groups.Get("/", groupHandler.ListGroups)
	groups.Post("/", authMiddleware.RequireRole("admin"), groupHandler.CreateGroup)
	groups.Get("/:id", groupHandler.GetGroup)
	groups.Put("/:id", authMiddleware.RequireRole("admin"), groupHandler.UpdateGroup)
	groups.Delete("/:id", authMiddleware.RequireRole("admin"), groupHandler.DeleteGroup)
	groups.Get("/:id/members", groupHandler.GetGroupMembers)
	groups.Post("/:id/members", authMiddleware.RequireRole("admin"), groupHandler.AddGroupMember)
	groups.Delete("/:id/members/:user_id", authMiddleware.RequireRole("admin"), groupHandler.RemoveGroupMember)
	groups.Get("/:id/permissions", groupHandler.GetGroupPermissions)

	// Resource management routes
	resources := protected.Group("/resources")
	resources.Get("/", resourceHandler.ListResources)
	resources.Post("/", resourceHandler.CreateResource)
	resources.Get("/:id", resourceHandler.GetResource)
	resources.Put("/:id", resourceHandler.UpdateResource)
	resources.Delete("/:id", resourceHandler.DeleteResource)
	resources.Get("/:id/permissions", resourceHandler.GetResourcePermissions)
	resources.Post("/:id/permissions", authMiddleware.RequireRole("admin"), resourceHandler.SetResourcePermissions)
	resources.Get("/:id/access-log", resourceHandler.GetResourceAccessLog)
	resources.Post("/:id/share", resourceHandler.ShareResource)
	resources.Delete("/:id/share", resourceHandler.UnshareResource)

	// Policy management routes
	policies := protected.Group("/policies")
	policies.Get("/", policyHandler.ListPolicies)
	policies.Post("/", authMiddleware.RequireRole("admin"), policyHandler.CreatePolicy)
	policies.Get("/:id", policyHandler.GetPolicy)
	policies.Put("/:id", authMiddleware.RequireRole("admin"), policyHandler.UpdatePolicy)
	policies.Delete("/:id", authMiddleware.RequireRole("admin"), policyHandler.DeletePolicy)
	policies.Post("/:id/simulate", policyHandler.SimulatePolicy)
	policies.Get("/:id/versions", policyHandler.GetPolicyVersions)
	policies.Post("/:id/approve", authMiddleware.RequireRole("admin"), policyHandler.ApprovePolicy)
	policies.Post("/:id/rollback", authMiddleware.RequireRole("admin"), policyHandler.RollbackPolicy)

	// Role management routes
	roles := protected.Group("/roles")
	roles.Get("/", roleHandler.ListRoles)
	roles.Post("/", authMiddleware.RequireRole("admin"), roleHandler.CreateRole)
	roles.Get("/:id", roleHandler.GetRole)
	roles.Put("/:id", authMiddleware.RequireRole("admin"), roleHandler.UpdateRole)
	roles.Delete("/:id", authMiddleware.RequireRole("admin"), roleHandler.DeleteRole)
	roles.Get("/:id/policies", roleHandler.GetRolePolicies)
	roles.Post("/:id/policies", authMiddleware.RequireRole("admin"), roleHandler.AttachPolicyToRole)
	roles.Delete("/:id/policies/:policy_id", authMiddleware.RequireRole("admin"), roleHandler.DetachPolicyFromRole)
	roles.Get("/:id/assignments", roleHandler.GetRoleAssignments)
	roles.Post("/:id/assign", authMiddleware.RequireRole("admin"), roleHandler.AssignRole)
	roles.Delete("/:id/assign/:user_id", authMiddleware.RequireRole("admin"), roleHandler.UnassignRole)

	// Session management routes
	sessions := protected.Group("/sessions")
	sessions.Get("/", sessionHandler.ListSessions)
	sessions.Get("/current", sessionHandler.GetCurrentSession)
	sessions.Delete("/current", sessionHandler.RevokeCurrentSession)
	sessions.Get("/:id", sessionHandler.GetSession)
	sessions.Delete("/:id", authMiddleware.RequireRole("admin"), sessionHandler.RevokeSession)
	sessions.Post("/:id/extend", sessionHandler.ExtendSession)

	// Service Account routes
	serviceAccounts := protected.Group("/service-accounts")
	serviceAccounts.Get("/", authMiddleware.RequireRole("admin"), userHandler.ListServiceAccounts)
	serviceAccounts.Post("/", authMiddleware.RequireRole("admin"), userHandler.CreateServiceAccount)
	serviceAccounts.Get("/:id", userHandler.GetServiceAccount)
	serviceAccounts.Put("/:id", authMiddleware.RequireRole("admin"), userHandler.UpdateServiceAccount)
	serviceAccounts.Delete("/:id", authMiddleware.RequireRole("admin"), userHandler.DeleteServiceAccount)
	serviceAccounts.Post("/:id/keys", authMiddleware.RequireRole("admin"), userHandler.GenerateAPIKey)
	serviceAccounts.Get("/:id/keys", userHandler.ListAPIKeys)
	serviceAccounts.Delete("/:id/keys/:key_id", authMiddleware.RequireRole("admin"), userHandler.RevokeAPIKey)
	serviceAccounts.Post("/:id/rotate-keys", authMiddleware.RequireRole("admin"), userHandler.RotateServiceAccountKeys)

	// Authorization & Permission checking routes
	authz := protected.Group("/authz")
	authz.Post("/check", policyHandler.CheckPermission)
	authz.Post("/bulk-check", policyHandler.BulkCheckPermissions)
	authz.Get("/effective-permissions", policyHandler.GetEffectivePermissions)
	authz.Post("/simulate-access", policyHandler.SimulateAccess)

	// Audit and Compliance routes
	audit := protected.Group("/audit")
	audit.Get("/events", authMiddleware.RequireRole("admin"), auditHandler.ListAuditEvents)
	audit.Get("/events/:id", authMiddleware.RequireRole("admin"), auditHandler.GetAuditEvent)
	audit.Get("/reports/access", authMiddleware.RequireRole("admin"), auditHandler.GenerateAccessReport)
	audit.Get("/reports/compliance", authMiddleware.RequireRole("admin"), auditHandler.GenerateComplianceReport)
	audit.Get("/reports/policy-usage", authMiddleware.RequireRole("admin"), auditHandler.GeneratePolicyUsageReport)

	// Access Reviews routes
	reviews := protected.Group("/access-reviews")
	reviews.Get("/", authMiddleware.RequireRole("admin"), auditHandler.ListAccessReviews)
	reviews.Post("/", authMiddleware.RequireRole("admin"), auditHandler.CreateAccessReview)
	reviews.Get("/:id", authMiddleware.RequireRole("admin"), auditHandler.GetAccessReview)
	reviews.Put("/:id", authMiddleware.RequireRole("admin"), auditHandler.UpdateAccessReview)
	reviews.Post("/:id/complete", authMiddleware.RequireRole("admin"), auditHandler.CompleteAccessReview)

	// Admin routes (super admin only)
	admin := protected.Group("/admin", authMiddleware.RequireRole("admin"))
	admin.Get("/stats", auditHandler.GetSystemStats)
	admin.Get("/health-check", auditHandler.SystemHealthCheck)
	admin.Post("/maintenance-mode", auditHandler.EnableMaintenanceMode)
	admin.Delete("/maintenance-mode", auditHandler.DisableMaintenanceMode)
	admin.Get("/settings", organizationHandler.GetGlobalSettings)
	admin.Put("/settings", organizationHandler.UpdateGlobalSettings)
}
