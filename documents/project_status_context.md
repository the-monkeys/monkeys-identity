# Monkeys Identity - Project Status & AI Context

## 1. Project Overview
**Monkeys Identity (IAM)** is a Go + React based identity provider implementing OIDC, RBAC, and ReBAC.
- **Backend**: Go (Fiber), PostgreSQL, Redis.
- **Frontend**: React (Vite), TailwindCSS, TanStack Query.
- **Architecture**: Domain-driven handlers, SQL-based queries layer (no ORM), centralized Auth Middleware.

---

## 2. Done Items (Implemented & Working) ✅
- **Authentication**: Email/Password login, Registration, RS256 JWT Signing, HTTP-Only Cookies (Lax/Strict/None support).
- **OIDC Provider**: 
  - Discovery (`/.well-known/openid-configuration`)
  - JWKS (`/.well-known/jwks.json`)
  - Authorization Endpoint (`/oauth2/authorize`)
  - Token Endpoint (`/oauth2/token`)
  - UserInfo Endpoint (`/oauth2/userinfo`)
  - Client Management API (`POST /oauth2/clients`)
- **RBAC Management**:
  - CRUD for Roles & Policies.
  - Policy attachment to Roles.
  - Role assignment to Principals (Users).
- **Session Management**:
  - Redis-backed sessions.
  - Force logout admin action.
  - Frontend "Session Monitoring" page.
- **Audit Logs**:
  - Structured logging middleware.
  - Audit Event query API & UI.
- **Bug Fixes**:
  - Fixed "logout on click" issue by ensuring consistent RS256 key generation on startup.

---

## 3. Not Done / Pending Items ❌
- **Testing**: No automated tests exist. No unit, integration, or E2E tests are currently implemented.
- **MFA Flow**: Backend supports TOTP verification, but critical admin actions (like "Delete User") do not yet enforce MFA verification step-up.
- **Resource UI**: No generic UI for managing "Resources" (ReBAC objects).
- **Service Accounts**: API exists theoretically but no Management UI for creating non-human accounts.
- **Migrations**: Database schema is managed via a single `schema.sql`. No migration tool (like `golang-migrate`) is integrated.

---

## 4. Key Files for Context
- `internal/routes/routes.go`: Full API surface definition.
- `internal/handlers/auth.go`: Login logic & RS256 token generation.
- `internal/handlers/oidc_handler.go`: OIDC Federation logic.
- `ui/src/routes/browserRouter.tsx`: Frontend routing map.
- `internal/config/config.go`: Environment variable definitions.
