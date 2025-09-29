-- Monkeys Identity & Access Management (IAM) System
-- Default Data Initialization Script
-- 
-- This script creates all default entities needed for the system to function:
-- - Default organization
-- - Default roles (admin, user, viewer, etc.)
-- - Default admin user
-- - Default system user
-- - Default policies

-- =============================================================================
-- CLEAN UP EXISTING TEST DATA (if any)
-- =============================================================================

-- Clean up in proper order due to foreign key constraints
DELETE FROM role_assignments WHERE principal_id IN (
    SELECT id FROM users WHERE username IN ('admin', 'system', 'orgadmin', 'demouser', 'viewer')
);
DELETE FROM users WHERE username IN ('admin', 'system', 'orgadmin', 'demouser', 'viewer');
DELETE FROM role_policies WHERE role_id IN (
    SELECT id FROM roles WHERE name IN ('admin', 'user', 'viewer', 'service', 'org-admin')
);
DELETE FROM roles WHERE name IN ('admin', 'user', 'viewer', 'service', 'org-admin');
DELETE FROM policies WHERE name IN ('FullAccess', 'ReadOnlyAccess', 'OrganizationAdminAccess', 'StandardUserAccess', 'ServiceAccountAccess');

-- =============================================================================
-- DEFAULT ORGANIZATION (reuse existing or create new with different slug)
-- =============================================================================

INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    settings,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Default Organization',
    'default',
    'Default organization for initial system setup',
    '{"theme": "default", "timezone": "UTC", "language": "en"}',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- DEFAULT ROLES (using correct schema structure)
-- =============================================================================

-- Super Admin Role (full system access)
INSERT INTO roles (
    id,
    name,
    description,
    organization_id,
    role_type,
    trust_policy,
    assume_role_policy,
    is_system_role,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000010',
    'admin',
    'Full administrative access to all system resources',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["*"], "resource": ["*"]}]}',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Organization Admin Role
INSERT INTO roles (
    id,
    name,
    description,
    organization_id,
    role_type,
    trust_policy,
    assume_role_policy,
    is_system_role,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000011',
    'org-admin',
    'Administrative access within organization scope',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["organization:*", "users:*", "groups:*", "roles:read"], "resource": ["*"]}]}',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- User Role (standard user permissions)
INSERT INTO roles (
    id,
    name,
    description,
    organization_id,
    role_type,
    trust_policy,
    assume_role_policy,
    is_system_role,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000012',
    'user',
    'Standard user permissions for regular operations',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["profile:read", "profile:update", "resources:read"], "resource": ["*"]}]}',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Viewer Role (read-only access)
INSERT INTO roles (
    id,
    name,
    description,
    organization_id,
    role_type,
    trust_policy,
    assume_role_policy,
    is_system_role,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000013',
    'viewer',
    'Read-only access to permitted resources',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["profile:read", "resources:read"], "resource": ["*"]}]}',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Service Account Role
INSERT INTO roles (
    id,
    name,
    description,
    organization_id,
    role_type,
    trust_policy,
    assume_role_policy,
    is_system_role,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000014',
    'service',
    'Service account permissions for API access',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "service_account"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["api:read", "api:write", "resources:read"], "resource": ["*"]}]}',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- =============================================================================
-- DEFAULT POLICIES
-- =============================================================================

-- Full Access Policy (for super admins)
INSERT INTO groups (
    id,
    name,
    description,
    organization_id,
    parent_group_id,
    group_type,
    attributes,
    max_members,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000802',
    'General Users',
    'General users group for default access',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'standard',
    '{"auto_assign": true}',
    500,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;
                "effect": "allow",
                "action": ["*"],
                "resource": ["*"],
                "condition": {}
            }
        ]
    }',
    'access',
    'allow',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Read Only Access Policy 
INSERT INTO groups (
    id,
    name,
    description,
    organization_id,
    parent_group_id,
    group_type,
    attributes,
    max_members,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000803',
    'Security Operations',
    'Security operations and incident response team',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000800',
    'security',
    '{"auto_assign": false}',
    25,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;
                "effect": "allow",
                "action": [
                    "users:read",
                    "roles:read", 
                    "policies:read",
                    "organizations:read",
                    "resources:read",
                    "profile:read",
                    "audit:read"
                ],
                "resource": ["*"],
                "condition": {}
            }
        ]
    }',
    'access',
    'allow',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Organization Admin Policy
INSERT INTO policies (
    id,
    name,
    description,
    organization_id,
    parent_group_id,
    group_type,
    attributes,
    max_members,
    status,
    created_at,
    updated_at
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'OrganizationAdminAccess',
    'Administrative access within organization scope',
    '00000000-0000-4000-8000-000000000001',
    '{"auto_assign": false}',
    20,
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "users:*",
                    "groups:*",
                    "roles:read",
                    "roles:update",
                    "policies:read",
                    "resources:*",
                    "profile:*",
                    "organization:read",
                    "organization:update",
                    "audit:read"
                ],
                "resource": ["arn:monkeys:iam:org:${organization_id}/*"],
                "condition": {}
            }
        ]
    }',
    'access',
    'allow',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Standard User Policy
INSERT INTO policies (
    id,
    name,
    description,
    organization_id,
    version,
    document,
    policy_type,
    effect,
    is_system_policy,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000004',
    'StandardUserAccess',
    'Standard user access policy for regular operations',
    '00000000-0000-4000-8000-000000000001',
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "profile:read",
                    "profile:update",
                    "resources:read",
                    "users:read"
                ],
                "resource": [
                    "arn:monkeys:iam:user:${user_id}",
                    "arn:monkeys:iam:org:${organization_id}/resource/*"
                ],
                "condition": {}
            }
        ]
    }',
    'access',
    'allow',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Service Account Policy
INSERT INTO policies (
    id,
    name,
    description,
    organization_id,
    version,
    document,
    policy_type,
    effect,
    is_system_policy,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000005',
    'ServiceAccountAccess',
    'Service account permissions for API operations',
    '00000000-0000-4000-8000-000000000001',
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "api:*",
                    "resources:*",
                    "users:read",
                    "audit:write"
                ],
                "resource": ["*"],
                "condition": {
                    "IpAddress": {
                        "aws:SourceIp": ["0.0.0.0/0"]
                    }
                }
            }
        ]
    }',
    'access',
    'allow',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- =============================================================================
-- DEFAULT USERS (using correct schema structure)
-- =============================================================================

-- Default Admin User
-- Password: AdminPassword123! (hashed with bcrypt)
INSERT INTO users (
    id,
    username,
    email,
    display_name,
    organization_id,
    password_hash,
    status,
    email_verified,
    attributes,
    preferences,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000100',
    'admin',
    'admin@monkeys-identity.local',
    'System Administrator',
    '00000000-0000-4000-8000-000000000001',
    '$2a$10$8K1p/a0dBxeCOVOwYep1POVhsGSLm/8G6.YcCYo6h8OXYr7OqcFJy', -- AdminPassword123!
    'active',
    true,
    '{"title": "System Administrator", "department": "IT", "location": "System"}',
    '{"theme": "dark", "language": "en", "timezone": "UTC", "notifications": true}',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, username) DO NOTHING;

-- Default System User (for internal operations)
-- Password: SystemPassword123! (hashed with bcrypt)
INSERT INTO users (
    id,
    username,
    email,
    display_name,
    organization_id,
    password_hash,
    status,
    email_verified,
    attributes,
    preferences,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000101',
    'system',
    'system@monkeys-identity.local',
    'System User',
    '00000000-0000-4000-8000-000000000001',
    '$2a$10$9L2q/b1eGyfDPWPxZfq2QUWitHSMn/9H7.ZdDZp7i9PYZs8PrdGKu', -- SystemPassword123!
    'active',
    true,
    '{"title": "System User", "department": "System", "location": "Internal"}',
    '{"theme": "default", "language": "en", "timezone": "UTC", "notifications": false}',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, username) DO NOTHING;

-- Demo Organization Admin User
-- Password: OrgAdmin123! (hashed with bcrypt)
INSERT INTO users (
    id,
    username,
    email,
    display_name,
    organization_id,
    password_hash,
    status,
    email_verified,
    attributes,
    preferences,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000102',
    'orgadmin',
    'orgadmin@monkeys-identity.local',
    'Organization Administrator',
    '00000000-0000-4000-8000-000000000001',
    '$2a$10$QJ8KmV7VjNwKjgFpR8nY9eLxGjO3qQ5YzV8bX2cH9dK1nP4xR6sT8u', -- OrgAdmin123!
    'active',
    true,
    '{"title": "Organization Administrator", "department": "Operations", "location": "Main Office"}',
    '{"theme": "light", "language": "en", "timezone": "UTC", "notifications": true}',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, username) DO NOTHING;

-- Demo Regular User
-- Password: User123! (hashed with bcrypt)
INSERT INTO users (
    id,
    username,
    email,
    display_name,
    organization_id,
    password_hash,
    status,
    email_verified,
    attributes,
    preferences,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000103',
    'demouser',
    'demouser@monkeys-identity.local',
    'Demo User',
    '00000000-0000-4000-8000-000000000001',
    '$2a$10$8F3dV2nK9aLpQ6rX4sY1wO7MgH5iT3zE8qR9uC2bN1vJ0xP7kL4mS', -- User123!
    'active',
    true,
    '{"title": "Demo User", "department": "General", "location": "Remote"}',
    '{"theme": "auto", "language": "en", "timezone": "UTC", "notifications": true}',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, username) DO NOTHING;

-- Demo Viewer User (Read-only)
-- Password: Viewer123! (hashed with bcrypt)
INSERT INTO users (
    id,
    username,
    email,
    display_name,
    organization_id,
    password_hash,
    status,
    email_verified,
    attributes,
    preferences,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000104',
    'viewer',
    'viewer@monkeys-identity.local',
    'Demo Viewer',
    '00000000-0000-4000-8000-000000000001',
    '$2a$10$7A8bP1qR5xM3wK6zN9yH2eL4cF7iS2dO5vT8uJ9nQ1mX0pK3gH6vY', -- Viewer123!
    'active',
    true,
    '{"title": "Demo Viewer", "department": "Audit", "location": "Main Office"}',
    '{"theme": "light", "language": "en", "timezone": "UTC", "notifications": false}',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, username) DO NOTHING;

-- =============================================================================
-- DEFAULT GROUPS (sample organizational groups)
-- =============================================================================

-- Admin Group
INSERT INTO groups (
    id,
    name,
    description,
    organization_id,
    parent_group_id,
    group_type,
    attributes,
    max_members,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000800',
    'Administrators',
    'System and organization administrators',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'security',
    '{"auto_assign": false}',
    10,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- IT Department Group
INSERT INTO groups (
    id,
    name,
    description,
    organization_id,
    parent_group_id,
    group_type,
    attributes,
    max_members,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000801',
    'IT Department',
    'Information Technology department staff',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'department',
    '{"auto_assign": false}',
    50,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- General Users Group
INSERT INTO groups (
    id,
    name,
    description,
    organization_id,
    parent_group_id,
    group_type,
    attributes,
    max_members,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000802',
    'General Users',
    'Standard organization users',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'functional',
    '{"auto_assign": true}',
    1000,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Auditors Group
INSERT INTO groups (
    id,
    name,
    description,
    organization_id,
    parent_group_id,
    group_type,
    attributes,
    max_members,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000803',
    'Auditors',
    'Users with audit and compliance access',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'security',
    '{"auto_assign": false}',
    20,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- =============================================================================
-- DEFAULT RESOURCES (sample protected resources)
-- =============================================================================

-- User Management Resource
INSERT INTO resources (
    id,
    name,
    description,
    organization_id,
    type,
    arn,
    attributes,
    tags,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000900',
    'User Management System',
    'User creation, modification, and deletion operations',
    '00000000-0000-4000-8000-000000000001',
    'application',
    'arn:monkeys:iam:org:00000000-0000-4000-8000-000000000001:resource/user-management',
    '{"endpoint": "/api/v1/users", "methods": ["GET", "POST", "PUT", "DELETE"], "rate_limit": 100}',
    '{"category": "user-management", "criticality": "high", "department": "IT"}',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Role Management Resource
INSERT INTO resources (
    id,
    name,
    description,
    organization_id,
    type,
    arn,
    attributes,
    tags,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000901',
    'Role Management System',
    'Role and permission management operations',
    '00000000-0000-4000-8000-000000000001',
    'application',
    'arn:monkeys:iam:org:00000000-0000-4000-8000-000000000001:resource/role-management',
    '{"endpoint": "/api/v1/roles", "methods": ["GET", "POST", "PUT", "DELETE"], "rate_limit": 50}',
    '{"category": "access-control", "criticality": "high", "department": "IT"}',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Organization Settings Resource
INSERT INTO resources (
    id,
    name,
    description,
    organization_id,
    type,
    arn,
    attributes,
    tags,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000902',
    'Organization Settings',
    'Organization configuration and settings management',
    '00000000-0000-4000-8000-000000000001',
    'configuration',
    'arn:monkeys:iam:org:00000000-0000-4000-8000-000000000001:resource/org-settings',
    '{"endpoint": "/api/v1/organizations", "methods": ["GET", "PUT"], "rate_limit": 20}',
    '{"category": "configuration", "criticality": "medium", "department": "Operations"}',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Audit Logs Resource
INSERT INTO resources (
    id,
    name,
    description,
    organization_id,
    type,
    arn,
    attributes,
    tags,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000903',
    'Audit Logs',
    'System audit logs and compliance reporting',
    '00000000-0000-4000-8000-000000000001',
    'data',
    'arn:monkeys:iam:org:00000000-0000-4000-8000-000000000001:resource/audit-logs',
    '{"endpoint": "/api/v1/audit", "methods": ["GET"], "rate_limit": 200, "retention_days": 2555}',
    '{"category": "audit", "criticality": "high", "department": "Compliance"}',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- API Documentation Resource
INSERT INTO resources (
    id,
    name,
    description,
    organization_id,
    type,
    arn,
    attributes,
    tags,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000904',
    'API Documentation',
    'System API documentation and developer resources',
    '00000000-0000-4000-8000-000000000001',
    'documentation',
    'arn:monkeys:iam:org:00000000-0000-4000-8000-000000000001:resource/api-docs',
    '{"endpoint": "/api/docs", "methods": ["GET"], "rate_limit": 1000, "public": true}',
    '{"category": "documentation", "criticality": "low", "department": "Development"}',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (organization_id, name) DO NOTHING;

-- =============================================================================
-- DEFAULT ROLE ASSIGNMENTS (using correct schema structure)
-- =============================================================================

-- Assign admin role to admin user
INSERT INTO role_assignments (
    id,
    role_id,
    principal_type,
    principal_id,
    assigned_by,
    assigned_at,
    conditions
) VALUES (
    '00000000-0000-4000-8000-000000000200',
    '00000000-0000-4000-8000-000000000010',
    'user',
    '00000000-0000-4000-8000-000000000100',
    '00000000-0000-4000-8000-000000000100', -- Self-assigned during bootstrap
    NOW(),
    '{}'
) ON CONFLICT (role_id, principal_id, principal_type) DO NOTHING;

-- Assign service role to system user
INSERT INTO role_assignments (
    id,
    role_id,
    principal_type,
    principal_id,
    assigned_by,
    assigned_at,
    conditions
) VALUES (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000014',
    'user',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000100', -- Assigned by admin
    NOW(),
    '{}'
) ON CONFLICT (role_id, principal_id, principal_type) DO NOTHING;

-- Assign org-admin role to orgadmin user
INSERT INTO role_assignments (
    id,
    role_id,
    principal_type,
    principal_id,
    assigned_by,
    assigned_at,
    conditions
) VALUES (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000011',
    'user',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000100', -- Assigned by admin
    NOW(),
    '{}'
) ON CONFLICT (role_id, principal_id, principal_type) DO NOTHING;

-- Assign user role to demouser
INSERT INTO role_assignments (
    id,
    role_id,
    principal_type,
    principal_id,
    assigned_by,
    assigned_at,
    conditions
) VALUES (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000012',
    'user',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000100', -- Assigned by admin
    NOW(),
    '{}'
) ON CONFLICT (role_id, principal_id, principal_type) DO NOTHING;

-- Assign viewer role to viewer user
INSERT INTO role_assignments (
    id,
    role_id,
    principal_type,
    principal_id,
    assigned_by,
    assigned_at,
    conditions
) VALUES (
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000013',
    'user',
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000100', -- Assigned by admin
    NOW(),
    '{}'
) ON CONFLICT (role_id, principal_id, principal_type) DO NOTHING;

-- =============================================================================
-- DEFAULT ROLE POLICIES (using correct schema structure)
-- =============================================================================

-- Attach FullAccess policy to admin role
INSERT INTO role_policies (
    id,
    role_id,
    policy_id,
    attached_by,
    attached_at
) VALUES (
    '00000000-0000-4000-8000-000000000700',
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-4000-8000-000000000100',
    NOW()
) ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Attach FullAccess policy to service role (for API operations)
INSERT INTO role_policies (
    id,
    role_id,
    policy_id,
    attached_by,
    attached_at
) VALUES (
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000014',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-4000-8000-000000000100',
    NOW()
) ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Attach OrganizationAdminAccess policy to org-admin role
INSERT INTO role_policies (
    id,
    role_id,
    policy_id,
    attached_by,
    attached_at
) VALUES (
    '00000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-4000-8000-000000000100',
    NOW()
) ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Attach StandardUserAccess policy to user role
INSERT INTO role_policies (
    id,
    role_id,
    policy_id,
    attached_by,
    attached_at
) VALUES (
    '00000000-0000-4000-8000-000000000703',
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-4000-8000-000000000100',
    NOW()
) ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Attach ReadOnlyAccess policy to viewer role
INSERT INTO role_policies (
    id,
    role_id,
    policy_id,
    attached_by,
    attached_at
) VALUES (
    '00000000-0000-4000-8000-000000000704',
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-4000-8000-000000000100',
    NOW()
) ON CONFLICT (role_id, policy_id) DO NOTHING;

-- =============================================================================
-- REFRESH MATERIALIZED VIEWS
-- =============================================================================

-- Refresh the user effective permissions view
REFRESH MATERIALIZED VIEW user_effective_permissions;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify default data was created successfully
DO $$
DECLARE
    org_count INTEGER;
    user_count INTEGER;
    role_count INTEGER;
    assignment_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO org_count FROM organizations WHERE name = 'Default Organization';
    SELECT COUNT(*) INTO user_count FROM users WHERE username IN ('admin', 'system', 'orgadmin', 'demouser', 'viewer');
    SELECT COUNT(*) INTO role_count FROM roles WHERE name IN ('admin', 'user', 'viewer', 'service', 'org-admin');
    SELECT COUNT(*) INTO assignment_count FROM role_assignments WHERE principal_type = 'user';
    SELECT COUNT(*) INTO policy_count FROM policies WHERE name IN ('FullAccess', 'ReadOnlyAccess', 'OrganizationAdminAccess', 'StandardUserAccess', 'ServiceAccountAccess');
    
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Default data initialization completed successfully!';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Organizations: %', org_count;
    RAISE NOTICE '- Users: %', user_count;
    RAISE NOTICE '- Roles: %', role_count;
    RAISE NOTICE '- Role Assignments: %', assignment_count;
    RAISE NOTICE '- Policies: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Default User Credentials:';
    RAISE NOTICE '- Super Admin: admin@monkeys-identity.local / AdminPassword123!';
    RAISE NOTICE '- System User: system@monkeys-identity.local / SystemPassword123!';
    RAISE NOTICE '- Org Admin: orgadmin@monkeys-identity.local / OrgAdmin123!';
    RAISE NOTICE '- Demo User: demouser@monkeys-identity.local / User123!';
    RAISE NOTICE '- Demo Viewer: viewer@monkeys-identity.local / Viewer123!';
    RAISE NOTICE '';
    RAISE NOTICE 'Access Levels:';
    RAISE NOTICE '- admin: Full system access (all operations)';
    RAISE NOTICE '- system: Service account access (API operations)';
    RAISE NOTICE '- orgadmin: Organization administration';
    RAISE NOTICE '- demouser: Standard user operations';
    RAISE NOTICE '- viewer: Read-only access to all resources';
    RAISE NOTICE '====================================================';
    
    IF org_count = 0 OR user_count < 5 OR role_count < 5 OR policy_count < 5 THEN
        RAISE EXCEPTION 'Default data initialization failed - insufficient data created. Expected: 1 org, 5 users, 5 roles, 5 policies. Got: % orgs, % users, % roles, % policies', org_count, user_count, role_count, policy_count;
    END IF;
END $$;
