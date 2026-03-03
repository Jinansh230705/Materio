# Materio API v1 Documentation

This document provides comprehensive examples for calling all API endpoints using curl, PowerShell, and bash.

## Base URL
- Development: `http://localhost:8888/.netlify/functions/`
- Production: `https://your-domain.netlify.app/.netlify/functions/`

## Common Headers
All requests should include:
```
Content-Type: application/json
```

For authenticated endpoints, include:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Authentication Flow
1. **Signup** → Get JWT token + recovery key
2. **Login** → Get JWT token
3. **Use token** in Authorization header for protected endpoints
4. **Password recovery** → Use email + recovery key

---

## 1. User Authentication

### 1.1 User Signup

**Endpoint:** `POST /signup`

Creates a new user account with invite code validation.

#### Required Fields:
- username (string)
- displayName (string)
- email (string)
- password (string)
- inviteCode (string)
- profilePicture (optional, base64 data URL)

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "inviteCode": "INVITE123",
    "profilePicture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
  }'
```

#### PowerShell Example:
```powershell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    username = "johndoe"
    displayName = "John Doe"
    email = "john@example.com"
    password = "securePassword123"
    inviteCode = "INVITE123"
    profilePicture = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/signup" -Method POST -Headers $headers -Body $body
```

#### Response:
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "hasAdminPrivileges": false,
    "isPlusUser": false,
    "profilePicture": "https://...",
    "recoveryKey": "recovery-key-string",
    "grantedPlusFromInvite": false
  }
}
```

### 1.2 User Login

**Endpoint:** `POST /login`

Authenticates user with username/email and password.

#### Required Fields:
- username (string) - Can be username or email
- password (string)

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "securePassword123"
  }'
```

#### PowerShell Example:
```powershell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    username = "johndoe"
    password = "securePassword123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/login" -Method POST -Headers $headers -Body $body
```

#### Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "hasAdminPrivileges": false,
    "isPlusUser": false,
    "profilePicture": "https://..."
  }
}
```

### 1.3 Password Recovery

**Endpoint:** `POST /forgot-password`

Resets user password using email and recovery key.

#### Required Fields:
- email (string)
- recoveryKey (string)
- newPassword (string, optional - if not provided, just validates recovery key)

#### cURL Example:
```bash
# Validate recovery key only
curl -X POST http://localhost:8888/.netlify/functions/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "recoveryKey": "recovery-key-string"
  }'

# Reset password
curl -X POST http://localhost:8888/.netlify/functions/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "recoveryKey": "recovery-key-string",
    "newPassword": "newSecurePassword123"
  }'
```

#### PowerShell Example:
```powershell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    email = "john@example.com"
    recoveryKey = "recovery-key-string"
    newPassword = "newSecurePassword123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/forgot-password" -Method POST -Headers $headers -Body $body
```

---

## 2. User Profile Management

### 2.1 Get User Profile

**Endpoint:** `GET /profile`

Retrieves the authenticated user's profile information.

#### Headers Required:
- Authorization: Bearer YOUR_JWT_TOKEN

#### cURL Example:
```bash
curl -X GET http://localhost:8888/.netlify/functions/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### PowerShell Example:
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_JWT_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/profile" -Method GET -Headers $headers
```

#### Response:
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "profilePicture": "https://...",
    "recoveryKey": "recovery-key-string",
    "hasAdminPrivileges": false,
    "isPlusUser": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2.2 Update User Profile

**Endpoint:** `PUT /profile`

Updates the authenticated user's profile information.

#### Headers Required:
- Authorization: Bearer YOUR_JWT_TOKEN

#### Optional Fields:
- username (string)
- displayName (string)
- currentPassword (string, required for password changes and recovery key generation)
- newPassword (string)
- generateNewRecoveryKey (boolean)
- profilePicture (string, base64 data URL)

#### cURL Example:
```bash
curl -X PUT http://localhost:8888/.netlify/functions/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "username": "newusername",
    "displayName": "New Display Name",
    "currentPassword": "currentPassword123",
    "newPassword": "newPassword123",
    "generateNewRecoveryKey": true
  }'
```

#### PowerShell Example:
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_JWT_TOKEN"
}

$body = @{
    username = "newusername"
    displayName = "New Display Name"
    currentPassword = "currentPassword123"
    newPassword = "newPassword123"
    generateNewRecoveryKey = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/profile" -Method PUT -Headers $headers -Body $body
```

### 2.3 Delete User Account

**Endpoint:** `DELETE /profile`

Permanently deletes the authenticated user's account.

#### Headers Required:
- Authorization: Bearer YOUR_JWT_TOKEN

#### Required Fields:
- password (string) - Current password for confirmation

#### cURL Example:
```bash
curl -X DELETE http://localhost:8888/.netlify/functions/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "password": "currentPassword123"
  }'
```

---

## 3. Health Check

### 3.1 Server Health

**Endpoint:** `GET /health`

Checks if the server is running and healthy.

#### cURL Example:
```bash
curl -X GET http://localhost:8888/.netlify/functions/health
```

#### PowerShell Example:
```powershell
Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/health" -Method GET
```

#### Response:
```json
{
  "status": "ok",
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "materio-api"
}
```

---

## 4. Chat API

### 4.1 Chat Completion

**Endpoint:** `POST /chat`

Sends a message to AI chat with different modes and models.

#### Required Fields:
- message (string)

#### Optional Fields:
- mode (string) - "general", "reasoning", "code" (default: "general")
- model (string) - Specific model to use
- messages (array) - Previous conversation context

#### Available Modes:
- **general**: Multi-purpose conversations
- **reasoning**: Complex problem-solving and analysis
- **code**: Programming and technical assistance

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum computing",
    "mode": "reasoning",
    "messages": []
  }'
```

#### PowerShell Example:
```powershell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    message = "Write a Python function to sort a list"
    mode = "code"
    messages = @()
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat" -Method POST -Headers $headers -Body $body
```

### 4.2 Get Available Models

**Endpoint:** `GET /chat/models`

Returns available AI models categorized by mode.

#### cURL Example:
```bash
curl -X GET http://localhost:8888/.netlify/functions/chat/models
```

#### Response:
```json
{
  "success": true,
  "models": {
    "reasoning": ["google/gemma-3-27b-it:free", "meta-llama/llama-4-maverick:free"],
    "code": ["deepseek/deepseek-r1-0528-qwen3-8b:free", "qwen/qwen-2.5-coder-32b-instruct:free"],
    "general": ["google/gemini-2.0-flash-exp:free", "mistralai/mistral-small-3.2-24b-instruct:free"]
  }
}
```

---

## 5. Invite Management

### 5.1 Validate Invite Code

**Endpoint:** `POST /invites/validate`

Validates an invite code before signup.

#### Required Fields:
- inviteCode (string)

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/invites/validate \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "INVITE123"
  }'
```

### 5.2 Toggle Admin Privileges (Admin Only)

**Endpoint:** `POST /invites/toggle-admin`

Toggles admin privileges for a user.

#### Headers Required:
- Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

#### Required Fields:
- targetUserId (string)

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/invites/toggle-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "targetUserId": "user-uuid"
  }'
```

### 5.3 Diagnostic Invite

**Endpoint:** `POST /invites/diagnostic`

Gets detailed information about an invite code (Admin only).

#### Required Fields:
- inviteCode (string)

### 5.4 Premium Account Recovery (Admin Only)

**Endpoint:** `POST /admin-recovery`

Premium account recovery service for users who have lost both password and recovery key. Admin-only endpoint that returns complete user data including recovery key for manual password reset assistance.

#### Headers Required:
- Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

#### Required Fields:
- email (string) - Target user's email address
- username (string) - Target user's username

#### Security Features:
- Requires exact match of both email AND username
- Admin privilege verification
- Audit logging of recovery attempts
- Does not return password hash

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/admin-recovery \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "email": "user@example.com",
    "username": "lostuser"
  }'
```

#### PowerShell Example:
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_ADMIN_JWT_TOKEN"
}

$body = @{
    email = "user@example.com"
    username = "lostuser"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/admin-recovery" -Method POST -Headers $headers -Body $body
```

#### Response:
```json
{
  "message": "Account recovery data retrieved successfully",
  "recoveryService": "Premium Admin Account Recovery",
  "adminId": "admin-user-uuid",
  "targetUser": {
    "id": "target-user-uuid",
    "username": "lostuser",
    "displayName": "Lost User",
    "email": "user@example.com",
    "profilePicture": "https://...",
    "recoveryKey": "user-recovery-key-string",
    "hasAdminPrivileges": false,
    "isPlusUser": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "securityNote": "This recovery includes the user's recovery key for password reset purposes",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Use Case:
This endpoint is designed for premium customer support scenarios where:
1. User has forgotten their password
2. User has lost/didn't save their recovery key
3. User can provide both email and username for verification
4. Admin assistance is required for account recovery

#### Error Responses:
```json
// 403 Forbidden - Non-admin user
{
  "error": "Admin privileges required for account recovery service"
}

// 404 Not Found - User not found or email/username mismatch
{
  "error": "User not found with the provided email and username combination",
  "details": "Both email and username must match exactly for security purposes"
}

// 400 Bad Request - Missing required fields
{
  "error": "Both email and username are required for account recovery"
}
```

---

## 6. CDN Management (Admin Only)

### 6.1 List CDN Files

**Endpoint:** `GET /cdn?path=folder/path`

Lists files in the CDN repository.

#### Headers Required:
- Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

#### Query Parameters:
- path (string, optional) - Folder path to list

#### cURL Example:
```bash
curl -X GET "http://localhost:8888/.netlify/functions/cdn?path=images" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 6.2 Upload File to CDN

**Endpoint:** `POST /cdn`

Uploads a single file to the CDN.

#### Headers Required:
- Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

#### Required Fields:
- filename (string)
- content (string) - Base64 encoded file content
- path (string, optional) - Target folder path

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/cdn \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "filename": "image.jpg",
    "content": "base64-encoded-content",
    "path": "images/"
  }'
```

### 6.3 Batch Upload to CDN

**Endpoint:** `POST /cdn?batch=true`

Uploads multiple files to the CDN in a single request.

#### Headers Required:
- Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

#### Required Fields:
- files (array) - Array of file objects with filename, content, and path

---

## 7. Google Drive Integration

### 7.1 Google Drive Authentication

**Endpoint:** `GET /google-drive/auth`

Initiates Google Drive OAuth flow.

#### Headers Required:
- Authorization: Bearer YOUR_JWT_TOKEN

### 7.2 Handle OAuth Callback

**Endpoint:** `GET /google-drive/callback`

Handles Google OAuth callback and stores tokens.

### 7.3 List Google Drive Files

**Endpoint:** `GET /google-drive/files`

Lists files in user's Google Drive.

#### Headers Required:
- Authorization: Bearer YOUR_JWT_TOKEN

### 7.4 Upload to Google Drive

**Endpoint:** `POST /google-drive/upload`

Uploads a file to user's Google Drive.

#### Headers Required:
- Authorization: Bearer YOUR_JWT_TOKEN

---

## 8. Analytics & Insights

### 8.1 Real-time Users

**Endpoint:** `GET /insights`

Gets real-time user count from Google Analytics.

#### cURL Example:
```bash
curl -X GET http://localhost:8888/.netlify/functions/insights
```

#### Response:
```json
{
  "users": "42"
}
```

---

## 9. Download Management

### 9.1 Download File

**Endpoint:** `POST /dwn/downloads`

Downloads a file from a URL to local storage.

#### Required Fields:
- url (string)
- filename (string)
- title (string, optional)

#### cURL Example:
```bash
curl -X POST http://localhost:8888/.netlify/functions/dwn/downloads \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/file.pdf",
    "filename": "document.pdf",
    "title": "Important Document"
  }'
```

---

## Error Responses

All endpoints may return these common error responses:

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication token required"
}
```

### 403 Forbidden
```json
{
  "error": "Admin privileges required"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 405 Method Not Allowed
```json
{
  "error": "Method not allowed"
}
```

### 409 Conflict
```json
{
  "error": "Email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Error message details"
}
```

---

## API Security

### Authentication Flow
1. **Register** with valid invite code → Receive JWT token + recovery key
2. **Login** with credentials → Receive JWT token
3. **Include token** in Authorization header: `Bearer YOUR_JWT_TOKEN`
4. **Token expires** → Re-login required
5. **Password recovery** → Use email + recovery key

### Security Features
- **JWT Tokens**: Secure session management
- **Password Hashing**: bcrypt with salt
- **Recovery Keys**: Unique keys for password recovery
- **Invite System**: Controlled user registration
- **Admin Privileges**: Role-based access control
- **CORS Protection**: Cross-origin request security

### Rate Limiting
- API endpoints may be rate limited
- Respect HTTP 429 responses
- Implement exponential backoff

---

## Development Setup

### Environment Variables Required
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
JWT_SECRET=your_jwt_secret

# Google Drive Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# Analytics
GA_SERVICE_ACCOUNT_KEY_BASE64=your_ga_service_account_key
GA4_PROPERTY_ID=your_ga4_property_id

# GitHub CDN
GITHUB_TOKEN=your_github_token

# Chat API
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Local Development
```bash
# Install dependencies
npm install

# Start Netlify dev server
netlify dev

# API will be available at:
# http://localhost:8888/.netlify/functions/
```

---

## Testing Examples

### 1. Complete User Flow
```bash
#!/bin/bash

# 1. Validate invite code
curl -X POST http://localhost:8888/.netlify/functions/invites/validate \
  -H "Content-Type: application/json" \
  -d '{"inviteCode": "TESTCODE123"}'

# 2. Sign up new user
SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:8888/.netlify/functions/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "displayName": "Test User",
    "email": "test@example.com",
    "password": "testpass123",
    "inviteCode": "TESTCODE123"
  }')

# Extract token from response
TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.token')

# 3. Get user profile
curl -X GET http://localhost:8888/.netlify/functions/profile \
  -H "Authorization: Bearer $TOKEN"

# 4. Update profile
curl -X PUT http://localhost:8888/.netlify/functions/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "displayName": "Updated Name"
  }'
```

### 2. PowerShell Testing Script
```powershell
# PowerShell complete flow
$baseUrl = "http://localhost:8888/.netlify/functions"

# Sign up
$signupBody = @{
    username = "testuser"
    displayName = "Test User"
    email = "test@example.com"
    password = "testpass123"
    inviteCode = "TESTCODE123"
} | ConvertTo-Json

$signupResponse = Invoke-RestMethod -Uri "$baseUrl/signup" -Method POST -Body $signupBody -ContentType "application/json"
$token = $signupResponse.token

# Get profile
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$profile = Invoke-RestMethod -Uri "$baseUrl/profile" -Method GET -Headers $headers
Write-Host "User Profile: $($profile | ConvertTo-Json -Depth 3)"

# Test chat
$chatBody = @{
    message = "Hello, how are you?"
    mode = "general"
} | ConvertTo-Json

$chatResponse = Invoke-RestMethod -Uri "$baseUrl/chat" -Method POST -Body $chatBody -ContentType "application/json"
Write-Host "Chat Response: $($chatResponse.response)"
```

### 3. Error Handling Examples
```bash
# Test invalid credentials
curl -X POST http://localhost:8888/.netlify/functions/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "invalid",
    "password": "wrong"
  }' | jq

# Test unauthorized access
curl -X GET http://localhost:8888/.netlify/functions/profile \
  -H "Authorization: Bearer invalid_token" | jq

# Test missing required fields
curl -X POST http://localhost:8888/.netlify/functions/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "test"}' | jq
```

---

## API Changelog

### Version 1.0.0 (Current)
- Initial API release
- User authentication system
- Profile management
- Chat functionality with multiple AI models
- Invite system with admin controls
- CDN file management
- Google Drive integration
- Analytics insights
- Download management
- Health monitoring

### Upcoming Features
- File sharing system
- Advanced user roles
- API rate limiting
- Webhook support
- Enhanced analytics
- Mobile app APIs

---

## Support & Troubleshooting

### Common Issues

#### 1. Invalid JWT Token
- **Issue**: 401 Unauthorized responses
- **Solution**: Re-login to get fresh token
- **Check**: Token expiration, correct Authorization header format

#### 2. Invite Code Problems
- **Issue**: Invalid invite code during signup
- **Solution**: Validate invite code first using `/invites/validate`
- **Check**: Code spelling, expiration, usage limits

#### 3. CORS Errors
- **Issue**: Browser blocking requests
- **Solution**: Use proper origin headers
- **Check**: Request from allowed domains

#### 4. File Upload Issues
- **Issue**: CDN upload failures
- **Solution**: Check file size limits, base64 encoding
- **Check**: Admin privileges, GitHub token configuration

### Debug Mode
Add debug headers to requests:
```
X-Debug: true
```

### API Status
Check API health:
```bash
curl http://localhost:8888/.netlify/functions/health
```

### Contact Support
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Email: support@materio.app
- Documentation: [API Docs](https://docs.materio.app)

---

## License & Usage

This API is part of the Materio platform. See the main repository LICENSE file for terms and conditions.

**Rate Limits**: Please respect API rate limits and implement proper error handling.

**Data Privacy**: User data is handled according to our Privacy Policy. Personal information is encrypted and securely stored.

**API Versioning**: This is version 1 of the API. Breaking changes will be introduced in new versions with proper migration guides.