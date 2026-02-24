-- Revert session_token column back to VARCHAR(255)
ALTER TABLE sessions ALTER COLUMN session_token TYPE VARCHAR(255);
