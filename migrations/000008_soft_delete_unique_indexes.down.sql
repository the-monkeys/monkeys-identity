-- Revert to full unique indexes (no soft-delete exclusion)

DROP INDEX IF EXISTS unique_username_per_org;
DROP INDEX IF EXISTS unique_email_per_org;

CREATE UNIQUE INDEX unique_username_per_org ON users (organization_id, username);
CREATE UNIQUE INDEX unique_email_per_org    ON users (organization_id, email);
