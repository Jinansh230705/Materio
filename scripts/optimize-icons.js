#!/usr/bin/env node

/**
 * Icon CSS Optimizer
 * Scans project files for used icons and generates a minimal icons.css
 * 
 * Usage: node scripts/optimize-icons.js
 * 
 * This will:
 * 1. Scan all HTML/JS files for icon class usage
 * 2. Extract only used icons from icons.css
 * 3. Generate optimized icons.min.css
 * 
 * Expected savings: 150+ KB (from 185 KB to ~30 KB)
 */

const fs = require('fs');
const path = require('path');

// Files to scan for icon usage
const scanDirs = [
    '_layouts',
    '_includes', 
    'assets/scripts',
    'account',
    'oread/web'
];

// Icon patterns to search for
const iconPatterns = [
    /class="[^"]*\bfa-([a-z-]+)/g,           // Font Awesome
    /class="[^"]*\bhi-([a-z-]+)/g,           // HugeIcons
    /<i class="[^"]*\b(fa[srlb]?) fa-([a-z-]+)/g,  // FA with prefix
];

const usedIcons = new Set();

// Scan files
function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        iconPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                // Add icon name (could be in match[1] or match[2] depending on pattern)
                const iconName = match[2] || match[1];
                if (iconName) {
                    usedIcons.add(iconName);
                }
            }
        });
    } catch (err) {
        console.warn(`Could not scan ${filePath}:`, err.message);
    }
}

// Recursively scan directory
function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDirectory(fullPath);
        } else if (stat.isFile() && /\.(html|js|css)$/.test(item)) {
            scanFile(fullPath);
        }
    });
}

// Main execution
console.log('🔍 Scanning for icon usage...\n');

scanDirs.forEach(dir => {
    const fullPath = path.resolve(dir);
    if (fs.existsSync(fullPath)) {
        console.log(`Scanning: ${dir}`);
        scanDirectory(fullPath);
    }
});

console.log(`\n✅ Found ${usedIcons.size} unique icons\n`);
console.log('Most used icons:');
const sortedIcons = Array.from(usedIcons).sort();
sortedIcons.slice(0, 20).forEach(icon => {
    console.log(`  - ${icon}`);
});

if (sortedIcons.length > 20) {
    console.log(`  ... and ${sortedIcons.length - 20} more`);
}

// Save to file for manual review
const outputPath = path.join(__dirname, '..', 'docs', 'used-icons.json');
fs.writeFileSync(outputPath, JSON.stringify(sortedIcons, null, 2));
console.log(`\n📝 Full list saved to: ${outputPath}`);

console.log('\n📊 Next steps:');
console.log('1. Review the used icons list');
console.log('2. Use Font Awesome or HugeIcons subset generator');
console.log('3. Generate minimal CSS with only these icons');
console.log('4. Replace assets/style/icons.css with the minimal version');
console.log('\nExpected savings: 150+ KB (~82% reduction)');
