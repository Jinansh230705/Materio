/**
 * Lazy Script Loader (ESM)
 * Performance optimization - loads non-critical scripts only when needed.
 * 
 * @module lazy-loader
 */

// Track loaded and loading scripts
const loaded = new Set();
const loading = new Set();

/**
 * Load script dynamically
 * @param {string} src - Script source URL
 * @param {Object} options - Loading options
 * @returns {Promise}
 */
function loadScript(src, options = {}) {
    if (loaded.has(src)) {
        return Promise.resolve();
    }

    if (loading.has(src)) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (loaded.has(src)) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        });
    }

    loading.add(src);

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = options.async !== false;
        script.defer = options.defer || false;

        script.onload = () => {
            loading.delete(src);
            loaded.add(src);
            resolve();
        };

        script.onerror = () => {
            loading.delete(src);
            reject(new Error(`Failed to load script: ${src}`));
        };

        document.head.appendChild(script);
    });
}

/**
 * Load multiple scripts in sequence
 * @param {string[]} scripts - Array of script URLs
 * @returns {Promise}
 */
function loadScripts(scripts) {
    return scripts.reduce(
        (promise, script) => promise.then(() => loadScript(script)),
        Promise.resolve()
    );
}

/**
 * Load CSS file dynamically
 * @param {string} href - CSS file URL
 * @returns {Promise}
 */
function loadCSS(href) {
    if (document.querySelector(`link[href="${href}"]`)) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
}

/**
 * Load promotion system
 * @returns {Promise}
 */
function loadPromotions() {
    return loadScript('/assets/scripts/promotions.js');
}

/**
 * Load gestures (mobile only)
 * @returns {Promise}
 */
function loadGestures() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
        return loadScript('/assets/scripts/gestures.js');
    }
    return Promise.resolve();
}

/**
 * Load advanced features
 * @returns {Promise}
 */
function loadAdvanced() {
    return loadScript('/assets/scripts/advanced.js');
}

/**
 * Load local CDN (Super users only)
 * @returns {Promise}
 */
function loadLocalCDN() {
    return loadScript('/assets/scripts/local-cdn.js');
}

/**
 * Load OTA updates checker
 * @returns {Promise}
 */
function loadOTA() {
    return loadScript('/assets/scripts/ota-hugeicons.js');
}

/**
 * Load analytics
 * @returns {Promise}
 */
function loadAnalytics() {
    return loadScript('/assets/scripts/sync.js');
}

/**
 * Load UX enhancers
 * @returns {Promise}
 */
function loadUXEnhancers() {
    return loadScript('/account/js/ux-enhancers.js');
}

/**
 * Load all non-critical scripts
 * @returns {Promise}
 */
function loadNonCritical() {
    if (document.readyState === 'complete') {
        return loadNonCriticalScripts();
    }

    return new Promise((resolve) => {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loadNonCriticalScripts().then(resolve);
            }, 1000);
        });
    });
}

/**
 * Internal: Load non-critical scripts
 * @returns {Promise}
 */
function loadNonCriticalScripts() {
    const nonCritical = [
        '/assets/scripts/sync.js',
        '/assets/scripts/ga.js',
        '/assets/scripts/ota-hugeicons.js',
        '/account/js/ux-enhancers.js',
        '/assets/scripts/promotions.js',
        '/assets/scripts/local-cdn.js'
    ];

    return loadScripts(nonCritical).catch(err => {
        console.warn('[LazyLoader] Some non-critical scripts failed to load:', err);
    });
}

/**
 * Setup advanced loader on settings tab
 */
function setupAdvancedLoader() {
    const aboutTab = document.querySelector('[data-tab="about"]');
    if (aboutTab) {
        aboutTab.addEventListener('click', () => {
            loadAdvanced();
        }, { once: true });
    }
}

/**
 * Initialize lazy loader
 */
function init() {
    // Load gestures on mobile
    loadGestures();

    // Load non-critical scripts after delay
    loadNonCritical();

    // Setup advanced loader
    setupAdvancedLoader();

    // Load promotions after 3 seconds
    setTimeout(() => {
        loadPromotions();
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Create the LazyLoader API object
const LazyLoader = {
    loadScript,
    loadScripts,
    loadCSS,
    loadPromotions,
    loadGestures,
    loadAdvanced,
    loadLocalCDN,
    loadOTA,
    loadAnalytics,
    loadUXEnhancers,
    loadNonCritical,
    loaded,
    loading
};

// Expose globally for backward compatibility
window.LazyLoader = LazyLoader;

// Export for module use
export {
    LazyLoader as default,
    loadScript,
    loadScripts,
    loadCSS,
    loadPromotions,
    loadGestures,
    loadAdvanced,
    loadLocalCDN,
    loadOTA,
    loadAnalytics,
    loadUXEnhancers,
    loadNonCritical,
    init
};
