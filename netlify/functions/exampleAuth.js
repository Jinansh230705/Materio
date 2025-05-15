// Example authentication function with CORS headers
const { getHeaders, handleOptions } = require('./corsHeaders');

exports.handler = async (event, context) => {
  // Handle OPTIONS requests (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }
  
  try {
    // Process the request based on the HTTP method
    if (event.httpMethod === 'POST') {
      // Parse the request body
      const data = JSON.parse(event.body);
      
      // Your authentication logic here
      // This is just an example response
      const response = {
        token: "example.jwt.token",
        user: {
          id: "user-uuid",
          username: data.username || "username123",
          displayName: data.displayName || "User Name",
          email: data.email || "user@example.com",
          profilePicture: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      
      // Return successful response with CORS headers
      return {
        statusCode: 200,
        headers: getHeaders(event),
        body: JSON.stringify(response)
      };
    }
    
    // Method not allowed
    return {
      statusCode: 405,
      headers: getHeaders(event),
      body: JSON.stringify({ error: "Method not allowed" })
    };
  } catch (error) {
    // Return error response with CORS headers
    return {
      statusCode: 500,
      headers: getHeaders(event),
      body: JSON.stringify({ error: error.message })
    };
  }
};
