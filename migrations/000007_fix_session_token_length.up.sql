-- Fix session_token column to support longer JWT tokens (VARCHAR(255) is too short)
ALTER TABLE sessions ALTER COLUMN session_token TYPE TEXT;
