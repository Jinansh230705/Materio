const fs = require('fs');
const path = require('path');

const DOWNLOADS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.materio-downloads');

module.exports = async (req, res) => {
    try {
        switch (req.method) {
            case 'GET':
                // Get list of downloaded files
                const metadataPath = path.join(DOWNLOADS_DIR, 'metadata.json');
                
                if (!fs.existsSync(metadataPath)) {
                    return res.json({ downloads: [] });
                }
                
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
                // Check which files still exist
                const validDownloads = metadata.filter(item => {
                    return fs.existsSync(item.filePath);
                });
                
                res.json({ downloads: validDownloads });
                break;
                
            case 'DELETE':
                // Delete a specific download
                const { filename } = req.body;
                
                if (!filename) {
                    return res.status(400).json({ error: 'Filename is required' });
                }
                
                const metadataFile = path.join(DOWNLOADS_DIR, 'metadata.json');
                let allMetadata = [];
                
                if (fs.existsSync(metadataFile)) {
                    allMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
                }
                
                const itemToDelete = allMetadata.find(item => item.filename === filename);
                
                if (itemToDelete) {
                    // Delete the actual file
                    if (fs.existsSync(itemToDelete.filePath)) {
                        fs.unlinkSync(itemToDelete.filePath);
                    }
                    
                    // Remove from metadata
                    const updatedMetadata = allMetadata.filter(item => item.filename !== filename);
                    fs.writeFileSync(metadataFile, JSON.stringify(updatedMetadata, null, 2));
                }
                
                res.json({ success: true, message: 'File deleted successfully' });
                break;
                
            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Download management error:', error);
        res.status(500).json({ error: 'Operation failed' });
    }
};
