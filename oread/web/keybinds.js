// Custom navigation for oread - Override default spacebar scrolling behavior
// Use spacebar for next page and shift+spacebar for previous page
// Mouse buttons: Right click = previous page, Left click (button 4) = next page

(function() {
    'use strict';
    
    // Override default spacebar scroll behavior and implement page navigation
    document.addEventListener("keydown", function (e) {
        if (
            e.code === "Space" &&
            !e.ctrlKey &&
            !e.altKey &&
            !e.metaKey &&
            !e.target.closest("input, textarea, [contenteditable]") // prevent when typing
        ) {
            e.preventDefault();

            // Wait for PDFViewerApplication to be available
            if (window.PDFViewerApplication) {
                if (e.shiftKey) {
                    // Shift + Space = previous page
                    if (window.PDFViewerApplication.page > 1) {
                        window.PDFViewerApplication.page--;
                    }
                } else {
                    // Space = next page
                    if (window.PDFViewerApplication.page < window.PDFViewerApplication.pagesCount) {
                        window.PDFViewerApplication.page++;
                    }
                }
            }
        }
    }, true); // Use capture phase to ensure we catch it first
    
    // Mouse button navigation
    // Button 2 (right click) = previous page
    // Button 3 (middle click) and Button 4 (mouse back button) = next page
    document.addEventListener("mousedown", function(e) {
        // Don't interfere with text selection or when clicking on interactive elements
        if (e.target.closest("input, textarea, button, a, [contenteditable]")) {
            return;
        }
        
        if (window.PDFViewerApplication) {
            if (e.button === 2) {
                // Right click = previous page
                e.preventDefault();
                if (window.PDFViewerApplication.page > 1) {
                    window.PDFViewerApplication.page--;
                }
            } else if (e.button === 3 || e.button === 4) {
                // Middle click or mouse back button = next page
                e.preventDefault();
                if (window.PDFViewerApplication.page < window.PDFViewerApplication.pagesCount) {
                    window.PDFViewerApplication.page++;
                }
            }
        }
    }, true);
    
    // Prevent context menu on right click for cleaner UX
    document.addEventListener("contextmenu", function(e) {
        // Only prevent if we're in PDF viewer and not on interactive elements
        if (window.PDFViewerApplication && 
            !e.target.closest("input, textarea, button, a, [contenteditable]")) {
            e.preventDefault();
        }
    }, true);
    
})();