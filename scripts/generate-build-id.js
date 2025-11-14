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

// Maintain build history in JSON format
const historyPath = path.join(dataDir, 'build_history.json');
let buildHistory = [];

// Load existing history if file exists
if (fs.existsSync(historyPath)) {
    try {
        const existingHistory = fs.readFileSync(historyPath, 'utf8');
        buildHistory = JSON.parse(existingHistory);
    } catch (error) {
        console.log('Warning: Could not parse existing build history, starting fresh');
        buildHistory = [];
    }
}

// Add new build entry
const buildEntry = {
    build_id: buildId,
    timestamp: timestamp,
    date: new Date(timestamp).toLocaleDateString(),
    time: new Date(timestamp).toLocaleTimeString(),
    build_number: buildHistory.length + 1
};

buildHistory.unshift(buildEntry); // Add to beginning of array (most recent first)

// Keep only last 100 builds to prevent file from growing too large
if (buildHistory.length > 100) {
    buildHistory = buildHistory.slice(0, 100);
}

// Write updated history
fs.writeFileSync(historyPath, JSON.stringify(buildHistory, null, 2), 'utf8');

console.log('Build ID file updated successfully!');
console.log(`Written to: ${outputPath}`);
console.log(`Build history updated: ${historyPath} (${buildHistory.length} builds recorded)`);
