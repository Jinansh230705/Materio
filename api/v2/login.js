const {
  supabase,
  comparePassword,
  generateToken,
  generateHandoffCode,
  storeHandoffCode,
  consumeHandoffCode,
  getTokenFromHeaders,
  verifyToken,
  addCorsHeaders
} = require('./_utils');
const cors = require('./cors');

/**
 * Auth/Login API Endpoint
 * 
 * Handles:
 * 1. Traditional Login (POST with username/password)
 * 2. Handoff Creation (POST with Authorization header)
 * 3. Handoff Exchange (POST with code)
 */
module.exports = async (req, res) => {
  // Add CORS headers to all responses
  addCorsHeaders(res, req.headers.origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return cors(req, res);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, code, action } = req.body || {};

    // 1. EXCHANGE HANDOFF (Case: has action 'exchange' OR has 'code' in body)
    if (action === 'exchange' || code) {
      const exchangeCode = code || req.body.handoffCode;

      if (!exchangeCode) {
        return res.status(400).json({ error: 'Handoff code is required' });
      }

      // Get request metadata
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress || '';

      // Consume the handoff code (validates and deletes it)
      const result = await consumeHandoffCode(exchangeCode, userAgent, ip);

      if (!result.valid) {
        return res.status(401).json({ error: result.error });
      }

      // Fetch user data to return with the token
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, display_name, email, has_admin_privileges, is_plus_user, profile_picture')
        .eq('id', result.userId)
        .single();

      if (userError || !user) {
        return res.status(200).json({
          message: 'Handoff successful',
          token: result.token
        });
      }

      return res.status(200).json({
        message: 'Handoff successful',
        token: result.token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
          hasAdminPrivileges: user.has_admin_privileges,
          isPlusUser: user.is_plus_user,
          profilePicture: user.profile_picture
        }
      });
    }

    // 2. CREATE HANDOFF (Case: has action 'create' OR has Authorization header without password)
    const tokenFromHeader = getTokenFromHeaders(req.headers);
    if (action === 'create' || (tokenFromHeader && !password)) {
      if (!tokenFromHeader) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = verifyToken(tokenFromHeader);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Generate a new handoff code
      const handoffCode = generateHandoffCode();

      // Get request metadata
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress || '';

      // Store the handoff code (expires in 60 seconds)
      const stored = await storeHandoffCode(handoffCode, tokenFromHeader, decoded.id, userAgent, ip);

      if (!stored) {
        return res.status(500).json({ error: 'Failed to create handoff code' });
      }

      return res.status(200).json({
        message: 'Handoff code created',
        handoffCode,
        expiresIn: 60
      });
    }

    // 3. TRADITIONAL LOGIN (Case: has username and password)
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare provided password with stored hash
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Generate a one-time handoff code for secure token exchange
    const handoffCode = generateHandoffCode();

    // Get request metadata
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress || '';

    // Store the handoff code (expires in 60 seconds)
    await storeHandoffCode(handoffCode, token, user.id, userAgent, ip);

    // Return success response with handoff code and user data
    return res.status(200).json({
      message: 'Login successful',
      handoffCode,  // One-time code to exchange for token
      token,        // Still return token for same-origin use
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        hasAdminPrivileges: user.has_admin_privileges,
        isPlusUser: user.is_plus_user,
        profilePicture: user.profile_picture
      }
    });

  } catch (error) {
    console.error('Auth handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
