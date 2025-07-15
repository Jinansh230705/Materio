const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

// Load environment variables from root directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import chat functionality
const chatHandler = require('../api/v1/chat');

// Chat API routes
app.get('/api/v1/chat/models', async (req, res) => {
  try {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/api/v1/chat/models',
      headers: req.headers
    };
    const result = await chatHandler.handler(mockEvent, {});
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/chat', async (req, res) => {
  try {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/api/v1/chat',
      headers: req.headers,
      body: JSON.stringify(req.body)
    };
    const result = await chatHandler.handler(mockEvent, {});
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/chat/health', async (req, res) => {
  try {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/api/v1/chat/health',
      headers: req.headers
    };
    const result = await chatHandler.handler(mockEvent, {});
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save promotion data endpoint
app.post('/api/save-promo', (req, res) => {
  try {
    const promoData = req.body;
    const jsonContent = JSON.stringify(promoData, null, 2);
    
    // Define file paths
    const sourceFile = path.join(__dirname, 'assets', 'data', 'promo.json');
    const siteFile = path.join(__dirname, '_site', 'assets', 'data', 'promo.json');
    
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
    
    res.json({ 
      success: true, 
      message: 'Promotion data saved successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error saving promo files:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server only if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 8888;
  app.listen(PORT, () => {
    console.log(`Materio API server running on port ${PORT}`);
    console.log(`Promo save API: POST /api/save-promo`);
    console.log(`Chat API: POST /api/v1/chat`);
    console.log(`Chat Models: GET /api/v1/chat/models`);
    console.log(`Chat Health: GET /api/v1/chat/health`);
  });
}

module.exports = app;
