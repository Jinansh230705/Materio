# PDF Offline Download Feature - Implementation Guide

## Overview
This implementation adds a YouTube-style offline download feature for PDFs, storing them persistently in IndexedDB (not blob URLs) for true offline access.

## Key Features

### 1. **Persistent Storage with IndexedDB**
- PDFs are stored in IndexedDB, not temporary blob URLs
- Storage persists across browser sessions
- 500MB storage limit with visual usage indicator
- Automatic cleanup of oldest downloads when space is needed

### 2. **Download Button**
Located in the PDF popup controls:
- **Orange download icon**: PDF not downloaded - click to download
- **Green check icon**: PDF already downloaded - ready for offline use
- **Spinner icon**: Download in progress

### 3. **Downloads Management Tab**
New tab in the navigation bar (download icon):
- View all downloaded PDFs
- Storage usage indicator with progress bar
- Open downloaded PDFs directly
- Delete individual PDFs
- Clear all downloads option

### 4. **Smart PDF Loading**
The system prioritizes downloads:
1. Check if PDF is downloaded in IndexedDB → Load instantly
2. If not, check memory cache → Load from cache
3. If neither, fetch from network → Load and cache

### 5. **Offline Support**
- Downloaded PDFs work completely offline
- Non-downloaded PDFs show helpful error message when offline
- Automatic fallback to downloads when network is unavailable

## Files Created/Modified

### New Files Created:
1. **`assets/scripts/pdf-downloads.js`**
   - Core IndexedDB manager class
   - Handles download, storage, retrieval, and deletion
   - Storage quota management
   - File size utilities

2. **`assets/scripts/downloads-ui.js`**
   - Downloads tab UI management
   - Display downloaded PDFs in cards
   - Storage usage visualization
   - Delete and clear functionality

### Modified Files:
1. **`_includes/main.html`**
   - Added download button to popup controls
   - Added downloads tab to navigation
   - Uncommented and enhanced downloads section UI

2. **`assets/scripts/caching.js`**
   - Integrated download functionality
   - Added download button click handler
   - Enhanced PDF loading to check IndexedDB first
   - Shared state between bookmark and download features

3. **`_layouts/default.html`**
   - Added script references in correct order
   - Ensures pdf-downloads.js loads before caching.js

## How It Works

### Download Process:
```javascript
// When user clicks download button:
1. Check if already downloaded → Show "already downloaded"
2. Show loading spinner
3. Fetch PDF from CDN
4. Convert to ArrayBuffer
5. Store in IndexedDB with metadata
6. Show success notification
7. Update button to green check
```

### Loading Process:
```javascript
// When user opens a PDF:
1. Check IndexedDB for downloaded version → Load from IndexedDB
2. If not downloaded, check memory cache → Load from cache
3. If not cached, fetch from network → Load and cache
4. Send data to PDF.js iframe for rendering
```

### Data Structure in IndexedDB:
```javascript
{
  url: "https://cdn-materioa.netlify.app/pdfs/...",
  title: "Topic Name",
  subject: "Subject Name",
  semester: "Semester 5",
  fileSize: 1234567,
  mimeType: "application/pdf",
  data: ArrayBuffer,
  downloadedAt: 1704123456789,
  lastAccessedAt: 1704123456789
}
```

## Usage

### For Users:
1. Open any PDF in the app
2. Click the **download icon** in the popup controls
3. Wait for download to complete (green check appears)
4. PDF is now available offline!
5. View all downloads in the **Downloads tab** (5th icon in navbar)
6. Manage storage and delete old downloads as needed

### Storage Management:
- Visual progress bar shows storage usage
- Displays: `X files • Y MB of 500 MB used`
- Color changes: Green → Yellow (75%) → Red (90%)
- Delete individual files or clear all at once

### Offline Access:
- Downloaded PDFs work completely offline
- Non-downloaded PDFs show offline error
- No internet connection required for downloaded content

## Technical Details

### Why IndexedDB Instead of Blob URLs?
- **Blob URLs**: Temporary, cleared on page reload, not truly offline
- **IndexedDB**: Persistent, survives browser restarts, true offline storage

### Storage Limits:
- Maximum: 500 MB (configurable in `pdf-downloads.js`)
- Automatic LRU (Least Recently Used) cleanup available
- User can manually manage storage

### Performance:
- Downloads happen in background
- Cached ArrayBuffers for instant loading
- Efficient transfer to PDF.js iframe
- No duplicate storage (checks before downloading)

### Browser Compatibility:
- All modern browsers support IndexedDB
- Graceful fallback if IndexedDB unavailable
- Works in Chrome, Firefox, Safari, Edge

## Future Enhancements

Possible additions:
1. Background download queue
2. Auto-download frequently accessed PDFs
3. Download folders/categories
4. Export/import downloads
5. Compression for smaller storage footprint
6. Sync downloads across devices (requires backend)

## Troubleshooting

### Download button not appearing:
- Check that `pdf-downloads.js` is loaded before `caching.js`
- Verify IndexedDB is available in browser

### "Storage quota exceeded" error:
- Delete old downloads from Downloads tab
- Increase `maxStorageSize` in `pdf-downloads.js`

### PDFs not loading offline:
- Ensure PDF was actually downloaded (green check icon)
- Check browser's IndexedDB storage (DevTools → Application → IndexedDB)

### Performance issues:
- Clear old downloads to free memory
- Check storage usage in Downloads tab
- Consider reducing PDF cache size

## Developer Notes

### Extending the System:
```javascript
// Access the download manager globally:
window.pdfDownloadManager.downloadPDF(url, metadata)
window.pdfDownloadManager.getAllDownloads()
window.pdfDownloadManager.deletePDF(url)
window.pdfDownloadManager.getStorageInfo()
```

### Events to Listen For:
- Watch for `loadPdfWithCache` calls
- Monitor IndexedDB transactions
- Track download completion via promises

### Debugging:
```javascript
// Check downloads in console:
window.pdfDownloadManager.getAllDownloads()
  .then(downloads => console.log(downloads));

// Check storage info:
window.pdfDownloadManager.getStorageInfo()
  .then(info => console.log(info));
```

---

## Summary

This implementation provides a complete offline download solution for PDFs, similar to YouTube's offline video feature. Users can download PDFs for permanent offline access, manage their downloads with an intuitive UI, and enjoy instant loading of frequently accessed content. The system uses IndexedDB for persistent storage and integrates seamlessly with the existing PDF.js viewer.
