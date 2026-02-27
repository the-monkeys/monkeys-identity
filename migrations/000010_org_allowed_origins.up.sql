-- Add per-organization allowed origins for dynamic CORS.
-- Each organization can specify which frontend domains are allowed to make
-- cross-origin requests. This eliminates the need to restart containers
-- when new tenants register.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allowed_origins TEXT[] DEFAULT '{}';

-- Index to support the aggregation query that collects all origins across orgs.
CREATE INDEX IF NOT EXISTS idx_org_allowed_origins ON organizations USING GIN (allowed_origins) WHERE status != 'deleted';
