const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Create hidden downloads directory
const DOWNLOADS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.materio-downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    // Hide the directory on Windows
    if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`attrib +h "${DOWNLOADS_DIR}"`);
    }
}

async function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(DOWNLOADS_DIR, filename);
        const file = fs.createWriteStream(filePath);
        
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve(filePath);
            });
            
            file.on('error', (err) => {
                fs.unlink(filePath, () => {}); // Delete incomplete file
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url, filename, title } = req.body;
        
        if (!url || !filename) {
            return res.status(400).json({ error: 'URL and filename are required' });
        }

        // Download the file
        const filePath = await downloadFile(url, filename);
        
        // Store metadata
        const metadata = {
            filename,
            title: title || filename,
            downloadedAt: new Date().toISOString(),
            originalUrl: url,
            filePath
        };
        
        const metadataPath = path.join(DOWNLOADS_DIR, 'metadata.json');
        let allMetadata = [];
        
        if (fs.existsSync(metadataPath)) {
            allMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }
        
        allMetadata.push(metadata);
        fs.writeFileSync(metadataPath, JSON.stringify(allMetadata, null, 2));
        
        res.json({ 
            success: true, 
            message: 'File downloaded successfully',
            filePath,
            metadata
        });
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
};
