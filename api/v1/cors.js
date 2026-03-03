// Handle CORS preflight requests for all functions
exports.handler = async (event) => {
  // Return CORS headers for OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    // Get the requesting origin
    const origin = event.headers.origin;
    
    // Determine if this origin should be allowed
    const allowedOrigins = [
      'http://localhost:8888',
      'https://materioa.netlify.app'
    ];
      // Set Origin to the requesting origin if it's allowed, otherwise use wildcard
    // CORS spec requires a single origin value, not a comma-separated list
    const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
    
    console.log(`CORS preflight request from origin: ${origin}, responding with: ${corsOrigin}`);
    
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin, // Single origin, not a list
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Not an OPTIONS request, return an error
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'This function only handles OPTIONS requests' })
  };
};
