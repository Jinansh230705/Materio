// PWA Debug Panel - Online-First Strategy
// This helps verify that online-first caching is working correctly

function createPWADebugPanel() {
  if (!window.materioPWA) {
    console.warn('PWA not initialized');
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'pwa-debug-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 2px solid #ff8200;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    z-index: 10000;
    max-width: 320px;
  `;

  panel.innerHTML = `
    <h4 style="margin: 0 0 12px 0; color: #ff8200;">PWA Debug Panel (Online-First)</h4>
    
    <div style="margin-bottom: 8px;">
      <strong>Strategy:</strong> 
      <span style="color: #28a745; font-weight: bold;">Online-First</span>
    </div>
    
    <div style="margin-bottom: 8px;">
      <strong>Cache Status:</strong>
      <div id="cache-status">Loading...</div>
    </div>
    
    <div style="margin-bottom: 8px;">
      <strong>Network:</strong> <span id="network-status">${navigator.onLine ? 'Online' : 'Offline'}</span>
    </div>
    
    <div style="margin-bottom: 8px;">
      <strong>Content Source:</strong>
      <div id="content-source">${navigator.onLine ? '🌐 Live (Network)' : '💾 Cached (Offline)'}</div>
    </div>
    
    <div style="margin-bottom: 8px;">
      <strong>Last Cache Clear:</strong>
      <div id="last-cache-clear">Never</div>
    </div>
    
    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
      <button id="clear-cache-btn" style="
        background: #ff8200; color: white; border: none; padding: 6px 12px;
        border-radius: 4px; cursor: pointer; font-size: 11px;
      ">Clear Cache</button>
      
      <button id="force-refresh-btn" style="
        background: #28a745; color: white; border: none; padding: 6px 12px;
        border-radius: 4px; cursor: pointer; font-size: 11px;
      ">Force Refresh</button>
      
      <button id="test-offline-btn" style="
        background: #6f42c1; color: white; border: none; padding: 6px 12px;
        border-radius: 4px; cursor: pointer; font-size: 11px;
      ">Test Offline</button>
      
      <button id="close-debug-btn" style="
        background: #6c757d; color: white; border: none; padding: 6px 12px;
        border-radius: 4px; cursor: pointer; font-size: 11px;
      ">Close</button>
    </div>
    
    <div style="margin-top: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 10px;">
      <strong>Online-First:</strong> When online, always shows fresh content. Cache only used when offline.
    </div>
  `;

  document.body.appendChild(panel);

  // Event listeners
  panel.querySelector('#clear-cache-btn').addEventListener('click', async () => {
    await window.materioPWA.clearCache();
    updateCacheStatus();
    updateLastCacheClear();
  });

  panel.querySelector('#force-refresh-btn').addEventListener('click', async () => {
    await window.materioPWA.forceRefreshVersionData();
    updateLastCacheClear();
  });

  panel.querySelector('#test-offline-btn').addEventListener('click', () => {
    alert('To test offline mode:\n1. Open DevTools\n2. Go to Network tab\n3. Check "Offline"\n4. Refresh page');
  });

  panel.querySelector('#close-debug-btn').addEventListener('click', () => {
    panel.remove();
  });

  // Update functions
  async function updateCacheStatus() {
    const cacheInfo = await window.materioPWA.getCacheInfo();
    const statusDiv = panel.querySelector('#cache-status');
    if (cacheInfo) {
      const cacheList = Object.entries(cacheInfo)
        .map(([name, count]) => `${name}: ${count} items`)
        .join('<br>');
      statusDiv.innerHTML = cacheList || 'No cache data';
    } else {
      statusDiv.textContent = 'Unable to read cache';
    }
  }

  function updateLastCacheClear() {
    const clearDiv = panel.querySelector('#last-cache-clear');
    clearDiv.textContent = new Date().toLocaleTimeString();
  }

  function updateNetworkStatus() {
    const networkSpan = panel.querySelector('#network-status');
    const contentDiv = panel.querySelector('#content-source');
    
    const isOnline = navigator.onLine;
    networkSpan.textContent = isOnline ? 'Online' : 'Offline';
    networkSpan.style.color = isOnline ? 'green' : 'red';
    
    contentDiv.innerHTML = isOnline ? '🌐 Live (Network)' : '💾 Cached (Offline)';
    contentDiv.style.color = isOnline ? '#28a745' : '#ffc107';
  }

  // Initial updates
  updateCacheStatus();
  updateNetworkStatus();

  // Listen for network changes
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  return panel;
}

// Auto-add debug panel in development or when URL contains ?debug=pwa
if (window.location.hostname === 'localhost' || 
    window.location.search.includes('debug=pwa')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createPWADebugPanel, 3000);
  });
}

// Export for manual use
window.createPWADebugPanel = createPWADebugPanel;
