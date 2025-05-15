// CORS middleware for Netlify Functions
// This adds the necessary CORS headers to allow requests from localhost and other allowed domains

/**
 * Add CORS headers to the response
 * @param {Object} event - Netlify event object
 * @returns {Object} - Response headers object
 */
function getHeaders(event) {
  // Get the request origin
  const origin = event.headers.origin || '';
  
  // List of allowed origins - add your production domains here as well
  const allowedOrigins = [
    'http://localhost:8888',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://materioa.netlify.app',
    'https://materio.netlify.app'
  ];
  
  // Set default headers
  let headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Max-Age': '86400'  // 24 hours
  };
  
  // Check if the origin is in the allowed list
  if (allowedOrigins.includes(origin)) {
    // Set the specific origin
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (origin && origin.endsWith('.netlify.app')) {
    // Allow all netlify.app subdomains for preview deploys
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // For non-matching origins, set a default (can be restrictive or permissive based on your needs)
    headers['Access-Control-Allow-Origin'] = 'https://materioa.netlify.app';
  }
  
  return headers;
}

/**
 * Handle preflight OPTIONS requests
 * @param {Object} event - Netlify event object
 * @returns {Object} - Response for preflight request
 */
function handleOptions(event) {
  return {
    statusCode: 204, // No content
    headers: getHeaders(event),
    body: ''
  };
}

module.exports = {
  getHeaders,
  handleOptions
};
