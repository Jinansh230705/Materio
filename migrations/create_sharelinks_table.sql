-- Create sharelinks table for dynamic invite page generation
-- This table stores custom headings and metadata for shareable invite links

CREATE TABLE sharelinks (
    id SERIAL PRIMARY KEY,
    invite_code VARCHAR(255) NOT NULL UNIQUE,
    custom_heading TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key relationships
    CONSTRAINT fk_sharelinks_invite_code 
        FOREIGN KEY (invite_code) 
        REFERENCES invites(code) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_sharelinks_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE sharelinks IS 'Stores custom headings and metadata for shareable invite links';
COMMENT ON COLUMN sharelinks.invite_code IS 'The invite code this sharelink is associated with';
COMMENT ON COLUMN sharelinks.custom_heading IS 'Custom heading text for the invite page (can include {name} placeholder)';
COMMENT ON COLUMN sharelinks.created_by IS 'UUID of the user who created this sharelink';
COMMENT ON COLUMN sharelinks.created_at IS 'Timestamp when the sharelink was created';
COMMENT ON COLUMN sharelinks.updated_at IS 'Timestamp when the sharelink was last updated';

-- Create indexes for better performance
CREATE INDEX idx_sharelinks_invite_code ON sharelinks(invite_code);
CREATE INDEX idx_sharelinks_created_by ON sharelinks(created_by);

-- Enable RLS (Row Level Security) if it's being used in the application
ALTER TABLE sharelinks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to ensure users can only access their own sharelinks
CREATE POLICY sharelinks_policy ON sharelinks
    FOR ALL
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_sharelinks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER trigger_sharelinks_updated_at
    BEFORE UPDATE ON sharelinks
    FOR EACH ROW
    EXECUTE FUNCTION update_sharelinks_updated_at();