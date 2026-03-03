// Supabase configuration
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || "https://svfuynziufsxccwihfbw.supabase.co";
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2ZnV5bnppdWZzeGNjd2loZmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDIyMjcsImV4cCI6MjA2MjYxODIyN30.yRyMD0oXhEks91yaJTemgSVHwPMw5oEg86P6EW9CODI";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2ZnV5bnppdWZzeGNjd2loZmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA0MjIyNywiZXhwIjoyMDYyNjE4MjI3fQ.oGHaEZn7rkAIvEWayNL7E3t7klfOgJnN0iSgKqVCOY4";

// JWT configuration for tokens
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here-change-in-production";
const JWT_EXPIRES_IN = "7d"; // Token expiration time

// Other configuration
const SITE_URL = process.env.SITE_URL || "https://auth-materioa.netlify.app";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://materioa.netlify.app";

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  SITE_URL,
  FRONTEND_URL
};