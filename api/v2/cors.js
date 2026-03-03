// Handle CORS preflight requests for all functions
module.exports = async (req, res) => {
  // Return CORS headers for OPTIONS requests
  if (req.method === 'OPTIONS') {
    // Get the requesting origin
    const origin = req.headers.origin;

    // Determine if this origin should be allowed
    const allowedOrigins = [
      'http://localhost:8888',
      'https://materioa.netlify.app',
      'https://materioa.vercel.app',
      'https://materioapp.in',
      'http://localhost:5173',
      'http://localhost:1000/',
      'https://insightroom.vercel.app'
    ];
    // Set Origin to the requesting origin if it's allowed, otherwise use wildcard
    // CORS spec requires a single origin value, not a comma-separated list
    let corsOrigin = '*';
    if (origin) {
      if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        corsOrigin = origin;
      }
    }

    console.log(`CORS preflight request from origin: ${origin}, responding with: ${corsOrigin}`);

    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    res.status(204).send('');
    return;
  }

  // Not an OPTIONS request, return an error
  return res.status(405).json({ error: 'This function only handles OPTIONS requests' });
};
