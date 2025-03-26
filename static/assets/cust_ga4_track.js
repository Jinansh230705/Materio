// Custom GA4 tracking script
(function(){
    // Ensure GA4 (gtag) is loaded
    if (!window.gtag) {
        console.warn("GA4 (gtag) not loaded.");
        return;
    }
    
    // Helper to send events to GA4
    function trackEvent(eventName, params) {
        window.gtag('event', eventName, params);
    }

    // Track overall page engagement time
    const pageLoadTime = Date.now();
    window.addEventListener("beforeunload", function() {
        const engagementTime = Date.now() - pageLoadTime;
        trackEvent("page_engagement", { engagement_time_ms: engagementTime });
    });

    // Track all button clicks
    document.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", function() {
            trackEvent("button_click", { event_label: this.id || this.innerText });
        });
    });

    // Track navbar tab switches
    document.querySelectorAll(".tab-link").forEach((tab) => {
        tab.addEventListener("click", function() {
            trackEvent("nav_tab_switch", { event_label: this.getAttribute("data-tab") });
        });
    });

    // Track page scroll events (throttled to one event per second)
    let scrollTimeout;
    window.addEventListener("scroll", function() {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackEvent("page_scroll", { scroll_y: window.scrollY });
        }, 1000);
    });

    // PDF viewer engagement tracking
    let pdfEngagementTime = 0;
    let pdfTimer = null;
    
    // Start counting PDF engagement time (in milliseconds)
    function startPdfTimer() {
        if (!pdfTimer) {
            pdfTimer = setInterval(() => {
                pdfEngagementTime += 1000; // Increase by 1 second each interval
            }, 1000);
            trackEvent("pdf_view_start", {});
        }
    }
    
    // Stop the timer and send the engagement time event
    function stopPdfTimer() {
        if (pdfTimer) {
            clearInterval(pdfTimer);
            pdfTimer = null;
            trackEvent("pdf_engagement", { engagement_time_ms: pdfEngagementTime });
            pdfEngagementTime = 0;
        }
    }
    
    // Setup PDF tracking when the PDF iframe is loaded
    function setupPdfTracking() {
        const pdfIframe = document.getElementById("pdf-iframe");
        if (pdfIframe) {
            pdfIframe.addEventListener("load", startPdfTimer);
        }
    }
    setupPdfTracking();
    
    // Stop PDF timer when the popup hides (assuming display changes to "none")
    const popup = document.getElementById("popup");
    if(popup){
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.style.display === "none") {
                    stopPdfTimer();
                }
            });
        });
        observer.observe(popup, { attributes: true, attributeFilter: ["style"] });
    }
    
    // Listen for messages from the PDF viewer (if it sends any via postMessage)
    window.addEventListener("message", (event) => {
        // Optionally check event.origin if you know the expected domain
        if (event.origin.includes("mozilla.github.io")) {
            // Log any PDF interactions (scrolling pages, highlighting, annotations, etc.)
            trackEvent("pdf_interaction", { data: event.data });
        }
    });
})();