/**
 * Theme Module (ESM)
 * Handles theme switching, smart dark mode, and system preference synchronization.
 * 
 * @module theme
 */

import { setCookie, getCookie } from './utils.js';

// Smart dark mode time range (19:00 to 6:45)
const SMART_DARK_START_HOUR = 19;
const SMART_DARK_START_MINUTE = 0;
const SMART_DARK_END_HOUR = 6;
const SMART_DARK_END_MINUTE = 45;

let smartDarkModeInterval = null;

// Element IDs that need dark mode class
const THEME_ELEMENT_IDS = [
    'themeCard', 'bgToggleCard', 'popup', 'versionInfo', 'reading',
    'notices', 'notificationBoard', 'advanced', 'about', 'cookiesToggleCard',
    'paperModeCard', 'grainSizeControl', 'creatorInfo', 'licensesCard',
    'miscCard', 'account', 'oiaa', 'gh', 'nightReadingCard', 'einkModeCard',
    'tabSwitcherCard', 'blogs', 'blogPost1', 'blogPost2', 'blogPost3',
    'blogPost4', 'blogPost5', 'recommendedPosts', 'recommendedPost1',
    'recommendedPost2', 'recommendedPost3', 'recommendedPost4',
    'recommendedPost5', 'wallpaperSelectionCard', 'getinsights',
    'storageInfoCard', 'localCdnCard', 'serverTerminal', 'invertMode',
    'clearSiteDataCard', 'hapticToggleCard'
];

/**
 * Apply theme to all elements
 * @param {boolean} isDark - Whether to apply dark mode
 */
function applyTheme(isDark) {
    const elements = [
        document.body,
        document.querySelector('header'),
        document.querySelector('.navbar'),
        document.querySelector('.content'),
        ...THEME_ELEMENT_IDS.map(id => document.getElementById(id))
    ];

    // Add notification cards
    const notifyCards = document.querySelectorAll('#notify');
    notifyCards.forEach(card => elements.push(card));

    elements.forEach(el => {
        if (el) {
            isDark ? el.classList.add('dark-mode') : el.classList.remove('dark-mode');
        }
    });

    // Sync with Giscus iframe
    const giscusFrame = document.querySelector('iframe.giscus-frame');
    if (giscusFrame?.contentWindow) {
        const giscusDarkTheme = `${window.location.origin}/assets/style/giscus.css`;
        giscusFrame.contentWindow.postMessage({
            giscus: {
                setConfig: {
                    theme: isDark ? giscusDarkTheme : 'noborder_light'
                }
            }
        }, 'https://giscus.app');
    }

    // Sync with PDF iframe
    const pdfIframe = document.getElementById('pdf-iframe');
    if (pdfIframe?.contentWindow) {
        try {
            pdfIframe.contentWindow.postMessage({
                type: 'themeMode',
                isDark: isDark
            }, '*');
        } catch (e) {
            // Silently fail
        }
    }
}

/**
 * Check if current time is within smart dark mode hours (19:00 - 6:45)
 * @returns {boolean}
 */
function isSmartDarkModeTime() {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const startTimeInMinutes = SMART_DARK_START_HOUR * 60 + SMART_DARK_START_MINUTE;
    const endTimeInMinutes = SMART_DARK_END_HOUR * 60 + SMART_DARK_END_MINUTE;

    // Time range spans midnight: 19:00 to 6:45
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
}

/**
 * Check if system prefers dark mode
 * @returns {boolean}
 */
function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Determine if smart dark mode should be active
 * @returns {boolean}
 */
function shouldApplySmartDarkMode() {
    const userTheme = getCookie('theme');
    const pureLightMode = getCookie('pureLightMode') === 'true';

    // Smart dark mode only applies when:
    // 1. Dark mode toggle is OFF (userTheme !== "dark")
    // 2. System is NOT in dark mode
    // 3. Pure light mode is NOT enabled
    if (userTheme === 'dark') return false;
    if (systemPrefersDark()) return false;
    if (pureLightMode) return false;

    return isSmartDarkModeTime();
}

/**
 * Update status text display
 */
function updateSmartDarkModeStatus() {
    const smartDarkModeStatus = document.getElementById('smartDarkModeStatus');
    if (!smartDarkModeStatus) return;

    const userTheme = getCookie('theme');
    const pureLightMode = getCookie('pureLightMode') === 'true';

    if (userTheme === 'dark') {
        smartDarkModeStatus.textContent = 'Dark mode active';
    } else if (systemPrefersDark()) {
        smartDarkModeStatus.textContent = 'Following system preference';
    } else if (pureLightMode) {
        smartDarkModeStatus.textContent = 'Pure light mode active';
    } else if (isSmartDarkModeTime()) {
        smartDarkModeStatus.textContent = 'Smart Dark mode - will auto switch based on time';
    } else {
        smartDarkModeStatus.textContent = 'Light mode - will auto switch based on time';
    }
}

/**
 * Show/hide pure light mode options
 */
function updatePureLightModeVisibility() {
    const pureLightModeOptions = document.getElementById('pureLightModeOptions');
    if (!pureLightModeOptions) return;

    const userTheme = getCookie('theme');
    pureLightModeOptions.style.display = userTheme !== 'dark' ? 'block' : 'none';
}

/**
 * Apply theme based on all conditions
 */
function applyThemeBasedOnConditions() {
    const themeToggle = document.getElementById('themeToggle');
    const userTheme = getCookie('theme');

    if (userTheme === 'dark') {
        if (themeToggle) themeToggle.checked = true;
        applyTheme(true);
    } else if (userTheme === 'light') {
        if (shouldApplySmartDarkMode()) {
            if (themeToggle) themeToggle.checked = false;
            applyTheme(true);
        } else {
            if (themeToggle) themeToggle.checked = false;
            applyTheme(false);
        }
    } else {
        // No explicit theme
        if (systemPrefersDark()) {
            if (themeToggle) themeToggle.checked = true;
            applyTheme(true);
        } else if (shouldApplySmartDarkMode()) {
            if (themeToggle) themeToggle.checked = false;
            applyTheme(true);
        } else {
            if (themeToggle) themeToggle.checked = false;
            applyTheme(false);
        }
    }

    updateSmartDarkModeStatus();
    updatePureLightModeVisibility();
}

/**
 * Initialize pure light mode toggle
 */
function initPureLightMode() {
    const pureLightModeToggle = document.getElementById('pureLightModeToggle');
    if (!pureLightModeToggle) return;

    const pureLightMode = getCookie('pureLightMode') === 'true';
    pureLightModeToggle.checked = pureLightMode;

    pureLightModeToggle.addEventListener('change', function () {
        // Haptic feedback
        if (window.MaterioHaptics) {
            window.MaterioHaptics.vibrate(this.checked ? 'toggleOn' : 'toggleOff');
        }

        setCookie('pureLightMode', this.checked ? 'true' : 'false', 30);
        applyThemeBasedOnConditions();
    });
}

/**
 * Start smart dark mode checker
 */
function startSmartDarkModeChecker() {
    if (smartDarkModeInterval) {
        clearInterval(smartDarkModeInterval);
    }

    smartDarkModeInterval = setInterval(() => {
        applyThemeBasedOnConditions();
    }, 60000);
}

/**
 * Update browser theme color meta tag
 */
function updateThemeColor() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const metaThemeColor = document.querySelector('meta[name=theme-color]');

    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDarkMode ? '#1a1a1a' : '#f2f2eb');
    }
}

/**
 * Initialize theme toggle handler
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('change', function () {
        const isDark = this.checked;

        // Haptic feedback
        if (window.MaterioHaptics) {
            window.MaterioHaptics.vibrate(isDark ? 'toggleOn' : 'toggleOff');
        }

        setCookie('theme', isDark ? 'dark' : 'light', 30);
        applyTheme(isDark);
        updateSmartDarkModeStatus();
        updatePureLightModeVisibility();
    });

    // Also handle click for theme color update
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        updateThemeColor();
    });
}

/**
 * Setup system theme change listener
 */
function setupSystemThemeListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        const userTheme = getCookie('theme');

        // Only auto-switch if using system theme
        if (!userTheme) {
            const isDark = e.matches;

            // Update PDF iframe
            const pdfIframe = document.getElementById('pdf-iframe');
            if (pdfIframe?.contentWindow) {
                try {
                    pdfIframe.contentWindow.postMessage({
                        type: 'themeMode',
                        isDark: isDark
                    }, '*');
                } catch (err) {
                    // Silently fail
                }
            }
        }
    });
}

/**
 * Initialize theme module
 */
function init() {
    initPureLightMode();
    initThemeToggle();
    applyThemeBasedOnConditions();
    startSmartDarkModeChecker();
    updateThemeColor();
    setupSystemThemeListener();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expose for testing
window.applyThemeBasedOnConditions = applyThemeBasedOnConditions;

// Export for module use
export {
    init,
    applyTheme,
    applyThemeBasedOnConditions,
    isSmartDarkModeTime,
    systemPrefersDark,
    shouldApplySmartDarkMode,
    updateThemeColor,
    updateSmartDarkModeStatus,
    updatePureLightModeVisibility
};