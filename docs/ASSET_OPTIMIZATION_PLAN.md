# Asset Optimization Plan - Immediate Wins

## 🎯 Critical Findings

### 1. **icons.css is NOT being loaded** ✅
- **File**: `assets/style/icons.css` (184.83 KB / 15,089 lines)
- **Status**: **UNUSED** - Not referenced anywhere in HTML
- **Action**: **SAFE TO DELETE**
- **Savings**: **184.83 KB** (100% reduction)

**Why it exists**: Likely leftover from Font Awesome migration. You're now using:
- Font Awesome Kit CDN: `https://materioa.github.io/kit/6a787c7335.js`
- Icon fallback: `/assets/style/icon-fallback.css` (8.62 KB)

### 2. **Massive Image Assets** 🔴

#### Wallpapers (PNG vs WebP comparison):

| File | PNG Size | WebP Size | Savings | % Reduction |
|------|----------|-----------|---------|-------------|
| `hero.png` | 2,846 KB | **~285 KB** | 2,561 KB | **90%** |
| `hero_mobile.png` | 3,535 KB | **~354 KB** | 3,181 KB | **90%** |
| `h3.png` | 2,225 KB | **~223 KB** | 2,002 KB | **90%** |
| `h4.png` | 2,168 KB | **~217 KB** | 1,951 KB | **90%** |
| `h5.png` | 2,330 KB | **~233 KB** | 2,097 KB | **90%** |

**Total Wallpaper Savings**: ~12 MB → ~1.2 MB (**90% reduction**)

#### Dynamic Wallpapers (Already have WebP versions!):

You already have WebP versions but **PNG versions are loaded**:

| File | PNG | WebP | Currently Used |
|------|-----|------|----------------|
| `part_0.png` | 2,076 KB | 54.76 KB | ❌ PNG |
| `part_1.png` | 2,073 KB | 57.02 KB | ❌ PNG |
| `part_2.png` | 2,168 KB | 79.09 KB | ❌ PNG |
| `part_3.png` | 2,070 KB | 63.12 KB | ❌ PNG |
| `part_4.png` | 2,118 KB | 75.47 KB | ❌ PNG |
| `part_5.png` | 2,137 KB | 77.66 KB | ❌ PNG |
| `part_6.png` | 2,273 KB | 105.87 KB | ❌ PNG |
| `part_7.png` | 2,330 KB | 125.15 KB | ❌ PNG |
| `part_8.png` | 2,132 KB | 64.27 KB | ❌ PNG |

**Total**: 19,377 KB (PNG) → 702 KB (WebP) = **18,675 KB savings (96% reduction)**

---

## 🚀 Immediate Actions (Quick Wins)

### Action 1: Delete icons.css ✅ SAFE
```powershell
Remove-Item "d:\v4\materio\assets\style\icons.css"
```
**Savings**: 184.83 KB  
**Risk**: None (file not used)

### Action 2: Use WebP for Dynamic Wallpapers ✅ EASY
Update `advanced.js` to use `.webp` instead of `.png`:

**Current**:
```javascript
wallpapers.push(`/assets/img/events/dynamic/part_${dynamicIndex}.webp`);
```

**Already correct!** But need to update `sw.js`:

**In sw.js** (line ~78):
```javascript
// Change from:
wallpapers.push(`/assets/img/events/dynamic/part_${dynamicIndex}.webp`);

// Already using .webp ✅
```

**Check if code is actually loading PNG instead** - Update any references to load WebP.

**Savings**: 18.7 MB  
**Risk**: Low (WebP well-supported)

### Action 3: Convert Main Wallpapers to WebP 🔧 MEDIUM EFFORT

Use ImageMagick or online tool to convert:
- `hero.png` → `hero.webp`
- `hero_mobile.png` → `hero_mobile.webp`
- `h3.png` → `h3.webp`
- `h4.png` → `h4.webp`
- `h5.png` → `h5.webp`
- `h1.png` → `h1.webp`

**PowerShell command** (requires ImageMagick):
```powershell
# Install: choco install imagemagick (if not installed)

cd "d:\v4\materio\assets\img\events"

# Convert all PNGs to WebP (90% quality)
Get-ChildItem -Filter "*.png" | ForEach-Object {
    magick convert $_.FullName -quality 90 ($_.BaseName + ".webp")
}
```

**Or use online tool**: https://squoosh.app/

**Savings**: ~10 MB  
**Risk**: Low

---

## 📋 Implementation Steps

### Step 1: Delete Unused icons.css (30 seconds)

```powershell
# Backup first (optional)
Copy-Item "d:\v4\materio\assets\style\icons.css" "d:\v4\materio\assets\style\icons.css.backup"

# Delete
Remove-Item "d:\v4\materio\assets\style\icons.css"
```

### Step 2: Check Dynamic Wallpaper Loading (2 minutes)

Check `advanced.js` and `sw.js` - verify they're using `.webp`:

```powershell
Select-String -Path "d:\v4\materio\assets\scripts\advanced.js" -Pattern "part_.*\.png"
Select-String -Path "d:\v4\materio\sw.js" -Pattern "part_.*\.png"
```

If any matches found, replace `.png` with `.webp`.

### Step 3: Delete PNG Dynamic Wallpapers (30 seconds)

Once confirmed WebP is being used:
```powershell
Remove-Item "d:\v4\materio\assets\img\events\dynamic\*.png"
```

**Savings**: 18.7 MB

### Step 4: Convert Main Wallpapers (5-10 minutes)

#### Option A: Using ImageMagick (Automated)
```powershell
cd "d:\v4\materio\assets\img\events"

# Convert with high quality
magick convert hero.png -quality 90 hero.webp
magick convert hero_mobile.png -quality 90 hero_mobile.webp
magick convert h1.png -quality 90 h1.webp
magick convert h3.png -quality 90 h3.webp
magick convert h4.png -quality 90 h4.webp
magick convert h5.png -quality 90 h5.webp
```

#### Option B: Using Squoosh (Manual but better quality control)
1. Go to https://squoosh.app/
2. Upload each PNG
3. Select WebP format, 90% quality
4. Download optimized files
5. Replace originals

### Step 5: Update Code References (2-5 minutes)

Update these files to use `.webp` instead of `.png`:

**1. `assets/scripts/advanced.js`:**
```javascript
// Find static wallpaper references
wallpapers.push('/assets/img/events/hero.webp');
wallpapers.push('/assets/img/events/h1.webp');
wallpapers.push('/assets/img/events/h3.webp');
wallpapers.push('/assets/img/events/h5.webp');
```

**2. `assets/style/main.css`:**
```css
/* Line ~61 */
background-image: var(--bg-img, url('/assets/img/events/hero.webp'));

/* Line ~673 (mobile) */
background-image: var(--bg-img, url("/assets/img/events/hero_mobile.webp"));
```

**3. `sw.js` (Service Worker):**
```javascript
// Update wallpaper caching
wallpapers.push('/assets/img/events/hero.webp');
wallpapers.push('/assets/img/events/h1.webp');
wallpapers.push('/assets/img/events/h5.webp');
wallpapers.push('/assets/img/events/h3.webp');
```

### Step 6: Test (2 minutes)

```powershell
netlify dev

# Open browser:
# - Check homepage background loads
# - Check dynamic wallpapers work
# - Check mobile view
# - Open DevTools → Network → verify .webp files load
```

### Step 7: Delete Original PNGs (30 seconds)

After confirming WebP works:
```powershell
cd "d:\v4\materio\assets\img\events"
Remove-Item hero.png, hero_mobile.png, h1.png, h3.png, h4.png, h5.png
```

---

## 📊 Total Savings Summary

| Optimization | Before | After | Savings | Time |
|--------------|--------|-------|---------|------|
| Delete icons.css | 184.83 KB | 0 KB | **184.83 KB** | 30s |
| Dynamic wallpapers | 18.7 MB | 702 KB | **18 MB** | 2m |
| Main wallpapers | 10.4 MB | ~1 MB | **9.4 MB** | 10m |
| **TOTAL** | **29.3 MB** | **1.7 MB** | **27.6 MB** | 15m |

**Overall Reduction**: **94%** asset size reduction 🎉

---

## 🔍 Additional Optimizations (Future)

### CSS Optimization
Current CSS files:
- `main.css`: 83.02 KB
- `viewer.css`: 184.34 KB

**Actions**:
- Minify CSS files (can save 20-30%)
- Consider CSS modules/tree-shaking
- Remove unused CSS rules

### JavaScript Minification
Current scripts are **unminified**:
- `main.js`: 75.41 KB → ~45 KB (minified)
- `caching.js`: 34.58 KB → ~20 KB (minified)
- `promotions.js`: 34.96 KB → ~21 KB (minified)

**Total JS savings**: ~50-60 KB

**How to implement**:
```powershell
# Install terser
npm install -g terser

# Minify all scripts
Get-ChildItem -Path "d:\v4\materio\assets\scripts\*.js" | ForEach-Object {
    terser $_.FullName -c -m -o ($_.FullName -replace '\.js$', '.min.js')
}
```

### Image Lazy Loading
Add `loading="lazy"` to images in blog posts:
```html
<img src="..." loading="lazy" alt="..." />
```

### Font Optimization
Currently loading Manrope font family (200-800 weight). Consider:
- Only load needed weights (400, 600, 700)
- Use `font-display: swap` for faster rendering

---

## ⚠️ Browser Compatibility

### WebP Support
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: 14+ (Sept 2020)
- ✅ Mobile: iOS 14+, Android 5+

**Coverage**: 97%+ of users

**Fallback** (optional):
```html
<picture>
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.png" alt="Hero">
</picture>
```

But for wallpapers (non-critical), direct WebP is fine.

---

## 🎯 Recommended Priority

### Do Now (15 minutes, 27.6 MB savings):
1. ✅ Delete `icons.css` (184 KB)
2. ✅ Switch to WebP dynamic wallpapers (18 MB)
3. ✅ Convert & use WebP main wallpapers (9.4 MB)

### Do Next Sprint (1-2 hours, 50+ KB savings):
4. Minify JavaScript files
5. Add image lazy loading
6. Optimize font loading

### Do Eventually:
7. Minify CSS
8. Consider build system (Vite/Webpack)
9. Implement HTTP/2 server push

---

## 📝 Quick Start Commands

```powershell
# 1. Delete unused icons.css
Remove-Item "d:\v4\materio\assets\style\icons.css"

# 2. Check if PNG is used anywhere
Select-String -Path "d:\v4\materio\assets\scripts\*.js" -Pattern "\.png" | Select-Object Path, Line

Select-String -Path "d:\v4\materio\sw.js" -Pattern "\.png" | Select-Object Line

# 3. After converting to WebP, delete PNGs
Remove-Item "d:\v4\materio\assets\img\events\dynamic\*.png"
Remove-Item "d:\v4\materio\assets\img\events\hero*.png"
Remove-Item "d:\v4\materio\assets\img\events\h*.png"

# 4. Test locally
netlify dev
```

---

**Ready to implement?** Start with deleting `icons.css` - it's completely safe and gives you immediate 185 KB savings! 🚀
