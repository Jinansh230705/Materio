const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Get config from our config file
const supabaseConfig = require('../config/supabase');
const SUPABASE_URL = supabaseConfig.SUPABASE_URL;
const SUPABASE_ANON_KEY = supabaseConfig.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = supabaseConfig.SUPABASE_SERVICE_KEY;
const JWT_SECRET = supabaseConfig.JWT_SECRET;
const JWT_EXPIRES_IN = supabaseConfig.JWT_EXPIRES_IN;

// Initialize Supabase clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Hash password function
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password with hashed password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Generate unique recovery key
const generateRecoveryKey = () => {
  return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
};

// Extract token from request headers
const getTokenFromHeaders = (headers) => {
  const authHeader = headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// CORS headers for cross-origin requests
const corsHeaders = (origin) => {
  // Define allowed origins
  const allowedOrigins = [
    'http://localhost:8888',
    'https://materioa.netlify.app'
  ];
  
  // Set origin to the requesting origin if it's in allowedOrigins, otherwise use wildcard
  // CORS spec requires a single origin value, not a comma-separated list
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
};

// Handle CORS preflight requests
const handleCorsPreflightRequest = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(event.headers.origin),
      body: ''
    };
  }
  return null;
};

// Add CORS headers to function responses
const addCorsHeaders = (response, origin) => {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...corsHeaders(origin)
    }
  };
};

module.exports = {
  supabase,
  supabaseAdmin,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateRecoveryKey,
  getTokenFromHeaders,
  corsHeaders,
  handleCorsPreflightRequest,
  addCorsHeaders
};
