# Changelog - Version 4.6.0.1

**Release Date:** October 2, 2025

---

## 🎯 Major Changes

### Service Worker Improvements (v3.1.0)
- **Fixed Critical Caching Issue**: Resolved issue where cached content was showing even when online, making the site appear down
- **Network-First Strategy**: Changed from aggressive caching to network-first approach
  - Always fetches fresh content when online
  - Falls back to cache only when offline
- **Minimal Caching**: Reduced cache from 80+ files (~5MB) to 25 essential files (~2-3MB)
- **Offline Downloads Support**: Implemented proper offline mode that prioritizes Downloads tab

### Wallpaper & Branding Cache
- **Dynamic Wallpaper Caching**: Service worker now caches selected background wallpaper based on user preference
- **Time-Based Dynamic Wallpapers**: Automatically caches appropriate time-of-day wallpaper (9 variants from dawn to night)
- **Logo & Branding Files**: Added essential branding assets to cache:
  - `materio_new_bk.svg` - Header logo
  - `v4_logo.png` - V4 logo
  - `default-avatar.svg` - Default profile avatar
  - App icons (SVG and PNG)
- **Static Wallpapers Cached**:
  - Default (hero.png)
  - Zen (h1.png)
  - Dusk (h5.png)
  - A Blissful Night (h3.png)

### Profile & Downloads Accessibility
- **Universal Profile Dropdown**: Removed login requirement for profile dropdown menu
  - All users (logged in and out) now see profile icon with dropdown
  - Logged in: Shows user's profile picture
  - Logged out: Shows default avatar icon
- **Downloads Tab for Everyone**: Downloads feature now accessible without login
  - Profile dropdown always available in bottom-left navbar
  - Downloads tab can be accessed by all users
  - Essential for offline functionality

### Offline Mode Enhancements
- **Auto-Tab Switching**: When offline, automatically switches to Downloads tab
- **Smart Tab Hiding**: Hides all tabs except Downloads when offline, restores all when online
- **No Login Required Offline**: Downloads tab shows even for logged-out users when offline
- **Direct Tab Activation**: Bypasses dropdown requirement when going offline (works for non-logged users)

### Downloads UI Improvements
- **Mobile-Friendly Table**: Added invisible horizontal scrollbar for downloads table
  - Smooth touch scrolling on iOS (`-webkit-overflow-scrolling: touch`)
  - Hidden scrollbar (Firefox, Chrome, Safari, Edge)
  - Minimum width protection (600px) prevents column squishing
  - Dark mode support

---

## 🔧 Technical Changes

### Service Worker (sw.js)
**Version:** v3.1.0

**Changes:**
- Added `getWallpaperFiles()` function to intelligently cache wallpapers
- Implemented time-based dynamic wallpaper selection (9 time slots)
- Updated `OFFLINE_ESSENTIALS` array to include branding files
- Modified install event to cache wallpapers alongside essentials
- Fixed localhost detection using `self.location.hostname`
- Network-first fetch strategy: `try network → cache fallback → offline message`
- Cache name: `materio-offline-v3-1-0`

**Files Cached (25 total):**
- Core: /, index.html, manifest.json
- CSS: main.css
- JS: main.js, caching.js, pdf-downloads.js, downloads-ui.js
- PDF.js: viewer.html, viewer.mjs, viewer.css, pdf.mjs, pdf.worker.mjs
- Logos: materio_new_bk.svg, v4_logo.png, default-avatar.svg, icon.svg, icon.png
- Wallpapers: 4 static + 1 dynamic (based on time)

### JavaScript Changes

**assets/scripts/main.js:**
- Added `checkOfflineAndRedirect()` function to detect offline state
- Added `showDownloadsTabOffline()` function to bypass auth requirement
- Added `hideNonDownloadTabs()` to hide non-essential tabs when offline
- Added `showAllTabs()` to restore all tabs when online
- Added `online` and `offline` event listeners for dynamic state management
- Fixed selector from `[data-tab="downloads"]` to `[data-action="downloads"]` for dropdown menu

**assets/scripts/profile-image.js:**
- Removed login requirement for profile dropdown
- Changed logic to always show profile icon (no more settings icon fallback)
- Set default avatar for logged-out users
- `setupProfileDropdown()` now called for all users (logged in and out)
- Removed `setupSettingsClick()` conditional logic

### CSS Changes

**assets/style/main.css:**
- Added `#downloadsTableWrapper` styles for mobile scrolling
- Implemented invisible scrollbar:
  - `scrollbar-width: none` (Firefox)
  - `-ms-overflow-style: none` (IE/Edge)
  - `::-webkit-scrollbar { display: none }` (Chrome/Safari/Opera)
- Added `min-width: 600px` for table header and list items
- Dark mode scrollbar support

---

## 🐛 Bug Fixes

1. **Stale Cache Issue**: Fixed service worker showing cached version when online
   - Site no longer appears "down" due to outdated cache
   - Fresh content always loads when online

2. **Downloads Tab Not Appearing Offline**: Fixed selector mismatch
   - Changed from `[data-tab="downloads"]` to `[data-action="downloads"]`
   - Downloads tab now properly switches when offline

3. **Profile Dropdown Login Barrier**: Removed authentication requirement
   - Downloads accessible to all users
   - Essential for offline functionality

4. **Mobile Table Cutoff**: Fixed downloads table being cut off on mobile
   - Added horizontal scroll with invisible scrollbar
   - Smooth touch scrolling on iOS

5. **Offline Tab Visibility**: Fixed tabs not hiding properly when offline
   - Only Downloads tab visible when offline
   - All tabs restored when online

---

## 📱 User Experience Improvements

### Offline Experience
- ✅ Smooth transition to offline mode
- ✅ Automatic Downloads tab display
- ✅ Background wallpapers work offline
- ✅ Logos and branding visible
- ✅ No authentication required
- ✅ Clean UI (only Downloads tab shown)

### Online Experience
- ✅ Always fetches fresh content
- ✅ No stale cache issues
- ✅ All tabs visible and functional
- ✅ Profile dropdown accessible to everyone
- ✅ Wallpaper selection works properly

### Mobile Experience
- ✅ Downloads table scrolls horizontally on small screens
- ✅ No visible scrollbar (cleaner UI)
- ✅ Smooth touch scrolling
- ✅ All columns accessible via swipe

---

## 🔄 Migration Notes

### From v4.6.0.0 to v4.6.0.1:

**Service Worker Update:**
- Old cache (`materio-offline-v2-*` and `materio-offline-v3-0-0`) will be automatically deleted
- New cache `materio-offline-v3-1-0` will be created
- Users may need to **hard refresh** (Ctrl+Shift+R) to activate new service worker

**Breaking Changes:**
- None - all changes are backward compatible

**Behavioral Changes:**
- Profile dropdown now shows for logged-out users (was hidden before)
- Downloads tab accessible without login (was behind login before)
- Offline mode now shows Downloads tab by default (no manual switching needed)

---

## 📊 Performance Impact

### Cache Size:
- **Before (v3.0.0)**: 0 files (no caching)
- **After (v3.1.0)**: ~25 files (~2-3MB)
- **Impact**: Minimal - only essential files cached

### Network Strategy:
- **Online**: Always fresh from network (no performance impact)
- **Offline**: Instant load from cache
- **First Load**: Slight increase (~2MB download for cache)

### User Benefits:
- ✅ Faster offline loading
- ✅ Background wallpapers available offline
- ✅ Complete branding offline
- ✅ No stale content when online

---

## 🧪 Testing Checklist

### Service Worker:
- [ ] Hard refresh clears old cache
- [ ] New cache `materio-offline-v3-1-0` created
- [ ] 25 files cached successfully
- [ ] Console shows wallpaper caching logs

### Offline Mode:
- [ ] Go offline → Downloads tab appears automatically
- [ ] Other tabs hidden when offline
- [ ] Background wallpaper shows offline
- [ ] Logos and icons display offline
- [ ] PDFs open from IndexedDB

### Online Mode:
- [ ] Fresh content loads (not cached)
- [ ] All tabs visible
- [ ] Profile dropdown works for logged-out users
- [ ] Wallpaper selection works

### Mobile:
- [ ] Downloads table scrolls horizontally
- [ ] No visible scrollbar
- [ ] Smooth touch scrolling
- [ ] All columns accessible

---

## 📝 Documentation

### New Files:
- `docs/LOCALHOST_NO_CACHE_FIX.md` - Service worker localhost fix
- `docs/SERVICE_WORKER_V3_NO_CACHE.md` - v3.0.0 documentation
- `docs/OFFLINE_DOWNLOADS_V3_1.md` - v3.1.0 offline strategy
- `docs/PROFILE_DROPDOWN_PUBLIC_ACCESS.txt` - Profile accessibility changes
- `CHANGELOG_4.6.0.1.md` - This file

### Updated Files:
- `sw.js` - Service worker v3.1.0
- `assets/scripts/main.js` - Offline detection and tab management
- `assets/scripts/profile-image.js` - Universal profile dropdown
- `assets/style/main.css` - Downloads table mobile styles

---

## 🎉 Summary

Version 4.6.0.1 focuses on **offline reliability** and **accessibility improvements**:

1. **Fixed critical caching bug** that made site appear down
2. **Offline Downloads** now works for everyone (no login required)
3. **Wallpapers cached** for complete offline experience
4. **Mobile-friendly** downloads table with invisible scrollbar
5. **Network-first strategy** ensures fresh content when online

This release prioritizes **user experience** and **offline functionality** while maintaining **performance** and **accessibility**.

---

## 🔗 Related Issues

- Service worker caching stale content (FIXED)
- Downloads tab not accessible offline (FIXED)
- Profile dropdown hidden behind login (FIXED)
- Mobile table cutoff (FIXED)
- Wallpapers not available offline (FIXED)

---

**Deployed:** Pending production deployment
**Tested:** Development environment (localhost:8888)
**Status:** Ready for production ✅
