const { 
  supabaseAdmin, 
  corsHeaders
} = require('./utils');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  console.log('Running migrations handler');
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }
  
  try {
    // Read and execute the migrations
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir);
    
    const results = [];
    
    // Find the sharelinks migration specifically
    const sharelinksFile = files.find(file => file.includes('sharelinks'));
    const rpcFunctionsFile = files.find(file => file.includes('rpc_functions'));
    
    // First run the RPC functions migration if it exists
    if (rpcFunctionsFile) {
      console.log('Found RPC functions migration file:', rpcFunctionsFile);
      const migration = fs.readFileSync(path.join(migrationsDir, rpcFunctionsFile), 'utf8');
      
      // Execute the SQL
      const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: migration });
      
      results.push({
        file: rpcFunctionsFile,
        success: !error,
        error: error ? error.message : null
      });
      
      console.log('RPC functions migration result:', results[results.length - 1]);
    }
    
    // Then run the sharelinks migration if it exists
    if (sharelinksFile) {
      console.log('Found sharelinks migration file:', sharelinksFile);
      const migration = fs.readFileSync(path.join(migrationsDir, sharelinksFile), 'utf8');
      
      // Execute the SQL
      const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: migration });
      
      results.push({
        file: sharelinksFile,
        success: !error,
        error: error ? error.message : null
      });
      
      console.log('Sharelinks migration result:', results[results.length - 1]);
    } else {
      console.log('Sharelinks migration file not found');
      results.push({
        file: 'sharelinks_migration',
        success: false,
        error: 'Migration file not found'
      });
    }
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Migrations attempted',
        results
      })
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to run migrations', details: error.message })
    };
  }
};