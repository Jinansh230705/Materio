const {
  supabase,
  hashPassword,
  comparePassword,
  verifyToken,
  getTokenFromHeaders,
  generateRecoveryKey,
  addCorsHeaders,
  consumeHandoffCode
} = require('./_utils');
const cors = require('./cors');

module.exports = async (req, res) => {
  // Add CORS headers to all responses
  addCorsHeaders(res, req.headers.origin);

  // Enable CORS Preflight
  if (req.method === 'OPTIONS') {
    return cors(req, res);
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGetProfile(req, res);
    case 'PUT':
      return handleUpdateProfile(req, res);
    case 'DELETE':
      return handleDeleteAccount(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Get user profile
async function handleGetProfile(req, res) {
  try {
    // Get token from headers
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.id;

    // Get user data from database
    // Note: is_plus_user = Pro tier (₹299 lifetime) - old Plus rebranded
    //       is_lite_user = Plus tier (₹59/3mo subscription) - new tier
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, display_name, email, profile_picture, created_at, updated_at, recovery_key, has_admin_privileges, is_plus_user, is_lite_user, lite_expiry')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user profile
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        profilePicture: user.profile_picture,
        recoveryKey: user.recovery_key,
        hasAdminPrivileges: user.has_admin_privileges,
        isPlusUser: user.is_plus_user,      // Pro tier (₹299 lifetime)
        isLiteUser: user.is_lite_user,      // Plus tier (₹59/3mo)
        plusExpiry: user.lite_expiry,      // Expiry for Plus subscription
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Update user profile
async function handleUpdateProfile(req, res) {
  try {
    // Get token from headers
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Parse request body
    const {
      username,
      displayName,
      currentPassword,
      newPassword,
      generateNewRecoveryKey,
      profilePicture
    } = req.body;

    // Get current user data for validation
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
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
        return res.status(400).json({ error: 'Username already taken' });
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
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      updateData.password = await hashPassword(newPassword);
    }

    // Generate new recovery key if requested
    if (generateNewRecoveryKey) {
      // Verify current password is provided
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to generate new recovery key' });
      }

      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
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
        return res.status(500).json({ error: 'Failed to update profile', details: updateError });
      }
    }    // Return updated profile data
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select('id, username, display_name, email, profile_picture, created_at, updated_at, recovery_key, has_admin_privileges, is_plus_user, is_lite_user, lite_expiry')
      .eq('id', decoded.id)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch updated profile', details: fetchError });
    } return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.display_name,
        email: updatedUser.email,
        profilePicture: updatedUser.profile_picture,
        recoveryKey: updatedUser.recovery_key,
        hasAdminPrivileges: updatedUser.has_admin_privileges,
        isPlusUser: updatedUser.is_plus_user,    // Pro tier (₹299 lifetime)
        isLiteUser: updatedUser.is_lite_user,   // Plus tier (₹59/3mo)
        plusExpiry: updatedUser.lite_expiry,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      },
      recoveryKey: recoveryKey // Also include it separately for backward compatibility
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Delete user account

// Delete user account
async function handleDeleteAccount(req, res) {
  try {
    console.log("Starting account deletion process");

    // Get token from headers
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log("Account deletion: Token verified for user ID", decoded.id);

    // Parse request body to get password confirmation
    let password;
    try {
      const parsedBody = req.body;
      password = parsedBody.password;
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return res.status(400).json({ error: 'Invalid request body', details: parseError.message });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) {
      console.error("User not found for deletion:", userError);
      return res.status(404).json({ error: 'User not found', details: userError?.message });
    }

    console.log("Account deletion: User found, verifying password");

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
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
      return res.status(500).json({ error: 'Failed to delete account', details: deleteError.message });
    }

    console.log("Account deletion: Successfully completed");

    // Return success response
    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    console.error('Error stack:', error.stack);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      name: error.name,
      details: JSON.stringify(error)
    });
  }
}
