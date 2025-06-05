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
        }
    });
    
    // Function to request current overlay modes from parent
    function requestOverlayModes() {
        try {
            window.parent.postMessage({
                type: 'applyOverlayModes'
            }, '*');
        } catch (e) {
            console.log('Could not request overlay modes from parent');
        }
    }
    
    // Wait for PDF.js to fully load before requesting overlay modes
    function initializeOverlays() {
        // Check if PDF.js viewer is ready
        if (window.PDFViewerApplication && window.PDFViewerApplication.initialized) {
            requestOverlayModes();
        } else {
            // Wait for PDF.js to initialize
            document.addEventListener('webviewerloaded', function() {
                requestOverlayModes();
            });
            
            // Fallback: try after a short delay
            setTimeout(requestOverlayModes, 1000);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOverlays);
    } else {
        initializeOverlays();
    }
})();
