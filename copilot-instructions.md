# Monkeys Identity (IAM) – Copilot Instructions

These instructions guide AI pair-programming assistants (like GitHub Copilot / ChatGPT) to work effectively in this repository. Keep responses concise, prefer diffs/patches over large rewrites, and preserve existing patterns.

---
## 1. High-Level Architecture
- Language: Go 1.21
- Framework: Fiber (HTTP server, routing, middleware) – see `cmd/server/main.go`
- Layers:
  1. **Handlers** (`internal/handlers/*`): HTTP endpoint logic, request parsing, validation, response shaping.
  2. **Queries** (`internal/queries/*`): Data-access layer wrapping SQL (currently using `database/sql` via `*sql.DB`). Keep business-neutral; avoid HTTP concerns.
  3. **Models** (`internal/models/models.go`): Data structures matching DB schema (structs, enums, DTO-like objects).
  4. **Middleware** (`internal/middleware/*`): Auth (JWT), role gating, error normalization.
  5. **Database** (`internal/database/database.go` + `schema.sql`): PostgreSQL schema + Redis client builder.
  6. **Config & Logging** (`internal/config`, `pkg/logger`): Environment-driven configuration + leveled logging.
- Auth: JWT (access + refresh); claims stored as context locals (`user_id`, `organization_id`, `role`, etc.).
- RBAC + Policy Model: Roles ↔ Policies (attach/detach), Roles ↔ Principals (assign/unassign). Principals include users (future: groups, service accounts). Policy evaluation groundwork exists in SQL (functions & views), but not fully surfaced yet.

## 1.1 Repository File & Directory Structure
```
monkeys-identity/
  API.md                     # Human-readable endpoint catalogue (partially aspirational)
  README.md                  # Project overview / setup
  docker-compose.yml         # Local service orchestration (Postgres/Redis expected)
  Dockerfile                 # Container build for the API service
  Makefile                   # (Future) build/test convenience targets (currently minimal or placeholder)
  schema.sql                 # Canonical database schema (DDL, triggers, functions)
  init-data-corrected.sql    # Seed / bootstrap data (roles, policies, test users)
  copilot-instructions.md    # This guidance file
  cmd/
    server/
      main.go                # Application entrypoint: Fiber app, middleware, route registration
  internal/
    config/
      config.go              # Environment configuration loader (ports, secrets, DSNs)
    database/
      database.go            # Postgres & Redis connection constructors
    handlers/
      auth.go                # Auth-related endpoints (login/register/refresh, MFA placeholders)
      handlers.go            # Aggregated domain handlers (roles policies assignments implemented here)
      organization.go        # Organization CRUD logic
      responses.go           # Shared response / request DTO structs
      user.go                # User CRUD endpoints
    middleware/
      auth.go                # JWT parsing, RequireAuth/OptionalAuth/RequireRole
      error.go               # Central error handler (slightly different envelope)
    models/
      models.go              # Core domain structs mirroring DB tables
    queries/
      auth.go                # Auth-specific DB lookups (users by email, refresh token logic if added later)
      placeholders.go        # Stubs for yet-unimplemented domains (expand gradually)
      queries.go             # Possibly shared query helpers / base patterns
      role.go                # Role, policy attachment, and assignment queries
      user.go                # User persistence layer functions
    routes/
      routes.go              # HTTP route definitions grouping versioned API endpoints
  pkg/
    logger/
      logger.go              # Simple leveled logger abstraction
  docs/
    docs.go                  # (If using swag) swagger annotations entrypoint
    swagger.yaml             # OpenAPI specification (source of truth)
    swagger.json             # Generated/compiled spec (served via swagger UI)
  documents/
    CURL_API_DOCUMENTATION.md # Example curl usage patterns
    DATABASE_DOCUMENTATION.md # DB-focused description or walkthrough
  .env.example               # Example environment configuration template
  go.mod                     # Module definition & dependencies
  go.sum                     # Dependency checksums
```
Notes:
- `documents/` is auxiliary human documentation; `docs/` is API spec/tooling related.
- Some endpoints listed in `API.md` are not yet implemented in code (sessions, audit, access reviews). Keep this file synchronized.
- `placeholders.go` in queries marks where to add concrete DB logic next; avoid stuffing unrelated queries into existing files.
- Consider introducing a `migrations/` directory if/when schema evolves beyond the current monolithic `schema.sql`.

---
## 2. Key Conventions
- **Error Handling**: Handlers return JSON using `ErrorResponse` & `SuccessResponse` (see `internal/handlers/responses.go`). Global `ErrorHandler` in middleware uses a slightly different envelope – prefer harmonizing toward `success: false, error: { message, code }` going forward.
- **Logging**: Use `logger.FromContext(c)` pattern if added later; currently simple `logger.Info("msg")` style. IMPORTANT: Logger methods expect a format string when passing extra args: `logger.Error("failed to create user: %v", err)`.
- **UUID Validation**: Always validate path/body IDs using `uuid.Parse` (import from `github.com/google/uuid`). Respond with HTTP 400 on invalid UUID.
- **Idempotency**: Attach/Assign operations should succeed harmlessly if relation already exists (return existing state rather than 409). Detach/Unassign should return 404 if target relation does not exist.
- **Context Locals**: Authentication middleware sets: `user_id`, `organization_id`, `email`, `role`. Only rely on these after `RequireAuth` or optionally null-check when using `OptionalAuth`.
- **Time Fields**: Use `time.Now().UTC()` for timestamps. DB schema stores `TIMESTAMPTZ`.
- **Soft Deletes**: Schema filters often rely on `status != 'deleted'`; when implementing delete handlers prefer updating status + `deleted_at` rather than hard delete (if pattern emerges).

---
## 3. Adding New Handlers
Checklist for new endpoints:
1. Define route in `internal/routes/routes.go` under the correct group (respect version prefix `/api/v1`).
2. Implement a method on the appropriate handler struct (create a new handler type if domain grows large). Keep function name descriptive (e.g., `GetUserSessions`).
3. Parse & validate input: use inline lightweight request struct or create a dedicated one if reused. Return 400 on malformed input.
4. Call query-layer method. Do not embed SQL in handlers.
5. Distinguish errors:
   - Not found → 404
   - Validation/business precondition → 400 (or 422 when field-level validation introduced)
   - Auth issues → 401 / 403
   - Unexpected DB or logic errors → 500 (log them with stack context if available)
6. Return `SuccessResponse{ Success: true, Data: ... }`.
7. Add Swagger/OpenAPI (future): update `docs/swagger.yaml` keeping tags consistent.
8. Add unit test (when test harness added) focusing on: happy path, invalid ID, not found.

Minimal handler template:
```go
func (h *ThingHandler) GetThing(c *fiber.Ctx) error {
    idParam := c.Params("id")
    id, err := uuid.Parse(idParam)
    if err != nil { return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse("invalid id")) }
    thing, err := h.queries.Thing.Get(id)
    if errors.Is(err, sql.ErrNoRows) { return c.Status(fiber.StatusNotFound).JSON(ErrorResponse("thing not found")) }
    if err != nil { logger.Error("fetch thing failed: %v", err); return c.Status(500).JSON(ErrorResponse("internal error")) }
    return c.JSON(Success(thing))
}
```

---
## 4. Query Layer Guidelines
- Keep functions focused: one responsibility, narrow parameter list.
- Use context-aware versions (`db.QueryContext`) if context plumbed later.
- Return domain-specific errors (wrap sentinel errors) rather than string compares when we refactor.
- Avoid leaking presentation concerns (no Fiber types here).
- Prefer returning typed structs over `map[string]any`.

Future improvement pattern:
```go
var ErrRoleNotFound = errors.New("role_not_found")
```
Handlers then map this to 404.

---
## 5. Database Schema Notes
- Core tables: users, organizations, roles, policies, role_policies, role_assignments, resources, groups, sessions, api_keys, audit_events, access_reviews.
- Relationship tables (join): `role_policies`, `role_assignments` include audit metadata (`attached_by`, `assigned_by`).
- Use server-generated UUIDs (Go side) or DB default (if added later) – currently code generates UUIDs before insert.
- Policy model: `document JSONB` field holds policy statements; maintain strict structure to ease evaluation.
- Add migrations (recommended) if schema evolves – currently a single `schema.sql` snapshot + seed file.

---
## 6. Authentication & Authorization
- JWT secret from config (env). Rotation not implemented yet – introducing kid + JWKS would be future step.
- `RequireRole` middleware is simple string allow-list; does not evaluate dynamic policy rules.
- To add fine-grained permission checks: create a helper `authz.Check(c, action, resource)` that calls a query invoking a DB function (e.g., `check_user_permission`). Cache negative/positive results in Redis for short TTL.

---
## 7. Logging Practices
- Use structured context when logger evolves; for now stick to clear, actionable messages: `logger.Info("created role %s", role.ID)`.
- Always include `%v` or `%s` placeholder when logging dynamic values.
- Avoid logging secrets (tokens, passwords, raw policy documents containing sensitive data).

---
## 8. Error & Response Helpers
(Recommended enhancement) Add helpers in `internal/handlers/responses.go`:
```go
func Error(msg string, code int) *ErrorResponse { return &ErrorResponse{Success: false, Error: ErrorDetail{Message: msg, Code: code}} }
func Success(data any) *SuccessResponse { return &SuccessResponse{Success: true, Data: data} }
```
Use them to reduce duplication. Keep envelope consistent across middleware and handlers.

---
## 9. Security Considerations / TODOs
- Enforce auth on mutating endpoints (currently some may rely on OptionalAuth).
- Add organization boundary checks: verify `organization_id` in token matches target resource/org where applicable.
- Implement token revocation (store refresh tokens / jti in Redis; revoke on logout/password change).
- Add rate limiting middleware (API doc mentions, code does not yet implement).
- Validate policy documents against a JSON Schema before insertion.
- MFA endpoints are placeholders – integrate TOTP (e.g., using `github.com/pquerna/otp`) and recovery codes.

---
## 10. Testing Strategy (to be built)
Planned layers:
- Unit tests for query methods (use ephemeral test DB + migrations).
- Handler tests via Fiber’s `app.Test()` with in-memory dependencies or a dedicated test Postgres schema.
- Table-driven style; keep fixtures minimal.
- Consider golden files for policy evaluation scenarios later.

Suggested directory structure when added:
```
/internal/tests/
  handlers/
  queries/
  fixtures/
```

---
## 11. Swagger / API Spec Alignment
- Current `API.md` lists endpoints; some are aspirational (not fully implemented yet: sessions, audit, access review, websocket events, etc.). Keep spec honest—only document what exists unless clearly marked as planned.
- When adding endpoints: update `docs/swagger.yaml` & regenerate `swagger.json` if using `swag` (add directives in handler comments if adopting `swaggo/swag`).

---
## 12. Performance & Scalability Notes
- Use DB indexes for high-frequency lookups (role assignments by principal, policy attachments by role). Add migrations to create them explicitly.
- Future: cache resolved effective permissions/materialized view refresh scheduling.
- Consider background job to refresh materialized permission views if evaluation cost grows.

---
## 13. Typical Extension Flow Example
Adding "List Role Assignments for Principal":
1. Route: `GET /api/v1/principals/:id/roles`
2. Query method: `queries.Role.GetAssignmentsForPrincipal(principalID)`
3. Handler: validate UUID, call query, map to response.
4. Tests: existing assignment, unknown principal.
5. Docs: add to `API.md` + swagger.
6. Security: ensure requesting user can view (same org or admin).

---
## 14. Style & Code Quality Rules
- Keep functions under ~80 LOC; extract helpers if longer.
- Avoid panics in handlers; return JSON error instead.
- Prefer explicit over magic (no global hidden state; pass dependencies through handler structs).
- Keep imports grouped: stdlib, third-party, internal.
- Run `go fmt` and `go vet` equivalents before committing (add Makefile targets later).

---
## 15. Open TODO Backlog (from analysis)
- Implement remaining placeholder domains: sessions, groups advanced membership mgmt, resources sharing logic, audit log querying, access reviews.
- Introduce permission evaluation service layer.
- Normalize error envelope (global vs per-handler).
- Add tests + CI pipeline.
- Introduce migrations (`golang-migrate` or `goose`).
- MFA & API key lifecycle management.

---
## 16. Assistant Behavior Expectations
When responding to future prompts:
- If user asks for a feature: produce a delta-focused patch (avoid reprinting whole files).
- Always verify file’s current content before editing (it may have changed since prior context).
- Suggest minimal cohesive changes; do not over-refactor unless asked.
- Provide brief rationale BEFORE large modifications.
- After edits, ensure code compiles (ask user to run `go build` if tools unavailable).
- Flag discrepancies between `API.md` and actual code.

---
## 17. Quick Reference: Common Imports
```go
import (
  "database/sql"
  "errors"
  "time"
  "github.com/gofiber/fiber/v2"
  "github.com/google/uuid"
  "github.com/golang-jwt/jwt/v5"
)
```

---
## 18. Response Patterns
Success:
```json
{ "success": true, "data": { /* object or array */ } }
```
Error:
```json
{ "success": false, "error": { "message": "reason", "code": 400 } }
```

---
## 19. Do Not
- Hardcode secrets or embed plaintext tokens in code.
- Write raw SQL in handlers (keep in queries layer).
- Introduce external dependencies without clear benefit or security review.
- Assume undocumented endpoints exist—confirm via `routes.go`.

---
## 20. Future Enhancements (nice to have)
- Structured logging (Zap / Zerolog) with request correlation IDs.
- Feature flags for experimental endpoints.
- Background workers (permission graph precomputation, audit summarization).
- Metrics exporter (Prometheus) for auth/permission checks.

---
This file should evolve alongside architecture changes—update it whenever a new domain or cross-cutting concern is added.
