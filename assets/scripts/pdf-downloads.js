// PDF Downloads Manager - Persistent offline storage using IndexedDB
// Similar to YouTube's offline download feature

class PDFDownloadManager {
    constructor() {
        this.dbName = 'MaterioOfflineDB';
        this.dbVersion = 1;
        this.storeName = 'downloadedPDFs';
        this.db = null;
        this.maxStorageSize = 500 * 1024 * 1024; // 500MB limit
        this.initPromise = this.initDB();
    }

    // Initialize IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'url' });
                    objectStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
                    objectStore.createIndex('semester', 'semester', { unique: false });
                    objectStore.createIndex('subject', 'subject', { unique: false });
                    console.log('Created IndexedDB object store:', this.storeName);
                }
            };
        });
    }

    // Download PDF and store in IndexedDB
    async downloadPDF(pdfUrl, metadata = {}) {
        try {
            await this.initPromise;

            // Check if already downloaded
            const existing = await this.getPDF(pdfUrl);
            if (existing) {
                console.log('PDF already downloaded:', pdfUrl);
                return { success: true, message: 'Already downloaded', existing: true };
            }

            // Check storage quota
            const currentSize = await this.getTotalStorageSize();
            
            // Fetch the PDF
            const response = await fetch(pdfUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            }

            const blob = await response.blob();
            const fileSize = blob.size;

            // Check if adding this file exceeds quota
            if (currentSize + fileSize > this.maxStorageSize) {
                throw new Error('Storage quota exceeded. Please delete some downloads.');
            }

            // Convert blob to arrayBuffer for storage
            const arrayBuffer = await blob.arrayBuffer();

            // Extract metadata from URL if not provided
            const urlParts = pdfUrl.split('/');
            const filename = urlParts[urlParts.length - 1] || 'unknown.pdf';
            const subject = metadata.subject || urlParts[urlParts.length - 2] || 'Unknown Subject';
            const semester = metadata.semester || urlParts[urlParts.length - 3] || 'Unknown Semester';

            // Create download entry
            const downloadEntry = {
                url: pdfUrl,
                title: metadata.title || filename.replace('.pdf', ''),
                subject: subject,
                semester: semester,
                fileSize: fileSize,
                mimeType: blob.type || 'application/pdf',
                data: arrayBuffer,
                downloadedAt: Date.now(),
                lastAccessedAt: Date.now()
            };

            // Store in IndexedDB
            await this.savePDF(downloadEntry);

            console.log('PDF downloaded successfully:', filename, `(${this.formatBytes(fileSize)})`);
            return { 
                success: true, 
                message: 'Download complete', 
                fileSize: fileSize,
                existing: false 
            };

        } catch (error) {
            console.error('Error downloading PDF:', error);
            throw error;
        }
    }

    // Save PDF to IndexedDB
    async savePDF(pdfData) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.put(pdfData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get PDF from IndexedDB
    async getPDF(url) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(url);

            request.onsuccess = () => {
                if (request.result) {
                    // Update last accessed time
                    this.updateLastAccessed(url);
                }
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Update last accessed time
    async updateLastAccessed(url) {
        try {
            await this.initPromise;
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(url);

            request.onsuccess = () => {
                const data = request.result;
                if (data) {
                    data.lastAccessedAt = Date.now();
                    objectStore.put(data);
                }
            };
        } catch (error) {
            console.error('Error updating last accessed time:', error);
        }
    }

    // Get all downloaded PDFs
    async getAllDownloads() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Delete PDF from IndexedDB
    async deletePDF(url) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(url);

            request.onsuccess = () => {
                console.log('PDF deleted from downloads:', url);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Check if PDF is downloaded
    async isDownloaded(url) {
        const pdf = await this.getPDF(url);
        return pdf !== undefined;
    }

    // Get total storage size
    async getTotalStorageSize() {
        const downloads = await this.getAllDownloads();
        return downloads.reduce((total, item) => total + (item.fileSize || 0), 0);
    }

    // Get storage info
    async getStorageInfo() {
        const downloads = await this.getAllDownloads();
        const totalSize = downloads.reduce((total, item) => total + (item.fileSize || 0), 0);
        
        return {
            totalFiles: downloads.length,
            totalSize: totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            maxSize: this.maxStorageSize,
            maxSizeFormatted: this.formatBytes(this.maxStorageSize),
            percentUsed: (totalSize / this.maxStorageSize * 100).toFixed(1),
            availableSpace: this.maxStorageSize - totalSize,
            availableSpaceFormatted: this.formatBytes(this.maxStorageSize - totalSize)
        };
    }

    // Load PDF from IndexedDB as blob URL
    async loadPDFAsBlob(url) {
        const pdfData = await this.getPDF(url);
        if (!pdfData) {
            return null;
        }

        const blob = new Blob([pdfData.data], { type: pdfData.mimeType || 'application/pdf' });
        return URL.createObjectURL(blob);
    }

    // Get PDF data as ArrayBuffer (for direct feeding to PDF.js)
    async getPDFData(url) {
        const pdfData = await this.getPDF(url);
        if (!pdfData) {
            return null;
        }
        return pdfData.data;
    }

    // Format bytes to human-readable format
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Clear all downloads
    async clearAllDownloads() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('All downloads cleared');
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Delete old downloads to free space (LRU - Least Recently Used)
    async deleteOldestDownloads(count = 1) {
        const downloads = await this.getAllDownloads();
        
        // Sort by last accessed time (oldest first)
        downloads.sort((a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0));
        
        const toDelete = downloads.slice(0, count);
        
        for (const pdf of toDelete) {
            await this.deletePDF(pdf.url);
        }
        
        return toDelete.length;
    }
}

// Create global instance
window.pdfDownloadManager = new PDFDownloadManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFDownloadManager;
}
