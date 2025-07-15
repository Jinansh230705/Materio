document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    const popup = document.getElementById('popup');
    const popupContent = document.getElementById('popupContent');
    const cacheKey = 'recentPdfs';
    let pdfIframe = document.getElementById('pdf-iframe') || null;
    const pdfCache = new Map();

    function getCachedPdfs() {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : [];
    }

    function addToCache(pdfUrl) {
        let cachedPdfs = getCachedPdfs().filter(url => url !== pdfUrl);
        cachedPdfs.unshift(pdfUrl);
        if (cachedPdfs.length > 5) cachedPdfs.pop();
        localStorage.setItem(cacheKey, JSON.stringify(cachedPdfs));
    } async function preloadPdf(pdfUrl) {
        if (pdfCache.has(pdfUrl)) {
            // console.log('PDF already preloaded:', pdfUrl);
            return;
        }
        try {
            const response = await fetch(pdfUrl);
            if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            const pdfBlob = await response.blob();
            const pdfBlobUrl = URL.createObjectURL(pdfBlob);

            // Create a cache key for the service worker
            const cacheKey = btoa(pdfUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);

            // Store in service worker cache for faster access
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const messageChannel = new MessageChannel();

                navigator.serviceWorker.controller.postMessage({
                    type: 'STORE_BLOB_CACHE',
                    key: cacheKey,
                    arrayBuffer: arrayBuffer,
                    size: pdfBlob.size
                }, [messageChannel.port2, arrayBuffer]);
            }

            pdfCache.set(pdfUrl, {
                blobUrl: pdfBlobUrl,
                blob: pdfBlob,
                originalUrl: pdfUrl,
                cacheKey: cacheKey,
                cachedAt: Date.now()
            });
            // console.log('PDF preloaded:', pdfUrl);
        } catch (error) {
            console.error('Error preloading PDF:', error);
        }
    }

    function initializeIframe() {
        if (!pdfIframe) {
            pdfIframe = document.createElement('iframe');
            pdfIframe.id = 'pdf-iframe';
            pdfIframe.style.border = 'none';
            pdfIframe.style.width = '100%';
            pdfIframe.style.height = 'calc(100% - 17px)';
            pdfIframe.style.borderRadius = '10px';
            pdfIframe.style.marginTop = '22px';

            // Add load event listener to setup blob intercept and overlay modes
            pdfIframe.addEventListener('load', function () {
                // Give PDF.js a moment to initialize, then setup blob intercept and request overlay modes
                setTimeout(() => {
                    const mainPopup = document.getElementById('popup');
                    if (mainPopup && pdfIframe.contentWindow) {
                        // Setup blob intercept for faster PDF loading
                        pdfIframe.contentWindow.postMessage({
                            type: 'setupBlobIntercept',
                            pdfCache: Array.from(pdfCache.entries()).map(([key, value]) => ({
                                originalUrl: key,
                                blobUrl: value.blobUrl || value,
                                cachedAt: value.cachedAt || Date.now()
                            }))
                        }, '*');

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
                }, 500);
            });
        }
        if (!document.getElementById('pdf-iframe')) {
            popupContent.appendChild(pdfIframe);
        }
    }    // Enhanced PDF loading function with error handling and caching
    async function loadPdfWithCache(pdfUrl) {
        // Check offline status first
        if (!navigator.onLine) {
            document.getElementById('popupContent').innerHTML =
                `<div style="padding:20px;text-align:center;">
<i class="fa-solid fa-rotate-exclamation" style="font-size: 72px; color:#ff8400; margin-top:220px;"></i>
<p class="popup-message">Error checking file!</p>
<p class="popup-errcode">Error: OFFLINE</p>
</div>`;
            popup.classList.remove('closing');
            popup.style.display = 'block';
            return;
        }

        // Check if PDF exists (HEAD request) for non-cached PDFs
        const cachedPdf = pdfCache.get(pdfUrl);
        if (!cachedPdf) {
            try {
                const headResponse = await fetch(pdfUrl, { method: 'HEAD' });
                if (!headResponse.ok) {
                    document.getElementById('popupContent').innerHTML =
                        `<div style="display: flex; align-items: center; justify-content: center; height: 87vh; text-align: center; flex-direction: column; padding: 20px;">
    <i class="fa-solid fa-triangle-exclamation" style="font-size: 72px; color:#ff8400;"></i>
    <p class="popup-message" style="font-weight:600;">Requested resource could not be found!</p>
    <p class="popup-errcode">status: ${headResponse.status}</p>
    <a class="btn primary-btn" target="_blank" rel="noreferrer"
        href="https://github.com/Materioa/materio/issues/new?template=contribute.yml">
        <i class="fa-regular fa-circle-plus" style="margin-right:10px;"></i>Contribute
    </a>
    <p style="font-size:12px; font-weight:600; max-width: 400px; word-wrap: break-word;">
        If you can't find the material here and you have the appropriate resource, then you can contribute by clicking the button above.
    </p>
</div>`;
                    popup.classList.remove('closing');
                    popup.style.display = 'block';
                    return;
                }
            } catch (error) {
                document.getElementById('popupContent').innerHTML =
                    `<div style="padding:20px;text-align:center;">
<i class="fa-solid fa-rotate-exclamation" style="font-size: 72px; color:#ff8400; margin-top:220px;"></i>
<p class="popup-message">Error checking file!</p>
<p class="popup-errcode">Error: ${error.message || 'NETWORK_ERROR'}</p>
</div>`;
                popup.classList.remove('closing');
                popup.style.display = 'block';
                return;
            }
        }

        // Always pass the original URL to PDF.js, but send the blob data to the iframe
        // This allows our interceptor to catch requests and serve cached content

        // Initialize iframe and load the PDF
        initializeIframe();        if (cachedPdf) {
            // Load PDF.js with the original URL - our interceptor will catch and serve from cache
            pdfIframe.src = `/oread/web/viewer.html?disableStream=true&disableRange=true&disableAutoFetch=false&file=${encodeURIComponent(pdfUrl)}`;
            
            // Send cached blob data to iframe after a short delay to ensure PDF.js is ready
            setTimeout(() => {
                if (pdfIframe.contentWindow) {
                    pdfIframe.contentWindow.postMessage({
                        type: 'blobDataResponse',
                        originalUrl: pdfUrl,
                        blobUrl: cachedPdf.blobUrl,
                        arrayBuffer: cachedPdf.blob,
                        size: cachedPdf.blob.size
                    }, '*');
                }
            }, 100);
        } else {
            // For non-cached PDFs, preload them first and then load
            // console.log('🌐 Loading PDF from network:', pdfUrl);
            await preloadPdf(pdfUrl);
            const newCachedPdf = pdfCache.get(pdfUrl);            if (newCachedPdf) {
                // Now load with cache
                pdfIframe.src = `/oread/web/viewer.html?disableStream=true&disableRange=true&disableAutoFetch=false&file=${encodeURIComponent(pdfUrl)}`;
                setTimeout(() => {
                    if (pdfIframe.contentWindow) {
                        pdfIframe.contentWindow.postMessage({
                            type: 'blobDataResponse',
                            originalUrl: pdfUrl,
                            blobUrl: newCachedPdf.blobUrl,
                            arrayBuffer: newCachedPdf.blob,
                            size: newCachedPdf.blob.size
                        }, '*');
                    }
                }, 100);
            } else {
                // Fallback to direct loading
                pdfIframe.src = `/oread/web/viewer.html?disableStream=false&disableRange=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}`;
            }
        }

        // Add to recent cache and show popup
        addToCache(pdfUrl);
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
            const pdfUrl = `https://cdn-materioa.netlify.app/pdfs/${semester}/${subject}/${topic}.pdf`;
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
    });

    // Expose functions globally for testing
    window.preloadPdf = preloadPdf;
    window.pdfCache = pdfCache;
    window.loadPdfWithCache = loadPdfWithCache;

    // ===== BOOKMARK FUNCTIONALITY =====
    const bookmarkCacheKey = 'bookmarkedPdfs';
    let currentPdfUrl = null;
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
            console.warn('No PDF currently loaded');
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

    // Show bookmark notification
    function showBookmarkNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        // Set colors based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            case 'info':
            default:
                notification.style.backgroundColor = '#17a2b8';
                break;
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Enhanced loadPdfWithCache to track current PDF and handle offline scenarios
    const originalLoadPdfWithCache = window.loadPdfWithCache;

    async function enhancedLoadPdfWithCache(pdfUrl) {
        // Update current PDF URL for bookmark functionality
        currentPdfUrl = pdfUrl;

        // Check if we're offline and if PDF is cached
        if (!navigator.onLine) {
            const cachedPdf = pdfCache.get(pdfUrl);
            if (cachedPdf) {
                // console.log('📴 Loading cached PDF while offline:', pdfUrl);                // Initialize iframe and load from cache
                initializeIframe();

                pdfIframe.src = `/oread/web/viewer.html?disableStream=true&disableRange=true&disableAutoFetch=false&file=${encodeURIComponent(pdfUrl)}`;

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
                addToCache(pdfUrl);

                // Update bookmark icon after a short delay
                setTimeout(updateBookmarkIcon, 500);

                return;
            } else {
                // PDF not cached and offline - show error
                document.getElementById('popupContent').innerHTML =
                    `<div style="padding:20px;text-align:center;">
<i class="fa-solid fa-wifi-slash" style="font-size: 72px; color:#ff8400; margin-top:220px;"></i>
<p class="popup-message">This PDF is not available offline</p>
<p class="popup-errcode">Please connect to internet or bookmark PDFs for offline access</p>
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

    // Expose bookmark functions globally for testing/debugging
    window.getBookmarkedPdfs = getBookmarkedPdfs;
    window.addBookmark = addBookmark;
    window.removeBookmark = removeBookmark;
});