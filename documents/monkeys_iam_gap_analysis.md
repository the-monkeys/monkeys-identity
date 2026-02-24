# Monkeys Identity: Repository Analysis & Gap Analysis

## 1. Overview
This document compares the current `monkeys-identity` repository against the **"Golden Standard"** defined in the [Comprehensive IAM Guide](../brain/25c493a9-dde0-4442-9d81-84ac5e77730b/iam_comprehensive_guide.md).

**Verdict**: The repository is in a **"Schema-Complete, Logic-Empty"** state. It has the database structure of an enterprise IAM but the logic of a simple MVP.

---

## 2. Feature-by-Feature Gap Analysis

### A. Authentication (AuthN)
| Feature | Golden Standard Requirement | Current Status | The Gap |
| :--- | :--- | :--- | :--- |
| **Login** | Secure Credential Verification | ✅ **Implemented** | None. Standard BCrypt + JWT flow is working. |
| **MFA** | TOTP (QR Code), SMS, Email options | ✅ **Implemented** | TOTP via `MFAService` is fully functional and enforced during login. |
| **Session Mgmt** | Remote Logout, Device Tracking | ✅ **Implemented** | Redis sessions track `device_fingerprint` and IP. |
| **Password Reset** | Secure Email Link + Token | ⚠️ **Partial** | Token generation works. Email sending logic requires provider integration. |

### B. Authorization (AuthZ) & Policy Engine
| Feature | Golden Standard Requirement | Current Status | The Gap |
| :--- | :--- | :--- | :--- |
| **RBAC** | Assign Roles to Users | ⚠️ **Elementary** | Middleware checks `role` string in JWT. **Ignores database Roles**. |
| **PBAC / Policies** | Evaluate JSON Policies at runtime | ❌ **Missing** | Database has `policies` table with JSON documents. **No code loads or evaluates them.** |
| **Resource Guard** | Check ownership/access per resource | ❌ **Missing** | API endpoints check if you are "logged in", not if you "own this specific resource". |

### C. Governance & Audit
| Feature | Golden Standard Requirement | Current Status | The Gap |
| :--- | :--- | :--- | :--- |
| **Audit Logging** | Immutable Database Logs | ✅ **Implemented** | `AuditService` logs events asynchronously to `audit_events` table. |
| **User Admin** | CRUD for Users/Orgs | ✅ **Implemented** | Full administrative control is working. |
| **Service Accounts** | API Keys / Machine Auth | ❌ **Missing** | `service_accounts` table exists. No endpoints to authenticate or rotate keys. |

### D. Federation & SSO (The "Google" Model)
| Feature | Golden Standard Requirement | Current Status | The Gap |
| :--- | :--- | :--- | :--- |
| **OIDC Provider** | `/authorize`, `/token`, `/userinfo` endpoints | ❌ **Missing** | System cannot act as a central IdP for other apps (`monkeys-tube`, etc.). |
| **SSO Session** | Global Session Cookie | ❌ **Missing** | Tokens are valid only for the API, not as a browser-based global session |
| **Client Mgmt** | OAuth2 Client Registration | ❌ **Missing** | No way to register "Monkeys Tube" as a trusted app with a `client_id` and `secret`. |

### E. Resource Sharing (ReBAC)
| Feature | Golden Standard Requirement | Current Status | The Gap |
| :--- | :--- | :--- | :--- |
| **Co-Authoring** | Invite user to edit specific resource | ⚠️ **Partial** | `ShareResource` endpoint writes to DB. **No logic enforces this permission.** |
| **Relationship Check** | Graph-based permission check | ❌ **Missing** | No `CanUserEditBlog(user, blogID)` function exists. |
| **Ownership** | "Owner" has full control | ❌ **Missing** | API assumes if you are logged in, you can likely edit anything (or falls back to crude role checks). |

### F. Multi-Tenancy & Isolation
| Feature | Golden Standard Requirement | Current Status | The Gap |
| :--- | :--- | :--- | :--- |
| **Data Isolation** | `WHERE organization_id = X` on ALL queries | ✅ **Improved** | Audit performed on `SessionQueries` and `AuditQueries`. All handlers now enforce `orgID`. |
| **Tenant Admin** | Dashboard for Org Admins | ⚠️ **Partial** | Admin API exists but mixes Super-Admin and Org-Admin capabilities confusedly. |
| **Custom Domains** | valid `auth.company.com` | ❌ **Missing** | No support for vanity URLs or tenant-specific routing. |

---

## 3. The "Silent Failure" Risks
Currently, the system gives a **false sense of security**:
1.  **Database Policies are Placeholders**: You can create a "Read-Only" policy in the DB, assign it to a user, and they will still have **Full Admin Access** if their JWT says `"role": "admin"`.
2.  **Audit Blindness**: If an attacker deletes an organization, there will be no record in the database, only a fleeting line in the server logs.

## 4. Priority Roadmap (Corrective Action)

To bring `monkeys-identity` up to the "Golden Standard", we must bridge the gap between the Schema (Ferrari) and the Logic (Go-Kart).

### Priority 1: The "Brain" (Policy Engine)
*   **Goal**: Make the database policies actually *do* something.
*   **Action**: Create a `PolicyEvaluator` service.
    *   *Input*: `UserContext`, `Resource`, `Action`
    *   *Logic*: Fetch attached Policies -> Parse JSON -> Evaluate Allow/Deny.
    *   *Output*: Boolean (`true`/`false`).

### Priority 2: One-Time Password (MFA)
*   **Goal**: Secure the login flow.
*   **Action**: Implement `pquerna/otp` to generate QR codes and validate 6-digit tokens. Blocks login until 2nd factor is verified.

### Priority 3: The "Memory" (Audit Service)
*   **Goal**: Permanent record of actions.
*   **Action**: Create `AsyncAuditService`.
    *   *Trigger*: Middleware or Handler calls `audit.Log(...)`.
    *   *Action*: Writes to `audit_events` table asynchronously (don't block the request).

### Priority 4: Notifications (Email)
*   **Goal**: Allow users to recover accounts.
*   **Action**: Implement `EmailService` interface (e.g., SendGrid/AWS SES implementation).

---

## 5. Detailed Implementation Plan (Feature Completion Matrix)

| Feature | Sub-Feature | Status (End-to-End) | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Authentication** | Registration | ❌ **Incomplete** | DB Creates User ✅. Email Verification Service ❌. |
| | Login | ✅ **Completed** | JWT Issue & Refresh working. |
| | Password Reset | ❌ **Incomplete** | Token Gen ✅. Email Service ❌. |
| | MFA (TOTP) | ❌ **Missing** | Endpoints are stubs. No enforcement. |
| **Authorization** | RBAC (Basic) | ⚠️ **Partial** | String check works. DB Role logic ignored. |
| | Policy Engine | ❌ **Missing** | No PBAC evaluation logic exists. |
| | ReBAC (Sharing) | ❌ **Missing** | `ShareResource` writes to DB but is not checked on access. |
| **Governance** | Audit Logs | ❌ **Missing** | Events not persisted to DB. |
| **SSO/Federation** | OIDC Provider | ❌ **Missing** | No `.well-known`, `/authorize`, or `/token` endpoints. |
| **Multi-Tenancy** | Data Isolation | ⚠️ **Leaky** | `ListRoles` exposes all orgs. `ListResources` is correct. |

---

## 6. Use Case Design: Organization App Registration

This section details how an Organization registers *their own application* (e.g., "Monkeys Tube") to use `monkeys-identity` for authentication.

### The Flow: "BYO App" (Bring Your Own App)

1.  **Registration Phase**
    *   **Actor**: Org Admin (Alice from Tube Corp).
    *   **Action**: Logs into `monkeys-identity` Dashboard -> "Applications" -> "Create New App".
    *   **Input**:
        *   App Name: "Monkeys Tube"
        *   Redirect URIs: `https://monkeys-tube.com/callback`
    *   **System Action**:
        *   Generates `client_id` (public UUID).
        *   Generates `client_secret` (private high-entropy string).
        *   Stores in `oauth_clients` table (linked to `organization_id`).
    *   **Output**: Credentials displayed *once* to Alice.

2.  **Integration Phase**
    *   Alice configures "Monkeys Tube" backend with `client_id` and `client_secret`.
    *   She points the OIDC Issuer URL to `https://monkeys-identity.com`.

3.  **Runtime Phase (The Login)**
    *   User Bob visits `monkeys-tube.com`.
    *   Tube redirects Bob to `monkeys-identity.com/oauth2/authorize?client_id=...`.
    *   Identity IAM sees `client_id` belongs to "Tube Corp".
    *   Bob logs in.
    *   Identity IAM issues generic `Access Token` (for IAM API) + `ID Token` (User Profile).
    *   **Crucial Step**: Identity IAM checks if Bob has permission to access "Monkeys Tube" (App Authorization Policy).
    *   If allowed, redirect back to `monkeys-tube.com/callback`.

### Technical Requirements for this Design
1.  **New Table**: `oauth_clients` (id, secret_hash, redirect_uris, owner_org_id).
2.  **New Endpoints**:
    *   `POST /clients` (Register App).
    *   `GET /oauth2/authorize` (The Login Page redirection).
    *   `POST /oauth2/token` (The Code Exchange).
    *   `GET /.well-known/openid-configuration` (Discovery).

