-- Migration: Add is_lite_user column for new Plus tier (₹59/3mo)
-- Description: Existing is_plus_user becomes Pro tier, new is_lite_user is the Plus tier

-- Add is_lite_user column for the new Plus tier (3-month subscription)
ALTER TABLE users ADD COLUMN is_lite_user BOOLEAN DEFAULT false NOT NULL;

-- Create index for efficient queries
CREATE INDEX idx_users_is_lite_user ON users(is_lite_user);

-- Add expiry column for Lite/Plus subscriptions (3-month renewal)
ALTER TABLE users ADD COLUMN lite_expiry TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.is_plus_user IS 'Pro tier users (₹299 lifetime) - old Plus rebranded';
COMMENT ON COLUMN users.is_lite_user IS 'Plus tier users (₹59/3mo subscription) - new tier';
COMMENT ON COLUMN users.lite_expiry IS 'Expiry date for Plus/Lite subscription';
