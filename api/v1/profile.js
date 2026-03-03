const { 
  supabase, 
  hashPassword,
  comparePassword,
  verifyToken, 
  getTokenFromHeaders,
  generateRecoveryKey
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle different HTTP methods
  switch (event.httpMethod) {
    case 'GET':
      return handleGetProfile(event);
    case 'PUT':
      return handleUpdateProfile(event);
    case 'DELETE':
      return handleDeleteAccount(event);
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
        headers: { 'Content-Type': 'application/json' }
      };
  }
};

// Get user profile
async function handleGetProfile(event) {
  try {
    // Get token from headers
    const token = getTokenFromHeaders(event.headers);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication token required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
        headers: { 'Content-Type': 'application/json' }      };
    }

    const userId = decoded.id;

    // Get user data from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, display_name, email, profile_picture, created_at, updated_at, recovery_key, has_admin_privileges, is_plus_user')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }    // Return user profile
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
          profilePicture: user.profile_picture,
          recoveryKey: user.recovery_key,
          hasAdminPrivileges: user.has_admin_privileges,
          isPlusUser: user.is_plus_user,
          createdAt: user.created_at,
          updatedAt: user.updated_at
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
}

// Update user profile
async function handleUpdateProfile(event) {
  try {
    // Get token from headers
    const token = getTokenFromHeaders(event.headers);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication token required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Parse request body
    const { 
      username, 
      displayName, 
      currentPassword, 
      newPassword,
      generateNewRecoveryKey,
      profilePicture
    } = JSON.parse(event.body);

    // Get current user data for validation
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Initialize update data
    const updateData = {};
    let recoveryKey = null;

    // Update username if provided
    if (username && username !== user.username) {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', decoded.id)
        .single();

      if (existingUser) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Username already taken' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      updateData.username = username;
    }

    // Update display name if provided
    if (displayName && displayName !== user.display_name) {
      updateData.display_name = displayName;
    }

    // Update password if provided
    if (newPassword && currentPassword) {
      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Current password is incorrect' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      // Hash new password
      updateData.password = await hashPassword(newPassword);
    }

    // Generate new recovery key if requested
    if (generateNewRecoveryKey) {
      // Verify current password is provided
      if (!currentPassword) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Current password required to generate new recovery key' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Current password is incorrect' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      // Generate new recovery key
      recoveryKey = generateRecoveryKey();
      updateData.recovery_key = recoveryKey;
    }

    // Update profile picture if provided
    if (profilePicture && profilePicture.startsWith('data:image')) {
      try {
        // Extract base64 data
        const base64Data = profilePicture.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload to Supabase storage
        const fileName = `profile-${Date.now()}.jpg`;
        
        // Upload to storage bucket
        const { data: upload, error: uploadError } = await supabase
          .storage
          .from('profile-pictures')
          .upload(`${decoded.id}/${fileName}`, buffer, {
            contentType: 'image/jpeg',
            upsert: false
          });
          
        if (uploadError) {
          console.error('Profile picture upload error:', uploadError);
        } else {
          // Get public URL for the uploaded file
          const { data: { publicUrl } } = supabase
            .storage
            .from('profile-pictures')
            .getPublicUrl(`${decoded.id}/${fileName}`);
            
          updateData.profile_picture = publicUrl;
        }
      } catch (error) {
        console.error('Profile picture processing error:', error);
      }
    }

    // Update the user in the database if there are changes
    if (Object.keys(updateData).length > 0) {
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', decoded.id);

      if (updateError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to update profile', details: updateError }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
    }    // Return updated profile data
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select('id, username, display_name, email, profile_picture, created_at, updated_at, recovery_key, has_admin_privileges, is_plus_user')
      .eq('id', decoded.id)
      .single();

    if (fetchError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch updated profile', details: fetchError }),
        headers: { 'Content-Type': 'application/json' }
      };
    }    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          displayName: updatedUser.display_name,
          email: updatedUser.email,
          profilePicture: updatedUser.profile_picture,
          recoveryKey: updatedUser.recovery_key,
          hasAdminPrivileges: updatedUser.has_admin_privileges,
          isPlusUser: updatedUser.is_plus_user,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at
        },
        recoveryKey: recoveryKey // Also include it separately for backward compatibility
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
}

// Delete user account
async function handleDeleteAccount(event) {
  try {
    console.log("Starting account deletion process");
    
    // Get token from headers
    const token = getTokenFromHeaders(event.headers);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication token required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    console.log("Account deletion: Token verified for user ID", decoded.id);

    // Parse request body to get password confirmation
    let password;
    try {
      const parsedBody = JSON.parse(event.body);
      password = parsedBody.password;
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body', details: parseError.message }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    if (!password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Password confirmation required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) {
      console.error("User not found for deletion:", userError);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found', details: userError?.message }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    console.log("Account deletion: User found, verifying password");
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid password' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    console.log("Account deletion: Password verified, proceeding with deletion");
    
    // Delete user profile picture from storage
    try {
      const { data: files } = await supabase
        .storage
        .from('profile-pictures')
        .list(decoded.id);
  
      if (files && files.length > 0) {
        console.log(`Account deletion: Found ${files.length} profile picture files to delete`);
        const { error: storageError } = await supabase
          .storage
          .from('profile-pictures')
          .remove(files.map(file => `${decoded.id}/${file.name}`));
          
        if (storageError) {
          console.error("Error deleting profile pictures:", storageError);
        }
      }
    } catch (storageError) {
      console.error("Error handling profile pictures deletion:", storageError);
      // Continue with user deletion even if storage deletion fails
    }

    // Delete user from database
    console.log("Account deletion: Deleting user from database");
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', decoded.id);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to delete account', details: deleteError.message }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    console.log("Account deletion: Successfully completed");
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Account deleted successfully' }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Delete account error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        name: error.name,
        details: JSON.stringify(error)
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}
