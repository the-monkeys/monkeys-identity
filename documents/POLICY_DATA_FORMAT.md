# Policy Data Format Reference

## Create Policy Request Format

### Complete Example
```json
{
    "name": "E2ETestPolicy",
    "description": "End-to-end test policy for comprehensive API testing",
    "effect": "allow",
    "policy_type": "access",
    "status": "active",
    "document": {
        "Version": "2024-01-01",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "resource:Read",
                    "resource:List",
                    "resource:Write"
                ],
                "Resource": [
                    "arn:monkeys:service:region:account:resource/*"
                ]
            }
        ]
    }
}
```

## Field Descriptions

### Required Fields

| Field | Type | Description | Valid Values |
|-------|------|-------------|--------------|
| `name` | string | Policy name (unique identifier) | Any string |
| `effect` | string | Default policy effect | `allow`, `deny` |
| `policy_type` | string | Type of policy | `access`, `resource`, `identity`, `permission` |
| `document` | object | Policy document (JSON) | Valid policy document |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `description` | string | Human-readable description | `""` |
| `status` | string | Policy status | `active` |
| `organization_id` | string | Organization UUID | Current user's org |
| `version` | string | Semantic version | `1.0.0` |

## Policy Document Structure

The `document` field must contain a valid policy document with this structure:

```json
{
    "Version": "2024-01-01",
    "Statement": [
        {
            "Effect": "Allow" | "Deny",
            "Action": ["action:name", ...],
            "Resource": ["arn:...", ...]
        }
    ]
}
```

### Statement Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `Effect` | Yes | string | `Allow` or `Deny` |
| `Action` | Yes | array | List of action strings (e.g., `"resource:Read"`) |
| `Resource` | Yes | array | List of ARN patterns |
| `Sid` | No | string | Statement ID for reference |
| `Condition` | No | object | Conditional logic |

## Policy Types

### Access Policy
Used for controlling access to resources based on user identity.

```json
{
    "name": "AllowReadAccess",
    "policy_type": "access",
    "effect": "allow",
    "document": {
        "Version": "2024-01-01",
        "Statement": [{
            "Effect": "Allow",
            "Action": ["resource:Read", "resource:List"],
            "Resource": ["arn:monkeys:*:*:*:*"]
        }]
    }
}
```

### Resource Policy
Attached to specific resources to control who can access them.

```json
{
    "name": "S3BucketPolicy",
    "policy_type": "resource",
    "effect": "allow",
    "document": {
        "Version": "2024-01-01",
        "Statement": [{
            "Effect": "Allow",
            "Action": ["s3:GetObject"],
            "Resource": ["arn:monkeys:s3:::my-bucket/*"]
        }]
    }
}
```

### Identity Policy
Defines permissions for users, groups, or roles.

```json
{
    "name": "AdminPolicy",
    "policy_type": "identity",
    "effect": "allow",
    "document": {
        "Version": "2024-01-01",
        "Statement": [{
            "Effect": "Allow",
            "Action": ["*"],
            "Resource": ["*"]
        }]
    }
}
```

### Permission Policy
Specific permission sets for granular control.

```json
{
    "name": "BlogPostPermissions",
    "policy_type": "permission",
    "effect": "allow",
    "document": {
        "Version": "2024-01-01",
        "Statement": [{
            "Effect": "Allow",
            "Action": [
                "blog:CreatePost",
                "blog:UpdatePost",
                "blog:DeletePost"
            ],
            "Resource": ["arn:monkeys:blog:*:*:post/*"]
        }]
    }
}
```

## ARN Format

Amazon Resource Name (ARN) format for resources:

```
arn:monkeys:service:region:account:resource/path
```

### Examples

- All resources: `arn:monkeys:*:*:*:*`
- Specific service: `arn:monkeys:s3:*:*:bucket/*`
- Specific resource: `arn:monkeys:blog:us-east-1:123456:post/my-post`

## Action Naming Convention

Actions follow the pattern: `service:Action`

### Examples

- `resource:Read` - Read a resource
- `resource:Write` - Write/update a resource
- `resource:Delete` - Delete a resource
- `resource:List` - List resources
- `s3:GetObject` - S3 get object
- `blog:CreatePost` - Create blog post

## UI Form Data

When using the Policy UI:

1. **Policy Name**: e.g., `AllowReadAccess`
2. **Effect**: Select `Allow` or `Deny`
3. **Policy Type**: Select from dropdown:
   - Access Policy
   - Resource Policy
   - Identity Policy
   - Permission Policy
4. **Status**: Select `Active` or `Suspended`
5. **Description**: Optional human-readable text
6. **Policy Document**: JSON object with Version and Statement

### Sample Policy Document for UI

Click "Load Sample" button or paste this:

```json
{
  "Version": "2024-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "resource:Read",
        "resource:List",
        "resource:Write"
      ],
      "Resource": [
        "arn:monkeys:service:region:account:resource/*"
      ]
    }
  ]
}
```

## Common Validation Errors

### Invalid Policy Type
❌ `"policy_type": "custom"`  
✅ `"policy_type": "access"`

### Document as String (API expects object when creating)
❌ `"document": "{\"Version\": \"2024-01-01\"}"`  
✅ `"document": {"Version": "2024-01-01", ...}`

### Missing Required Fields
❌ Missing `Effect` in Statement  
✅ Include `Effect`, `Action`, and `Resource` in each Statement

### Invalid Effect Value
❌ `"Effect": "permit"`  
✅ `"Effect": "Allow"` or `"Effect": "Deny"`

## API Response Format

After creating a policy, the API returns:

```json
{
    "id": "uuid-here",
    "name": "E2ETestPolicy",
    "description": "End-to-end test policy",
    "version": "1.0.0",
    "organization_id": "org-uuid",
    "document": "{\"Version\":\"2024-01-01\",...}",
    "policy_type": "access",
    "effect": "allow",
    "is_system_policy": false,
    "status": "active",
    "created_by": "user-uuid",
    "created_at": "2025-12-19T05:32:10Z",
    "updated_at": "2025-12-19T05:32:10Z"
}
```

Note: The `document` field is returned as a JSON string, not an object.

## Testing

### Quick Test

1. Open browser to http://localhost:5173
2. Login with: policytester@monkeys.com / SecurePass123!
3. Navigate to Policies
4. Click "+ New Policy"
5. Fill in:
   - Name: `TestPolicy`
   - Effect: `Allow`
   - Type: `Access Policy`
   - Status: `Active`
6. Click "Load Sample" for policy document
7. Click "Create Policy"

### Expected Result

✅ Success message: "Policy created successfully"  
✅ New policy appears in the list  
✅ Version: 1.0.0  
✅ Status badge shows "active"

---

**Last Updated**: 2025-12-19  
**Backend Version**: 1.0  
**UI Version**: 1.0
