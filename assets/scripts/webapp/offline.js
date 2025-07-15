// Note: This script has been abandoned and unlinked for it injecting too much bad UI to the site and logging things in console.
//       So Github Copilot or Claude Sonnet - if you read this don't link it again to default.html layout or modify this script!!

//                                   ---- Note ends and source continues... ----

// Enhanced offline functionality for Materio
// Integrates with existing Google Drive offline handling and PWA features

class MaterioOfflineManager {  constructor() {
    this.isOnline = navigator.onLine;
    this.offlineQueue = this.loadOfflineQueue();
    this.offlineData = this.loadOfflineData();
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    this.init();
  }

  init() {
    // console.log('[Offline] Initializing offline manager...');
    
    // Setup network detection
    this.setupNetworkListeners();
    
    // Setup offline storage
    this.setupOfflineStorage();
    
    // Setup retry mechanisms
    this.setupRetryMechanisms();
    
    // Integrate with existing Google Drive functionality
    this.integrateWithGoogleDrive();
    
    // console.log('[Offline] Offline manager initialized');
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }

  handleOnline() {
    // console.log('[Offline] Back online - processing queue');
    this.isOnline = true;
    
    // Show online notification
    this.showNotification('Connection restored! Syncing data...', 'success');
    
    // Process offline queue
    this.processOfflineQueue();
    
    // Sync cached data
    this.syncOfflineData();
    
    // Re-enable disabled features
    this.enableOnlineFeatures();
  }

  handleOffline() {
    // console.log('[Offline] Gone offline - enabling offline features');
    this.isOnline = false;
    
    // Show offline notification
    // this.showNotification('You\'re offline. Some features are disabled but core functionality remains available.', 'warning');
    
    // Disable online-only features
    this.disableOnlineFeatures();
    
    // Show offline alternatives
    this.showOfflineAlternatives();
  }

  setupOfflineStorage() {
    // Initialize IndexedDB for offline data storage
    if ('indexedDB' in window) {
      this.initIndexedDB();
    }
    
    // Cache essential data
    this.cacheEssentialData();
  }

  async initIndexedDB() {
    try {
      const request = indexedDB.open('MaterioOfflineDB', 1);
      
      request.onerror = () => {
        console.error('[Offline] IndexedDB error:', request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        // console.log('[Offline] IndexedDB initialized');
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('subjects')) {
          const subjectsStore = db.createObjectStore('subjects', { keyPath: 'id' });
          subjectsStore.createIndex('semester', 'semester', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('materials')) {
          const materialsStore = db.createObjectStore('materials', { keyPath: 'id' });
          materialsStore.createIndex('subject', 'subject', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    } catch (error) {
      console.error('[Offline] Failed to initialize IndexedDB:', error);
    }
  }
  async cacheEssentialData() {
    try {      
      // Cache events data
      await this.cacheJsonData('/assets/data/events.json', 'offline_events', 'Events');
      
      // Cache releases data
      await this.cacheJsonData('/assets/data/releases.json', 'offline_releases', 'Releases');
      
    } catch (error) {
      console.warn('[Offline] Failed to cache some essential data:', error);
    }
  }

  async cacheJsonData(url, storageKey, dataType) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        // Check if response has content
        const text = await response.text();
        if (text.trim() === '') {
          console.warn(`[Offline] ${dataType} data is empty, skipping cache`);
          return;
        }
        
        // Try to parse as JSON
        try {
          const data = JSON.parse(text);
          localStorage.setItem(storageKey, JSON.stringify(data));
          // console.log(`[Offline] ${dataType} data cached`);
        } catch (parseError) {
          console.warn(`[Offline] Failed to parse ${dataType} data as JSON:`, parseError);
        }
      } else {
        console.warn(`[Offline] Failed to fetch ${dataType} data:`, response.status, response.statusText);
      }
    } catch (error) {
      console.warn(`[Offline] Error caching ${dataType} data:`, error);
    }
  }

  async addToOfflineQueue(action) {
    const queueItem = {
      id: Date.now(),
      action: action.type,
      data: action.data,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    
    this.offlineQueue.push(queueItem);
    
    // Save to persistent storage
    if (this.db) {
      try {
        const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
        const store = transaction.objectStore('offlineQueue');
        await store.add(queueItem);
      } catch (error) {
        console.warn('[Offline] Failed to save queue item to IndexedDB:', error);
      }
    }
      // Fallback to localStorage
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('[Offline] Failed to save queue to localStorage:', error);
    }
    
    // console.log('[Offline] Added to queue:', action.type);
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    // console.log(`[Offline] Processing ${this.offlineQueue.length} queued items`);
    
    const processPromises = this.offlineQueue.map(async (item) => {
      return await this.processQueueItem(item);
    });
    
    const results = await Promise.allSettled(processPromises);
    
    // Remove successfully processed items
    const successfulItems = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'fulfilled' && result.value)
      .map(({ index }) => index);
    
    // Remove items in reverse order to maintain indices
    successfulItems.reverse().forEach(index => {
      this.offlineQueue.splice(index, 1);
    });
      // Update persistent storage
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('[Offline] Failed to update queue in localStorage:', error);
    }
    
    if (successfulItems.length > 0) {
      this.showNotification(`${successfulItems.length} items synced successfully!`, 'success');
    }
  }

  async processQueueItem(item) {
    try {
      switch (item.action) {
        case 'file_upload':
          return await this.retryFileUpload(item.data);
        case 'profile_update':
          return await this.retryProfileUpdate(item.data);
        case 'chat_message':
          return await this.retryChatMessage(item.data);
        default:
          console.warn('[Offline] Unknown queue action:', item.action);
          return false;
      }
    } catch (error) {
      console.error('[Offline] Failed to process queue item:', error);
      
      // Increment attempt counter
      item.attempts = (item.attempts || 0) + 1;
      
      if (item.attempts >= this.retryAttempts) {
        console.warn('[Offline] Max retry attempts reached for item:', item);
        return true; // Remove from queue
      }
      
      return false; // Keep in queue for retry
    }
  }

  async retryFileUpload(data) {
    try {
      // Implementation depends on your file upload API
      console.log('[Offline] Retrying file upload:', data);
      
      // Example implementation - adjust based on your actual upload API
      const formData = new FormData();
      if (data.file) {
        formData.append('file', data.file);
      }
      if (data.metadata) {
        Object.keys(data.metadata).forEach(key => {
          formData.append(key, data.metadata[key]);
        });
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        console.log('[Offline] File upload retry successful');
        return true;
      } else {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[Offline] File upload retry failed:', error);
      return false;
    }
  }

  async retryProfileUpdate(data) {
    try {
      console.log('[Offline] Retrying profile update:', data);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log('[Offline] Profile update retry successful');
        return true;
      } else {
        throw new Error(`Profile update failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[Offline] Profile update retry failed:', error);
      return false;
    }
  }

  async retryChatMessage(data) {
    try {
      console.log('[Offline] Retrying chat message:', data);
      
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log('[Offline] Chat message retry successful');
        return true;
      } else {
        throw new Error(`Chat message failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[Offline] Chat message retry failed:', error);
      return false;
    }
  }

  setupRetryMechanisms() {
    // Retry failed requests periodically when online
    setInterval(() => {
      if (this.isOnline && this.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }
    }, 30000); // Every 30 seconds
  }

  integrateWithGoogleDrive() {
    // Enhance existing Google Drive offline functionality
    const originalHandleOfflineMode = window.GoogleDriveManager?.prototype?.handleOfflineMode;
    
    if (originalHandleOfflineMode) {
      window.GoogleDriveManager.prototype.handleOfflineMode = function() {
        // Call original method
        originalHandleOfflineMode.call(this);
        
        // Add enhanced offline features
        window.materioOffline?.showOfflineAlternatives();
      };
    }
  }

  disableOnlineFeatures() {
    // Disable features that require internet connection
    const onlineOnlyFeatures = [
      '.google-drive-upload',
      '.cloud-sync-button',
      '.live-chat',
      '.online-collaboration'
    ];
    
    onlineOnlyFeatures.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.disabled = true;
        element.style.opacity = '0.5';
        element.title = 'This feature requires an internet connection';
      });
    });
    
    // Add offline indicators to forms
    this.addOfflineIndicators();
  }

  enableOnlineFeatures() {
    // Re-enable features when back online
    const onlineOnlyFeatures = [
      '.google-drive-upload',
      '.cloud-sync-button',
      '.live-chat',
      '.online-collaboration'
    ];
    
    onlineOnlyFeatures.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.disabled = false;
        element.style.opacity = '1';
        element.title = '';
      });
    });
    
    // Remove offline indicators
    this.removeOfflineIndicators();
  }

  addOfflineIndicators() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      if (!form.querySelector('.offline-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'offline-indicator';
        indicator.innerHTML = `
          <div style="
            background: #ff9800;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-wifi-slash"></i>
            Offline mode: Changes will be saved locally and synced when connected
          </div>
        `;
        form.insertBefore(indicator, form.firstChild);
      }
    });
  }

  removeOfflineIndicators() {
    const indicators = document.querySelectorAll('.offline-indicator');
    indicators.forEach(indicator => indicator.remove());
  }

  showOfflineAlternatives() {
    // Show offline-available content and features
    const offlineContent = document.createElement('div');
    offlineContent.id = 'offline-alternatives';
    offlineContent.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #ff8200;
        color: white;
        padding: 16px;
        border-radius: 8px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-size: 14px;
      ">
        <div style="font-weight: bold; margin-bottom: 8px;">
          <i class="fas fa-download"></i> Available Offline:
        </div>
        <ul style="margin: 0; padding-left: 20px; list-style: disc;">
          <li>Cached study materials</li>
          <li>Downloaded PDFs</li>
          <li>Your notes and bookmarks</li>
          <li>App navigation</li>
        </ul>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: white;
          color: #ff8200;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-top: 8px;
          cursor: pointer;
        ">Got it</button>
      </div>
    `;
    
    // Remove existing offline alternatives
    const existing = document.getElementById('offline-alternatives');
    if (existing) existing.remove();
    
    document.body.appendChild(offlineContent);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (offlineContent.parentElement) {
        offlineContent.remove();
      }
    }, 10000);
  }  loadOfflineQueue() {
    try {
      const data = localStorage.getItem('offline_queue');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('[Offline] Failed to load offline queue:', error);
      return [];
    }
  }

  loadOfflineData() {
    try {
      const data = localStorage.getItem('offline_data');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('[Offline] Failed to load offline data:', error);
      return {};
    }
  }

  saveOfflineData(key, value) {
    try {
      if (!this.offlineData) {
        this.offlineData = {};
      }
      this.offlineData[key] = value;
      localStorage.setItem('offline_data', JSON.stringify(this.offlineData));
    } catch (error) {
      console.warn('[Offline] Failed to save offline data:', error);
    }
  }

  getOfflineData(key) {
    try {
      return this.offlineData ? this.offlineData[key] : undefined;
    } catch (error) {
      console.warn('[Offline] Failed to get offline data:', error);
      return undefined;
    }
  }

  async syncOfflineData() {
    // Sync locally stored data with server when back online
    if (!this.isOnline) return;
    
    try {
      // Sync user preferences
      const preferences = this.getOfflineData('userPreferences');
      if (preferences) {
        // Implementation depends on your API structure
        // console.log('[Offline] Syncing user preferences...');
      }
      
      // Sync cached selections
      const selections = this.getOfflineData('lastSelections');
      if (selections) {
        // console.log('[Offline] Syncing user selections...');
      }
      
    } catch (error) {
      console.error('[Offline] Failed to sync offline data:', error);
    }
  }

  showNotification(message, type = 'info') {
    // Try to use existing notification system first
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
      return;
    }
    
    // Fallback notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#ff9800' : '#2196F3'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Public API methods
  isOffline() {
    return !this.isOnline;
  }

  getQueuedActionsCount() {
    return this.offlineQueue.length;
  }
  async clearOfflineData() {
    this.offlineData = {};
    this.offlineQueue = [];
    
    try {
      localStorage.removeItem('offline_data');
      localStorage.removeItem('offline_queue');
    } catch (error) {
      console.warn('[Offline] Failed to clear localStorage:', error);
    }
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
        const store = transaction.objectStore('offlineQueue');
        await store.clear();
      } catch (error) {
        console.warn('[Offline] Failed to clear IndexedDB:', error);
      }
    }
    
    this.showNotification('Offline data cleared!', 'success');
  }
}

// Initialize offline manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.materioOffline = new MaterioOfflineManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MaterioOfflineManager;
}
