const { 
  supabase, 
  comparePassword, 
  generateToken 
} = require('./utils');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // Validate inputs
    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and password are required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Check if username is an email
    const isEmail = /\S+@\S+\.\S+/.test(username);
    const field = isEmail ? 'email' : 'username';

    // Find user by username or email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq(field, username)
      .single();

    if (error || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Compare provided password with stored hash
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Get profile picture URL if exists
    let profilePicture = user.profile_picture;    // Return success response with token and user data
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
          hasAdminPrivileges: user.has_admin_privileges,
          isPlusUser: user.is_plus_user,
          profilePicture
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
