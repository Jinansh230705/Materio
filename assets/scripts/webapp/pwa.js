// PWA functionality for Materio
// Handles service worker registration, installation prompts, and offline detection

class MateriosPWA {
  constructor() {
    this.swRegistration = null;
    this.deferredPrompt = null;
    this.isOnline = navigator.onLine;
    this.updateAvailable = false;
    
    this.init();
  }

  async init() {
    // console.log('[PWA] Initializing...');
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      await this.registerServiceWorker();
    }
    
    // Setup install prompt
    this.setupInstallPrompt();
    
    // Setup offline/online detection
    this.setupNetworkDetection();
    
    // Setup update detection
    this.setupUpdateDetection();
    
    // Setup push notifications
    this.setupPushNotifications();
    
    // console.log('[PWA] Initialized');
  }

  async registerServiceWorker() {
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      // console.log('[PWA] Service Worker registered:', this.swRegistration);
      
      // Listen for updates
      this.swRegistration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });
      
      // Listen for controlling changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }
  setupInstallPrompt() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // console.log('[PWA] Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPopup();
    });

    // Handle app installed event
    window.addEventListener('appinstalled', () => {
      // console.log('[PWA] App installed');
      this.hideInstallPopup();
      this.showNotification('Materio installed successfully!', 'success');
    });

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      // console.log('[PWA] App is already installed');
      return;
    }
  }
  async promptInstall() {
    if (!this.deferredPrompt) {
      // console.log('[PWA] No install prompt available');
      return false;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    // console.log(`[PWA] User choice: ${outcome}`);
    this.deferredPrompt = null;
    
    if (outcome === 'accepted') {
      this.hideInstallPopup();
    }
    
    return outcome === 'accepted';
  }
  showInstallPopup() {
    // Check if user has dismissed this before and chose "don't ask again"
    if (localStorage.getItem('pwa-install-dismissed') === 'permanent') {
      return;
    }

    // Check if we should wait before showing again (remind me later)
    const lastDismissed = localStorage.getItem('pwa-install-remind-later');
    if (lastDismissed) {
      const daysPassed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 3) { // Wait 3 days before showing again
        return;
      }
    }

    this.createInstallPopupElement();
  }  handleInstallDismiss(dontAskAgain, remindLater) {
    if (dontAskAgain) {
      localStorage.setItem('pwa-install-dismissed', 'permanent');
    } else if (remindLater) {
      localStorage.setItem('pwa-install-remind-later', Date.now().toString());
    }
    
    this.hideInstallPopup();
  }

  hideInstallPopup() {
    const popup = document.getElementById('pwa-install-popup');
    if (popup) {
      popup.style.animation = 'fadeOut 0.3s ease';
      popup.addEventListener('animationend', () => {
        if (popup.parentElement) {
          popup.remove();
        }
      });
    }
  }

  // Test method to force show install popup (bypasses all checks)
  forceShowInstallPopup() {
    // Remove any existing popup first
    const existingPopup = document.getElementById('pwa-install-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // Call the main popup creation logic without checks
    this.createInstallPopupElement();
  }
  createInstallPopupElement() {
    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.id = 'pwa-install-popup';
    
    // Add CSS animations if not already added
    if (!document.getElementById('pwa-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'pwa-popup-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideDown {
          from { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to { 
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: fadeIn 0.3s ease;
    `;

    // Create popup content
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 16px;
      max-width: 380px;
      margin: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      text-align: center;
      font-family: "Manrope", sans-serif;
      animation: slideUp 0.3s ease;
    `;

    popup.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="
          width: 64px;
          height: 64px;
          // background: linear-gradient(135deg, #ff8200, #ffaa4d);
          border-radius: 16px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        ">
        <svg width="64" height="64" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="16" height="16" rx="4" fill="#FF8200"/>
<path d="M4.052 9H3.412V7.624C3.412 7.52 3.356 7.464 3.232 7.464C3.096 7.464 2.98 7.528 2.936 7.568V9H2.296V7.624C2.296 7.52 2.24 7.464 2.116 7.464C1.98 7.464 1.864 7.528 1.82 7.568V9H1.18V7H1.564L1.644 7.144C1.788 7.02 2.064 6.944 2.272 6.944C2.54 6.944 2.672 7.016 2.736 7.108C2.88 7 3.144 6.944 3.384 6.944C3.904 6.944 4.052 7.256 4.052 7.616V9ZM5.42294 7.728V7.6C5.42294 7.508 5.35894 7.46 5.18694 7.46C4.93494 7.46 4.64294 7.536 4.46694 7.612V7.076C4.60294 7.016 4.90294 6.944 5.18694 6.944C5.90694 6.944 6.04294 7.252 6.04294 7.7V9H5.65894L5.57094 8.848C5.42694 8.976 5.22294 9.056 4.98294 9.056C4.47494 9.056 4.30294 8.72 4.30294 8.42C4.30294 7.88 4.69894 7.8 5.05894 7.764L5.42294 7.728ZM5.42294 8.076L5.15494 8.112C4.97494 8.136 4.90294 8.224 4.90294 8.38C4.90294 8.528 4.99894 8.616 5.13494 8.616C5.25094 8.616 5.35894 8.584 5.42294 8.52V8.076ZM7.64713 8.516V9.016C7.55913 9.04 7.40713 9.056 7.31913 9.056C6.75913 9.056 6.54713 8.82 6.54713 8.348V7.532H6.22313V7.108L6.54713 7.02V6.608L7.18713 6.436V7H7.68313V7.532H7.18713V8.296C7.18713 8.452 7.24713 8.54 7.45113 8.54C7.53513 8.54 7.61513 8.524 7.64713 8.516ZM9.66172 8.212H8.49372C8.47772 8.472 8.61372 8.548 8.92572 8.548C9.22572 8.548 9.44972 8.488 9.59372 8.416V8.916C9.36172 9.012 9.08172 9.056 8.84172 9.056C8.18172 9.056 7.86172 8.72 7.86172 8C7.86172 7.28 8.17772 6.944 8.79772 6.944C9.65372 6.944 9.71372 7.584 9.66172 8.212ZM8.80572 7.424C8.58972 7.424 8.49372 7.568 8.49372 7.82H9.06172C9.09772 7.6 9.04972 7.424 8.80572 7.424ZM11.2369 6.972V7.488C11.2049 7.48 11.1249 7.472 11.0409 7.472C10.8449 7.472 10.6689 7.54 10.6169 7.588V9H9.97688V7H10.3609L10.4409 7.144C10.5409 7.048 10.7569 6.944 11.0569 6.944C11.1369 6.944 11.2089 6.96 11.2369 6.972ZM12.2773 8.5V9.016C12.2773 9.016 12.1933 9.032 12.0933 9.032C11.7493 9.032 11.4773 8.856 11.4773 8.468V7H12.1133V8.38C12.1133 8.456 12.1493 8.5 12.2773 8.5ZM11.4173 6.42C11.4173 6.208 11.5813 6.04 11.7973 6.04C12.0093 6.04 12.1773 6.208 12.1773 6.42C12.1773 6.636 12.0093 6.8 11.7973 6.8C11.5813 6.8 11.4173 6.636 11.4173 6.42ZM13.4189 9.056C12.6789 9.056 12.4789 8.624 12.4789 8C12.4789 7.376 12.6789 6.944 13.4189 6.944C14.1589 6.944 14.3589 7.376 14.3589 8C14.3589 8.624 14.1589 9.056 13.4189 9.056ZM13.4189 7.456C13.1989 7.456 13.1189 7.6 13.1189 8C13.1189 8.4 13.1989 8.544 13.4189 8.544C13.6389 8.544 13.7189 8.4 13.7189 8C13.7189 7.6 13.6389 7.456 13.4189 7.456ZM14.557 8.676C14.557 8.464 14.721 8.296 14.937 8.296C15.149 8.296 15.317 8.464 15.317 8.676C15.317 8.892 15.149 9.056 14.937 9.056C14.721 9.056 14.557 8.892 14.557 8.676Z" fill="white"/>
</svg>

        </div>
        <h3 style="
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        ">Install Materio App</h3>
        <p style="
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        ">Get quick access to your study materials with our app. Works offline and loads faster!</p>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <button id="pwa-install-btn" style="
          flex: 1;
          background: #ff8200;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: 'Manrope', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">Install</button>
        
        <button id="pwa-remind-later-btn" style="
          flex: 1;
          background: #f5f5f5;
          color: #666;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: 'Manrope', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        ">Remind me later</button>
      </div>

      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        <input type="checkbox" id="pwa-dont-ask-again" style="
          margin: 0;
          transform: scale(0.9);
        ">
        <label for="pwa-dont-ask-again" style="
          font-size: 12px;
          color: #888;
          cursor: pointer;
          user-select: none;
        ">Don't ask me again</label>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Add event listeners
    this.attachPopupEventListeners(popup, overlay);
  }

  attachPopupEventListeners(popup, overlay) {
    const installBtn = popup.querySelector('#pwa-install-btn');
    const remindLaterBtn = popup.querySelector('#pwa-remind-later-btn');
    const dontAskCheckbox = popup.querySelector('#pwa-dont-ask-again');

    installBtn.addEventListener('mouseenter', () => {
      installBtn.style.background = '#e67300';
    });
    installBtn.addEventListener('mouseleave', () => {
      installBtn.style.background = '#ff8200';
    });

    remindLaterBtn.addEventListener('mouseenter', () => {
      remindLaterBtn.style.background = '#e8e8e8';
    });
    remindLaterBtn.addEventListener('mouseleave', () => {
      remindLaterBtn.style.background = '#f5f5f5';
    });

    installBtn.addEventListener('click', async () => {
      const installed = await this.promptInstall();
      if (!installed) {
        this.handleInstallDismiss(dontAskCheckbox.checked, false);
      }
    });

    remindLaterBtn.addEventListener('click', () => {
      this.handleInstallDismiss(dontAskCheckbox.checked, true);
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.handleInstallDismiss(dontAskCheckbox.checked, true);
      }
    });

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.handleInstallDismiss(dontAskCheckbox.checked, true);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  setupNetworkDetection() {
    // Update online status
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (wasOnline !== this.isOnline) {
        this.handleNetworkChange();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  handleNetworkChange() {
    if (this.isOnline) {
      // console.log('[PWA] Back online');
      this.showOfflineIndicator('Back online!', 'success');
      
      // Trigger background sync if available
      if (this.swRegistration && this.swRegistration.sync) {
        this.swRegistration.sync.register('background-sync');
      }
      
      // Update cache for essential resources
      this.updateEssentialCache();
      
    } else {
      // console.log('[PWA] Gone offline');
      this.showOfflineIndicator('You\'re offline. Connect to Internet to access Reading resources.', 'warning');
    }
  }

  showOfflineIndicator(message = 'Offline Mode', type = 'warning') {
    // Remove existing indicator
    this.hideOfflineIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.textContent = message;
    
    // Set background color based on type
    const backgroundColor = type === 'success' ? '#8dac49' : '#ff8200';
    
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: ${backgroundColor};
      color: white;
      text-align: center;
      font-size: 10px;
      font-weight: 500;
      padding: 4px;
      z-index: 10000;
      animation: slideDown 0.3s ease;
      font-family: 'Manrope', sans-serif;
    `;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('offline-indicator-styles')) {
      const style = document.createElement('style');
      style.id = 'offline-indicator-styles';
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(0); }
          to { transform: translateY(-100%); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.hideOfflineIndicator();
      }, 3000);
    }
  }

  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  handleUpdateFound() {
    const installingWorker = this.swRegistration.installing;
    // console.log('[PWA] New service worker installing...');
    
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // console.log('[PWA] New content available');
          this.updateAvailable = true;
          this.showUpdateNotification();
        } else {
          // console.log('[PWA] Content cached for offline use');
          this.showNotification('App ready for offline use!', 'info');
        }
      }
    });
  }

  showUpdateNotification() {
    // Create update notification
    let updateNotification = document.getElementById('update-notification');
    if (!updateNotification) {
      updateNotification = document.createElement('div');
      updateNotification.id = 'update-notification';
      updateNotification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(255, 130, 0,0.8);
          backdrop-filter: blur(10px);
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          z-index: 10000;
          max-width: 300px;
           font-family: 'Manrope',sans-serif;
          font-size: 14px;
          line-height: 1.4;
        ">
          <div style="margin-bottom: 12px;">
            <strong>Update Available!</strong><br>
            A new version of Materio WebApp is ready.
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="update-btn" style="
              background: white;
              color: #ff8200;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-family: 'Manrope',sans-serif;
              font-size: 12px;
              font-weight: 600;
            ">Update</button>
            <button id="dismiss-update-btn" style="
              background: transparent;
              color: white;
              border: 1px solid white;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
               font-family: 'Manrope',sans-serif;
              font-size: 12px;
              font-weight: 400;
            ">Later</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(updateNotification);
      
      // Add event listeners
      document.getElementById('update-btn').addEventListener('click', () => {
        this.applyUpdate();
      });
      
      document.getElementById('dismiss-update-btn').addEventListener('click', () => {
        this.hideUpdateNotification();
      });
    }
  }

  hideUpdateNotification() {
    const updateNotification = document.getElementById('update-notification');
    if (updateNotification) {
      updateNotification.remove();
    }
  }

  applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    this.hideUpdateNotification();
  }

  setupUpdateDetection() {
    // Check for updates every 30 minutes
    setInterval(() => {
      if (this.swRegistration) {
        this.swRegistration.update();
      }
    }, 30 * 60 * 1000);
  }

  async setupPushNotifications() {
    if (!('PushManager' in window) || !this.swRegistration) {
      // console.log('[PWA] Push notifications not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // console.log('[PWA] Push notifications enabled');
        // You can implement push subscription logic here
      }
    } catch (error) {
      console.error('[PWA] Push notification setup failed:', error);
    }
  }

  async updateEssentialCache() {
    if (!this.swRegistration) return;
    
    const essentialUrls = [
      '/assets/data/events.json',
      '/assets/data/releases.json',
    ];
    
    this.swRegistration.active?.postMessage({
      type: 'CACHE_UPDATE',
      urls: essentialUrls
    });
  }

  showNotification(message, type = 'info') {
    // Use the enhanced offline indicator for all notifications
    this.showOfflineIndicator(message, type);
  }

  // Public methods for manual cache management
  async clearCache() {
    if (this.swRegistration) {
      this.swRegistration.active?.postMessage({ type: 'CLEAR_CACHE' });
      this.showNotification('Cache cleared successfully!', 'success');
    }
  }

  async updateCache() {
    if (this.swRegistration) {
      await this.swRegistration.update();
      this.showNotification('Cache updated!', 'success');
    }
  }

  // Check if app is in standalone mode (installed)
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
  }

  // Get cache status information
  async getCacheInfo() {
    if (!('caches' in window)) return null;
    
    try {
      const cacheNames = await caches.keys();
      const cacheInfo = {};
      
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        cacheInfo[name] = keys.length;
      }
      
      return cacheInfo;
    } catch (error) {
      console.error('[PWA] Failed to get cache info:', error);
      return null;
    }
  }
}

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.materioPWA = new MateriosPWA();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MateriosPWA;
}
