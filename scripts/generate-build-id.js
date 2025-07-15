#!/usr/bin/env node
// filepath: d:\v4\materio\scripts\generate-build-id.js
// Cross-platform build ID generator for Netlify builds

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate unique build ID
const buildId = crypto.randomUUID();
const timestamp = new Date().toISOString();

console.log(`Generating build ID: ${buildId}`);
console.log(`Timestamp: ${timestamp}`);

// Ensure _data directory exists
const dataDir = path.join(process.cwd(), '_data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create the build ID YAML content
const yamlContent = `# Build ID generated during Netlify build
# This file is automatically updated during deployment
build_id: "${buildId}"
build_timestamp: "${timestamp}"
`;

// Write to Jekyll data file
const outputPath = path.join(dataDir, 'build_id.yml');
fs.writeFileSync(outputPath, yamlContent, 'utf8');

console.log('Build ID file updated successfully!');
console.log(`Written to: ${outputPath}`);
