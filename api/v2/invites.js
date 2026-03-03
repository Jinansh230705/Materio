const { 
  supabase, 
  supabaseAdmin,
  verifyToken, 
  getTokenFromHeaders,
  corsHeaders,
  generateRecoveryKey
} = require('./_utils');

module.exports = async (req, res) => {
  const origin = req.headers.origin || req.headers.Origin;
  
  console.log('Received request for path:', req.url);
  console.log('HTTP Method:', req.method);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).end();
  }

  try {
    // Extract action from path or query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const pathAction = pathParts[pathParts.length - 1];
    
    // Also check for action in the request body
    let bodyAction = null;
    if (req.method === 'POST' && req.body) {
      try {
        const body = req.body;
        bodyAction = body.action;
      } catch (e) {
        console.log('Error parsing body:', e);
      }
    }
    
    // Determine endpoint type
    const isValidateEndpoint = pathAction === 'validate' || url.pathname.includes('/invites/validate');
    const isDiagnosticEndpoint = pathAction === 'diagnostic' || url.pathname.includes('/invites/diagnostic');
    const isToggleAdminEndpoint = pathAction === 'toggle-admin' || url.pathname.includes('/invites/toggle-admin');
    const isTogglePlusEndpoint = pathAction === 'toggle-plus' || url.pathname.includes('/invites/toggle-plus');
    const isDeleteEndpoint = pathAction === 'delete' || url.pathname.includes('/invites/delete');
    // Sharelink endpoint moved to features.js
    const isSharelinkEndpoint = pathAction === 'sharelink' || url.pathname.includes('/sharelink') || bodyAction === 'sharelink';
    const isSharelinkInfoEndpoint = pathAction === 'sharelink-info' || url.pathname.includes('/sharelink-info');
    const isDynamicInviteEndpoint = pathAction === 'dynamic' || url.pathname.includes('/invites/dynamic') || req.query.inviteCode;

    // Route to appropriate handler
    if (isValidateEndpoint && req.method === 'POST') {
      return await validateInvite(req, res, origin);
    } 
    
    if (isDiagnosticEndpoint && req.method === 'POST') {
      return await diagnosticInvite(req, res, origin);
    }

    if (isSharelinkInfoEndpoint && req.method === 'GET') {
      return await handleSharelinkInfo(req, res, origin);
    }

    if (isDynamicInviteEndpoint && req.method === 'GET') {
      return await handleDynamicInvite(req, res, origin);
    }

    // Authenticated endpoints
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, has_admin_privileges')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Admin required endpoints
    if (isToggleAdminEndpoint || isTogglePlusEndpoint || isDeleteEndpoint || (req.method === 'POST' && !isSharelinkEndpoint) || (req.method === 'GET' && !isSharelinkEndpoint)) {
       if (!user.has_admin_privileges) {
         return res.status(403).json({ error: 'Admin privileges required' });
       }
    }

    if (isToggleAdminEndpoint && req.method === 'POST') {
      return await toggleAdmin(req, res, origin, user.id);
    }

    if (isTogglePlusEndpoint && req.method === 'POST') {
      return await togglePlusUser(req, res, origin, user.id);
    }

    if (isDeleteEndpoint && req.method === 'POST') {
      return await deleteInvite(req, res, origin, user.id);
    }

    // Sharelink creation is now handled in features.js
    if (isSharelinkEndpoint && req.method === 'POST') {
      return res.status(301).json({ 
        error: 'Endpoint moved', 
        message: 'Please use /api/v2/features?action=sharelink',
        newEndpoint: '/api/v2/features?action=sharelink'
      });
    }

    // Default CRUD for invites
    if (req.method === 'POST') {
      return await createInvite(user.id, origin, req.body, res);
    } else if (req.method === 'GET') {
      return await getInvites(user.id, origin, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Invite API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Original invites.js functions
async function createInvite(userId, origin, requestBody = null, res) {
  try {
    // Parse request body if provided
    let containsPlusPerks = false;
    if (requestBody) {
      containsPlusPerks = !!requestBody.containsPlusPerks;
    }

    // Generate invite code similar to recovery key format
    const inviteCode = generateRecoveryKey();
    
    // Insert invite into database
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        code: inviteCode,
        created_by: userId,
        contains_plus_perks: containsPlusPerks
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create invite', details: error });
    }

    return res.status(201).json({
      message: 'Invite created successfully',
      invite: {
        id: invite.id,
        code: invite.code,
        created_at: invite.created_at,
        expires_at: invite.expires_at,
        contains_plus_perks: invite.contains_plus_perks
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create invite', details: error.message });
  }
}

async function getInvites(userId, origin, res) {
  try {
    // Get all invites created by this admin user
    const { data: invites, error } = await supabase
      .from('invites')
      .select(`
        id,
        code,
        redeemed,
        redeemed_by,
        redeemed_date,
        created_at,
        expires_at,
        contains_plus_perks,
        redeemed_user:users!redeemed_by(id, username, display_name, has_admin_privileges, is_plus_user, profile_picture)
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch invites', details: error });
    }

    return res.status(200).json({
      invites: invites || []
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch invites', details: error.message });
  }
}

// From invites-validate.js
async function validateInvite(req, res, origin) {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }
      // Get the invite data - using admin client for reliability
    // Use case-insensitive comparison to handle URL normalization
    const { data: invite, error } = await supabase
      .from('invites')
      .select('id, code, redeemed, expires_at, created_at, contains_plus_perks')
      .ilike('code', inviteCode)
      .single();
      
    if (error || !invite) {
      console.log('Invite lookup failed:', { error, inviteCode });
      return res.status(200).json({ 
        valid: false, 
        message: 'Invalid invite code' 
      });
    }

    console.log('Invite found:', invite);

    // Check if invite is already redeemed
    if (invite.redeemed) {
      return res.status(200).json({ 
        valid: false, 
        message: 'Invite code has already been used' 
      });
    }

    // Check if invite is expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    
    if (now > expiresAt) {
      return res.status(200).json({ 
        valid: false, 
        message: 'Invite code has expired' 
      });
    }
    
    // Invite is valid
    console.log('Invite validation successful:', {
      inviteId: invite.id,
      inviteCode: invite.code,
      redeemed: invite.redeemed,
      expiresAt: invite.expires_at
    });

    return res.status(200).json({ 
      valid: true, 
      message: 'Invite code is valid',
      inviteId: invite.id
    });
  } catch (error) {
    console.error('Invite validation error:', error);
    return res.status(500).json({ 
      valid: false, 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

// From invite-diagnostic.js
async function diagnosticInvite(req, res, origin) {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }
    
    // Get detailed invite information
    const { data: invite, error } = await supabase
      .from('invites')
      .select('*')
      .ilike('code', inviteCode)
      .single();

    if (error) {
      return res.status(200).json({ 
        found: false,
        error: error.message,
        code: inviteCode
      });
    }    // Check if reservation columns exist by trying to get them
    const { data: inviteWithReservation, error: reservationError } = await supabase
      .from('invites')
      .select('id, code, redeemed, expires_at, created_at, reserved_at, reserved_until, contains_plus_perks')
      .ilike('code', inviteCode)
      .single();

    const hasReservationColumns = !reservationError;

    // Get table schema info
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'invites')
      .order('ordinal_position');

    return res.status(200).json({
      found: true,
      inviteData: invite,
      inviteWithReservation: inviteWithReservation,
      hasReservationColumns,
      reservationError: reservationError?.message,
      schema: schema || [],
      schemaError: schemaError?.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

// From toggle-admin.js
async function toggleAdmin(req, res, origin, adminUserId) {
  try {
    // Parse request body
    const { userId, hasAdminPrivileges } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update user admin privileges
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ has_admin_privileges: hasAdminPrivileges })
      .eq('id', userId)
      .select('id, username, display_name, has_admin_privileges, is_plus_user')
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user privileges', details: updateError });
    }

    return res.status(200).json({
      message: 'User privileges updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Toggle admin API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Toggle plus user privileges
// From toggle-plus-user.js
async function togglePlusUser(req, res, origin, adminUserId) {
  try {
    // Parse request body
    const { userId, isPlusUser } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update user plus status
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ is_plus_user: isPlusUser })
      .eq('id', userId)
      .select('id, username, display_name, has_admin_privileges, is_plus_user')
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user status', details: updateError });
    }

    return res.status(200).json({
      message: 'User status updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Toggle plus user API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Delete invite code
// From delete-invite.js
async function deleteInvite(req, res, origin, adminUserId) {
  try {
    // Parse request body
    const { inviteId } = req.body;
    
    if (!inviteId) {
      return res.status(400).json({ error: 'Invite ID is required' });
    }

    // Delete invite
    const { error: deleteError } = await supabase
      .from('invites')
      .delete()
      .eq('id', inviteId);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete invite', details: deleteError });
    }

    return res.status(200).json({ message: 'Invite deleted successfully' });
  } catch (error) {
    console.error('Delete invite API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Create shareable link for invite - DEPRECATED: Moved to features.js
// async function createSharelink(req, res, origin, userId) { ... }

async function handleSharelinkInfo(req, res, origin) {
  try {
    // Get invite code from query params
    const code = req.query.code;
    
    if (!code) {
      console.log('No invite code provided');
      return res.status(400).json({
        error: 'Invite code is required'
      });
    }
    
    console.log('Looking up sharelink info for code:', code);
    
    // Try to get sharelink info
    let sharelinkInfo = null;
    let error = null;
    
    // Method 1: Standard Supabase query
    try {
      const { data, error: queryError } = await supabase
        .from('sharelinks')
        .select('invite_code, custom_heading')
        .eq('invite_code', code)
        .single();
      
      if (data) {
        sharelinkInfo = data;
      } else {
        error = queryError;
      }
    } catch (e) {
      console.error('Error querying sharelink:', e);
      error = e;
    }
    
    // Method 2: Direct SQL via RPC if standard query fails
    if (!sharelinkInfo && error) {
      try {
        const sql = `
          SELECT invite_code, custom_heading 
          FROM sharelinks 
          WHERE invite_code = '${code}'
          LIMIT 1;
        `;
        
        const { data, error: sqlError } = await supabase.rpc('execute_sql', { sql_command: sql });
        
        if (data) {
          // Parse the result
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (parsedData && parsedData.length > 0) {
            sharelinkInfo = parsedData[0];
            error = null;
          }
        }
      } catch (sqlError) {
        console.error('Error executing direct SQL:', sqlError);
      }
    }
    
    if (sharelinkInfo) {
      return res.status(200).json({
        inviteCode: sharelinkInfo.invite_code,
        customHeading: sharelinkInfo.custom_heading
      });
    } else {
      return res.status(404).json({
        error: 'Sharelink not found'
      });
    }
  } catch (error) {
    console.error('Sharelink info error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function handleDynamicInvite(req, res, origin) {
  try {
    let inviteCode = req.query.inviteCode;
    
    if (!inviteCode) {
        const pathParts = req.url.split('?')[0].split('/');
        inviteCode = pathParts[pathParts.length - 1];
    }
    
    if (!inviteCode || inviteCode === 'invites' || inviteCode === 'invites-dynamic') {
      return res.status(404).send('Invite code not found');
    }

    console.log('Looking up invite code:', inviteCode);

    // Check for custom heading in URL parameter
    const customHeadingFromUrl = req.query.heading;

    // First, check if there's a sharelink for this invite
    let sharelink = null;
    
    try {
      const result = await supabase
        .from('sharelinks')
        .select('custom_heading, invite_code')
        .eq('invite_code', inviteCode)
        .single();
        
      sharelink = result.data;
    } catch (e) {
      console.error('Error during sharelink lookup:', e);
    }

    // Check if the invite exists and is valid
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, code, redeemed, expires_at, created_at, contains_plus_perks')
      .ilike('code', inviteCode)
      .single();

    if (inviteError || !invite) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Invite</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb; color: #111; }
              .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 400px; text-align: center; }
              h1 { margin-top: 0; color: #ef4444; }
              p { color: #4b5563; margin-bottom: 1.5rem; }
              a { display: inline-block; background: #2563eb; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 0.5rem; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Invalid Invite</h1>
              <p>This invite code does not exist or is invalid.</p>
              <a href="/">Go Home</a>
            </div>
          </body>
        </html>
      `);
    }

    if (invite.redeemed) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invite Redeemed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb; color: #111; }
              .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 400px; text-align: center; }
              h1 { margin-top: 0; color: #f59e0b; }
              p { color: #4b5563; margin-bottom: 1.5rem; }
              a { display: inline-block; background: #2563eb; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 0.5rem; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Invite Redeemed</h1>
              <p>This invite code has already been used.</p>
              <a href="/">Go Home</a>
            </div>
          </body>
        </html>
      `);
    }

    // Determine heading
    const heading = customHeadingFromUrl || (sharelink ? sharelink.custom_heading : 'You have been invited!');
    
    // Return HTML page
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join Materio</title>
        <style>
          :root {
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 1rem;
          }
          .card {
            background-color: var(--card-bg);
            padding: 2.5rem;
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            max-width: 480px;
            width: 100%;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .logo {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            background: linear-gradient(to right, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          h1 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            line-height: 1.3;
          }
          p {
            color: var(--text-muted);
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .code-display {
            background: rgba(0, 0, 0, 0.3);
            padding: 1rem;
            border-radius: 0.5rem;
            font-family: monospace;
            font-size: 1.25rem;
            letter-spacing: 2px;
            margin-bottom: 2rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
          }
          .btn {
            display: block;
            width: 100%;
            padding: 0.875rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: background-color 0.2s;
          }
          .btn:hover {
            background-color: var(--primary-hover);
          }
          .perks-badge {
            display: inline-block;
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1.5rem;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Materio</div>
          
          ${invite.contains_plus_perks ? '<div class="perks-badge">✨ Includes Plus Perks</div>' : ''}
          
          <h1>${heading}</h1>
          
          <p>You've been invited to join Materio. Use the code below to create your account and get started.</p>
          
          <div class="code-display">${invite.code}</div>
          
          <a href="/signup?invite=${invite.code}" class="btn">Accept Invite & Join</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Dynamic invite error:', error);
    return res.status(500).send('Internal Server Error');
  }
}

// Removed createSharelink function as it has been moved to features.js
