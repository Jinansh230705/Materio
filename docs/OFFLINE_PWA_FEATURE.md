# Offline PWA Feature - Downloads Support

## Overview
Enhanced PWA functionality to cache homepage UI and automatically redirect users to the Downloads section when offline, allowing them to access previously downloaded PDFs.

## Changes Made

### 1. Service Worker Updates (`sw.js`)
**Version Updated**: `2.0.4` → `2.0.5`

**Cache Names Updated**:
- `materio-v2-0-4` → `materio-v2-0-5`
- `materio-static-v2-0-4` → `materio-static-v2-0-5`
- `materio-dynamic-v2-0-4` → `materio-dynamic-v2-0-5`
- `materio-api-v2-0-4` → `materio-api-v2-0-5`

**New Files Added to STATIC_ASSETS**:
```javascript
'/assets/scripts/pdf-downloads.js',    // IndexedDB PDF storage manager
'/assets/scripts/downloads-ui.js',     // Downloads UI management
```

**Fixed Path**:
```javascript
'/assets/scripts/webapp/pwa.js',  // Corrected from '/assets/scripts/pwa.js'
```

### 2. Offline Detection (`assets/scripts/main.js`)

**New Function Added**:
```javascript
function checkOfflineAndRedirect() {
    if (!navigator.onLine) {
        console.log('[Offline] User is offline, redirecting to downloads tab...');
        
        setTimeout(() => {
            const downloadsTab = document.querySelector('[data-tab="downloads"]');
            if (downloadsTab) {
                downloadsTab.click();
                console.log('[Offline] Switched to downloads tab');
            }
        }, 500);
    }
}
```

**Integrated into DOMContentLoaded**:
- Automatically checks offline status on page load
- Redirects to downloads tab after 500ms delay
- Ensures downloads UI is visible when user is offline

### 3. Existing Functionality Leveraged

**PDF Downloads Manager** (`pdf-downloads.js`):
- Already stores PDFs in IndexedDB with metadata
- Provides `getPDFData()` for offline access
- Manages storage quota (500MB default)

**Downloads UI** (`downloads-ui.js`):
- `openDownload()` function switches to home tab
- Calls `window.loadPdfWithCache()` to open PDF
- Fully functional offline with cached scripts

**Enhanced Caching** (`caching.js`):
- `loadPdfWithCache()` checks IndexedDB first
- Shows "Loading from offline storage..." message
- Falls back to cache, then network
- Works seamlessly offline

## User Flow

### Online Experience (Unchanged)
1. User browses PDFs normally
2. Can download PDFs for offline use (bookmark icon)
3. Downloads appear in Downloads tab

### Offline Experience (New)
1. User opens app without internet connection
2. Homepage UI loads from service worker cache
3. **Automatically redirected to Downloads tab** (new feature)
4. User sees list of previously downloaded PDFs
5. Clicking "Open" on any download:
   - Switches to home tab
   - Opens PDF modal
   - Loads PDF from IndexedDB
   - Shows "Loading from offline storage..." message
   - PDF displays normally from local storage

## Technical Details

### Caching Strategy
- **Homepage UI**: Cached by service worker (STATIC_ASSETS)
- **Downloads Scripts**: Cached for offline functionality
- **PDF Data**: Stored in IndexedDB (separate from service worker cache)

### Storage Breakdown
- **Service Worker Cache**: HTML, CSS, JS files (~5-10MB)
- **IndexedDB**: Downloaded PDFs with metadata (~500MB quota)

### Offline Detection
- Uses `navigator.onLine` property
- Checked on page load (DOMContentLoaded)
- 500ms delay ensures DOM is ready before tab switch

### Tab Switching Logic
1. Find downloads tab: `document.querySelector('[data-tab="downloads"]')`
2. Programmatically click: `downloadsTab.click()`
3. Triggers existing tab switching code
4. Loads downloads list from IndexedDB

## Browser Compatibility
- Chrome/Edge: Full support (PWA + IndexedDB)
- Firefox: Full support
- Safari: Limited (no service worker on iOS < 11.3)
- Opera: Full support

## Testing Instructions

### Test Offline Redirect
1. Visit site while online
2. Download at least one PDF
3. Open DevTools → Network tab
4. Check "Offline" checkbox
5. Refresh page
6. **Expected**: Automatically lands on Downloads tab

### Test Offline PDF Access
1. While offline (from above test)
2. Click "Open" on any downloaded PDF
3. **Expected**: 
   - Switches to home tab
   - Shows "Loading from offline storage..."
   - PDF opens in modal
   - Full functionality (zoom, scroll, etc.)

### Test Online Behavior (Should Be Unchanged)
1. Uncheck "Offline" in DevTools
2. Refresh page
3. **Expected**: Normal homepage view (home tab)
4. No automatic redirect to downloads

## Future Enhancements
- [ ] Show offline indicator badge in UI
- [ ] Display last sync time for cached content
- [ ] Add "Available Offline" badge to downloaded PDFs
- [ ] Sync download status across devices
- [ ] Background sync for pending downloads

## Files Modified
1. `sw.js` - Service worker cache updates
2. `assets/scripts/main.js` - Offline detection
3. `docs/OFFLINE_PWA_FEATURE.md` - This documentation

## Files Already Supporting Offline (No Changes Needed)
1. `assets/scripts/pdf-downloads.js` - IndexedDB storage
2. `assets/scripts/downloads-ui.js` - Downloads UI
3. `assets/scripts/caching.js` - Enhanced caching logic
4. `_includes/main.html` - Downloads tab structure

## Version Info
- **Feature**: Offline Downloads Support
- **Service Worker Version**: 2.0.5
- **Date**: October 1, 2025
- **Status**: ✅ Implemented and Ready for Testing
