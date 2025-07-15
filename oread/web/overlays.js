// Overlay Handler for PDF.js Viewer
// Handles Paper Mode and Night Reading overlays for PDF content

(function() {
    'use strict';
      // Listen for overlay mode messages from parent window
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'overlayMode') {
            const { mode, enable } = event.data;
            
            if (mode && typeof enable === 'boolean') {
                if (enable) {
                    document.body.classList.add(mode);
                } else {
                    document.body.classList.remove(mode);
                }
            }
        }        // Handle theme synchronization
        if (event.data && event.data.type === 'themeMode') {
            const { isDark } = event.data;
            
            if (typeof isDark === 'boolean') {
                if (isDark) {
                    document.body.classList.add('dark-mode');
                    document.body.classList.remove('light-mode');
                    // Also update the HTML element for PDF.js's built-in theme detection
                    document.documentElement.classList.add('is-dark');
                    document.documentElement.classList.remove('is-light');
                } else {
                    document.body.classList.remove('dark-mode');
                    document.body.classList.add('light-mode');
                    // Also update the HTML element for PDF.js's built-in theme detection
                    document.documentElement.classList.remove('is-dark');
                    document.documentElement.classList.add('is-light');
                }
                
                // For debugging
                // console.log('PDF viewer theme changed to: ' + (isDark ? 'dark' : 'light'));
                
                // Force repaint of viewer elements to ensure theme is applied
                setTimeout(() => {
                    if (window.PDFViewerApplication && window.PDFViewerApplication.pdfViewer) {
                        window.PDFViewerApplication.pdfViewer.update();
                    }
                }, 100);
            }
        }
          // Handle night mode warmth adjustment
        if (event.data && event.data.type === 'nightWarmth') {
            const { opacity } = event.data;
            
            if (typeof opacity === 'number') {
                document.documentElement.style.setProperty('--warmth-opacity', opacity);
                // console.log('PDF viewer night warmth updated:', opacity);
                
                // Apply warmth immediately if night reading mode is active
                if (document.body.classList.contains('night-reading')) {
                    // Force repaint of viewer elements to ensure warmth changes are applied
                    setTimeout(() => {
                        if (window.PDFViewerApplication && window.PDFViewerApplication.pdfViewer) {
                            window.PDFViewerApplication.pdfViewer.update();
                        }
                    }, 50);
                }
            }
        }
    });
    
    // Function to request current overlay modes from parent
    function requestOverlayModes() {
        try {
            window.parent.postMessage({
                type: 'applyOverlayModes'
            }, '*');
        } catch (e) {
            // console.log('Could not request overlay modes from parent');
        }
    }
      // Wait for PDF.js to fully load before requesting overlay modes
    function initializeOverlays() {
        // Check if PDF.js viewer is ready
        if (window.PDFViewerApplication && window.PDFViewerApplication.initialized) {
            requestOverlayModes();
            initializeTheme();
        } else {
            // Wait for PDF.js to initialize
            document.addEventListener('webviewerloaded', function() {
                requestOverlayModes();
                initializeTheme();
            });
            
            // Fallback: try after a short delay
            setTimeout(function() {
                requestOverlayModes();
                initializeTheme();
            }, 1000);
        }
    }
    
    // Initialize theme based on system preference if not set by parent
    function initializeTheme() {
        // If no theme class is present, check system preference
        if (!document.body.classList.contains('dark-mode') && !document.body.classList.contains('light-mode')) {
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDarkMode) {
                document.body.classList.add('dark-mode');
                document.documentElement.classList.add('is-dark');
                document.documentElement.classList.remove('is-light');
            } else {
                document.body.classList.add('light-mode');
                document.documentElement.classList.remove('is-dark');
                document.documentElement.classList.add('is-light');
            }
            // console.log('PDF viewer initial theme set based on system preference: ' + 
            //             (prefersDarkMode ? 'dark' : 'light'));
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOverlays);
    } else {
        initializeOverlays();
    }
})();
