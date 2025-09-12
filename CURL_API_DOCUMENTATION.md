# Monkeys Identity API - CURL Documentation

This document provides comprehensive CURL examples for all endpoints in the Monkeys Identity service.

## Base URL
```bash
BASE_URL="http://localhost:8080/api/v1"
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```bash
TOKEN="your_jwt_token_here"
```

---

## 🔐 Authentication Endpoints

### 1. User Registration
```bash
curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe",
    "organization_id": "org_123"
  }'
```

### 2. User Login
```bash
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### 3. Refresh Token
```bash
curl -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your_refresh_token_here"
  }'
```

### 4. User Logout
```bash
curl -X POST "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### 5. Forgot Password
```bash
curl -X POST "${BASE_URL}/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 6. Reset Password
```bash
curl -X POST "${BASE_URL}/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_from_email",
    "new_password": "NewSecurePassword123!"
  }'
```

### 7. Verify Email
```bash
curl -X POST "${BASE_URL}/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verification_token_from_email"
  }'
```

### 8. Resend Verification Email
```bash
curl -X POST "${BASE_URL}/auth/resend-verification" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

---

## 🔒 Multi-Factor Authentication (MFA) Endpoints

### 1. Setup MFA
```bash
curl -X POST "${BASE_URL}/auth/mfa/setup" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### 2. Verify MFA
```bash
curl -X POST "${BASE_URL}/auth/mfa/verify" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### 3. Generate Backup Codes
```bash
curl -X POST "${BASE_URL}/auth/mfa/backup-codes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### 4. Disable MFA
```bash
curl -X DELETE "${BASE_URL}/auth/mfa/disable" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 👥 User Management Endpoints

### 1. List Users
```bash
curl -X GET "${BASE_URL}/users" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create User (Admin Only)
```bash
curl -X POST "${BASE_URL}/users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "user",
    "organization_id": "org_123"
  }'
```

### 3. Get User by ID
```bash
USER_ID="user_123"
curl -X GET "${BASE_URL}/users/${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update User
```bash
USER_ID="user_123"
curl -X PUT "${BASE_URL}/users/${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Updated Name",
    "last_name": "Updated Lastname"
  }'
```

### 5. Delete User (Admin Only)
```bash
USER_ID="user_123"
curl -X DELETE "${BASE_URL}/users/${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Get User Profile
```bash
USER_ID="user_123"
curl -X GET "${BASE_URL}/users/${USER_ID}/profile" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Update User Profile
```bash
USER_ID="user_123"
curl -X PUT "${BASE_URL}/users/${USER_ID}/profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio",
    "phone": "+1234567890",
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

### 8. Suspend User (Admin Only)
```bash
USER_ID="user_123"
curl -X POST "${BASE_URL}/users/${USER_ID}/suspend" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Policy violation"
  }'
```

### 9. Activate User (Admin Only)
```bash
USER_ID="user_123"
curl -X POST "${BASE_URL}/users/${USER_ID}/activate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### 10. Get User Sessions
```bash
USER_ID="user_123"
curl -X GET "${BASE_URL}/users/${USER_ID}/sessions" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 11. Revoke User Sessions
```bash
USER_ID="user_123"
curl -X DELETE "${BASE_URL}/users/${USER_ID}/sessions" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🏢 Organization Management Endpoints

### 1. List Organizations
```bash
curl -X GET "${BASE_URL}/organizations" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create Organization (Super Admin Only)
```bash
curl -X POST "${BASE_URL}/organizations" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Organization",
    "description": "Organization description",
    "domain": "neworg.com"
  }'
```

### 3. Get Organization by ID
```bash
ORG_ID="org_123"
curl -X GET "${BASE_URL}/organizations/${ORG_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update Organization (Admin Only)
```bash
ORG_ID="org_123"
curl -X PUT "${BASE_URL}/organizations/${ORG_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Organization Name",
    "description": "Updated description"
  }'
```

### 5. Delete Organization (Super Admin Only)
```bash
ORG_ID="org_123"
curl -X DELETE "${BASE_URL}/organizations/${ORG_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Get Organization Users
```bash
ORG_ID="org_123"
curl -X GET "${BASE_URL}/organizations/${ORG_ID}/users" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Get Organization Groups
```bash
ORG_ID="org_123"
curl -X GET "${BASE_URL}/organizations/${ORG_ID}/groups" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8. Get Organization Resources
```bash
ORG_ID="org_123"
curl -X GET "${BASE_URL}/organizations/${ORG_ID}/resources" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 9. Get Organization Policies
```bash
ORG_ID="org_123"
curl -X GET "${BASE_URL}/organizations/${ORG_ID}/policies" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 10. Get Organization Roles
```bash
ORG_ID="org_123"
curl -X GET "${BASE_URL}/organizations/${ORG_ID}/roles" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 11. Get Organization Settings
```bash
ORG_ID="org_123"
curl -X GET "${BASE_URL}/organizations/${ORG_ID}/settings" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 12. Update Organization Settings (Admin Only)
```bash
ORG_ID="org_123"
curl -X PUT "${BASE_URL}/organizations/${ORG_ID}/settings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mfa_required": true,
    "session_timeout": 3600,
    "password_policy": {
      "min_length": 8,
      "require_uppercase": true,
      "require_lowercase": true,
      "require_numbers": true,
      "require_symbols": true
    }
  }'
```

---

## 👨‍👩‍👧‍👦 Group Management Endpoints

### 1. List Groups
```bash
curl -X GET "${BASE_URL}/groups" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create Group (Admin Only)
```bash
curl -X POST "${BASE_URL}/groups" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development Team",
    "description": "Development team group",
    "organization_id": "org_123"
  }'
```

### 3. Get Group by ID
```bash
GROUP_ID="group_123"
curl -X GET "${BASE_URL}/groups/${GROUP_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update Group (Admin Only)
```bash
GROUP_ID="group_123"
curl -X PUT "${BASE_URL}/groups/${GROUP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Group Name",
    "description": "Updated description"
  }'
```

### 5. Delete Group (Admin Only)
```bash
GROUP_ID="group_123"
curl -X DELETE "${BASE_URL}/groups/${GROUP_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Get Group Members
```bash
GROUP_ID="group_123"
curl -X GET "${BASE_URL}/groups/${GROUP_ID}/members" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Add Group Member (Admin Only)
```bash
GROUP_ID="group_123"
curl -X POST "${BASE_URL}/groups/${GROUP_ID}/members" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "role": "member"
  }'
```

### 8. Remove Group Member (Admin Only)
```bash
GROUP_ID="group_123"
USER_ID="user_123"
curl -X DELETE "${BASE_URL}/groups/${GROUP_ID}/members/${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 9. Get Group Permissions
```bash
GROUP_ID="group_123"
curl -X GET "${BASE_URL}/groups/${GROUP_ID}/permissions" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 📁 Resource Management Endpoints

### 1. List Resources
```bash
curl -X GET "${BASE_URL}/resources" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create Resource
```bash
curl -X POST "${BASE_URL}/resources" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Documents",
    "type": "folder",
    "path": "/projects/documents",
    "organization_id": "org_123"
  }'
```

### 3. Get Resource by ID
```bash
RESOURCE_ID="resource_123"
curl -X GET "${BASE_URL}/resources/${RESOURCE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update Resource
```bash
RESOURCE_ID="resource_123"
curl -X PUT "${BASE_URL}/resources/${RESOURCE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Resource Name",
    "description": "Updated description"
  }'
```

### 5. Delete Resource
```bash
RESOURCE_ID="resource_123"
curl -X DELETE "${BASE_URL}/resources/${RESOURCE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Get Resource Permissions
```bash
RESOURCE_ID="resource_123"
curl -X GET "${BASE_URL}/resources/${RESOURCE_ID}/permissions" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Set Resource Permissions (Admin Only)
```bash
RESOURCE_ID="resource_123"
curl -X POST "${BASE_URL}/resources/${RESOURCE_ID}/permissions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      {
        "user_id": "user_123",
        "permission": "read"
      },
      {
        "group_id": "group_123",
        "permission": "write"
      }
    ]
  }'
```

### 8. Get Resource Access Log
```bash
RESOURCE_ID="resource_123"
curl -X GET "${BASE_URL}/resources/${RESOURCE_ID}/access-log" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 9. Share Resource
```bash
RESOURCE_ID="resource_123"
curl -X POST "${BASE_URL}/resources/${RESOURCE_ID}/share" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_456",
    "permission": "read",
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

### 10. Unshare Resource
```bash
RESOURCE_ID="resource_123"
curl -X DELETE "${BASE_URL}/resources/${RESOURCE_ID}/share" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_456"
  }'
```

---

## 📋 Policy Management Endpoints

### 1. List Policies
```bash
curl -X GET "${BASE_URL}/policies" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create Policy (Admin Only)
```bash
curl -X POST "${BASE_URL}/policies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Access Policy",
    "description": "Policy for document access control",
    "effect": "allow",
    "actions": ["read", "write"],
    "resources": ["resource:documents/*"],
    "conditions": {
      "time_range": "09:00-17:00",
      "ip_whitelist": ["192.168.1.0/24"]
    }
  }'
```

### 3. Get Policy by ID
```bash
POLICY_ID="policy_123"
curl -X GET "${BASE_URL}/policies/${POLICY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update Policy (Admin Only)
```bash
POLICY_ID="policy_123"
curl -X PUT "${BASE_URL}/policies/${POLICY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Policy Name",
    "description": "Updated description",
    "effect": "allow"
  }'
```

### 5. Delete Policy (Admin Only)
```bash
POLICY_ID="policy_123"
curl -X DELETE "${BASE_URL}/policies/${POLICY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Simulate Policy
```bash
POLICY_ID="policy_123"
curl -X POST "${BASE_URL}/policies/${POLICY_ID}/simulate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "action": "read",
    "resource": "resource:documents/file.pdf",
    "context": {
      "ip": "192.168.1.100",
      "time": "2025-09-12T14:30:00Z"
    }
  }'
```

### 7. Get Policy Versions
```bash
POLICY_ID="policy_123"
curl -X GET "${BASE_URL}/policies/${POLICY_ID}/versions" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8. Approve Policy (Admin Only)
```bash
POLICY_ID="policy_123"
curl -X POST "${BASE_URL}/policies/${POLICY_ID}/approve" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.2",
    "comment": "Approved for production"
  }'
```

### 9. Rollback Policy (Admin Only)
```bash
POLICY_ID="policy_123"
curl -X POST "${BASE_URL}/policies/${POLICY_ID}/rollback" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "target_version": "1.1",
    "reason": "Critical security issue"
  }'
```

---

## 🎭 Role Management Endpoints

### 1. List Roles
```bash
curl -X GET "${BASE_URL}/roles" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create Role (Admin Only)
```bash
curl -X POST "${BASE_URL}/roles" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Manager",
    "description": "Role for managing documents",
    "organization_id": "org_123",
    "permissions": ["document:read", "document:write", "document:delete"]
  }'
```

### 3. Get Role by ID
```bash
ROLE_ID="role_123"
curl -X GET "${BASE_URL}/roles/${ROLE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update Role (Admin Only)
```bash
ROLE_ID="role_123"
curl -X PUT "${BASE_URL}/roles/${ROLE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Role Name",
    "description": "Updated description"
  }'
```

### 5. Delete Role (Admin Only)
```bash
ROLE_ID="role_123"
curl -X DELETE "${BASE_URL}/roles/${ROLE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Get Role Policies
```bash
ROLE_ID="role_123"
curl -X GET "${BASE_URL}/roles/${ROLE_ID}/policies" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Attach Policy to Role (Admin Only)
```bash
ROLE_ID="role_123"
curl -X POST "${BASE_URL}/roles/${ROLE_ID}/policies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_id": "policy_123"
  }'
```

### 8. Detach Policy from Role (Admin Only)
```bash
ROLE_ID="role_123"
POLICY_ID="policy_123"
curl -X DELETE "${BASE_URL}/roles/${ROLE_ID}/policies/${POLICY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 9. Get Role Assignments
```bash
ROLE_ID="role_123"
curl -X GET "${BASE_URL}/roles/${ROLE_ID}/assignments" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 10. Assign Role (Admin Only)
```bash
ROLE_ID="role_123"
curl -X POST "${BASE_URL}/roles/${ROLE_ID}/assign" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

### 11. Unassign Role (Admin Only)
```bash
ROLE_ID="role_123"
USER_ID="user_123"
curl -X DELETE "${BASE_URL}/roles/${ROLE_ID}/assign/${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🔄 Session Management Endpoints

### 1. List Sessions
```bash
curl -X GET "${BASE_URL}/sessions" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Get Current Session
```bash
curl -X GET "${BASE_URL}/sessions/current" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3. Revoke Current Session
```bash
curl -X DELETE "${BASE_URL}/sessions/current" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Get Session by ID
```bash
SESSION_ID="session_123"
curl -X GET "${BASE_URL}/sessions/${SESSION_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Revoke Session (Admin Only)
```bash
SESSION_ID="session_123"
curl -X DELETE "${BASE_URL}/sessions/${SESSION_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Extend Session
```bash
SESSION_ID="session_123"
curl -X POST "${BASE_URL}/sessions/${SESSION_ID}/extend" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "extend_by": 3600
  }'
```

---

## 🤖 Service Account Endpoints

### 1. List Service Accounts (Admin Only)
```bash
curl -X GET "${BASE_URL}/service-accounts" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create Service Account (Admin Only)
```bash
curl -X POST "${BASE_URL}/service-accounts" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Service Account",
    "description": "Service account for API access",
    "organization_id": "org_123",
    "permissions": ["api:read", "api:write"]
  }'
```

### 3. Get Service Account
```bash
SA_ID="sa_123"
curl -X GET "${BASE_URL}/service-accounts/${SA_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update Service Account (Admin Only)
```bash
SA_ID="sa_123"
curl -X PUT "${BASE_URL}/service-accounts/${SA_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Service Account",
    "description": "Updated description"
  }'
```

### 5. Delete Service Account (Admin Only)
```bash
SA_ID="sa_123"
curl -X DELETE "${BASE_URL}/service-accounts/${SA_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Generate API Key (Admin Only)
```bash
SA_ID="sa_123"
curl -X POST "${BASE_URL}/service-accounts/${SA_ID}/keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "expires_at": "2025-12-31T23:59:59Z",
    "permissions": ["api:read"]
  }'
```

### 7. List API Keys
```bash
SA_ID="sa_123"
curl -X GET "${BASE_URL}/service-accounts/${SA_ID}/keys" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8. Revoke API Key (Admin Only)
```bash
SA_ID="sa_123"
KEY_ID="key_123"
curl -X DELETE "${BASE_URL}/service-accounts/${SA_ID}/keys/${KEY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 9. Rotate Service Account Keys (Admin Only)
```bash
SA_ID="sa_123"
curl -X POST "${BASE_URL}/service-accounts/${SA_ID}/rotate-keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 🔐 Authorization & Permission Checking Endpoints

### 1. Check Permission
```bash
curl -X POST "${BASE_URL}/authz/check" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "action": "read",
    "resource": "resource:documents/file.pdf",
    "context": {
      "ip": "192.168.1.100",
      "time": "2025-09-12T14:30:00Z"
    }
  }'
```

### 2. Bulk Check Permissions
```bash
curl -X POST "${BASE_URL}/authz/bulk-check" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "user_id": "user_123",
        "action": "read",
        "resource": "resource:documents/file1.pdf"
      },
      {
        "user_id": "user_123",
        "action": "write",
        "resource": "resource:documents/file2.pdf"
      }
    ]
  }'
```

### 3. Get Effective Permissions
```bash
curl -X GET "${BASE_URL}/authz/effective-permissions?user_id=user_123&resource=resource:documents" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Simulate Access
```bash
curl -X POST "${BASE_URL}/authz/simulate-access" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "actions": ["read", "write", "delete"],
    "resource": "resource:documents/file.pdf",
    "context": {
      "ip": "192.168.1.100",
      "time": "2025-09-12T14:30:00Z"
    }
  }'
```

---

## 📊 Audit and Compliance Endpoints

### 1. List Audit Events (Admin Only)
```bash
curl -X GET "${BASE_URL}/audit/events?limit=50&offset=0&from=2025-09-01&to=2025-09-12" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Get Audit Event (Admin Only)
```bash
EVENT_ID="event_123"
curl -X GET "${BASE_URL}/audit/events/${EVENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3. Generate Access Report (Admin Only)
```bash
curl -X GET "${BASE_URL}/audit/reports/access?from=2025-09-01&to=2025-09-12&format=json" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Generate Compliance Report (Admin Only)
```bash
curl -X GET "${BASE_URL}/audit/reports/compliance?from=2025-09-01&to=2025-09-12&standard=SOC2" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Generate Policy Usage Report (Admin Only)
```bash
curl -X GET "${BASE_URL}/audit/reports/policy-usage?from=2025-09-01&to=2025-09-12" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🔍 Access Reviews Endpoints

### 1. List Access Reviews (Admin Only)
```bash
curl -X GET "${BASE_URL}/access-reviews" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Create Access Review (Admin Only)
```bash
curl -X POST "${BASE_URL}/access-reviews" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quarterly Access Review",
    "description": "Quarterly review of user access rights",
    "scope": {
      "organization_id": "org_123",
      "include_groups": ["group_123", "group_456"],
      "include_roles": ["role_123"]
    },
    "reviewers": ["user_admin1", "user_admin2"],
    "due_date": "2025-10-31T23:59:59Z"
  }'
```

### 3. Get Access Review (Admin Only)
```bash
REVIEW_ID="review_123"
curl -X GET "${BASE_URL}/access-reviews/${REVIEW_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Update Access Review (Admin Only)
```bash
REVIEW_ID="review_123"
curl -X PUT "${BASE_URL}/access-reviews/${REVIEW_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "notes": "Review started, initial findings documented"
  }'
```

### 5. Complete Access Review (Admin Only)
```bash
REVIEW_ID="review_123"
curl -X POST "${BASE_URL}/access-reviews/${REVIEW_ID}/complete" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "findings": [
      {
        "user_id": "user_123",
        "action": "revoke",
        "resource": "resource_456",
        "reason": "No longer needed for current role"
      }
    ],
    "summary": "Review completed successfully"
  }'
```

---

## 👑 Admin Endpoints (Super Admin Only)

### 1. Get System Stats
```bash
curl -X GET "${BASE_URL}/admin/stats" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. System Health Check
```bash
curl -X GET "${BASE_URL}/admin/health-check" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3. Enable Maintenance Mode
```bash
curl -X POST "${BASE_URL}/admin/maintenance-mode" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "System maintenance in progress",
    "estimated_duration": "2 hours"
  }'
```

### 4. Disable Maintenance Mode
```bash
curl -X DELETE "${BASE_URL}/admin/maintenance-mode" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Get Global Settings
```bash
curl -X GET "${BASE_URL}/admin/settings" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Update Global Settings
```bash
curl -X PUT "${BASE_URL}/admin/settings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "system_name": "Monkeys Identity Service",
    "default_session_timeout": 3600,
    "max_login_attempts": 5,
    "password_policy": {
      "min_length": 12,
      "require_uppercase": true,
      "require_lowercase": true,
      "require_numbers": true,
      "require_symbols": true,
      "max_age_days": 90
    },
    "mfa_settings": {
      "required_for_admins": true,
      "grace_period_days": 7
    }
  }'
```

---

## 🏥 Public Health Endpoint

### Health Check
```bash
curl -X GET "${BASE_URL}/public/health"
```

---

## 📝 Response Examples

### Successful Authentication Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "def50200abc123...",
      "expires_in": 3600
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "details": "The provided email or password is incorrect"
  }
}
```

---

## 🔧 Environment Variables

Set these environment variables before running the CURL commands:

```bash
# Base configuration
export BASE_URL="http://localhost:8080/api/v1"

# Authentication (get from login response)
export TOKEN="your_jwt_token_here"

# Common IDs (replace with actual IDs from your system)
export USER_ID="user_123"
export ORG_ID="org_123"
export GROUP_ID="group_123"
export RESOURCE_ID="resource_123"
export POLICY_ID="policy_123"
export ROLE_ID="role_123"
export SESSION_ID="session_123"
export SA_ID="sa_123"
export KEY_ID="key_123"
export EVENT_ID="event_123"
export REVIEW_ID="review_123"
```

## 📚 Usage Tips

1. **Authentication Flow**: Start with `/auth/login` to get your JWT token
2. **Token Management**: Use `/auth/refresh` before your token expires
3. **Error Handling**: Check HTTP status codes and response messages
4. **Pagination**: Most list endpoints support `limit` and `offset` parameters
5. **Filtering**: Many endpoints support query parameters for filtering
6. **Rate Limiting**: Be aware of rate limits (check response headers)

## 🔗 Related Documentation

- [Swagger UI](http://localhost:8080/swagger/index.html) - Interactive API documentation
- [Authentication Guide](./docs/authentication.md) - Detailed authentication flow
- [Permission Model](./docs/permissions.md) - Understanding the permission system
- [API Reference](./docs/api-reference.md) - Complete API specification

---

*Generated for Monkeys Identity v1.0 - For the latest updates, visit the Swagger documentation at http://localhost:8080/swagger/index.html*
