const { 
  supabase, 
  corsHeaders
} = require('./utils');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  console.log('Sharelink info handler - Received request', event.queryStringParameters);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }

  try {
    // Get invite code from query params
    const code = event.queryStringParameters?.code;
    
    if (!code) {
      console.log('No invite code provided');
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: 'Invite code is required'
        })
      };
    }
    
    console.log('Looking up sharelink info for code:', code);
    
    // Try to get sharelink info
    let sharelinkInfo = null;
    let error = null;
    
    // Method 1: Standard Supabase query
    try {
      const { data, error: queryError } = await supabase
        .from('sharelinks')
        .select('invite_code, custom_heading')
        .eq('invite_code', code)
        .single();
      
      console.log('Supabase query result:', { data, error: queryError });
      
      if (data) {
        sharelinkInfo = data;
      } else {
        error = queryError;
      }
    } catch (e) {
      console.error('Error querying sharelink:', e);
      error = e;
    }
    
    // Method 2: Direct SQL via RPC if standard query fails
    if (!sharelinkInfo && error) {
      try {
        console.log('Trying direct SQL via RPC');
        const sql = `
          SELECT invite_code, custom_heading 
          FROM sharelinks 
          WHERE invite_code = '${code}'
          LIMIT 1;
        `;
        
        const { data, error: sqlError } = await supabase.rpc('execute_sql', { sql_command: sql });
        
        console.log('Direct SQL result:', { data, error: sqlError });
        
        if (sqlError) {
          console.error('Direct SQL query failed:', sqlError);
        } else if (data) {
          // Parse the result
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          console.log('Parsed SQL data:', parsedData);
          
          if (parsedData && parsedData.length > 0) {
            sharelinkInfo = parsedData[0];
            error = null;
          }
        }
      } catch (sqlError) {
        console.error('Error executing direct SQL:', sqlError);
      }
    }
    
    if (sharelinkInfo) {
      console.log('Returning sharelink info:', sharelinkInfo);
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          inviteCode: sharelinkInfo.invite_code,
          customHeading: sharelinkInfo.custom_heading
        })
      };
    } else {
      console.log('No sharelink found for code:', code);
      return {
        statusCode: 404,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: 'Sharelink not found',
          details: error ? error.message : 'No sharelink found for the provided code'
        })
      };
    }
  } catch (error) {
    console.error('Sharelink info error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};