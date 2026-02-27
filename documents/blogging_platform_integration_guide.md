# Blogging Platform Integration Guide

## Overview

This guide explains how a blogging service can integrate with the Monkeys IAM system for authentication and authorization. It covers the complete setup using both the **UI** (`http://localhost:5173`) and **APIs** (`http://localhost:8085`).

### Requirements

| Requirement | How IAM Supports It |
|---|---|
| Blog as a resource with owner | `resources` table with `type=blog`, `owner_id`, `owner_type` |
| Co-author: edit, publish, draft, archive | Policy statements with `"Effect": "Allow"` on those actions |
| Co-author: cannot delete | Policy statement with `"Effect": "Deny"` on `blog:delete` |
| Invite co-authors | Resource sharing API (`POST /resources/:id/share`) |
| External app integration | Full OIDC/OAuth2 Authorization Code flow |
| Permission checks at runtime | `POST /authz/check` endpoint |

The `blog` resource type is already in the DB enum. The `resource_shares` and `resource_permissions` tables exist. The authorization engine supports PBAC + resource shares + explicit Deny overrides.

---

## Step 1: Login as Admin

**UI:** Go to `http://localhost:5173` → Login with `dave@example.com` / `Megamind@1`

**API:**

```bash
POST http://localhost:8085/api/v1/auth/login
Content-Type: application/json

{
  "email": "dave@example.com",
  "password": "Megamind@1"
}
```

Response includes `access_token` and `"role": "admin"`. Use this token as `Authorization: Bearer <token>` for all subsequent calls.

---

## Step 2: Register the Blogging App as an OIDC Client

**UI:** Go to **Ecosystem Integration** page → Click **Register Application**

- Client Name: `My Blog Platform`
- Redirect URI: `http://myblog.local:3000/callback`
- Scope: `openid profile email`
- Public client: No (server-side app)

**API:**

```bash
POST http://localhost:8085/api/v1/oauth2/clients
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "client_name": "My Blog Platform",
  "redirect_uris": ["http://myblog.local:3000/callback"],
  "scope": "openid profile email",
  "is_public": false
}
```

Response returns `client_id` and `client_secret`. **Save these** — the blogging app uses them for OAuth2.

---

## Step 3: Create the "BlogOwnerPolicy"

**UI:** Go to **Policies** → Click **Create Policy**

- Name: `BlogOwnerPolicy`
- Description: `Full access to blog resources including co-author management`
- Effect: `allow`
- Document:

```json
{
  "Version": "2024-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "blog:create",
        "blog:read",
        "blog:update",
        "blog:delete",
        "blog:publish",
        "blog:draft",
        "blog:archive",
        "blog:invite"
      ],
      "Resource": ["arn:monkey:blog:*:*:blog/*"]
    }
  ]
}
```

**API:**

```bash
POST http://localhost:8085/api/v1/policies
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "BlogOwnerPolicy",
  "description": "Full access to blog resources including co-author management",
  "effect": "allow",
  "document": "{\"Version\":\"2024-01-01\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"blog:create\",\"blog:read\",\"blog:update\",\"blog:delete\",\"blog:publish\",\"blog:draft\",\"blog:archive\",\"blog:invite\"],\"Resource\":[\"arn:monkey:blog:*:*:blog/*\"]}]}"
}
```

---

## Step 4: Create the "BlogCoAuthorPolicy" (Allow Edit, Deny Delete)

**UI:** Go to **Policies** → Click **Create Policy**

- Name: `BlogCoAuthorPolicy`
- Description: `Co-author access - can edit/publish/draft/archive but NOT delete`
- Effect: `allow`
- Document:

```json
{
  "Version": "2024-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "blog:read",
        "blog:update",
        "blog:publish",
        "blog:draft",
        "blog:archive"
      ],
      "Resource": ["arn:monkey:blog:*:*:blog/*"]
    },
    {
      "Effect": "Deny",
      "Action": ["blog:delete"],
      "Resource": ["arn:monkey:blog:*:*:blog/*"]
    }
  ]
}
```

> **Key:** The explicit `Deny` on `blog:delete` overrides any other Allow — co-authors can never delete, even if they somehow get additional permissions.

**API:**

```bash
POST http://localhost:8085/api/v1/policies
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "BlogCoAuthorPolicy",
  "description": "Co-author access - can edit/publish/draft/archive but NOT delete",
  "effect": "allow",
  "document": "{\"Version\":\"2024-01-01\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"blog:read\",\"blog:update\",\"blog:publish\",\"blog:draft\",\"blog:archive\"],\"Resource\":[\"arn:monkey:blog:*:*:blog/*\"]},{\"Effect\":\"Deny\",\"Action\":[\"blog:delete\"],\"Resource\":[\"arn:monkey:blog:*:*:blog/*\"]}]}"
}
```

---

## Step 5: Create Roles and Attach Policies

### Create "blog-owner" Role

**UI:** Go to **Roles** → **Create Role** → Name: `blog-owner`, Description: `Blog owner with full control`

After creation, click the role → go to **Policies** tab → **Attach Policy** → select `BlogOwnerPolicy`

### Create "blog-co-author" Role

**UI:** Go to **Roles** → **Create Role** → Name: `blog-co-author`, Description: `Co-author with edit access, no delete`

Click the role → **Policies** tab → **Attach Policy** → select `BlogCoAuthorPolicy`

**API:**

```bash
# Create blog-owner role
POST http://localhost:8085/api/v1/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "blog-owner",
  "description": "Blog owner with full control"
}
# → Response returns role_id (e.g. "role_owner_id")

# Attach BlogOwnerPolicy to blog-owner role
POST http://localhost:8085/api/v1/roles/<role_owner_id>/policies
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "policy_id": "<BlogOwnerPolicy_id>"
}

# Create blog-co-author role
POST http://localhost:8085/api/v1/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "blog-co-author",
  "description": "Co-author with edit access, no delete"
}
# → Response returns role_id (e.g. "role_coauthor_id")

# Attach BlogCoAuthorPolicy to blog-co-author role
POST http://localhost:8085/api/v1/roles/<role_coauthor_id>/policies
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "policy_id": "<BlogCoAuthorPolicy_id>"
}
```

---

## Step 6: Assign "blog-owner" Role to Dave

**UI:** Go to **Roles** → click `blog-owner` → **Assignments** tab → **Assign** → select `dave@example.com`

**API:**

```bash
POST http://localhost:8085/api/v1/roles/<role_owner_id>/assign
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "principal_id": "<dave_user_id>",
  "principal_type": "user"
}
```

---

## Step 7: Create a Blog Resource (Owner Creates a Blog)

**UI:** Go to **Resources** → **Add Resource**

- Name: `My First Blog Post`
- Type: `blog` (select from dropdown)
- Description: `A blog post about IAM integration`

**API:**

```bash
POST http://localhost:8085/api/v1/resources
Authorization: Bearer <dave_token>
Content-Type: application/json

{
  "name": "My First Blog Post",
  "type": "blog",
  "description": "A blog post about IAM integration",
  "attributes": {
    "status": "draft",
    "category": "technology"
  }
}
```

Response returns the blog resource with `id` — this is the `blog_resource_id`.

---

## Step 8: Create Co-Author Users

**UI:** Go to **Users** → **Add new user**

- User 1: Username `alice`, Email `alice@example.com`, Password `CoAuthor@1`
- User 2: Username `bob`, Email `bob@example.com`, Password `CoAuthor@2`

**API:**

```bash
POST http://localhost:8085/api/v1/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "CoAuthor@1",
  "display_name": "Alice"
}

POST http://localhost:8085/api/v1/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "bob",
  "email": "bob@example.com",
  "password": "CoAuthor@2",
  "display_name": "Bob"
}
```

---

## Step 9: Assign "blog-co-author" Role to Co-Authors

**UI:** Go to **Roles** → click `blog-co-author` → **Assignments** → **Assign** → select Alice, then Bob

**API:**

```bash
POST http://localhost:8085/api/v1/roles/<role_coauthor_id>/assign
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "principal_id": "<alice_user_id>",
  "principal_type": "user"
}

POST http://localhost:8085/api/v1/roles/<role_coauthor_id>/assign
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "principal_id": "<bob_user_id>",
  "principal_type": "user"
}
```

---

## Step 10: Share the Blog Resource with Co-Authors

**UI:** Go to **Resources** → click on `My First Blog Post` → **Share** tab → Share with Alice (`editor` access) and Bob (`editor` access)

**API:**

```bash
# Share with Alice
POST http://localhost:8085/api/v1/resources/<blog_resource_id>/share
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "principal_id": "<alice_user_id>",
  "principal_type": "user",
  "access_level": "editor",
  "shared_by": "<dave_user_id>"
}

# Share with Bob
POST http://localhost:8085/api/v1/resources/<blog_resource_id>/share
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "principal_id": "<bob_user_id>",
  "principal_type": "user",
  "access_level": "editor",
  "shared_by": "<dave_user_id>"
}
```

---

## Step 11: Blogging Service Checks Permissions at Runtime

The blogging app calls the authz check API before executing any action.

### Alice tries to EDIT a blog → ALLOWED

```bash
POST http://localhost:8085/api/v1/authz/check
Authorization: Bearer <service_token>
Content-Type: application/json

{
  "principal_id": "<alice_user_id>",
  "principal_type": "user",
  "action": "blog:update",
  "resource": "arn:monkey:blog:<org_id>:blog/<blog_resource_id>"
}
```

→ **Result: ALLOW** (co-author policy allows `blog:update`)

### Alice tries to DELETE a blog → DENIED

```bash
POST http://localhost:8085/api/v1/authz/check
Authorization: Bearer <service_token>
Content-Type: application/json

{
  "principal_id": "<alice_user_id>",
  "principal_type": "user",
  "action": "blog:delete",
  "resource": "arn:monkey:blog:<org_id>:blog/<blog_resource_id>"
}
```

→ **Result: DENY** (explicit Deny in `BlogCoAuthorPolicy` overrides everything)

### Dave (owner) tries to DELETE a blog → ALLOWED

```bash
POST http://localhost:8085/api/v1/authz/check
Authorization: Bearer <service_token>
Content-Type: application/json

{
  "principal_id": "<dave_user_id>",
  "principal_type": "user",
  "action": "blog:delete",
  "resource": "arn:monkey:blog:<org_id>:blog/<blog_resource_id>"
}
```

→ **Result: ALLOW** (owner policy allows `blog:delete`)

### Bulk permission check (multiple actions at once)

```bash
POST http://localhost:8085/api/v1/authz/bulk-check
Authorization: Bearer <service_token>
Content-Type: application/json

{
  "checks": [
    { "principal_id": "<alice_user_id>", "principal_type": "user", "action": "blog:update", "resource": "arn:monkey:blog:<org_id>:blog/<blog_resource_id>" },
    { "principal_id": "<alice_user_id>", "principal_type": "user", "action": "blog:delete", "resource": "arn:monkey:blog:<org_id>:blog/<blog_resource_id>" },
    { "principal_id": "<alice_user_id>", "principal_type": "user", "action": "blog:publish", "resource": "arn:monkey:blog:<org_id>:blog/<blog_resource_id>" }
  ]
}
```

---

## Step 12: OIDC Integration Flow for the Blogging App

The blogging service authenticates users through the IAM using the standard OAuth2 Authorization Code flow.

### Flow Diagram

```
User → Blog App → IAM Login Page → IAM issues auth code → Blog App exchanges for tokens → Blog App gets user info
```

### Detailed Steps

**1. User clicks "Login" on the blog site → Browser redirects to IAM:**

```
GET http://localhost:8085/api/v1/oauth2/authorize?
  client_id=<client_id>&
  redirect_uri=http://myblog.local:3000/callback&
  response_type=code&
  scope=openid profile email&
  state=<random_state>
```

**2. User logs in** at the IAM login page (`http://localhost:5173`) with their email and password.

**3. IAM redirects back** to the blog app with an authorization code:

```
http://myblog.local:3000/callback?code=<auth_code>&state=<random_state>
```

**4. Blog app exchanges the code for tokens (server-to-server):**

```bash
POST http://localhost:8085/api/v1/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<auth_code>&
redirect_uri=http://myblog.local:3000/callback&
client_id=<client_id>&
client_secret=<client_secret>
```

Response returns `access_token`, `id_token`, `refresh_token`.

**5. Blog app gets user identity:**

```bash
GET http://localhost:8085/api/v1/oauth2/userinfo
Authorization: Bearer <access_token>
```

Response returns:

```json
{
  "sub": "<user_id>",
  "name": "Dave",
  "email": "dave@example.com",
  "email_verified": true
}
```

The blog app now knows who the user is and can use the `sub` (user ID) for authz checks.

---

## OIDC Discovery Endpoints

| Endpoint | URL |
|---|---|
| OpenID Configuration | `GET http://localhost:8085/.well-known/openid-configuration` |
| JWKS (public keys) | `GET http://localhost:8085/.well-known/jwks.json` |

The blogging service can use the JWKS to verify ID tokens locally without calling the IAM server.

---

## Access Matrix

| Action | Owner (Dave) | Co-Author (Alice/Bob) | Non-member |
|---|---|---|---|
| `blog:create` | ✅ Allow | ❌ Deny | ❌ Deny |
| `blog:read` | ✅ Allow | ✅ Allow | ❌ Deny |
| `blog:update` | ✅ Allow | ✅ Allow | ❌ Deny |
| `blog:publish` | ✅ Allow | ✅ Allow | ❌ Deny |
| `blog:draft` | ✅ Allow | ✅ Allow | ❌ Deny |
| `blog:archive` | ✅ Allow | ✅ Allow | ❌ Deny |
| `blog:delete` | ✅ Allow | ❌ **Explicit Deny** | ❌ Deny |
| `blog:invite` | ✅ Allow | ❌ Deny | ❌ Deny |

---

## Summary: What Already Exists vs What You Create

| Component | Status | Where |
|---|---|---|
| `blog` resource type | ✅ Already in DB enum | Resources → Add Resource → Type dropdown |
| Resource ownership (`owner_id`) | ✅ Built into resource model | Set when creating resource |
| Resource sharing (invite co-authors) | ✅ Fully working API | Resources → Detail → Share |
| Explicit Deny support | ✅ Built into policy evaluator | Co-author policy with Deny statement |
| OIDC/OAuth2 flow | ✅ Fully working | Ecosystem Integration → Register |
| Permission check API | ✅ Fully working | `POST /authz/check` |
| Custom roles (`blog-owner`, `blog-co-author`) | 🔧 Create via UI/API | Roles → Create Role |
| Custom policies (allow/deny statements) | 🔧 Create via UI/API | Policies → Create Policy |
| OIDC client for blogging app | 🔧 Register via UI/API | Ecosystem Integration → Register |
| Groups (optional, for bulk management) | ✅ Available if needed | Groups → Create Group |

**No code changes required.** Everything is configurable through the existing UI and API endpoints.

---

## Scalability: Will This Design Work at Millions of Blogs?

### The Short Answer

**Steps 1-6 and Step 12 (OIDC) scale perfectly.** Steps 7-11 (per-blog resources + per-blog sharing in the IAM) **do NOT scale** to millions of blogs. The correct architecture at scale is a **hybrid approach**.

### Why Per-Blog Resources Don't Scale

The guide above registers every blog as a `resource` and every co-author invite as a `resource_share`. Here's what happens at scale:

| Scale | `resources` rows | `resource_shares` rows | `authz/check` behavior |
|---|---|---|---|
| 100 blogs, 5 co-authors each | 100 | 500 | Fast (~1ms) |
| 10K blogs, 10 co-authors each | 10,000 | 100,000 | OK (~5ms) |
| 1M blogs, 5 co-authors each | 1,000,000 | 5,000,000 | **Slow (~50-200ms)** |
| 10M blogs, 10 co-authors each | 10,000,000 | 100,000,000 | **Unusable** |

The root cause is in the `Authorize()` function in `authz_service.go`. Every permission check runs **three sequential DB queries**:

1. `GetPrincipalPolicies()` — fetches ALL policies for the user via `role_assignments` + `group_memberships` + `policies` (JOINs across 4 tables)
2. `GetPrincipalPermissions()` — fetches ALL `resource_permissions` rows for the user, then filters in Go code
3. `GetPrincipalShares()` — fetches ALL `resource_shares` rows for the user, then filters in Go code

At 5M+ `resource_shares` rows, query #3 alone returns thousands of rows per user, all loaded into memory, then linearly scanned for a match. This is O(N) per check where N = number of shares for that user.

### The Correct Architecture at Scale

Split responsibilities between **IAM** (coarse-grained) and **Blog Service** (fine-grained):

```
┌─────────────────────────────────────────────────────────┐
│                    Monkeys IAM                          │
│                                                         │
│  ✅ Authentication (OIDC login)                         │
│  ✅ User identity (who is this person?)                 │
│  ✅ Org-level roles (is this user a "blogger"?)         │
│  ✅ JWT tokens with role claims                         │
│  ✅ Coarse policies ("can this user use blog features?")│
│                                                         │
│  ❌ NOT: per-blog ownership tracking                    │
│  ❌ NOT: per-blog co-author lists                       │
│  ❌ NOT: per-blog permission checks                     │
└──────────────────────┬──────────────────────────────────┘
                       │ JWT token (sub, role, org_id)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Blog Service DB                        │
│                                                         │
│  blogs table:                                           │
│    id, title, content, owner_id, status, created_at     │
│                                                         │
│  blog_collaborators table:                              │
│    blog_id, user_id, role (owner/co-author), invited_by │
│                                                         │
│  Authorization logic (in blog service code):            │
│    1. Parse JWT → get user_id, role                     │
│    2. SELECT role FROM blog_collaborators               │
│       WHERE blog_id = ? AND user_id = ?                 │
│    3. If role = 'owner' → allow all                     │
│    4. If role = 'co-author' → allow edit, deny delete   │
│    5. If no row → deny                                  │
└─────────────────────────────────────────────────────────┘
```

### What Each System Does

| Concern | Who Handles It | Why |
|---|---|---|
| "Who is this user?" | **IAM** (OIDC) | Centralized identity — one login for all apps |
| "Can this user use blog features at all?" | **IAM** (roles/policies) | Org-level access control |
| "Is this user the owner of blog #12345?" | **Blog Service** (its own DB) | Per-object ownership is app-specific data |
| "Is Alice a co-author on blog #12345?" | **Blog Service** (its own DB) | Per-object collaboration is app-specific data |
| "Can Alice delete blog #12345?" | **Blog Service** (code logic) | Simple if/else based on collaborator role |

### How to Implement the Scalable Version

#### IAM Side (Steps 1-6 from the guide above still apply)

1. Register the blogging app as an OIDC client (Step 2)
2. Create a `blogger` role with a policy that allows `blog:*` actions (Steps 3-5)
3. Assign the `blogger` role to users who should be able to use the blog platform (Step 6)
4. The IAM JWT token will contain `role: "blogger"` — the blog service checks this on every request

#### Blog Service Side (replaces Steps 7-11)

The blog service maintains its own tables:

```sql
CREATE TABLE blogs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(500) NOT NULL,
    content     TEXT,
    owner_id    UUID NOT NULL,  -- user ID from IAM
    status      VARCHAR(20) DEFAULT 'draft',  -- draft, published, archived
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE blog_collaborators (
    blog_id     UUID REFERENCES blogs(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,  -- user ID from IAM
    role        VARCHAR(20) NOT NULL,  -- 'owner', 'co-author'
    invited_by  UUID,
    created_at  TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (blog_id, user_id)
);

CREATE INDEX idx_blog_collabs_user ON blog_collaborators(user_id);
CREATE INDEX idx_blog_collabs_blog ON blog_collaborators(blog_id);
```

The blog service authorization logic (pseudocode):

```python
def can_user_do(user_id, blog_id, action):
    # Step 1: Check JWT has "blogger" role (from IAM)
    if user.iam_role != "blogger":
        return DENY

    # Step 2: Check collaborator table (blog service's own DB)
    collab = db.query("SELECT role FROM blog_collaborators WHERE blog_id = ? AND user_id = ?", blog_id, user_id)

    if not collab:
        return DENY  # Not a collaborator

    if collab.role == "owner":
        return ALLOW  # Owner can do everything

    if collab.role == "co-author":
        if action == "delete":
            return DENY  # Co-authors cannot delete
        if action in ["read", "edit", "publish", "draft", "archive"]:
            return ALLOW
        return DENY

    return DENY
```

This is O(1) per check (indexed primary key lookup), works at any scale, and keeps the IAM focused on what it's good at: identity and org-level access control.

### When to Use Which Approach

| Scale | Recommended Approach |
|---|---|
| < 10K blogs, < 100 users | **IAM-only** (Steps 1-12 as written above) — simple, no extra code needed |
| 10K-100K blogs, < 1K users | **IAM-only** works but add DB indexes on `resource_shares(principal_id, resource_id)` |
| 100K+ blogs or 1K+ users | **Hybrid** — IAM for auth + roles, blog service for per-blog ownership |
| 1M+ blogs | **Hybrid is mandatory** — per-blog data must live in the blog service |

### Summary

The IAM system is designed for **who can access what category of things** (identity, roles, policies). It is NOT designed to be a **per-object ACL database** for millions of objects. At scale, the blogging service should:

1. Use the IAM for **login** (OIDC) and **coarse authorization** (roles/policies)
2. Store **per-blog ownership and co-authorship** in its own database
3. Enforce **per-blog permissions** in its own application code
4. The IAM JWT token gives the blog service everything it needs: `user_id`, `role`, `org_id`
