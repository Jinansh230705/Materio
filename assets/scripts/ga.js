(function () {
    if (!window.gtag) {
        return;
    }

    function trackEvent(eventName, params) {
        window.gtag('event', eventName, params);
    }

    const pageLoadTime = Date.now();
    window.addEventListener("beforeunload", function () {
        const engagementTime = Date.now() - pageLoadTime;
        trackEvent("user_engagement", { engagement_time_msec: engagementTime });
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
            trackEvent("user_engagement", { engagement_time_msec: pdfEngagementTime });
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

document.addEventListener('DOMContentLoaded', function () {
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
        console.log("Cookie set:", name, value);
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(";");
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return null;
    }

    const GA_OPT_OUT_ID = "GTM-M6PC6RJL";
    const optOutToggle = document.getElementById("optOutCookiesToggle");
    if (optOutToggle) {
        const savedOptOut = getCookie("optOutCookies");
        if (savedOptOut === "true") {
            optOutToggle.checked = true;
            window['ga-disable-' + GA_OPT_OUT_ID] = true;
        } else {
            window['ga-disable-' + GA_OPT_OUT_ID] = false;
        }

        optOutToggle.addEventListener("change", function () {
            if (this.checked) {
                window['ga-disable-' + GA_OPT_OUT_ID] = true;
                setCookie("optOutCookies", "true", 30);
            } else {
                window['ga-disable-' + GA_OPT_OUT_ID] = false;
                setCookie("optOutCookies", "false", 30);
            }
        });
    }
});
