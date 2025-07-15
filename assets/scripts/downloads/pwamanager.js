// PWA Download Manager with File System Access API
class PWADownloadManager {
    constructor() {
        this.directoryHandle = null;
        this.supportsFileSystemAccess = 'showDirectoryPicker' in window;
    }

    async initializeDirectory() {
        if (!this.supportsFileSystemAccess) {
            console.warn('File System Access API not supported');
            return false;
        }

        try {
            // Request directory access (user will choose directory)
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads'
            });
            
            // Store directory handle for future use
            localStorage.setItem('materio-download-dir', JSON.stringify(this.directoryHandle));
            return true;
        } catch (error) {
            console.error('Failed to get directory access:', error);
            return false;
        }
    }

    async downloadFile(url, filename, title) {
        if (!this.directoryHandle && !await this.initializeDirectory()) {
            throw new Error('No directory access');
        }

        try {
            // Fetch the file
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch file');
            
            const blob = await response.blob();
            
            // Create file in the chosen directory
            const fileHandle = await this.directoryHandle.getFileHandle(filename, {
                create: true
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            // Store metadata
            await this.saveMetadata({
                filename,
                title,
                downloadedAt: new Date().toISOString(),
                originalUrl: url
            });
            
            return { success: true, filename };
            
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    async saveMetadata(metadata) {
        try {
            const metadataHandle = await this.directoryHandle.getFileHandle('materio-metadata.json', {
                create: true
            });
            
            let existingData = [];
            try {
                const file = await metadataHandle.getFile();
                const text = await file.text();
                existingData = JSON.parse(text);
            } catch (e) {
                // File doesn't exist yet
            }
            
            existingData.push(metadata);
            
            const writable = await metadataHandle.createWritable();
            await writable.write(JSON.stringify(existingData, null, 2));
            await writable.close();
            
        } catch (error) {
            console.error('Failed to save metadata:', error);
        }
    }

    async getDownloads() {
        if (!this.directoryHandle) return [];
        
        try {
            const metadataHandle = await this.directoryHandle.getFileHandle('materio-metadata.json');
            const file = await metadataHandle.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch (error) {
            return [];
        }
    }
}

// Alternative: IndexedDB Storage for metadata
class IndexedDBDownloadManager {
    constructor() {
        this.dbName = 'MaterioDownloads';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('downloads')) {
                    const store = db.createObjectStore('downloads', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('filename', 'filename', { unique: true });
                    store.createIndex('downloadedAt', 'downloadedAt');
                }
            };
        });
    }

    async saveDownload(metadata, fileBlob) {
        const transaction = this.db.transaction(['downloads'], 'readwrite');
        const store = transaction.objectStore('downloads');
        
        const downloadData = {
            ...metadata,
            fileData: fileBlob,
            id: Date.now()
        };
        
        return store.add(downloadData);
    }

    async getDownloads() {
        const transaction = this.db.transaction(['downloads'], 'readonly');
        const store = transaction.objectStore('downloads');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
