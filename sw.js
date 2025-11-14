// Service Worker for Materio PWA
// Version: 3.1.0 - Offline Downloads Support
// 
// STRATEGY:
// - ONLINE: Always fetch fresh from network
// - OFFLINE: Show cached homepage with Downloads tab only
// - Downloaded PDFs: Load from IndexedDB and display in viewer

// Helper to check if running on localhost
const isLocalhost = () => {
  const hostname = self.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost') || hostname.includes(':8888');
};

// Localhost mode - pass through only
if (isLocalhost()) {
  console.log('[SW] Localhost detected - pass-through mode');
  
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
  });
  
} else {
  // Production mode - Cache minimal files for offline Downloads
  console.log('[SW] Production mode - Offline Downloads support');

const OFFLINE_CACHE = 'materio-offline-v3-3-5';

// Helper function to get cookie value
function getCookie(name) {
  const value = `; ${self.cookieStore || ''}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Get selected wallpaper from cookie (will be checked during install)
function getWallpaperFiles() {
  const wallpapers = [];
  
  // Try to get selectedWallpaper from cookie
  // Note: Service worker can't access document.cookie directly
  // So we'll cache all wallpapers to be safe
  
  // Static wallpapers (WebP format for 90% size reduction)
  wallpapers.push('/assets/img/events/hero.webp');  // Default
  wallpapers.push('/assets/img/events/h2.webp');    // Zen
  wallpapers.push('/assets/img/events/h5.webp');    // Dusk
  wallpapers.push('/assets/img/events/h3.webp');    // A Blissful Night
  
  // Dynamic wallpapers (cache current one based on time)
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  let dynamicIndex = 2; // Default daytime
  if (totalMinutes >= 345 && totalMinutes < 360) dynamicIndex = 0;
  else if (totalMinutes >= 360 && totalMinutes < 405) dynamicIndex = 1;
  else if (totalMinutes >= 405 && totalMinutes < 1065) dynamicIndex = 2;
  else if (totalMinutes >= 1065 && totalMinutes < 1080) dynamicIndex = 3;
  else if (totalMinutes >= 1080 && totalMinutes < 1140) dynamicIndex = 4;
  else if (totalMinutes >= 1140 && totalMinutes < 1185) dynamicIndex = 5;
  else if (totalMinutes >= 1185 && totalMinutes < 1430) dynamicIndex = 6;
  else if (totalMinutes >= 1430 || totalMinutes < 30) dynamicIndex = 7;
  else if (totalMinutes >= 30 && totalMinutes < 345) dynamicIndex = 8;
  
  wallpapers.push(`/assets/img/events/dynamic/part_${dynamicIndex}.webp`);
  
  return wallpapers;
}

// Cache all files in the oread directory for full offline PDF support
function getOreadFiles() {
  // Complete list of all oread files (relative to public root)
  return [
    '/oread/LICENSE',
    '/oread/build/pdf.mjs',
    '/oread/build/pdf.mjs.map',
    '/oread/build/pdf.sandbox.mjs',
    '/oread/build/pdf.sandbox.mjs.map',
    '/oread/build/pdf.worker.mjs',
    '/oread/build/pdf.worker.mjs.map',
    '/oread/web/viewer.html',
    '/oread/web/viewer.mjs',
    '/oread/web/viewer.mjs.map',
    '/oread/web/viewer.css',
    '/oread/web/themesync.css',
    '/oread/web/showbtnrq.js',
    '/oread/web/overlays.js',
    '/oread/web/keybinds.js',
    '/oread/web/intelligence.js',
    '/oread/web/debugger.mjs',
    '/oread/web/debugger.css',
    '/oread/web/compressed.tracemonkey-pldi-09.pdf',
    // Images
    '/oread/web/images/annotation-key.svg',
    '/oread/web/images/annotation-paragraph.svg',
    '/oread/web/images/annotation-paperclip.svg',
    '/oread/web/images/annotation-pushpin.svg',
    '/oread/web/images/annotation-note.svg',
    '/oread/web/images/annotation-noicon.svg',
    '/oread/web/images/annotation-newparagraph.svg',
    '/oread/web/images/annotation-insert.svg',
    '/oread/web/images/annotation-help.svg',
    '/oread/web/images/annotation-comment.svg',
    '/oread/web/images/annotation-check.svg',
    '/oread/web/images/altText_warning.svg',
    '/oread/web/images/altText_spinner.svg',
    '/oread/web/images/altText_done.svg',
    '/oread/web/images/altText_disclaimer.svg',
    '/oread/web/images/altText_add.svg',
    '/oread/web/images/editor-toolbar-delete.svg',
    '/oread/web/images/editor-toolbar-edit.svg',
    '/oread/web/images/cursor-editorTextHighlight.svg',
    '/oread/web/images/cursor-editorInk.svg',
    '/oread/web/images/cursor-editorFreeText.svg',
    '/oread/web/images/cursor-editorFreeHighlight.svg',
    '/oread/web/images/secondaryToolbarButton-lastPage.svg',
    '/oread/web/images/secondaryToolbarButton-handTool.svg',
    '/oread/web/images/secondaryToolbarButton-firstPage.svg',
    '/oread/web/images/secondaryToolbarButton-documentProperties.svg',
    '/oread/web/images/secondaryToolbarButton-rotateCcw.svg',
    '/oread/web/images/secondaryToolbarButton-rotateCw.svg',
    '/oread/web/images/secondaryToolbarButton-scrollHorizontal.svg',
    '/oread/web/images/secondaryToolbarButton-scrollPage.svg',
    '/oread/web/images/secondaryToolbarButton-scrollVertical.svg',
    '/oread/web/images/secondaryToolbarButton-scrollWrapped.svg',
    '/oread/web/images/secondaryToolbarButton-selectTool.svg',
    '/oread/web/images/secondaryToolbarButton-spreadEven.svg',
    '/oread/web/images/secondaryToolbarButton-spreadNone.svg',
    '/oread/web/images/secondaryToolbarButton-spreadOdd.svg',
    '/oread/web/images/messageBar_warning.svg',
    '/oread/web/images/messageBar_closingButton.svg',
    '/oread/web/images/loading.svg',
    '/oread/web/images/loading-icon.gif',
    '/oread/web/images/gv-toolbarButton-download.svg',
    '/oread/web/images/findbarButton-previous.svg',
    '/oread/web/images/findbarButton-next.svg',
    '/oread/web/images/treeitem-expanded.svg',
    '/oread/web/images/treeitem-collapsed.svg',
    '/oread/web/images/toolbarButton-zoomOut.svg',
    '/oread/web/images/toolbarButton-zoomIn.svg',
    '/oread/web/images/toolbarButton-viewThumbnail.svg',
    '/oread/web/images/toolbarButton-viewOutline.svg',
    '/oread/web/images/toolbarButton-viewLayers.svg',
    '/oread/web/images/toolbarButton-viewAttachments.svg',
    '/oread/web/images/toolbarButton-sidebarToggle.svg',
    '/oread/web/images/toolbarButton-secondaryToolbarToggle.svg',
    '/oread/web/images/toolbarButton-search.svg',
    '/oread/web/images/toolbarButton-print.svg',
    '/oread/web/images/toolbarButton-presentationMode.svg',
    '/oread/web/images/toolbarButton-pageUp.svg',
    '/oread/web/images/toolbarButton-pageDown.svg',
    '/oread/web/images/toolbarButton-openFile.svg',
    '/oread/web/images/toolbarButton-menuArrow.svg',
    '/oread/web/images/toolbarButton-editorStamp.svg',
    '/oread/web/images/toolbarButton-editorSignature.svg',
    '/oread/web/images/toolbarButton-editorInk.svg',
    '/oread/web/images/toolbarButton-editorHighlight.svg',
    '/oread/web/images/toolbarButton-editorFreeText.svg',
    '/oread/web/images/toolbarButton-download.svg',
    '/oread/web/images/toolbarButton-currentOutlineItem.svg',
    '/oread/web/images/toolbarButton-bookmark.svg'
  ];
}

const OFFLINE_ESSENTIALS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Core CSS
  '/assets/style/main.css',
  '/assets/style/ota-update.css',
  '/assets/style/icon-fallback.css',
  // Core JS for Downloads tab and profile dropdown
  '/assets/scripts/main.js',
  '/assets/scripts/caching.js',
  '/assets/scripts/pdf-downloads.js',
  '/assets/scripts/downloads-ui.js',
  '/assets/scripts/profile-image.js',
  '/assets/scripts/theme.js',
  '/assets/scripts/releases.js',
  // Data files
  '/assets/data/releases.json',
  '/assets/app/fonticons.css',
  '/assets/app/hugeicons.css',
  // Font Awesome Kit (external CDN for icons)
  'https://materioa.github.io/kit/6a787c7335.js',
  '/assets/img/materio_new_bk.svg',
  '/assets/img/materio_new_wh.svg',
  '/assets/img/v4_logo.png',
  '/assets/img/default-avatar.svg',
  '/assets/img/icon.svg',
  '/assets/img/icon.png',
  ...getOreadFiles()
];

// Install event - cache essentials
self.addEventListener('install', event => {
  console.log('[SW] Installing v3.3.3 - Improved kit caching with better logging');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(OFFLINE_CACHE);
        
        // Get wallpaper files to cache
        const wallpaperFiles = getWallpaperFiles();
        const allFilesToCache = [...OFFLINE_ESSENTIALS, ...wallpaperFiles];
        
        console.log(`[SW] Caching ${allFilesToCache.length} files including icons, profile dropdown, and wallpapers`);
        
        // Cache essential files one by one
        for (const url of allFilesToCache) {
          try {
            const fetchOptions = {
              mode: url.startsWith('http') ? 'cors' : 'same-origin',
              credentials: 'omit',
              cache: 'reload' // Force fresh fetch
            };
            
            const response = await fetch(url, fetchOptions);
            if (response.ok) {
              await cache.put(url, response);
              
              // Extra logging for external resources
              if (url.startsWith('http')) {
                console.log(`[SW] ✓ Cached external: ${url}`);
              } else {
                console.log(`[SW] ✓ Cached: ${url}`);
              }
            } else {
              console.warn(`[SW] ✗ Failed (${response.status}): ${url}`);
            }
          } catch (error) {
            console.warn(`[SW] ✗ Error caching: ${url}`, error.message);
          }
        }
        
        console.log('[SW] Offline essentials, profile dropdown, icons, and wallpapers cached');
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Install failed:', error);
      }
    })()
  );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', event => {
  console.log('[SW] Activating v3.3.3...');
  event.waitUntil(
    (async () => {
      try {
        // Delete old caches (keep only current version)
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(name => name !== OFFLINE_CACHE)
          .map(name => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          });
        
        await Promise.all(deletePromises);
        await self.clients.claim();
        
        console.log('[SW] Activated - Offline Downloads ready');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// Fetch event - Network first, cache fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// Fetch handler - Always try network first
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // ALWAYS try network first (for fresh content when online)
    const networkResponse = await fetch(request);
    
    // If successful and it's an essential file, update cache in background
    if (networkResponse.ok) {
      const cache = await caches.open(OFFLINE_CACHE);
      
      // Cache response for essential files or same-origin requests or icon kits
      if (url.origin === self.location.origin || 
          OFFLINE_ESSENTIALS.includes(url.pathname) ||
          OFFLINE_ESSENTIALS.includes(url.href) ||
          url.href.includes('fontawesome.com') ||
          url.href.includes('hugeicons.com') ||
          url.href.includes('materioa.github.io/kit')) {
        cache.put(request, networkResponse.clone()).catch(() => {
          // Ignore cache errors silently
        });
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed - user is offline, serve from cache
    console.log('[SW] Offline - serving from cache:', url.pathname);
    return await handleOffline(request);
  }
}

// Offline handler - serve from cache
async function handleOffline(request) {
  const url = new URL(request.url);
  const cache = await caches.open(OFFLINE_CACHE);
  
  // Try exact match first
  let cachedResponse = await cache.match(request);
  
  // If not found and it's the kit URL, try matching with different options
  if (!cachedResponse && url.href.includes('materioa.github.io/kit')) {
    cachedResponse = await cache.match(request, { ignoreSearch: true });
  }
  
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', url.href);
    return cachedResponse;
  }
  
  // For oread viewer, try to find it in cache with ignoreSearch
  if (url.pathname.includes('/oread/')) {
    const oreadPath = url.pathname.split('?')[0]; // Get path without query params
    cachedResponse = await cache.match(oreadPath);
    if (cachedResponse) {
      console.log('[SW] Serving cached oread file:', oreadPath);
      return cachedResponse;
    }
  }
  
  // For HTML pages (but NOT oread viewer), serve cached homepage
  if (request.headers.get('accept')?.includes('text/html') && !url.pathname.includes('/oread/')) {
    const homepage = await cache.match('/') || await cache.match('/index.html');
    if (homepage) {
      console.log('[SW] Serving cached homepage');
      return homepage;
    }
  }
  
  // Nothing in cache - show offline message
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Offline - Materio</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        }
        .container { max-width: 500px; }
        .emoji { font-size: 5em; margin-bottom: 20px; }
        h1 { font-size: 2.5em; margin-bottom: 15px; }
        p { font-size: 1.1em; margin: 10px 0; opacity: 0.9; line-height: 1.6; }
        button {
          margin-top: 30px;
          padding: 15px 40px;
          font-size: 1.1em;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          font-weight: 600;
          transition: transform 0.2s;
        }
        button:hover { transform: translateY(-2px); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">📡</div>
        <h1>You're Offline</h1>
        <p>Some content isn't available offline.</p>
        <p style="font-size: 0.95em;">Your downloaded PDFs are still accessible!</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    }
  );
}

console.log('[SW] Service worker v3.3.3 loaded - Kit URL properly cached with enhanced matching');

} // End of production mode else block
