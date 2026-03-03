const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const crypto = require('crypto');

const buildDir = '_site';
const cacheFile = '.asset-hash-cache.json';

console.log(`Versioning assets in ${buildDir} using content hashing...`);

// Load persistent cache
let assetCache = {};
if (fs.existsSync(cacheFile)) {
  try {
    assetCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (e) {
    console.warn('Failed to load asset cache, starting fresh.');
  }
}

// In-memory cache for this run (to handle multiple references to same file)
const fileHashCache = new Map();
let cacheHits = 0;
let cacheMisses = 0;

function getFileHash(filePath) {
  // 1. Check in-memory cache first
  if (fileHashCache.has(filePath)) {
    return fileHashCache.get(filePath);
  }

  // 2. Try to map to source file to use persistent cache
  // filePath is like '_site/assets/style/style.css'
  // sourcePath should be 'assets/style/style.css'
  let relativePath = path.relative(buildDir, filePath);
  let sourcePath = relativePath; // Assuming 1:1 mapping for assets

  // Normalize key to forward slashes for consistency across OS
  const cacheKey = sourcePath.split(path.sep).join('/');

  // Check if source file exists
  if (fs.existsSync(sourcePath)) {
    const stats = fs.statSync(sourcePath);
    const mtime = stats.mtimeMs;

    if (assetCache[cacheKey] && assetCache[cacheKey].mtime === mtime) {
      // Cache hit!
      cacheHits++;
      const hash = assetCache[cacheKey].hash;
      fileHashCache.set(filePath, hash);
      return hash;
    }
  }

  // 3. Calculate hash from build file
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    cacheMisses++;
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 10);

    fileHashCache.set(filePath, hash);

    // Update persistent cache if source exists
    if (fs.existsSync(sourcePath)) {
      const stats = fs.statSync(sourcePath);
      assetCache[cacheKey] = {
        mtime: stats.mtimeMs,
        hash: hash
      };
    }

    return hash;
  } catch (e) {
    console.warn(`Warning: Could not hash file ${filePath}: ${e.message}`);
    return null;
  }
}

// Helper function to add version hash to a URL
function addVersionToUrl(url, hash) {
  if (url.match(/(\?|&)v=[^&]*/)) {
    // Replace existing v parameter
    return url.replace(/(\?|&)v=[^&]*/, `$1v=${hash}`);
  } else {
    // Handle existing query params (like ?t=timestamp)
    // Remove timestamp params first as we're replacing with content hash
    let cleanUrl = url.replace(/(\?|&)t=\d+/, '');
    // Clean up any leftover ? or &
    cleanUrl = cleanUrl.replace(/\?$/, '').replace(/\?&/, '?');
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}v=${hash}`;
  }
}

try {
  // ========================================
  // PASS 1: Version CSS/JS in HTML files
  // ========================================
  const htmlFiles = globSync(`${buildDir}/**/*.html`);
  let htmlUpdatedCount = 0;

  if (htmlFiles.length > 0) {
    htmlFiles.forEach(file => {
      // Skip directories
      if (fs.statSync(file).isDirectory()) return;
      let content = fs.readFileSync(file, 'utf8');
      let fileChanged = false;

      // Regex to match href="..." or src="..."
      const regex = /(href|src)=("|')([^"']+)("|')/gi;

      const newContent = content.replace(regex, (match, attr, quote1, url, quote2) => {
        // 1. Extract clean path (remove query and hash)
        const cleanUrl = url.split('?')[0].split('#')[0];

        // 2. Check extension - now includes JSON
        if (!cleanUrl.match(/\.(css|js|json)$/i)) {
          return match;
        }

        // 3. Skip external links
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
          return match;
        }

        // 4. Resolve file path
        let assetPath;
        if (cleanUrl.startsWith('/')) {
          assetPath = path.join(buildDir, cleanUrl);
        } else {
          assetPath = path.join(path.dirname(file), cleanUrl);
        }

        // 5. Get content hash
        const hash = getFileHash(assetPath);
        if (!hash) return match;

        // 6. Construct new URL
        const newUrl = addVersionToUrl(url, hash);

        if (newUrl === url) return match;

        fileChanged = true;
        return `${attr}=${quote1}${newUrl}${quote2}`;
      });

      if (fileChanged) {
        fs.writeFileSync(file, newContent);
        htmlUpdatedCount++;
      }
    });
  }

  // ========================================
  // PASS 2: Version JSON in JS files
  // ========================================
  const jsFiles = globSync(`${buildDir}/**/*.js`);
  let jsUpdatedCount = 0;
  let jsonRefsUpdated = 0;

  if (jsFiles.length > 0) {
    jsFiles.forEach(file => {
      // Skip directories
      if (fs.statSync(file).isDirectory()) return;
      let content = fs.readFileSync(file, 'utf8');
      let fileChanged = false;

      // Match fetch() calls with local JSON paths
      // Patterns: fetch('/path/to.json'), fetch("/path/to.json"), fetch(`/path/to.json`)
      // Also handle query params like ?t=${timestamp} or ?t=123
      const fetchJsonRegex = /fetch\s*\(\s*(['"`])([^'"`]*\.json)([^'"`]*)\1/gi;

      const newContent = content.replace(fetchJsonRegex, (match, quote, jsonPath, queryPart) => {
        // Skip external URLs
        if (jsonPath.startsWith('http://') || jsonPath.startsWith('https://') || jsonPath.startsWith('//')) {
          return match;
        }

        // Skip non-local paths (must start with / for root-relative)
        if (!jsonPath.startsWith('/')) {
          return match;
        }

        // Extract clean path
        const cleanPath = jsonPath.split('?')[0].split('#')[0];

        // Resolve file path
        const assetPath = path.join(buildDir, cleanPath);

        // Get content hash
        const hash = getFileHash(assetPath);
        if (!hash) return match;

        // Check if already has our version
        const fullUrl = jsonPath + queryPart;
        if (fullUrl.includes(`v=${hash}`)) {
          return match;
        }

        // Build new URL - replace any existing cache-busting with version hash
        let newUrl;
        if (queryPart.includes('v=')) {
          // Replace existing version
          newUrl = jsonPath + queryPart.replace(/v=[^&'"`)]+/, `v=${hash}`);
        } else if (queryPart.match(/\?\s*\+/) || queryPart.match(/\$\{.*\}/)) {
          // Has dynamic query (like ?t=${timestamp} or ? + Date.now())
          // Replace with static version
          newUrl = `${cleanPath}?v=${hash}`;
        } else if (queryPart) {
          // Has other query params, append version
          newUrl = jsonPath + queryPart.replace(/['"`]/, '') + '&v=' + hash;
        } else {
          // No query params
          newUrl = `${jsonPath}?v=${hash}`;
        }

        fileChanged = true;
        jsonRefsUpdated++;
        return `fetch(${quote}${newUrl}${quote}`;
      });

      if (fileChanged) {
        fs.writeFileSync(file, newContent);
        jsUpdatedCount++;
      }
    });
  }

  // Save persistent cache
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(assetCache, null, 2));
  } catch (e) {
    console.warn('Failed to save asset cache:', e.message);
  }

  console.log(`Asset hashing complete: ${cacheHits} cache hits, ${cacheMisses} cache misses.`);
  console.log(`HTML: Injected content hashes into ${htmlUpdatedCount} files.`);
  console.log(`JS: Updated ${jsonRefsUpdated} JSON references in ${jsUpdatedCount} files.`);

} catch (error) {
  console.error('Error versioning assets:', error);
  process.exit(1);
}
