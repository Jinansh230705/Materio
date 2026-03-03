-- Migration: Add is_pro_user column to users table
-- Description: Add a new column to track pro users (higher tier than plus)

ALTER TABLE users 
ADD COLUMN is_pro_user BOOLEAN DEFAULT false;

CREATE INDEX idx_users_is_pro_user ON users(is_pro_user);

COMMENT ON COLUMN users.is_pro_user IS 'Pro users get highest access level below admin';

UPDATE users SET is_pro_user = false WHERE is_pro_user IS NULL;

ALTER TABLE users ALTER COLUMN is_pro_user SET NOT NULL;
