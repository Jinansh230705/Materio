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
                console.log('Could not communicate with PDF iframe');
            }
        }
    }

    // Listen for messages from iframe to handle overlay mode requests
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'applyOverlayModes') {
            const pdfIframe = document.getElementById('pdf-iframe');
            if (pdfIframe && event.source === pdfIframe.contentWindow) {
                const mainPopup = document.getElementById('popup');
                if (mainPopup) {
                    // Send current overlay states to iframe
                    const paperMode = mainPopup.classList.contains('paper-mode');
                    const nightReading = mainPopup.classList.contains('night-reading');
                    
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
    let nightModeInterval = null;

    function initializeNightReading() {
        const savedNightReading = getCookie("nightReading");
        const savedStartTime = getCookie("nightStartTime") || "20:00";
        const savedEndTime = getCookie("nightEndTime") || "06:00";
        const savedSchedule = getCookie("nightSchedule");
        
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
    }    function enableNightReading() {
        if (popup) {
            popup.classList.add('night-reading');
        }
        applyOverlayToPDFIframe('night-reading', true);
        showNightReadingControl();
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
});