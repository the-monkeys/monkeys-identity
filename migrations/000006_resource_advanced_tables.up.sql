-- Migration: 000006_resource_advanced_tables
-- Description: Create resource_permissions, resource_access_log, and resource_shares tables
-- These tables support the resource sharing, permissions management, and access logging features

-- Resource Permissions
CREATE TABLE IF NOT EXISTS resource_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    principal_id UUID NOT NULL,
    principal_type VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    effect VARCHAR(10) NOT NULL DEFAULT 'allow',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    CONSTRAINT unique_resource_permission UNIQUE (resource_id, principal_id, principal_type, permission)
);

CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource_id ON resource_permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_principal ON resource_permissions(principal_id, principal_type);

-- Resource Shares
CREATE TABLE IF NOT EXISTS resource_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    principal_id UUID NOT NULL,
    principal_type VARCHAR(50) NOT NULL,
    access_level VARCHAR(50) NOT NULL DEFAULT 'read',
    expires_at TIMESTAMP WITH TIME ZONE,
    shared_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_resource_share UNIQUE (resource_id, principal_id, principal_type)
);

CREATE INDEX IF NOT EXISTS idx_resource_shares_resource_id ON resource_shares(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_shares_principal ON resource_shares(principal_id, principal_type);

-- Resource Access Log
CREATE TABLE IF NOT EXISTS resource_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_resource_access_log_resource_id ON resource_access_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_access_log_timestamp ON resource_access_log(timestamp DESC);
