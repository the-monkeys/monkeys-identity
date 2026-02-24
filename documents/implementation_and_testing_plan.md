# Monkeys Identity - Implementation & Testing Plan

## 1. Executive Summary
This document outlines the roadmap for finalizing the **Monkeys Identity (IAM)** system. The core authentication, OIDC federation, and basic administration features are implemented. The next phase focuses on hardening the system, adding missing management UIs, and establishing a robust testing framework.

---

## 2. Implementation Status Overview

| Feature Area | Status | Notes |
| :--- | :--- | :--- |
| **Authentication** | ✅ Done | Login, Register, JWT, RS256 Signing, Shared Cookie |
| **OIDC Federation** | ✅ Done | Discovery, JWKS, Authorize, Token, UserInfo, Client Mgmt |
| **RBAC Core** | ✅ Done | Roles, Policies, Assignments (Database & API) |
| **RBAC UI** | ✅ Done | Role & Policy Management Pages |
| **Session Mgmt** | ✅ Done | Redis-backed sessions, Force Logout, Monitoring UI |
| **Audit Logging** | ✅ Done | Structured Logs, Admin UI |
| **MFA** | ⚠️ Partial | TOTP Generation works; UI flow needs polish & recovery codes |
| **Resource Mgmt** | ❌ Missing | Generic Resource APIs & UI for "ReBAC" missing |
| **Testing** | ❌ Missing | No automated integration/E2E test suite |

---

## 3. Detailed Implementation Plan

### Phase 1: hardening & Security (Immediate)
- [ ] **MFA Polish**: Implement "Backup Codes" generation and UI. Enforce MFA on critical admin actions.
- [ ] **Token Revocation**: Ensure "Logout" invalidates *both* Access and Refresh tokens immediately in Redis.
- [ ] **Rate Limiting**: Enable the `RateLimitEnabled` config and verify it protects public endpoints (Login/Register).

### Phase 2: Missing Management Features (Short Term)
- [ ] **Resource Management UI**: Create a generic "Resources" page to view/manage protected assets (for ReBAC).
- [ ] **Service Accounts**: UI to create non-human accounts (Client Credentials flow) and manage their API keys.
- [ ] **User Profile**: Allow users to update their own avatar/password (currently Admin-only or limited).

### Phase 3: Testing & Quality Assurance (Critical)
- [ ] **Integration Test Suite**: Create a Go test harness using a temporary Docker Postgres/Redis.
- [ ] **E2E Browser Tests**: Use Playwright/Cypress to verify the full OIDC Login flow (Login -> Consent -> Redirect).
- [ ] **Load Testing**: Verify JWT validation performance under high concurrency (target 10k RPS).

---

## 4. Testing Strategy

### 4.1 Unit Testing (Go)
*   **Scope**: Helper functions, struct validation, utility packages.
*   **Tool**: Standard `testing` package.
*   **Goal**: >80% coverage on `pkg/*` and `internal/utils/*`.

### 4.2 Integration Testing (API Layer)
*   **Scope**: HTTP Handlers + Database Queries.
*   **Setup**:
    *   Spin up ephemeral Postgres/Redis via Docker Testcontainers.
    *   Seed DB with `init-data-corrected.sql`.
    *   Run HTTP requests against `app` instance.
*   **Key Scenarios**:
    *   Register -> Login -> Get Token -> Access Protected Route.
    *   OIDC Authorization Code Flow (mocking the client).
    *   RBAC Enforcement (Admin can delete user; Regular user cannot).

### 4.3 End-to-End (E2E) Testing
*   **Scope**: Full frontend + backend flow.
*   **Tool**: Playwright or Cypress.
*   **Key Scenarios**:
    *   User logs in via UI.
    *   User navigates to "Ecosystem" and creates an OIDC Client.
    *   User logs out and tries to access dashboard (should redirect to login).

---

## 5. Deployment & DevOps
- [ ] **Docker Compose**: Ensure `docker-compose.yml` is production-ready (healthchecks, restart policies).
- [ ] **CI Pipeline**: GitHub Actions to run `go test` and `npm test` on PRs.
- [ ] **Migration System**: Move from `schema.sql` to a proper migration tool (`golang-migrate` or `goose`) for versioned schema changes.
