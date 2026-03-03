const { 
  supabase, 
  hashPassword, 
  generateToken, 
  generateRecoveryKey 
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
    const { username, displayName, email, password, profilePicture, inviteCode } = JSON.parse(event.body);

    // Validate inputs
    if (!username || !displayName || !email || !password || !inviteCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields including invite code' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }    // STEP 1: Validate invite exists and is not expired (simple check)
    // Use case-insensitive comparison to handle URL normalization
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, redeemed, expires_at, contains_plus_perks')
      .ilike('code', inviteCode)
      .single();

    if (inviteError || !invite) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid invite code' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    if (invite.redeemed) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invite code has already been used' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invite code has expired' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // STEP 2: Check if user already exists
    const { data: existingUserByEmail } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUserByEmail) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Email already exists' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const { data: existingUserByUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUserByUsername) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Username already taken' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // STEP 3: Create user first
    const recoveryKey = generateRecoveryKey();
    const hashedPassword = await hashPassword(password);
    
    // Set plus user status based on invite type
    const isPlusUser = invite.contains_plus_perks || false;
    
    const userData = {
      username,
      display_name: displayName,
      email,
      password: hashedPassword,
      recovery_key: recoveryKey,
      has_admin_privileges: false,
      is_plus_user: isPlusUser,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (userError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create user', details: userError }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // STEP 4: Redeem invite using database function (this handles race conditions and RLS)
    const { data: redeemResult, error: redeemError } = await supabase
      .rpc('redeem_invite_code', {
        invite_code: inviteCode,
        user_id: newUser.id
      });

    if (redeemError || !redeemResult?.success) {
      // If invite redemption fails, we need to clean up the user
      await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id);
        
      const errorMessage = redeemResult?.error || redeemError?.message || 'Failed to redeem invite code';
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errorMessage }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // STEP 5: Handle profile picture upload if provided
    let profilePicUrl = null;
    if (profilePicture && profilePicture.startsWith('data:image')) {
      try {
        const base64Data = profilePicture.split(',')[1];
        const fileExt = profilePicture.split(';')[0].split('/')[1];
        const fileName = `${newUser.id}/profile.${fileExt}`;
        
        const bufferData = Buffer.from(base64Data, 'base64');
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('profile-pictures')
          .upload(fileName, bufferData, {
            contentType: `image/${fileExt}`,
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('profile-pictures')
            .getPublicUrl(fileName);

          profilePicUrl = publicUrl;

          await supabase
            .from('users')
            .update({ profile_picture: profilePicUrl })
            .eq('id', newUser.id);
        }
      } catch (error) {
        console.error('Profile picture upload error:', error);
      }
    }

    // STEP 6: Generate JWT token
    const token = generateToken({ 
      id: newUser.id, 
      email: newUser.email, 
      username: newUser.username 
    });

    // STEP 7: Return success
    const successMessage = isPlusUser 
      ? 'User created successfully with Plus benefits!' 
      : 'User created successfully';
      
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: successMessage,
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.display_name,
          email: newUser.email,
          hasAdminPrivileges: newUser.has_admin_privileges,
          isPlusUser: newUser.is_plus_user,
          profilePicture: profilePicUrl,
          recoveryKey,
          grantedPlusFromInvite: isPlusUser && invite.contains_plus_perks
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('Signup error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
