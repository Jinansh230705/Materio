const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const promoData = JSON.parse(event.body);
    const jsonContent = JSON.stringify(promoData, null, 2);
    
    // Define file paths relative to the Netlify build
    const sourceFile = path.join(process.cwd(), 'assets', 'data', 'promo.json');
    const siteFile = path.join(process.cwd(), '_site', 'assets', 'data', 'promo.json');
    
    console.log('Saving promo data to:', sourceFile);
    console.log('Saving promo data to:', siteFile);
    
    // Ensure directories exist
    const sourceDir = path.dirname(sourceFile);
    const siteDir = path.dirname(siteFile);
    
    if (!fs.existsSync(sourceDir)) {
      fs.mkdirSync(sourceDir, { recursive: true });
    }
    
    if (!fs.existsSync(siteDir)) {
      fs.mkdirSync(siteDir, { recursive: true });
    }
    
    // Write to both files
    fs.writeFileSync(sourceFile, jsonContent);
    fs.writeFileSync(siteFile, jsonContent);
    
    console.log('✅ Successfully saved promo.json files');
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Promotion data saved successfully',
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ Error saving promo files:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};
