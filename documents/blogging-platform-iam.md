# Blogging Platform IAM Setup

This document describes the Identity and Access Management (IAM) configuration for a blogging platform built on the Monkeys IAM system.

## Overview

The blogging platform allows multiple users to create and manage blogs with the following access control requirements:

- **Blog Owners**: Full CRUD operations + invite/manage co-authors
- **Co-Authors**: Edit, publish, archive (cannot delete)
- **Readers**: Read access to published blogs only
- **Privacy**: Draft and archived blogs are only visible to owners and co-authors

## IAM Architecture

### Resources
- **Blog Resources**: `arn:monkey:blog:{org-id}:blog/{blog-id}`
- **Resource Attributes**:
  - `blog_status`: `draft` | `published` | `archived`
  - `co_authors`: Array of user IDs
  - `owner`: User ID of blog owner

### Roles

#### 1. Blog Owner (`blog-owner`)
- **Description**: Full control over owned blogs
- **Permissions**:
  - `blog:create` - Create new blogs
  - `blog:read` - Read all owned blogs (including drafts/archives)
  - `blog:update` - Edit blog content
  - `blog:delete` - Delete blogs
  - `blog:publish` - Publish drafts
  - `blog:archive` - Archive blogs
  - `blog:invite-co-author` - Add co-authors
  - `blog:remove-co-author` - Remove co-authors

#### 2. Blog Co-Author (`blog-co-author`)
- **Description**: Collaborative editing access
- **Permissions**:
  - `blog:read` - Read co-authored blogs (including drafts/archives)
  - `blog:update` - Edit blog content
  - `blog:publish` - Publish drafts
  - `blog:archive` - Archive blogs
  - **Denied**: `blog:delete` (cannot delete)

#### 3. Blog Reader (`blog-reader`)
- **Description**: Public read access
- **Permissions**:
  - `blog:read` - Read published blogs only

### Policies

#### BlogOwnerPolicy
```json
{
  "version": "2024-01-01",
  "statement": [
    {
      "effect": "allow",
      "action": ["blog:create", "blog:read", "blog:update", "blog:delete", "blog:publish", "blog:archive", "blog:invite-co-author", "blog:remove-co-author"],
      "resource": ["arn:monkey:blog:*:*:blog/*"],
      "condition": {
        "StringEquals": {"blog:owner": "${user.id}"}
      }
    }
  ]
}
```

#### BlogCoAuthorPolicy
```json
{
  "version": "2024-01-01",
  "statement": [
    {
      "effect": "allow",
      "action": ["blog:read", "blog:update", "blog:publish", "blog:archive"],
      "resource": ["arn:monkey:blog:*:*:blog/*"],
      "condition": {
        "StringEquals": {"blog:co-author": "${user.id}"}
      }
    },
    {
      "effect": "deny",
      "action": ["blog:delete"],
      "resource": ["arn:monkey:blog:*:*:blog/*"]
    }
  ]
}
```

#### BlogReaderPolicy
```json
{
  "version": "2024-01-01",
  "statement": [
    {
      "effect": "allow",
      "action": ["blog:read"],
      "resource": ["arn:monkey:blog:*:*:blog/*"],
      "condition": {
        "StringEquals": {"blog:status": "published"}
      }
    }
  ]
}
```

## API Usage

### Blog Management APIs

#### Create Blog
```http
POST /api/v1/resources
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Blog Post",
  "description": "Blog description",
  "type": "blog",
  "attributes": {
    "blog_status": "draft",
    "co_authors": [],
    "category": "technology"
  }
}
```

#### Update Blog
```http
PUT /api/v1/resources/{blog-id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Blog Title",
  "attributes": {
    "blog_status": "published",
    "co_authors": ["user-id-1", "user-id-2"]
  }
}
```

#### Invite Co-Author
```http
POST /api/v1/resources/{blog-id}/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "principal_id": "user-id",
  "principal_type": "user",
  "role_id": "blog-co-author-role-id",
  "actions": ["blog:read", "blog:update", "blog:publish", "blog:archive"]
}
```

### Access Control APIs

#### Check Permission
```http
POST /api/v1/authz/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "blog:update",
  "resource": "arn:monkey:blog:org-id:blog/blog-id",
  "context": {
    "blog:owner": "owner-user-id",
    "blog:co-author": "current-user-id",
    "blog:status": "draft"
  }
}
```

#### Get Effective Permissions
```http
GET /api/v1/authz/effective-permissions?resource=arn:monkey:blog:org-id:blog/blog-id
Authorization: Bearer {token}
```

## User Access Matrix

| User Type | Blog Status | Actions Allowed |
|-----------|-------------|-----------------|
| **Owner** | Any | create, read, update, delete, publish, archive, invite/remove co-authors |
| **Co-Author** | Any | read, update, publish, archive |
| **Reader** | Published | read |
| **Reader** | Draft/Archived | ❌ No access |
| **Public** | Published | read |
| **Public** | Draft/Archived | ❌ No access |

## Implementation Steps

1. **Create Blog Resource Type**: Extend the resource_type enum
2. **Define Roles**: Create blog-owner, blog-co-author, blog-reader roles
3. **Create Policies**: Implement the three policies with appropriate conditions
4. **Attach Policies to Roles**: Link policies to their respective roles
5. **Resource Management**: Implement blog CRUD operations with IAM checks
6. **Co-Author Management**: Implement invite/remove co-author functionality
7. **Access Control**: Integrate permission checks in all blog operations

## Database Schema Extensions

The existing IAM schema supports this implementation through:

- **Resources table**: Stores blog metadata and ownership
- **Role assignments**: Links users to blog-specific roles
- **Policies**: Define granular permissions
- **Resource attributes**: Store blog status and co-author lists

## Security Considerations

1. **Resource Ownership**: Always verify user ownership before allowing modifications
2. **Co-Author Validation**: Validate co-author permissions on each operation
3. **Status-Based Access**: Enforce draft/archived visibility restrictions
4. **Audit Logging**: Log all blog operations for compliance
5. **Rate Limiting**: Implement rate limits on blog creation/modification

## Testing

Use the sample data provided in the migration to test:

- Admin user (ID: 00000000-0000-4000-8000-000000000002) owns sample blogs
- Regular user (ID: 00000000-0000-4000-8000-000000000003) has reader access
- Test draft blog visibility restrictions
- Test co-author permission limitations