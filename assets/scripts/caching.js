document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    const popup = document.getElementById('popup');
    const popupContent = document.getElementById('popupContent');
    let pdfIframe = document.getElementById('pdf-iframe') || null;
    const pdfCache = new Map();
    const MAX_CACHE_SIZE = 3; // Reduce from 5 to 3 for memory efficiency

    // Lightweight preload - only validates URL, doesn't download blob
    async function preloadPdf(pdfUrl) {
        if (pdfCache.has(pdfUrl)) {
            return pdfCache.get(pdfUrl);
        }

        // Just validate URL is accessible, don't download
        try {
            const response = await fetch(pdfUrl, {
                method: 'HEAD',
                mode: 'cors',
                credentials: 'omit'  // Don't send cookies for cross-origin
            });
            if (!response.ok) throw new Error(`PDF not accessible: ${response.status}`);

            // Cache just the URL as "validated"
            pdfCache.set(pdfUrl, {
                originalUrl: pdfUrl,
                validated: true,
                validatedAt: Date.now()
            });

            // Limit cache size
            if (pdfCache.size > MAX_CACHE_SIZE) {
                const firstKey = pdfCache.keys().next().value;
                pdfCache.delete(firstKey);
            }

            return pdfCache.get(pdfUrl);
        } catch (error) {
            // CORS errors are common for cross-origin CDN requests, don't log as error
            return null;
        }
    }

    // ===== IFRAME PREWARMING STRATEGY =====
    // Prewarm the PDF.js viewer in a hidden iframe at page load
    // When user opens a PDF, we reuse the prewarmed viewer and just send the PDF URL
    let isViewerPrewarmed = false;
    let prewarmPromise = null;
    let prewarmIframe = null; // Separate reference for prewarmed iframe (not attached to DOM)

    function prewarmViewer() {
        if (prewarmPromise) return prewarmPromise;

        prewarmPromise = new Promise((resolve) => {
            // Create a detached iframe for prewarming (not added to DOM yet)
            prewarmIframe = document.createElement('iframe');
            prewarmIframe.id = 'pdf-iframe-prewarm';
            prewarmIframe.style.border = 'none';
            prewarmIframe.style.width = '100%';
            prewarmIframe.style.height = 'calc(100% - 17px)';
            prewarmIframe.style.borderRadius = '10px';
            prewarmIframe.style.marginTop = '22px';
            prewarmIframe.style.visibility = 'hidden';
            prewarmIframe.style.position = 'absolute';
            prewarmIframe.style.left = '-9999px'; // Off-screen

            // Prewarm handler - resolve when viewer is ready
            const onPrewarmLoad = () => {
                isViewerPrewarmed = true;
                prewarmIframe.removeEventListener('load', onPrewarmLoad);
                resolve();
            };
            prewarmIframe.addEventListener('load', onPrewarmLoad);

            // Load viewer without PDF to prewarm it
            prewarmIframe.src = '/oread/web/viewer.html';

            // Add to body temporarily (hidden and off-screen) for loading
            document.body.appendChild(prewarmIframe);
        });

        return prewarmPromise;
    }

    // Start prewarming after main content loads (with slight delay to not block critical path)
    if (document.readyState === 'complete') {
        setTimeout(prewarmViewer, 1000);
    } else {
        window.addEventListener('load', () => setTimeout(prewarmViewer, 1000));
    }

    function initializeIframe() {
        // Use prewarmed iframe if available, otherwise create new
        if (isViewerPrewarmed && prewarmIframe && !pdfIframe) {
            // Move prewarmed iframe from body to popupContent
            pdfIframe = prewarmIframe;
            pdfIframe.id = 'pdf-iframe';
            pdfIframe.style.left = ''; // Remove off-screen positioning
            prewarmIframe = null; // Clear reference since we're using it now
            // NOTE: Moving iframe will cause it to reload, so we need to wait for it
            // Mark as needing to wait for load
            pdfIframe._needsLoadWait = true;
        } else if (!pdfIframe) {
            pdfIframe = document.createElement('iframe');
            pdfIframe.id = 'pdf-iframe';
            pdfIframe.src = 'about:blank';
            pdfIframe.style.border = 'none';
            pdfIframe.style.width = '100%';
            pdfIframe.style.height = 'calc(100% - 17px)';
            pdfIframe.style.borderRadius = '10px';
            pdfIframe.style.marginTop = '22px';
        }

        // Add load event listener to setup overlay modes (if not already added)
        if (!pdfIframe._hasOverlayListener) {
            pdfIframe._hasOverlayListener = true;
            pdfIframe.addEventListener('load', function () {
                // Quick setup for PDF.js viewer
                setTimeout(() => {
                    const mainPopup = document.getElementById('popup');
                    if (mainPopup && pdfIframe && pdfIframe.contentWindow) {
                        // Send current overlay states to iframe
                        if (mainPopup.classList.contains('paper-mode')) {
                            pdfIframe.contentWindow.postMessage({
                                type: 'overlayMode',
                                mode: 'paper-mode',
                                enable: true
                            }, '*');
                        }

                        if (mainPopup.classList.contains('night-reading')) {
                            pdfIframe.contentWindow.postMessage({
                                type: 'overlayMode',
                                mode: 'night-reading',
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
                }, 50);
            });
        }

        // Make iframe visible and properly positioned
        pdfIframe.style.visibility = 'visible';
        pdfIframe.style.position = 'relative';

        // Only clear and re-add iframe if it's not already in popupContent
        // Using innerHTML = '' removes and re-adds the iframe, causing it to reload
        if (pdfIframe.parentNode !== popupContent) {
            popupContent.innerHTML = '';
            popupContent.appendChild(pdfIframe);
            // Mark that we need to wait for iframe reload
            pdfIframe._needsLoadWait = true;
        }

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'pdf-loading-indicator';
        loadingDiv.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 10;';
        loadingDiv.innerHTML = '<i class="far fa-spinner-third fa-spin" style="font-size: 48px; color: #ff8400;"></i><p style="margin-top: 20px; color: var(--text-color);">Loading PDF...</p>';
        popupContent.appendChild(loadingDiv);
    }

    // Track progress for haptic feedback
    let lastProgressPercent = 0;
    let pdfLoadingActive = false;

    // Enhanced PDF loading function with error handling - optimized for speed
    async function loadPdfWithCache(pdfUrl) {
        // Reset progress tracking for new PDF load
        lastProgressPercent = 0;
        pdfLoadingActive = true;

        // Haptic feedback - initial tap to confirm action started
        if (window.MaterioHaptics) {
            window.MaterioHaptics.vibrate('medium');
        }

        // Check offline status first
        if (!navigator.onLine) {
            // Haptic feedback - error
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate('error');
            }
            document.getElementById('popupContent').innerHTML =
                `<div style="display: flex; align-items: center; justify-content: center; height: 87vh; text-align: center; flex-direction: column; padding: 20px;">
<i class="fa-solid fa-wifi-slash" style="font-size: 72px; color:#ff8400;"></i>
<p class="popup-message" style="font-weight:600;">You're offline</p>
<p class="popup-errcode">status: no internet connection</p>
</div>`;
            popup.classList.remove('closing');
            popup.style.display = 'block';
            return;
        }

        // Initialize iframe immediately for faster display
        initializeIframe();

        // Check if PDF is already validated in cache
        const cachedInfo = pdfCache.get(pdfUrl);

        // If not in cache, validate it (lightweight HEAD request)
        if (!cachedInfo || !cachedInfo.validated) {
            try {
                // Use cors mode and handle CORS errors gracefully
                const headResponse = await fetch(pdfUrl, {
                    method: 'HEAD',
                    mode: 'cors',
                    credentials: 'omit'  // Don't send cookies for cross-origin
                });
                if (!headResponse.ok) {
                    // Get human-readable status text
                    const getStatusText = (status) => {
                        const statusCodes = {
                            400: 'something went off track',
                            401: 'you need to sign in',
                            403: 'this area is restricted',
                            404: 'we could not find that',
                            405: 'that does not work here',
                            408: 'this took too long',
                            410: 'this has been removed',
                            429: 'slow down a bit',
                            500: 'we hit an internal issue',
                            502: 'upstream had a hiccup',
                            503: 'service is resting briefly',
                            504: 'the server did not respond in time'
                        };
                        return statusCodes[status] || 'something went wrong';
                    };

                    // Server/temporary errors - show refresh button
                    const serverErrors = [400, 408, 429, 500, 502, 503, 504];
                    const isServerError = serverErrors.includes(headResponse.status);

                    if (isServerError) {
                        document.getElementById('popupContent').innerHTML =
                            `<div style="display: flex; align-items: center; justify-content: center; height: 87vh; text-align: center; flex-direction: column; padding: 20px;">
    <i class="fa-solid fa-server" style="font-size: 72px; color:#ff8400;"></i>
    <p class="popup-message" style="font-weight:600;">Something went wrong</p>
    <p class="popup-errcode">status: ${getStatusText(headResponse.status)}</p>
    <button class="btn primary-btn" onclick="location.reload()">
        <i class="fa-solid fa-rotate-right" style="margin-right:10px;"></i>Refresh
    </button>
    <p style="font-size:12px; font-weight:600; max-width: 400px; word-wrap: break-word;">
       or try again later
    </p>
</div>`;
                    } else {
                        // Content errors (401, 403, 404, 410) - show contribute button
                        document.getElementById('popupContent').innerHTML =
                            `<div style="display: flex; align-items: center; justify-content: center; height: 87vh; text-align: center; flex-direction: column; padding: 20px;">
    <i class="fa-solid fa-triangle-exclamation" style="font-size: 72px; color:#ff8400;"></i>
    <p class="popup-message" style="font-weight:600;">Looks like this one's missing</p>
    <p class="popup-errcode">status: ${getStatusText(headResponse.status)}</p>
    <button class="btn primary-btn" onclick="openDynamicForm('contribution', true)">
        <i class="fa-regular fa-circle-plus" style="margin-right:10px;"></i>Contribute
    </button>
    <p style="font-size:12px; font-weight:600; max-width: 400px; word-wrap: break-word;">
       Contributions help make this space more useful for everyone.\n Lend a hand by contributing it to the library.
    </p>
</div>`;
                    }
                    popup.classList.remove('closing');
                    popup.style.display = 'block';
                    return;
                }

                // Cache validation result
                pdfCache.set(pdfUrl, {
                    originalUrl: pdfUrl,
                    validated: true,
                    validatedAt: Date.now()
                });

            } catch (error) {
                // CORS errors or network issues - don't block, let PDF.js try to load
                // PDF.js handles its own error display if the file doesn't exist

                // Only show error for definite offline state
                if (!navigator.onLine) {
                    if (window.MaterioHaptics) {
                        window.MaterioHaptics.vibrate('error');
                    }
                    document.getElementById('popupContent').innerHTML =
                        `<div style="display: flex; align-items: center; justify-content: center; height: 87vh; text-align: center; flex-direction: column; padding: 20px;">
<i class="fa-solid fa-cloud-xmark" style="font-size: 72px; color:#ff8400;"></i>
<p class="popup-message" style="font-weight:600;">Connection failed</p>
<p class="popup-errcode">status: could not reach the server</p>
</div>`;
                    popup.classList.remove('closing');
                    popup.style.display = 'block';
                    return;
                }
                // Otherwise, proceed to try loading the PDF anyway
            }
        }

        // Load PDF directly in viewer - let PDF.js handle streaming
        const viewerUrl = `/oread/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;

        // Remove loading indicator and show iframe
        const loadingIndicator = document.getElementById('pdf-loading-indicator');
        if (loadingIndicator) loadingIndicator.remove();
        pdfIframe.style.visibility = 'visible';

        // Helper function to send the loadFile message
        const sendLoadMessage = () => {
            pdfIframe.contentWindow.postMessage({
                type: 'loadFile',
                url: pdfUrl
            }, '*');
        };

        // If viewer is prewarmed, use postMessage for instant PDF change
        // Otherwise, load the full viewer URL
        if (isViewerPrewarmed && pdfIframe.contentWindow) {
            // Check if iframe was just moved (causes reload) - need to wait for load
            if (pdfIframe._needsLoadWait) {
                pdfIframe._needsLoadWait = false;
                // Wait for iframe to reload after being moved to new parent
                const onLoad = () => {
                    pdfIframe.removeEventListener('load', onLoad);
                    // Small delay to ensure PDF.js is fully initialized
                    setTimeout(() => {
                        sendLoadMessage();
                    }, 100);
                };
                pdfIframe.addEventListener('load', onLoad);
            } else {
                // Iframe already in place, send message immediately
                sendLoadMessage();
            }
        } else {
            // Fallback: Load viewer with PDF URL (first time or not prewarmed)
            pdfIframe.src = viewerUrl;
        }

        // Show popup
        popup.classList.remove('closing');
        popup.style.display = 'block';
    }// Note: submitButton event listener removed to prevent conflicts with main.js
    // The main.js now uses window.loadPdfWithCache() function exposed below

    document.getElementById('topicSelect').addEventListener('change', function () {
        const semester = document.getElementById('semesterSelect').value;
        const subject = document.getElementById('subjectSelect').value;
        const categorySelect = document.getElementById('categorySelect');
        const topic = this.value;
        if (semester && subject && categorySelect.selectedIndex !== 0 && topic) {
            let pdfUrl;

            // Special handling for Vault (semester 9999)
            if (semester === '9999') {
                // Format: pdfs/9999/UUID/vault/filename.pdf
                pdfUrl = `https://cdn-materioa.vercel.app/pdfs/${semester}/${subject}/vault/${topic}.pdf`;
            } else {
                // Normal format: pdfs/semester/subject/topic.pdf
                pdfUrl = `https://cdn-materioa.vercel.app/pdfs/${semester}/${subject}/${topic}.pdf`;
            }

            // Transform to local CDN if enabled
            pdfUrl = window.MaterioLocalCDN?.transformUrl(pdfUrl) || pdfUrl;

            // Lightweight validation only (no heavy download)
            preloadPdf(pdfUrl);
        }
    });

    const closePopup = document.getElementById('closePopup');
    closePopup.addEventListener('click', () => {
        popup.classList.add('closing');
    });

    popup.addEventListener('animationend', (event) => {
        if (event.animationName === 'popupFadeOut') {
            popup.style.display = 'none';
            popup.classList.remove('closing');
        }
    });    // Message listener for PDF.js communication
    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'requestBlobUrl') {
            const originalUrl = event.data.url;
            const cachedPdf = pdfCache.get(originalUrl);
            if (cachedPdf && cachedPdf.blobUrl) {
                event.source.postMessage({
                    type: 'blobUrlResponse',
                    originalUrl: originalUrl,
                    blobUrl: cachedPdf.blobUrl
                }, '*');
            }
        }

        if (event.data.type === 'requestBlobData') {
            const originalUrl = event.data.originalUrl;
            const cachedPdf = pdfCache.get(originalUrl);
            if (cachedPdf && cachedPdf.blob) {
                // console.log('Transferring blob data for:', originalUrl);

                // Convert blob to ArrayBuffer for transfer
                cachedPdf.blob.arrayBuffer().then(arrayBuffer => {
                    event.source.postMessage({
                        type: 'blobDataResponse',
                        originalUrl: originalUrl,
                        arrayBuffer: arrayBuffer,
                        size: cachedPdf.blob.size
                    }, '*', [arrayBuffer]);
                }).catch(error => {
                    console.error('Error converting blob to ArrayBuffer:', error);
                });
            }
        }

        // PDF.js loading progress event - sync haptic with actual network chunks
        if (event.data.type === 'pdfProgress') {
            if (window.MaterioHaptics && event.data.loaded && event.data.total && pdfLoadingActive) {
                const progress = event.data.loaded / event.data.total;
                const progressPercent = Math.floor(progress * 100);

                // Vibrate every ~10% progress to simulate "chunks" of data
                // This creates the "zz zz zz" pattern synced with actual network activity
                if (progressPercent >= lastProgressPercent + 10) {
                    // Vary vibration intensity based on progress
                    // Earlier chunks: shorter zz, later chunks: slightly longer
                    const vibrationDuration = Math.min(25 + Math.floor(progress * 20), 45);
                    window.MaterioHaptics.vibrate([vibrationDuration]);
                    lastProgressPercent = progressPercent;
                }
            }
        }

        // PDF.js document loaded event
        if (event.data.type === 'pdfLoaded' || event.data.type === 'documentloaded' || event.data.type === 'pagerendered' || event.data.type === 'blobDataResponse') {
            // Remove loading indicator when document is ready or data is transferred
            const loadingIndicator = document.getElementById('pdf-loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }

            // Only trigger completion if we were actively loading
            if (pdfLoadingActive) {
                pdfLoadingActive = false;
                lastProgressPercent = 0;

                // Immediate completion vibration - no delay
                if (window.MaterioHaptics) {
                    window.MaterioHaptics.vibrate('loadComplete');
                }
            }
        }

        // PDF.js error event
        if (event.data.type === 'pdfError') {
            // Remove loading indicator on error too
            const loadingIndicator = document.getElementById('pdf-loading-indicator');
            if (loadingIndicator) loadingIndicator.remove();

            pdfLoadingActive = false;
            lastProgressPercent = 0;

            // Stop any ongoing vibration and play error pattern
            if (window.MaterioHaptics) {
                window.MaterioHaptics.stopVibration();
                window.MaterioHaptics.vibrate('error');
            }
        }
    });

    // Expose functions globally for testing
    window.preloadPdf = preloadPdf;
    window.pdfCache = pdfCache;
    window.loadPdfWithCache = loadPdfWithCache;
    window.prewarmViewer = prewarmViewer;
    window.isViewerPrewarmed = () => isViewerPrewarmed;

    // ===== SHARED STATE =====
    let currentPdfUrl = null; // Shared between bookmark and download features

    // ===== BOOKMARK FUNCTIONALITY =====
    const bookmarkCacheKey = 'bookmarkedPdfs';
    let bookmarkButton = null;

    // Initialize bookmark button and functionality
    function initializeBookmarkFeature() {
        bookmarkButton = document.getElementById('bookmark');
        if (!bookmarkButton) return;

        // Set up bookmark button click handler
        bookmarkButton.addEventListener('click', handleBookmarkClick);

        // Update bookmark icon based on current PDF
        updateBookmarkIcon();
    }

    // Get bookmarked PDFs from localStorage
    function getBookmarkedPdfs() {
        try {
            const bookmarked = localStorage.getItem(bookmarkCacheKey);
            return bookmarked ? JSON.parse(bookmarked) : [];
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            return [];
        }
    }

    // Save bookmarked PDFs to localStorage
    function saveBookmarkedPdfs(bookmarkedPdfs) {
        try {
            localStorage.setItem(bookmarkCacheKey, JSON.stringify(bookmarkedPdfs));
            return true;
        } catch (error) {
            console.error('Error saving bookmarks:', error);
            return false;
        }
    }

    // Check if current PDF is bookmarked
    function isCurrentPdfBookmarked() {
        if (!currentPdfUrl) return false;
        const bookmarkedPdfs = getBookmarkedPdfs();
        return bookmarkedPdfs.some(bookmark => bookmark.url === currentPdfUrl);
    }

    // Update bookmark icon visual state
    function updateBookmarkIcon() {
        if (!bookmarkButton) return;

        const icon = bookmarkButton.querySelector('i');
        if (!icon) return;

        const isBookmarked = isCurrentPdfBookmarked();

        if (isBookmarked) {
            // Solid bookmark icon for bookmarked PDFs.
            icon.className = 'fa fa-bookmark';
            bookmarkButton.style.color = '#8dac49';
            bookmarkButton.title = 'Remove from offline bookmarks';
        } else {
            // Regular bookmark icon for non-bookmarked PDFs
            icon.className = 'fas fa-bookmark';
            bookmarkButton.style.color = '#ff8200';
            bookmarkButton.title = 'Save for offline reading';
        }
    }

    // Handle bookmark button click
    async function handleBookmarkClick() {
        if (!currentPdfUrl) {
            return;
        }

        const isBookmarked = isCurrentPdfBookmarked();

        if (isBookmarked) {
            // Remove bookmark
            removeBookmark(currentPdfUrl);
        } else {
            // Add bookmark
            await addBookmark(currentPdfUrl);
        }

        updateBookmarkIcon();
    }

    // Add PDF to bookmarks and cache it
    async function addBookmark(pdfUrl) {
        try {
            // First ensure the PDF is cached
            await preloadPdf(pdfUrl);

            const cachedPdf = pdfCache.get(pdfUrl);
            if (!cachedPdf) {
                console.error('Failed to cache PDF for bookmarking');
                return false;
            }

            // Get current bookmarks
            const bookmarkedPdfs = getBookmarkedPdfs();

            // Check if already bookmarked
            const existingBookmark = bookmarkedPdfs.find(bookmark => bookmark.url === pdfUrl);
            if (existingBookmark) {
                // console.log('PDF already bookmarked');
                return true;
            }

            // Extract PDF metadata from URL
            const urlParts = pdfUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const subject = urlParts[urlParts.length - 2] || 'Unknown Subject';
            const semester = urlParts[urlParts.length - 3] || 'Unknown Semester';

            // Create bookmark entry
            const bookmark = {
                url: pdfUrl,
                title: filename.replace('.pdf', ''),
                subject: subject,
                semester: semester,
                bookmarkedAt: Date.now(),
                fileSize: cachedPdf.blob ? cachedPdf.blob.size : 0
            };

            // Add to bookmarks
            bookmarkedPdfs.unshift(bookmark);

            // Limit to 50 bookmarks to prevent storage issues
            if (bookmarkedPdfs.length > 50) {
                bookmarkedPdfs.splice(50);
            }

            // Save to localStorage
            const saved = saveBookmarkedPdfs(bookmarkedPdfs);

            if (saved) {
                // console.log('PDF bookmarked successfully:', bookmark.title);
                // showBookmarkNotification('PDF saved for offline reading!', 'success');
                return true;
            } else {
                console.error('Failed to save bookmark');
                // showBookmarkNotification('Failed to save bookmark', 'error');
                return false;
            }

        } catch (error) {
            console.error('Error adding bookmark:', error);
            // showBookmarkNotification('Error saving bookmark', 'error');
            return false;
        }
    }

    // Remove PDF from bookmarks
    function removeBookmark(pdfUrl) {
        try {
            const bookmarkedPdfs = getBookmarkedPdfs();
            const filteredBookmarks = bookmarkedPdfs.filter(bookmark => bookmark.url !== pdfUrl);

            const removed = saveBookmarkedPdfs(filteredBookmarks);

            if (removed) {
                // console.log('Bookmark removed successfully');
                // showBookmarkNotification('Removed from bookmarks', 'info');
                return true;
            } else {
                // console.error('Failed to remove bookmark');
                return false;
            }

        } catch (error) {
            // console.error('Error removing bookmark:', error);
            return false;
        }
    }

    // Enhanced loadPdfWithCache to track current PDF and handle offline scenarios
    const originalLoadPdfWithCache = window.loadPdfWithCache;

    async function enhancedLoadPdfWithCache(pdfUrl) {
        // Update current PDF URL for bookmark functionality
        currentPdfUrl = pdfUrl;
        window.materioCurrentPdfUrl = pdfUrl; // Expose globally for sharing

        // Set current PDF info for notebook linking
        const fileName = pdfUrl.split('/').pop().split('?')[0] || 'Document';
        window.currentPdfInfo = {
            id: btoa(pdfUrl).substring(0, 16), // Consistent ID from URL
            url: pdfUrl,
            name: decodeURIComponent(fileName).replace(/_/g, ' '),
            path: pdfUrl.split('pdfs/')[1] ? 'Library / ' + pdfUrl.split('pdfs/')[1] : 'External'
        };

        // Check if we're offline and if PDF is cached
        if (!navigator.onLine) {
            const cachedPdf = pdfCache.get(pdfUrl);
            if (cachedPdf) {
                // console.log('📴 Loading cached PDF while offline:', pdfUrl);                // Initialize iframe and load from cache
                initializeIframe();

                pdfIframe.src = `/oread/web/viewer.html?disableStream=false&disableRange=false&disableAutoFetch=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}`;

                // Send cached blob data to iframe
                setTimeout(() => {
                    if (pdfIframe.contentWindow) {
                        pdfIframe.contentWindow.postMessage({
                            type: 'blobDataResponse',
                            originalUrl: pdfUrl,
                            arrayBuffer: cachedPdf.blob,
                            size: cachedPdf.blob.size
                        }, '*');
                    }
                }, 100);

                // Show popup and update bookmark icon
                popup.classList.remove('closing');
                popup.style.display = 'block';

                // For cached PDFs, the content is already available.
                // We'll remove the indicator once we've sent the blob data or after a short delay
                // to ensure the viewer has at least initialized.
                setTimeout(() => {
                    const loadingIndicator = document.getElementById('pdf-loading-indicator');
                    if (loadingIndicator) loadingIndicator.remove();
                }, 500);

                // Update bookmark icon after a short delay
                setTimeout(updateBookmarkIcon, 500);

                return;
            } else {
                // PDF not cached and offline - show error
                document.getElementById('popupContent').innerHTML =
                    `<div style="display: flex; align-items: center; justify-content: center; height: 87vh; text-align: center; flex-direction: column; padding: 20px;">
<i class="fa-solid fa-bookmark-slash" style="font-size: 72px; color:#ff8400;"></i>
<p class="popup-message" style="font-weight:600;">Not saved for offline</p>
<p class="popup-errcode">status: bookmark PDFs to access them offline</p>
</div>`;
                popup.classList.remove('closing');
                popup.style.display = 'block';
                return;
            }
        }

        // Online - use original function
        const result = await originalLoadPdfWithCache(pdfUrl);

        // Update bookmark icon after loading
        setTimeout(updateBookmarkIcon, 500);

        return result;
    }

    // Replace the global function
    window.loadPdfWithCache = enhancedLoadPdfWithCache;

    // Initialize bookmark feature when DOM is ready
    initializeBookmarkFeature();

    // ===== DOWNLOAD FUNCTIONALITY (YouTube-style offline downloads) =====
    let downloadButton = null;

    // Initialize download button and functionality
    function initializeDownloadFeature() {
        downloadButton = document.getElementById('downloadButton');
        if (!downloadButton) return;

        // Set up download button click handler
        downloadButton.addEventListener('click', handleDownloadClick);

        // Update download icon based on current PDF
        updateDownloadIcon();
    }

    // Update download icon visual state
    async function updateDownloadIcon() {
        if (!downloadButton || !currentPdfUrl) return;

        const icon = downloadButton.querySelector('i');
        if (!icon) return;

        try {
            const isDownloaded = await window.pdfDownloadManager.isDownloaded(currentPdfUrl);

            if (isDownloaded) {
                // Solid bookmark for downloaded PDFs
                icon.className = 'fa-solid fa-bookmark-plus';
                downloadButton.style.color = '#8dac49';
                downloadButton.title = 'Downloaded for offline reading';
                downloadButton.style.cursor = 'default';
            } else {
                // Regular bookmark for non-downloaded PDFs
                icon.className = 'fa-regular fa-bookmark-plus';
                downloadButton.style.color = '#ff8200';
                downloadButton.title = 'Download for offline reading';
                downloadButton.style.cursor = 'pointer';
            }
        } catch (error) {
            console.error('Error checking download status:', error);
        }
    }

    // Handle download button click
    async function handleDownloadClick() {
        if (!currentPdfUrl) {
            return;
        }

        try {
            const isDownloaded = await window.pdfDownloadManager.isDownloaded(currentPdfUrl);

            if (isDownloaded) {
                // Already downloaded - do nothing
                return;
            }

            // Show downloading state
            const icon = downloadButton.querySelector('i');
            icon.className = 'fa-solid fa-loader';
            downloadButton.style.color = '#888';
            downloadButton.title = 'Downloading...';
            downloadButton.disabled = true;

            // Extract metadata from URL
            const urlParts = currentPdfUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const subject = urlParts[urlParts.length - 2] || 'Unknown Subject';
            const semester = urlParts[urlParts.length - 3] || 'Unknown Semester';

            const metadata = {
                title: filename.replace('.pdf', ''),
                subject: subject,
                semester: semester
            };

            // Download the PDF
            const result = await window.pdfDownloadManager.downloadPDF(currentPdfUrl, metadata);

            if (result.success) {
                // Update to downloaded state
                updateDownloadIcon();
            }

        } catch (error) {
            console.error('Error downloading PDF:', error);

            // Show error state
            const icon = downloadButton.querySelector('i');
            icon.className = 'fa-solid fa-loader';
            downloadButton.style.color = '#ff0000';
            downloadButton.title = 'Download failed - Click to retry';
        } finally {
            downloadButton.disabled = false;
        }
    }

    // Enhanced loadPdfWithCache to work with downloads and track current PDF
    const originalLoadPdfWithCache2 = window.loadPdfWithCache;

    async function enhancedLoadPdfWithCacheForDownloads(pdfUrl) {
        // Update current PDF URL for download functionality
        currentPdfUrl = pdfUrl;

        // Ensure IndexedDB is fully initialized before checking
        try {
            // Wait for pdfDownloadManager to be available and initialized
            if (!window.pdfDownloadManager) {
                const result = await originalLoadPdfWithCache2(pdfUrl);
                setTimeout(updateDownloadIcon, 500);
                return result;
            }

            // Wait for IndexedDB initialization to complete
            await window.pdfDownloadManager.initPromise;

            const isDownloaded = await window.pdfDownloadManager.isDownloaded(pdfUrl);

            if (isDownloaded) {
                // Show loading indicator while fetching from IndexedDB
                document.getElementById('popupContent').innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 87vh; text-align: center; flex-direction: column; padding: 20px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 48px; color:#ff8200; margin-bottom: 20px;"></i>
                        <p style="font-weight:600; font-size: 18px;">Loading from offline storage...</p>
                    </div>
                `;
                popup.classList.remove('closing');
                popup.style.display = 'block';

                // Get PDF data from IndexedDB
                const pdfData = await window.pdfDownloadManager.getPDFData(pdfUrl);

                if (pdfData) {
                    // Initialize iframe
                    initializeIframe();

                    // Load PDF.js viewer
                    const viewerUrl = `/oread/web/viewer.html?disableStream=false&disableRange=false&disableAutoFetch=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}`;
                    pdfIframe.src = viewerUrl;

                    // Wait for iframe to be ready before sending data
                    const iframeLoadPromise = new Promise((resolve) => {
                        if (pdfIframe.contentWindow) {
                            pdfIframe.addEventListener('load', resolve, { once: true });
                        } else {
                            setTimeout(resolve, 200);
                        }
                    });

                    await iframeLoadPromise;

                    // Send the downloaded PDF data to iframe
                    if (pdfIframe.contentWindow) {
                        pdfIframe.contentWindow.postMessage({
                            type: 'blobDataResponse',
                            originalUrl: pdfUrl,
                            arrayBuffer: pdfData,
                            size: pdfData.byteLength,
                            fromDownload: true
                        }, '*');
                    }

                    // Show popup and update download icon
                    popup.classList.remove('closing');
                    popup.style.display = 'block';

                    // Update download icon
                    setTimeout(updateDownloadIcon, 500);

                    return;
                }
            }
        } catch (error) {
            console.error('Error loading from IndexedDB:', error);
            // Fall through to network loading
        }

        // Not downloaded or error - use original loading method
        const result = await originalLoadPdfWithCache2(pdfUrl);

        // Update download icon after loading
        setTimeout(updateDownloadIcon, 500);

        return result;
    }

    // Replace the global function
    window.loadPdfWithCache = enhancedLoadPdfWithCacheForDownloads;

    // Initialize download feature
    initializeDownloadFeature();

    // Expose download functions globally
    window.handleDownloadClick = handleDownloadClick;
    window.updateDownloadIcon = updateDownloadIcon;

    // Expose bookmark functions globally for testing/debugging
    window.getBookmarkedPdfs = getBookmarkedPdfs;
    window.addBookmark = addBookmark;
    window.removeBookmark = removeBookmark;
});