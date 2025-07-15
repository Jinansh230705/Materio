// Service Worker for Materio PWA
// Version: 1.0.0
// Skip caching on localhost
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => self.clients.claim());
  self.addEventListener('fetch', (event) => {
    // Pass through all requests without caching
    event.respondWith(fetch(event.request));
  });
  return;
}

const CACHE_NAME = 'materio-v1';
const STATIC_CACHE = 'materio-static-v1';
const DYNAMIC_CACHE = 'materio-dynamic-v1';
const API_CACHE = 'materio-api-v1';

// Essential files that need to be cached for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  
  // CSS Files
  '/assets/style/main.css',
  '/assets/style/notification.css',
  '/assets/style/gestures.css',
  
  // JavaScript Files
  '/assets/scripts/main.js',
  '/assets/scripts/caching.js',
  '/assets/scripts/notify.js',
  '/assets/scripts/releases.js',
  '/assets/scripts/theme.js',
  '/assets/scripts/advanced.js',
  '/assets/scripts/profile-image.js',
  '/assets/scripts/ga.js',
  '/assets/scripts/gestures.js',
  '/assets/scripts/pwa.js',
  
  // Images and Icons
  '/assets/img/materio_new_bk.svg',
  '/assets/img/materio_new_wh.svg',
  '/assets/img/default-avatar.svg',
  
  // Essential data files
  '/assets/data/events.json',
  '/assets/data/releases.json',
  '/databases/semester-subjects.json',
  
  // Account pages
  '/account/index.html',
  '/account/profile.html',
  '/account/files.html',
  '/account/signup.html',
  
  // API essentials
  '/api/v1/health'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/v1\/health/,
  /^\/api\/v1\/profile/,
  /^\/assets\/data\//,
];

// Files to cache dynamically (when accessed)
const DYNAMIC_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:js|css)$/,
  /\.(?:json)$/,
  /\.(?:pdf)$/
];

// Network-first patterns (always try network first)
const NETWORK_FIRST_PATTERNS = [
  /^\/api\/v1\/google-drive/,
  /^\/api\/v1\/auth/,
  /^\/api\/v1\/cdn/
];

// Install event - cache static assets
self.addEventListener('install', event => {
//   console.log('[SW] Installing service worker...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        // console.log('[SW] Caching static assets...');
        
        // Cache essential files one by one to handle errors gracefully
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
            // console.log(`[SW] Cached: ${url}`);
          } catch (error) {
            console.warn(`[SW] Failed to cache: ${url}`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        // console.log('[SW] Static assets cached');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
//   console.log('[SW] Activating service worker...');
  event.waitUntil(
    (async () => {
      try {
        // Take control of all pages immediately
        await self.clients.claim();
        
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deleteCachePromises = cacheNames
          .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map(name => {
            // console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          });
        
        await Promise.all(deleteCachePromises);
        // console.log('[SW] Service worker activated');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// Main fetch handler
async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Special handling for blob cache requests
    if (url.searchParams.has('blob-cache-key')) {
      return await handleBlobCacheRequest(request);
    }
    
    // Strategy 1: Network-first for API calls that need fresh data
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(pathname))) {
      return await networkFirst(request);
    }
    
    // Strategy 2: Cache-first for static assets
    if (STATIC_ASSETS.includes(pathname) || 
        pathname.startsWith('/assets/') || 
        pathname.endsWith('.css') || 
        pathname.endsWith('.js')) {
      return await cacheFirst(request);
    }
    
    // Strategy 3: Stale-while-revalidate for API data
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(pathname))) {
      return await staleWhileRevalidate(request);
    }
    
    // Strategy 4: Cache-first with network fallback for dynamic content
    if (DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(pathname))) {
      return await cacheFirstWithNetworkFallback(request);
    }
    
    // Strategy 5: Network-first with cache fallback for everything else
    return await networkFirstWithCacheFallback(request);
    
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return await handleOfflineFallback(request);
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, no cache available:', request.url);
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache (network failed):', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Always try to update the cache in the background
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Silently fail network requests in background
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Don't await the network promise to avoid blocking
    networkPromise;
    return cachedResponse;
  }
  
  // If no cache, wait for network
  try {
    return await networkPromise;
  } catch (error) {
    throw error;
  }
}

// Cache-first with network fallback
async function cacheFirstWithNetworkFallback(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Network-first with cache fallback
async function networkFirstWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Offline fallback handler
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // For HTML requests, return the main page
  if (request.headers.get('accept').includes('text/html')) {
    const cache = await caches.open(STATIC_CACHE);
    const fallbackResponse = await cache.match('/') || await cache.match('/index.html');
    if (fallbackResponse) {
      return fallbackResponse;
    }
  }
  
  // For API requests, return a custom offline response
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature requires an internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
    // For other requests, return a generic offline response
  return new Response('Offline', { status: 503 });
}

// Blob cache storage for PDF optimization
const blobCacheMap = new Map();

// Handle blob cache requests
async function handleBlobCacheRequest(request) {
  const url = new URL(request.url);
  const cacheKey = url.searchParams.get('blob-cache-key');
  
  if (blobCacheMap.has(cacheKey)) {
    const cachedBlob = blobCacheMap.get(cacheKey);
    return new Response(cachedBlob.data, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': cachedBlob.size.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Accept-Ranges': 'bytes'
      }
    });
  }
  
  // If not in cache, return 404
  return new Response('Not Found', { status: 404 });
}

// Store blob in cache
function storeBlobInCache(key, arrayBuffer, size) {
  blobCacheMap.set(key, {
    data: arrayBuffer,
    size: size,
    timestamp: Date.now()
  });
  
  // Clean up old entries (keep max 10 cached PDFs)
  if (blobCacheMap.size > 10) {
    const entries = Array.from(blobCacheMap.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const oldestKey = entries[0][0];
    blobCacheMap.delete(oldestKey);
  }
}

// Message handling for manual cache updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    event.waitUntil(updateCache(event.data.urls));
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
  
  if (event.data && event.data.type === 'STORE_BLOB_CACHE') {
    const { key, arrayBuffer, size } = event.data;
    storeBlobInCache(key, arrayBuffer, size);
    // Send confirmation back
    event.ports[0]?.postMessage({ success: true });
  }
    if (event.data && event.data.type === 'GET_BLOB_CACHE') {
    const { key } = event.data;
    const cached = blobCacheMap.get(key);
    event.ports[0]?.postMessage({ 
      success: !!cached,
      data: cached || null 
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_BLOB_CACHE') {
    blobCacheMap.clear();
    event.ports[0]?.postMessage({ success: true });
  }
});

// Manually update cache
async function updateCache(urls = []) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachePromises = urls.map(url => 
      fetch(url).then(response => {
        if (response.ok) {
          cache.put(url, response.clone());
        }
      }).catch(error => {
        console.warn(`[SW] Failed to update cache for: ${url}`, error);
      })
    );
    await Promise.allSettled(cachePromises);
    // console.log('[SW] Cache updated');
  } catch (error) {
    console.error('[SW] Cache update failed:', error);
  }
}

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(name => caches.delete(name));
    await Promise.all(deletePromises);
    // console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Cache clearing failed:', error);
  }
}

// Background sync for when connectivity is restored
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Retry failed requests or sync data when back online
    // console.log('[SW] Background sync triggered');
    
    // You can implement specific sync logic here
    // For example, sync user data, upload pending files, etc.
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/img/icon.svg',
    badge: '/assets/img/icon.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open',
        icon: '/assets/img/icon.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/img/icon.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Materio', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// console.log('[SW] Service worker script loaded');
