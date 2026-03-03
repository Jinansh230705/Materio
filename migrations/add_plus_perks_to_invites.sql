-- Add contains_plus_perks column to invites table
-- This column indicates whether an invite code grants Plus benefits to users who sign up with it

ALTER TABLE invites 
ADD COLUMN contains_plus_perks BOOLEAN DEFAULT FALSE;

-- Add comment to the column for documentation
COMMENT ON COLUMN invites.contains_plus_perks IS 'Whether this invite code grants Plus user privileges when redeemed';

-- Update existing invites to have default value of false
UPDATE invites 
SET contains_plus_perks = FALSE 
WHERE contains_plus_perks IS NULL;

-- Ensure the column is not null going forward
ALTER TABLE invites 
ALTER COLUMN contains_plus_perks SET NOT NULL;
