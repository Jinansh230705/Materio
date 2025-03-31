(function () {
    function trackEvent(eventName, params) {
        if (window.gtag) {
            window.gtag('event', eventName, params);
        } else {
            console.warn("GA4 (gtag) not loaded.");
        }
    }

    const pageLoadTime = Date.now();
    window.addEventListener("beforeunload", function () {
        const engagementTime = Date.now() - pageLoadTime;
        trackEvent("page_engagement", { engagement_time_ms: engagementTime });
    });

    document.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", function () {
            trackEvent("button_click", { event_label: this.id || this.innerText });
        });
    });

    document.querySelectorAll(".tab-link").forEach((tab) => {
        tab.addEventListener("click", function () {
            trackEvent("nav_tab_switch", { event_label: this.getAttribute("data-tab") });
        });
    });

    document.querySelectorAll(".setting-toggle").forEach((setting) => {
        setting.addEventListener("change", function () {
            trackEvent("setting_toggle", { setting_name: this.id, status: this.checked ? "on" : "off" });
        });
    });

    let scrollTimeout;
    window.addEventListener("scroll", function () {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackEvent("page_scroll", { scroll_y: window.scrollY });
        }, 1000);
    });

    let pdfEngagementTime = 0;
    let pdfTimer = null;
    let lastScrollTime = Date.now();
    let lastZoomLevel = 1;
    
    function startPdfTimer() {
        if (!pdfTimer) {
            pdfTimer = setInterval(() => {
                pdfEngagementTime += 1000;
            }, 1000);
            trackEvent("pdf_view_start", {});
        }
    }
    
    function stopPdfTimer() {
        if (pdfTimer) {
            clearInterval(pdfTimer);
            pdfTimer = null;
            trackEvent("pdf_engagement", { engagement_time_ms: pdfEngagementTime });
            pdfEngagementTime = 0;
        }
    }

    function trackPdfScroll(scrollY) {
        const now = Date.now();
        if (now - lastScrollTime > 1000) {
            trackEvent("pdf_scroll", { scroll_y: scrollY });
            lastScrollTime = now;
        }
    }

    function trackPdfZoom(zoomLevel) {
        if (zoomLevel !== lastZoomLevel) {
            trackEvent("pdf_zoom", { zoom_level: zoomLevel });
            lastZoomLevel = zoomLevel;
        }
    }

    function setupPdfTracking() {
        const pdfIframe = document.getElementById("pdf-iframe");
        if (pdfIframe) {
            pdfIframe.addEventListener("load", startPdfTimer);
            pdfIframe.contentWindow.addEventListener("scroll", function () {
                trackPdfScroll(pdfIframe.contentWindow.scrollY);
            });
            pdfIframe.contentWindow.addEventListener("zoom", function (event) {
                trackPdfZoom(event.detail.zoomLevel);
            });
        }
    }
    setupPdfTracking();

    const popup = document.getElementById("popup");
    if (popup) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.style.display === "none") {
                    stopPdfTimer();
                }
            });
        });
        observer.observe(popup, { attributes: true, attributeFilter: ["style"] });
    }
    
    window.addEventListener("message", (event) => {
        if (event.origin.includes("mozilla.github.io")) {
            trackEvent("pdf_interaction", { data: event.data });
        }
    });
})();
