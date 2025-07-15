document.addEventListener("DOMContentLoaded", function () {
    const themeToggle = document.getElementById('themeToggle');

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; path=/";
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

    function applyTheme(isDark) {        const elements = [
            document.body,
            document.querySelector('header'),
            document.querySelector('.navbar'),
            document.querySelector('.content'),
            document.getElementById('themeCard'),
            document.getElementById('bgToggleCard'),
            document.getElementById('popup'),
            document.getElementById('versionInfo'),
            document.getElementById('reading'),
            document.getElementById('notices'),
            document.getElementById('notificationBoard'),
            document.getElementById('advanced'),
            document.getElementById('about'),
            document.getElementById('cookiesToggleCard'),            document.getElementById('paperModeCard'),
            document.getElementById('grainSizeControl'),
            document.getElementById('creatorInfo'),
            document.getElementById('licensesCard'),
            document.getElementById('miscCard'),
            document.getElementById('account'),
            document.getElementById('oiaa'),
            document.getElementById('gh'),
            document.getElementById('nightReadingCard'),
            document.getElementById('einkModeCard'),
            document.getElementById('tabSwitcherCard')
        ];
        const notifyCards = document.querySelectorAll('#notify');
        notifyCards.forEach(card => elements.push(card));

        elements.forEach(el => {
            if (el) {
                isDark ? el.classList.add('dark-mode') : el.classList.remove('dark-mode');
            }
        });        const giscusFrame = document.querySelector("iframe.giscus-frame");
        if (giscusFrame) {
            giscusFrame.contentWindow.postMessage(
                { giscus: { setConfig: { theme: isDark ? "http://localhost:8888/assets/style/giscus.css" : "noborder_light" } } },
                "https://giscus.app"
            );
        }
          // Sync theme with PDF iframe if it exists
        const pdfIframe = document.getElementById('pdf-iframe');
        if (pdfIframe && pdfIframe.contentWindow) {
            try {
                pdfIframe.contentWindow.postMessage({
                    type: 'themeMode',
                    isDark: isDark
                }, '*');
                // console.log('Theme sync sent to PDF iframe: ' + (isDark ? 'dark' : 'light'));
            } catch (e) {
                // console.log('Could not sync theme with PDF iframe: ' + e.message);
            }
        }
    }
    let userTheme = getCookie("theme");
    if (userTheme === "dark") {
        themeToggle.checked = true;
        applyTheme(true);
    } else if (userTheme === "light") {
        themeToggle.checked = false;
        applyTheme(false);
    } else {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        themeToggle.checked = systemPrefersDark;
        applyTheme(systemPrefersDark);
    }
    themeToggle.addEventListener("change", function () {
        const isDark = this.checked;
        setCookie("theme", isDark ? "dark" : "light", 30);
        applyTheme(isDark);
    });
});
function updateThemeColor() {
    const isDarkMode = document.body.classList.contains("dark-mode");
    const metaThemeColor = document.querySelector("meta[name=theme-color]");

    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", isDarkMode ? "#1a1a1a" : "#f3f3ee");
    }
}
const themeChoice = document.getElementById("themeToggle");
if (themeChoice) {
    themeChoice.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        updateThemeColor();
    });
}
document.addEventListener("DOMContentLoaded", updateThemeColor);

// Listen for system theme changes and update PDF iframe if using system theme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    const userTheme = getCookie("theme");
    
    // Only auto-switch if using system theme (no explicit theme cookie)
    if (!userTheme) {
        const isDark = e.matches;
        
        // Update PDF iframe with new system theme
        const pdfIframe = document.getElementById('pdf-iframe');
        if (pdfIframe && pdfIframe.contentWindow) {
            try {
                pdfIframe.contentWindow.postMessage({
                    type: 'themeMode',
                    isDark: isDark
                }, '*');
                // console.log('System theme change detected, updated PDF iframe: ' + (isDark ? 'dark' : 'light'));
            } catch (err) {
                // console.log('Could not sync system theme change with PDF iframe: ' + err.message);
            }
        }
    }
});