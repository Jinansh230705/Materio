-- Migration: Add is_plus_user column to users table
-- Date: 2025-08-12
-- Description: Add a new column to track plus users who get access to materio_auth_token features
-- but don't get admin access (which is reserved for super users with has_admin_privileges)

-- Add the is_plus_user column to the users table
ALTER TABLE users 
ADD COLUMN is_plus_user BOOLEAN DEFAULT false;

-- Create an index for efficient queries on plus users
CREATE INDEX idx_users_is_plus_user ON users(is_plus_user);

-- Add a comment to document the column purpose
COMMENT ON COLUMN users.is_plus_user IS 'Plus users get access to all features requiring materio_auth_token but not admin privileges';

-- Update the table to ensure existing users are marked as non-plus by default
UPDATE users SET is_plus_user = false WHERE is_plus_user IS NULL;

-- Ensure the column is NOT NULL going forward
ALTER TABLE users ALTER COLUMN is_plus_user SET NOT NULL;
