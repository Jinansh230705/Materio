-- Fix case sensitivity issue for invite codes
-- This handles the case where URLs normalize invite codes to lowercase
-- Issue: localhost preserves case, but deployment environments convert URLs to lowercase

-- First, let's create an index on UPPER(code) for better performance
CREATE INDEX IF NOT EXISTS idx_invites_code_upper ON invites (UPPER(code));

-- Add a comment to document this fix
COMMENT ON INDEX idx_invites_code_upper IS 'Case-insensitive index for invite codes to handle URL normalization';

-- Update the redeem_invite_code function to be case-insensitive
CREATE OR REPLACE FUNCTION redeem_invite_code(invite_code TEXT, user_id UUID)
RETURNS JSON AS $$
DECLARE
    invite_record RECORD;
    result JSON;
BEGIN
    -- Lock and get the invite record using case-insensitive comparison
    SELECT * INTO invite_record 
    FROM invites 
    WHERE UPPER(code) = UPPER(invite_code)
    FOR UPDATE;
    
    -- Check if invite exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid invite code'
        );
    END IF;
    
    -- Check if already redeemed
    IF invite_record.redeemed THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invite code has already been used'
        );
    END IF;
    
    -- Check if expired
    IF invite_record.expires_at < NOW() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invite code has expired'
        );
    END IF;
    
    -- Redeem the invite
    UPDATE invites 
    SET 
        redeemed = true,
        redeemed_by = user_id,
        redeemed_date = NOW()
    WHERE id = invite_record.id;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'invite_id', invite_record.id,
        'contains_plus_perks', invite_record.contains_plus_perks
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
