# Plus Benefits Invite System

## Overview
The Plus Benefits Invite system allows administrators to generate special invite codes that automatically grant Plus user privileges to users who sign up with them. This is like a gift code or special access invite for Plus benefits.

## Features

### Admin Interface
1. **Generate Plus Invite Button**: Added alongside the regular invite generation button
2. **Invite Type Column**: Shows whether an invite is "Regular" or "Plus" in the invite management table
3. **Visual Distinction**: Plus invites have a golden star design to distinguish them from regular invites

### Database Changes
- Added `contains_plus_perks` column to the `invites` table
- This boolean field indicates whether the invite grants Plus benefits

### User Experience
- Users who sign up with a Plus invite automatically get `is_plus_user` set to `true`
- Special success message shows when users receive Plus benefits from an invite
- No manual upgrade needed - the system handles it automatically

## How It Works

### Generating Plus Invites
1. Admin clicks "Generate Plus Invite" button
2. API creates invite with `contains_plus_perks: true`
3. Invite appears in table with Plus badge and star icon

### User Signup with Plus Invite
1. User uses Plus invite code during signup
2. System checks `contains_plus_perks` field during validation
3. If true, user is automatically created with `is_plus_user: true`
4. Success message indicates Plus benefits were granted

### Invite Management
- Plus invites show with gold star icon in the invite table
- "Type" column clearly indicates Plus vs Regular invites
- All existing functionality (copy, delete, view details) works the same

## API Endpoints Modified

### POST /api/v1/invites
- Now accepts `containsPlusPerks` parameter in request body
- Creates invite with `contains_plus_perks` field set accordingly

### GET /api/v1/invites
- Returns `contains_plus_perks` field for each invite
- Used to display invite type in admin interface

### POST /api/v1/signup
- Checks `contains_plus_perks` when processing invite
- Sets `is_plus_user: true` if invite contains plus perks
- Returns `grantedPlusFromInvite` flag in response

## File Changes

### Frontend Files
- `account/profile.html`: Added plus invite button and updated table
- `account/js/profile.js`: Added plus invite generation logic
- `account/js/signup.js`: Added plus benefits success notification
- `account/css/redesigned-styles.css`: Added styling for plus invites

### Backend Files
- `api/v1/invites.js`: Updated to handle plus perks field
- `api/v1/signup.js`: Modified to grant plus access from invites

### Database
- `migrations/add_plus_perks_to_invites.sql`: Migration script

## Usage Examples

### For Admins
```javascript
// Generate regular invite
fetch('/api/v1/invites', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' }
});

// Generate plus invite
fetch('/api/v1/invites', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({ containsPlusPerks: true })
});
```

### User Signup Response
```json
{
  "message": "User created successfully with Plus benefits!",
  "user": {
    "isPlusUser": true,
    "grantedPlusFromInvite": true
  }
}
```

## Security Considerations
- Only admin users can generate any type of invite
- Plus invites follow same expiration and single-use rules as regular invites
- No additional privileges beyond Plus access are granted

## Future Enhancements
- Bulk generation of plus invites
- Analytics on plus invite usage
- Customizable plus benefits per invite
- Time-limited plus access from invites
