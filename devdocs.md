## 🚀 Getting Started

### Prerequisites
- **Ruby** (version 2.7+)
- **Node.js** (version 14+)
- **Git**
- **Netlify CLI** (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/materio.git
   cd materio
   ```

2. **Install Ruby dependencies**
   ```bash
   bundle install
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key
   PUBLIC_SUPABASE_URL=your_supabase_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret
   PORT=8888
   ```

5. **Start the development server**
   ```bash
   netlify dev
   ```

### Production Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   ```bash
   netlify deploy --prod
   ```

   
### For Developers
1. **Extend** functionality through the modular architecture
2. **Customize** the PDF reader with new features
3. **Integrate** additional AI models or services
4. **Build** upon the PWA foundation

## 🔧 Configuration

### Environment Variables
- `PUBLIC_SUPABASE_URL`: Database connection
- `PUBLIC_SUPABASE_ANON_KEY`: Authentication
- `JWT_SECRET`: Token security
- `SITE_URL`: Production site URL
- `FRONTEND_URL`: Frontend application URL

### Jekyll Configuration
The `_config.yml` file contains:
- Site metadata and SEO settings
- Plugin configurations
- Build settings
- Markdown and syntax highlighting options

### PWA Configuration
The `manifest.json` file defines:
- App name and description
- Icons and theme colors
- Display modes and orientations
- Shortcuts and categories


### 🏗️ Project Structure

```
materio/
├── _config.yml              # Jekyll configuration
├── package.json             # Node.js dependencies
├── Gemfile                  # Ruby dependencies
├── netlify.toml             # Netlify deployment config
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker
├── 
├── _layouts/                # Jekyll templates
├── _includes/               # Reusable components
├── _posts/                  # Blog posts
├── _data/                   # Site data files
├── 
├── account/                 # User authentication pages
│   ├── index.html          # Login page
│   ├── signup.html         # Registration page
│   ├── profile.html        # User profile
│   ├── files.html          # File management
│   ├── css/                # Account-specific styles
│   └── js/                 # Account functionality
├── 
├── api/                     # Serverless functions
│   ├── v1/                 # API version 1
│   │   ├── chat.js         # AI chat endpoint
│   │   ├── login.js        # Authentication
│   │   ├── signup.js       # User registration
│   │   ├── profile.js      # Profile management
│   │   ├── forgot-password.js
│   │   ├── google-drive.js # Cloud integration
│   │   └── utils.js        # Shared utilities
│   └── config/             # API configuration
├── 
├── assets/                  # Static assets
│   ├── img/                # Images and icons
│   ├── scripts/            # JavaScript files
│   │   ├── main.js         # Core functionality
│   │   ├── advanced.js     # Reading modes
│   │   ├── caching.js      # PDF caching
│   │   ├── downloads/      # Download management
│   │   └── webapp/         # PWA features
│   ├── style/              # CSS stylesheets
│   ├── data/               # JSON data files
│   └── textures/           # UI textures
├── 
├── oread/                   # Custom PDF reader
│   ├── build/              # Compiled PDF.js
│   └── web/                # Viewer interface
│       ├── viewer.html     # Main viewer
│       ├── viewer.css      # Viewer styles
│       ├── viewer.mjs      # Viewer logic
│       └── locale/         # Internationalization
├── 
├── browser-extension/       # Browser extension
├── config/                  # Configuration files
├── scripts/                 # Build and deployment
├── server/                  # Local development server
└── channels/               # Data channels
```

## 🗄️ Database Schema & Authentication SQL (Recreation of the ones which are running in production servers)

The application uses Supabase (PostgreSQL) for user authentication and data management. Below are the key SQL structures and authentication-related code.

### Core Database Tables

#### Users Table Schema
Based on the API code analysis, the `users` table contains the following fields:
```sql
-- Users table structure (inferred from API usage)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL, -- bcrypt hashed
  profile_picture TEXT,
  recovery_key VARCHAR(16) NOT NULL,
  has_admin_privileges BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_recovery_key ON users(recovery_key);
```

#### Invites Table Schema
```sql
-- Invites table for user registration system
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  redeemed BOOLEAN DEFAULT false,
  redeemed_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE, -- For preventing race conditions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_reserved_at ON invites(reserved_at);
CREATE INDEX idx_invites_created_by ON invites(created_by);
```
##### This one might be real 
```sql
-- Database function to handle invite redemption with elevated privileges
-- This function bypasses RLS policies and ensures atomic operations

-- First, create the function
CREATE OR REPLACE FUNCTION redeem_invite_code(invite_code TEXT, user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- This runs with elevated privileges (bypasses RLS)
AS $$
DECLARE
    invite_record RECORD;
    result JSON;
BEGIN
    -- Start transaction
    BEGIN
        -- Lock and get the invite (prevents race conditions)
        SELECT id, code, redeemed, expires_at, created_at
        INTO invite_record
        FROM invites 
        WHERE code = invite_code
        FOR UPDATE; -- This locks the row
        
        -- Check if invite exists
        IF NOT FOUND THEN
            result := json_build_object(
                'success', false,
                'error', 'Invalid invite code'
            );
            RETURN result;
        END IF;
        
        -- Check if already redeemed
        IF invite_record.redeemed = true THEN
            result := json_build_object(
                'success', false,
                'error', 'Invite code has already been used'
            );
            RETURN result;
        END IF;
        
        -- Check if expired
        IF invite_record.expires_at < NOW() THEN
            result := json_build_object(
                'success', false,
                'error', 'Invite code has expired'
            );
            RETURN result;
        END IF;
        
        -- Redeem the invite
        UPDATE invites 
        SET 
            redeemed = true,
            redeemed_date = NOW(),
            redeemed_by = user_id
        WHERE id = invite_record.id;
        
        -- Return success
        result := json_build_object(
            'success', true,
            'message', 'Invite redeemed successfully',
            'invite_id', invite_record.id,
            'redeemed_at', NOW()
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Handle any errors
        result := json_build_object(
            'success', false,
            'error', 'Failed to redeem invite: ' || SQLERRM
        );
        RETURN result;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION redeem_invite_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_invite_code(TEXT, UUID) TO anon;

-- Additional helper function to update invite with redeemed user
CREATE OR REPLACE FUNCTION update_invite_redeemed_by(invite_code TEXT, user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    UPDATE invites 
    SET redeemed_by = user_id
    WHERE code = invite_code AND redeemed = true;
    
    IF FOUND THEN
        result := json_build_object('success', true);
    ELSE
        result := json_build_object('success', false, 'error', 'Invite not found or not redeemed');
    END IF;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION update_invite_redeemed_by(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_invite_redeemed_by(TEXT, UUID) TO anon;

```
### Authentication SQL Functions

#### Invite Redemption Function
```sql
-- Database function to handle invite redemption atomically
CREATE OR REPLACE FUNCTION redeem_invite_code(
  invite_code VARCHAR,
  user_id UUID
)
RETURNS JSON AS $$
DECLARE
  invite_record invites%ROWTYPE;
  result JSON;
BEGIN
  -- Lock the invite row to prevent race conditions
  SELECT * INTO invite_record
  FROM invites
  WHERE code = invite_code
  FOR UPDATE;

  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if already redeemed
  IF invite_record.redeemed THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Invite already redeemed');
  END IF;

  -- Check if expired
  IF invite_record.expires_at < NOW() THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Invite has expired');
  END IF;

  -- Mark as redeemed
  UPDATE invites
  SET redeemed = true,
      redeemed_by = user_id,
      reserved_at = NULL
  WHERE id = invite_record.id;

  RETURN JSON_BUILD_OBJECT('success', true);
END;
$$ LANGUAGE plpgsql;
```

#### Cleanup Expired Reservations
```sql
-- Function to clean up expired invite reservations
CREATE OR REPLACE FUNCTION cleanup_expired_invite_reservations()
RETURNS void AS $$
BEGIN
  UPDATE invites 
  SET reserved_at = NULL 
  WHERE reserved_at IS NOT NULL 
    AND reserved_at < NOW() - INTERVAL '5 minutes'
    AND redeemed = false;
END;
$$ LANGUAGE plpgsql;
```

### Row Level Security (RLS) Policies

#### Users Table Policies
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Only authenticated users can insert (handled by signup function)
CREATE POLICY "Authenticated users can signup" ON users
  FOR INSERT
  WITH CHECK (true);
```

#### Invites Table Policies
```sql
-- Enable RLS on invites table
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they created
CREATE POLICY "Users can view own invites" ON invites
  FOR SELECT
  USING (created_by = auth.uid());

-- Users can create invites (if they have permission)
CREATE POLICY "Users can create invites" ON invites
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own unredeemed invites
CREATE POLICY "Users can delete their own unredeemed invites" ON invites
  FOR DELETE
  USING (
    created_by = auth.uid() AND 
    redeemed = false
  );

-- Admin users can delete any unredeemed invites
CREATE POLICY "Admin users can delete any unredeemed invites" ON invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND has_admin_privileges = true
    ) AND 
    redeemed = false
  );
```

### Authentication SQL Queries Used in API

#### User Login Query
```sql
-- Find user by username or email (from login.js)
SELECT * FROM users 
WHERE username = $1 OR email = $1
LIMIT 1;
```

#### User Registration Query
```sql
-- Check for existing users (from signup.js)
SELECT email FROM users WHERE email = $1;
SELECT username FROM users WHERE username = $1;

-- Insert new user
INSERT INTO users (
  username, 
  display_name, 
  email, 
  password, 
  recovery_key, 
  has_admin_privileges,
  created_at,
  updated_at
) VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
RETURNING *;
```

#### Password Reset Queries
```sql
-- Find user by email (from forgot-password.js)
SELECT * FROM users WHERE email = $1;

-- Update user password
UPDATE users 
SET password = $1, updated_at = NOW()
WHERE id = $2;
```

#### Profile Management Queries
```sql
-- Get user profile (from profile.js)
SELECT id, username, display_name, email, profile_picture, 
       created_at, updated_at, recovery_key, has_admin_privileges
FROM users 
WHERE id = $1;

-- Update profile
UPDATE users 
SET display_name = $1, profile_picture = $2, updated_at = NOW()
WHERE id = $3;

-- Update password
UPDATE users 
SET password = $1, updated_at = NOW()
WHERE id = $2;
```

#### Invite Management Queries
```sql
-- Validate invite code (from invites.js)
SELECT id, redeemed, expires_at FROM invites 
WHERE code = $1;

-- Create new invite
INSERT INTO invites (code, created_by, expires_at)
VALUES ($1, $2, $3)
RETURNING *;

-- List user's invites
SELECT * FROM invites 
WHERE created_by = $1 
ORDER BY created_at DESC;
```

### Security Features

1. **Password Hashing**: Uses bcrypt with salt rounds (10)
2. **JWT Tokens**: 7-day expiration with secret key
3. **Row Level Security**: Ensures users can only access their own data
4. **Invite System**: Controlled registration through invite codes
5. **Admin Privileges**: Special permissions for administrative functions
6. **Recovery Keys**: Unique 16-character keys for password recovery
7. **Race Condition Prevention**: Reservation system for invite redemption


## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Contribution Guidelines
- Follow the existing code style
- Write clear commit messages
- Include tests for new features
- Update documentation as needed
- Respect the project's license

### Areas for Contribution
- **New Features**: PDF annotation tools, collaboration features
- **Performance**: Optimization and caching improvements
- **Accessibility**: Better screen reader support
- **Internationalization**: Additional language support
- **Mobile**: Native mobile app development
