-- Migration: 000005_oidc_support
-- Description: Add support for OIDC authorization codes and enhance oauth_clients

-- Authorization Codes table
CREATE TABLE IF NOT EXISTS oidc_codes (
    code VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    nonce VARCHAR(255),
    redirect_uri TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_oidc_codes_expires ON oidc_codes(expires_at);
CREATE INDEX idx_oidc_codes_client_user ON oidc_codes(client_id, user_id);

-- Add support for OIDC branding in organizations (optional but good for IdP)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1024);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50);
