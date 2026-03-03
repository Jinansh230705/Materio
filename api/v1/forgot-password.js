const { 
  supabase, 
  hashPassword, 
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
    const { email, recoveryKey, newPassword } = JSON.parse(event.body);

    // Validate inputs
    if (!email || !recoveryKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and recovery key are required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Verify recovery key
    if (user.recovery_key !== recoveryKey) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid recovery key' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Only proceed if newPassword is provided
    if (newPassword) {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to update password', details: updateError }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      // Generate new token
      const token = generateToken({
        id: user.id,
        email: user.email,
        username: user.username
      });

      // Return success response with token
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Password reset successfully',
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            email: user.email
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    } else {
      // If no new password provided, just verify the recovery key
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Recovery key verified',
          verified: true
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
