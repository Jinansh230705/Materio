# Materio OTA Update System - Hugeicons Migration

## Overview

This OTA (Over-The-Air) update system allows **Plus and Super (Admin) users** to upgrade their Materio interface from FontAwesome icons to modern Hugeicons. The update is optional, exclusive to premium users, and applied instantly without requiring a full page reload.

## Features

### 🎯 User Tier Restrictions
- **Only available to:** Plus Users and Super Users (Admin)
- **Regular users:** Cannot see or access the update
- **Access control:** Based on `localStorage.materio_user` data

### 🎨 Icon Migration
- Automatically replaces FontAwesome icons with Hugeicons
- Covers all major icons:
  - Navigation (home, chat, notifications, settings)
  - Actions (download, refresh, plus, trash)
  - Status (checkmarks, alerts, badges)
  - Social (GitHub)
  - And more...

### 💾 Persistent State
- Update state saved in `localStorage`
- Once installed, icons auto-update on every page load
- No need to reinstall after browser refresh

### 🎭 Seamless Experience
- Progress modal with real-time updates
- Success/error notifications
- Smooth animations and transitions
- Page auto-reloads after installation to apply all changes

## Files Created

### 1. JavaScript - OTA Update Logic
**Location:** `assets/scripts/ota-hugeicons.js`

Key Functions:
- `isPlusOrSuperUser()` - Checks user tier eligibility
- `isOTAInstalled()` - Checks if update is already applied
- `loadHugeiconsCSS()` - Loads Hugeicons stylesheet from CDN
- `migrateIcons()` - Replaces FontAwesome classes with Hugeicons
- `applyOTAUpdate()` - Main update orchestrator
- `autoApplyOTA()` - Auto-applies update on page load if already installed

### 2. CSS - OTA Update Styles
**Location:** `assets/style/ota-update.css`

Includes:
- Update button styling (gradient, hover effects)
- Progress modal overlay
- Success/error notification styles
- Dark mode support
- Mobile responsive design
- Loading animations

### 3. HTML - Update Button UI
**Location:** `_includes/main.html` (lines ~547-553)

Added below the version info card in the settings tab:
```html
<!-- OTA Update Button (Plus/Super Users Only) -->
<div class="card-layout ota-update-card" id="otaUpdateCard" style="display: none;">
    <button id="otaUpdateButton">
        <i class="far fa-download"></i>
        <span>Install Hugeicons Update</span>
        <span class="ota-premium-badge">Plus</span>
    </button>
</div>
```

## Installation

The OTA system is automatically loaded for all users, but only Plus/Super users can see and use it.

### Integration Points

1. **CSS Added to:** `_layouts/default.html`
   ```html
   <link rel="stylesheet" href="{{ '/assets/style/ota-update.css' | relative_url }}">
   ```

2. **JavaScript Added to:** `_layouts/default.html`
   ```html
   <script src="{{ '/assets/scripts/ota-hugeicons.js' | relative_url }}"></script>
   ```

## User Experience Flow

### For Plus/Super Users:

1. **Navigate to Settings Tab**
   - Go to Settings → About the App section
   - Below "Release Overview" card, see "Install Hugeicons Update" button

2. **Click Update Button**
   - Button shows "Installing..." state
   - Progress modal appears with percentage
   - Icons are migrated in real-time

3. **Update Complete**
   - Success notification appears
   - Button changes to "Hugeicons Installed" (green)
   - Page auto-reloads after 2 seconds

4. **Subsequent Page Loads**
   - Icons automatically use Hugeicons
   - No manual action needed
   - Button shows "Installed" state

### For Regular Users:

- Update button is completely hidden
- No visual indication of the feature
- Continue using FontAwesome icons normally

## Icon Mapping

The system uses a comprehensive icon map to translate FontAwesome to Hugeicons:

| FontAwesome | Hugeicons | Usage |
|-------------|-----------|-------|
| `fa-house-chimney` | `hgi-home-01` | Home nav |
| `fa-comments` | `hgi-message-02` | Chat nav |
| `fa-bell` | `hgi-notification-02` | Notifications |
| `fa-cog` | `hgi-settings-01` | Settings |
| `fa-download` | `hgi-download-01` | Downloads |
| `fa-refresh` | `hgi-refresh` | Refresh button |
| `fa-user` | `hgi-user` | User profile |
| ...and 20+ more mappings |

## Technical Details

### CDN Used
```
https://cdn.jsdelivr.net/npm/hugeicons-react@0.3.0/icons.css
```

### LocalStorage Keys
- **OTA State:** `materio_ota_hugeicons` (value: "true" when installed)
- **User Data:** `materio_user` (contains `isPlusUser` and `hasAdminPrivileges`)

### Version
Current OTA Version: `1.0.0-hugeicons`

### Browser Compatibility
- Modern browsers with ES6+ support
- LocalStorage support required
- CSS custom properties support

## Customization

### Adding More Icons

Edit `ICON_MAP` in `ota-hugeicons.js`:

```javascript
const ICON_MAP = {
    'fa-your-icon': 'hgi-replacement-icon',
    // Add more mappings...
};
```

### Changing Update Behavior

Modify these functions:
- `applyOTAUpdate()` - Update installation flow
- `autoApplyOTA()` - Auto-apply behavior
- `showUpdateProgress()` - Progress UI

### Styling Adjustments

Edit `assets/style/ota-update.css`:
- Change button colors/gradients
- Modify animations
- Update notification styles

## Debugging

### Console Logs

The OTA system logs important events:
```
[OTA] Starting Hugeicons migration...
[OTA] Hugeicons CSS loaded successfully
[OTA] Migrated 42 icons from FontAwesome to Hugeicons
[OTA] Update marked as installed
```

### Check Installation Status

Open browser console:
```javascript
// Check if installed
localStorage.getItem('materio_ota_hugeicons')

// Check user eligibility
const user = JSON.parse(localStorage.getItem('materio_user'))
console.log(user.isPlusUser || user.hasAdminPrivileges)

// Get OTA version
window.MaterioOTA.version
```

### Force Reinstall

```javascript
// Clear installation flag
localStorage.removeItem('materio_ota_hugeicons')

// Reload page
window.location.reload()
```

## Known Limitations

1. **Not all icons mapped:** Some specialized FontAwesome icons may not have Hugeicons equivalents
2. **Dynamic content:** Icons added after page load need manual migration
3. **Third-party components:** External components using FontAwesome won't be affected

## Future Enhancements

- [ ] Add more icon mappings
- [ ] Support for custom icon themes
- [ ] Rollback functionality
- [ ] Update notification system
- [ ] Version comparison and auto-updates
- [ ] Icon preview before installation

## Support

For issues or questions:
- GitHub: [Materioa/materio](https://github.com/Materioa/materio)
- Create an issue with tag `ota-update`

## License

Same as Materio main project - see LICENSE.md

---

**Note:** This feature is exclusive to Plus and Super users as part of Materio's premium offering. Regular users continue to enjoy the standard FontAwesome icon experience.
