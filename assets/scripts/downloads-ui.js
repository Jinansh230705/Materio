// Downloads Management UI
// Handles displaying and managing downloaded PDFs

document.addEventListener('DOMContentLoaded', function () {
    const downloadsList = document.getElementById('downloadsList');
    const downloadsLoading = document.getElementById('downloadsLoading');
    const downloadsEmpty = document.getElementById('downloadsEmpty');
    const storageStats = document.getElementById('storageStats');
    const storageBar = document.getElementById('storageBar');
    const clearAllBtn = document.getElementById('clearAllDownloadsBtn');

    // Load downloads when the downloads tab is opened
    const downloadsTab = document.querySelector('[data-tab="downloads"]');
    if (downloadsTab) {
        downloadsTab.addEventListener('click', function () {
            loadDownloads();
        });
    }

    // Also listen for custom event from profile dropdown
    document.addEventListener('downloadsTabOpened', function () {
        loadDownloads();
    });

    // Clear all downloads button
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async function () {
            if (!confirm('Are you sure you want to delete all downloaded PDFs? This action cannot be undone.')) {
                return;
            }

            try {
                await window.pdfDownloadManager.clearAllDownloads();
                loadDownloads();
                showNotification('All downloads cleared', 'success');
            } catch (error) {
                console.error('Error clearing downloads:', error);
                showNotification('Failed to clear downloads', 'error');
            }
        });
    }

    // Load and display downloads
    async function loadDownloads() {

        if (!downloadsList) {
            console.error('[Downloads UI] downloadsList element not found');
            return;
        }

        const tableWrapper = document.getElementById('downloadsTableWrapper');

        // Show loading state
        if (downloadsLoading) downloadsLoading.style.display = 'block';
        if (downloadsEmpty) downloadsEmpty.style.display = 'none';
        if (tableWrapper) tableWrapper.style.display = 'none';
        downloadsList.innerHTML = '';

        try {
            // Check if pdfDownloadManager is available
            if (!window.pdfDownloadManager) {
                console.error('[Downloads UI] pdfDownloadManager not available');
                if (downloadsLoading) downloadsLoading.style.display = 'none';
                if (downloadsEmpty) {
                    downloadsEmpty.style.display = 'block';
                    downloadsEmpty.innerHTML = `
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ffc107; margin-bottom: 16px;"></i>
                        <p style="font-size: 18px; font-weight: 600; margin: 10px 0;">Download system not available</p>
                        <p style="color: #666; font-size: 14px;">Please refresh the page</p>
                    `;
                }
                return;
            }

            // Wait for IndexedDB to initialize
            await window.pdfDownloadManager.initPromise;

            // Get all downloads
            const downloads = await window.pdfDownloadManager.getAllDownloads();

            // Sort by download date (newest first)
            downloads.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));

            // Update storage info
            updateStorageInfo();

            // Hide loading
            if (downloadsLoading) downloadsLoading.style.display = 'none';

            // Show empty state if no downloads
            if (downloads.length === 0) {
                if (downloadsEmpty) downloadsEmpty.style.display = 'block';
                return;
            }

            // Show table wrapper
            if (tableWrapper) tableWrapper.style.display = 'block';

            // Display downloads
            downloads.forEach(download => {
                const downloadRow = createDownloadCard(download);
                downloadsList.appendChild(downloadRow);
            });

        } catch (error) {
            console.error('Error loading downloads:', error);
            if (downloadsLoading) downloadsLoading.style.display = 'none';
            downloadsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>Failed to load downloads</p>
                    <p style="font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    }

    // Create download card element
    function createDownloadCard(download) {
        const row = document.createElement('div');
        row.className = 'download-row';

        // Generate a unique ID based on the URL
        const rowId = 'download-row-' + btoa(download.url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
        row.id = rowId;

        row.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 150px 120px 100px 100px;
            gap: 15px;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
            transition: all 0.2s ease;
        `;

        // Format file size
        const fileSize = window.pdfDownloadManager.formatBytes(download.fileSize);

        row.innerHTML = `
            <div class="download-name" style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <i class="fas fa-file-pdf" style="margin-right: 8px; color: #ff8200;"></i>
                ${escapeHtml(download.title)}
            </div>
            <div class="download-subject" style="color: #666; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(download.subject)}
            </div>
            <div class="download-semester" style="color: #666; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(download.semester)}
            </div>
            <div class="download-size" style="color: #666; font-size: 14px; white-space: nowrap;">
                ${fileSize}
            </div>
            <div class="download-actions" style="display: flex; gap: 8px; justify-content: center;">
                <button class="open-download-btn" data-url="${escapeHtml(download.url)}" 
                    style="background: none; border: none; color: #ff8200; cursor: pointer; padding: 6px; font-size: 16px; transition: all 0.2s;"
                    title="Open PDF">
                    <i class="fa-regular fa-book-open-lines"></i>
                </button>
                <button class="delete-download-btn" data-url="${escapeHtml(download.url)}" 
                    style="background: none; border: none; color: #dc3545; cursor: pointer; padding: 6px; font-size: 16px; transition: all 0.2s;"
                    title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add event listeners
        const openBtn = row.querySelector('.open-download-btn');
        const deleteBtn = row.querySelector('.delete-download-btn');

        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDownload(download.url);
        });

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${download.title}"?`)) {
                try {
                    await window.pdfDownloadManager.deletePDF(download.url);
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        row.remove();
                        loadDownloads(); // Reload to update counts
                    }, 300);
                    showNotification('Download deleted', 'success');
                } catch (error) {
                    console.error('Error deleting download:', error);
                    showNotification('Failed to delete', 'error');
                }
            }
        });

        // Hover effects
        row.addEventListener('mouseenter', function () {
            this.style.background = 'rgba(255, 130, 0, 0.05)';
        });
        row.addEventListener('mouseleave', function () {
            this.style.background = 'transparent';
        });

        openBtn.addEventListener('mouseenter', function () {
            this.style.color = '#e67300';
            this.style.transform = 'scale(1.1)';
        });
        openBtn.addEventListener('mouseleave', function () {
            this.style.color = '#ff8200';
            this.style.transform = 'scale(1)';
        });

        deleteBtn.addEventListener('mouseenter', function () {
            this.style.color = '#c82333';
            this.style.transform = 'scale(1.1)';
        });
        deleteBtn.addEventListener('mouseleave', function () {
            this.style.color = '#dc3545';
            this.style.transform = 'scale(1)';
        });

        return row;
    }

    // Open downloaded PDF - switch to home tab first, then open modal
    function openDownload(url) {
        // Switch to home tab first
        const homeTab = document.querySelector('[data-tab="home"]');
        const homeContent = document.getElementById('home');

        if (homeTab && homeContent) {
            // Remove active from all tabs
            document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Activate home tab
            homeTab.classList.add('active');
            homeContent.classList.add('active');

            // Set cookie for active tab
            if (typeof setCookie === 'function') {
                setCookie('activeTab', 'home', 7);
            }

            // Small delay to ensure tab switch completes, then open PDF
            setTimeout(() => {
                if (typeof window.loadPdfWithCache === 'function') {
                    window.loadPdfWithCache(url);
                } else {
                    console.error('PDF loading function not available');
                }
            }, 100);
        } else {
            // Fallback: just open the PDF
            if (typeof window.loadPdfWithCache === 'function') {
                window.loadPdfWithCache(url);
            } else {
                console.error('PDF loading function not available');
            }
        }
    }

    // Update storage info
    async function updateStorageInfo() {
        try {
            const info = await window.pdfDownloadManager.getStorageInfo();

            if (storageStats) {
                storageStats.textContent = `${info.totalFiles} files • ${info.totalSizeFormatted} of ${info.maxSizeFormatted} used`;
            }

            if (storageBar) {
                storageBar.style.width = `${info.percentUsed}%`;

                // Change color based on usage
                if (info.percentUsed > 90) {
                    storageBar.style.background = '#dc3545';
                } else if (info.percentUsed > 75) {
                    storageBar.style.background = '#ffc107';
                } else {
                    storageBar.style.background = 'linear-gradient(90deg, #ffd54f, #ffc540, #ffb530, #ffa520, #ff9510, #ff6f00)';
                }
            }
        } catch (error) {
            console.error('Error updating storage info:', error);
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        switch (type) {
            case 'success':
                notification.style.backgroundColor = 'rgba(40, 167, 69, 0.95)';
                break;
            case 'error':
                notification.style.backgroundColor = 'rgba(220, 53, 69, 0.95)';
                break;
            case 'info':
            default:
                notification.style.backgroundColor = 'rgba(23, 162, 184, 0.95)';
                break;
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Load downloads on initial page load if on downloads tab
    if (document.getElementById('downloads')?.classList.contains('active')) {
        loadDownloads();
    }

    // Expose loadDownloads globally for external access
    window.loadDownloads = loadDownloads;
});
