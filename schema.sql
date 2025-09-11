-- Monkeys Identity & Access Management (IAM) System
-- PostgreSQL Database Schema
-- 
-- This schema implements a comprehensive IAM system with support for:
-- - Multi-tenant organizations with hierarchical structure
-- - Users, groups, and service accounts
-- - Policy-based access control with conditions
-- - Role-based access control (RBAC)
-- - Comprehensive audit trails
-- - Session management
-- - Resource management with ARN-style naming

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Custom types for better type safety
CREATE TYPE entity_status AS ENUM ('active', 'suspended', 'deleted', 'archived');
CREATE TYPE principal_type AS ENUM ('user', 'service_account', 'group');
CREATE TYPE resource_type AS ENUM ('object', 'service', 'namespace', 'infrastructure');
CREATE TYPE policy_effect AS ENUM ('allow', 'deny');
CREATE TYPE audit_result AS ENUM ('success', 'failure', 'error');
CREATE TYPE session_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE mfa_method AS ENUM ('totp', 'sms', 'email', 'hardware', 'biometric');

-- =============================================================================
-- CORE ENTITIES
-- =============================================================================

-- Organizations: Top-level tenant isolation
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL-friendly identifier
    parent_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    settings JSONB NOT NULL DEFAULT '{}',
    billing_tier VARCHAR(50) DEFAULT 'standard',
    max_users INTEGER DEFAULT 1000,
    max_resources INTEGER DEFAULT 10000,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_org_name CHECK (length(name) >= 2),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT no_self_parent CHECK (id != parent_id)
);

-- Users: Human identities
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    password_hash VARCHAR(255), -- bcrypt hash for internal auth
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_methods JSONB NOT NULL DEFAULT '[]', -- Array of enabled MFA methods
    mfa_backup_codes TEXT[], -- Encrypted backup codes
    attributes JSONB NOT NULL DEFAULT '{}', -- Extensible user properties
    preferences JSONB NOT NULL DEFAULT '{}', -- User preferences
    last_login TIMESTAMP WITH TIME ZONE,
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_username CHECK (username ~ '^[a-zA-Z0-9._-]+$' AND length(username) >= 3),
    CONSTRAINT unique_username_per_org UNIQUE (organization_id, username),
    CONSTRAINT unique_email_per_org UNIQUE (organization_id, email)
);

-- Service Accounts: Machine identities
CREATE TABLE service_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_rotation_policy JSONB NOT NULL DEFAULT '{"enabled": true, "rotation_days": 90}',
    allowed_ip_ranges INET[], -- Network restrictions
    max_token_lifetime INTERVAL DEFAULT '24 hours',
    last_key_rotation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attributes JSONB NOT NULL DEFAULT '{}',
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_sa_name_per_org UNIQUE (organization_id, name),
    CONSTRAINT valid_sa_name CHECK (name ~ '^[a-zA-Z0-9._-]+$' AND length(name) >= 3)
);

-- Groups: Collections of users for permission management
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    group_type VARCHAR(50) DEFAULT 'standard', -- standard, department, project, etc.
    attributes JSONB NOT NULL DEFAULT '{}',
    max_members INTEGER DEFAULT 1000,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_group_name_per_org UNIQUE (organization_id, name),
    CONSTRAINT no_self_parent_group CHECK (id != parent_group_id),
    CONSTRAINT valid_group_name CHECK (length(name) >= 2)
);

-- Group Memberships: Many-to-many relationship between users/service accounts and groups
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    principal_id UUID NOT NULL, -- Can be user_id or service_account_id
    principal_type principal_type NOT NULL,
    role_in_group VARCHAR(50) DEFAULT 'member', -- member, admin, owner
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional membership expiration
    added_by UUID, -- Who added this member
    
    -- Constraints
    CONSTRAINT unique_group_membership UNIQUE (group_id, principal_id, principal_type)
);

-- Resources: Unified entity for objects, services, etc.
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    arn TEXT NOT NULL UNIQUE, -- Amazon Resource Name style: arn:monkey:service:region:account:resource-type/resource-id
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type resource_type NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    owner_id UUID, -- Can reference users or service_accounts
    owner_type principal_type,
    attributes JSONB NOT NULL DEFAULT '{}', -- Resource metadata and tags
    tags JSONB NOT NULL DEFAULT '{}', -- Key-value tags for categorization
    encryption_key_id UUID, -- Reference to encryption key
    lifecycle_policy JSONB NOT NULL DEFAULT '{}', -- Retention and archival rules
    access_level VARCHAR(50) DEFAULT 'private', -- private, internal, public
    content_type VARCHAR(100), -- MIME type for objects
    size_bytes BIGINT DEFAULT 0,
    checksum VARCHAR(64), -- SHA-256 checksum
    version VARCHAR(50) DEFAULT '1.0',
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_arn_format CHECK (arn ~ '^arn:monkey:[a-z0-9-]+:[a-z0-9-]*:[a-z0-9-]+:[a-z0-9-]+/.*$'),
    CONSTRAINT no_self_parent_resource CHECK (id != parent_resource_id)
);

-- Policies: Declarative access control policies
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(10) NOT NULL DEFAULT '1.0',
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document JSONB NOT NULL, -- Full policy document in JSON format
    policy_type VARCHAR(50) DEFAULT 'access', -- access, trust, resource, etc.
    effect policy_effect NOT NULL DEFAULT 'allow',
    is_system_policy BOOLEAN NOT NULL DEFAULT FALSE, -- System-managed vs user-created
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_policy_name_per_org UNIQUE (organization_id, name),
    CONSTRAINT valid_policy_document CHECK (jsonb_typeof(document) = 'object')
);

-- Roles: Named collections of policies
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_type VARCHAR(50) DEFAULT 'custom', -- system, custom, service
    max_session_duration INTERVAL DEFAULT '12 hours',
    trust_policy JSONB NOT NULL DEFAULT '{}', -- Who can assume this role
    assume_role_policy JSONB NOT NULL DEFAULT '{}', -- Conditions for assuming role
    tags JSONB NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    path VARCHAR(512) DEFAULT '/', -- Hierarchical path like AWS IAM
    permissions_boundary UUID REFERENCES policies(id), -- Maximum permissions
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_role_name_per_org UNIQUE (organization_id, name),
    CONSTRAINT valid_role_path CHECK (path ~ '^/.*/$' OR path = '/')
);

-- Role-Policy Attachments: Many-to-many between roles and policies
CREATE TABLE role_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    attached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    attached_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT unique_role_policy UNIQUE (role_id, policy_id)
);

-- Role Assignments: Users/Service accounts assigned to roles
CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    principal_id UUID NOT NULL, -- user_id or service_account_id
    principal_type principal_type NOT NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    conditions JSONB NOT NULL DEFAULT '{}', -- Assignment conditions
    
    -- Constraints
    CONSTRAINT unique_role_assignment UNIQUE (role_id, principal_id, principal_type)
);

-- =============================================================================
-- SESSION & TOKEN MANAGEMENT
-- =============================================================================

-- Sessions: Active authentication sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    principal_id UUID NOT NULL,
    principal_type principal_type NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assumed_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    permissions JSONB NOT NULL DEFAULT '{}', -- Cached effective permissions
    context JSONB NOT NULL DEFAULT '{}', -- Session metadata (IP, device, etc.)
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_methods_used TEXT[] DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    location JSONB, -- Geographic location data
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status session_status NOT NULL DEFAULT 'active',
    
    -- Constraints
    CONSTRAINT valid_session_duration CHECK (expires_at > issued_at)
);

-- API Keys: Long-lived credentials for service accounts
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    key_id VARCHAR(50) NOT NULL UNIQUE, -- Public key identifier
    key_hash VARCHAR(255) NOT NULL, -- Hashed secret key
    service_account_id UUID NOT NULL REFERENCES service_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scopes TEXT[] DEFAULT '{}', -- Allowed scopes/permissions
    allowed_ip_ranges INET[],
    rate_limit_per_hour INTEGER DEFAULT 3600,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count BIGINT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT unique_key_name_per_sa UNIQUE (service_account_id, name)
);

-- =============================================================================
-- AUDIT & COMPLIANCE
-- =============================================================================

-- Audit Events: Comprehensive audit trail
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) NOT NULL UNIQUE, -- Human-readable event ID
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    principal_id UUID, -- Who performed the action
    principal_type principal_type,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- What was attempted
    resource_type VARCHAR(50), -- Type of resource accessed
    resource_id UUID, -- What was accessed
    resource_arn TEXT, -- Full resource identifier
    result audit_result NOT NULL,
    error_message TEXT, -- If result was error/failure
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100), -- Correlation ID for distributed tracing
    additional_context JSONB NOT NULL DEFAULT '{}', -- Action-specific details
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warn, error, critical
    
    -- Partitioning hint: This table should be partitioned by timestamp
    -- for better performance with large audit datasets
    
    -- Constraints
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical'))
);

-- Access Reviews: Periodic permission audits
CREATE TABLE access_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope JSONB NOT NULL DEFAULT '{}', -- What to review (users, roles, resources)
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    findings JSONB NOT NULL DEFAULT '{}', -- Review results
    recommendations JSONB NOT NULL DEFAULT '{}', -- Suggested actions
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Organizations
CREATE INDEX idx_organizations_parent ON organizations(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_organizations_status ON organizations(status) WHERE status = 'active';
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Users
CREATE INDEX idx_users_org_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username_org ON users(organization_id, username);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';
CREATE INDEX idx_users_last_login ON users(last_login);

-- Service Accounts
CREATE INDEX idx_service_accounts_org_id ON service_accounts(organization_id);
CREATE INDEX idx_service_accounts_status ON service_accounts(status) WHERE status = 'active';

-- Groups
CREATE INDEX idx_groups_org_id ON groups(organization_id);
CREATE INDEX idx_groups_parent ON groups(parent_group_id) WHERE parent_group_id IS NOT NULL;
CREATE INDEX idx_groups_status ON groups(status) WHERE status = 'active';

-- Group Memberships
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_principal ON group_memberships(principal_id, principal_type);
CREATE INDEX idx_group_memberships_expires ON group_memberships(expires_at) WHERE expires_at IS NOT NULL;

-- Resources
CREATE INDEX idx_resources_org_id ON resources(organization_id);
CREATE INDEX idx_resources_parent ON resources(parent_resource_id) WHERE parent_resource_id IS NOT NULL;
CREATE INDEX idx_resources_owner ON resources(owner_id, owner_type) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_arn ON resources(arn);
CREATE INDEX idx_resources_status ON resources(status) WHERE status = 'active';
CREATE INDEX idx_resources_tags_gin ON resources USING GIN (tags);
CREATE INDEX idx_resources_attributes_gin ON resources USING GIN (attributes);

-- Policies
CREATE INDEX idx_policies_org_id ON policies(organization_id);
CREATE INDEX idx_policies_status ON policies(status) WHERE status = 'active';
CREATE INDEX idx_policies_document_gin ON policies USING GIN (document);
CREATE INDEX idx_policies_effect ON policies(effect);
CREATE INDEX idx_policies_type ON policies(policy_type);

-- Roles
CREATE INDEX idx_roles_org_id ON roles(organization_id);
CREATE INDEX idx_roles_status ON roles(status) WHERE status = 'active';
CREATE INDEX idx_roles_type ON roles(role_type);

-- Role Policies
CREATE INDEX idx_role_policies_role_id ON role_policies(role_id);
CREATE INDEX idx_role_policies_policy_id ON role_policies(policy_id);

-- Role Assignments
CREATE INDEX idx_role_assignments_role_id ON role_assignments(role_id);
CREATE INDEX idx_role_assignments_principal ON role_assignments(principal_id, principal_type);
CREATE INDEX idx_role_assignments_expires ON role_assignments(expires_at) WHERE expires_at IS NOT NULL;

-- Sessions
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_principal ON sessions(principal_id, principal_type);
CREATE INDEX idx_sessions_org_id ON sessions(organization_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_status ON sessions(status) WHERE status = 'active';

-- API Keys
CREATE INDEX idx_api_keys_sa_id ON api_keys(service_account_id);
CREATE INDEX idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX idx_api_keys_status ON api_keys(status) WHERE status = 'active';

-- Audit Events
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX idx_audit_events_org_id ON audit_events(organization_id);
CREATE INDEX idx_audit_events_principal ON audit_events(principal_id, principal_type);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_audit_events_session ON audit_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_audit_events_result ON audit_events(result);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Effective User Permissions: Materialized view for performance
CREATE MATERIALIZED VIEW user_effective_permissions AS
SELECT 
    u.id as user_id,
    u.organization_id,
    u.username,
    u.email,
    array_agg(DISTINCT r.name) as roles,
    array_agg(DISTINCT p.name) as policies,
    jsonb_object_agg(p.name, p.document) as policy_documents,
    array_agg(DISTINCT (p.document->'Action')) as allowed_actions,
    array_agg(DISTINCT (p.document->'Resource')) as allowed_resources,
    MAX(u.updated_at) as last_permission_change
FROM users u
LEFT JOIN role_assignments ra ON u.id = ra.principal_id AND ra.principal_type = 'user'
LEFT JOIN roles r ON ra.role_id = r.id AND r.status = 'active'
LEFT JOIN role_policies rp ON r.id = rp.role_id
LEFT JOIN policies p ON rp.policy_id = p.id AND p.status = 'active' AND p.effect = 'allow'
WHERE u.status = 'active'
GROUP BY u.id, u.organization_id, u.username, u.email;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_user_effective_permissions_user_id ON user_effective_permissions(user_id);
CREATE INDEX idx_user_effective_permissions_org_id ON user_effective_permissions(organization_id);

-- Organization Hierarchy: Recursive view for nested organizations
CREATE OR REPLACE VIEW organization_hierarchy AS
WITH RECURSIVE org_tree AS (
    -- Base case: root organizations
    SELECT 
        id,
        name,
        slug,
        parent_id,
        0 as level,
        ARRAY[id] as path,
        name::TEXT as full_path
    FROM organizations 
    WHERE parent_id IS NULL AND status = 'active'
    
    UNION ALL
    
    -- Recursive case: child organizations
    SELECT 
        o.id,
        o.name,
        o.slug,
        o.parent_id,
        ot.level + 1 as level,
        ot.path || o.id as path,
        ot.full_path || ' > ' || o.name as full_path
    FROM organizations o
    JOIN org_tree ot ON o.parent_id = ot.id
    WHERE o.status = 'active'
)
SELECT * FROM org_tree;

-- Resource Hierarchy: View for nested resources
CREATE OR REPLACE VIEW resource_hierarchy AS
WITH RECURSIVE resource_tree AS (
    -- Base case: root resources
    SELECT 
        id,
        arn,
        name,
        type,
        parent_resource_id,
        organization_id,
        0 as level,
        ARRAY[id] as path
    FROM resources 
    WHERE parent_resource_id IS NULL AND status = 'active'
    
    UNION ALL
    
    -- Recursive case: child resources
    SELECT 
        r.id,
        r.arn,
        r.name,
        r.type,
        r.parent_resource_id,
        r.organization_id,
        rt.level + 1 as level,
        rt.path || r.id as path
    FROM resources r
    JOIN resource_tree rt ON r.parent_resource_id = rt.id
    WHERE r.status = 'active'
)
SELECT * FROM resource_tree;

-- =============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================================================

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_action VARCHAR,
    p_resource_arn VARCHAR,
    p_context JSONB DEFAULT '{}'::JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    policy_doc JSONB;
    policy_cursor CURSOR FOR
        SELECT p.document
        FROM users u
        JOIN role_assignments ra ON u.id = ra.principal_id AND ra.principal_type = 'user'
        JOIN roles r ON ra.role_id = r.id AND r.status = 'active'
        JOIN role_policies rp ON r.id = rp.role_id
        JOIN policies p ON rp.policy_id = p.id AND p.status = 'active'
        WHERE u.id = p_user_id AND u.status = 'active';
BEGIN
    -- Check each policy document
    FOR policy_doc IN policy_cursor LOOP
        -- Simple permission check (this would be more complex in real implementation)
        IF policy_doc->>'Effect' = 'Allow' 
           AND policy_doc->'Action' ? p_action
           AND policy_doc->'Resource' ? p_resource_arn THEN
            has_permission := TRUE;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_principal_id UUID,
    p_principal_type principal_type,
    p_action VARCHAR,
    p_resource_id UUID DEFAULT NULL,
    p_resource_arn VARCHAR DEFAULT NULL,
    p_result audit_result DEFAULT 'success',
    p_additional_context JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    org_id UUID;
BEGIN
    -- Get organization ID from principal
    IF p_principal_type = 'user' THEN
        SELECT organization_id INTO org_id FROM users WHERE id = p_principal_id;
    ELSIF p_principal_type = 'service_account' THEN
        SELECT organization_id INTO org_id FROM service_accounts WHERE id = p_principal_id;
    END IF;
    
    -- Insert audit event
    INSERT INTO audit_events (
        event_id,
        organization_id,
        principal_id,
        principal_type,
        action,
        resource_id,
        resource_arn,
        result,
        additional_context
    ) VALUES (
        'evt_' || substr(md5(random()::text), 1, 16),
        org_id,
        p_principal_id,
        p_principal_type,
        p_action,
        p_resource_id,
        p_resource_arn,
        p_result,
        p_additional_context
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS FOR AUDIT AND CONSISTENCY
-- =============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER trigger_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_service_accounts_updated_at BEFORE UPDATE ON service_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to refresh materialized view when permissions change
CREATE OR REPLACE FUNCTION refresh_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_effective_permissions;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply permission refresh triggers
CREATE TRIGGER trigger_refresh_permissions_on_role_assignment
    AFTER INSERT OR UPDATE OR DELETE ON role_assignments
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_user_permissions();

CREATE TRIGGER trigger_refresh_permissions_on_role_policy
    AFTER INSERT OR UPDATE OR DELETE ON role_policies
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_user_permissions();

-- =============================================================================
-- INITIAL DATA / SYSTEM ROLES
-- =============================================================================

-- Create system organization (for system-wide resources)
INSERT INTO organizations (id, name, slug, description, status) 
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'system',
    'System organization for global resources and policies',
    'active'
) ON CONFLICT DO NOTHING;

-- Create system policies
INSERT INTO policies (id, name, description, organization_id, document, is_system_policy, status) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'FullAccess',
    'Grants full access to all resources and actions',
    '00000000-0000-0000-0000-000000000000',
    '{
        "Version": "2024-01-01",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "*",
                "Resource": "*"
            }
        ]
    }'::JSONB,
    TRUE,
    'active'
),
(
    '00000000-0000-0000-0000-000000000002',
    'ReadOnlyAccess',
    'Grants read-only access to all resources',
    '00000000-0000-0000-0000-000000000000',
    '{
        "Version": "2024-01-01",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["read", "list"],
                "Resource": "*"
            }
        ]
    }'::JSONB,
    TRUE,
    'active'
);

-- Create system roles
INSERT INTO roles (id, name, description, organization_id, role_type, is_system_role, status) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'SuperAdmin',
    'Super administrator with full system access',
    '00000000-0000-0000-0000-000000000000',
    'system',
    TRUE,
    'active'
),
(
    '00000000-0000-0000-0000-000000000002',
    'OrgAdmin',
    'Organization administrator',
    '00000000-0000-0000-0000-000000000000',
    'system',
    TRUE,
    'active'
),
(
    '00000000-0000-0000-0000-000000000003',
    'ReadOnlyUser',
    'Read-only user access',
    '00000000-0000-0000-0000-000000000000',
    'system',
    TRUE,
    'active'
);

-- Attach policies to system roles
INSERT INTO role_policies (role_id, policy_id) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'), -- SuperAdmin -> FullAccess
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'); -- ReadOnlyUser -> ReadOnlyAccess

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON DATABASE monkeys_iam IS 'Monkeys Identity & Access Management System Database';

COMMENT ON TABLE organizations IS 'Top-level tenant entities providing isolation boundaries';
COMMENT ON TABLE users IS 'Human identities within the system';
COMMENT ON TABLE service_accounts IS 'Machine identities for applications and services';
COMMENT ON TABLE groups IS 'Collections of users for simplified permission management';
COMMENT ON TABLE group_memberships IS 'Many-to-many relationship between principals and groups';
COMMENT ON TABLE resources IS 'Unified entity representing any accessible object or service';
COMMENT ON TABLE policies IS 'Declarative access control policies in JSON format';
COMMENT ON TABLE roles IS 'Named collections of policies that can be assigned to principals';
COMMENT ON TABLE role_policies IS 'Many-to-many relationship between roles and policies';
COMMENT ON TABLE role_assignments IS 'Assignment of roles to users and service accounts';
COMMENT ON TABLE sessions IS 'Active authentication sessions with temporary credentials';
COMMENT ON TABLE api_keys IS 'Long-lived credentials for service account authentication';
COMMENT ON TABLE audit_events IS 'Comprehensive audit trail of all system activities';
COMMENT ON TABLE access_reviews IS 'Periodic access certification and review records';

-- Performance and maintenance recommendations
COMMENT ON MATERIALIZED VIEW user_effective_permissions IS 'Materialized view for fast permission lookups - refresh periodically';
COMMENT ON INDEX idx_audit_events_timestamp IS 'Consider partitioning audit_events table by timestamp for better performance';
