const fs = require('fs');
const path = require('path');

// Only include these directories
const includeDirs = new Set([
  '_includes',
  '_layouts',
  '_posts',
  'account',
  'api',
  'assets'
]);

// File extensions to count
const categories = {
  'HTML': ['.html', '.htm'],
  'CSS': ['.css', '.scss', '.sass', '.less'],
  'JavaScript': ['.js', '.jsx', '.mjs'],
  'TypeScript': ['.ts', '.tsx'],
  'Python': ['.py'],
  'Markdown': ['.md'],
  'YAML': ['.yml', '.yaml'],
  'JSON': ['.json'],
  'Other': []
};

const stats = {
  'HTML': { files: 0, lines: 0 },
  'CSS': { files: 0, lines: 0 },
  'JavaScript': { files: 0, lines: 0 },
  'TypeScript': { files: 0, lines: 0 },
  'Python': { files: 0, lines: 0 },
  'Markdown': { files: 0, lines: 0 },
  'YAML': { files: 0, lines: 0 },
  'JSON': { files: 0, lines: 0 },
  'Other': { files: 0, lines: 0 }
};

function shouldIncludeDir(dirPath) {
  const parts = dirPath.split(path.sep);
  // Check if any part of the path matches our include dirs
  return parts.some(part => includeDirs.has(part));
}

function getCategory(ext) {
  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  return 'Other';
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return 0;
  }
}

function traverseDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (shouldIncludeDir(fullPath)) {
          traverseDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        // Only count files that are in the included directories
        if (shouldIncludeDir(fullPath)) {
          const ext = path.extname(entry.name).toLowerCase();
          const category = getCategory(ext);
          
          const lines = countLines(fullPath);
          stats[category].files++;
          stats[category].lines += lines;
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}: ${error.message}`);
  }
}

// Start counting
console.log('Counting lines of code...\n');
const startDir = __dirname;
traverseDirectory(startDir);

// Display results
console.log('Lines of Code by Category');
console.log('='.repeat(50));

let totalFiles = 0;
let totalLines = 0;

// Sort by lines (descending)
const sortedCategories = Object.entries(stats)
  .sort((a, b) => b[1].lines - a[1].lines)
  .filter(([_, data]) => data.files > 0);

for (const [category, data] of sortedCategories) {
  console.log(`${category.padEnd(15)} ${data.files.toString().padStart(6)} files  ${data.lines.toString().padStart(8)} lines`);
  totalFiles += data.files;
  totalLines += data.lines;
}

console.log('='.repeat(50));
console.log(`${'TOTAL'.padEnd(15)} ${totalFiles.toString().padStart(6)} files  ${totalLines.toString().padStart(8)} lines`);
