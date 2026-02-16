-- Migration: 000005_oidc_support (Down)
DROP TABLE IF EXISTS oidc_codes;
ALTER TABLE organizations DROP COLUMN IF EXISTS logo_url;
ALTER TABLE organizations DROP COLUMN IF EXISTS primary_color;
