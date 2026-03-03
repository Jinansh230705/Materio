# Downloads UI - Static IDs for Theme Switcher (Minimal Table Design)

## 📋 All Table IDs and Classes

### Main Container Elements (Static IDs in HTML)

```javascript
// Main containers
'storageInfoCard'           // Storage info card at top
'downloadsBoard'            // Downloads board container
'downloadsLoading'          // Loading state
'downloadsEmpty'            // Empty state message
'downloadsTableWrapper'     // Table wrapper (shown when downloads exist)
'downloadsTableHeader'      // Table header row
'downloadsList'             // Container for all download rows
'storageStats'              // Storage stats text
'storageBar'                // Storage progress bar
'clearAllDownloadsBtn'      // Clear all button
```

### Individual Download Row IDs (Dynamic)
Each downloaded PDF generates this ID:

```javascript
// Pattern: 'download-row-{hash}'
'download-row-XXXXXXXXX'    // Main row (where XXXXXXXXX = First 32 chars of base64(url))
```

### CSS Classes for Bulk Selection

```javascript
// Row classes
'.download-row'             // All download rows
'.download-name'            // All name cells
'.download-subject'         // All subject cells
'.download-semester'        // All semester cells
'.download-size'            // All size cells
'.download-actions'         // All action button containers
'.open-download-btn'        // All open buttons (external link icon)
'.delete-download-btn'      // All delete buttons (trash icon)
```

---

## 🎨 Theme Switcher Integration

### Elements to Style for Dark/Light Mode:

#### 1. Storage Info Card
```javascript
// ID: 'storageInfoCard'
// Already has class: 'card-layout'
```

#### 2. Table Header
```javascript
// ID: 'downloadsTableHeader'
const header = document.getElementById('downloadsTableHeader');
header.style.background = isDark 
    ? 'rgba(255, 130, 0, 0.15)' 
    : 'rgba(255, 130, 0, 0.1)';
header.style.color = isDark ? '#ffffff' : '#000000';
```

#### 3. Download Rows
```javascript
// Class: '.download-row'
document.querySelectorAll('.download-row').forEach(row => {
    row.style.borderColor = isDark ? '#444' : '#e0e0e0'; // Light grey in dark mode
    row.style.color = isDark ? '#ffffff' : '#000000';
});
```

#### 4. Row Text (Name)
```javascript
// Class: '.download-name'
document.querySelectorAll('.download-name').forEach(name => {
    name.style.color = isDark ? '#ffffff' : '#000000';
});
```

#### 5. Secondary Text (Subject, Semester, Size)
```javascript
// Classes: '.download-subject', '.download-semester', '.download-size'
const secondarySelectors = '.download-subject, .download-semester, .download-size';
document.querySelectorAll(secondarySelectors).forEach(el => {
    el.style.color = isDark ? '#aaaaaa' : '#666666';
});
```

#### 6. Storage Stats
```javascript
// ID: 'storageStats'
document.getElementById('storageStats').style.color = isDark ? '#aaa' : '#666';
```

#### 7. Empty State
```javascript
// ID: 'downloadsEmpty'
const empty = document.getElementById('downloadsEmpty');
empty.style.color = isDark ? '#aaa' : '#000';
```

---

## 📝 Complete Theme Switcher Code Example

Add this to your theme switcher file:

```javascript
// In your theme.js or wherever you handle theme switching

function updateDownloadsTheme(isDark) {
    // Table Header
    const header = document.getElementById('downloadsTableHeader');
    if (header) {
        header.style.background = isDark 
            ? 'rgba(255, 130, 0, 0.15)' 
            : 'rgba(255, 130, 0, 0.1)';
        header.style.color = isDark ? '#ffffff' : '#000000';
    }
    
    // Download Rows
    document.querySelectorAll('.download-row').forEach(row => {
        row.style.borderColor = isDark ? '#444' : '#e0e0e0'; // Light grey in dark mode
    });
    
    // Name text (primary)
    document.querySelectorAll('.download-name').forEach(name => {
        name.style.color = isDark ? '#ffffff' : '#000000';
    });
    
    // Secondary text (subject, semester, size)
    const secondarySelectors = '.download-subject, .download-semester, .download-size';
    document.querySelectorAll(secondarySelectors).forEach(el => {
        el.style.color = isDark ? '#aaaaaa' : '#666666';
    });
    
    // Storage Stats
    const storageStats = document.getElementById('storageStats');
    if (storageStats) {
        storageStats.style.color = isDark ? '#aaa' : '#666';
    }
    
    // Storage Info Card (if not handled by .card-layout)
    const storageCard = document.getElementById('storageInfoCard');
    if (storageCard) {
        storageCard.style.background = isDark ? '#1e1e1e' : '#ffffff';
        storageCard.style.color = isDark ? '#ffffff' : '#000000';
    }
    
    // Empty State
    const empty = document.getElementById('downloadsEmpty');
    if (empty) {
        empty.style.color = isDark ? '#aaa' : '#000';
    }
}

// Call this when theme changes
// updateDownloadsTheme(isDarkMode);
```

---

## 🔍 Quick Reference

### Static IDs (Always Present)
```
storageInfoCard
downloadsBoard
downloadsLoading
downloadsEmpty
downloadsList
storageStats
storageBar
clearAllDownloadsBtn
```

### Dynamic IDs (Created per download)
```
download-card-{hash}
download-card-{hash}-icon
download-card-{hash}-title
download-card-{hash}-meta
download-card-{hash}-open-btn
download-card-{hash}-delete-btn
```

### Classes (For bulk selection)
```
.download-card
.download-card-icon
.download-card-title
.download-card-meta
.download-card-button
.open-download-btn
.delete-download-btn
```

---

## 💡 Pro Tip

Use **class selectors** (`.download-card`) instead of dynamic IDs for theme switching, since the IDs change based on each PDF's URL. This makes your theme switcher code cleaner and more maintainable!

---

## ✅ Checklist for Theme Integration

- [ ] Add `.download-card` to card-layout theme styles
- [ ] Style `.download-card-title` for light/dark text
- [ ] Style `.download-card-meta` for secondary text
- [ ] Style `#storageInfoCard` (or use existing card-layout styles)
- [ ] Style `#storageStats` text color
- [ ] Style `#downloadsEmpty` text color
- [ ] Test theme switching on downloads tab
- [ ] Ensure buttons maintain their brand colors (orange/red)

The buttons (open/delete) should keep their brand colors regardless of theme, but you can add slight variations if needed!
