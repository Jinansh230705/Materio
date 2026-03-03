const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const { verifyToken, corsHeaders, getTokenFromHeaders, supabase } = require('./_utils');
const { getFormsCollection, getMongoDb } = require('../_config_shared/mongodb');
const { ObjectId } = require('mongodb');
require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// ==========================================
// Google Drive Configuration
// ==========================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://materioa.vercel.app/account/profile.html';

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ==========================================
// Google Analytics Configuration
// ==========================================
const base64Key = process.env.GA_SERVICE_ACCOUNT_KEY_BASE64;
const credentials = base64Key ? JSON.parse(Buffer.from(base64Key, 'base64').toString()) : null;
const analyticsDataClient = credentials ? new BetaAnalyticsDataClient({ credentials }) : null;

// ==========================================
// Razorpay Configuration
// ==========================================
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const razorpay = RAZORPAY_KEY_ID ? new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
}) : null;

// ==========================================
// Main Handler
// ==========================================
module.exports = async (req, res) => {
  const origin = req.headers.origin || req.headers.Origin;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Parse query parameters manually if req.query is not available
    const queryParams = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Determine which feature is being requested
    // Check path first
    const isInsights = url.pathname.includes('/insights');
    const isSavePromo = url.pathname.includes('/save-promo');
    const isGoogleDrive = url.pathname.includes('/google-drive');
    const isSharelink = url.pathname.includes('/sharelink');

    const isForms = url.pathname.includes('/forms');
    const isContribute = url.pathname.includes('/contribute');
    const isNotebooks = url.pathname.includes('/notebooks');
    const isSubscription = url.pathname.includes('/subscription');

    // Check query param action
    const action = queryParams.action || req.query?.action;
    const pathParam = queryParams.path || '';

    console.log('Features API - pathname:', url.pathname, 'action:', action, 'pathParam:', pathParam);

    if (isInsights || action === 'insights' || pathParam.includes('insights')) {
      return await handleInsights(req, res);
    }

    if (isSavePromo || action === 'save-promo' || pathParam.includes('save-promo')) {
      return await handleSavePromo(req, res);
    }

    if (isGoogleDrive || action === 'google-drive' || pathParam.includes('google-drive')) {
      return await handleGoogleDrive(req, res, url);
    }

    if (isSharelink || action === 'sharelink' || pathParam.includes('sharelink')) {
      return await handleSharelink(req, res);
    }

    if (isForms || action === 'forms' || pathParam.includes('forms')) {
      return await handleForms(req, res, url);
    }

    if (isContribute || action === 'contribute' || pathParam.includes('contribute')) {
      return await handleContribute(req, res);
    }

    if (isNotebooks || action === 'notebooks' || pathParam.includes('notebooks')) {
      return await handleNotebooks(req, res, url);
    }

    if (isSubscription || action === 'subscription' || pathParam.includes('subscription')) {
      return await handleSubscription(req, res, url);
    }

    if (url.pathname.includes('/pdf-share') || pathParam.includes('pdf-share') || action === 'pdf-share') {
      return await handlePdfShare(req, res, url);
    }

    return res.status(404).json({
      error: 'Feature not found',
      debug: {
        pathname: url.pathname,
        action: action,
        pathParam: pathParam,
        availableFeatures: ['insights', 'save-promo', 'google-drive', 'sharelink', 'forms', 'contribute', 'notebooks', 'pdf-share']
      }
    });

  } catch (error) {
    console.error('Features API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// ==========================================
// Feature Handlers
// ==========================================

async function handleInsights(req, res) {
  if (!analyticsDataClient) {
    console.error('GA_SERVICE_ACCOUNT_KEY_BASE64 not configured');
    return res.status(500).json({ error: 'Analytics not configured' });
  }

  try {
    console.log('Handling insights request...');
    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const users = response.rows?.[0]?.metricValues?.[0]?.value || '0';

    // Set headers
    const origin = req.headers.origin || req.headers.Origin;
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.setHeader('Cache-Control', 'no-store');

    console.log('Insights response:', { users });
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching real-time users:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleSavePromo(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const promoData = req.body;
    const jsonContent = JSON.stringify(promoData, null, 2);

    // Define file paths relative to the Netlify build
    // Note: In Vercel serverless environment, writing to file system is ephemeral and usually not what you want for persistence.
    // But preserving the logic as requested.
    const sourceFile = path.join(process.cwd(), 'assets', 'data', 'promo.json');
    const siteFile = path.join(process.cwd(), '_site', 'assets', 'data', 'promo.json');

    console.log('Saving promo data to:', sourceFile);

    // Ensure directories exist
    const sourceDir = path.dirname(sourceFile);
    const siteDir = path.dirname(siteFile);

    if (!fs.existsSync(sourceDir)) {
      fs.mkdirSync(sourceDir, { recursive: true });
    }

    if (!fs.existsSync(siteDir)) {
      fs.mkdirSync(siteDir, { recursive: true });
    }

    // Write to both files
    fs.writeFileSync(sourceFile, jsonContent);
    fs.writeFileSync(siteFile, jsonContent);

    return res.status(200).json({
      success: true,
      message: 'Promotion data saved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error saving promo files:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleGoogleDrive(req, res, url) {
  const { method, headers } = req;
  const body = req.body || {};

  // Extract auth token
  const authHeader = headers.authorization || headers.Authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Determine sub-endpoint
  // URL might be /api/v2/features/google-drive/auth-url or /api/v2/google-drive/auth-url
  // We look for the part after 'google-drive'
  let endpoint = '';
  const pathParts = url.pathname.split('/');
  const driveIndex = pathParts.indexOf('google-drive');
  if (driveIndex !== -1 && driveIndex < pathParts.length - 1) {
    endpoint = pathParts[driveIndex + 1];
  } else {
    // Fallback: check query param
    endpoint = req.query.subAction || '';
  }

  // Also check if it's a delete action with ID
  if (url.pathname.includes('/delete/')) {
    endpoint = 'delete';
  }

  switch (method) {
    case 'GET':
      if (endpoint === 'auth-url') {
        // Generate Google OAuth URL
        const scopes = [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.profile'
        ];

        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: scopes,
          state: user.id // Pass user ID in state
        });

        return res.status(200).json({ authUrl });
      }

      if (endpoint === 'status') {
        // Check if user has linked Google Drive
        const tokens = await getGoogleTokens(user.id);
        const linked = !!tokens;

        let materioFolderId = null;
        if (linked && tokens.access_token) {
          try {
            oauth2Client.setCredentials({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token
            });

            // Check if materio folder exists
            materioFolderId = await findOrCreateMaterioFolder();
          } catch (error) {
            console.error('Error checking materio folder:', error);
          }
        }

        return res.status(200).json({
          linked,
          materioFolderId
        });
      }

      if (endpoint === 'files') {
        // List user's files from Google Drive
        const tokens = await getGoogleTokens(user.id);
        if (!tokens) {
          return res.status(400).json({ error: 'Google Drive not linked' });
        }

        const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
        if (!refreshedTokens) {
          return res.status(400).json({ error: 'Failed to refresh tokens' });
        }

        oauth2Client.setCredentials({
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token
        });
        try {
          // Get the folderId from query parameters if provided
          const { folderId } = req.query;

          let query = "trashed=false";
          if (folderId) {
            query += ` and '${folderId}' in parents`;
          } else {
            // Default to materio folder
            const materioFolderId = await findOrCreateMaterioFolder();
            query += ` and '${materioFolderId}' in parents`;
          }

          const response = await drive.files.list({
            pageSize: 50,
            fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink)',
            q: query
          });

          return res.status(200).json({ files: response.data.files });
        } catch (error) {
          console.error('Error listing files:', error);
          return res.status(500).json({ error: 'Failed to list files' });
        }
      }
      break;

    case 'POST':
      if (endpoint === 'callback') {
        // Handle OAuth callback
        const { code, state } = body;

        if (state !== user.id) {
          return res.status(400).json({ error: 'Invalid state parameter' });
        }

        try {
          const { tokens } = await oauth2Client.getToken(code);
          await storeGoogleTokens(user.id, tokens);

          return res.status(200).json({ success: true });
        } catch (error) {
          console.error('Error exchanging code for tokens:', error);
          return res.status(400).json({ error: 'Failed to exchange code for tokens' });
        }
      }

      if (endpoint === 'ensure-folder') {
        // Ensure materio folder exists
        const tokens = await getGoogleTokens(user.id);
        if (!tokens) {
          return res.status(400).json({ error: 'Google Drive not linked' });
        }

        const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
        if (!refreshedTokens) {
          return res.status(400).json({ error: 'Failed to refresh tokens' });
        }

        oauth2Client.setCredentials({
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token
        });

        try {
          const folderId = await findOrCreateMaterioFolder();
          return res.status(200).json({ folderId });
        } catch (error) {
          console.error('Error ensuring materio folder:', error);
          return res.status(500).json({ error: 'Failed to ensure materio folder' });
        }
      }

      if (endpoint === 'upload') {
        // Upload file to Google Drive
        const tokens = await getGoogleTokens(user.id);
        if (!tokens) {
          return res.status(400).json({ error: 'Google Drive not linked' });
        }

        const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
        if (!refreshedTokens) {
          return res.status(400).json({ error: 'Failed to refresh tokens' });
        }

        oauth2Client.setCredentials({
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token
        });
        const { fileName, fileContent, mimeType, folderId } = body;

        try {
          // Use provided folderId or default to materio folder
          const targetFolderId = folderId || await findOrCreateMaterioFolder();

          const response = await drive.files.create({
            requestBody: {
              name: fileName,
              parents: [targetFolderId] // Upload to materio folder
            },
            media: {
              mimeType: mimeType,
              body: Buffer.from(fileContent, 'base64')
            }
          });

          return res.status(200).json({
            success: true,
            fileId: response.data.id,
            fileName: response.data.name
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          return res.status(500).json({ error: 'Failed to upload file' });
        }
      }

      break;

    case 'DELETE':
      if (endpoint === 'unlink') {
        // Unlink Google Drive
        try {
          const { error } = await supabase
            .from('google_drive_tokens')
            .delete()
            .eq('user_id', user.id);

          if (error) throw error;

          return res.status(200).json({ success: true });
        } catch (error) {
          console.error('Error unlinking Google Drive:', error);
          return res.status(500).json({ error: 'Failed to unlink Google Drive' });
        }
      }

      // Handle file deletion by ID
      // Assuming the URL is like /api/v2/google-drive/delete/FILE_ID
      // or we parse it from the path
      const deleteMatch = url.pathname.match(/\/delete\/(.+)$/);
      if (deleteMatch) {
        const fileId = deleteMatch[1];

        const tokens = await getGoogleTokens(user.id);
        if (!tokens) {
          return res.status(400).json({ error: 'Google Drive not linked' });
        }

        const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
        if (!refreshedTokens) {
          return res.status(400).json({ error: 'Failed to refresh tokens' });
        }

        oauth2Client.setCredentials({
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token
        });

        try {
          await drive.files.delete({
            fileId: fileId
          });

          return res.status(200).json({ success: true });
        } catch (error) {
          console.error('Error deleting file:', error);
          return res.status(500).json({ error: 'Failed to delete file' });
        }
      }

      break;

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(404).json({ error: 'Endpoint not found' });
}

async function handleSharelink(req, res) {
  const origin = req.headers.origin || req.headers.Origin;

  // Auth checks
  const token = getTokenFromHeaders(req.headers);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', decoded.id)
    .single();

  if (userError || !user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (req.method === 'POST') {
    return await createSharelink(req, res, origin, user.id);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Create shareable link for invite
async function createSharelink(req, res, origin, userId) {
  try {
    console.log('Creating sharelink, user ID:', userId);

    // Parse request body
    const bodyData = req.body;
    const inviteCode = bodyData.inviteCode;
    const customHeading = bodyData.customHeading;

    console.log('Sharelink params:', { inviteCode, customHeading });

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Verify that the invite exists and belongs to this user
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, code, created_by, contains_plus_perks')
      .eq('code', inviteCode)
      .eq('created_by', userId)
      .single();

    console.log('Invite lookup result:', { invite, inviteError });
    console.log('User ID for comparison:', userId);

    if (inviteError) {
      console.error('Invite lookup error:', inviteError);
      return res.status(404).json({ error: 'Invite lookup failed', details: inviteError });
    }

    if (!invite) {
      console.error('Invite not found or access denied');
      // Try to lookup the invite without the user filter to see if it exists at all
      const { data: anyInvite } = await supabase
        .from('invites')
        .select('created_by')
        .eq('code', inviteCode)
        .single();

      if (anyInvite) {
        console.log('Invite exists but belongs to user:', anyInvite.created_by);
        return res.status(403).json({ error: 'You do not have permission to share this invite' });
      } else {
        return res.status(404).json({ error: 'Invite not found' });
      }
    }

    // Create the sharelink record
    console.log('Creating sharelink for invite code:', inviteCode);

    // First try with standard method
    let sharelink, sharelinkError;

    try {
      const result = await supabase
        .from('sharelinks')
        .upsert({
          invite_code: inviteCode,
          custom_heading: customHeading || null,
          created_by: userId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'invite_code'
        })
        .select()
        .single();

      sharelink = result.data;
      sharelinkError = result.error;
    } catch (e) {
      console.log('Standard sharelink creation failed, trying fallback method:', e.message);
      sharelinkError = e;
    }

    // If the standard method fails due to RLS, try using direct SQL
    if (sharelinkError && sharelinkError.message.includes('row-level security')) {
      try {
        console.log('Attempting direct SQL insertion to bypass RLS...');

        // Use RPC to execute SQL directly
        const timestamp = new Date().toISOString();
        const sql = `
          INSERT INTO sharelinks (invite_code, custom_heading, created_by, updated_at) 
          VALUES ('${inviteCode}', ${customHeading ? `'${customHeading.replace(/'/g, "''")}'` : 'NULL'}, '${userId}', '${timestamp}')
          ON CONFLICT (invite_code) 
          DO UPDATE SET 
            custom_heading = ${customHeading ? `'${customHeading.replace(/'/g, "''")}'` : 'NULL'}, 
            updated_at = '${timestamp}'
          RETURNING *;
        `;

        const { data, error } = await supabase.rpc('execute_sql', { sql_command: sql });

        if (error) {
          console.error('Direct SQL insertion failed:', error);
          sharelinkError = error;
        } else {
          console.log('Direct SQL insertion succeeded:', data);
          // Parse the returned data
          try {
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            sharelink = parsedData && parsedData.length > 0 ? parsedData[0] : null;
            sharelinkError = null;
          } catch (parseError) {
            console.error('Error parsing SQL result:', parseError);
            sharelink = null;
            sharelinkError = parseError;
          }
        }
      } catch (sqlError) {
        console.error('Error executing direct SQL:', sqlError);
        sharelinkError = sqlError;
      }
    }

    console.log('Final sharelink creation result:', { sharelink, sharelinkError });

    if (sharelinkError) {
      console.error('Sharelink creation error:', sharelinkError);
      return res.status(500).json({ error: 'Failed to create sharelink', details: sharelinkError.message });
    }

    // Determine the base URL based on the environment
    const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
    const baseUrl = isLocalhost ? origin : 'https://materioa.vercel.app';

    // Even if we don't have a sharelink object, we can still return a valid URL
    // This handles the case where the database operation succeeded but didn't return data
    if (!sharelink) {
      console.warn('No sharelink returned after upsert, but proceeding with URL generation');

      // Create a minimal response with just the URL
      let url = `${baseUrl}/invites/${inviteCode}`;

      return res.status(200).json({
        message: 'Sharelink created (DB update may have succeeded without returning data)',
        url: url,
        inviteCode: inviteCode,
        customHeading: customHeading
      });
    }

    // Return the sharelink data
    return res.status(200).json({
      message: 'Sharelink created successfully',
      sharelink: {
        inviteCode: sharelink.invite_code,
        customHeading: sharelink.custom_heading,
        url: `${baseUrl}/invites/${sharelink.invite_code}`,
        createdAt: sharelink.created_at,
        updatedAt: sharelink.updated_at
      }
    });
  } catch (error) {
    console.error('Create sharelink error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// ==========================================
// Google Drive Helpers
// ==========================================

const getUserFromToken = async (token) => {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.id)
    .single();

  return user;
};

const storeGoogleTokens = async (userId, tokens) => {
  const { error } = await supabase
    .from('google_drive_tokens')
    .upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in * 1000)),
      updated_at: new Date()
    });

  return !error;
};

const getGoogleTokens = async (userId) => {
  const { data: tokens } = await supabase
    .from('google_drive_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  return tokens;
};

const refreshTokensIfNeeded = async (userId, tokens) => {
  if (new Date() < new Date(tokens.expires_at)) {
    return tokens;
  }

  oauth2Client.setCredentials({
    refresh_token: tokens.refresh_token
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await storeGoogleTokens(userId, credentials);
    return await getGoogleTokens(userId);
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return null;
  }
};

const findOrCreateMaterioFolder = async () => {
  try {
    // First, search for existing materio folder
    const response = await drive.files.list({
      q: "name='materio' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // If not found, create the folder
    const folderResponse = await drive.files.create({
      resource: {
        name: 'materio',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    return folderResponse.data.id;
  } catch (error) {
    console.error('Error finding/creating materio folder:', error);
    throw error;
  }
};

// ==========================================
// Forms Handler
// ==========================================
async function handleForms(req, res, url) {
  const origin = req.headers.origin || req.headers.Origin;
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const { method } = req;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];

  try {
    // GET /forms/config - Return forms configuration
    if (method === 'GET' && lastPart === 'config') {
      const configPath = path.join(process.cwd(), 'assets', 'data', 'forms-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return res.status(200).json(config);
      }
      return res.status(200).json({ message: 'Forms config available at /assets/data/forms-config.json' });
    }

    switch (method) {
      case 'POST':
        return await submitForm(req, res);
      case 'GET':
        if (lastPart && lastPart !== 'forms' && !lastPart.includes('?')) {
          return await getFormSubmission(req, res, lastPart);
        }
        return await listFormSubmissions(req, res);
      case 'PUT':
        return await updateFormSubmission(req, res, lastPart);
      case 'DELETE':
        return await deleteFormSubmission(req, res, lastPart);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Forms handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// ==========================================
// Notebooks Handler
// ==========================================
async function handleNotebooks(req, res, url) {
  const origin = req.headers.origin || req.headers.Origin;
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const method = req.method;
  const token = getTokenFromHeaders(req.headers) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get full user profile to check privileges
  let privileges = { isPlusUser: false, hasAdminPrivileges: false };
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_plus_user, has_admin_privileges')
      .eq('id', user.id)
      .single();

    if (!error && userData) {
      privileges.isPlusUser = userData.is_plus_user;
      privileges.hasAdminPrivileges = userData.has_admin_privileges;
    }
  } catch (e) {
    console.error('Error fetching user privileges:', e);
  }

  // Enforce Plus/Super requirement
  if (!privileges.isPlusUser && !privileges.hasAdminPrivileges) {
    return res.status(403).json({ error: 'This feature requires Plus or Admin privileges' });
  }

  const queryParams = {};
  url.searchParams.forEach((value, key) => queryParams[key] = value);
  const subAction = queryParams.subAction || req.body?.subAction;

  try {
    const db = await getMongoDb();
    const collection = db.collection('notebooks');

    // SYNC (Upsert)
    if (method === 'POST' && subAction === 'sync') {
      const notebook = req.body.notebook;
      if (!notebook || !notebook.id) {
        return res.status(400).json({ error: 'Invalid notebook data' });
      }

      await collection.updateOne(
        { id: notebook.id, userId: user.id },
        {
          $set: {
            ...notebook,
            userId: user.id,
            syncedAt: new Date().toISOString()
          }
        },
        { upsert: true }
      );

      return res.status(200).json({ success: true, message: 'Notebook synced' });
    }

    // DELETE
    if (method === 'DELETE' || (method === 'POST' && subAction === 'delete')) {
      const notebookId = queryParams.id || req.body?.id || req.body?.notebookId;
      if (!notebookId) {
        return res.status(400).json({ error: 'Notebook ID required' });
      }

      await collection.deleteOne({ id: notebookId, userId: user.id });
      return res.status(200).json({ success: true, message: 'Notebook deleted from cloud' });
    }

    // LIST (Load)
    if (method === 'GET' || (method === 'POST' && subAction === 'list')) {
      const notebooks = await collection.find({ userId: user.id }).toArray();
      // Remove internal _id before sending
      const cleanNotebooks = notebooks.map(({ _id, ...n }) => n);

      return res.status(200).json({ notebooks: cleanNotebooks });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Notebooks API error:', error);
    return res.status(503).json({
      error: 'Cloud Sync is temporarily unavailable (Database offline). Your notes are saved locally and will sync once the server resumes.',
      details: error.message
    });
  }
}

// End of file

async function submitForm(req, res) {
  const { formType, user, data, confirmations } = req.body;

  if (!formType) {
    return res.status(400).json({ error: 'Form type is required' });
  }
  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Form data is required' });
  }

  let authenticatedUser = null;
  const token = getTokenFromHeaders(req.headers);
  if (token) {
    authenticatedUser = verifyToken(token);
  }

  const userInfo = {
    type: user?.type || 'anonymous',
    userId: authenticatedUser?.id || null,
    email: authenticatedUser?.email || user?.email || null,
    githubUsername: user?.githubUsername || null,
    displayName: authenticatedUser?.username || user?.displayName || null
  };

  const meta = {
    ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    referrer: req.headers['referer'] || null,
    submittedFrom: req.headers.origin || null
  };

  const submission = {
    formType,
    submittedAt: new Date(),
    user: userInfo,
    data,
    confirmations: confirmations || {},
    meta,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null
  };

  // Respond immediately — DB write happens in background
  res.status(201).json({
    success: true,
    message: 'Form submitted successfully',
    submissionId: 'pending'
  });

  // Background: save to MongoDB (user already has their response)
  (async () => {
    try {
      const collection = await getFormsCollection();
      await collection.insertOne(submission);
    } catch (error) {
      console.error('Background form save failed:', error.message);
    }
  })();
}

async function listFormSubmissions(req, res) {
  const token = getTokenFromHeaders(req.headers);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const formType = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  const skip = parseInt(url.searchParams.get('skip')) || 0;

  const filter = {};
  if (formType) filter.formType = formType;
  if (status) filter.status = status;

  try {
    const collection = await getFormsCollection();
    const [submissions, total] = await Promise.all([
      collection.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter)
    ]);
    return res.status(200).json({
      submissions,
      pagination: { total, limit, skip, hasMore: skip + submissions.length < total }
    });
  } catch (error) {
    console.error('Error listing submissions:', error);
    return res.status(500).json({ error: 'Failed to list submissions' });
  }
}

async function getFormSubmission(req, res, id) {
  const token = getTokenFromHeaders(req.headers);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  try {
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid submission ID' });
    const collection = await getFormsCollection();
    const submission = await collection.findOne({ _id: new ObjectId(id) });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    return res.status(200).json(submission);
  } catch (error) {
    console.error('Error getting submission:', error);
    return res.status(500).json({ error: 'Failed to get submission' });
  }
}

async function updateFormSubmission(req, res, id) {
  const token = getTokenFromHeaders(req.headers);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { status, notes } = req.body;
  if (!status || !['pending', 'approved', 'rejected', 'processed'].includes(status)) {
    return res.status(400).json({ error: 'Valid status required' });
  }

  try {
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid submission ID' });
    const collection = await getFormsCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, reviewedBy: user.id, reviewedAt: new Date(), reviewNotes: notes || null } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Submission not found' });
    return res.status(200).json({ success: true, message: 'Submission updated' });
  } catch (error) {
    console.error('Error updating submission:', error);
    return res.status(500).json({ error: 'Failed to update submission' });
  }
}

async function deleteFormSubmission(req, res, id) {
  const token = getTokenFromHeaders(req.headers);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  try {
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid submission ID' });
    const collection = await getFormsCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Submission not found' });
    return res.status(200).json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({ error: 'Failed to delete submission' });
  }
}

// ==========================================
// Contribute Handler (GitHub Upload)
// ==========================================
const CONTRIB_REPO_OWNER = 'Materioa';
const CONTRIB_REPO_NAME = 'static';
const CONTRIB_BRANCH = 'main';

async function handleContribute(req, res) {
  const { Octokit } = await import('@octokit/rest');
  const origin = req.headers.origin || req.headers.Origin;
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const form = new formidable.IncomingForm({
      multiples: true,
      maxFileSize: 6 * 1024 * 1024,
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const getValue = (key) => {
      const val = fields[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const semester = getValue('semester');
    const subject = getValue('subject');
    const category = getValue('category');
    const userType = getValue('userType') || 'anonymous';
    const username = getValue('username') || null;
    const githubUsername = getValue('githubUsername') || null;

    if (!semester || !subject || !category) {
      return res.status(400).json({ error: 'Missing required fields: semester, subject, category' });
    }

    const uploadedFilesList = files.files;
    if (!uploadedFilesList) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const fileList = Array.isArray(uploadedFilesList) ? uploadedFilesList : [uploadedFilesList];

    for (const file of fileList) {
      if (!file.originalFilename.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ error: `Only PDF files allowed. "${file.originalFilename}" is not a PDF.` });
      }
    }

    let contributor = 'Anonymous';
    if (userType === 'authenticated' && username) contributor = username;
    else if (userType === 'github' && githubUsername) contributor = `GitHub: ${githubUsername}`;

    console.log(`Contribution: ${fileList.length} files for ${subject} - ${category} by ${contributor}`);

    const { data: ref } = await octokit.rest.git.getRef({
      owner: CONTRIB_REPO_OWNER, repo: CONTRIB_REPO_NAME, ref: `heads/${CONTRIB_BRANCH}`
    });
    const latestCommitSha = ref.object.sha;
    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner: CONTRIB_REPO_OWNER, repo: CONTRIB_REPO_NAME, commit_sha: latestCommitSha
    });
    const baseTreeSha = latestCommit.tree.sha;

    const treeItems = [];
    const uploadedFiles = [];
    const basePath = `pdfs/${semester}/${subject}`;

    for (const file of fileList) {
      const filePath = `${basePath}/${file.originalFilename}`;
      const content = fs.readFileSync(file.filepath);
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: CONTRIB_REPO_OWNER, repo: CONTRIB_REPO_NAME,
        content: content.toString('base64'), encoding: 'base64'
      });
      treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.sha });
      uploadedFiles.push({
        name: file.originalFilename.replace(/\.[^/.]+$/, ""),
        path: filePath, filename: file.originalFilename, size: file.size
      });
    }

    const { data: newTree } = await octokit.rest.git.createTree({
      owner: CONTRIB_REPO_OWNER, repo: CONTRIB_REPO_NAME, base_tree: baseTreeSha, tree: treeItems
    });

    const commitMessage = `Contribution: ${uploadedFiles.length} file(s) for ${subject} - ${category} (by ${contributor})`;
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: CONTRIB_REPO_OWNER, repo: CONTRIB_REPO_NAME,
      message: commitMessage, tree: newTree.sha, parents: [latestCommitSha]
    });

    await octokit.rest.git.updateRef({
      owner: CONTRIB_REPO_OWNER, repo: CONTRIB_REPO_NAME,
      ref: `heads/${CONTRIB_BRANCH}`, sha: newCommit.sha
    });

    console.log('Contribution uploaded:', newCommit.sha);

    // Log to MongoDB
    try {
      const collection = await getFormsCollection();
      await collection.insertOne({
        formType: 'contribution', submittedAt: new Date(),
        user: { type: userType, username, githubUsername, displayName: contributor },
        data: { semester, subject, category, files: uploadedFiles },
        meta: {
          ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown', commitSha: newCommit.sha
        },
        status: 'uploaded'
      });
    } catch (mongoError) {
      console.error('MongoDB logging error:', mongoError.message);
    }

    return res.status(200).json({
      success: true, message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      commitSha: newCommit.sha, files: uploadedFiles
    });

  } catch (error) {
    console.error('Contribute error:', error);
    let errorMessage = 'Upload failed';
    let statusCode = 500;

    if (error.status === 413) { errorMessage = 'File too large (max 6MB)'; statusCode = 413; }
    else if (error.status === 403) {
      errorMessage = `GitHub permission denied. Check token access to ${CONTRIB_REPO_OWNER}/${CONTRIB_REPO_NAME}`;
      statusCode = 403;
    }
    else if (error.status === 404) {
      errorMessage = `Repository ${CONTRIB_REPO_OWNER}/${CONTRIB_REPO_NAME} not found`;
      statusCode = 404;
    }
    else if (error.message) errorMessage = `Upload failed: ${error.message}`;

    return res.status(statusCode).json({ error: errorMessage });
  }
}

// ==========================================
// Subscription Handler
// ==========================================
async function handleSubscription(req, res, url) {
  const subAction = url.searchParams.get('subAction') || req.query?.subAction;

  // Auth check
  const token = getTokenFromHeaders(req.headers);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  const userId = decoded.id;

  if (subAction === 'create-order') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!razorpay) {
      console.error('Razorpay not configured. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env');
      return res.status(500).json({
        error: 'Razorpay not configured',
        details: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from server environment.'
      });
    }

    try {
      // SECURITY: Price is determined server-side only, never trust frontend price
      const { plan } = req.body;

      // Validate plan and set price server-side
      const PLAN_PRICES = {
        'plus_subscription': 5900,  // ₹59 (3-month subscription)
        'pro_lifetime': 29900       // ₹299 (lifetime)
      };

      const amount = PLAN_PRICES[plan];
      if (!amount) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }

      const options = {
        amount: amount,
        currency: "INR",
        receipt: `receipt_${plan}_${userId.substring(0, 8)}_${Date.now()}`,
        notes: {
          userId,
          plan: plan
        }
      };

      const order = await razorpay.orders.create(options);
      return res.status(200).json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKey: RAZORPAY_KEY_ID
      });
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      return res.status(500).json({
        error: 'Failed to create order',
        details: error.message || error.toString() || 'Unknown Razorpay error'
      });
    }
  }

  if (subAction === 'verify-payment') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details' });
    }

    // Verify signature
    try {
      const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.error('Invalid signature detected');
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      console.log(`Payment verified for order ${razorpay_order_id}, upgrading user ${userId} to ${plan}`);

      // Update user tier in Supabase
      // Note: is_plus_user = Pro tier (₹299 lifetime) - old Plus rebranded
      //       is_lite_user = Plus tier (₹59/3mo subscription) - new tier
      const updateData = {};
      if (plan === 'pro_lifetime') {
        updateData.is_plus_user = true; // Pro tier uses is_plus_user column
      } else if (plan === 'plus_subscription') {
        updateData.is_lite_user = true; // Plus tier uses is_lite_user column
        // Set expiry to 3 months from now
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 3);
        updateData.lite_expiry = expiryDate.toISOString();
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      const tierName = plan === 'pro_lifetime' ? 'Pro' : 'Plus';
      return res.status(200).json({
        success: true,
        message: `Payment verified and account upgraded to ${tierName}`
      });
    } catch (error) {
      console.error('Payment verification/Upgrade error:', error);
      return res.status(500).json({ error: 'Failed to verify payment or upgrade user' });
    }
  }

  return res.status(404).json({ error: 'Subscription action not found' });
}


// ==========================================
// PDF Share Handler (MongoDB Masked URLs)
// ==========================================
async function handlePdfShare(req, res, url) {
  const origin = req.headers.origin || req.headers.Origin;
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const method = req.method;
  const queryParams = {};
  url.searchParams.forEach((value, key) => queryParams[key] = value);

  const subAction = queryParams.subAction || req.body?.subAction;

  try {
    const db = await getMongoDb();
    const collection = db.collection('pdf_shares');

    // CREATE / CREATE MASK
    if (method === 'POST' && (subAction === 'create' || url.pathname.includes('/create'))) {
      const { actualUrl } = req.body;
      if (!actualUrl) {
        return res.status(400).json({ error: 'actualUrl is required' });
      }

      // 1. Check if mapping already exists
      const existing = await collection.findOne({ actualUrl });
      if (existing) {
        return res.status(200).json({ maskId: existing.maskId, isNew: false });
      }

      // 2. Generate unique maskId
      let maskId;
      let isUnique = false;
      while (!isUnique) {
        maskId = crypto.randomBytes(4).toString('hex'); // 8 char hex
        const duplicate = await collection.findOne({ maskId });
        if (!duplicate) isUnique = true;
      }

      // 3. Insert and return
      await collection.insertOne({
        maskId,
        actualUrl,
        createdAt: new Date()
      });

      return res.status(201).json({ maskId, isNew: true });
    }

    // RESOLVE / GET ACTUAL URL
    if (method === 'GET' && (subAction === 'resolve' || url.pathname.includes('/resolve'))) {
      const maskId = queryParams.maskId;
      if (!maskId) {
        return res.status(400).json({ error: 'maskId is required' });
      }

      const share = await collection.findOne({ maskId });
      if (!share) {
        return res.status(404).json({ error: 'Shared link not found or expired' });
      }

      return res.status(200).json({ actualUrl: share.actualUrl });
    }

    // ==========================================
    // LLM Share - Create expiring masked URL
    // ==========================================
    if (method === 'POST' && (subAction === 'create-llm' || url.pathname.includes('/create-llm'))) {
      const { actualUrl } = req.body;
      if (!actualUrl) {
        return res.status(400).json({ error: 'actualUrl is required' });
      }

      const llmCollection = db.collection('pdf_shares_llm');

      // Ensure TTL index exists (MongoDB auto-deletes expired docs)
      try {
        await llmCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      } catch (e) {
        // Index may already exist, ignore
      }

      // Check if a valid (non-expired) LLM share already exists for this URL
      const existing = await llmCollection.findOne({
        actualUrl,
        expiresAt: { $gt: new Date() }
      });
      if (existing) {
        return res.status(200).json({
          llmMaskId: existing.llmMaskId,
          expiresAt: existing.expiresAt,
          isNew: false
        });
      }

      // Generate unique llmMaskId
      let llmMaskId;
      let isUnique = false;
      while (!isUnique) {
        llmMaskId = 'llm-' + crypto.randomBytes(6).toString('hex'); // 16 char with prefix
        const duplicate = await llmCollection.findOne({ llmMaskId });
        if (!duplicate) isUnique = true;
      }

      // Set expiry to 6 hours from now
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

      await llmCollection.insertOne({
        llmMaskId,
        actualUrl,
        createdAt: new Date(),
        expiresAt
      });

      return res.status(201).json({ llmMaskId, expiresAt, isNew: true });
    }

    // ==========================================
    // LLM Share - Resolve (redirect to actual PDF)
    // ==========================================
    if (method === 'GET' && (subAction === 'resolve-llm' || url.pathname.includes('/resolve-llm'))) {
      const llmMaskId = queryParams.llmMaskId || queryParams.maskId || queryParams['link-id'];
      if (!llmMaskId) {
        return res.status(400).json({ error: 'llmMaskId is required' });
      }

      const llmCollection = db.collection('pdf_shares_llm');
      const share = await llmCollection.findOne({ llmMaskId });

      if (!share) {
        return res.status(404).json({ error: 'LLM share link not found or expired' });
      }

      // Check if expired
      if (new Date() > new Date(share.expiresAt)) {
        return res.status(410).json({ error: 'This LLM share link has expired' });
      }

      // Redirect to the actual PDF URL so LLMs can fetch it
      res.setHeader('Location', share.actualUrl);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(302).end();
    }

    return res.status(400).json({ error: 'Invalid share action' });
  } catch (error) {
    console.error('PDF Share API error:', error);
    return res.status(503).json({ error: 'Database error', details: error.message });
  }
}
