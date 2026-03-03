-- Migration: Rename is_plus_user to is_pro_user and add new is_plus_user for new Plus tier
-- Description: Rebrand old Plus to Pro, create new Plus tier

-- Step 1: Rename existing is_plus_user column to is_pro_user
ALTER TABLE users RENAME COLUMN is_plus_user TO is_pro_user;

-- Step 2: Create new is_plus_user column for the new Plus tier
ALTER TABLE users ADD COLUMN is_plus_user BOOLEAN DEFAULT false NOT NULL;

-- Step 3: Create index for efficient queries
CREATE INDEX idx_users_is_plus_user ON users(is_plus_user);

-- Step 4: Add expiry column for Plus subscriptions (3-month renewal)
ALTER TABLE users ADD COLUMN plus_expiry TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.is_pro_user IS 'Pro users (lifetime) - rebranded from old Plus tier';
COMMENT ON COLUMN users.is_plus_user IS 'Plus users (3-month subscription)';
COMMENT ON COLUMN users.plus_expiry IS 'Expiry date for Plus subscription';
