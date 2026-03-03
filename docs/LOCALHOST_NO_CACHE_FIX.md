# Localhost Caching Fix - Version 2.0.9

## Problem

Service worker was **caching files on localhost** during development, causing:
- ❌ Fresh code changes not appearing (cached old versions served)
- ❌ Hard refresh needed to see updates
- ❌ Confusion between cached and live versions
- ❌ Development workflow disrupted

## Root Cause

Previous implementation had **incomplete localhost detection**:
```javascript
// ❌ OLD: Checks were inside event listeners
if (isLocalhost()) {
  // Skip caching
}
// BUT: Other code still executed and could cache
```

The service worker was registering and partially caching even on localhost.

## Solution

**Complete separation** between localhost (development) and production modes:

### New Structure (v2.0.9)

```javascript
// Check hostname ONCE at the top
const isLocalhost = () => {
  const hostname = self.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.includes('localhost') || 
         hostname.includes(':8888');
};

// SPLIT: Localhost vs Production
if (isLocalhost()) {
  // ✅ LOCALHOST MODE: No caching at all
  console.log('[SW] Localhost - pass-through mode (NO CACHING)');
  
  self.addEventListener('install', () => {
    console.log('[SW] Install: Localhost mode - no caching');
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[SW] Activate: Localhost mode - taking control');
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener('fetch', (event) => {
    // Just pass through - no caching
    event.respondWith(fetch(event.request));
  });
  
} else {
  // ✅ PRODUCTION MODE: Full caching logic
  console.log('[SW] Production mode - full caching enabled');
  
  // All the caching code goes here
  // (install, activate, fetch with caching)
}
```

## Key Changes

### 1. Early Split
```javascript
if (isLocalhost()) {
  // Development mode - NO caching
} else {
  // Production mode - full caching
}
```

### 2. Localhost Detection Improved
```javascript
const isLocalhost = () => {
  const hostname = self.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.includes('localhost') ||
         hostname.includes(':8888'); // Added port check
};
```

### 3. Version Bump
```javascript
// v2.0.8 → v2.0.9
const CACHE_NAME = 'materio-v2-0-9';
const STATIC_CACHE = 'materio-static-v2-0-9';
const DYNAMIC_CACHE = 'materio-dynamic-v2-0-9';
const API_CACHE = 'materio-api-v2-0-9';
```

### 4. Clean Event Listeners

**Localhost (Development)**:
```javascript
// Install: Just skip waiting, no caching
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: Just take control
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch: Pass through everything
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
```

**Production**:
```javascript
// Install: Cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(cacheStaticAssets());
});

// Activate: Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(cleanOldCaches());
});

// Fetch: Network-first with cache fallback
self.addEventListener('fetch', event => {
  event.respondWith(handleFetch(request));
});
```

## Benefits

### Development (Localhost)
✅ **No caching** - always fresh from dev server
✅ **No cache confusion** - what you see is what's in your files
✅ **Fast development** - no need to clear cache constantly
✅ **Hot reload works** - Jekyll/Netlify dev server works normally

### Production (Live Site)
✅ **Full offline support** - complete caching functionality
✅ **Network-first strategy** - always fresh when online
✅ **Offline fallback** - cached content when offline
✅ **PWA features** - downloads, offline reading, etc.

## Testing

### Verify Localhost Mode

1. **Start dev server**:
   ```powershell
   netlify dev
   ```

2. **Open browser**: `http://localhost:8888`

3. **Check console**:
   ```
   [SW] Localhost detected - service worker in pass-through mode (NO CACHING)
   [SW] Install: Localhost mode - no caching
   [SW] Activate: Localhost mode - taking control
   ```

4. **Verify pass-through**:
   - DevTools → Network tab
   - All requests show "200 OK" from server (not from ServiceWorker)
   - No "(from ServiceWorker)" label

5. **Test fresh updates**:
   - Edit a file (e.g., main.html)
   - Save
   - Refresh browser
   - ✅ Changes appear immediately

### Verify Production Mode

1. **Deploy to production**:
   ```bash
   git add .
   git commit -m "Fix: Service worker localhost caching"
   git push
   ```

2. **Visit live site**: `https://materioa.netlify.app`

3. **Check console**:
   ```
   [SW] Production mode - full caching enabled
   [SW] Installing service worker...
   [SW] Caching static assets...
   [SW] Installation complete - site ready for offline use
   ```

4. **Verify caching**:
   - DevTools → Application → Cache Storage
   - Should see: `materio-static-v2-0-9`, `materio-dynamic-v2-0-9`, etc.
   - Check contents: homepage, CSS, JS, PDF.js files

5. **Test offline**:
   - DevTools → Network → Offline ☑️
   - Refresh page
   - ✅ Site works offline with cached content

## Comparison

| Feature | Localhost (Dev) | Production (Live) |
|---------|----------------|-------------------|
| **Caching** | ❌ Disabled | ✅ Enabled |
| **Service Worker** | ✅ Registered (pass-through) | ✅ Registered (full) |
| **Install Event** | Skip waiting only | Cache 80+ files |
| **Activate Event** | Claim clients only | Clean old caches |
| **Fetch Event** | Pass through | Network-first + cache |
| **Offline Support** | ❌ Not available | ✅ Full support |
| **PWA Features** | ❌ Disabled | ✅ Enabled |
| **Hot Reload** | ✅ Works | N/A |
| **Fresh Updates** | ✅ Always | ✅ When online |

## Troubleshooting

### Problem: Still seeing cached content on localhost

**Solution**:
1. **Unregister old service worker**:
   - DevTools → Application → Service Workers
   - Click "Unregister" on all service workers

2. **Clear all caches**:
   - DevTools → Application → Clear Storage
   - Click "Clear site data"

3. **Hard refresh**:
   - Windows: `Ctrl + Shift + R`
   - Or: `Ctrl + F5`

4. **Restart dev server**:
   ```powershell
   # Stop server (Ctrl+C)
   netlify dev
   ```

5. **Check console** for:
   ```
   [SW] Localhost detected - service worker in pass-through mode (NO CACHING)
   ```

### Problem: Service worker not registering at all

**Check**:
1. **Syntax errors**:
   ```powershell
   node --check sw.js
   ```

2. **Console errors**:
   - Open DevTools → Console
   - Look for red errors

3. **Service worker panel**:
   - DevTools → Application → Service Workers
   - Check for error messages

### Problem: Production site not caching

**Check**:
1. **Hostname detection**:
   - Console should show: `[SW] Production mode - full caching enabled`
   - NOT: `[SW] Localhost detected...`

2. **Cache creation**:
   - DevTools → Application → Cache Storage
   - Should see caches with v2-0-9

3. **Network requests**:
   - DevTools → Network
   - Online: Should see "200 OK" from server
   - Offline: Should see "(from ServiceWorker)"

## Files Modified

### sw.js
- Added early if/else split for localhost vs production
- Improved `isLocalhost()` detection (added port check)
- Wrapped all caching logic in production mode else block
- Removed duplicate localhost checks from event listeners
- Version bump: v2.0.8 → v2.0.9
- Cache names updated: all to v2-0-9

## Migration Notes

### From v2.0.8 to v2.0.9

**What changed**:
- Service worker structure completely reorganized
- Localhost detection moved to top-level if/else
- No functional changes to production caching logic

**What stayed the same**:
- Network-first strategy (production)
- All cached files (production)
- Offline functionality (production)
- No auto-refresh behavior

**User impact**:
- Development: Better experience, no cache issues
- Production: No impact, same functionality
- Service worker will auto-update to v2.0.9

## Related Documentation

- [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) - Full caching strategy explanation
- [OFFLINE_PWA_FEATURE.md](./OFFLINE_PWA_FEATURE.md) - Offline feature documentation
- [OFFLINE_PDF_VIEWER_FIX.md](./OFFLINE_PDF_VIEWER_FIX.md) - PDF offline viewing

---

**Date**: October 2, 2025  
**Version**: 2.0.9  
**Status**: Production Ready  
**Fix**: Localhost no longer caches (development mode) ✅
