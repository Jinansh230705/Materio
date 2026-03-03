/**
 * ESM Module Bundle
 * Imports all ESM modules and ensures their globals are available.
 * 
 * Classic scripts (keyboard-shortcuts, forms, pdf-downloads, caching, 
 * downloads-ui, main, advanced) are loaded via HTML script tags in 
 * default.html for proper DOMContentLoaded timing.
 */

// Import all ESM modules - order matters for dependencies
import './utils.js';           // Shared utilities (no dependencies)
import './health-check.js';    // No dependencies
import './releases.js';        // No dependencies
import './profile-image.js';   // Depends on utils.js
import './notify.js';          // Depends on utils.js
import './haptics.js';         // No dependencies, exposes window.MaterioHaptics
import './theme.js';           // Depends on utils.js
import './lazy-loader.js';     // No dependencies, exposes window.LazyLoader
import './notebook.js';        // Notebook feature

// Dispatch event when ESM modules are loaded
window.dispatchEvent(new CustomEvent('bundle:loaded'));
