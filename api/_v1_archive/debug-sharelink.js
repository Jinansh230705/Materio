const { 
  supabase, 
  corsHeaders
} = require('./utils');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  console.log('Debug sharelink handler - Received request');
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }

  try {
    // Test table existence
    const { error: testError } = await supabase
      .from('sharelinks')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Error testing sharelinks table:', testError);
      return {
        statusCode: 500,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: 'Sharelinks table may not exist',
          details: testError.message,
          hint: 'Try running the migrations endpoint',
          tableExists: false
        })
      };
    }
    
    // For GET requests, return table status
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          message: 'Sharelinks table exists and is accessible',
          tableExists: true
        })
      };
    }
    
    // Create a test sharelink if needed
    if (event.httpMethod === 'POST') {
      try {
        const { inviteCode, customHeading } = JSON.parse(event.body);
        
        // Test creating a sharelink
        const { data: existingInvite, error: inviteError } = await supabase
          .from('invites')
          .select('id, code')
          .eq('code', inviteCode)
          .single();

        if (inviteError) {
          return {
            statusCode: 404,
            headers: corsHeaders(origin),
            body: JSON.stringify({
              error: 'Invite not found',
              details: inviteError.message
            })
          };
        }

        // Try multiple methods to create/update sharelink
        let sharelink = null;
        let createError = null;
        let successMethod = null;
        
        // Method 1: Standard Supabase API
        try {
          console.log('Trying standard method in debug endpoint');
          const result = await supabase
            .from('sharelinks')
            .upsert({
              invite_code: inviteCode,
              custom_heading: customHeading || null,
              created_by: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'invite_code'
            })
            .select()
            .single();
            
          sharelink = result.data;
          createError = result.error;
          
          if (!createError && sharelink) {
            successMethod = 'standard';
          }
        } catch (e) {
          console.log('Standard sharelink creation failed in debug endpoint:', e.message);
          createError = e;
        }
        
        // Method 2: Direct SQL via RPC
        if (!sharelink || createError) {
          try {
            console.log('Attempting direct SQL insertion in debug endpoint');
            const timestamp = new Date().toISOString();
            const sql = `
              INSERT INTO sharelinks (invite_code, custom_heading, created_by, updated_at) 
              VALUES ('${inviteCode}', ${customHeading ? `'${customHeading.replace(/'/g, "''")}'` : 'NULL'}, '00000000-0000-0000-0000-000000000000', '${timestamp}')
              ON CONFLICT (invite_code) 
              DO UPDATE SET 
                custom_heading = ${customHeading ? `'${customHeading.replace(/'/g, "''")}'` : 'NULL'}, 
                updated_at = '${timestamp}'
              RETURNING *;
            `;
            
            const { data, error } = await supabase.rpc('execute_sql', { sql_command: sql });
            
            if (error) {
              console.error('Direct SQL insertion failed in debug endpoint:', error);
              if (!createError) createError = error;
            } else {
              console.log('Direct SQL insertion succeeded in debug endpoint:', data);
              // Parse the returned data
              try {
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                if (parsedData && parsedData.length > 0) {
                  sharelink = parsedData[0];
                  createError = null;
                  successMethod = 'direct-sql';
                }
              } catch (parseError) {
                console.error('Error parsing SQL result in debug endpoint:', parseError);
                if (!createError) createError = parseError;
              }
            }
          } catch (sqlError) {
            console.error('Error executing direct SQL in debug endpoint:', sqlError);
            if (!createError) createError = sqlError;
          }
        }

        // Determine the base URL based on the environment
        const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
        const baseUrl = isLocalhost ? origin : 'https://materioa.netlify.app';

        // If we still couldn't create the sharelink, return an error but with URL fallback
        if (createError && !sharelink) {
          // Create URL anyway as fallback
          let url = `${baseUrl}/invites/${inviteCode}`;
          
          return {
            statusCode: 207, // Partial success
            headers: corsHeaders(origin),
            body: JSON.stringify({
              error: 'Failed to create sharelink in database',
              details: createError.message,
              fallback: true,
              sharelink: {
                inviteCode: inviteCode,
                customHeading: customHeading,
                url: url
              }
            })
          };
        }

        // Success case with sharelink
        return {
          statusCode: 200,
          headers: corsHeaders(origin),
          body: JSON.stringify({
            message: 'Debug sharelink created successfully',
            method: successMethod,
            sharelink: {
              inviteCode: sharelink.invite_code,
              customHeading: sharelink.custom_heading,
              url: `${baseUrl}/invites/${sharelink.invite_code}`,
              createdAt: sharelink.created_at,
              updatedAt: sharelink.updated_at
            }
          })
        };
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return {
          statusCode: 400,
          headers: corsHeaders(origin),
          body: JSON.stringify({
            error: 'Invalid request body',
            details: parseError.message
          })
        };
      }
    }

    // Default GET response - return a debug page
    const debugPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sharelink Debug Tool</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #4a5568;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        input, textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
        }
        button {
          background-color: #4299e1;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background-color: #3182ce;
        }
        .result {
          margin-top: 20px;
          padding: 15px;
          background-color: #f7fafc;
          border-radius: 4px;
          border-left: 4px solid #4299e1;
        }
        .error {
          color: #e53e3e;
          border-left-color: #e53e3e;
        }
      </style>
    </head>
    <body>
      <h1>Sharelink Debug Tool</h1>
      <div class="form-group">
        <label for="inviteCode">Invite Code</label>
        <input type="text" id="inviteCode" placeholder="Enter invite code">
      </div>
      <div class="form-group">
        <label for="customHeading">Custom Heading</label>
        <input type="text" id="customHeading" placeholder="Enter custom heading (optional)">
      </div>
      <div class="form-group">
        <label for="inviteUrl">Generated URL</label>
        <input type="text" id="inviteUrl" readonly placeholder="URL will appear here">
      </div>
      <button id="testBtn">Test Sharelink Creation</button>
      <div id="result" class="result" style="display:none;"></div>

      <script>
        document.getElementById('testBtn').addEventListener('click', async function() {
          const inviteCode = document.getElementById('inviteCode').value.trim();
          const customHeading = document.getElementById('customHeading').value.trim();
          const resultDiv = document.getElementById('result');
          const inviteUrlInput = document.getElementById('inviteUrl');
          
          if (!inviteCode) {
            resultDiv.textContent = 'Please enter an invite code';
            resultDiv.style.display = 'block';
            resultDiv.className = 'result error';
            return;
          }
          
          try {
            resultDiv.textContent = 'Testing...';
            resultDiv.style.display = 'block';
            resultDiv.className = 'result';
            
            const response = await fetch('/debug-sharelink', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                inviteCode,
                customHeading: customHeading || null
              })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.textContent = 'Success: ' + data.message;
              resultDiv.className = 'result';
              inviteUrlInput.value = data.sharelink.url;
            } else {
              resultDiv.textContent = 'Error: ' + (data.error || 'Unknown error');
              resultDiv.className = 'result error';
              if (data.details) {
                resultDiv.textContent += '\\n\\nDetails: ' + data.details;
              }
            }
          } catch (error) {
            resultDiv.textContent = 'Error: ' + error.message;
            resultDiv.className = 'result error';
          }
        });
      </script>
    </body>
    </html>
    `;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/html; charset=utf-8'
      },
      body: debugPage
    };
  } catch (error) {
    console.error('Debug sharelink error:', error);
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