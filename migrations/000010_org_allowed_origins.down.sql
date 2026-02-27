DROP INDEX IF EXISTS idx_org_allowed_origins;

ALTER TABLE organizations DROP COLUMN IF EXISTS allowed_origins;