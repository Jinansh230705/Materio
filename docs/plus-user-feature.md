# Plus User Feature

This document describes the plus user feature that was added to the Materio platform.

## Overview

Plus users are a new user tier that sits between regular users and admin users:

- **Regular Users**: Basic access to the platform
- **Plus Users**: Access to all features requiring `materio_auth_token` but no admin privileges
- **Admin Users**: Full access including administrative features and file management

## Database Changes

A new column `is_plus_user` has been added to the users table:

```sql
ALTER TABLE users 
ADD COLUMN is_plus_user BOOLEAN DEFAULT false;
```

## API Changes

The following API endpoints have been updated to include the `is_plus_user` field:

- `/api/v1/signup` - Sets `is_plus_user: false` by default for new users
- `/api/v1/login` - Returns `isPlusUser` in user object
- `/api/v1/profile` - Returns `isPlusUser` in user object
- `/api/v1/invites` - Includes `is_plus_user` in redeemed user data

### New Endpoint

- `/api/v1/invites/toggle-plus` - Allows admins to toggle plus user status

## Frontend Changes

### Admin Interface

In the user management interface (`/account/profile.html`), admins can now:

1. View plus user status with a star icon
2. Toggle plus user privileges using the new star button
3. Differentiate between admin privileges (shield icon) and plus privileges (star icon)

### Button Colors

- **Admin Toggle**: Green when active, orange when inactive
- **Plus Toggle**: Orange when active, yellow when inactive

## Usage

### For Admins

1. Go to the admin profile page
2. Click "View Invites" to see all users
3. Use the star button to grant/remove plus user access
4. Use the shield button to grant/remove admin access

### For Future Development

Plus users can be identified in your code by checking:

```javascript
// In API responses
if (user.isPlusUser) {
  // Grant access to plus features
}

// In database queries
SELECT * FROM users WHERE is_plus_user = true;
```

## Notes

- Plus users do NOT get admin access (file management, user management, etc.)
- Plus users DO get access to features requiring authentication tokens
- Admin users automatically have access to everything (no need to also be plus users)
- Regular users need to be explicitly granted plus status by an admin
