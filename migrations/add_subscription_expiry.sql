-- Migration: Add expiry columns for subscriptions
-- Description: Track when plus or pro access expires

ALTER TABLE users 
ADD COLUMN plus_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN pro_expiry TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.plus_expiry IS 'Date and time when Plus access expires';
COMMENT ON COLUMN users.pro_expiry IS 'Date and time when Pro access expires';
