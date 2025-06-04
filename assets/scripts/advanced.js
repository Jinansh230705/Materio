document.addEventListener('DOMContentLoaded', function () {
    const disableBgToggle = document.getElementById("disableBgToggle");
    const homeElem = document.getElementById("home");
    let lastIsMobile = window.matchMedia("(max-width: 768px)").matches;
    let cachedEventToApply = null;

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
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

    function applyEventBackgroundForHome() {
        if (disableBgToggle && disableBgToggle.checked) {
            homeElem.style.setProperty("--bg-img", "none");
            return;
        }

        if (cachedEventToApply) {
            updateBgFromEvent(cachedEventToApply);
            return;
        }
        fetch('/assets/data/events.json')
            .then(response => response.json())
            .then(events => {
                const now = new Date();
                let activeEvents = events.filter(ev => new Date(ev.setDate) <= now && (!ev.default || ev.default == 0));
                let eventToApply = null;
                if (activeEvents.length > 0) {
                    eventToApply = activeEvents.sort((a, b) => new Date(b.setDate) - new Date(a.setDate))[0];
                } else {
                    let defaultEvents = events.filter(ev => ev.default == 1);
                    if (defaultEvents.length > 0) {
                        eventToApply = defaultEvents[0];
                    }
                }
                if (eventToApply) {
                    cachedEventToApply = eventToApply;
                    updateBgFromEvent(eventToApply);
                }
            })
            .catch(err => console.error("Error loading event backgrounds:", err));
    }

    function updateBgFromEvent(eventToApply) {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const bgUrl = isMobile ? eventToApply.url_mobile : eventToApply.url_pc;
        homeElem.style.setProperty("--bg-img", `url('${bgUrl}')`);
    }

    const savedSetting = getCookie("disableBg");
    if (savedSetting === "true") {
        disableBgToggle.checked = true;
        homeElem.style.setProperty("--bg-img", "none");
    }
    applyEventBackgroundForHome();

    if (disableBgToggle) {
        disableBgToggle.addEventListener("change", function () {
            if (this.checked) {
                homeElem.style.setProperty("--bg-img", "none");
            } else {
                applyEventBackgroundForHome();
            }
            setCookie("disableBg", this.checked ? "true" : "false", 30);
        });
    }
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    window.addEventListener('resize', debounce(function () {
        if (disableBgToggle && disableBgToggle.checked) return;
        const currentIsMobile = window.matchMedia("(max-width: 768px)").matches;
        if (currentIsMobile !== lastIsMobile) {
            applyEventBackgroundForHome();
            lastIsMobile = currentIsMobile;
        }
    }, 200));
});