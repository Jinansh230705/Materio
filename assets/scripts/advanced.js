document.addEventListener('DOMContentLoaded', function () {
    const enableBgToggle = document.getElementById("enableBgToggle");
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

    function setWallpaperAsBackground(wallpaperType) {
        const selectedCard = document.querySelector(`[data-wallpaper="${wallpaperType}"]`);
        if (selectedCard) {
            const bgImage = selectedCard.dataset.bgImage;
            if (wallpaperType === 'dynamic') {
                // Apply dynamic wallpaper
                applyDynamicWallpaper();
            } else if (wallpaperType === 'christmas-dynamic') {
                // Apply Christmas dynamic wallpaper
                applyChristmasDynamicWallpaper();
            } else if (wallpaperType === 'custom') {
                // Apply custom uploaded wallpaper
                applyCustomWallpaper();
            } else if (bgImage && bgImage !== '') {
                homeElem.style.setProperty("--bg-img", bgImage);
            } else {
                // Default background - apply event background directly
                if (cachedEventToApply) {
                    updateBgFromEvent(cachedEventToApply);
                } else {
                    // Load and apply event background
                    initEventData();
                }
            }
        } else {

        }
    }

    // Dynamic wallpaper functionality
    function getDynamicImageIndex() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;

        // Custom time mappings for part_0 to part_8
        // part_0: 5:45 AM - 6:00 AM
        if ((totalMinutes >= 345 && totalMinutes < 360)) { // 5:45-6:00 AM
            return 0;
        }
        // part_1: 6:00 AM - 6:45 AM
        else if (totalMinutes >= 360 && totalMinutes < 405) { // 6:00-6:45 AM
            return 1;
        }
        // part_2: 6:45 AM - 5:45 AM (next day) - This seems like it should be PM, assuming 6:45 AM - 5:45 PM
        else if (totalMinutes >= 405 && totalMinutes < 1065) { // 6:45 AM - 5:45 PM
            return 2;
        }
        // part_3: 5:45 PM - 6:00 PM
        else if (totalMinutes >= 1065 && totalMinutes < 1080) { // 5:45-6:00 PM
            return 3;
        }
        // part_4: 6:00 PM - 7:00 PM
        else if (totalMinutes >= 1080 && totalMinutes < 1140) { // 6:00-7:00 PM
            return 4;
        }
        // part_5: 7:00 PM - 7:45 PM
        else if (totalMinutes >= 1140 && totalMinutes < 1185) { // 7:00-7:45 PM
            return 5;
        }
        // part_6: 7:45 PM - 11:50 PM
        else if (totalMinutes >= 1185 && totalMinutes < 1430) { // 7:45-11:50 PM
            return 6;
        }
        // part_7: 11:50 PM - 12:30 AM (next day)
        else if (totalMinutes >= 1430 || totalMinutes < 30) { // 11:50 PM - 12:30 AM
            return 7;
        }
        // part_8: 12:30 AM - 5:45 AM
        else if (totalMinutes >= 30 && totalMinutes < 345) { // 12:30-5:45 AM
            return 8;
        }

        // Fallback to part_0
        return 0;
    }

    function getDynamicImageUrl(customEventConfig) {
        if (customEventConfig && customEventConfig.dynamic_config) {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const totalMinutes = hours * 60 + minutes;

            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            for (const config of customEventConfig.dynamic_config) {
                // Check for exclusive dates
                if (config.exclusive_dates) {
                    if (!config.exclusive_dates.includes(dateString)) {
                        continue;
                    }
                }

                const [startHour, startMinute] = config.start.split(':').map(Number);
                const [endHour, endMinute] = config.end.split(':').map(Number);

                const startTotal = startHour * 60 + startMinute;
                const endTotal = endHour * 60 + endMinute;

                // Handle ranges that cross midnight (e.g. 23:00 to 01:00)
                if (startTotal > endTotal) {
                    if (totalMinutes >= startTotal || totalMinutes < endTotal) {
                        return `url('${config.image}')`;
                    }
                } else {
                    if (totalMinutes >= startTotal && totalMinutes < endTotal) {
                        return `url('${config.image}')`;
                    }
                }
            }
        }

        const index = getDynamicImageIndex();
        return `url('/assets/img/events/dynamic/part_${index}.webp')`;
    }

    function applyDynamicWallpaper(customEventConfig = null) {
        // If no config passed, try to use cached event if it's dynamic
        if (!customEventConfig && cachedEventToApply && (cachedEventToApply.url_pc === 'dynamic' || cachedEventToApply.url_mobile === 'dynamic')) {
            customEventConfig = cachedEventToApply;
        }

        const imageUrl = getDynamicImageUrl(customEventConfig);
        homeElem.style.setProperty("--bg-img", imageUrl);

        // Update preview card to show current image
        updateDynamicPreview(customEventConfig);
    }
    // Expose for debugging/testing
    window.applyDynamicWallpaper = applyDynamicWallpaper;

    function updateDynamicPreview(customEventConfig = null) {
        const dynamicPreview = document.getElementById('dynamicPreview');
        const dynamicTime = document.getElementById('dynamicTime');

        if (dynamicPreview) {
            let imageUrl;
            if (customEventConfig && customEventConfig.dynamic_config) {
                // Extract URL from the result of getDynamicImageUrl which returns "url('...')"
                const bgStyle = getDynamicImageUrl(customEventConfig);
                // Remove url('') wrapper
                imageUrl = bgStyle.slice(5, -2);
            } else {
                const index = getDynamicImageIndex();
                imageUrl = `/assets/img/events/dynamic/part_${index}.webp`;
            }

            dynamicPreview.style.backgroundImage = `url('${imageUrl}')`;
            dynamicPreview.style.backgroundSize = 'cover';
            dynamicPreview.style.backgroundPosition = 'center';

            // Remove the animated gradient
            dynamicPreview.style.animation = 'none';
        }

        if (dynamicTime) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            dynamicTime.textContent = timeString;
        }
    }

    // Dynamic wallpaper timer
    let dynamicWallpaperInterval = null;

    function startDynamicWallpaperTimer() {
        // Clear any existing interval
        if (dynamicWallpaperInterval) {
            clearInterval(dynamicWallpaperInterval);
        }

        // Update every minute to check for time changes
        dynamicWallpaperInterval = setInterval(() => {
            const selectedWallpaper = getCookie("selectedWallpaper");
            if (selectedWallpaper === 'dynamic') {
                applyDynamicWallpaper();
            }
        }, 60000); // Update every minute
    }

    function stopDynamicWallpaperTimer() {
        if (dynamicWallpaperInterval) {
            clearInterval(dynamicWallpaperInterval);
            dynamicWallpaperInterval = null;
        }
    }

    // Christmas Dynamic Wallpaper Functions
    function getChristmasImageUrl() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;

        // Christmas dynamic wallpaper time mappings
        // part_2: 6:45 AM - 5:45 PM (daytime)
        if (totalMinutes >= 405 && totalMinutes < 1065) {
            return `url('/assets/img/events/dynamic/christmas/part_2.webp')`;
        }
        // part_3: 5:45 PM - 6:00 PM (sunset start)
        else if (totalMinutes >= 1065 && totalMinutes < 1080) {
            return `url('/assets/img/events/dynamic/christmas/part_3.webp')`;
        }
        // part_4: 6:00 PM - 7:00 PM (sunset)
        else if (totalMinutes >= 1080 && totalMinutes < 1140) {
            return `url('/assets/img/events/dynamic/christmas/part_4.webp')`;
        }
        // part_5: 7:00 PM - 9:20 PM (evening)
        else if (totalMinutes >= 1140 && totalMinutes < 1280) {
            return `url('/assets/img/events/dynamic/christmas/part_5.webp')`;
        }
        // part_6: 9:20 PM - 11:50 PM (night)
        else if (totalMinutes >= 1280 && totalMinutes < 1430) {
            return `url('/assets/img/events/dynamic/christmas/part_6.webp')`;
        }
        // part_8: 11:50 PM - 5:45 AM (late night)
        else if (totalMinutes >= 1430 || totalMinutes < 345) {
            return `url('/assets/img/events/dynamic/christmas/part_8.webp')`;
        }
        // Fallback to daytime
        return `url('/assets/img/events/dynamic/christmas/part_2.webp')`;
    }

    function applyChristmasDynamicWallpaper() {
        const imageUrl = getChristmasImageUrl();
        homeElem.style.setProperty("--bg-img", imageUrl);

        // Update Christmas preview card
        updateChristmasPreview();
    }

    function updateChristmasPreview() {
        const christmasPreview = document.getElementById('christmasPreview');
        const christmasTime = document.getElementById('christmasTime');

        if (christmasPreview) {
            const bgStyle = getChristmasImageUrl();
            // Remove url('') wrapper
            const imageUrl = bgStyle.slice(5, -2);
            christmasPreview.style.backgroundImage = `url('${imageUrl}')`;
            christmasPreview.style.backgroundSize = 'cover';
            christmasPreview.style.backgroundPosition = 'center';
        }

        if (christmasTime) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            christmasTime.textContent = timeString;
        }
    }

    // Christmas wallpaper timer
    let christmasWallpaperInterval = null;

    function startChristmasWallpaperTimer() {
        if (christmasWallpaperInterval) {
            clearInterval(christmasWallpaperInterval);
        }

        christmasWallpaperInterval = setInterval(() => {
            const selectedWallpaper = getCookie("selectedWallpaper");
            if (selectedWallpaper === 'christmas-dynamic') {
                applyChristmasDynamicWallpaper();
            }
        }, 60000);
    }

    function stopChristmasWallpaperTimer() {
        if (christmasWallpaperInterval) {
            clearInterval(christmasWallpaperInterval);
            christmasWallpaperInterval = null;
        }
    }

    // Custom Upload Wallpaper Functions
    function applyCustomWallpaper() {
        const customWallpaperData = localStorage.getItem('materio_custom_wallpaper');
        if (customWallpaperData) {
            homeElem.style.setProperty("--bg-img", `url('${customWallpaperData}')`);
        } else {
            // No custom wallpaper set, fall back to default
            if (cachedEventToApply) {
                updateBgFromEvent(cachedEventToApply);
            }
        }
    }

    function initializeCustomWallpaper() {
        const customWallpaperCard = document.getElementById('customWallpaperCard');
        const customWallpaperInput = document.getElementById('customWallpaperInput');
        const customPreview = document.getElementById('customPreview');
        const removeCustomWallpaper = document.getElementById('removeCustomWallpaper');
        const customWallpaperOverlay = customPreview?.querySelector('.custom-wallpaper-overlay');
        const uploadContent = customPreview?.querySelector('.wallpaper-upload-content');

        // Check if a custom wallpaper is already saved
        const savedCustomWallpaper = localStorage.getItem('materio_custom_wallpaper');
        if (savedCustomWallpaper && customWallpaperCard) {
            updateCustomWallpaperUI(savedCustomWallpaper);
        }

        // Handle click on custom wallpaper card
        if (customWallpaperCard && customWallpaperInput) {
            customWallpaperCard.addEventListener('click', function (e) {
                // Don't trigger file input if clicking on remove button
                if (e.target.closest('.custom-wallpaper-remove')) {
                    return;
                }

                const hasCustomImage = localStorage.getItem('materio_custom_wallpaper');
                if (hasCustomImage) {
                    // If already has custom image, just apply it
                    setWallpaperAsBackground('custom');

                    // Update selection UI
                    wallpaperCards.forEach(c => c.classList.remove('selected'));
                    customWallpaperCard.classList.add('selected');
                    setCookie("selectedWallpaper", 'custom', 30);
                } else {
                    // Open file picker
                    customWallpaperInput.click();
                }
            });
        }

        // Handle file selection
        if (customWallpaperInput) {
            customWallpaperInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    // Check file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        if (window.materioAlert) {
                            materioAlert('Image size should be less than 5MB.', {
                                title: 'File Too Large',
                                type: 'warning',
                                buttonText: 'Got it'
                            });
                        } else {
                            alert('Image size should be less than 5MB.');
                        }
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = function (event) {
                        const dataUrl = event.target.result;

                        // Save to localStorage
                        try {
                            localStorage.setItem('materio_custom_wallpaper', dataUrl);

                            // Update UI
                            updateCustomWallpaperUI(dataUrl);

                            // Apply wallpaper
                            setWallpaperAsBackground('custom');

                            // Update selection
                            wallpaperCards.forEach(c => c.classList.remove('selected'));
                            customWallpaperCard.classList.add('selected');
                            setCookie("selectedWallpaper", 'custom', 30);

                            // Haptic feedback
                            if (window.MaterioHaptics) {
                                window.MaterioHaptics.vibrate('success');
                            }
                        } catch (e) {

                            if (window.materioAlert) {
                                materioAlert('Could not save wallpaper. The image may be too large.', {
                                    title: 'Storage Error',
                                    type: 'error',
                                    buttonText: 'OK'
                                });
                            }
                        }
                    };
                    reader.readAsDataURL(file);
                }

                // Reset input to allow selecting same file again
                this.value = '';
            });
        }

        // Handle remove custom wallpaper
        if (removeCustomWallpaper) {
            removeCustomWallpaper.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();

                // Remove from localStorage
                localStorage.removeItem('materio_custom_wallpaper');

                // Reset UI
                if (customPreview) {
                    customPreview.style.backgroundImage = '';
                    if (customWallpaperOverlay) customWallpaperOverlay.style.display = 'none';
                    if (uploadContent) uploadContent.style.display = 'flex';
                }
                if (customWallpaperCard) {
                    customWallpaperCard.classList.remove('has-image', 'selected');
                }

                // Switch to default/dynamic wallpaper
                const defaultCard = document.querySelector('[data-wallpaper="dynamic"]');
                if (defaultCard) {
                    defaultCard.classList.add('selected');
                }
                setCookie("selectedWallpaper", 'dynamic', 30);
                setWallpaperAsBackground('dynamic');

                // Haptic feedback
                if (window.MaterioHaptics) {
                    window.MaterioHaptics.vibrate('tap');
                }
            });
        }
    }

    function updateCustomWallpaperUI(imageData) {
        const customWallpaperCard = document.getElementById('customWallpaperCard');
        const customPreview = document.getElementById('customPreview');
        const customWallpaperOverlay = customPreview?.querySelector('.custom-wallpaper-overlay');
        const uploadContent = customPreview?.querySelector('.wallpaper-upload-content');

        if (customPreview && imageData) {
            customPreview.style.backgroundImage = `url('${imageData}')`;
            customPreview.style.backgroundSize = 'cover';
            customPreview.style.backgroundPosition = 'center';

            if (customWallpaperOverlay) customWallpaperOverlay.style.display = 'flex';
            if (uploadContent) uploadContent.style.display = 'none';
        }

        if (customWallpaperCard) {
            customWallpaperCard.classList.add('has-image');
        }
    }

    // Initialize Christmas preview on load
    updateChristmasPreview();

    function initEventData() {
        fetch('/assets/data/events.json')
            .then(response => response.json())
            .then(events => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

                // First, try to find default event
                let defaultEvents = events.filter(ev => ev.default == 1);
                let eventToApply = defaultEvents.length > 0 ? defaultEvents[0] : null;

                // Then check for recent non-default active events (these override the default)
                // Only consider events from the last 30 days to avoid old events taking precedence
                let activeEvents = events.filter(ev => {
                    const eventDate = new Date(ev.setDate);

                    // Check if event is active based on start date
                    if (eventDate > now) return false;

                    // Check end date if provided, otherwise use 30-day window
                    if (ev.endDate) {
                        const endDate = new Date(ev.endDate);
                        return endDate >= now && ev.default == 0;
                    } else {
                        return eventDate >= thirtyDaysAgo && ev.default == 0;
                    }
                });

                if (activeEvents.length > 0) {
                    // Use the most recent non-default event
                    eventToApply = activeEvents.sort((a, b) => new Date(b.setDate) - new Date(a.setDate))[0];
                }

                if (eventToApply) {
                    cachedEventToApply = eventToApply;
                    updateHeaderLogo(eventToApply);
                }
                applyEventBackgroundForHome();
            })
            .catch(err => {

                applyEventBackgroundForHome();
            });
    }

    function updateHeaderLogo(eventToApply) {
        if (eventToApply.header_logo_light) {
            document.documentElement.style.setProperty('--header-logo-light', `url('${eventToApply.header_logo_light}')`);
        }
        if (eventToApply.header_logo_dark) {
            document.documentElement.style.setProperty('--header-logo-dark', `url('${eventToApply.header_logo_dark}')`);
        }
    }

    function applyEventBackgroundForHome() {
        if (enableBgToggle && !enableBgToggle.checked) {
            homeElem.style.setProperty("--bg-img", "none");
            return;
        }

        // Check if a custom wallpaper is selected, default to 'dynamic' if none selected
        const selectedWallpaper = getCookie("selectedWallpaper") || 'dynamic';
        if (selectedWallpaper && selectedWallpaper !== 'default') {
            setWallpaperAsBackground(selectedWallpaper);
            return;
        }

        if (cachedEventToApply) {
            updateBgFromEvent(cachedEventToApply);
        } else {
            // Fallback if no event data is available yet (shouldn't happen if initEventData called first)
            // or if fetch failed.
            // If we are here, we want default behavior.
            // If initEventData hasn't run, we can't do much.
            // But we are calling initEventData on load.
        }
    }

    function updateBgFromEvent(eventToApply) {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const bgUrl = isMobile ? eventToApply.url_mobile : eventToApply.url_pc;

        // Check if the URL is set to "dynamic"
        if (bgUrl === "dynamic") {
            applyDynamicWallpaper(eventToApply);
        } else {
            homeElem.style.setProperty("--bg-img", `url('${bgUrl}')`);
        }
    }

    const savedBgSetting = getCookie("enableBg");
    if (savedBgSetting === "false") {
        if (enableBgToggle) enableBgToggle.checked = false;
        homeElem.style.setProperty("--bg-img", "none");
    } else {
        if (enableBgToggle) enableBgToggle.checked = true;
    }



    // Start by initializing event data, which will then apply background
    initEventData();

    if (enableBgToggle) {
        enableBgToggle.addEventListener("change", function () {
            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate(this.checked ? 'toggleOn' : 'toggleOff');
            }
            if (!this.checked) {
                homeElem.style.setProperty("--bg-img", "none");
            } else {
                applyEventBackgroundForHome();
            }
            setCookie("enableBg", this.checked ? "true" : "false", 30);
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
        if (enableBgToggle && !enableBgToggle.checked) return;
        const currentIsMobile = window.matchMedia("(max-width: 768px)").matches;
        if (currentIsMobile !== lastIsMobile) {
            applyEventBackgroundForHome();
            lastIsMobile = currentIsMobile;
        }
    }, 200));

    // User tier checking functionality
    function getUserTierStatus() {
        try {
            const userData = localStorage.getItem('materio_user');
            if (!userData) {
                return { isPlusUser: false, hasAdminPrivileges: false, isLoggedIn: false };
            }

            const user = JSON.parse(userData);
            return {
                isPlusUser: user.isPlusUser || false,
                hasAdminPrivileges: user.hasAdminPrivileges || false,
                isLoggedIn: true
            };
        } catch (error) {

            return { isPlusUser: false, hasAdminPrivileges: false, isLoggedIn: false };
        }
    }

    function canAccessWallpaperSelection() {
        const userStatus = getUserTierStatus();
        return userStatus.isPlusUser || userStatus.hasAdminPrivileges;
    }

    function hideWallpaperSelectionCard() {
        const wallpaperSelectionCard = document.getElementById('wallpaperSelectionCard');
        if (wallpaperSelectionCard) {
            wallpaperSelectionCard.style.display = 'none';
        }
    }

    // Wallpaper Selection functionality (Plus/Super users only)
    const wallpaperCards = document.querySelectorAll('.wallpaper-preview-card');

    function initializeWallpaperSelection() {
        // Check if user can access wallpaper selection
        if (!canAccessWallpaperSelection()) {
            // Hide the entire wallpaper selection card for non-eligible users
            hideWallpaperSelectionCard();
            return;
        }

        // Initialize dynamic preview
        updateDynamicPreview();

        const savedWallpaper = getCookie("selectedWallpaper") || 'dynamic'; // Default to dynamic wallpaper

        setWallpaperAsBackground(savedWallpaper);
        // Update UI to show selected wallpaper
        wallpaperCards.forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.wallpaper === savedWallpaper) {
                card.classList.add('selected');
            }
        });

        // Start timer if dynamic or christmas-dynamic wallpaper is selected
        if (savedWallpaper === 'dynamic') {
            startDynamicWallpaperTimer();
        } else if (savedWallpaper === 'christmas-dynamic') {
            startChristmasWallpaperTimer();
        }
    }

    // Add click handlers to wallpaper cards
    wallpaperCards.forEach(card => {
        card.addEventListener('click', function () {
            // Check user access before allowing wallpaper selection
            if (!canAccessWallpaperSelection()) {
                return;
            }

            // Skip custom wallpaper card - it has its own special handler
            if (this.dataset.wallpaper === 'custom') {
                return;
            }

            // Remove selected class from all cards
            wallpaperCards.forEach(c => c.classList.remove('selected'));

            // Add selected class to clicked card
            this.classList.add('selected');

            // Get wallpaper type and apply it
            const wallpaperType = this.dataset.wallpaper;
            setWallpaperAsBackground(wallpaperType);

            // Handle dynamic wallpaper timers
            if (wallpaperType === 'dynamic') {
                startDynamicWallpaperTimer();
                stopChristmasWallpaperTimer();
            } else if (wallpaperType === 'christmas-dynamic') {
                startChristmasWallpaperTimer();
                stopDynamicWallpaperTimer();
            } else {
                stopDynamicWallpaperTimer();
                stopChristmasWallpaperTimer();
            }

            // Save the selection
            setCookie("selectedWallpaper", wallpaperType, 30);
        });
    });

    // Initialize wallpaper selection on page load
    initializeWallpaperSelection();

    // Initialize custom wallpaper functionality
    initializeCustomWallpaper();

    // Paper Mode functionality
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
                const iframeDoc = pdfIframe.contentDocument;
                if (iframeDoc) {
                    // If invert mode, target the #viewer element so filters apply to PDF pages.
                    if (mode === 'invert') {
                        const viewer = iframeDoc.getElementById('viewer');
                        if (viewer) {
                            if (enable) {
                                viewer.classList.add('invert');
                            } else {
                                viewer.classList.remove('invert');
                            }
                        }
                    } else {
                        const iframeBody = iframeDoc.body;
                        if (iframeBody) {
                            if (enable) {
                                iframeBody.classList.add(mode);
                            } else {
                                iframeBody.classList.remove(mode);
                            }
                        }
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

            }
        }
    }    // Listen for messages from iframe to handle overlay mode requests
    window.addEventListener('message', function (event) {
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

                        // Also send the current paper texture
                        const savedTexture = getCookie("paperTexture") || "black-paper";
                        const textureUrl = `/assets/textures/${savedTexture}.png`;
                        pdfIframe.contentWindow.postMessage({
                            type: 'paperTexture',
                            textureUrl: textureUrl
                        }, '*');

                        // Also send the current grain size
                        const savedGrainSize = getCookie("grainSize") || "100";
                        const grainSizePx = Math.round((parseInt(savedGrainSize) / 100) * 200);
                        pdfIframe.contentWindow.postMessage({
                            type: 'grainSize',
                            sizePx: grainSizePx
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
        // Also show paper texture options
        const paperTextureOptions = document.getElementById('paperTextureOptions');
        if (paperTextureOptions) {
            paperTextureOptions.style.display = 'block';
        }
    }

    function hideGrainSizeControl() {
        if (grainDetails) {
            grainDetails.style.display = 'none';
        }
        // Also hide paper texture options
        const paperTextureOptions = document.getElementById('paperTextureOptions');
        if (paperTextureOptions) {
            paperTextureOptions.style.display = 'none';
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

        // Send grain size to PDF iframe
        applyGrainSizeToPDFIframe(grainSizePx);
    }

    function applyGrainSizeToPDFIframe(sizePx) {
        const pdfIframe = document.getElementById('pdf-iframe');
        if (pdfIframe) {
            // Try direct access first (same-origin)
            try {
                const iframeDoc = pdfIframe.contentDocument;
                if (iframeDoc) {
                    const iframeBody = iframeDoc.body;
                    if (iframeBody) {
                        iframeBody.style.setProperty('--grain-size', `${sizePx}px`);
                        return;
                    }
                }
            } catch (e) {
                // Cross-origin, use postMessage
            }

            // Use postMessage for cross-origin communication
            try {
                pdfIframe.contentWindow.postMessage({
                    type: 'grainSize',
                    sizePx: sizePx
                }, '*');
            } catch (e) {
                // console.log('Could not communicate with PDF iframe');
            }
        }
    }

    // Initialize paper mode on page load
    initializePaperMode(); if (paperModeToggle) {
        paperModeToggle.addEventListener("change", function () {
            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate(this.checked ? 'toggleOn' : 'toggleOff');
            }
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
        let lastSliderValue = grainSizeSlider.value;
        grainSizeSlider.addEventListener("input", function () {
            const size = this.value;
            // Haptic feedback for slider tick
            if (window.MaterioHaptics && Math.abs(size - lastSliderValue) >= 5) {
                window.MaterioHaptics.vibrate('tick');
                lastSliderValue = size;
            }
            updateGrainSize(size);
            setCookie("grainSize", size, 30);
        });
    }

    // Paper Texture Dropdown functionality
    const paperTextureDropdownWrapper = document.getElementById("paperTextureDropdownWrapper");
    const paperTextureDropdownTrigger = document.getElementById("paperTextureDropdownTrigger");
    const paperTextureDropdown = document.getElementById("paperTextureDropdown");
    const paperTextureSelectedText = document.getElementById("paperTextureSelectedText");
    const paperTextureItems = document.querySelectorAll(".paper-texture-item");

    // Texture display names mapping
    const textureDisplayNames = {
        'black-paper': 'Black Paper',
        'cardboard-flat': 'Cardboard',
        'light-paper-fibers': 'Light Paper',
        'sandpaper': 'Sandpaper',
        'textured-paper': 'Textured Paper',
        'gaussian': 'Gaussian'
    };

    function initializePaperTexture() {
        const savedTexture = getCookie("paperTexture") || "black-paper";
        updatePaperTexture(savedTexture);
        updatePaperTextureUI(savedTexture);
    }

    function updatePaperTexture(textureId) {
        const textureUrl = `/assets/textures/${textureId}.png`;

        // Update the popup's CSS variable
        if (popup) {
            popup.style.setProperty('--paper-texture-url', `url('${textureUrl}')`);
        }

        // Send texture change to PDF iframe
        applyTextureToPDFIframe(textureUrl);
    }

    function applyTextureToPDFIframe(textureUrl) {
        const pdfIframe = document.getElementById('pdf-iframe');
        if (pdfIframe) {
            // Try direct access first (same-origin)
            try {
                const iframeDoc = pdfIframe.contentDocument;
                if (iframeDoc) {
                    const iframeBody = iframeDoc.body;
                    if (iframeBody) {
                        iframeBody.style.setProperty('--paper-texture-url', `url('${textureUrl}')`);
                        return;
                    }
                }
            } catch (e) {
                // Cross-origin, use postMessage
            }

            // Use postMessage for cross-origin communication
            try {
                pdfIframe.contentWindow.postMessage({
                    type: 'paperTexture',
                    textureUrl: textureUrl
                }, '*');
            } catch (e) {
                // console.log('Could not communicate with PDF iframe');
            }
        }
    }

    function updatePaperTextureUI(textureId) {
        // Update selected text
        if (paperTextureSelectedText) {
            paperTextureSelectedText.textContent = textureDisplayNames[textureId] || 'Black Paper';
        }

        // Update selected state on dropdown items
        paperTextureItems.forEach(item => {
            if (item.dataset.value === textureId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // Toggle dropdown
    if (paperTextureDropdownTrigger) {
        paperTextureDropdownTrigger.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = paperTextureDropdownWrapper.classList.contains('open');
            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate(isOpen ? 'dropdownClose' : 'dropdownOpen');
            }
            paperTextureDropdownWrapper.classList.toggle("open");
            paperTextureDropdown.classList.toggle("show");
        });
    }

    // Handle texture selection
    paperTextureItems.forEach(item => {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate('select');
            }

            const textureId = this.dataset.value;
            updatePaperTexture(textureId);
            updatePaperTextureUI(textureId);
            setCookie("paperTexture", textureId, 30);

            // Close dropdown
            paperTextureDropdownWrapper.classList.remove("open");
            paperTextureDropdown.classList.remove("show");
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
        if (paperTextureDropdownWrapper && !paperTextureDropdownWrapper.contains(e.target)) {
            paperTextureDropdownWrapper.classList.remove("open");
            paperTextureDropdown.classList.remove("show");
        }
    });

    // Initialize paper texture on page load
    initializePaperTexture();

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
        } applyOverlayToPDFIframe('night-reading', true);
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
            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate(this.checked ? 'toggleOn' : 'toggleOff');
            }
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
    const invertModeToggle = document.getElementById("invertModeToggle");

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

    // Invert Mode functionality
    function initializeInvertMode() {
        const savedInvert = getCookie("invertMode");
        if (savedInvert === "true") {
            if (invertModeToggle) {
                invertModeToggle.checked = true;
            }
            enableInvertMode();
        }
    }

    function enableInvertMode() {
        if (popup) {
            popup.classList.add('invert');
        }
        applyOverlayToPDFIframe('invert', true);
    }

    function disableInvertMode() {
        if (popup) {
            popup.classList.remove('invert');
        }
        applyOverlayToPDFIframe('invert', false);
    }

    // Initialize invert mode on page load
    initializeInvertMode();

    if (invertModeToggle) {
        invertModeToggle.addEventListener('change', function () {
            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate(this.checked ? 'toggleOn' : 'toggleOff');
            }
            if (this.checked) {
                enableInvertMode();
                setCookie('invertMode', 'true', 30);
            } else {
                disableInvertMode();
                setCookie('invertMode', 'false', 30);
            }
        });
    }

    if (einkModeToggle) {
        einkModeToggle.addEventListener("change", function () {
            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate(this.checked ? 'toggleOn' : 'toggleOff');
            }
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
        });
    }


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
        let lastWarmthValue = warmthSlider.value;
        warmthSlider.addEventListener("input", function () {
            const value = this.value;
            // Haptic feedback for slider tick
            if (window.MaterioHaptics && Math.abs(value - lastWarmthValue) >= 5) {
                window.MaterioHaptics.vibrate('tick');
                lastWarmthValue = value;
            }
            updateWarmth(value);
            setCookie("nightWarmth", value, 30);
        });
    }
});
