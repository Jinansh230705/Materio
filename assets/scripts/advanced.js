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
    }, 200));    // Paper Mode functionality
    const paperModeToggle = document.getElementById("paperModeToggle");
    const grainDetails = document.getElementById("grainDetails");
    const grainSizeControl = document.getElementById("grainSizeControl");
    const grainSizeSlider = document.getElementById("grainSizeSlider");
    const grainSizeValue = document.getElementById("grainSizeValue");
    const popup = document.getElementById("popup");

    function initializePaperMode() {
        const savedPaperMode = getCookie("paperMode");
        const savedGrainSize = getCookie("grainSize") || "100";
        
        if (savedPaperMode === "true") {
            paperModeToggle.checked = true;
            enablePaperMode();
            showGrainSizeControl();
        }
        
        if (grainSizeSlider) {
            grainSizeSlider.value = savedGrainSize;
            updateGrainSize(savedGrainSize);
        }
    }    // Helper function to apply overlay modes to PDF iframe using postMessage
    function applyOverlayToPDFIframe(mode, enable) {
        const pdfIframe = document.getElementById('pdf-iframe');
        if (pdfIframe) {
            // Try direct access first (same-origin)
            try {
                const iframeBody = pdfIframe.contentDocument?.body;
                if (iframeBody) {
                    if (enable) {
                        iframeBody.classList.add(mode);
                    } else {
                        iframeBody.classList.remove(mode);
                    }
                    return; // Success with direct access
                }
            } catch (e) {
                // Cross-origin, use postMessage
            }
            
            // Use postMessage for cross-origin communication
            try {
                pdfIframe.contentWindow.postMessage({
                    type: 'overlayMode',
                    mode: mode,
                    enable: enable
                }, '*');
            } catch (e) {
                // console.log('Could not communicate with PDF iframe');
            }
        }
    }    // Listen for messages from iframe to handle overlay mode requests
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'applyOverlayModes') {
            const pdfIframe = document.getElementById('pdf-iframe');
            if (pdfIframe && event.source === pdfIframe.contentWindow) {
                const mainPopup = document.getElementById('popup');
                if (mainPopup) {                    // Send current overlay states to iframe
                    const paperMode = mainPopup.classList.contains('paper-mode');
                    const nightReading = mainPopup.classList.contains('night-reading');
                    const einkMode = mainPopup.classList.contains('eink-mode');
                    
                    if (paperMode) {
                        pdfIframe.contentWindow.postMessage({
                            type: 'overlayMode',
                            mode: 'paper-mode',
                            enable: true
                        }, '*');
                    }
                    
                    if (nightReading) {
                        pdfIframe.contentWindow.postMessage({
                            type: 'overlayMode',
                            mode: 'night-reading',
                            enable: true
                        }, '*');
                    }
                    
                    if (einkMode) {
                        pdfIframe.contentWindow.postMessage({
                            type: 'overlayMode',
                            mode: 'eink-mode',
                            enable: true
                        }, '*');
                    }
                    
                    // Send current theme state to iframe
                    const isDarkMode = document.body.classList.contains('dark-mode');
                    pdfIframe.contentWindow.postMessage({
                        type: 'themeMode',
                        isDark: isDarkMode
                    }, '*');
                }
            }
        }
    });

    function enablePaperMode() {
        if (popup) {
            popup.classList.add('paper-mode');
        }
        applyOverlayToPDFIframe('paper-mode', true);
        showGrainSizeControl();
    }

    function disablePaperMode() {
        if (popup) {
            popup.classList.remove('paper-mode');
        }
        applyOverlayToPDFIframe('paper-mode', false);
        hideGrainSizeControl();
    }
      function showGrainSizeControl() {
        if (grainDetails) {
            grainDetails.style.display = 'block';
        }
    }
    
    function hideGrainSizeControl() {
        if (grainDetails) {
            grainDetails.style.display = 'none';
        }
    }
    
    function updateGrainSize(size) {
        const grainSizePx = Math.round((size / 100) * 200); // Base size is 200px
        if (popup) {
            popup.style.setProperty('--grain-size', `${grainSizePx}px`);
        }
        if (grainSizeValue) {
            grainSizeValue.textContent = `${size}%`;
        }
    }

    // Initialize paper mode on page load
    initializePaperMode();    if (paperModeToggle) {
        paperModeToggle.addEventListener("change", function () {
            if (this.checked) {
                enablePaperMode();
                setCookie("paperMode", "true", 30);
            } else {
                disablePaperMode();
                setCookie("paperMode", "false", 30);
            }
        });
    }
    
    // Grain size slider event listener
    if (grainSizeSlider) {
        grainSizeSlider.addEventListener("input", function () {
            const size = this.value;
            updateGrainSize(size);
            setCookie("grainSize", size, 30);
        });
    }

    // Listen for popup show/hide events to apply paper mode
    if (popup) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = popup.style.display !== 'none' && popup.style.display !== '';
                    if (isVisible && paperModeToggle && paperModeToggle.checked) {
                        enablePaperMode();
                    }
                }
            });
        });
          observer.observe(popup, { 
            attributes: true, 
            attributeFilter: ['style', 'class'] 
        });
    }

    // Night Reading Mode functionality
    const nightReadingToggle = document.getElementById("nightReadingToggle");
    const nightReadingDetails = document.getElementById("nightReadingDetails");
    const nightStartTime = document.getElementById("nightStartTime");
    const nightEndTime = document.getElementById("nightEndTime");
    const nightScheduleToggle = document.getElementById("nightScheduleToggle");
    const warmthSlider = document.getElementById("warmthSlider");
    const warmthValue = document.getElementById("warmthValue");
    let nightModeInterval = null;

    function initializeNightReading() {
        const savedNightReading = getCookie("nightReading");
        const savedStartTime = getCookie("nightStartTime") || "20:00";
        const savedEndTime = getCookie("nightEndTime") || "06:00";
        const savedSchedule = getCookie("nightSchedule");
        const savedWarmth = getCookie("nightWarmth") || "50";
        
        if (savedNightReading === "true") {
            nightReadingToggle.checked = true;
            enableNightReading();
            showNightReadingControl();
        }
        
        if (nightStartTime) nightStartTime.value = savedStartTime;
        if (nightEndTime) nightEndTime.value = savedEndTime;
        
        if (savedSchedule === "true") {
            nightScheduleToggle.checked = true;
            startNightSchedule();
        }
          if (warmthSlider) {
            warmthSlider.value = savedWarmth;
            updateWarmth(savedWarmth);
        }
    }    

    function enableNightReading() {
        if (popup) {
            popup.classList.add('night-reading');
            // Apply warmth level from slider
            if (warmthSlider) {
                updateWarmth(warmthSlider.value);
            }
        }        applyOverlayToPDFIframe('night-reading', true);
        showNightReadingControl();
        
        // Apply warmth setting to PDF iframe after a short delay to ensure overlay is applied
        setTimeout(() => {
            if (warmthSlider) {
                updateWarmth(warmthSlider.value);
            }
        }, 300); // Increased delay for better reliability
    }

    function disableNightReading() {
        if (popup) {
            popup.classList.remove('night-reading');
        }
        applyOverlayToPDFIframe('night-reading', false);
        hideNightReadingControl();
    }
    
    function showNightReadingControl() {
        if (nightReadingDetails) {
            nightReadingDetails.style.display = 'block';
        }
    }
    
    function hideNightReadingControl() {
        if (nightReadingDetails) {
            nightReadingDetails.style.display = 'none';
        }
    }

    function isTimeInRange(startTime, endTime, currentTime) {
        const start = timeToMinutes(startTime);
        const end = timeToMinutes(endTime);
        const current = timeToMinutes(currentTime);
        
        // Handle overnight range (e.g., 20:00 to 06:00)
        if (start > end) {
            return current >= start || current <= end;
        }
        // Handle same-day range
        return current >= start && current <= end;
    }

    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function getCurrentTime() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    function checkNightSchedule() {
        if (!nightScheduleToggle || !nightScheduleToggle.checked) return;
        
        const currentTime = getCurrentTime();
        const startTime = nightStartTime ? nightStartTime.value : "20:00";
        const endTime = nightEndTime ? nightEndTime.value : "06:00";
        
        const shouldBeActive = isTimeInRange(startTime, endTime, currentTime);
        
        if (shouldBeActive && !nightReadingToggle.checked) {
            nightReadingToggle.checked = true;
            enableNightReading();
            setCookie("nightReading", "true", 30);
        } else if (!shouldBeActive && nightReadingToggle.checked) {
            nightReadingToggle.checked = false;
            disableNightReading();
            setCookie("nightReading", "false", 30);
        }
    }

    function startNightSchedule() {
        if (nightModeInterval) {
            clearInterval(nightModeInterval);
        }
        
        // Check every minute
        nightModeInterval = setInterval(checkNightSchedule, 60000);
        // Check immediately
        checkNightSchedule();
    }

    function stopNightSchedule() {
        if (nightModeInterval) {
            clearInterval(nightModeInterval);
            nightModeInterval = null;
        }
    }

    // Initialize night reading mode on page load
    initializeNightReading();

    if (nightReadingToggle) {
        nightReadingToggle.addEventListener("change", function () {
            if (this.checked) {
                enableNightReading();
                setCookie("nightReading", "true", 30);
            } else {
                disableNightReading();
                setCookie("nightReading", "false", 30);
            }
        });
    }

    if (nightScheduleToggle) {
        nightScheduleToggle.addEventListener("change", function () {
            if (this.checked) {
                startNightSchedule();
                setCookie("nightSchedule", "true", 30);
            } else {
                stopNightSchedule();
                setCookie("nightSchedule", "false", 30);
            }
        });
    }

    // Save time settings when changed
    if (nightStartTime) {
        nightStartTime.addEventListener("change", function () {
            setCookie("nightStartTime", this.value, 30);
            if (nightScheduleToggle && nightScheduleToggle.checked) {
                checkNightSchedule();
            }
        });
    }

    if (nightEndTime) {
        nightEndTime.addEventListener("change", function () {
            setCookie("nightEndTime", this.value, 30);
            if (nightScheduleToggle && nightScheduleToggle.checked) {
                checkNightSchedule();
            }
        });
    }

    // Listen for popup show/hide events to apply night reading mode
    if (popup) {
        const nightObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = popup.style.display !== 'none' && popup.style.display !== '';
                    if (isVisible && nightReadingToggle && nightReadingToggle.checked) {
                        enableNightReading();
                    }
                }
            });
        });
        
        nightObserver.observe(popup, { 
            attributes: true, 
            attributeFilter: ['style', 'class'] 
        });
    }

    // E-Ink Mode functionality
    const einkModeToggle = document.getElementById("einkModeToggle");

    function initializeEinkMode() {
        const savedEinkMode = getCookie("einkMode");
        
        if (savedEinkMode === "true") {
            einkModeToggle.checked = true;
            enableEinkMode();
        }
    }

    function enableEinkMode() {
        if (popup) {
            popup.classList.add('eink-mode');
        }
        applyOverlayToPDFIframe('eink-mode', true);
    }

    function disableEinkMode() {
        if (popup) {
            popup.classList.remove('eink-mode');
        }
        applyOverlayToPDFIframe('eink-mode', false);
    }

    // Initialize e-ink mode on page load
    initializeEinkMode();

    if (einkModeToggle) {
        einkModeToggle.addEventListener("change", function () {
            if (this.checked) {
                enableEinkMode();
                setCookie("einkMode", "true", 30);
            } else {
                disableEinkMode();
                setCookie("einkMode", "false", 30);
            }
        });
    }

    // Listen for popup show/hide events to apply e-ink mode
    if (popup) {
        const einkObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = popup.style.display !== 'none' && popup.style.display !== '';
                    if (isVisible && einkModeToggle && einkModeToggle.checked) {
                        enableEinkMode();
                    }
                }
            });
        });
        
        einkObserver.observe(popup, { 
            attributes: true, 
            attributeFilter: ['style', 'class'] 
        });    }

    // Save time settings when changed
    function updateWarmth(value) {
        const warmthOpacity = value / 100 * 0.3; // Scale from 0-100% to 0-0.3 opacity
        if (popup) {
            popup.style.setProperty('--warmth-opacity', warmthOpacity);
        }
        if (warmthValue) {
            warmthValue.textContent = `${value}%`;
        }
        
        // Send warmth level to PDF iframe
        applyWarmthToPDFIframe(warmthOpacity);
        
        // Log the warmth update for debugging
        // console.log(`Warmth updated: ${value}% (opacity: ${warmthOpacity.toFixed(3)})`);
    }
      // Helper function to apply warmth to PDF iframe
    function applyWarmthToPDFIframe(opacity) {
        const pdfIframe = document.getElementById('pdf-iframe');
        if (pdfIframe && popup.classList.contains('night-reading')) {
            // Try direct access first (same-origin)
            try {
                const iframeDoc = pdfIframe.contentDocument;
                if (iframeDoc) {
                    iframeDoc.documentElement.style.setProperty('--warmth-opacity', opacity);
                    
                    // Force repaint to ensure changes are applied
                    if (iframeDoc.body.classList.contains('night-reading')) {
                        const viewer = iframeDoc.getElementById('viewer');
                        if (viewer) {
                            viewer.style.transform = 'translateZ(0)';
                            setTimeout(() => {
                                viewer.style.transform = '';
                            }, 10);
                        }
                    }
                    
                    return; // Success with direct access
                }
            } catch (e) {
                // Cross-origin, use postMessage
                // console.log('Direct access failed, using postMessage:', e.message);
            }
            
            // Use postMessage for cross-origin communication
            try {
                pdfIframe.contentWindow.postMessage({
                    type: 'nightWarmth',
                    opacity: opacity
                }, '*');
            } catch (e) {
                // console.log('Could not send warmth level to PDF iframe');
            }
        }
    }
    
    // Warmth slider event listener
    if (warmthSlider) {
        warmthSlider.addEventListener("input", function () {
            const value = this.value;
            updateWarmth(value);
            setCookie("nightWarmth", value, 30);
        });
    }
});