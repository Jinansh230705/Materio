(function () {

    if (!window.gtag) {
        console.warn("GA4 (gtag) not loaded.");
        return;
    }

    function trackEvent(eventName, params) {
        window.gtag('event', eventName, params);
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

    let scrollTimeout;
    window.addEventListener("scroll", function () {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackEvent("page_scroll", { scroll_y: window.scrollY });
        }, 1000);
    });

    let pdfEngagementTime = 0;
    let pdfTimer = null;

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

    function setupPdfTracking() {
        const pdfIframe = document.getElementById("pdf-iframe");
        if (pdfIframe) {
            pdfIframe.addEventListener("load", startPdfTimer);
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