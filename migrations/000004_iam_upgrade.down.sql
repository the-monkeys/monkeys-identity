-- Revert Feature Flags
DROP TABLE IF EXISTS feature_flags;

-- Revert Audit Events updates (Columns only, carefully)
ALTER TABLE audit_events DROP COLUMN IF EXISTS correlation_id;
ALTER TABLE audit_events DROP COLUMN IF EXISTS status_code;
ALTER TABLE audit_events DROP COLUMN IF EXISTS ip_address;
ALTER TABLE audit_events DROP COLUMN IF EXISTS user_agent;

-- Revert Users MFA updates
ALTER TABLE users DROP COLUMN IF EXISTS mfa_recovery_codes;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS totp_secret;

-- Revert OAuth Clients
DROP TABLE IF EXISTS oauth_clients;
