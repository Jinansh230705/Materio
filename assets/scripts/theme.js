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

    function applyTheme(isDark) {
        const elements = [
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
            document.getElementById('cookiesToggleCard'),
            document.getElementById('creatorInfo'),
            document.getElementById('account'),
            document.getElementById('oiaa'),
            document.getElementById('gh')
        ];
        const notifyCards = document.querySelectorAll('#notify');
        notifyCards.forEach(card => elements.push(card));

        elements.forEach(el => {
            if (el) {
                isDark ? el.classList.add('dark-mode') : el.classList.remove('dark-mode');
            }
        });
        const giscusFrame = document.querySelector("iframe.giscus-frame");
        if (giscusFrame) {
            giscusFrame.contentWindow.postMessage(
                { giscus: { setConfig: { theme: isDark ? "noborder_dark" : "noborder_light" } } },
                "https://giscus.app"
            );
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
        metaThemeColor.setAttribute("content", isDarkMode ? "rgba(34, 34, 34, 0.5)" : "rgba(255, 255, 255, 0.5)");
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