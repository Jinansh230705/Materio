// Download Management System
class DownloadManager {
    constructor() {
        this.downloads = [];
        this.currentPdfUrl = null;
        this.currentPdfTitle = null;
        this.init();
    }

    init() {
        console.log('DownloadManager: Initializing...');
        this.bindEvents();
        this.loadDownloads();
        console.log('DownloadManager: Initialized successfully');
    }

    bindEvents() {
        console.log('DownloadManager: Binding events...');
        // Download button in popup
        const downloadBtn = document.getElementById('downloadButton');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadCurrent());
            console.log('DownloadManager: Download button found and event bound');
        } else {
            console.warn('DownloadManager: Download button not found');
        }

        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-tab="downloads"]')) {
                console.log('DownloadManager: Downloads tab clicked');
                this.loadDownloads();
            }
        });

        // Hook into existing PDF loading system
        this.hookIntoExistingSystem();
    }

    hookIntoExistingSystem() {
        // Hook into existing PDF loading system
        // This monitors when PDFs are loaded in the popup
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const popup = document.getElementById('popup');
                    const popupContent = document.getElementById('popupContent');
                    
                    if (popup && popupContent && popup.style.display !== 'none') {
                        // Check if an iframe with PDF is loaded
                        const iframe = popupContent.querySelector('iframe');
                        if (iframe && iframe.src) {
                            // Extract title from page context or use filename
                            const title = document.title || 'Document';
                            this.setCurrentPdf(iframe.src, title);
                        }
                    }
                }
            });
        });

        // Observe popup content changes
        const popupContent = document.getElementById('popupContent');
        if (popupContent) {
            observer.observe(popupContent, {
                childList: true,
                subtree: true
            });
        }

        // Also listen for when popup is shown/hidden
        const popup = document.getElementById('popup');
        if (popup) {
            const popupObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        if (popup.style.display === 'none' || !popup.style.display) {
                            this.setCurrentPdf(null, null);
                        }
                    }
                });
            });
            
            popupObserver.observe(popup, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
    }

    setCurrentPdf(url, title) {
        this.currentPdfUrl = url;
        this.currentPdfTitle = title;
        
        // Update download button visibility
        const downloadBtn = document.getElementById('downloadButton');
        if (downloadBtn) {
            downloadBtn.style.display = url ? 'block' : 'none';
        }
    }

    async downloadCurrent() {
        if (!this.currentPdfUrl) {
            this.showNotification('No PDF to download', 'error');
            return;
        }

        const downloadBtn = document.getElementById('downloadButton');
        const originalIcon = downloadBtn.innerHTML;
        
        try {
            // Show loading state
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            downloadBtn.disabled = true;

            // Generate filename
            const filename = this.generateFilename(this.currentPdfTitle);
            
            // Store metadata locally for demo (will be replaced with server download later)
            const metadata = {
                filename,
                title: this.currentPdfTitle || 'Unknown Document',
                downloadedAt: new Date().toISOString(),
                originalUrl: this.currentPdfUrl,
                id: Date.now()
            };
            
            // Store in localStorage
            let downloads = localStorage.getItem('materio_downloads');
            downloads = downloads ? JSON.parse(downloads) : [];
            downloads.push(metadata);
            localStorage.setItem('materio_downloads', JSON.stringify(downloads));

            this.showNotification('File saved for offline reading!', 'success');
            this.loadDownloads(); // Refresh downloads list

        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Download failed: ' + error.message, 'error');
        } finally {
            // Restore button state
            downloadBtn.innerHTML = originalIcon;
            downloadBtn.disabled = false;
        }
    }

    async loadDownloads() {
        const loadingEl = document.getElementById('downloadsLoading');
        const emptyEl = document.getElementById('downloadsEmpty');
        const listEl = document.getElementById('downloadsList');

        if (!listEl) return;

        // Show loading
        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        listEl.innerHTML = '';

        try {
            // Load from localStorage
            const downloads = localStorage.getItem('materio_downloads');
            this.downloads = downloads ? JSON.parse(downloads) : [];

            if (loadingEl) loadingEl.style.display = 'none';

            if (this.downloads.length === 0) {
                if (emptyEl) emptyEl.style.display = 'block';
            } else {
                this.renderDownloads();
            }

        } catch (error) {
            console.error('Failed to load downloads:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'block';
        }
    }

    renderDownloads() {
        const listEl = document.getElementById('downloadsList');
        if (!listEl) return;

        listEl.innerHTML = this.downloads.map(download => `
            <div class="download-card" data-filename="${download.filename}">
                <div class="download-info">
                    <div class="download-title">${download.title}</div>
                    <div class="download-meta">
                        <span class="download-date">${this.formatDate(download.downloadedAt)}</span>
                        <span class="download-size">${this.getFileSize(download.filePath)}</span>
                    </div>
                </div>
                <div class="download-actions">
                    <button class="download-action-btn open-btn" onclick="downloadManager.openDownload('${download.filename}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="download-action-btn delete-btn" onclick="downloadManager.deleteDownload('${download.filename}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async openDownload(filename) {
        const download = this.downloads.find(d => d.filename === filename);
        if (!download) return;

        // Since we're in demo mode, just open the original URL
        const popup = document.getElementById('popup');
        const popupContent = document.getElementById('popupContent');
        
        if (popup && popupContent) {
            popupContent.innerHTML = `<iframe src="${download.originalUrl}" width="100%" height="100%"></iframe>`;
            popup.style.display = 'block';
            this.setCurrentPdf(download.originalUrl, download.title);
        }
    }

    async deleteDownload(filename) {
        if (!confirm('Are you sure you want to delete this download?')) {
            return;
        }

        try {
            // Remove from localStorage
            let downloads = localStorage.getItem('materio_downloads');
            downloads = downloads ? JSON.parse(downloads) : [];
            
            const updatedDownloads = downloads.filter(item => item.filename !== filename);
            localStorage.setItem('materio_downloads', JSON.stringify(updatedDownloads));

            this.showNotification('Download deleted successfully', 'success');
            this.loadDownloads();

        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Failed to delete download', 'error');
        }
    }

    generateFilename(title) {
        const sanitized = title ? title.replace(/[^a-z0-9]/gi, '_') : 'document';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        return `${sanitized}_${timestamp}.pdf`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    getFileSize(filePath) {
        // This would need to be implemented server-side and passed in metadata
        return 'Unknown size';
    }

    showNotification(message, type = 'info') {
        // Create or update notification
        let notification = document.getElementById('download-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'download-notification';
            notification.className = 'download-notification';
            document.body.appendChild(notification);
        }

        notification.className = `download-notification ${type}`;
        notification.textContent = message;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Initialize download manager
const downloadManager = new DownloadManager();

// CSS for download components (add to your stylesheet)
const downloadStyles = `
.download-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.download-info {
    flex-grow: 1;
}

.download-title {
    font-weight: 600;
    margin-bottom: 4px;
    color: #333;
}

.download-meta {
    font-size: 12px;
    color: #666;
}

.download-meta span {
    margin-right: 12px;
}

.download-actions {
    display: flex;
    gap: 8px;
}

.download-action-btn {
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.download-action-btn:hover {
    background: #f5f5f5;
}

.delete-btn:hover {
    color: #dc3545;
    border-color: #dc3545;
}

.open-btn:hover {
    color: #007bff;
    border-color: #007bff;
}

.loading-state, .empty-state {
    text-align: center;
    padding: 40px;
    color: #666;
}

.download-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 4px;
    z-index: 10000;
    font-weight: 500;
}

.download-notification.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.download-notification.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = downloadStyles;
document.head.appendChild(styleSheet);
