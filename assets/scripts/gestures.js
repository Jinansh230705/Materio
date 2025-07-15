
                // Mobile swipe navigation functionality
                // Check if device is mobile
                function isMobileDevice() {
                    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           (window.innerWidth <= 768);
                }                // Only add swipe functionality on mobile devices
                if (isMobileDevice()) {
                    // Use document.body for full-screen swipe detection
                    const swipeArea = document.body;
                    const tabOrder = ['home', 'chat', 'notifications', 'settings'];
                    
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
                                tabLinks.forEach(link => link.classList.remove("active"));
                                tabContents.forEach(content => {
                                    content.classList.remove("active", "slide-in-right", "slide-in-left", "slide-out-right", "slide-out-left");
                                });
                                
                                // Activate new tab
                                targetLink.classList.add("active");
                                targetContent.classList.add("active", enterClass);
                                  // Clean up animation classes after animation completes
                                setTimeout(() => {
                                    targetContent.classList.remove(enterClass);
                                }, 450); // Updated to match new animation duration
                                
                                setCookie("activeTab", tabName, 7);
                            }, 150); // Slightly longer delay for smoother overlap
                        } else {
                            // Standard tab switching without animations (desktop or direct navigation)
                            tabLinks.forEach(link => link.classList.remove("active"));
                            tabContents.forEach(content => {
                                content.classList.remove("active", "slide-in-right", "slide-in-left", "slide-out-right", "slide-out-left");
                            });
                            
                            targetLink.classList.add("active");
                            targetContent.classList.add("active");
                            setCookie("activeTab", tabName, 7);
                        }
                    }
                      // Touch start event - bind to swipeArea (document.body)
                    swipeArea.addEventListener('touchstart', function(e) {
                        startX = e.touches[0].clientX;
                        startY = e.touches[0].clientY;
                        startTime = Date.now();
                        isScrolling = null;
                        isSwipeActive = true;
                        endX = startX;
                        endY = startY;
                    }, { passive: true });
                      // Touch move event - improved swipe detection with progress feedback
                    swipeArea.addEventListener('touchmove', function(e) {
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
                    swipeArea.addEventListener('touchend', function(e) {
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
                            
                            // Swipe right (previous tab)
                            if (diffX > 0 && currentIndex > 0) {
                                newIndex = currentIndex - 1;
                            }
                            // Swipe left (next tab)
                            else if (diffX < 0 && currentIndex < tabOrder.length - 1) {
                                newIndex = currentIndex + 1;
                            }
                              // Switch to new tab if index changed
                            if (newIndex !== currentIndex) {
                                // Add haptic feedback if available
                                if (navigator.vibrate) {
                                    navigator.vibrate(50);
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
                }