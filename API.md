# Monkeys IAM API Documentation

## Overview

The Monkeys IAM API provides comprehensive identity and access management functionality built with Go Fiber. This document outlines all available endpoints and their usage.

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Public Endpoints

#### Health Check
```http
GET /api/v1/public/health
```
Returns system health status.

### Authentication

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "display_name": "John Doe",
  "organization_id": "org-uuid"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "your-refresh-token"
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### User Management

#### List Users
```http
GET /api/v1/users
Authorization: Bearer <token>
```

#### Create User
```http
POST /api/v1/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "display_name": "New User",
  "organization_id": "org-uuid"
}
```

#### Get User
```http
GET /api/v1/users/{id}
Authorization: Bearer <token>
```

#### Update User
```http
PUT /api/v1/users/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "Updated Name",
  "email": "updated@example.com"
}
```

#### Delete User
```http
DELETE /api/v1/users/{id}
Authorization: Bearer <token>
```

### Organization Management

#### List Organizations
```http
GET /api/v1/organizations
Authorization: Bearer <token>
```

#### Create Organization
```http
POST /api/v1/organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Organization",
  "slug": "new-org",
  "description": "Organization description"
}
```

#### Get Organization
```http
GET /api/v1/organizations/{id}
Authorization: Bearer <token>
```

#### Update Organization
```http
PUT /api/v1/organizations/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Organization",
  "description": "Updated description"
}
```

### Group Management

#### List Groups
```http
GET /api/v1/groups
Authorization: Bearer <token>
```

#### Create Group
```http
POST /api/v1/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Development Team",
  "description": "Development team group",
  "group_type": "team"
}
```

#### Add Group Member
```http
POST /api/v1/groups/{id}/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "principal_id": "user-uuid",
  "principal_type": "user",
  "role_in_group": "member"
}
```

### Resource Management

#### List Resources
```http
GET /api/v1/resources
Authorization: Bearer <token>
```

#### Create Resource
```http
POST /api/v1/resources
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "API Documentation",
  "arn": "arn:monkey:docs:us-east-1:org:resource/api-docs",
  "type": "object",
  "description": "API documentation resource"
}
```

#### Get Resource
```http
GET /api/v1/resources/{id}
Authorization: Bearer <token>
```

#### Share Resource
```http
POST /api/v1/resources/{id}/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "principal_id": "user-uuid",
  "principal_type": "user",
  "permissions": ["read", "write"]
}
```

### Policy Management

#### List Policies
```http
GET /api/v1/policies
Authorization: Bearer <token>
```

#### Create Policy
```http
POST /api/v1/policies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "ReadOnlyPolicy",
  "description": "Read-only access policy",
  "document": {
    "Version": "2024-01-01",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["read:*"],
        "Resource": "*"
      }
    ]
  }
}
```

#### Check Permission
```http
POST /api/v1/authz/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "principal_id": "user-uuid",
  "action": "read:content",
  "resource": "arn:monkey:docs:us-east-1:org:resource/api-docs"
}
```

### Role Management

#### List Roles
```http
GET /api/v1/roles
Authorization: Bearer <token>
```

#### Create Role
```http
POST /api/v1/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Developer",
  "description": "Developer role with appropriate permissions",
  "role_type": "custom"
}
```

#### Assign Role
```http
POST /api/v1/roles/{id}/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "principal_id": "user-uuid",
  "principal_type": "user"
}
```

#### Attach Policy to Role
```http
POST /api/v1/roles/{id}/policies
Authorization: Bearer <token>
Content-Type: application/json

{
  "policy_id": "policy-uuid"
}
```

### Session Management

#### List Sessions
```http
GET /api/v1/sessions
Authorization: Bearer <token>
```

#### Get Current Session
```http
GET /api/v1/sessions/current
Authorization: Bearer <token>
```

#### Revoke Session
```http
DELETE /api/v1/sessions/{id}
Authorization: Bearer <token>
```

### Service Accounts

#### List Service Accounts
```http
GET /api/v1/service-accounts
Authorization: Bearer <token>
```

#### Create Service Account
```http
POST /api/v1/service-accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "api-service",
  "description": "Service account for API access"
}
```

#### Generate API Key
```http
POST /api/v1/service-accounts/{id}/keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production API Key",
  "scopes": ["read:users", "write:logs"],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### Audit & Compliance

#### List Audit Events
```http
GET /api/v1/audit/events
Authorization: Bearer <token>
```

#### Generate Access Report
```http
GET /api/v1/audit/reports/access
Authorization: Bearer <token>
```

#### Create Access Review
```http
POST /api/v1/access-reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Q1 2024 Access Review",
  "description": "Quarterly access review",
  "scope": {
    "departments": ["engineering"],
    "roles": ["developer", "admin"]
  },
  "due_date": "2024-03-31T23:59:59Z"
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Error description"
  }
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited to 100 requests per minute per IP address by default.

## Pagination

List endpoints support pagination using query parameters:

```
GET /api/v1/users?page=1&limit=20&sort=created_at&order=desc
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field (default: created_at)
- `order` - Sort order: asc/desc (default: desc)

## Filtering

Many list endpoints support filtering:

```
GET /api/v1/users?status=active&organization_id=org-uuid&search=john
```

## WebSocket Support

Real-time notifications are available via WebSocket:

```
ws://localhost:8080/api/v1/ws
Authorization: Bearer <token>
```

Events include:
- User login/logout
- Permission changes
- Policy updates
- Security alerts

This API documentation provides a comprehensive overview of the Monkeys IAM system endpoints. All endpoints are fully implemented with proper authentication, authorization, and audit logging.
