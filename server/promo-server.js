const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

// Load environment variables from root directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import API handlers
const chatHandler = require('../api/v2/chat');
const featuresHandler = require('../api/v2/features');
const invitesHandler = require('../api/v2/invites');
const healthHandler = require('../api/v2/health');

// Chat API routes
app.get('/api/v2/chat/models', async (req, res) => {
  try {
    await chatHandler(req, res);
  } catch (error) {
    // Only send error if response hasn't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.post('/api/v2/chat', async (req, res) => {
  try {
    await chatHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.get('/api/v2/chat/health', async (req, res) => {
  try {
    await chatHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Invites API routes
app.all('/api/v2/invites*', async (req, res) => {
  try {
    await invitesHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Features API routes (including sharelink)
app.all('/api/v2/features', async (req, res) => {
  try {
    await featuresHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// LLM Share URL rewrite (mirrors vercel.json rewrite)
app.get('/share/llm/:id', async (req, res) => {
  try {
    req.query = req.query || {};
    req.query.action = 'pdf-share';
    req.query.subAction = 'resolve-llm';
    req.query.llmMaskId = req.params.id;
    // Rewrite the URL so the handler can parse it
    req.url = `/api/v2/features?action=pdf-share&subAction=resolve-llm&llmMaskId=${req.params.id}`;
    await featuresHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Health API routes (health check, bug reports, alerts)
app.all('/api/v2/health*', async (req, res) => {
  try {
    await healthHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
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
    console.log(`Chat API: POST /api/v2/chat`);
    console.log(`Chat Models: GET /api/v2/chat/models`);
    console.log(`Chat Health: GET /api/v2/chat/health`);
    console.log(`Invites API: ALL /api/v2/invites*`);
    console.log(`Features API: ALL /api/v2/features`);
    console.log(`Health API: GET /api/v2/health`);
    console.log(`Health Report: POST /api/v2/health/report`);
    console.log(`Health Alert: POST /api/v2/health/alert`);
  });
}

module.exports = app;
