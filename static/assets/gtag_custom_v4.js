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

document.addEventListener('DOMContentLoaded', function () {
// Cookie functions
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

// Set your GA measurement ID / GTM ID here for use in disabling GA
// This example uses the GTM container ID already in use.
const GA_OPT_OUT_ID = "GTM-M6PC6RJL";

// Check saved opt-out cookie and update toggle state accordingly
const optOutToggle = document.getElementById("optOutCookiesToggle");
if (optOutToggle) {
const savedOptOut = getCookie("optOutCookies");
if (savedOptOut === "true") {
optOutToggle.checked = true;
// Disable GA tracking by setting the global variable
window['ga-disable-' + GA_OPT_OUT_ID] = true;
} else {
window['ga-disable-' + GA_OPT_OUT_ID] = false;
}

optOutToggle.addEventListener("change", function () {
if (this.checked) {
// Set GA opt-out flag
window['ga-disable-' + GA_OPT_OUT_ID] = true;
setCookie("optOutCookies", "true", 30);
} else {
window['ga-disable-' + GA_OPT_OUT_ID] = false;
setCookie("optOutCookies", "false", 30);
}
});
}
});