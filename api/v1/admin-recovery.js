const { 
  supabase, 
  verifyToken, 
  getTokenFromHeaders,
  corsHeaders
} = require('./utils');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get token from headers
    const token = getTokenFromHeaders(event.headers);
    
    if (!token) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authentication token required' })
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

    // Get admin user and verify privileges
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, has_admin_privileges')
      .eq('id', decoded.id)
      .single();

    if (adminError || !adminUser || !adminUser.has_admin_privileges) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Admin privileges required for account recovery service' })
      };
    }

    // Parse request body
    const { email, username } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !username) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Both email and username are required for account recovery' })
      };
    }

    // Find target user by email AND username for security
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name, email, profile_picture, created_at, updated_at, recovery_key, has_admin_privileges, is_plus_user')
      .eq('email', email)
      .eq('username', username)
      .single();

    if (userError || !targetUser) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'User not found with the provided email and username combination',
          details: 'Both email and username must match exactly for security purposes'
        })
      };
    }

    // Log the recovery attempt for audit purposes
    console.log(`Admin recovery attempted by ${adminUser.id} for user ${targetUser.id} (${targetUser.email})`);

    // Return all user data except password hash
    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Account recovery data retrieved successfully',
        recoveryService: 'Premium Admin Account Recovery',
        adminId: adminUser.id,
        targetUser: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.display_name,
          email: targetUser.email,
          profilePicture: targetUser.profile_picture,
          recoveryKey: targetUser.recovery_key,
          hasAdminPrivileges: targetUser.has_admin_privileges,
          isPlusUser: targetUser.is_plus_user,
          createdAt: targetUser.created_at,
          updatedAt: targetUser.updated_at
        },
        securityNote: 'This recovery includes the user\'s recovery key for password reset purposes',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Admin recovery error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error during account recovery',
        details: error.message 
      })
    };
  }
};
