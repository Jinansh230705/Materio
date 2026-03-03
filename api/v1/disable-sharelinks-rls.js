const { supabase, corsHeaders } = require('./utils');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }

  try {
    // Simple solution: Disable RLS for sharelinks table
    // Run SQL directly to bypass policy restrictions
    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_command: 'ALTER TABLE sharelinks DISABLE ROW LEVEL SECURITY;'
    });

    if (error) {
      console.error('Error disabling RLS:', error);
      return {
        statusCode: 500,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: 'Failed to disable RLS',
          details: error.message
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        message: 'Successfully disabled RLS for sharelinks table',
        details: 'The table now allows all operations without RLS restrictions'
      })
    };
  } catch (error) {
    console.error('Error disabling RLS:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        error: 'Failed to disable RLS',
        details: error.message
      })
    };
  }
};