-- Fix unique constraints to exclude soft-deleted users.
-- This allows re-creation of users with the same username/email after deletion.

-- Drop existing constraints/indexes (may be either constraint or plain index)
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_username_per_org;
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_email_per_org;
DROP INDEX IF EXISTS unique_username_per_org;
DROP INDEX IF EXISTS unique_email_per_org;

-- Recreate as partial unique indexes that only apply to non-deleted users
CREATE UNIQUE INDEX unique_username_per_org ON users (organization_id, username) WHERE status != 'deleted';
CREATE UNIQUE INDEX unique_email_per_org    ON users (organization_id, email)    WHERE status != 'deleted';
