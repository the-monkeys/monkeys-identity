# Monkeys Identity: IAM Upgrade Master Handover

## 1. Project Context & Objectives
**Monkeys Identity** is being transformed into a "Golden Standard" Identity and Access Management (IAM) system. The goal is to move from a basic authentication MVP to a comprehensive, enterprise-grade platform supporting:
- **Multi-Tenancy**: Strong logical isolation between organizations.
- **Advanced AuthN**: Multi-Factor Authentication (TOTP), SSO/Federation.
- **Granular AuthZ**: Policy-Based Access Control (PBAC) and Relationship-Based Access Control (ReBAC).
- **Compliance**: Full audit logging and periodic access reviews.

---

## 2. Architectural Backbone

### 2.1 Multi-Tenancy (Strict Isolation)
- **Standard**: Every entity in the database (Users, Roles, Policies, Sessions, etc.) MUST have an `organization_id`.
- **Query Rule**: Every SQL query (`SELECT`, `UPDATE`, `DELETE`) must include `WHERE organization_id = $n`.
- **Handler Rule**: Extract `orgID` via `c.Locals("organization_id").(string)` (populated by the auth middleware).
- **Security**: Missing an `organization_id` filter is considered a critical security vulnerability (data leakage).

### 2.2 Tech Stack
- **Languages**: Go 1.21+
- **Framework**: Fiber (Web), Redis (Cache/Temporary State), PostgreSQL (Primary DB).
- **Models**: Standardized in `internal/models/models.go`.
- **Database Access**: Custom query layer in `internal/queries/` using raw SQL for performance and clarity.

---

## 3. Completed Milestones (Phases 1 & 2)

### Phase 1: Foundation & Compliance
- **Audit Service**: Implemented `internal/services/audit_service.go`. Supports asynchronous logging of security events (Logins, Permission changes, Access Denied).
- **Query Audit**: Rewrote `SessionQueries` and `AuditQueries` to enforce 100% multi-tenancy coverage.
- **Access Reviews**: Implemented handlers and queries for periodic certification of user permissions.
- **Model Updates**: Extended `User` and `AuditEvent` schemas to support enhanced tracking and MFA.

### Phase 2: Authentication Security
- **MFA (TOTP)**:
    - Implemented `internal/services/mfa_service.go` using `pquerna/otp`.
    - Supports: Secret generation, QR Code provisioning (Base64), TOTP verification, and random Backup Codes.
- **MFA Login Flow**:
    - Modified `AuthHandler.Login` to check `mfa_enabled`.
    - If enabled, returns an `mfa_token` (UUID) instead of JWTs.
    - Added `AuthHandler.LoginMFAVerify` to exchange the token + code for final JWTs.
- **Management API**:
    - `/auth/mfa/setup`: Generates secret.
    - `/auth/mfa/verify`: Enables MFA after first successful code entry.
    - `/auth/mfa/disable`: Disables (requires password + code).

---

## 6. Reference Links
- [Implementation Plan](./implementation_plan.md)
- [Comprehensive Guide](./iam_comprehensive_guide.md)
- [Gap Analysis](./monkeys_iam_gap_analysis.md)

---

## 4. Pending Roadmap (Implementation Guide)

### Phase 3: Authorization Engine (PBAC & ReBAC)
**Goal**: Transition from hardcoded role checks to a dynamic Policy Engine.

#### **Policy Engine Implementation (`internal/authz`)**
- **Evaluation Logic**: Use a "Deny-by-default" strategy. 
- **Check Flow**:
    1. Check for explicit **Deny** in any policy (Identity or Resource). If found, return `Deny`.
    2. Check for an explicit **Allow**. If found, return `Allow`.
    3. If neither, return `Deny`.
- **ReBAC (Sharing)**: The engine must check the `resource_shares` table. If `User:A` has `is_editor` relationship with `Blog:X`, they should be granted the `blog:Edit` permission.
- **Wildcards**: Support `*` in actions (e.g., `iam:*`) and resource ARNs.

### Phase 4: Federation (OIDC/SSO)
**Goal**: Make Monkeys Identity act as a Central IdP for other services (Tube, Drive, etc.).

#### **OAuth2/OIDC Flow**
1. **Discovery**: `/.well-known/openid-configuration`.
2. **Authorize**: `/oauth2/authorize` (Handles UI login and Consent).
3. **Token**: `/oauth2/token` (Exchanges code for `id_token`, `access_token`, `refresh_token`).
4. **Userinfo**: `/oauth2/userinfo` (Returns standard OIDC claims).

---

## 5. Critical Constraints for Future Agents
1. **Never use `SELECT *`**: Explicitly name columns to avoid scanning errors and ensure multi-tenancy fields are handled.
2. **Audit Every Change**: New sensitive endpoints (e.g., password changes, policy updates) MUST call `AuditService.LogEvent`.
3. **Linter Awareness**: Be careful with redeclaring variables (`:=` vs `=`) in nested blocks when extracting `organization_id`.
4. **Consistency**: Follow the pattern in `internal/handlers/auth.go` for error handling (structured JSON with `Error` and `Message` fields).
