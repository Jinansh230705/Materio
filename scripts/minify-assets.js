const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AssetMinifier {
  constructor() {
    this.processedFiles = 0;
    this.savedBytes = 0;
    this.siteDir = path.join(__dirname, '..', '_site');
    
    // Install required dependencies if not present
    this.ensureDependencies();
  }

  ensureDependencies() {
    const dependencies = ['terser', 'clean-css', 'html-minifier-terser'];
    const packageJson = require('../package.json');
    
    for (const dep of dependencies) {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        console.log(`Installing ${dep}...`);
        try {
          execSync(`npm install ${dep} --save-dev`, { stdio: 'inherit' });
        } catch (error) {
          console.warn(`Failed to install ${dep}. Please install manually: npm install ${dep} --save-dev`);
        }
      }
    }
  }

  async minifyJS(filePath) {
    try {
      const terser = require('terser');
      const originalCode = fs.readFileSync(filePath, 'utf8');
      const originalSize = originalCode.length;
      
      const result = await terser.minify(originalCode, {
        compress: {
          drop_console: false, // Keep console logs for debugging
          drop_debugger: true,
          pure_funcs: ['console.debug'],
          passes: 2
        },
        mangle: {
          reserved: ['$', 'jQuery', 'materio', 'MateriosPWA'] // Preserve important globals
        },
        format: {
          comments: false
        }
      });

      if (result.error) {
        console.warn(`Error minifying ${filePath}:`, result.error);
        return;
      }

      fs.writeFileSync(filePath, result.code);
      const newSize = result.code.length;
      this.savedBytes += (originalSize - newSize);
      console.log(`✓ Minified JS: ${path.relative(this.siteDir, filePath)} (${originalSize} → ${newSize} bytes)`);
      
    } catch (error) {
      console.warn(`Error processing JS file ${filePath}:`, error.message);
    }
  }

  async minifyCSS(filePath) {
    try {
      const CleanCSS = require('clean-css');
      const originalCode = fs.readFileSync(filePath, 'utf8');
      const originalSize = originalCode.length;
      
      const cleanCSS = new CleanCSS({
        level: 2,
        returnPromise: false,
        format: {
          breaks: {
            afterComment: false,
            afterProperty: false
          }
        }
      });

      const result = cleanCSS.minify(originalCode);
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`CSS errors in ${filePath}:`, result.errors);
        return;
      }

      fs.writeFileSync(filePath, result.styles);
      const newSize = result.styles.length;
      this.savedBytes += (originalSize - newSize);
      console.log(`✓ Minified CSS: ${path.relative(this.siteDir, filePath)} (${originalSize} → ${newSize} bytes)`);
      
    } catch (error) {
      console.warn(`Error processing CSS file ${filePath}:`, error.message);
    }
  }

  async minifyHTML(filePath) {
    try {
      const { minify } = require('html-minifier-terser');
      const originalCode = fs.readFileSync(filePath, 'utf8');
      const originalSize = originalCode.length;
        const result = await minify(originalCode, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: false, // Changed to false to preserve input type attributes
        removeScriptTypeAttributes: false, // Changed to false to preserve all type attributes
        removeStyleLinkTypeAttributes: false, // Changed to false
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
        removeEmptyAttributes: false, // Changed to false to preserve all attributes
        removeOptionalTags: false, // Keep for compatibility
        caseSensitive: true,
        preserveLineBreaks: false
      });

      fs.writeFileSync(filePath, result);
      const newSize = result.length;
      this.savedBytes += (originalSize - newSize);
      console.log(`✓ Minified HTML: ${path.relative(this.siteDir, filePath)} (${originalSize} → ${newSize} bytes)`);
      
    } catch (error) {
      console.warn(`Error processing HTML file ${filePath}:`, error.message);
    }
  }

  shouldSkipFile(filePath) {
    const relativePath = path.relative(this.siteDir, filePath);
    
    // Skip API directory and oread directory
    if (relativePath.startsWith('api' + path.sep) || relativePath.startsWith('api/') ||
        relativePath.startsWith('oread' + path.sep) || relativePath.startsWith('oread/')) {
      return true;
    }
    
    // Skip already minified files
    if (filePath.includes('.min.')) {
      return true;
    }
    
    // Skip specific files that shouldn't be minified
    const skipFiles = [
      'sw.js', // Service worker might have specific formatting requirements
      'manifest.json'
    ];
    
    const fileName = path.basename(filePath);
    if (skipFiles.includes(fileName)) {
      return true;
    }
    
    return false;
  }

  async processDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.processDirectory(fullPath);
      } else if (stat.isFile()) {
        if (this.shouldSkipFile(fullPath)) {
          continue;
        }
        
        const ext = path.extname(fullPath).toLowerCase();
        
        switch (ext) {
          case '.js':
            await this.minifyJS(fullPath);
            this.processedFiles++;
            break;
          case '.css':
            await this.minifyCSS(fullPath);
            this.processedFiles++;
            break;
          case '.html':
            await this.minifyHTML(fullPath);
            this.processedFiles++;
            break;
        }
      }
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run() {
    console.log('🚀 Starting asset minification...');
    console.log(`📁 Processing directory: ${this.siteDir}`);
    
    if (!fs.existsSync(this.siteDir)) {
      console.error(`❌ Build directory not found: ${this.siteDir}`);
      console.error('Make sure Jekyll has built the site first.');
      process.exit(1);
    }
    
    const startTime = Date.now();
    
    try {
      await this.processDirectory(this.siteDir);
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log('\n✅ Minification complete!');
      console.log(`📊 Files processed: ${this.processedFiles}`);
      console.log(`💾 Space saved: ${this.formatBytes(this.savedBytes)}`);
      console.log(`⏱️  Time taken: ${duration}s`);
      
    } catch (error) {
      console.error('❌ Minification failed:', error);
      process.exit(1);
    }
  }
}

// Run the minifier
if (require.main === module) {
  const minifier = new AssetMinifier();
  minifier.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AssetMinifier;