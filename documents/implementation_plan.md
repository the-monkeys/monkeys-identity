# Implementation Plan - Monkeys Identity Upgrade

# Goal Description
The goal is to upgrade the `monkeys-identity` repository from a "Schema-First" MVP to a fully functional, multi-tenant, "Golden Standard" Identity and Access Management (IAM) system. This involves bridging the implementation gap between the sophisticated database model and the currently simplistic business logic.

## User Review Required
> [!IMPORTANT]
> **Breaking Change Handling**: Phase 3 (Authorization Engine) will change how permissions are checked. Existing hardcoded checks (e.g., `RequireRole("admin")`) will need to be gradually replaced or wrapped by the new Policy Engine.

> [!WARNING]
> **Database Isolation**: Phase 1 involved strictly enforcing `organization_id` on all queries. This ensures multi-tenant isolation but requires consistent application across all future features.

## Proposed Changes

### Phase 1: Foundation & Compliance (COMPLETED)
*Focus: Security, Isolation, and Observability.*

- **Multi-Tenancy Fix**: Audited SQL queries in `internal/queries/`.
    - Every `SELECT`, `UPDATE`, `DELETE` now has `WHERE organization_id = ?`.
    - Enforced in `SessionQueries` and `AuditQueries`.
- **Audit Service**:
    - Created `internal/services/audit_service.go`.
    - Implemented async writing to `audit_events` table.
    - Integrated into handlers for secure event tracking.

### Phase 2: Authentication Security (COMPLETED)
*Focus: Securing the front door.*

- **MFA Implementation**:
    - Integrated `pquerna/otp` library.
    - Implemented `SetupMFA`, `VerifyMFA`, and `LoginMFAVerify`.
    - Full TOTP support with QR codes and backup codes.

### Phase 3: The Authorization Brain (RBAC -> PBAC/ReBAC)
*Focus: Making the database Policies actually work and adding Relationship-based checks.*

#### [NEW] internal/authz/evaluator.go
- **Policy Evaluator**:
    - Implement `Matches(statement, action, resource, context) bool`.
    - Support wildcards (`*`, `prefix:*`, `*:suffix`).
    - **Step 1: PBAC Foundations**: Implement structure-based check for `Effect`, `Action`, `Resource`.
    - **Step 2: Condition Evaluator**: Implement `EvaluateCondition(condition, context)` supporting `StringEquals`, `StringLike`, `Bool`.

#### [NEW] internal/services/authz_service.go
- **Authz Service**:
    - `Authorize(principalID, type, orgID, action, resource) (Decision, error)`.
    - **Policy Aggregation**:
        1.  Fetch IDs of all Groups the user belongs to.
        2.  Fetch all Roles assigned to the User OR those Groups.
        3.  Fetch all Policies attached to those Roles.
        4.  Fetch any Resource-based policies (if applicable).
    - **ReBAC Resolution**: Check `resource_shares` table for explicit permissions granted to the principal or their groups.
    - **Decision Logic**: Explicit Deny > Explicit Allow > Default Deny.

#### [MODIFY] internal/middleware/auth.go
- **RequirePermission Middleware**:
    - Introduce `RequirePermission(action string)`.
    - Automatically infer `resource` from path parameters if possible (e.g., if path has `:id`, use `arn:monkeys:id:<org_id>:<type>/<id>`).
    - Call `AuthzService.Authorize()`.

#### [MODIFY] cmd/server/main.go
- Wire up the new `AuthzService` and inject it into handlers that need manual permission checks.

### Phase 4: Federation (SSO)
*Focus: Enabling SSO for other apps and acting as a central Identity Provider (IdP).*

#### [NEW] internal/services/oidc_service.go
- **OIDC Service**:
    - `ValidateClient(clientID, clientSecret, redirectURI) error`.
    - `CreateAuthorizationCode(userID, clientID, scope, nonce) (string, error)`.
    - `ExchangeCodeForToken(code, clientID, clientSecret) (*TokenResponse, error)`.
    - `GetDiscoveryConfiguration() map[string]interface{}`.
    - `GetJWKS() map[string]interface{}`.

#### [NEW] internal/handlers/oidc_handler.go
- **OIDC Discovery**: `GET /.well-known/openid-configuration`.
- **JWKS**: `GET /.well-known/jwks.json`.
- **Authorize**: `GET /oauth2/authorize` (Validates request, shows consent UI if needed).
- **Token**: `POST /oauth2/token` (Authorization Code and Refresh Token grants).
- **UserInfo**: `GET /oauth2/userinfo` (Requires Bearer token).

#### [NEW] internal/queries/oidc_queries.go
- `GetClientByID(id UUID) (*models.OAuthClient, error)`.
- `SaveAuthCode(code *models.OIDCAuthCode) error`.
- `GetAuthCode(code string) (*models.OIDCAuthCode, error)`.

#### [MODIFY] internal/models/models.go
- Add `OAuthClient` struct (mapping to `oauth_clients` table).
- Add `OIDCAuthCode` struct (for temporary codes).

#### [MODIFY] internal/config/config.go
- Add `OIDCIssuer` and `JWTPrivateKey` (for RS256).

## Verification Plan

### Automated Tests
- **Unit Tests**: Test the `PolicyEngine` against complex JSON policy scenarios (Allow vs Deny, Wildcards).
- **Integration Tests**:
    - Test Multi-tenancy isolation (User A cannot see User B's roles).
- **OIDC Flow**: End-to-end test of the Authorization Code flow.
    1.  Call `/authorize` -> Expect redirect.
    2.  Simulate user login/approval.
    3.  Receive code -> Call `/token` -> Expect tokens.
    4.  Call `/userinfo` with Access Token -> Expect profile.
- **JWKS**: Verify that the tokens can be validated using the keys from the JWKS endpoint.

### Manual Verification
- **Audit**: Perform an action, verify row appears in DB.
- **MFA**: Try to login without MFA code (should fail).
- **SSO**: Simulate a "Monkeys Tube" login flow using Postman or a simple HTML client.
- **Internal Apps**: Configure "Monkeys Tube" or a simple OIDC debugger (like [oidcdebugger.com](https://oidcdebugger.com/)) to verify compliance.
- **Discovery**: Ensure all endpoints in the discovery document are reachable.
