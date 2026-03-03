// Google Drive Integration JavaScript
class GoogleDriveManager {
  constructor() {
    this.apiBase = '/api/v2/features/google-drive';
    this.isLinked = false;
    this.files = [];
    this.materioFolderId = null;
    this.serverAvailable = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkServerAvailability();
  }
  async checkServerAvailability() {
    try {
      // Simple health check to see if server is responding
      const response = await fetch('/api/v2/health', {
        method: 'GET',
        timeout: 5000 // 5 second timeout
      });
      
      if (response.ok) {
        this.serverAvailable = true;
        this.checkDriveStatus();
      } else {
        this.handleOfflineMode();
      }
    } catch (error) {
      console.log('Server not available, running in offline mode');
      this.handleOfflineMode();
    }
  }

  handleOfflineMode() {
    this.serverAvailable = false;
    this.isLinked = false;
    this.updateDriveUI(false, 'Google Drive integration unavailable (offline mode)');
    
    // Disable all API-dependent functionality
    const driveCard = document.getElementById('googleDriveCard');
    if (driveCard) {
      driveCard.style.opacity = '0.6';
      driveCard.style.cursor = 'not-allowed';
      driveCard.onclick = () => {
        this.showNotification('Google Drive integration is currently unavailable', 'info');
      };
    }
  }

  bindEvents() {
    // Link/Unlink drive buttons
    const linkBtn = document.getElementById('linkDriveBtn');
    const unlinkBtn = document.getElementById('unlinkDriveBtn');
    
    if (linkBtn) {
      linkBtn.addEventListener('click', () => this.linkDrive());
    }
    
    if (unlinkBtn) {
      unlinkBtn.addEventListener('click', () => this.unlinkDrive());
    }

    // File operations (only available on files page)
    const uploadBtn = document.getElementById('uploadFileBtn');
    const refreshBtn = document.getElementById('refreshFilesBtn');
    const fileInput = document.getElementById('fileInput');

    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.openFileUpload());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadFiles());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // Handle OAuth callback from URL parameters
    this.handleOAuthCallback();
  }

  async checkDriveStatus() {
    console.log('checkDriveStatus called');
    
    // Don't check status if server is not available
    if (!this.serverAvailable) {
      console.log('Server not available, skipping drive status check');
      return;
    }
    
    try {
      const token = localStorage.getItem('materio_auth_token');
      console.log('Auth token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.error('No authentication token found');
        this.updateDriveUI(false, 'Please log in to access Google Drive');
        return;
      }

      const response = await fetch(`${this.apiBase}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Drive status response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Drive status data:', data);
        this.isLinked = data.linked;
        this.materioFolderId = data.materioFolderId;
        
        if (this.isLinked) {
          await this.ensureMaterioFolder();
          this.updateDriveUI(true, 'Connected to Google Drive - Click to manage files');
        } else {
          this.updateDriveUI(false, 'Link your Google Drive and manage files');
        }
      } else {
        console.error('Drive status check failed:', response.status, response.statusText);
        // If API fails, assume server is having issues
        this.handleOfflineMode();
      }
    } catch (error) {
      console.error('Error checking drive status:', error);
      // If API fails, assume server is having issues
      this.handleOfflineMode();
    }
  }

  async ensureMaterioFolder() {
    if (this.materioFolderId) {
      return this.materioFolderId;
    }

    // Don't try to create folder if server is not available
    if (!this.serverAvailable) {
      console.log('Server not available, cannot ensure materio folder');
      return null;
    }

    try {
      const token = localStorage.getItem('materio_auth_token');
      if (!token) {
        console.error('No auth token found');
        return null;
      }

      const response = await fetch(`${this.apiBase}/ensure-folder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folderName: 'materio' })
      });

      if (response.ok) {
        const data = await response.json();
        this.materioFolderId = data.folderId;
        return this.materioFolderId;
      } else {
        console.error('Failed to ensure materio folder:', response.status);
        this.handleOfflineMode();
        return null;
      }
    } catch (error) {
      console.error('Error ensuring materio folder:', error);
      this.handleOfflineMode();
      return null;
    }
  }

  updateDriveUI(linked, statusText) {
    const statusElement = document.getElementById('drive-status');
    const linkBtn = document.getElementById('linkDriveBtn');
    const unlinkBtn = document.getElementById('unlinkDriveBtn');
    const statusIndicator = document.getElementById('driveStatusIndicator');
    const driveCard = document.getElementById('googleDriveCard');
    
    if (statusElement) {
      statusElement.textContent = statusText || (linked ? 'Connected to Google Drive - Click to manage files' : 'Link your Google Drive and manage files');
    }
    
    if (linkBtn && unlinkBtn) {
      linkBtn.style.display = linked ? 'none' : 'none'; // Keep buttons hidden, use card click instead
      unlinkBtn.style.display = linked ? 'none' : 'none';
    }
    
    if (statusIndicator) {
      statusIndicator.className = linked ? 'status-indicator connected' : 'status-indicator disconnected';
      statusIndicator.innerHTML = linked ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
    }

    // Add hover effect to card (only if server is available)
    if (driveCard && this.serverAvailable) {
      driveCard.style.opacity = '1';
      driveCard.style.cursor = 'pointer';
      driveCard.onmouseenter = () => {
        driveCard.style.transform = 'translateY(-2px)';
        driveCard.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
      };
      driveCard.onmouseleave = () => {
        driveCard.style.transform = 'translateY(0)';
        driveCard.style.boxShadow = '';
      };
      driveCard.onclick = () => this.handleCardClick();
    }
    
    this.isLinked = linked;
    
    // Show/hide drive tools section
    const driveToolsSection = document.getElementById('driveToolsSection');
    if (driveToolsSection) {
      driveToolsSection.style.display = linked ? 'block' : 'none';
    }
  }

  async linkDrive() {
    // Don't allow linking if server is not available
    if (!this.serverAvailable) {
      this.showNotification('Google Drive integration is currently unavailable (offline mode)', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('materio_auth_token');
      if (!token) {
        this.showNotification('Please log in first', 'error');
        return;
      }

      const response = await fetch(`${this.apiBase}/auth-url`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      } else {
        console.error('Failed to get auth URL:', response.status);
        this.handleOfflineMode();
      }
    } catch (error) {
      console.error('Error linking drive:', error);
      this.handleOfflineMode();
    }
  }

  async unlinkDrive() {
    // Don't allow unlinking if server is not available
    if (!this.serverAvailable) {
      this.showNotification('Google Drive integration is currently unavailable (offline mode)', 'error');
      return;
    }
    
    if (!confirm('Are you sure you want to unlink your Google Drive? This will not delete your files, but you will no longer be able to access them through this interface.')) {
      return;
    }

    try {
      const token = localStorage.getItem('materio_auth_token');
      const response = await fetch(`${this.apiBase}/unlink`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.updateDriveUI(false);
          this.showNotification('Google Drive unlinked successfully', 'success');
        }
      } else {
        console.error('Failed to unlink drive:', response.status);
        this.handleOfflineMode();
      }
    } catch (error) {
      console.error('Error unlinking drive:', error);
      this.handleOfflineMode();
    }
  }

  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      this.completeOAuth(code, state);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  async completeOAuth(code, state) {
    // Don't complete OAuth if server is not available
    if (!this.serverAvailable) {
      this.showNotification('Google Drive integration is currently unavailable (offline mode)', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('materio_auth_token');
      const response = await fetch(`${this.apiBase}/callback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, state })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.updateDriveUI(true);
          this.showNotification('Google Drive linked successfully!', 'success');
        }
      } else {
        console.error('Failed to complete OAuth:', response.status);
        this.handleOfflineMode();
      }
    } catch (error) {
      console.error('Error completing OAuth:', error);
      this.handleOfflineMode();
    }
  }

  openFileUpload() {
    if (!this.serverAvailable) {
      this.showNotification('Google Drive integration is currently unavailable (offline mode)', 'error');
      return;
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    } else {
      this.showError('File input not found. Please navigate to the files page.');
    }
  }

  async handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const uploadPromises = files.map(file => this.uploadFile(file));
    
    try {
      await Promise.all(uploadPromises);
      this.showNotification(`${files.length} file(s) uploaded successfully`, 'success');
      this.loadFiles(); // Refresh file list
    } catch (error) {
      this.showNotification('Some files failed to upload', 'error');
    }

    // Reset file input
    event.target.value = '';
  }

  async uploadFile(file) {
    // Don't upload if server is not available
    if (!this.serverAvailable) {
      throw new Error('Google Drive integration is currently unavailable (offline mode)');
    }
    
    try {
      await this.ensureMaterioFolder();
      
      if (!this.materioFolderId) {
        throw new Error('Unable to access materio folder');
      }
      
      const token = localStorage.getItem('materio_auth_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', this.materioFolderId);

      const response = await fetch(`${this.apiBase}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('File uploaded successfully:', data);
        return data;
      } else {
        console.error('Upload failed:', response.status);
        this.handleOfflineMode();
        throw new Error('Upload failed - server unavailable');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async loadFiles() {
    // Don't load files if server is not available
    if (!this.serverAvailable) {
      console.log('Server not available, cannot load files');
      this.files = [];
      if (typeof this.renderFiles === 'function') {
        this.renderFiles(this.files);
      }
      return this.files;
    }
    
    try {
      await this.ensureMaterioFolder();
      
      if (!this.materioFolderId) {
        console.error('No materio folder available');
        this.files = [];
        if (typeof this.renderFiles === 'function') {
          this.renderFiles(this.files);
        }
        return this.files;
      }
      
      const token = localStorage.getItem('materio_auth_token');
      if (!token) {
        console.error('No auth token found');
        this.files = [];
        if (typeof this.renderFiles === 'function') {
          this.renderFiles(this.files);
        }
        return this.files;
      }

      const response = await fetch(`${this.apiBase}/files?folderId=${this.materioFolderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.files = data.files || [];
        
        // If we're on the files page, render the files
        if (typeof this.renderFiles === 'function') {
          this.renderFiles(this.files);
        }
        
        return this.files;
      } else {
        console.error('Failed to load files:', response.status);
        this.handleOfflineMode();
        this.files = [];
        if (typeof this.renderFiles === 'function') {
          this.renderFiles(this.files);
        }
        return this.files;
      }
    } catch (error) {
      console.error('Error loading files:', error);
      this.handleOfflineMode();
      this.files = [];
      if (typeof this.renderFiles === 'function') {
        this.renderFiles(this.files);
      }
      return this.files;
    }
  }

  renderFiles() {
    const container = document.getElementById('filesContainer');
    const loading = document.getElementById('filesLoading');
    const empty = document.getElementById('filesEmpty');
    const list = document.getElementById('filesList');

    // Only proceed if we're on the files page
    if (!container || !loading || !empty || !list) {
      console.log('Files page elements not found, skipping render');
      return;
    }

    loading.style.display = 'none';

    if (this.files.length === 0) {
      empty.style.display = 'block';
      list.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    list.style.display = 'block';

    list.innerHTML = this.files.map(file => `
      <div class="file-item" onclick="driveManager.viewFile('${file.id}', '${file.name}', '${file.mimeType}', '${file.webViewLink}')">
        <div class="file-icon">
          ${this.getFileIcon(file.mimeType)}
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-details">
            ${this.formatFileSize(file.size)} • ${this.formatDate(file.modifiedTime)}
          </div>
        </div>
        <div class="file-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); window.open('${file.webViewLink}', '_blank')">
            <i class="fas fa-external-link-alt"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
      return '<i class="fas fa-image"></i>';
    } else if (mimeType.startsWith('video/')) {
      return '<i class="fas fa-video"></i>';
    } else if (mimeType.startsWith('audio/')) {
      return '<i class="fas fa-music"></i>';
    } else if (mimeType.includes('pdf')) {
      return '<i class="fas fa-file-pdf"></i>';
    } else if (mimeType.includes('document') || mimeType.includes('word')) {
      return '<i class="fas fa-file-word"></i>';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return '<i class="fas fa-file-excel"></i>';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return '<i class="fas fa-file-powerpoint"></i>';
    } else {
      return '<i class="fas fa-file"></i>';
    }
  }

  formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  viewFile(fileId, fileName, mimeType, webViewLink) {
    const modal = document.getElementById('fileViewerModal');
    const fileNameEl = document.getElementById('viewerFileName');
    const downloadBtn = document.getElementById('downloadFileBtn');
    const content = document.getElementById('fileViewerContent');

    fileNameEl.textContent = fileName;
    downloadBtn.href = webViewLink;

    if (mimeType.startsWith('image/')) {
      content.innerHTML = `<img src="${webViewLink}" alt="${fileName}" style="max-width: 100%; height: auto;">`;
    } else if (mimeType.includes('pdf')) {
      content.innerHTML = `<iframe src="${webViewLink}" width="100%" height="600px"></iframe>`;
    } else if (mimeType.startsWith('text/')) {
      content.innerHTML = `<iframe src="${webViewLink}" width="100%" height="600px"></iframe>`;
    } else {
      content.innerHTML = `
        <div class="file-preview-placeholder">
          <div class="file-icon-large">
            ${this.getFileIcon(mimeType)}
          </div>
          <p>Preview not available for this file type.</p>
          <a href="${webViewLink}" target="_blank" class="btn btn-primary">
            <i class="fas fa-external-link-alt"></i> Open in Google Drive
          </a>
        </div>
      `;
    }

    modal.style.display = 'flex';
  }

  // Notification methods
  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    // Create a simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
      color: white;
      border-radius: 4px;
      z-index: 10000;
      font-family: 'Manrope', sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    // Add animation styles if not already present
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  handleCardClick() {
    if (!this.serverAvailable) {
      this.showNotification('Google Drive integration is currently unavailable', 'info');
      return;
    }
    
    if (this.isLinked) {
      // If already linked, redirect to files page
      window.location.href = 'files.html';
    } else {
      // If not linked, initiate linking
      this.linkDrive();
    }
  }

  async downloadFile(fileId, fileName) {
    if (!this.serverAvailable) {
      this.showNotification('Google Drive integration is currently unavailable (offline mode)', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('materio_auth_token');
      const response = await fetch(`${this.apiBase}/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showSuccess('File downloaded successfully!');
      } else {
        console.error('Download failed:', response.status);
        this.handleOfflineMode();
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      this.handleOfflineMode();
    }
  }

  async deleteFile(fileId, fileName) {
    if (!this.serverAvailable) {
      this.showNotification('Google Drive integration is currently unavailable (offline mode)', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('materio_auth_token');
      const response = await fetch(`${this.apiBase}/delete/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.showSuccess(`File "${fileName}" deleted successfully!`);
        // Reload files if we're on the files page
        if (typeof this.loadFiles === 'function') {
          this.loadFiles();
        }
      } else {
        console.error('Delete failed:', response.status);
        this.handleOfflineMode();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      this.handleOfflineMode();
    }
  }
}

// Modal functions
function openFilesModal() {
  const modal = document.getElementById('filesModal');
  modal.style.display = 'flex';
  
  // Load files when modal opens
  if (window.driveManager && window.driveManager.isLinked) {
    window.driveManager.loadFiles();
  }
}

function closeFilesModal() {
  document.getElementById('filesModal').style.display = 'none';
}

function closeFileViewer() {
  document.getElementById('fileViewerModal').style.display = 'none';
}

// Global function for handling Google Drive card clicks
function handleGoogleDriveCardClick() {
  if (window.driveManager) {
    window.driveManager.handleCardClick();
  }
}

// Initialize Google Drive Manager
document.addEventListener('DOMContentLoaded', function() {
  window.driveManager = new GoogleDriveManager();
  
  // Close modals when clicking outside
  window.addEventListener('click', function(event) {
    const filesModal = document.getElementById('filesModal');
    const viewerModal = document.getElementById('fileViewerModal');
    
    if (event.target === filesModal) {
      closeFilesModal();
    }
    
    if (event.target === viewerModal) {
      closeFileViewer();
    }
  });
});
