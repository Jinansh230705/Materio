/**
 * Materio Haptics System (ESM)
 * Provides haptic feedback (vibration) for interactive elements.
 * Uses the Web Vibration API (supported on mobile devices).
 * 
 * @module haptics
 */

// Check if vibration is supported
const isVibrationSupported = 'vibrate' in navigator;

// Haptic feedback patterns (in milliseconds)
// Format: [vibrate, pause, vibrate, pause, ...]
const HapticPatterns = {
    // Light tap - for toggles, checkboxes, radio buttons
    light: [10],

    // Medium tap - for buttons, navbar clicks
    medium: [20],

    // Strong tap - for important actions like submit
    strong: [30],

    // Double tap - for dropdown actions
    double: [15, 50, 15],

    // Success - for completed actions
    success: [20, 50, 30],

    // Error/Warning - for errors or validation issues
    error: [50, 100, 50, 100, 50],

    // Slider tick - for slider movements
    tick: [5],

    // Tab switch - for navbar tab changes
    tab: [12, 40, 12],

    // Loading pattern - "zzz zz zz zz zz zzzzz" style
    loading: [80, 150, 40, 120, 40, 120, 40, 120, 40, 120, 150],

    // Loading step - individual pulse during loading
    loadingPulse: [30, 80],

    // PDF loaded - final confirmation vibration
    loadComplete: [40, 60, 80, 60, 120],

    // Scroll/swipe feedback
    scroll: [8],

    // Toggle on
    toggleOn: [15, 30, 25],

    // Toggle off
    toggleOff: [25, 30, 15],

    // Dropdown open
    dropdownOpen: [12, 40, 20],

    // Dropdown close
    dropdownClose: [20, 40, 12],

    // Selection made
    select: [18]
};

// Intensity multipliers
const IntensityMultipliers = {
    minimal: 0.35,  // Soft, premium thud
    medium: 1.0,    // Standard vibration
    strong: 1.6     // More pronounced
};

// Track ongoing network loading vibration
let networkLoadingInterval = null;
let networkLoadingActive = false;

/**
 * Get current intensity setting
 * @returns {string} - 'minimal', 'medium', or 'strong'
 */
function getIntensity() {
    return localStorage.getItem('materio_haptics_intensity') || 'medium';
}

/**
 * Set intensity setting
 * @param {string} intensity - 'minimal', 'medium', or 'strong'
 */
function setIntensity(intensity) {
    if (IntensityMultipliers[intensity] !== undefined) {
        localStorage.setItem('materio_haptics_intensity', intensity);
    }
}

/**
 * Scale a vibration pattern based on current intensity
 * @param {number[]} pattern - Original pattern array
 * @returns {number[]} - Scaled pattern
 */
function scalePattern(pattern) {
    const multiplier = IntensityMultipliers[getIntensity()] || 1.0;
    return pattern.map(duration => {
        const scaled = Math.round(duration * multiplier);
        return Math.max(scaled, 5);
    });
}

/**
 * Trigger a haptic feedback
 * @param {string|number[]} pattern - Pattern name or custom pattern array
 * @returns {boolean} - Whether vibration was triggered
 */
function vibrate(pattern) {
    if (!isVibrationSupported) return false;

    // Check if user has disabled haptics
    if (localStorage.getItem('materio_haptics_disabled') === 'true') {
        return false;
    }

    let vibrationPattern;

    if (typeof pattern === 'string') {
        vibrationPattern = HapticPatterns[pattern];
        if (!vibrationPattern) {
            vibrationPattern = HapticPatterns.light;
        }
    } else if (Array.isArray(pattern)) {
        vibrationPattern = pattern;
    } else {
        vibrationPattern = HapticPatterns.light;
    }

    // Scale the pattern based on intensity
    const scaledPattern = scalePattern(vibrationPattern);

    try {
        return navigator.vibrate(scaledPattern);
    } catch (error) {
        return false;
    }
}

/**
 * Stop any ongoing vibration
 */
function stopVibration() {
    if (isVibrationSupported) {
        navigator.vibrate(0);
    }
}

/**
 * Loading vibration sequence
 * @param {Function} checkComplete - Function that returns true when loading is complete
 * @param {number} maxDuration - Maximum duration in ms (default 10 seconds)
 * @returns {Promise} - Resolves when loading completes or times out
 */
function startLoadingVibration(checkComplete, maxDuration = 10000) {
    return new Promise((resolve) => {
        if (!isVibrationSupported || localStorage.getItem('materio_haptics_disabled') === 'true') {
            resolve();
            return;
        }

        let elapsed = 0;
        const pulseInterval = 200;
        let pulseCount = 0;

        const intervalId = setInterval(() => {
            elapsed += pulseInterval;

            if (checkComplete?.()) {
                clearInterval(intervalId);
                setTimeout(() => {
                    vibrate('loadComplete');
                    resolve();
                }, 100);
                return;
            }

            if (elapsed >= maxDuration) {
                clearInterval(intervalId);
                stopVibration();
                resolve();
                return;
            }

            pulseCount++;
            if (pulseCount === 1) {
                vibrate([60]);
            } else if (pulseCount <= 5) {
                vibrate([35]);
            } else {
                pulseCount = 0;
            }
        }, pulseInterval);
    });
}

/**
 * Simple loading start vibration
 */
function loadingStart() {
    vibrate('loading');
}

/**
 * Loading complete vibration
 */
function loadingComplete() {
    stopNetworkLoading();
    vibrate('loadComplete');
}

/**
 * Start network loading vibration
 * @param {number} maxDuration - Maximum duration in ms (default 30 seconds)
 */
function startNetworkLoading(maxDuration = 30000) {
    if (networkLoadingActive) return;
    if (!isVibrationSupported) return;
    if (localStorage.getItem('materio_haptics_disabled') === 'true') return;

    networkLoadingActive = true;
    let elapsed = 0;
    const pulseInterval = 250;

    vibrate([40]);

    networkLoadingInterval = setInterval(() => {
        elapsed += pulseInterval;

        if (elapsed >= maxDuration) {
            stopNetworkLoading();
            return;
        }

        vibrate([30]);
    }, pulseInterval);
}

/**
 * Stop network loading vibration
 */
function stopNetworkLoading() {
    if (networkLoadingInterval) {
        clearInterval(networkLoadingInterval);
        networkLoadingInterval = null;
    }
    networkLoadingActive = false;
    stopVibration();
}

/**
 * Trigger a single progress pulse
 */
function progressPulse() {
    if (!isVibrationSupported) return;
    if (localStorage.getItem('materio_haptics_disabled') === 'true') return;
    vibrate([25]);
}

/**
 * Auto-attach haptic feedback to common interactive elements
 */
function autoAttachHaptics() {
    // Toggles/Switches
    document.querySelectorAll('input[type="checkbox"].toggle, input[type="checkbox"][id*="Toggle"], .toggle-switch input').forEach(toggle => {
        if (!toggle.dataset.hapticAttached) {
            toggle.addEventListener('change', function () {
                vibrate(this.checked ? 'toggleOn' : 'toggleOff');
            });
            toggle.dataset.hapticAttached = 'true';
        }
    });

    // Sliders/Range inputs
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        if (!slider.dataset.hapticAttached) {
            let lastValue = slider.value;
            slider.addEventListener('input', function () {
                const step = parseFloat(slider.step) || 1;
                const newValue = parseFloat(this.value);
                const oldValue = parseFloat(lastValue);

                if (Math.abs(newValue - oldValue) >= step) {
                    vibrate('tick');
                    lastValue = this.value;
                }
            });
            slider.dataset.hapticAttached = 'true';
        }
    });

    // Navbar tab links
    document.querySelectorAll('.tab-link, .nav-link, [data-tab]').forEach(link => {
        if (!link.dataset.hapticAttached) {
            link.addEventListener('click', () => vibrate('tab'));
            link.dataset.hapticAttached = 'true';
        }
    });

    // Dropdown triggers
    document.querySelectorAll('[id*="DropdownTrigger"], .dropdown-trigger, [data-dropdown-toggle]').forEach(trigger => {
        if (!trigger.dataset.hapticAttached) {
            trigger.addEventListener('click', function () {
                const wrapper = this.closest('[class*="dropdown"]') || this.parentElement;
                const isOpen = wrapper?.classList.contains('open') || wrapper?.classList.contains('show');
                vibrate(isOpen ? 'dropdownClose' : 'dropdownOpen');
            });
            trigger.dataset.hapticAttached = 'true';
        }
    });

    // Dropdown items
    document.querySelectorAll('.dropdown-item, [class*="dropdown"] [class*="item"]').forEach(item => {
        if (!item.dataset.hapticAttached) {
            item.addEventListener('click', () => vibrate('select'));
            item.dataset.hapticAttached = 'true';
        }
    });

    // General buttons
    document.querySelectorAll('button:not([data-haptic-attached]), .btn:not([data-haptic-attached])').forEach(btn => {
        if (!btn.dataset.hapticAttached && !btn.id?.includes('submit')) {
            btn.addEventListener('click', () => vibrate('medium'));
            btn.dataset.hapticAttached = 'true';
        }
    });
}

/**
 * Attach haptic to submit button with loading pattern
 * @param {string} submitButtonId - ID of the submit button
 * @param {Function} loadingChecker - Function that returns true when loading is complete
 */
function attachSubmitHaptic(submitButtonId, loadingChecker) {
    const submitBtn = document.getElementById(submitButtonId);
    if (submitBtn && !submitBtn.dataset.hapticSubmitAttached) {
        submitBtn.addEventListener('click', function () {
            vibrate('strong');

            if (loadingChecker && typeof loadingChecker === 'function') {
                setTimeout(() => {
                    startLoadingVibration(loadingChecker);
                }, 100);
            }
        });
        submitBtn.dataset.hapticSubmitAttached = 'true';
    }
}

/**
 * Enable/Disable haptic feedback
 * @param {boolean} enabled
 */
function setHapticsEnabled(enabled) {
    localStorage.setItem('materio_haptics_disabled', enabled ? 'false' : 'true');
}

/**
 * Check if haptics are enabled
 * @returns {boolean}
 */
function isHapticsEnabled() {
    return localStorage.getItem('materio_haptics_disabled') !== 'true';
}

/**
 * Initialize the haptic toggle UI in settings
 */
function initializeHapticToggle() {
    const hapticToggle = document.getElementById('hapticToggle');
    const hapticIntensityOptions = document.getElementById('hapticIntensityOptions');
    const intensitySlider = document.getElementById('hapticIntensitySlider');
    const intensityValue = document.getElementById('hapticIntensityValue');

    const intensityLabels = ['Minimal', 'Medium', 'Strong'];
    const intensityValues = ['minimal', 'medium', 'strong'];

    if (!hapticToggle) return;

    // Set initial state
    const hapticsEnabled = isHapticsEnabled();
    hapticToggle.checked = hapticsEnabled;

    if (hapticIntensityOptions) {
        hapticIntensityOptions.style.display = hapticsEnabled ? 'block' : 'none';
    }

    // Set initial slider position
    if (intensitySlider) {
        const currentIntensity = getIntensity();
        const sliderValue = intensityValues.indexOf(currentIntensity);
        intensitySlider.value = sliderValue >= 0 ? sliderValue : 1;

        if (intensityValue) {
            intensityValue.textContent = intensityLabels[intensitySlider.value];
        }
    }

    // Toggle change handler
    hapticToggle.addEventListener('change', function () {
        const enabled = this.checked;
        setHapticsEnabled(enabled);

        if (hapticIntensityOptions) {
            hapticIntensityOptions.style.display = enabled ? 'block' : 'none';
        }

        if (enabled && isVibrationSupported) {
            vibrate('success');
        }
    });

    // Slider handlers
    if (intensitySlider) {
        intensitySlider.addEventListener('input', function () {
            const sliderVal = parseInt(this.value);
            const intensity = intensityValues[sliderVal];

            if (intensityValue) {
                intensityValue.textContent = intensityLabels[sliderVal];
            }

            setIntensity(intensity);
            vibrate('tick');
        });

        intensitySlider.addEventListener('change', () => vibrate('medium'));
    }

    // Hide on desktop
    const hapticCard = document.getElementById('hapticToggleCard');
    if (hapticCard && !isVibrationSupported) {
        hapticCard.style.display = 'none';
    }
}

/**
 * Setup mutation observer for dynamically added elements
 */
function setupMutationObserver() {
    const observer = new MutationObserver(function (mutations) {
        let hasNewInteractiveElements = false;

        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) {
                        if (node.matches?.('input, button, .btn, .tab-link, .dropdown-item') ||
                            node.querySelector?.('input, button, .btn, .tab-link, .dropdown-item')) {
                            hasNewInteractiveElements = true;
                        }
                    }
                });
            }
        });

        if (hasNewInteractiveElements) {
            clearTimeout(observer.debounceTimer);
            observer.debounceTimer = setTimeout(autoAttachHaptics, 100);
        }
    });

    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
}

/**
 * Initialize haptics system
 */
function init() {
    autoAttachHaptics();
    initializeHapticToggle();
    setupMutationObserver();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Create the MaterioHaptics API object
const MaterioHaptics = {
    vibrate,
    stopVibration,
    startLoadingVibration,
    loadingStart,
    loadingComplete,
    startNetworkLoading,
    stopNetworkLoading,
    progressPulse,
    autoAttachHaptics,
    attachSubmitHaptic,
    setHapticsEnabled,
    isHapticsEnabled,
    getIntensity,
    setIntensity,
    patterns: HapticPatterns,
    isSupported: isVibrationSupported
};

// Expose the API globally for backward compatibility
window.MaterioHaptics = MaterioHaptics;

// Export for module use
export {
    MaterioHaptics as default,
    vibrate,
    stopVibration,
    startLoadingVibration,
    loadingStart,
    loadingComplete,
    startNetworkLoading,
    stopNetworkLoading,
    progressPulse,
    autoAttachHaptics,
    attachSubmitHaptic,
    setHapticsEnabled,
    isHapticsEnabled,
    getIntensity,
    setIntensity,
    HapticPatterns,
    isVibrationSupported
};
