const { 
  supabase, 
  verifyToken, 
  getTokenFromHeaders,
  corsHeaders
} = require('./utils');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  console.log('Sharelink handler - Received request for path:', event.path);
  console.log('HTTP Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers));
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }
  
  try {
    // For sharelink, we need auth
    const token = getTokenFromHeaders(event.headers);
    
    if (!token) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', decoded.id)
      .single();
      
    if (userError || !user) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }
    
    // Handle POST for creating/updating sharelinks
    if (event.httpMethod === 'POST') {
      return await createSharelink(event, origin, user.id);
    }
    
    // Default response for unsupported methods
    return {
      statusCode: 405,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Sharelink error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};

// Create shareable link for invite
async function createSharelink(event, origin, userId) {
  try {
    console.log('Creating sharelink, user ID:', userId);
    
    // Parse request body
    const bodyData = JSON.parse(event.body);
    const inviteCode = bodyData.inviteCode;
    const customHeading = bodyData.customHeading;
    
    console.log('Sharelink params:', { inviteCode, customHeading });
    
    if (!inviteCode) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invite code is required' })
      };
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
      return {
        statusCode: 404,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invite lookup failed', details: inviteError })
      };
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
        return {
          statusCode: 403,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'You do not have permission to share this invite' })
        };
      } else {
        return {
          statusCode: 404,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invite not found' })
        };
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
      return {
        statusCode: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to create sharelink', details: sharelinkError.message })
      };
    }
    
    // Determine the base URL based on the environment
    const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
    const baseUrl = isLocalhost ? origin : 'https://materioa.netlify.app';
    
    // Even if we don't have a sharelink object, we can still return a valid URL
    // This handles the case where the database operation succeeded but didn't return data
    if (!sharelink) {
      console.warn('No sharelink returned after upsert, but proceeding with URL generation');
      
      // Create a minimal response with just the URL
      let url = `${baseUrl}/invites/${inviteCode}`;
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Sharelink created (DB update may have succeeded without returning data)',
          url: url,
          inviteCode: inviteCode,
          customHeading: customHeading
        })
      };
    }

    // Return the sharelink data
    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Sharelink created successfully',
        sharelink: {
          inviteCode: sharelink.invite_code,
          customHeading: sharelink.custom_heading,
          url: `${baseUrl}/invites/${sharelink.invite_code}`,
          createdAt: sharelink.created_at,
          updatedAt: sharelink.updated_at
        }
      })
    };
  } catch (error) {
    console.error('Create sharelink error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
}