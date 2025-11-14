/**
 * Lazy Script Loader - Performance Optimization
 * Loads non-critical scripts only when needed
 */

(function() {
    'use strict';

    const LazyLoader = {
        loaded: new Set(),
        loading: new Set(),

        /**
         * Load script dynamically
         * @param {string} src - Script source URL
         * @param {Object} options - Loading options
         * @returns {Promise}
         */
        loadScript(src, options = {}) {
            if (this.loaded.has(src)) {
                return Promise.resolve();
            }

            if (this.loading.has(src)) {
                return new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (this.loaded.has(src)) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 50);
                });
            }

            this.loading.add(src);

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = options.async !== false;
                script.defer = options.defer || false;

                script.onload = () => {
                    this.loading.delete(src);
                    this.loaded.add(src);
                    resolve();
                };

                script.onerror = () => {
                    this.loading.delete(src);
                    reject(new Error(`Failed to load script: ${src}`));
                };

                document.head.appendChild(script);
            });
        },

        /**
         * Load multiple scripts in sequence
         */
        loadScripts(scripts) {
            return scripts.reduce(
                (promise, script) => promise.then(() => this.loadScript(script)),
                Promise.resolve()
            );
        },

        /**
         * Load CSS file dynamically
         */
        loadCSS(href) {
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
    };

    // Module-specific loaders
    window.LazyLoader = {
        // Load promotion system only when needed
        loadPromotions() {
            return LazyLoader.loadScript('/assets/scripts/promotions.js');
        },

        // Load gestures only on mobile or when requested
        loadGestures() {
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            if (isMobile) {
                return LazyLoader.loadScript('/assets/scripts/gestures.js');
            }
            return Promise.resolve();
        },

        // Load advanced features only when user opens settings
        loadAdvanced() {
            return LazyLoader.loadScript('/assets/scripts/advanced.js');
        },

        // Load local CDN only for Super users
        loadLocalCDN() {
            return LazyLoader.loadScript('/assets/scripts/local-cdn.js');
        },

        // Load OTA updates checker (not critical for initial load)
        loadOTA() {
            return LazyLoader.loadScript('/assets/scripts/ota-hugeicons.js');
        },

        // Load analytics after page is interactive
        loadAnalytics() {
            return LazyLoader.loadScript('/assets/scripts/ga.js');
        },

        // Load UX enhancers after core functionality
        loadUXEnhancers() {
            return LazyLoader.loadScript('/account/js/ux-enhancers.js');
        },

        // Load all non-critical scripts
        loadNonCritical() {
            // Wait for page to be fully loaded
            if (document.readyState === 'complete') {
                return this._loadNonCriticalScripts();
            }

            return new Promise((resolve) => {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        this._loadNonCriticalScripts().then(resolve);
                    }, 1000); // Delay 1 second after load
                });
            });
        },

        _loadNonCriticalScripts() {
            const nonCritical = [
                '/assets/scripts/ga.js',
                '/assets/scripts/ota-hugeicons.js',
                '/account/js/ux-enhancers.js',
                '/assets/scripts/promotions.js',
                '/assets/scripts/local-cdn.js'
            ];

            return LazyLoader.loadScripts(nonCritical).catch(err => {
                console.warn('[LazyLoader] Some non-critical scripts failed to load:', err);
            });
        }
    };

    // Auto-load based on user interaction
    document.addEventListener('DOMContentLoaded', () => {
        // Load gestures on mobile
        window.LazyLoader.loadGestures();

        // Load non-critical scripts after delay
        window.LazyLoader.loadNonCritical();

        // Load advanced when user clicks settings
        const setupAdvancedLoader = () => {
            const aboutTab = document.querySelector('[data-tab="about"]');
            if (aboutTab) {
                aboutTab.addEventListener('click', () => {
                    window.LazyLoader.loadAdvanced();
                }, { once: true });
            }
        };
        setupAdvancedLoader();

        // Load promotions only when user has been on page for 3 seconds
        setTimeout(() => {
            window.LazyLoader.loadPromotions();
        }, 3000);
    });

})();
