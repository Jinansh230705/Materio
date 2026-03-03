const { google } = require('googleapis');
const { verifyToken } = require('./utils');
const cors = require('./cors');

// Google Drive configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://auth-materioa.netlify.app/account/profile.html';

// Initialize Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Helper function to get user from token
const getUserFromToken = async (token) => {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseConfig = require('../config/supabase');
  const supabase = createClient(supabaseConfig.SUPABASE_URL, supabaseConfig.SUPABASE_ANON_KEY);
  
  const decoded = verifyToken(token);
  if (!decoded) return null;
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.id)
    .single();
  
  return user;
};

// Store Google Drive tokens in database
const storeGoogleTokens = async (userId, tokens) => {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseConfig = require('../config/supabase');
  const supabase = createClient(supabaseConfig.SUPABASE_URL, supabaseConfig.SUPABASE_ANON_KEY);
  
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

// Get Google Drive tokens from database
const getGoogleTokens = async (userId) => {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseConfig = require('../config/supabase');
  const supabase = createClient(supabaseConfig.SUPABASE_URL, supabaseConfig.SUPABASE_ANON_KEY);
  
  const { data: tokens } = await supabase
    .from('google_drive_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return tokens;
};

// Refresh Google tokens if needed
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

// Helper function to find or create the materio folder
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

exports.handler = async (event, context) => {
  // Enable CORS
  if (event.httpMethod === 'OPTIONS') {
    return cors.handler(event, context);
  }

  try {
    const { httpMethod, path, body, headers } = event;
    const parsedBody = body ? JSON.parse(body) : {};
    
    // Extract auth token
    const authHeader = headers.authorization || headers.Authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return {
        statusCode: 401,
        headers: cors.headers,
        body: JSON.stringify({ error: 'No token provided' })
      };
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return {
        statusCode: 401,
        headers: cors.headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Route handling
    const endpoint = path.split('/').pop();

    switch (httpMethod) {
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
          
          return {
            statusCode: 200,
            headers: cors.headers,
            body: JSON.stringify({ authUrl })
          };
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
          
          return {
            statusCode: 200,
            headers: cors.headers,
            body: JSON.stringify({ 
              linked,
              materioFolderId
            })
          };
        }
        
        if (endpoint === 'files') {
          // List user's files from Google Drive
          const tokens = await getGoogleTokens(user.id);
          if (!tokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Google Drive not linked' })
            };
          }
          
          const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
          if (!refreshedTokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to refresh tokens' })
            };
          }
          
          oauth2Client.setCredentials({
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token
          });
            try {
            // Get the folderId from query parameters if provided
            const url = new URL(event.rawUrl || event.url);
            const folderId = url.searchParams.get('folderId');
            
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
            
            return {
              statusCode: 200,
              headers: cors.headers,
              body: JSON.stringify({ files: response.data.files })
            };
          } catch (error) {
            console.error('Error listing files:', error);
            return {
              statusCode: 500,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to list files' })
            };
          }
        }
          break;

      case 'POST':
        if (endpoint === 'callback') {
          // Handle OAuth callback
          const { code, state } = parsedBody;
          
          if (state !== user.id) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Invalid state parameter' })
            };
          }
          
          try {
            const { tokens } = await oauth2Client.getToken(code);
            await storeGoogleTokens(user.id, tokens);
            
            return {
              statusCode: 200,
              headers: cors.headers,
              body: JSON.stringify({ success: true })
            };
          } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to exchange code for tokens' })
            };
          }        }
        
        if (endpoint === 'ensure-folder') {
          // Ensure materio folder exists
          const tokens = await getGoogleTokens(user.id);
          if (!tokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Google Drive not linked' })
            };
          }

          const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
          if (!refreshedTokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to refresh tokens' })
            };
          }

          oauth2Client.setCredentials({
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token
          });

          try {
            const folderId = await findOrCreateMaterioFolder();
            return {
              statusCode: 200,
              headers: cors.headers,
              body: JSON.stringify({ folderId })
            };
          } catch (error) {
            console.error('Error ensuring materio folder:', error);
            return {
              statusCode: 500,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to ensure materio folder' })
            };
          }
        }
        
        if (endpoint === 'upload') {
          // Upload file to Google Drive
          const tokens = await getGoogleTokens(user.id);
          if (!tokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Google Drive not linked' })
            };
          }
          
          const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
          if (!refreshedTokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to refresh tokens' })
            };
          }
          
          oauth2Client.setCredentials({
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token
          });
            const { fileName, fileContent, mimeType, folderId } = parsedBody;
          
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
            
            return {
              statusCode: 200,
              headers: cors.headers,
              body: JSON.stringify({ 
                success: true, 
                fileId: response.data.id,
                fileName: response.data.name
              })
            };
          } catch (error) {
            console.error('Error uploading file:', error);
            return {
              statusCode: 500,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to upload file' })
            };
          }
        }
        
        break;

      case 'DELETE':
        if (endpoint === 'unlink') {
          // Unlink Google Drive
          try {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseConfig = require('../config/supabase');
            const supabase = createClient(supabaseConfig.SUPABASE_URL, supabaseConfig.SUPABASE_ANON_KEY);
            
            const { error } = await supabase
              .from('google_drive_tokens')
              .delete()
              .eq('user_id', user.id);
            
            if (error) throw error;
            
            return {
              statusCode: 200,
              headers: cors.headers,
              body: JSON.stringify({ success: true })
            };
          } catch (error) {
            console.error('Error unlinking Google Drive:', error);
            return {
              statusCode: 500,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to unlink Google Drive' })
            };
          }
        }

        // Handle file deletion by ID
        const deleteMatch = path.match(/\/delete\/(.+)$/);
        if (deleteMatch) {
          const fileId = deleteMatch[1];
          
          const tokens = await getGoogleTokens(user.id);
          if (!tokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Google Drive not linked' })
            };
          }

          const refreshedTokens = await refreshTokensIfNeeded(user.id, tokens);
          if (!refreshedTokens) {
            return {
              statusCode: 400,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to refresh tokens' })
            };
          }

          oauth2Client.setCredentials({
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token
          });

          try {
            await drive.files.delete({
              fileId: fileId
            });

            return {
              statusCode: 200,
              headers: cors.headers,
              body: JSON.stringify({ success: true })
            };
          } catch (error) {
            console.error('Error deleting file:', error);
            return {
              statusCode: 500,
              headers: cors.headers,
              body: JSON.stringify({ error: 'Failed to delete file' })
            };
          }
        }

        break;

      default:
        return {
          statusCode: 405,
          headers: cors.headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    return {
      statusCode: 404,
      headers: cors.headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Google Drive API error:', error);
    return {
      statusCode: 500,
      headers: cors.headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
