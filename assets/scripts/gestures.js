// Mobile swipe navigation functionality
// Check if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 768);
}                // Only add swipe functionality on mobile devices
if (isMobileDevice()) {
    // Use document.body for full-screen swipe detection
    const swipeArea = document.body;
    const tabOrder = ['home', 'local', 'chat', 'notifications', 'settings'];

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    let isScrolling = null;
    let swipeIndicators = null;
    let startTime = 0;
    let isSwipeActive = false;
    // Create swipe indicators
    function createSwipeIndicators() {
        const leftIndicator = document.createElement('div');
        leftIndicator.className = 'swipe-indicator left';
        // leftIndicator.innerHTML = '← Previous';

        const rightIndicator = document.createElement('div');
        rightIndicator.className = 'swipe-indicator right';
        // rightIndicator.innerHTML = 'Next →';

        // Add progress rings for visual feedback
        const leftProgress = document.createElement('div');
        leftProgress.className = 'swipe-progress-ring left';
        leftProgress.innerHTML = '<div class="progress-circle"><div class="progress-fill"></div></div>';

        const rightProgress = document.createElement('div');
        rightProgress.className = 'swipe-progress-ring right';
        rightProgress.innerHTML = '<div class="progress-circle"><div class="progress-fill"></div></div>';

        document.body.appendChild(leftIndicator);
        document.body.appendChild(rightIndicator);
        document.body.appendChild(leftProgress);
        document.body.appendChild(rightProgress);

        return {
            left: leftIndicator,
            right: rightIndicator,
            leftProgress: leftProgress,
            rightProgress: rightProgress
        };
    }

    // Initialize indicators and show initial hint
    swipeIndicators = createSwipeIndicators();

    // Show initial swipe hint for first-time users
    function showInitialHint() {
        if (!getCookie('swipeHintShown')) {
            setTimeout(() => {
                const hintElement = document.createElement('div');
                hintElement.className = 'swipe-hint';
                hintElement.innerHTML = '← Swipe to navigate tabs →';
                hintElement.style.cssText = `
                                    position: fixed;
                                    bottom: 80px;
                                    left: 50%;
                                    transform: translateX(-50%);
                                    background: rgba(255, 132, 0, 0.9);
                                    color: white;
                                    padding: 10px 20px;
                                    border-radius: 20px;
                                    font-size: 14px;
                                    z-index: 10001;
                                    animation: fadeInOut 3s ease-in-out;
                                    pointer-events: none;
                                `;

                // Add animation CSS
                const style = document.createElement('style');
                style.textContent = `
                                    @keyframes fadeInOut {
                                        0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                                        20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                                    }
                                `;
                document.head.appendChild(style);
                document.body.appendChild(hintElement);

                // Remove hint after animation
                setTimeout(() => {
                    hintElement.remove();
                    style.remove();
                }, 3000);

                // Set cookie so hint doesn't show again
                setCookie('swipeHintShown', 'true', 30);
            }, 1000);
        }
    }

    // Show hint after page loads
    showInitialHint();

    // Show swipe indicator
    function showSwipeIndicator(direction) {
        const currentIndex = getCurrentTabIndex();

        if (direction === 'left' && currentIndex < tabOrder.length - 1) {
            swipeIndicators.right.classList.add('show');
        } else if (direction === 'right' && currentIndex > 0) {
            swipeIndicators.left.classList.add('show');
        }
    }
    // Hide swipe indicators and progress
    function hideSwipeIndicators() {
        swipeIndicators.left.classList.remove('show');
        swipeIndicators.right.classList.remove('show');
        hideSwipeProgress();
    }

    // Show swipe progress ring
    function showSwipeProgress(direction, progress) {
        const progressRing = direction === 'left' ? swipeIndicators.leftProgress : swipeIndicators.rightProgress;
        const progressFill = progressRing.querySelector('.progress-fill');

        progressRing.classList.add('active');

        // Rotate the progress fill based on progress (0 to 360 degrees)
        const rotation = -90 + (progress * 360);
        progressFill.style.transform = `rotate(${rotation}deg)`;

        // Change border color as we approach completion
        const opacity = 0.3 + (progress * 0.7);
        progressFill.style.borderTopColor = `rgba(255, 132, 0, ${opacity})`;
    }

    // Hide swipe progress rings
    function hideSwipeProgress() {
        swipeIndicators.leftProgress.classList.remove('active');
        swipeIndicators.rightProgress.classList.remove('active');
    }

    // Get current active tab index
    function getCurrentTabIndex() {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            return tabOrder.indexOf(activeTab.id);
        }
        return 0;
    }

    // Check if a tab is visible/accessible
    function isTabVisible(tabName) {
        const tabLink = document.querySelector(`.tab-link[data-tab="${tabName}"]`);
        if (!tabLink) return false;
        const style = window.getComputedStyle(tabLink);
        return style.display !== 'none';
    }

    // Get next visible tab index
    function getNextVisibleTabIndex(currentIndex, direction) {
        let newIndex = currentIndex;

        if (direction === 'next') {
            for (let i = currentIndex + 1; i < tabOrder.length; i++) {
                if (isTabVisible(tabOrder[i])) {
                    newIndex = i;
                    break;
                }
            }
        } else if (direction === 'prev') {
            for (let i = currentIndex - 1; i >= 0; i--) {
                if (isTabVisible(tabOrder[i])) {
                    newIndex = i;
                    break;
                }
            }
        }

        return newIndex;
    }                      // Enhanced switch to specific tab with smooth transitions
    function switchToTab(tabName, direction = null) {
        const tabLinks = document.querySelectorAll(".tab-link");
        const tabContents = document.querySelectorAll(".tab-content");
        const currentTab = document.querySelector(".tab-content.active");
        const targetContent = document.getElementById(tabName);
        const targetLink = document.querySelector(`.tab-link[data-tab="${tabName}"]`);

        if (!targetContent || !targetLink) return;

        // Only apply animations on mobile devices
        if (isMobileDevice() && currentTab && currentTab !== targetContent && direction) {
            // Remove active from current tab with exit animation
            const exitClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
            const enterClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';

            // Add exit animation to current tab
            currentTab.classList.add(exitClass);

            // After a short delay, switch tabs and add enter animation
            setTimeout(() => {
                // Remove all active classes and animations
                tabLinks.forEach(link => {
                    link.classList.remove("active");
                    const icon = link.querySelector('i');
                    if (icon && !link.querySelector('img')) {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                    }
                });
                tabContents.forEach(content => {
                    content.classList.remove("active", "slide-in-right", "slide-in-left", "slide-out-right", "slide-out-left");
                });

                // Activate new tab
                targetLink.classList.add("active");
                const icon = targetLink.querySelector('i');
                if (icon && !targetLink.querySelector('img')) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
                targetContent.classList.add("active", enterClass);
                // Clean up animation classes after animation completes
                setTimeout(() => {
                    targetContent.classList.remove(enterClass);
                }, 450); // Updated to match new animation duration

                setCookie("activeTab", tabName, 7);
            }, 150); // Slightly longer delay for smoother overlap
        } else {
            // Standard tab switching without animations (desktop or direct navigation)
            tabLinks.forEach(link => {
                link.classList.remove("active");
                const icon = link.querySelector('i');
                if (icon && !link.querySelector('img')) {
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                }
            });
            tabContents.forEach(content => {
                content.classList.remove("active", "slide-in-right", "slide-in-left", "slide-out-right", "slide-out-left");
            });

            targetLink.classList.add("active");
            const icon = targetLink.querySelector('i');
            if (icon && !targetLink.querySelector('img')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
            targetContent.classList.add("active");
            setCookie("activeTab", tabName, 7);
        }
    }
    // Touch start event - bind to swipeArea (document.body)
    swipeArea.addEventListener('touchstart', function (e) {
        // Disable swipe on downloads tab
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'downloads') {
            return;
        }

        // Disable swipe on insight cards scroll area
        if (e.target.closest('.insight-cards-scroll')) {
            return;
        }

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isScrolling = null;
        isSwipeActive = true;
        endX = startX;
        endY = startY;
    }, { passive: true });
    // Touch move event - improved swipe detection with progress feedback
    swipeArea.addEventListener('touchmove', function (e) {
        // Disable swipe on downloads tab
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'downloads') {
            return;
        }

        // Disable swipe on insight cards scroll area
        if (e.target.closest('.insight-cards-scroll')) {
            return;
        }

        if (!isSwipeActive || !startX || !startY) return;

        endX = e.touches[0].clientX;
        endY = e.touches[0].clientY;

        const diffX = endX - startX;
        const diffY = endY - startY;

        // Determine scrolling direction on first significant movement
        if (isScrolling === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
            isScrolling = Math.abs(diffY) > Math.abs(diffX);
        }

        // Show visual feedback for horizontal swipes (reduced threshold)
        if (!isScrolling && Math.abs(diffX) > 20) {
            const currentIndex = getCurrentTabIndex();
            const swipeDistance = Math.abs(diffX);
            const minSwipeDistance = 50;
            const progress = Math.min(swipeDistance / minSwipeDistance, 1);

            if (diffX > 0 && currentIndex > 0) {
                showSwipeIndicator('right');
                showSwipeProgress('left', progress);
            } else if (diffX < 0 && currentIndex < tabOrder.length - 1) {
                showSwipeIndicator('left');
                showSwipeProgress('right', progress);
            }
        }
    }, { passive: true });

    // Touch end event - improved with hard 50px limit
    swipeArea.addEventListener('touchend', function (e) {
        // Disable swipe on downloads tab
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'downloads') {
            resetSwipeState();
            return;
        }

        // Always hide indicators on touch end
        hideSwipeIndicators();

        if (!isSwipeActive || isScrolling || !startX || !endX) {
            resetSwipeState();
            return;
        }

        const diffX = endX - startX;
        const diffY = Math.abs(endY - startY);
        const swipeDistance = Math.abs(diffX);
        const swipeTime = Date.now() - startTime;

        // Hard limit: exactly 50px minimum swipe distance
        const minSwipeDistance = 50;
        const maxVerticalDistance = 60; // Reduced for better horizontal detection
        const maxSwipeTime = 800; // Maximum time for swipe (800ms)

        // Check if it's a valid horizontal swipe with hard limits
        if (swipeDistance >= minSwipeDistance &&
            diffY < maxVerticalDistance &&
            swipeTime < maxSwipeTime) {

            const currentIndex = getCurrentTabIndex();
            let newIndex = currentIndex;

            // Swipe right (previous tab) - skip hidden tabs
            if (diffX > 0 && currentIndex > 0) {
                newIndex = getNextVisibleTabIndex(currentIndex, 'prev');
            }
            // Swipe left (next tab) - skip hidden tabs
            else if (diffX < 0 && currentIndex < tabOrder.length - 1) {
                newIndex = getNextVisibleTabIndex(currentIndex, 'next');
            }
            // Switch to new tab if index changed
            if (newIndex !== currentIndex) {
                // Add haptic feedback using MaterioHaptics system
                if (window.MaterioHaptics) {
                    window.MaterioHaptics.vibrate('tab');
                }

                // Determine transition direction based on swipe
                const direction = diffX > 0 ? 'previous' : 'next';
                switchToTab(tabOrder[newIndex], direction);
            }
        }

        resetSwipeState();
    }, { passive: true });

    // Reset swipe state function
    function resetSwipeState() {
        startX = 0;
        startY = 0;
        endX = 0;
        endY = 0;
        isScrolling = null;
        isSwipeActive = false;
        startTime = 0;
    }

    // Create transparent swipe overlay for iframe areas (like Giscus)
    function createSwipeOverlay() {
        const chatTab = document.getElementById('chat');
        if (!chatTab) return;

        const giscusContainer = document.getElementById('giscus');
        if (!giscusContainer) return;

        // Create overlay div
        const overlay = document.createElement('div');
        overlay.className = 'swipe-overlay';
        overlay.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 999;
                        background: transparent;
                        pointer-events: auto;
                    `;

        // Position the giscus container relatively so overlay can be positioned absolutely
        giscusContainer.style.position = 'relative';
        giscusContainer.appendChild(overlay);

        // Add click-through functionality - clicks should pass through to iframe
        overlay.addEventListener('click', function (e) {
            // Remove the overlay temporarily to allow click to pass through
            overlay.style.pointerEvents = 'none';

            // Get the element underneath
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);

            // If it's an iframe or its content, simulate the click
            if (elementBelow && (elementBelow.tagName === 'IFRAME' || elementBelow.closest('iframe'))) {
                // Re-enable pointer events after a short delay
                setTimeout(() => {
                    overlay.style.pointerEvents = 'auto';
                }, 100);
            } else {
                // Re-enable immediately for non-iframe clicks
                overlay.style.pointerEvents = 'auto';
            }
        });

        // Add enhanced touch event handling for the overlay
        let overlayStartX = 0, overlayStartY = 0, overlayEndX = 0, overlayEndY = 0;
        let overlayIsScrolling = null;

        overlay.addEventListener('touchstart', function (e) {
            overlayStartX = e.touches[0].clientX;
            overlayStartY = e.touches[0].clientY;
            overlayIsScrolling = null;
            e.stopPropagation(); // Prevent event from bubbling to document.body
        }, { passive: true });

        overlay.addEventListener('touchmove', function (e) {
            if (!overlayStartX || !overlayStartY) return;

            overlayEndX = e.touches[0].clientX;
            overlayEndY = e.touches[0].clientY;

            const diffX = overlayEndX - overlayStartX;
            const diffY = overlayEndY - overlayStartY;

            // Determine if this is a horizontal swipe
            if (overlayIsScrolling === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
                overlayIsScrolling = Math.abs(diffY) > Math.abs(diffX);
            }

            // If it's a horizontal swipe, show indicators and prevent scrolling
            if (!overlayIsScrolling && Math.abs(diffX) > 20) {
                e.preventDefault(); // Prevent scrolling in iframe

                const currentIndex = getCurrentTabIndex();
                const swipeDistance = Math.abs(diffX);
                const minSwipeDistance = 50;
                const progress = Math.min(swipeDistance / minSwipeDistance, 1);

                if (diffX > 0 && currentIndex > 0) {
                    showSwipeIndicator('right');
                    showSwipeProgress('left', progress);
                } else if (diffX < 0 && currentIndex < tabOrder.length - 1) {
                    showSwipeIndicator('left');
                    showSwipeProgress('right', progress);
                }
            }

            e.stopPropagation(); // Prevent event from bubbling to document.body
        }, { passive: false }); // passive: false to allow preventDefault

        overlay.addEventListener('touchend', function (e) {
            hideSwipeIndicators();

            if (overlayIsScrolling || !overlayStartX || !overlayEndX) {
                overlayStartX = overlayStartY = overlayEndX = overlayEndY = 0;
                overlayIsScrolling = null;
                return;
            }

            const diffX = overlayEndX - overlayStartX;
            const absDiffX = Math.abs(diffX);

            // Trigger navigation if swipe distance is sufficient
            if (absDiffX >= 50) {
                const currentIndex = getCurrentTabIndex();
                let newIndex = currentIndex;

                // Add haptic feedback using MaterioHaptics system
                if (window.MaterioHaptics) {
                    window.MaterioHaptics.vibrate('tab');
                }

                if (diffX > 0 && currentIndex > 0) {
                    // Swipe right - go to previous tab (skip hidden tabs)
                    newIndex = getNextVisibleTabIndex(currentIndex, 'prev');
                } else if (diffX < 0 && currentIndex < tabOrder.length - 1) {
                    // Swipe left - go to next tab (skip hidden tabs)
                    newIndex = getNextVisibleTabIndex(currentIndex, 'next');
                }

                // Switch if we found a different visible tab
                if (newIndex !== currentIndex) {
                    switchToTab(tabOrder[newIndex], diffX > 0 ? 'prev' : 'next');
                }
            }

            // Reset state
            overlayStartX = overlayStartY = overlayEndX = overlayEndY = 0;
            overlayIsScrolling = null;
            e.stopPropagation(); // Prevent event from bubbling to document.body
        }, { passive: true });

        return overlay;
    }

    // Initialize swipe overlay
    function initializeSwipeOverlay() {
        function tryCreateOverlay() {
            const giscusContainer = document.getElementById('giscus');
            if (giscusContainer && !document.querySelector('.swipe-overlay')) {
                // Check if Giscus iframe exists or wait for it
                const checkForIframe = () => {
                    const iframe = giscusContainer.querySelector('iframe');
                    if (iframe || giscusContainer.children.length > 0) {
                        createSwipeOverlay();
                    } else {
                        // Try again after a short delay
                        setTimeout(checkForIframe, 500);
                    }
                };
                checkForIframe();
            }
        }

        // Wait for the page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(tryCreateOverlay, 1000);
            });
        } else {
            setTimeout(tryCreateOverlay, 1000);
        }

        // Also listen for tab changes to chat
        document.addEventListener('click', (e) => {
            const tabLink = e.target.closest('.tab-link');
            if (tabLink && tabLink.getAttribute('data-tab') === 'chat') {
                setTimeout(tryCreateOverlay, 1000);
            }
        });
    }

    // Initialize the overlay
    initializeSwipeOverlay();

    // Also reinitialize when switching to chat tab
    const originalSwitchToTab = switchToTab;
    function enhancedSwitchToTab(tabName, direction = null) {
        originalSwitchToTab(tabName, direction);

        // If switching to chat tab, ensure overlay exists
        if (tabName === 'chat') {
            setTimeout(() => {
                if (!document.querySelector('.swipe-overlay')) {
                    createSwipeOverlay();
                }
            }, 500);
        }
    }

    // Replace the original function
    switchToTab = enhancedSwitchToTab;
}