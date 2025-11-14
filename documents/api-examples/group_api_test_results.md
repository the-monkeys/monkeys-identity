# Group Management API - Test Results
## Test Date: 2025-12-18 (Updated)
## Base URL: http://localhost:8085/api/v1
## Status: ✅ All Endpoints Passing

---

## Summary

**Total Endpoints Tested:** 9  
**Successful:** 9 ✅  
**Failed:** 0

### Recent Fixes
1. **PUT /groups/:id** - Fixed partial update support (was returning 500 error)
2. **Conflict Handling** - Added proper 409 responses for duplicate group names in CREATE and UPDATE operations

---

## 1. GET /groups - List Groups

**Endpoint:** `GET /api/v1/groups`
**Method:** GET
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** None

**Response (Status: 200):**
```json
{
  "status": 200,
  "message": "Groups retrieved successfully",
  "data": {
    "items": [
      {
        "id": "00000000-0000-4000-8000-000000000800",
        "name": "Administrators",
        "description": "System and organization administrators",
        "organization_id": "00000000-0000-4000-8000-000000000001",
        "parent_group_id": null,
        "group_type": "security",
        "attributes": "{\"auto_assign\": false}",
        "max_members": 10,
        "status": "active",
        "created_at": "2025-12-18T14:30:12.661423Z",
        "updated_at": "2025-12-18T14:30:12.661423Z",
        "deleted_at": null
      },
      {
        "id": "00000000-0000-4000-8000-000000000801",
        "name": "IT Department",
        "description": "Information Technology department staff",
        "organization_id": "00000000-0000-4000-8000-000000000001",
        "parent_group_id": null,
        "group_type": "department",
        "attributes": "{\"auto_assign\": false}",
        "max_members": 50,
        "status": "active",
        "created_at": "2025-12-18T14:30:12.661423Z",
        "updated_at": "2025-12-18T14:30:12.661423Z",
        "deleted_at": null
      },
      {
        "id": "00000000-0000-4000-8000-000000000802",
        "name": "General Users",
        "description": "General users group for default access",
        "organization_id": "00000000-0000-4000-8000-000000000001",
        "parent_group_id": null,
        "group_type": "standard",
        "attributes": "{\"auto_assign\": true}",
        "max_members": 500,
        "status": "active",
        "created_at": "2025-12-18T14:30:12.661423Z",
        "updated_at": "2025-12-18T14:30:12.661423Z",
        "deleted_at": null
      },
      {
        "id": "00000000-0000-4000-8000-000000000803",
        "name": "Security Operations",
        "description": "Security operations and incident response team",
        "organization_id": "00000000-0000-4000-8000-000000000001",
        "parent_group_id": "00000000-0000-4000-8000-000000000800",
        "group_type": "security",
        "attributes": "{\"auto_assign\": false}",
        "max_members": 25,
        "status": "active",
        "created_at": "2025-12-18T14:30:12.661423Z",
        "updated_at": "2025-12-18T14:30:12.661423Z",
        "deleted_at": null
      },
      {
        "id": "00000000-0000-4000-8000-000000000804",
        "name": "Auditors",
        "description": "Users with audit and compliance access",
        "organization_id": "00000000-0000-4000-8000-000000000001",
        "parent_group_id": null,
        "group_type": "security",
        "attributes": "{\"auto_assign\": false}",
        "max_members": 20,
        "status": "active",
        "created_at": "2025-12-18T14:30:12.661423Z",
        "updated_at": "2025-12-18T14:30:12.661423Z",
        "deleted_at": null
      }
    ],
    "total": 5,
    "limit": 50,
    "offset": 0,
    "has_more": false,
    "total_pages": 0
  }
}
```

---

## 2. POST /groups - Create Group

**Endpoint:** `POST /api/v1/groups`
**Method:** POST
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "name": "Engineering Team",
  "description": "Engineering department group",
  "organization_id": "00000000-0000-4000-8000-000000000001",
  "group_type": "department",
  "max_members": 100
}
```

**Response (Status: 201):**
```json
{
  "status": 201,
  "message": "Group created successfully",
  "data": {
    "id": "ca70039c-b145-4ab3-8b2e-1b741a51d1d6",
    "name": "Engineering Team",
    "description": "Engineering department group",
    "organization_id": "00000000-0000-4000-8000-000000000001",
    "parent_group_id": null,
    "group_type": "department",
    "attributes": "{}",
    "max_members": 100,
    "status": "active",
    "created_at": "2025-12-18T14:35:03.865419Z",
    "updated_at": "2025-12-18T14:35:03.865419Z",
    "deleted_at": null
  }
}
```

**Error Response - Conflict (Status: 409):**
```json
{
  "status": 409,
  "error": "group_already_exists",
  "message": "A group with this name already exists in the organization"
}
```


---

## 4. PUT /groups/:id - Update Group

**Endpoint:** `PUT /api/v1/groups/{id}`
**Method:** PUT
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "name": "Engineering Team - Updated",
  "description": "Updated engineering department group with new description",
  "max_members": 150
}
```

**Path Parameters:**
- `id`: 82427a76-fcf4-4362-a036-d94dae7d7b23

**Response (Status: 200):**
```json
{
  "status": 200,
  "message": "Group updated successfully",
  "data": {
    "id": "82427a76-fcf4-4362-a036-d94dae7d7b23",
    "name": "Engineering Team - Updated",
    "description": "Updated engineering department group with new description",
    "organization_id": "00000000-0000-4000-8000-000000000001",
    "parent_group_id": null,
    "group_type": "department",
    "attributes": "{}",
    "max_members": 150,
    "status": "active",
    "created_at": "2025-12-18T14:47:09.59725Z",
    "updated_at": "2025-12-18T14:47:22.871075Z",
    "deleted_at": null
  }
}
```

**Notes:**
- Only fields provided in the request are updated
- Supports partial updates (name, description, max_members, status)
- Other fields remain unchanged

**Error Response - Conflict (Status: 409):**
```json
{
  "status": 409,
  "error": "group_name_conflict",
  "message": "A group with this name already exists in the organization"
}
```


---

## 5. GET /groups/:id - Get Specific Group

**Endpoint:** `GET /api/v1/groups/{id}`
**Method:** GET
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** None

**Path Parameters:**
- `id`: ca70039c-b145-4ab3-8b2e-1b741a51d1d6

**Response (Status: 200):**
```json
{
  "status": 200,
  "message": "Group retrieved successfully",
  "data": {
    "id": "ca70039c-b145-4ab3-8b2e-1b741a51d1d6",
    "name": "Engineering Team",
    "description": "Engineering department group",
    "organization_id": "00000000-0000-4000-8000-000000000001",
    "parent_group_id": null,
    "group_type": "department",
    "attributes": "{}",
    "max_members": 100,
    "status": "active",
    "created_at": "2025-12-18T14:35:03.865419Z",
    "updated_at": "2025-12-18T14:35:03.865419Z",
    "deleted_at": null
  }
}
```

---

## 6. GET /groups/:id/members - Get Group Members

**Endpoint:** `GET /api/v1/groups/{id}/members`
**Method:** GET
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** None

**Path Parameters:**
- `id`: ca70039c-b145-4ab3-8b2e-1b741a51d1d6

**Response (Status: 200):**
```json
{
  "status": 200,
  "message": "Group members retrieved successfully",
  "data": {
    "count": 0,
    "group_id": "ca70039c-b145-4ab3-8b2e-1b741a51d1d6",
    "members": null
  }
}
```

---

## 7. POST /groups/:id/members - Add Group Member

**Endpoint:** `POST /api/v1/groups/{id}/members`
**Method:** POST
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "principal_id": "39fc3320-9eab-47ea-86ea-dfc939d7159c",
  "principal_type": "user",
  "role_in_group": "member"
}
```

**Path Parameters:**
- `id`: ca70039c-b145-4ab3-8b2e-1b741a51d1d6

**Response (Status: 201):**
```json
{
  "status": 201,
  "message": "Group member added successfully",
  "data": {
    "id": "949a7535-935f-4c2b-90cb-7b2ad843a3a8",
    "group_id": "ca70039c-b145-4ab3-8b2e-1b741a51d1d6",
    "principal_id": "39fc3320-9eab-47ea-86ea-dfc939d7159c",
    "principal_type": "user",
    "role_in_group": "member",
    "joined_at": "2025-12-18T14:39:46.790552Z",
    "expires_at": "0001-01-01T00:00:00Z",
    "added_by": "39fc3320-9eab-47ea-86ea-dfc939d7159c"
  }
}
```

---

## 8. DELETE /groups/:id/members/:user_id - Remove Group Member

**Endpoint:** `DELETE /api/v1/groups/{id}/members/{user_id}`
**Method:** DELETE
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** None

**Path Parameters:**
- `id`: ca70039c-b145-4ab3-8b2e-1b741a51d1d6
- `user_id`: 39fc3320-9eab-47ea-86ea-dfc939d7159c

**Response (Status: 200):**
```json
{
  "status": 200,
  "message": "Group member removed successfully",
  "data": {
    "group_id": "ca70039c-b145-4ab3-8b2e-1b741a51d1d6",
    "principal_id": "39fc3320-9eab-47ea-86ea-dfc939d7159c",
    "removed": true
  }
}
```

---

## 9. GET /groups/:id/permissions - Get Group Permissions

**Endpoint:** `GET /api/v1/groups/{id}/permissions`
**Method:** GET
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** None

**Path Parameters:**
- `id`: ca70039c-b145-4ab3-8b2e-1b741a51d1d6

**Response (Status: 200):**
```json
{
  "status": 200,
  "message": "Group permissions retrieved successfully",
  "data": {
    "group_id": "ca70039c-b145-4ab3-8b2e-1b741a51d1d6",
    "permissions": "{\"group_id\":\"ca70039c-b145-4ab3-8b2e-1b741a51d1d6\",\"allow\":null,\"deny\":null,\"summary\":{\"allow_count\":0,\"deny_count\":0}}"
  }
}
```

---

## 10. DELETE /groups/:id - Delete Group

**Endpoint:** `DELETE /api/v1/groups/{id}`
**Method:** DELETE
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** None

**Path Parameters:**
- `id`: ca70039c-b145-4ab3-8b2e-1b741a51d1d6

**Response (Status: 200):**
```json
{
  "status": 200,
  "message": "Group deleted successfully",
  "data": {
    "deleted_at": "2025-12-18T14:41:42.126129669Z",
    "group_id": "ca70039c-b145-4ab3-8b2e-1b741a51d1d6"
  }
}
```

---

## Implementation Details

### Authentication
All endpoints require Bearer token authentication in the Authorization header.

### Admin Role Required
The following endpoints require admin role:
- POST /groups (Create group)
- PUT /groups/:id (Update group)
- DELETE /groups/:id (Delete group)
- POST /groups/:id/members (Add member)
- DELETE /groups/:id/members/:user_id (Remove member)

### Conflict Handling (409 Responses)
Both CREATE and UPDATE endpoints properly handle duplicate group names:
- Returns **409 Conflict** status code
- Provides clear error message indicating the group name already exists
- Database constraint: Group names must be unique within an organization
- Error is detected at the database layer and properly propagated to the API layer

### Partial Updates Support
The PUT /groups/:id endpoint supports partial updates:
- Only fields provided in the request are updated (name, description, max_members, status)
- Missing fields retain their current values
- Immutable fields (organization_id, group_type) are preserved

### Error Handling
Consistent error responses across all endpoints:
- **400 Bad Request** - Invalid request format or missing required fields
- **401 Unauthorized** - Missing or invalid authentication token
- **403 Forbidden** - Insufficient permissions (admin role required)
- **404 Not Found** - Group or resource not found
- **409 Conflict** - Duplicate group name in organization
- **500 Internal Server Error** - Unexpected server errors

---

## Test Environment
- Service: Monkeys IAM
- Port: 8085
- Database: PostgreSQL
- Cache: Redis
- Admin User: admin@monkeys.com
- Organization ID: 00000000-0000-4000-8000-000000000001
