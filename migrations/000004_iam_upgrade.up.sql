-- Add OAuth Clients table for SSO/Federation
CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL, -- BCrypt hash of the secret
    redirect_uris TEXT[] NOT NULL, -- Array of valid callback URLs
    grant_types TEXT[] NOT NULL DEFAULT '{"authorization_code", "refresh_token"}',
    response_types TEXT[] NOT NULL DEFAULT '{"code"}',
    scope TEXT NOT NULL DEFAULT 'openid profile email',
    is_public BOOLEAN DEFAULT FALSE, -- True for SPA/Mobile apps (PKCE required)
    is_trusted BOOLEAN DEFAULT FALSE, -- True for internal apps (skip consent)
    logo_url VARCHAR(1024),
    policy_uri VARCHAR(1024),
    tos_uri VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_oauth_clients_org_id ON oauth_clients(organization_id);

-- Update Users table for MFA
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_recovery_codes TEXT[];

-- Update Audit Events to ensure it covers all needs
-- (Assuming table exists from 001, but ensuring columns)
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS user_agent VARCHAR(1024);
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS status_code INTEGER; -- HTTP status or custom error code
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255); -- To trace requests across services

-- Create Feature Flags table for gradual rollout
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Null for global flags
    key VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, key)
);
