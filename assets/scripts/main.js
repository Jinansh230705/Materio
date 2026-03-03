/**
 * Materio Core 
 * © 2024-2026, Materio by JTC.
 */

function closePromoModal() {
    const modal = document.getElementById('promoModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset transform in case it was swiped
        const modalContent = modal.querySelector('.promo-modal');
        if (modalContent) modalContent.style.transform = '';
    }
}

function closeExamModal() {
    const modal = document.getElementById('examModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset transform in case it was swiped
        const modalContent = modal.querySelector('.exam-modal');
        if (modalContent) modalContent.style.transform = '';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var year = new Date().getFullYear();
    var creatorInfo = document.getElementById('creatorInfo');
    if (creatorInfo) {
        var p = creatorInfo.querySelector('p');
        if (p) {
            p.innerHTML = '&copy; ' + year + ' - Materio';
        }
    }

    // Check if offline and redirect to downloads tab
    checkOfflineAndRedirect();

    // Listen for online/offline changes
    window.addEventListener('online', () => {
        showAllTabs();
    });

    window.addEventListener('offline', () => {
        checkOfflineAndRedirect();
    });

    // Prevent ads inside callout blocks
    const calloutSelectors = [
        'blockquote.note',
        'blockquote.tip',
        'blockquote.important',
        'blockquote.warning',
        'blockquote.caution',
        'blockquote.success',
        'blockquote.info',
        '.callout-note',
        '.callout-tip',
        '.callout-important',
        '.callout-warning',
        '.callout-caution'
    ];

    // Clean up 'handoff' parameter from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('handoff')) {
        urlParams.delete('handoff');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
    }

    const callouts = document.querySelectorAll(calloutSelectors.join(', '));
    callouts.forEach(callout => {
        callout.classList.add('google-auto-ads-ignore');
    });

    // Bug Report Tooltip Logic
    initBugTooltip();
});

function initBugTooltip() {
    const tooltip = document.getElementById('bugReportTooltip');
    if (!tooltip) return;

    // Initialize Swipe Gestures for Modals
    initModalSwipeGestures();

    const lastShown = localStorage.getItem('bugTooltipLastShown');
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // Show if never shown or if more than 7 days have passed
    if (!lastShown || (now - parseInt(lastShown)) > oneWeek) {
        setTimeout(() => {
            tooltip.classList.add('show');

            // Auto close after 10 seconds if not already closed
            setTimeout(() => {
                if (tooltip.classList.contains('show')) {
                    closeBugTooltip();
                }
            }, 10000);
        }, 3000); // Show after 3 seconds
    }
}

window.closeBugTooltip = function () {
    const tooltip = document.getElementById('bugReportTooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
        localStorage.setItem('bugTooltipLastShown', Date.now().toString());
    }
};

// Offline detection and redirect to downloads
function checkOfflineAndRedirect() {
    if (!navigator.onLine) {
        // Hide all tabs except Downloads
        hideNonDownloadTabs();

        // Wait a bit for the page to fully load
        setTimeout(() => {
            // Directly show Downloads tab without needing login/dropdown
            showDownloadsTabOffline();
        }, 500);
    } else {
        // Online - show all tabs
        showAllTabs();
    }
}

// Show Downloads tab directly (works even when not logged in)
function showDownloadsTabOffline() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const downloadsContent = document.getElementById('downloads');

    if (downloadsContent) {
        // Remove active class from all tabs and contents
        tabLinks.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Show downloads content
        downloadsContent.classList.add('active');

        // Dispatch event to trigger downloads loading
        document.dispatchEvent(new Event('downloadsTabOpened'));
    } else {

    }
}

// Hide all tabs except Downloads when offline
function hideNonDownloadTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        if (tabName !== 'downloads') {
            tab.style.display = 'none';
        }
    });
}

// Show all tabs when online
function showAllTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.style.display = '';
    });
}
function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
document.addEventListener("DOMContentLoaded", function () {
    const activeTab = getCookie("activeTab") || "home";
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");

    // Remove active class from all tabs and set icons to regular
    tabLinks.forEach(link => {
        link.classList.remove("active");
        const icon = link.querySelector('i');
        if (icon && !link.querySelector('img')) { // Skip profile icon with image
            icon.classList.remove('fas');
            icon.classList.add('far');
        }
    });

    tabContents.forEach(content => content.classList.remove("active"));

    const selectedTabLink = document.querySelector(`.tab-link[data-tab="${activeTab}"]`);
    if (selectedTabLink) {
        selectedTabLink.classList.add("active");
        const icon = selectedTabLink.querySelector('i');
        if (icon && !selectedTabLink.querySelector('img')) { // Skip profile icon with image
            icon.classList.remove('far');
            icon.classList.add('fas');
        }
        document.getElementById(activeTab)?.classList.add("active");
    } else {
        const homeLink = document.querySelector('.tab-link[data-tab="home"]');
        homeLink.classList.add("active");
        const icon = homeLink.querySelector('i');
        if (icon && !homeLink.querySelector('img')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
        }
        document.getElementById("home").classList.add("active");
    }

    // Toggle scrollbar visibility for home tab on load
    const currentTab = getCookie("activeTab") || "home";
    document.querySelector('.content')?.classList.toggle('hide-scrollbar', currentTab === 'home');

    tabLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            // Check if this is the profile icon with dropdown functionality
            if (this.classList.contains('profile-icon') && this.classList.contains('has-dropdown')) {
                return; // Don't execute tab switching for profile dropdown
            }

            // Check if this is a modal trigger (like create note)
            if (this.classList.contains('modal-trigger')) {
                return;
            }

            e.preventDefault();

            // Haptic feedback for tab switch
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate('tab');
            }

            // Remove active class and change icons back to regular for all tabs
            tabLinks.forEach(tab => {
                tab.classList.remove("active");
                const icon = tab.querySelector('i');
                if (icon && !tab.querySelector('img')) {
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                }
            });

            tabContents.forEach(content => content.classList.remove("active"));

            // Add active class and change icon to solid
            this.classList.add("active");
            const icon = this.querySelector('i');
            if (icon && !this.querySelector('img')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            }

            const tab = this.getAttribute("data-tab");
            document.getElementById(tab)?.classList.add("active");
            setCookie("activeTab", tab, 7);

            // Toggle scrollbar visibility for home tab
            document.querySelector('.content')?.classList.toggle('hide-scrollbar', tab === 'home');

            // Dispatch event for other scripts to respond to tab change
            document.dispatchEvent(new CustomEvent('tabOpened', { detail: { tab: tab } }));

            // Hide search dropdown when switching away from home tab
            const searchResults = document.getElementById('quickSearchResults');
            if (searchResults && tab !== 'home') {
                searchResults.style.display = 'none';
            }
        });
    });

    // Initialize PDF Share
    checkSharedPdf();
    const shareBtn = document.getElementById('sharePdfButton');
    if (shareBtn) {
        shareBtn.addEventListener('click', handlePdfShareClick);
    }
});



// Swipe Gesture Logic for Modals
function initModalSwipeGestures() {
    const modals = [
        { id: 'promoModal', contentClass: '.promo-modal', closeFunc: closePromoModal },
        { id: 'examModal', contentClass: '.exam-modal', closeFunc: closeExamModal } // Assuming closeExamModal exists or will be created
    ];

    modals.forEach(modalInfo => {
        const modalOverlay = document.getElementById(modalInfo.id);
        if (!modalOverlay) return;

        const modalContent = modalOverlay.querySelector(modalInfo.contentClass);
        if (!modalContent) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        const threshold = 100; // Minimum distance to swipe to close

        // Touch Start
        modalContent.addEventListener('touchstart', (e) => {
            // Only enable swipe if we are at the top of the scroll
            // Check if the target is scrollable and not at the top
            let target = e.target;
            let isScrollable = false;

            while (target && target !== modalContent) {
                if (target.scrollHeight > target.clientHeight && target.scrollTop > 0) {
                    isScrollable = true;
                    break;
                }
                target = target.parentElement;
            }

            if (isScrollable) return;

            startY = e.touches[0].clientY;
            isDragging = true;
            modalContent.style.transition = 'none'; // Disable transition during drag
        }, { passive: true });

        // Touch Move
        modalContent.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const touchY = e.touches[0].clientY;
            const deltaY = touchY - startY;

            if (deltaY > 0) { // Only allow dragging downwards
                e.preventDefault(); // Prevent scrolling
                currentY = deltaY;
                modalContent.style.transform = `translateY(${currentY}px)`;
            }
        }, { passive: false });

        // Touch End
        modalContent.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            modalContent.style.transition = 'transform 0.3s ease-out';

            if (currentY > threshold) {
                // Swipe success - close modal
                modalContent.style.transform = `translateY(100%)`;
                setTimeout(() => {
                    modalInfo.closeFunc();
                    modalContent.style.transform = ''; // Reset for next time
                }, 300);
            } else {
                // Swipe cancel - revert position
                modalContent.style.transform = '';
            }
            currentY = 0;
        });
    });

    // Inject CSS for smooth scrolling in modals - Target ONLY touch devices to prevent desktop jitter
    const style = document.createElement('style');
    style.textContent = `
        @media (hover: none) and (pointer: coarse) {
            .promo-modal, .promo-content, .exam-modal-page, .syllabus-full-content {
                -webkit-overflow-scrolling: touch;
                scroll-behavior: smooth;
                overscroll-behavior: contain;
            }
        }
    `;
    document.head.appendChild(style);
}

const submitButton = document.getElementById('submitButton');
const popup = document.getElementById('popup');
const closePopup = document.getElementById('closePopup');

submitButton.addEventListener('click', async () => {
    // Haptic feedback for submit action
    if (window.MaterioHaptics) {
        window.MaterioHaptics.vibrate('strong');
    }

    const semester = document.getElementById('semesterSelect').value;
    const subject = document.getElementById('subjectSelect').value;
    const categorySelect = document.getElementById('categorySelect');
    const topic = document.getElementById('topicSelect').value;

    if (!semester || !subject || categorySelect.selectedIndex === 0 || !topic) {
        const roasts = [
            { message: "Start Reading what? The entire syllabus in one night? Pick a topic before the speedrun glitch-abuses you.", button: "Fair..." },
            { message: "Bro hit Start Reading like he’s about to unlock 16 weeks of content in 16 seconds. Select something before the game crashes.", button: "Valid" },
            { message: "Calm down, scholar. You can’t speedrun the whole syllabus by mashing Start Reading. Choose a chapter before attempting the world record.", button: "Alright, alright" },
            { message: "Trying to Start Reading without picking anything? That’s peak “exam is tomorrow so let me learn the entire degree tonight” energy. Select something.", button: "True" },
            { message: "You pressed Start Reading like Netflix’s “Skip Intro” works on coursework. It doesn’t. Pick a topic.", button: "Touché" },
            { message: "Start Reading with no selection? Bro’s on that “I’ll finish the syllabus tonight, trust me” delusion. Choose something real.", button: "My bad" },
            { message: "You tried to read nothing. Classic exam-eve panic maneuver. Grab a topic before the syllabus grabs YOU.", button: "Okay fine" },
            { message: "This isn’t a Marvel recap. You can’t skip 5 months and Start Reading. Make a selection first, prodigy.", button: "Fair point" },
            { message: "Pressing Start Reading with zero choices… bold. That’s some last-minute all-nighter confidence right there. Select something.", button: "I’ll behave" },
            { message: "Trying to absorb knowledge telepathically now? Pick what you want to read before going full Doctor Strange on the syllabus.", button: "Say less" },
            { message: "Start Reading what exactly? The void? Bro really queued up for the entire syllabus any% speedrun with ZERO selections. Touch some topics first.", button: "My fault gang" },
            { message: "Bro slammed Start Reading like he’s about to fast-travel through 16 weeks in 16 milliseconds. Select something before reality blue-screens.", button: "Real." },
            { message: "Holdup prodigy. You cannot speedrun academia by mashing Start Reading like it's a broken controller. Pick a chapter before activating godmode.", button: "Aight bet" },
            { message: "No selection and still hit Start Reading?? That’s peak ‘exam tomorrow so let me download knowledge via Bluetooth’ behavior. Choose something.", button: "Skill issue tbh" },
            { message: "Bro pressed Start Reading like school has a Skip Intro button. This isn’t Netflix, scholar. Pick a topic before the credits roll.", button: "Trueee" },
            { message: "Start Reading with no selection?? Bro is deep in exam-eve delusion arc thinking he’ll absorb the syllabus osmosis-style. Choose something real.", button: "Ok fine 😭" },
            { message: "Reading nothing?? Peak panic speedrun strat. Pick a topic before the syllabus jumpscares YOU.", button: "Understandable" },
            { message: "This isn’t Marvel bro. You can’t skip 5 months of classes and hit Start Reading like it's a recap episode. Select something before Phase 6 drops.", button: "Fair point ig" },
            { message: "Start Reading with zero choices??? Nah that’s last-minute all-nighter menace behavior. Pick your fate before proceeding.", button: "I'll behave 💀" },
            { message: "Bro tried to Start Reading telepathically. This ain't Doctor Strange multiverse knowledge absorption. Select a topic before casting spells.", button: "Say less wizard" }
        ];
        const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

        materioAlert(randomRoast.message, {
            title: 'Selection Required',
            type: 'warning',
            buttonText: randomRoast.button
        });
        return;
    }

    // Check if the caching system is available and use it
    if (typeof window.loadPdfWithCache === 'function') {
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

        // Use the cached loading system
        window.loadPdfWithCache(pdfUrl);
        popup.classList.remove('closing');
        popup.style.display = 'block';
    } else {
        // Fallback to original behavior if caching system not available
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
        document.getElementById('popupContent').innerHTML =
            `<iframe id="pdf-iframe" scrolling='no' allowfullscreen webkitallowfullscreen style="border:none; width:100%; height:calc(100% - 17px); border-radius:25px; margin-top:22px; corner-shape: squircle;" 
        src="/oread/web/viewer.html?disableStream=false&disableRange=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}"></iframe>`;

        popup.classList.remove('closing');
        popup.style.display = 'block';
    }
});

closePopup.addEventListener('click', () => {
    popup.classList.add('closing');
});

popup.addEventListener('animationend', (event) => {
    if (event.animationName === 'popupFadeOut') {
        popup.style.display = 'none';
        popup.classList.remove('closing');
    }
});

/**
 * Custom share modal for PDFs
 * @param {string} actualUrl - The PDF URL to share
 */
function materioShareModal(actualUrl) {
    const llmToggleSaved = localStorage.getItem('materio_llm_share') === 'true';

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'materio-modal-overlay';
    overlay.innerHTML = `
        <div class="materio-modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
            <h3 class="materio-modal-title" id="share-modal-title">Share PDF</h3>
            
            <div class="llm-share-toggle-row">
                <div class="llm-toggle-left">
                    <i class="fa-solid fa-sparkles llm-toggle-icon"></i>
                    <span class="llm-toggle-label">Share to LLM</span>
                </div>
                <label class="llm-toggle-switch">
                    <input type="checkbox" id="llm-share-toggle" ${llmToggleSaved ? 'checked' : ''}>
                    <span class="llm-toggle-slider"></span>
                </label>
            </div>

            <div class="share-input-container" id="share-input-container">
                <input type="text" class="share-url-input" id="share-url-input" readonly value="Crafting your secure link..." aria-label="Share URL">
                <button class="share-copy-btn" id="share-copy-btn" disabled aria-label="Copy link">
                    <i class="fa-regular fa-loader fa-spin"></i>
                </button>
            </div>

            <div class="llm-expiry-info" id="llm-expiry-info">
                <i class="fa-solid fa-clock"></i>
                <span>Generating secure link...</span>
            </div>

            <div class="materio-modal-buttons">
                <button class="materio-modal-btn primary" id="share-modal-close" style="max-width: 100%; flex: 1;">Back</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });

    const input = overlay.querySelector('#share-url-input');
    const inputContainer = overlay.querySelector('#share-input-container');
    const copyBtn = overlay.querySelector('#share-copy-btn');
    const closeBtn = overlay.querySelector('#share-modal-close');
    const llmToggle = overlay.querySelector('#llm-share-toggle');
    const llmExpiryInfo = overlay.querySelector('#llm-expiry-info');

    // Auto-select input on click
    input.addEventListener('click', () => input.select());

    // Close function
    function closeModal() {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.remove();
        }, 250);
    }

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Handle Esc key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', escHandler);
            closeModal();
        }
    };
    document.addEventListener('keydown', escHandler);

    // Initial focus
    setTimeout(() => closeBtn.focus(), 100);

    // State
    let normalShareUrl = null;
    let llmShareUrl = null;
    let llmLinkGenerated = false;

    // Helper to set the copy button behavior
    function setupCopyBtn(url) {
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(url);
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                copyBtn.classList.add('success');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                    copyBtn.classList.remove('success');
                }, 2000);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        };
    }

    // Show the appropriate URL based on toggle state
    function showUrl() {
        const isLlm = llmToggle.checked;
        if (isLlm && llmShareUrl) {
            input.value = llmShareUrl;
            inputContainer.classList.add('llm-active');
            llmExpiryInfo.classList.add('visible');
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            copyBtn.disabled = false;
            setupCopyBtn(llmShareUrl);
        } else if (isLlm && !llmShareUrl) {
            input.value = 'Generating LLM link...';
            inputContainer.classList.add('llm-active');
            llmExpiryInfo.classList.add('visible');
            copyBtn.innerHTML = '<i class="fa-regular fa-loader fa-spin"></i>';
            copyBtn.disabled = true;
        } else if (normalShareUrl) {
            input.value = normalShareUrl;
            inputContainer.classList.remove('llm-active');
            llmExpiryInfo.classList.remove('visible');
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            copyBtn.disabled = false;
            setupCopyBtn(normalShareUrl);
        }
    }

    // Generate LLM link
    async function generateLlmLink() {
        if (llmLinkGenerated) return;
        llmLinkGenerated = true;

        try {
            const response = await fetch('/api/v2/features?action=pdf-share&subAction=create-llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actualUrl })
            });

            const data = await response.json();
            if (data.llmMaskId) {
                llmShareUrl = `${window.location.origin}/llm?link-id=${data.llmMaskId}`;

                // Update expiry display
                if (data.expiresAt) {
                    const expiresAt = new Date(data.expiresAt);
                    const now = new Date();
                    const hoursLeft = Math.max(0, Math.round((expiresAt - now) / (1000 * 60 * 60) * 10) / 10);
                    llmExpiryInfo.querySelector('span').textContent = `Link expires in ~${hoursLeft}h`;
                }

                if (llmToggle.checked) showUrl();
            } else {
                throw new Error('No llmMaskId');
            }
        } catch (e) {
            console.error('LLM Share error:', e);
            if (llmToggle.checked) {
                input.value = 'Failed to generate LLM link';
                copyBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            }
            llmLinkGenerated = false;
        }
    }

    // Toggle handler
    llmToggle.addEventListener('change', () => {
        const isEnabled = llmToggle.checked;
        localStorage.setItem('materio_llm_share', isEnabled);

        if (isEnabled) {
            generateLlmLink();
        }
        showUrl();
    });

    // If toggle was saved as enabled, generate LLM link immediately
    if (llmToggleSaved) {
        generateLlmLink();
    }

    // Normal share API call
    (async () => {
        try {
            const response = await fetch('/api/v2/features?action=pdf-share&subAction=create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actualUrl })
            });

            const data = await response.json();
            if (data.maskId) {
                normalShareUrl = `${window.location.origin}${window.location.pathname}?share=${data.maskId}`;
                showUrl();
            } else {
                throw new Error('No maskId');
            }
        } catch (e) {
            console.error('Share error:', e);
            if (!llmToggle.checked) {
                input.value = 'Failed to generate link';
                copyBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
                copyBtn.style.background = '#dc3545';
            }
        }
    })();
}

// PDF Share Logic
async function handlePdfShareClick() {
    // 1. Try global variable from caching.js
    let actualUrl = window.materioCurrentPdfUrl;

    // 2. Fallback to Analytics variable
    if (!actualUrl && window.pdfAnalytics) {
        actualUrl = window.pdfAnalytics.currentPdf;
    }

    // 3. Last resort: Try to extract from iframe
    if (!actualUrl) {
        const iframe = document.getElementById('pdf-iframe') || document.querySelector('#popupContent iframe');
        if (iframe && iframe.src) {
            try {
                const url = new URL(iframe.src, window.location.origin);
                actualUrl = url.searchParams.get('file');
            } catch (e) {
                console.error('Failed to parse iframe src');
            }
        }
    }

    if (!actualUrl || actualUrl === 'unknown') {
        if (window.materioAlert) {
            window.materioAlert('Could not identify the PDF to share. Please try re-opening it.', { type: 'warning' });
        }
        return;
    }

    // Open share modal
    materioShareModal(actualUrl);
}

// Function removed as its logic is now inside materioShareModal
// async function generateAndShareLink(actualUrl) { ... }

async function checkSharedPdf() {
    const urlParams = new URLSearchParams(window.location.search);
    const maskId = urlParams.get('share');
    if (!maskId) return;

    try {
        const response = await fetch(`/api/v2/features?action=pdf-share&subAction=resolve&maskId=${maskId}`);
        const data = await response.json();

        if (data.actualUrl) {
            const popup = document.getElementById('popup');
            if (typeof window.loadPdfWithCache === 'function') {
                window.loadPdfWithCache(data.actualUrl);
            } else {
                document.getElementById('popupContent').innerHTML =
                    `<iframe id="pdf-iframe" scrolling='no' allowfullscreen webkitallowfullscreen style="border:none; width:100%; height:calc(100% - 17px); border-radius:25px; margin-top:22px; corner-shape: squircle;" 
                src="/oread/web/viewer.html?file=${encodeURIComponent(data.actualUrl)}"></iframe>`;
            }
            if (popup) {
                popup.classList.remove('closing');
                popup.style.display = 'block';
            }

            // Clean URL
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    } catch (e) {
        console.error('Failed to resolve shared PDF:', e);
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const libUrl = window.MaterioLocalCDN?.transformUrl('https://cdn-materioa.vercel.app/databases/beta/resource.lib.json') || 'https://cdn-materioa.vercel.app/databases/beta/resource.lib.json';
    fetch(libUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format received');
            }
            const semesterMapping = { "9": "Additional Resources" };
            const semesterSelect = document.getElementById('semesterSelect');
            semesterSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select Semester';
            semesterSelect.appendChild(placeholder);

            for (let sem in data) {
                const option = document.createElement('option');
                option.value = sem;
                option.textContent = semesterMapping[sem] ? semesterMapping[sem] : "Semester " + sem;
                if (sem === "6") {
                    option.selected = true;
                }
                semesterSelect.appendChild(option);
            }

            if (semesterSelect.value) {
                semesterSelect.dispatchEvent(new Event('change'));
            }

            semesterSelect.addEventListener('change', function () {
                clearSelect('subjectSelect', 'Select Subject');
                clearSelect('categorySelect', 'Select Category');
                clearSelect('topicSelect', 'Select Topic');
                const semKey = this.value;
                if (!semKey) return;
                const subjects = data[semKey];
                const subjectSelect = document.getElementById('subjectSelect');

                // Special handling for Vault (semester 9999)
                if (semKey === '9999') {
                    // Extract UUID and use it as the subject
                    if (subjects.uuid) {
                        const option = document.createElement('option');
                        option.value = subjects.uuid;
                        option.textContent = 'Vault';  // Display name
                        subjectSelect.appendChild(option);
                        subjectSelect.disabled = false;
                        // Auto-select and trigger change
                        subjectSelect.value = subjects.uuid;
                        subjectSelect.dispatchEvent(new Event('change'));
                    }
                } else {
                    // Normal semester handling
                    for (let subject in subjects) {
                        const option = document.createElement('option');
                        option.value = subject;
                        option.textContent = subject;
                        subjectSelect.appendChild(option);
                    }
                    subjectSelect.disabled = false;
                }
            });

            document.getElementById('subjectSelect').addEventListener('change', function () {
                clearSelect('categorySelect', 'Select Category');
                clearSelect('topicSelect', 'Select Topic');
                const semKey = document.getElementById('semesterSelect').value;
                const subjectKey = this.value;
                if (!subjectKey) return;

                let categoriesArr;

                // Special handling for Vault (semester 9999)
                if (semKey === '9999') {
                    // Get Vault array directly
                    categoriesArr = data[semKey].Vault;
                } else {
                    // Normal semester handling
                    categoriesArr = data[semKey][subjectKey];
                }

                const categorySelect = document.getElementById('categorySelect');
                if (categoriesArr && categoriesArr.length) {
                    let defaultSet = false;
                    categoriesArr.forEach((catObj, idx) => {
                        const option = document.createElement('option');
                        option.value = idx;
                        option.textContent = catObj.type;
                        if (catObj.type.trim().toLowerCase() === "chapters") {
                            option.selected = true;
                            defaultSet = true;
                        }
                        categorySelect.appendChild(option);
                    });
                    categorySelect.disabled = false;
                    if (defaultSet) {
                        categorySelect.dispatchEvent(new Event('change'));
                    }
                }
            });

            document.getElementById('categorySelect').addEventListener('change', function () {
                clearSelect('topicSelect', 'Select Topic');
                const semKey = document.getElementById('semesterSelect').value;
                const subjectKey = document.getElementById('subjectSelect').value;
                const categoryIndex = this.value;
                if (categoryIndex === '') return;

                let catObj;

                // Special handling for Vault (semester 9999)
                if (semKey === '9999') {
                    // Get category from Vault array
                    catObj = data[semKey].Vault[categoryIndex];
                } else {
                    // Normal semester handling
                    catObj = data[semKey][subjectKey][categoryIndex];
                }

                const topics = catObj.content;
                const topicSelect = document.getElementById('topicSelect');
                if (topics && topics.length > 0) {
                    topics.forEach(topic => {
                        const option = document.createElement('option');
                        option.value = topic;
                        option.textContent = topic;
                        topicSelect.appendChild(option);
                    });
                    topicSelect.disabled = false;
                }
            });

            function clearSelect(selectId, placeholder) {
                const select = document.getElementById(selectId);
                select.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                option.textContent = placeholder;
                select.appendChild(option);
                select.disabled = true;
            }
        })
        .catch(err => {
            // Resource load failed
            // Only show alert when online (offline is expected to fail)
            if (navigator.onLine) {
                const roasts = [
                    { message: "The page is missing a few ingredients. Bro cooked without onions AND salt. Refresh before the dish reports YOU.", button: "Chef moment" },
                    { message: "Resources didn’t load. The page said ‘nah I’m on break.’ Try again before it unionizes.", button: "I'll negotiate" },
                    { message: "The page tried to fetch files but the internet said ‘skill issue.’ Refresh and pray.", button: "True…" },
                    { message: "Some ingredients refused to spawn. RNG is trash today. Reload for better loot.", button: "Reroll" },
                    { message: "The page lagged out mid-load like it’s running on hostel WiFi. Refresh to revive.", button: "Revive pls" },
                    { message: "Something didn’t load. The resources are probably hiding in creative mode.", button: "Teleport them" },
                    { message: "Page assets dipped without notice. They said ‘brb’ and never came back.", button: "Ghosted 💔" },
                    { message: "Resources missing. Bro tried to cook Maggi without Maggi.", button: "Valid" },
                    { message: "The page ingredients clipped through the map. Reload to respawn them.", button: "Respawn" },
                    { message: "Resources refused to load because the syllabus stress aura is too strong.", button: "My bad aura" },
                    { message: "The page couldn’t load stuff. Probably buffering its life choices.", button: "Same tbh" },
                    { message: "Missing ingredients? This page is rawer than a cooking show disaster.", button: "Gordon who?" },
                    { message: "The page tried to load but tripped over its own assets. Reload to help it up.", button: "I'll help" },
                    { message: "Some resources froze like a Windows XP moment. Refresh before it plays the startup sound.", button: "Reboot" },
                    { message: "The page is missing files because the network rage-quit mid-load.", button: "Unrage pls" },
                    { message: "Resources didn’t load. They’re probably respawning in another timeline.", button: "Multiverse moment" },
                    { message: "The page pulled a Thanos snap and half the assets vanished.", button: "Bring them back" },
                    { message: "Something didn’t load. The internet looked at your request and said ‘nah.’", button: "Understandable" },
                    { message: "Ingredients missing. The page is cooking vibes only, no content.", button: "Vibes accepted" },
                    { message: "The page tried to load resources but forgot its own ingredients list. Reload to remind it.", button: "I'll remind it" }
                ];
                const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

                materioAlert(randomRoast.message, {
                    title: 'Resource Load Error',
                    type: 'error',
                    buttonText: randomRoast.button
                });
            }
        });
});


const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('change', function () {
    // Existing elements
    const elements = [
        document.body,
        document.querySelector('header'),
        document.querySelector('.navbar'),
        document.querySelector('.content'),
        document.getElementById('themeCard'),
        document.getElementById('popup'),
        document.getElementById('versionInfo'),
        document.getElementById('reading'),
        document.getElementById('notices'),
        document.getElementById('notificationBoard'),
        document.getElementById('about'),
        document.getElementById('blogs'),
        document.getElementById('blogPostsContent')
    ];



    // Append all notification cards (they all share id "notify")
    const notifyCards = document.querySelectorAll('#notify');
    notifyCards.forEach(card => elements.push(card));

    // Append all dynamically created insight cards
    const insightCards = document.querySelectorAll('.insight-card');
    insightCards.forEach(item => elements.push(item));

    elements.forEach(el => {
        if (el) {
            this.checked ? el.classList.add('dark-mode') : el.classList.remove('dark-mode');
        }
    });
});


if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    themeToggle.checked = true;
    const elements = [
        document.body,
        document.querySelector('header'),
        document.querySelector('.navbar'),
        document.querySelector('.content'),
        document.getElementById('themeCard'),
        document.getElementById('popup'),
        document.getElementById('versionInfo'),
        document.getElementById('reading'),
        document.getElementById('notices'),
        document.getElementById('about'),
        document.getElementById('notificationBoard'),
        document.getElementById('blogs'),
        document.getElementById('blogPostsContent')
    ];
    elements.forEach(el => el.classList.add('dark-mode'));
}

document.addEventListener("DOMContentLoaded", function () {
    const isDark = document.body.classList.contains("dark-mode") ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const giscusScript = document.querySelector('script[src="https://giscus.app/client.js"]');
    if (giscusScript) {
        giscusScript.setAttribute('data-theme', isDark ? 'noborder_dark' : 'noborder_light');
    }
});

// Apply dark mode to dynamically loaded insight cards when they're loaded
window.addEventListener('insightroomPostsLoaded', function () {
    const isDark = document.body.classList.contains("dark-mode") ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
        const insightCards = document.querySelectorAll('.insight-card');
        insightCards.forEach(item => item.classList.add('dark-mode'));
    }
});

// Fullscreen management - prevent ESC from exiting, only Shift+F or button can toggle
const fullscreenButton = document.getElementById('fullscreenButton');
let intentionalFullscreenExit = false; // Flag to track if exit was triggered by user action (button/shortcut)

// Intercept ESC key to prevent browser from exiting fullscreen
// This listener must be added with capture:true to intercept before browser handles it
document.addEventListener('keydown', (e) => {
    // Only intercept ESC when in fullscreen mode
    if (e.key === 'Escape' && document.fullscreenElement) {
        // Prevent the default browser behavior (exiting fullscreen)
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Do nothing - fullscreen stays active
        // User must use Shift+F or click fullscreen button to exit
        return false;
    }
}, true); // capture: true is critical to intercept before browser

fullscreenButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        intentionalFullscreenExit = false;
        document.documentElement.requestFullscreen().then(() => {
            popup.classList.add('fullscreen');
            // Change to exit fullscreen icon
            const icon = fullscreenButton.querySelector('i');
            icon.className = 'fa-solid fa-compress';
            fullscreenButton.setAttribute('aria-label', 'Exit fullscreen');
        }).catch(err => {

        });
    } else {
        // Mark this as an intentional exit so fullscreenchange handler doesn't block it
        intentionalFullscreenExit = true;
        document.exitFullscreen().then(() => {
            popup.classList.remove('fullscreen');
            // Change to enter fullscreen icon
            const icon = fullscreenButton.querySelector('i');
            icon.className = 'fas fa-expand';
            fullscreenButton.setAttribute('aria-label', 'Enter fullscreen');
        }).catch(err => {

        });
    }
});

// Listen for fullscreen changes to update UI state
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        // Fullscreen was exited - update UI
        popup.classList.remove('fullscreen');
        const icon = fullscreenButton.querySelector('i');
        icon.className = 'fas fa-expand';
        fullscreenButton.setAttribute('aria-label', 'Enter fullscreen');
        // Reset flag
        intentionalFullscreenExit = false;
    }
});

// Expose the intentional exit flag globally so keyboard-shortcuts.js can set it
window.setIntentionalFullscreenExit = (value) => {
    intentionalFullscreenExit = value;
};

// Function to load resources data
function loadResourcesData(restoreSemester = null) {
    const libUrl = window.MaterioLocalCDN?.transformUrl('https://cdn-materioa.vercel.app/databases/beta/resource.lib.json') || 'https://cdn-materioa.vercel.app/databases/beta/resource.lib.json';
    return fetch(libUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format received');
            }
            const semesterMapping = {
                "9": "Additional Resources"
            };

            const semesterSelect = document.getElementById('semesterSelect');
            const currentSemester = restoreSemester || semesterSelect.value;

            semesterSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select Semester';
            semesterSelect.appendChild(placeholder);

            for (let sem in data) {
                const option = document.createElement('option');
                option.value = sem;
                option.textContent = (semesterMapping[sem]) ? semesterMapping[sem] : "Semester " + sem;
                semesterSelect.appendChild(option);
            }

            // Remove existing event listeners by cloning BEFORE setting value
            const oldSemesterSelect = semesterSelect;
            const newSemesterSelect = semesterSelect.cloneNode(true);
            oldSemesterSelect.parentNode.replaceChild(newSemesterSelect, oldSemesterSelect);

            // Now get the new element and set up everything
            const finalSemesterSelect = document.getElementById('semesterSelect');

            // Restore the previous semester value if exists, otherwise leave unselected
            if (currentSemester && data[currentSemester]) {
                finalSemesterSelect.value = currentSemester;
            } else {
                // Leave unselected to show "Latest from Insightroom"
                finalSemesterSelect.value = "";
            }

            finalSemesterSelect.addEventListener('change', function () {
                clearSelect('subjectSelect', 'Select Subject');
                clearSelect('categorySelect', 'Select Category');
                clearSelect('topicSelect', 'Select Topic');
                const semKey = this.value;
                if (!semKey) return;
                const subjects = data[semKey];
                const subjectSelect = document.getElementById('subjectSelect');
                for (let subject in subjects) {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                }
                subjectSelect.disabled = false;
            });

            function clearSelect(selectId, placeholderText) {
                const select = document.getElementById(selectId);
                select.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                option.textContent = placeholderText;
                select.appendChild(option);
                select.disabled = true;
            }

            // Trigger change event after everything is set up
            if (finalSemesterSelect.value) {
                finalSemesterSelect.dispatchEvent(new Event('change'));
            }

            return data;
        })
        .catch(err => {
            throw err;
        });
}

// Initial load
loadResourcesData();

const libUrl = window.MaterioLocalCDN?.transformUrl('https://cdn-materioa.vercel.app/databases/beta/resource.lib.json') || 'https://cdn-materioa.vercel.app/databases/beta/resource.lib.json';
fetch(libUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format received');
        }
        const semesterMapping = {
            "9": "Additional Resources"
        };

        const semesterSelect = document.getElementById('semesterSelect');
        semesterSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select Semester';
        semesterSelect.appendChild(placeholder);

        for (let sem in data) {
            const option = document.createElement('option');
            option.value = sem;
            option.textContent = (semesterMapping[sem]) ? semesterMapping[sem] : "Semester " + sem;
            semesterSelect.appendChild(option);
        }

        semesterSelect.value = "";
        if (semesterSelect.value) {
            semesterSelect.dispatchEvent(new Event('change'));
        }

        semesterSelect.addEventListener('change', function () {
            clearSelect('subjectSelect', 'Select Subject');
            clearSelect('categorySelect', 'Select Category');
            clearSelect('topicSelect', 'Select Topic');
            const semKey = this.value;
            if (!semKey) return;
            const subjects = data[semKey];
            const subjectSelect = document.getElementById('subjectSelect');
            for (let subject in subjects) {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
            }
            subjectSelect.disabled = false;
        }); function clearSelect(selectId, placeholderText) {
            const select = document.getElementById(selectId);
            select.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = placeholderText;
            select.appendChild(option);
            select.disabled = true;
        }
    })
    .catch(err => {
        // Error loading initial resource data
        // Only show alert when online (offline is expected to fail)
        if (navigator.onLine) {
            const roasts = [
                { message: "The page is missing a few ingredients. Bro cooked without onions AND salt. Refresh before the dish reports YOU.", button: "Chef moment" },
                { message: "Resources didn’t load. The page said ‘nah I’m on break.’ Try again before it unionizes.", button: "I'll negotiate" },
                { message: "The page tried to fetch files but the internet said ‘skill issue.’ Refresh and pray.", button: "True…" },
                { message: "Some ingredients refused to spawn. RNG is trash today. Reload for better loot.", button: "Reroll" },
                { message: "The page lagged out mid-load like it’s running on hostel WiFi. Refresh to revive.", button: "Revive pls" },
                { message: "Something didn’t load. The resources are probably hiding in creative mode.", button: "Teleport them" },
                { message: "Page assets dipped without notice. They said ‘brb’ and never came back.", button: "Ghosted 💔" },
                { message: "Resources missing. Bro tried to cook Maggi without Maggi.", button: "Valid" },
                { message: "The page ingredients clipped through the map. Reload to respawn them.", button: "Respawn" },
                { message: "Resources refused to load because the syllabus stress aura is too strong.", button: "My bad aura" },
                { message: "The page couldn’t load stuff. Probably buffering its life choices.", button: "Same tbh" },
                { message: "Missing ingredients? This page is rawer than a cooking show disaster.", button: "Gordon who?" },
                { message: "The page tried to load but tripped over its own assets. Reload to help it up.", button: "I'll help" },
                { message: "Some resources froze like a Windows XP moment. Refresh before it plays the startup sound.", button: "Reboot" },
                { message: "The page is missing files because the network rage-quit mid-load.", button: "Unrage pls" },
                { message: "Resources didn’t load. They’re probably respawning in another timeline.", button: "Multiverse moment" },
                { message: "The page pulled a Thanos snap and half the assets vanished.", button: "Bring them back" },
                { message: "Something didn’t load. The internet looked at your request and said ‘nah.’", button: "Understandable" },
                { message: "Ingredients missing. The page is cooking vibes only, no content.", button: "Vibes accepted" },
                { message: "The page tried to load resources but forgot its own ingredients list. Reload to remind it.", button: "I'll remind it" }
            ];
            const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

            materioAlert(randomRoast.message, {
                title: 'Resource Load Error',
                type: 'error',
                buttonText: randomRoast.button
            });
        }
    });

// Load licenses content
document.addEventListener('DOMContentLoaded', function () {
    // Load licenses text when the details element is opened
    const licensesCard = document.getElementById('licensesCard');
    if (licensesCard) {
        const details = licensesCard.querySelector('details');
        let licensesLoaded = false;

        details.addEventListener('toggle', function () {
            if (this.open && !licensesLoaded) {
                const licensesText = document.getElementById('licensesText');
                licensesText.textContent = 'Loading licenses...';

                fetch('/licenses.txt')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to load licenses');
                        }
                        return response.text();
                    })
                    .then(text => {
                        licensesText.textContent = text;
                        licensesLoaded = true;
                    })
                    .catch(error => {
                        licensesText.textContent = 'Error loading licenses. Please try again later.';
                    });
            }
        });
    }
});                // Tab switcher functionality
document.addEventListener('DOMContentLoaded', function () {
    const tabSwitcherCard = document.getElementById('tabSwitcherCard');
    if (tabSwitcherCard) {
        const tabTexts = tabSwitcherCard.querySelectorAll('.tab-text');
        const activeIndicator = document.getElementById('activeTabIndicator');
        const contentSections = document.querySelectorAll('.tab-content-section');                        // Initialize indicator position
        function updateIndicatorPosition(targetTab) {
            if (activeIndicator) {
                // Pill-shaped positioning - properly centered
                const leftPosition = targetTab === 'preferences' ? '0' : '50%';
                activeIndicator.style.left = leftPosition;
            }
        }

        tabTexts.forEach(tabText => {
            tabText.addEventListener('click', function () {
                const targetTab = this.getAttribute('data-target');

                // Update text states
                tabTexts.forEach(text => text.classList.remove('active'));
                this.classList.add('active');

                // Update indicator position smoothly
                updateIndicatorPosition(targetTab);

                // Hide all content sections
                contentSections.forEach(section => {
                    section.classList.remove('active');
                });

                // Show target content section with slight delay
                const targetContent = document.getElementById(targetTab + '-content');
                if (targetContent) {
                    setTimeout(() => {
                        targetContent.classList.add('active');
                    }, 150);
                }
            });
        });

        // Initialize position on load
        const activeTab = document.querySelector('.tab-text.active');
        if (activeTab) {
            // Wait for layout to be ready
            requestAnimationFrame(() => {
                updateIndicatorPosition(activeTab.getAttribute('data-target'));
            });
        }

        // Update position on window resize
        window.addEventListener('resize', () => {
            const activeTab = document.querySelector('.tab-text.active');
            if (activeTab) {
                requestAnimationFrame(() => {
                    updateIndicatorPosition(activeTab.getAttribute('data-target'));
                });
            }
        });
    }
});

// Handle info icon click/tap to show tooltip
document.addEventListener('DOMContentLoaded', function () {
    const infoIcons = document.querySelectorAll('.info-icon');

    function adjustTooltipPosition(icon) {
        const tooltip = icon.querySelector('.tooltip');
        if (!tooltip || window.innerWidth > 768) return;

        // Reset classes
        tooltip.classList.remove('flip-left');

        // Check if tooltip would go off-screen to the right
        const iconRect = icon.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        if (iconRect.left + 200 > viewportWidth - 20) {
            tooltip.classList.add('flip-left');
        }
    }

    infoIcons.forEach(icon => {
        // Handle both click and touch events
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Toggle active class for this icon
            this.classList.toggle('active');

            // Close other open tooltips
            infoIcons.forEach(otherIcon => {
                if (otherIcon !== this) {
                    otherIcon.classList.remove('active');
                }
            });

            // Adjust positioning if needed (mobile)
            if (this.classList.contains('active')) {
                setTimeout(() => adjustTooltipPosition(this), 10);
            }
        });

        // Handle touch events for better mobile experience
        icon.addEventListener('touchstart', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // Close tooltip when clicking/touching outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.info-icon')) {
            infoIcons.forEach(icon => {
                icon.classList.remove('active');
            });
        }
    });

    // Close tooltip on touch outside for mobile
    document.addEventListener('touchstart', function (e) {
        if (!e.target.closest('.info-icon')) {
            infoIcons.forEach(icon => {
                icon.classList.remove('active');
            });
        }
    });

    // Close tooltip when scrolling on mobile - use passive listener
    document.addEventListener('scroll', function () {
        if (window.innerWidth <= 768) {
            infoIcons.forEach(icon => {
                icon.classList.remove('active');
            });
        }
    }, { passive: true });

    // Reposition tooltips on window resize
    window.addEventListener('resize', function () {
        infoIcons.forEach(icon => {
            if (icon.classList.contains('active')) {
                adjustTooltipPosition(icon);
            }
        });
    });
});

// ================================================
// INSIGHTROOM API - LOAD POSTS FROM API
// ================================================

const INSIGHTROOM_API = 'https://insightroom.vercel.app/api/posts';

// Function to load posts from InsightRoom API
async function loadInsightroomPosts() {
    const defaultPostsContainer = document.getElementById('defaultPosts');
    const loadingEl = document.getElementById('postsLoading');
    const errorEl = document.getElementById('postsError');
    const allPostsDataEl = document.getElementById('allPostsData');

    if (!defaultPostsContainer || !allPostsDataEl) return;

    try {
        const response = await fetch(INSIGHTROOM_API);
        if (!response.ok) throw new Error('Failed to fetch posts');

        const allPosts = await response.json();

        // Filter out private posts and get latest 5
        const publicPosts = allPosts.filter(post => post.visibility !== 'private');
        const latestPosts = publicPosts.slice(0, 5);

        // Hide loading
        if (loadingEl) loadingEl.style.display = 'none';

        // Render posts as horizontal scrolling squircle cards
        latestPosts.forEach((post, index) => {
            const postDate = new Date(post.date);
            const formattedDate = postDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '-');

            const excerpt = post.excerpt || '';
            const truncatedExcerpt = excerpt.split(' ').slice(0, 12).join(' ') + (excerpt.split(' ').length > 12 ? '...' : '');

            // Use imgUrl from API or fallback to noidea.png
            let imageUrl = post.imgUrl || '';
            if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined' || imageUrl.trim() === '') {
                imageUrl = '/assets/img/noidea.png';
            }

            const postHTML = `
                <a href="${post.link}" class="insight-card-link" target="_blank" ${post.visibility === 'private' ? 'data-visibility="private"' : ''}>
                    <article class="insight-card" id="blogPost${index + 1}" style="--card-bg: url('${imageUrl}')">
                        <div class="insight-card-bg"></div>
                        <div class="insight-card-gradient"></div>
                        <div class="insight-card-content">
                            <h3 class="insight-card-title">${post.title}</h3>
                            <p class="insight-card-excerpt">${truncatedExcerpt} <span class="insight-card-read-more">Read</span></p>
                            <span class="insight-card-date">${formattedDate}</span>
                        </div>
                    </article>
                </a>
            `;
            defaultPostsContainer.insertAdjacentHTML('beforeend', postHTML);
        });

        // Populate allPostsData for filtering/recommendations
        const postsData = publicPosts.map(post => ({
            title: post.title,
            url: post.link,
            date: new Date(post.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '-'),
            imgUrl: post.imgUrl || '',
            excerpt_home: post.excerpt || '',
            excerpt: post.excerpt || '',
            semester: post.semester || '',
            subject: post.subject || '',
            visibility: post.visibility || 'public'
        }));
        allPostsDataEl.textContent = JSON.stringify(postsData);

        // Apply dark mode to dynamically created posts if dark mode is active
        const isDarkMode = document.body.classList.contains('dark-mode') ||
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDarkMode) {
            latestPosts.forEach((post, index) => {
                const postElement = document.getElementById(`blogPost${index + 1}`);
                if (postElement) {
                    postElement.classList.add('dark-mode');
                }
            });
        }

        // Dispatch event to notify that posts are loaded
        window.dispatchEvent(new CustomEvent('insightroomPostsLoaded', { detail: postsData }));

    } catch (error) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
    }
}

// Load InsightRoom posts on DOM ready
document.addEventListener('DOMContentLoaded', loadInsightroomPosts);

// ================================================
// SMART RECOMMENDATION SYSTEM
// ================================================

// CDN URL for attachments database
const ATTACHMENTS_CDN_URL = 'https://static-materio.vercel.app/attachments.json';
const ATTACHMENTS_BASE_URL = 'https://static-materio.vercel.app/';

// Cache for attachments data
let allAttachments = [];
let attachmentsLoaded = false;

// Function to load attachments from CDN
async function loadAttachmentsData() {
    if (attachmentsLoaded) return allAttachments;

    try {
        const response = await fetch(ATTACHMENTS_CDN_URL);
        if (!response.ok) throw new Error('Failed to fetch attachments');
        allAttachments = await response.json();
        attachmentsLoaded = true;
        return allAttachments;
    } catch (error) {
        return [];
    }
}

// Function to get icon for file type
function getFileTypeIcon(extension) {
    const iconMap = {
        // Programming languages
        'java': 'fa-brands fa-java',
        'py': 'fa-brands fa-python',
        'js': 'fa-brands fa-js',
        'html': 'fa-brands fa-html5',
        'css': 'fa-brands fa-css3-alt',
        'c': 'fa-solid fa-c',
        'cpp': 'fa-solid fa-c',
        'h': 'fa-solid fa-c',
        'kt': 'fa-solid fa-k',
        'ts': 'fa-brands fa-js',

        // Documents
        'txt': 'fa-solid fa-file-lines',
        'md': 'fa-brands fa-markdown',
        'docx': 'fa-solid fa-file-word',
        'doc': 'fa-solid fa-file-word',
        'pptx': 'fa-solid fa-file-powerpoint',
        'ppt': 'fa-solid fa-file-powerpoint',
        'xlsx': 'fa-solid fa-file-excel',
        'xls': 'fa-solid fa-file-excel',
        'pdf': 'fa-solid fa-file-pdf',

        // Data formats
        'json': 'fa-solid fa-brackets-curly',
        'xml': 'fa-solid fa-code',
        'sql': 'fa-solid fa-database',
        'ipynb': 'fa-solid fa-notebook',

        // Default
        'default': 'fa-solid fa-file-code'
    };

    return iconMap[extension.toLowerCase()] || iconMap['default'];
}

// Smart Recommendation System
document.addEventListener('DOMContentLoaded', function () {
    const semesterSelect = document.getElementById('semesterSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const categorySelect = document.getElementById('categorySelect');
    const topicSelect = document.getElementById('topicSelect');
    const blogCardHeading = document.getElementById('blogCardHeading');
    const defaultPosts = document.getElementById('defaultPosts');
    const recommendedPosts = document.getElementById('recommendedPosts');
    const noPostsMessage = document.getElementById('noPostsMessage');
    const allPostsDataElement = document.getElementById('allPostsData');
    const attachmentsCard = document.getElementById('attachmentsCard');
    const attachmentsPillsContainer = document.getElementById('attachmentsPillsContainer');
    const attachmentsEmpty = document.getElementById('attachmentsEmpty');

    // FORCE RESET: Ensure we start with "Latest from Insightroom" on every load
    // The user requested that it should be "latest... initially".
    const readingForm = document.getElementById('readingSelectionForm');
    if (readingForm) {
        readingForm.reset();
        // Also manually reset selects to be sure (browser might persist values)
        if (semesterSelect) semesterSelect.value = "";
        if (subjectSelect) subjectSelect.value = "";
        if (categorySelect) categorySelect.value = "";
        if (topicSelect) topicSelect.value = "";
    }

    // IMMEDIATE CHECK: Now this will likely be false, but kept for robustness
    const initialSem = semesterSelect?.value;
    const initialSub = subjectSelect?.value;
    if ((initialSem && initialSem.trim() !== "") || (initialSub && initialSub.trim() !== "")) {
        if (blogCardHeading) blogCardHeading.innerHTML = 'Smart Recommendations';
        if (defaultPosts) defaultPosts.style.setProperty('display', 'none', 'important');
    }

    // Parse all posts data - will be populated by loadInsightroomPosts
    let allPosts = [];

    // Function to parse posts data
    function parsePostsData() {
        try {
            allPosts = JSON.parse(allPostsDataElement.textContent);
        } catch (e) {
            // Error parsing posts data
        }
    }

    // Initial parse (may be empty if API hasn't loaded yet)
    parsePostsData();

    // Re-parse when InsightRoom posts are loaded
    window.addEventListener('insightroomPostsLoaded', function (e) {
        parsePostsData();
        // Trigger update in case selections are already made
        updateSmartRecommendations();
    });

    // Load attachments data proactively
    loadAttachmentsData();

    // Check authentication and hide private posts if not authenticated
    checkAuthAndFilterPosts();

    // Function to check authentication and hide private posts
    async function checkAuthAndFilterPosts() {
        const token = localStorage.getItem('materio_auth_token');
        let hasAdminPrivileges = false;
        let isProUser = false;
        let isLiteUser = false;

        // Hide entire blogs card if user is not logged in
        const blogsCard = document.getElementById('blogs');
        if (!token) {
            if (blogsCard) {
                blogsCard.style.display = 'none';
            }
            return;
        }

        if (token) {
            try {
                const response = await fetch('/api/v2/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin'
                });

                if (response.ok) {
                    const userData = await response.json();
                    hasAdminPrivileges = userData.user?.hasAdminPrivileges || false;
                    isProUser = userData.user?.isPlusUser || false;
                    isLiteUser = userData.user?.isLiteUser || false;

                } else {
                    if (blogsCard) {
                        blogsCard.style.display = 'none';
                    }
                    return;
                }
            } catch (error) {
                if (blogsCard) {
                    blogsCard.style.display = 'none';
                }
                return;
            }
        }

        // Show blogs card only if user is pro user OR admin AND InsightRoom toggle is enabled
        if (blogsCard) {
            if (isProUser || hasAdminPrivileges) {
                // Check if InsightRoom is enabled from saved cookie (read directly to avoid scope issues)
                let isInsightroomEnabled = true; // default
                const settingsCookie = getCookie('insightroomSettings');
                if (settingsCookie) {
                    try {
                        // Handle both encoded and non-encoded cookie values
                        let decoded = settingsCookie;
                        try {
                            decoded = decodeURIComponent(settingsCookie);
                        } catch (e) {
                            // Already decoded or not encoded
                        }
                        const settings = JSON.parse(decoded);
                        if (Array.isArray(settings) && settings.length === 2) {
                            isInsightroomEnabled = settings[0];
                        }
                    } catch (e) {
                        // ignore parse errors, use default
                    }
                }
                blogsCard.style.display = isInsightroomEnabled ? 'block' : 'none';
            } else {
                blogsCard.style.display = 'none';
                return;
            }
        }

        // Hide private posts in default listing if no admin privileges or pro membership
        if (!hasAdminPrivileges && !isProUser) {
            const privatePosts = document.querySelectorAll('#defaultPosts [data-visibility="private"]');
            privatePosts.forEach(post => {
                post.style.display = 'none';
            });
        }

        // Store private access status for filtering recommendations  
        window.materioUserHasPrivateAccess = hasAdminPrivileges || isProUser;
        window.materioUserHasAdminPrivileges = hasAdminPrivileges;

        // Apply appropriate logo based on user privileges
        const versionInfo = document.getElementById('versionInfo');
        if (versionInfo) {
            // Remove any existing privilege classes
            versionInfo.classList.remove('premium-user', 'plus-user', 'admin-user', 'pro-user');

            // Apply the appropriate class based on privileges
            if (hasAdminPrivileges) {
                versionInfo.classList.add('admin-user');
            } else if (isProUser) {
                versionInfo.classList.add('pro-user');
            } else if (isLiteUser) {
                versionInfo.classList.add('plus-user'); // Plus (Lite) users get the plu.svg
            }

            // Force a repaint/style update to ensure the change is visible immediately
            // This can sometimes help with SVG background images not updating
            const display = versionInfo.style.display;
            versionInfo.style.display = 'none';
            versionInfo.offsetHeight; // trigger reflow
            versionInfo.style.display = display;
        }
    }

    // Function to create post HTML
    function createPostHTML(post, index) {
        const fullExcerpt = post.excerpt_home || post.excerpt || '';
        const truncatedExcerpt = fullExcerpt.split(' ').slice(0, 12).join(' ') + (fullExcerpt.split(' ').length > 12 ? '...' : '');
        const visibilityAttr = post.visibility === 'private' ? 'data-visibility="private"' : '';

        // Use imgUrl from API or fallback to noidea.png
        let imageUrl = post.imgUrl || '';
        if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined' || imageUrl.trim() === '') {
            imageUrl = '/assets/img/noidea.png';
        }

        return `
            <a href="${post.url}" class="insight-card-link" target="_blank" ${visibilityAttr}>
                <article class="insight-card" id="recommendedPost${index}" style="--card-bg: url('${imageUrl}')">
                    <div class="insight-card-bg"></div>
                    <div class="insight-card-gradient"></div>
                    <div class="insight-card-content">
                        <h3 class="insight-card-title">${post.title}</h3>
                        <p class="insight-card-excerpt">${truncatedExcerpt} <span class="insight-card-read-more">Read</span></p>
                        <span class="insight-card-date">${post.date}</span>
                    </div>
                </article>
            </a>
        `;
    }

    // Function to create attachment pill HTML
    function createAttachmentPillHTML(attachment) {
        const extension = attachment.type || attachment.path?.split('.').pop() || 'file';
        const displayName = attachment.name || attachment.path?.split('/').pop() || 'Unknown';
        const iconClass = getFileTypeIcon(extension);
        const fileUrl = `https://static-materio.vercel.app/${attachment.path}`;

        return `
            <a href="${fileUrl}" 
               class="attachment-pill" 
               data-type="${extension.toLowerCase()}"
               target="_blank"
               title="${displayName}"
               rel="noopener noreferrer">
                <i class="${iconClass} attachment-pill-icon"></i>
                <span class="attachment-pill-name">${displayName}</span>
            </a>
        `;
    }

    // Function to filter attachments based on current selection
    function filterAttachments(attachments, semester, subject, category, topic) {
        if (!attachments || attachments.length === 0) return [];

        return attachments.filter(att => {
            // Normalize all values for comparison
            const normalize = (val) => val ? String(val).toLowerCase().trim() : '';

            const attSemester = normalize(att.semester);
            const attSubject = normalize(att.subject);
            const attCategory = normalize(att.category);
            const attTopic = normalize(att.topic);

            const selSemester = normalize(semester);
            const selSubject = normalize(subject);
            const selCategory = normalize(category);
            const selTopic = normalize(topic);

            // Match logic: attachment matches if it matches ANY of the selected criteria
            // Priority: topic > category > subject > semester
            // If more specific selection is made, use that; otherwise fall back to broader match

            // If topic is selected, match on topic (most specific)
            if (selTopic && attTopic === selTopic) return true;

            // If category is selected, match on category
            if (selCategory && attCategory === selCategory) return true;

            // If subject is selected, match on subject
            if (selSubject && attSubject === selSubject) return true;

            // If only semester selected, match on semester
            if (selSemester && attSemester === selSemester) return true;

            return false;
        });
    }

    // Function to update attachments card
    async function updateAttachmentsCard() {
        if (!attachmentsCard || !attachmentsPillsContainer) return;

        const selectedSemester = semesterSelect?.value || '';
        const selectedSubject = subjectSelect?.value || '';
        const selectedCategory = categorySelect?.value || '';
        const selectedTopic = topicSelect?.value || '';

        // Only show if at least semester or subject is selected
        if (!selectedSemester && !selectedSubject) {
            attachmentsCard.style.display = 'none';
            return;
        }

        // Load attachments if not already loaded
        const attachments = await loadAttachmentsData();

        // Filter attachments based on current selection
        const filteredAttachments = filterAttachments(
            attachments,
            selectedSemester,
            selectedSubject,
            selectedCategory,
            selectedTopic
        );

        if (filteredAttachments.length > 0) {
            attachmentsCard.style.display = 'flex';
            attachmentsPillsContainer.style.display = 'flex';
            if (attachmentsEmpty) attachmentsEmpty.style.display = 'none';

            // Render pills
            attachmentsPillsContainer.innerHTML = filteredAttachments
                .slice(0, 15) // Limit to 15 attachments to prevent overflow
                .map(att => createAttachmentPillHTML(att))
                .join('');
        } else {
            // Hide card entirely if no attachments found
            attachmentsCard.style.display = 'none';
        }
    }

    // Main function to update smart recommendations (posts + attachments)
    async function updateSmartRecommendations() {
        const selectedSemester = semesterSelect?.value || '';
        const selectedSubject = subjectSelect?.value || '';
        const selectedCategory = categorySelect?.value || '';
        const selectedTopic = topicSelect?.value || '';

        // Check if any selection is made
        const hasSelection = (selectedSemester && selectedSemester.trim() !== "") ||
            (selectedSubject && selectedSubject.trim() !== "");

        // If no semester or subject selected, show default posts
        if (!hasSelection) {
            if (blogCardHeading) {
                blogCardHeading.innerHTML = 'Latest from the Insightroom';
            }
            if (defaultPosts) defaultPosts.style.removeProperty('display');
            if (recommendedPosts) recommendedPosts.style.setProperty('display', 'none', 'important');
            if (noPostsMessage) noPostsMessage.style.display = 'none';
            if (attachmentsCard) attachmentsCard.style.display = 'none';
            return;
        }

        // Filter posts based on semester and subject
        const filteredPosts = allPosts.filter(post => {
            const selectedSem = String(selectedSemester).toLowerCase().trim();
            const selectedSub = String(selectedSubject).toLowerCase().trim();

            // Filter out private posts if user doesn't have admin privileges or plus access
            if (post.visibility === 'private' && !window.materioUserHasPrivateAccess) {
                return false;
            }

            // Handle semester matching (can be string or array)
            let semesterMatch = false;
            if (selectedSem) {
                if (Array.isArray(post.semester)) {
                    semesterMatch = post.semester.some(sem => String(sem).toLowerCase().trim() === selectedSem);
                } else if (post.semester) {
                    semesterMatch = String(post.semester).toLowerCase().trim() === selectedSem;
                }
            }

            // Handle subject matching (can be string or array)
            let subjectMatch = false;
            if (selectedSub) {
                if (Array.isArray(post.subject)) {
                    subjectMatch = post.subject.some(sub => String(sub).toLowerCase().trim() === selectedSub);
                } else if (post.subject) {
                    subjectMatch = String(post.subject).toLowerCase().trim() === selectedSub;
                }
            }

            // Match if either both match, or if only one is selected and it matches
            if (selectedSem && selectedSub) {
                return semesterMatch && subjectMatch;
            } else if (selectedSem) {
                return semesterMatch;
            } else if (selectedSub) {
                return subjectMatch;
            }
            return false;
        });

        // Update attachments card
        await updateAttachmentsCard();

        // Get reference to attachments card to preserve it
        const attachmentsCardHTML = attachmentsCard ? attachmentsCard.outerHTML : '';

        if (filteredPosts.length > 0 || (attachmentsCard && attachmentsCard.style.display !== 'none')) {
            if (blogCardHeading) blogCardHeading.innerHTML = 'Smart Recommendations';

            // Hide default posts
            if (defaultPosts) {
                defaultPosts.style.setProperty('display', 'none', 'important');
            }
            if (noPostsMessage) noPostsMessage.style.display = 'none';

            // Show recommended posts with flex layout
            if (recommendedPosts) {
                recommendedPosts.style.removeProperty('display');
                if (getComputedStyle(recommendedPosts).display === 'none') {
                    recommendedPosts.style.display = 'flex';
                }

                // Limit to 5 posts and create HTML
                const postsToShow = filteredPosts.slice(0, 5);
                const postsHTML = postsToShow
                    .map((post, index) => createPostHTML(post, index + 1))
                    .join('');

                // NON-DESTRUCTIVE UPDATE:
                // 1. Remove existing post links (but keep Attachments Card and Exam Card)
                const existingPostLinks = recommendedPosts.querySelectorAll('.insight-card-link');
                existingPostLinks.forEach(el => el.remove());

                // 2. Insert new posts after attachments card (at the end of container)
                recommendedPosts.insertAdjacentHTML('beforeend', postsHTML);

                // Apply current theme to newly created recommended posts
                const isDarkMode = document.body.classList.contains('dark-mode');
                postsToShow.forEach((post, index) => {
                    const postElement = document.getElementById(`recommendedPost${index + 1}`);
                    if (postElement) {
                        if (isDarkMode) {
                            postElement.classList.add('dark-mode');
                        } else {
                            postElement.classList.remove('dark-mode');
                        }
                    }
                });
            }

            // Trigger exam card display logic for Smart Recommendations view
            if (window.loadAndDisplayExamCard) {
                window.loadAndDisplayExamCard();
            }
        } else {
            // No posts found for selected criteria - but show attachments if available
            if (blogCardHeading) blogCardHeading.innerHTML = 'Smart Recommendations';

            // Hide default posts
            if (defaultPosts) {
                defaultPosts.style.setProperty('display', 'none', 'important');
            }

            if (attachmentsCard && attachmentsCard.style.display !== 'none') {
                // Show only attachments card
                if (recommendedPosts) {
                    recommendedPosts.style.removeProperty('display');
                    if (getComputedStyle(recommendedPosts).display === 'none') {
                        recommendedPosts.style.display = 'flex';
                    }
                    // Clear posts
                    const existingPostLinks = recommendedPosts.querySelectorAll('.insight-card-link');
                    existingPostLinks.forEach(el => el.remove());
                }
                if (noPostsMessage) noPostsMessage.style.display = 'none';
            } else {
                // No posts and no attachments - but exam card might still need to show
                // Keep recommendedPosts visible so exam card can render inside it.
                // The async loadAndDisplayExamCard / displayExamCard in exam-card.js
                // will ensure #recommendedPosts stays visible if the exam card is needed.
                if (recommendedPosts) {
                    recommendedPosts.style.removeProperty('display');
                    if (getComputedStyle(recommendedPosts).display === 'none') {
                        recommendedPosts.style.display = 'flex';
                    }
                    // Clear any leftover post links
                    const existingPostLinks = recommendedPosts.querySelectorAll('.insight-card-link');
                    existingPostLinks.forEach(el => el.remove());
                }
                // Hide "no posts" message initially (exam card may still appear)
                if (noPostsMessage) noPostsMessage.style.display = 'none';
            }

            // Trigger exam card display logic for Smart Recommendations view
            if (window.loadAndDisplayExamCard) {
                window.loadAndDisplayExamCard();
            }
        }
    }

    // Add event listeners to all dropdowns for consistent triggering
    if (semesterSelect) {
        semesterSelect.addEventListener('change', updateSmartRecommendations);
    }
    if (subjectSelect) {
        subjectSelect.addEventListener('change', updateSmartRecommendations);
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', updateSmartRecommendations);
    }
    if (topicSelect) {
        topicSelect.addEventListener('change', updateSmartRecommendations);
    }

    // Expose function globally for external triggers
    window.updateSmartRecommendations = updateSmartRecommendations;
});

// ================================================
// AD-FREE EXPERIENCE FOR PLUS & ADMIN USERS
// ================================================

// Function to check if user has ad-free privileges
function checkAndApplyAdFreeExperience() {
    try {
        // Get user data from localStorage
        const userDataStr = localStorage.getItem('materio_user');
        if (!userDataStr) {
            // No user data, remove ad-free class if it exists
            document.body.classList.remove('ad-free-user');
            return false;
        }

        const userData = JSON.parse(userDataStr);

        // Check if user has plus or admin privileges
        const hasAdFreePrivileges = userData.isPlusUser === true || userData.hasAdminPrivileges === true;

        if (hasAdFreePrivileges) {
            // Apply ad-free experience
            document.body.classList.add('ad-free-user');

            // Hide any dynamically loaded ads
            hideExistingAds();

            return true;
        } else {
            // Remove ad-free class if user doesn't have privileges
            document.body.classList.remove('ad-free-user');
            return false;
        }
    } catch (error) {
        // On error, don't apply ad-free experience (safe default)
        document.body.classList.remove('ad-free-user');
        return false;
    }
}

// Function to hide any existing ads that might have loaded
function hideExistingAds() {
    // Hide AdSense ads
    const adsenseElements = document.querySelectorAll('.adsbygoogle, ins[class*="adsbygoogle"]');
    adsenseElements.forEach(ad => {
        ad.style.display = 'none';
        ad.style.visibility = 'hidden';
    });

    // Hide common ad containers
    const adContainers = document.querySelectorAll(
        '.ad-container, .advertisement, .ad-banner, .google-ads, [id*="google_ads"], [class*="google-ad"]'
    );
    adContainers.forEach(container => {
        container.style.display = 'none';
    });
}

// Check for ad-free experience on page load
document.addEventListener('DOMContentLoaded', function () {
    checkAndApplyAdFreeExperience();
});

// Re-check when user data changes (e.g., after login/logout)
window.addEventListener('storage', function (e) {
    if (e.key === 'materio_user') {
        checkAndApplyAdFreeExperience();
    }
});
// Expose the function globally so other scripts can call it
window.checkAndApplyAdFreeExperience = checkAndApplyAdFreeExperience;

// ================================================
// INSIGHTROOM SECTION TOGGLE FUNCTIONALITY
// ================================================

// Function to get Insightroom settings from cookie (returns [enabled, view])
function getInsightroomSettings() {
    const settingsCookie = getCookie('insightroomSettings');
    if (settingsCookie) {
        try {
            // Try to decode URI component (for newly saved cookies)
            let decoded = settingsCookie;
            try {
                decoded = decodeURIComponent(settingsCookie);
            } catch (e) {
                // Already decoded or not encoded, use as-is
            }
            const settings = JSON.parse(decoded);
            if (Array.isArray(settings) && settings.length === 2) {
                return settings;
            }
        } catch (e) {
            // Error parsing insightroomSettings cookie
        }
    }
    // Default: [enabled=true, view='normal']
    return [true, 'normal'];
}

// Function to save Insightroom settings to cookie
function saveInsightroomSettings(enabled, view) {
    const settings = [enabled, view];
    // Use encodeURIComponent to properly escape JSON special characters
    setCookie('insightroomSettings', encodeURIComponent(JSON.stringify(settings)), 365);
}

// Function to handle Insightroom section visibility and view mode
function handleInsightroomToggle() {
    const insightroomToggle = document.getElementById('insightroomToggle');
    const blogsSection = document.getElementById('blogs');
    const viewOptions = document.getElementById('insightroomViewOptions');
    const dropdownWrapper = document.getElementById('viewStyleDropdownWrapper');
    const dropdownTrigger = document.getElementById('viewStyleDropdownTrigger');
    const dropdown = document.getElementById('viewStyleDropdown');
    const selectedText = document.getElementById('viewStyleSelectedText');
    const dropdownItems = document.querySelectorAll('.view-style-item');

    if (!insightroomToggle || !blogsSection) {
        return;
    }

    // Load saved preferences
    const [isEnabled, viewMode] = getInsightroomSettings();

    // Set toggle state
    insightroomToggle.checked = isEnabled;

    // Set dropdown selected state
    if (selectedText) {
        selectedText.textContent = viewMode === 'folded' ? 'Folded' : 'Normal';
    }

    // Mark the selected item
    dropdownItems.forEach(item => {
        if (item.dataset.value === viewMode) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // Show/hide view options based on toggle state
    if (viewOptions) {
        viewOptions.style.display = isEnabled ? 'block' : 'none';
    }

    // Apply initial state
    applyInsightroomViewMode(isEnabled, viewMode);

    // Add event listener for toggle changes
    insightroomToggle.addEventListener('change', function () {
        // Haptic feedback
        if (window.MaterioHaptics) {
            window.MaterioHaptics.vibrate(this.checked ? 'toggleOn' : 'toggleOff');
        }

        const enabled = this.checked;
        // Read the view mode from saved settings to preserve it, not from DOM which could be stale
        const [, savedViewMode] = getInsightroomSettings();
        const currentView = savedViewMode || 'normal';

        // Show/hide view options
        if (viewOptions) {
            viewOptions.style.display = enabled ? 'block' : 'none';
        }

        applyInsightroomViewMode(enabled, currentView);
        saveInsightroomSettings(enabled, currentView);
    });

    // Dropdown toggle
    if (dropdownTrigger && dropdownWrapper) {
        dropdownTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            const isOpen = dropdownWrapper.classList.contains('open');
            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate(isOpen ? 'dropdownClose' : 'dropdownOpen');
            }
            dropdownWrapper.classList.toggle('open');
            dropdown.classList.toggle('show');
        });
    }

    // Dropdown item selection
    dropdownItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            // Haptic feedback
            if (window.MaterioHaptics) {
                window.MaterioHaptics.vibrate('select');
            }

            const value = this.dataset.value;
            const label = value === 'folded' ? 'Folded' : 'Normal';

            // Update selected text
            if (selectedText) {
                selectedText.textContent = label;
            }

            // Update selected state
            dropdownItems.forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');

            // Close dropdown
            dropdownWrapper.classList.remove('open');
            dropdown.classList.remove('show');

            // Apply and save
            const enabled = insightroomToggle.checked;
            applyInsightroomViewMode(enabled, value);
            saveInsightroomSettings(enabled, value);
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (dropdownWrapper && !dropdownWrapper.contains(e.target)) {
            dropdownWrapper.classList.remove('open');
            if (dropdown) dropdown.classList.remove('show');
        }
    });
}

// Function to apply the Insightroom view mode
function applyInsightroomViewMode(enabled, viewMode) {
    const blogsSection = document.getElementById('blogs');
    const headerContainer = document.getElementById('blogHeaderContainer');
    const postsContainer = document.getElementById('blogPostsContent');
    const chevron = document.getElementById('blogFoldChevron');

    if (!blogsSection) return;

    if (!enabled) {
        // Section is disabled - hide everything
        blogsSection.style.display = 'none';
        return;
    }

    // Section is enabled
    blogsSection.style.display = 'block';

    if (viewMode === 'folded') {
        // Folded mode: show chevron, make header clickable, hide posts by default
        blogsSection.classList.add('blog-folded');
        if (chevron) {
            chevron.style.display = 'inline-block';
            chevron.style.transform = 'rotate(0deg)';
        }
        if (headerContainer) {
            headerContainer.style.cursor = 'pointer';
        }
        if (postsContainer) {
            postsContainer.style.display = 'none';
        }
        // Reset expanded state
        blogsSection.classList.remove('blog-expanded');
    } else {
        // Normal mode: hide chevron, show posts, header not clickable
        blogsSection.classList.remove('blog-folded');
        blogsSection.classList.remove('blog-expanded');
        if (chevron) {
            chevron.style.display = 'none';
        }
        if (headerContainer) {
            headerContainer.style.cursor = 'default';
        }
        if (postsContainer) {
            postsContainer.style.display = 'block';
        }
    }
}

// Function to toggle folded blog section expand/collapse
function toggleBlogFoldedState() {
    const blogsSection = document.getElementById('blogs');
    const postsContainer = document.getElementById('blogPostsContent');
    const chevron = document.getElementById('blogFoldChevron');

    if (!blogsSection || !postsContainer) return;

    const isExpanded = blogsSection.classList.contains('blog-expanded');

    if (isExpanded) {
        // Collapse - add blog-folded back for compact height
        blogsSection.classList.remove('blog-expanded');
        blogsSection.classList.add('blog-folded');
        postsContainer.style.display = 'none';
        if (chevron) {
            chevron.style.transform = 'rotate(0deg)';
        }
    } else {
        // Expand - remove blog-folded to allow full height
        blogsSection.classList.add('blog-expanded');
        blogsSection.classList.remove('blog-folded');
        postsContainer.style.display = 'block';
        if (chevron) {
            chevron.style.transform = 'rotate(180deg)';
        }
    }
}

// Initialize Insightroom toggle when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initialize immediately - no delay needed, this prevents flash of incorrect state
    handleInsightroomToggle();

    // Add click handler for header in folded mode
    const headerContainer = document.getElementById('blogHeaderContainer');
    if (headerContainer) {
        headerContainer.addEventListener('click', function (e) {
            // Only toggle if in folded mode (chevron is visible)
            const chevron = document.getElementById('blogFoldChevron');
            if (chevron && chevron.style.display !== 'none') {
                // Don't toggle if clicking on the View More link
                if (!e.target.closest('.view-more-btn')) {
                    toggleBlogFoldedState();
                }
            }
        });
    }
});

// Global function to toggle Insightroom feed on/off (used by keyboard shortcuts)
// This properly toggles AND persists the state
window.toggleInsightroomFeed = function () {
    const insightroomToggle = document.getElementById('insightroomToggle');
    if (insightroomToggle) {
        // Toggle the checkbox state
        insightroomToggle.checked = !insightroomToggle.checked;
        // Dispatch change event to trigger the handler
        insightroomToggle.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

// ================================================
// CLEAR SITE DATA FUNCTIONALITY
// ================================================

// Function to clear all site data (cookies, cache, IndexedDB, service workers)
async function clearAllSiteData() {
    // Show confirmation dialog using custom modal
    const confirmed = await materioConfirm(
        'This will clear all site data including:\n\n• Cookies and local storage\n• Cached files\n• Your Downloaded files\n• Service workers\n\nYou will be logged out and all preferences will be reset.',
        {
            title: 'Clear All Data?',
            type: 'danger',
            confirmText: 'Clear All Data',
            cancelText: 'Cancel',
            danger: true
        }
    );

    if (!confirmed) return;

    try {
        // Show loading state
        const card = document.getElementById('clearSiteDataCard');
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }

        document.cookie.split(';').forEach(function (c) {
            const name = c.split('=')[0].trim();
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
        });

        // 2. Clear localStorage
        localStorage.clear();

        // 3. Clear sessionStorage
        sessionStorage.clear();

        // 4. Clear IndexedDB databases
        if (window.indexedDB && indexedDB.databases) {
            const databases = await indexedDB.databases();
            for (const db of databases) {
                if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                }
            }
        }

        // 5. Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // 6. Clear Cache Storage
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
            }
        }

        // Show success message using custom modal
        await materioAlert('All site data has been cleared successfully.\n\nThe page will now reload.', {
            title: 'Data Cleared',
            type: 'success',
            buttonText: 'Reload'
        });

        // Reload the page to apply changes
        window.location.reload(true);

    } catch (error) {
        await materioAlert('An error occurred while clearing site data. Some data may not have been cleared.', {
            title: 'Error',
            type: 'danger',
            buttonText: 'OK'
        });

        // Restore card state
        const card = document.getElementById('clearSiteDataCard');
        if (card) {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        }
    }
}

// Make function globally accessible for onclick handler
window.clearAllSiteData = clearAllSiteData;

// ================================================
// QUICK RESOURCE SEARCH FUNCTIONALITY
// ================================================

let searchTimeout = null;
let currentSearchController = null;
let aiSearchEnabled = false; // Track AI search mode

// Initialize quick search functionality
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('quickSearchInput');
    const searchResults = document.getElementById('quickSearchResults');
    const aiToggleBtn = document.getElementById('aiSearchToggle');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (!searchInput || !searchResults) return;

    // Handle clear button click
    if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            searchInput.value = '';
            this.style.display = 'none';
            searchResults.style.display = 'none';
            searchInput.focus();
        });

        // Check initial state
        if (searchInput.value.trim().length > 0) {
            clearBtn.style.display = 'flex';
        }
    }

    // Handle AI search toggle
    if (aiToggleBtn) {
        aiToggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            aiSearchEnabled = !aiSearchEnabled;

            // Update UI
            if (aiSearchEnabled) {
                this.classList.add('active');
                searchInput.classList.add('ai-mode');
                searchInput.placeholder = 'AI-powered search';
            } else {
                this.classList.remove('active');
                searchInput.classList.remove('ai-mode');
                searchInput.placeholder = 'Quick search';
            }

            // Re-run search if there's a query
            const query = searchInput.value.trim();
            if (query.length > 0) {
                performQuickSearch(query);
            }
        });
    }

    // Handle search input with debounce
    searchInput.addEventListener('input', function () {
        const query = this.value.trim();

        // Show/hide clear button
        if (clearBtn) {
            clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
        }

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Hide results if query is empty
        if (query.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        // Only show search results on home tab
        const homeTab = document.getElementById('home');
        if (!homeTab || !homeTab.classList.contains('active')) {
            return;
        }

        // Debounce search - wait 300ms after user stops typing
        searchTimeout = setTimeout(() => {
            performQuickSearch(query);
        }, 300);
    });

    // Close search results when clicking outside
    document.addEventListener('click', function (e) {
        const aiToggle = document.getElementById('aiSearchToggle');
        if (!searchInput.contains(e.target) &&
            !searchResults.contains(e.target) &&
            !aiToggle?.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Reopen results when clicking on input if there are results
    searchInput.addEventListener('click', function () {
        // Only show on home tab
        const homeTab = document.getElementById('home');
        if (!homeTab || !homeTab.classList.contains('active')) {
            return;
        }

        if (this.value.trim().length > 0 && searchResults.children.length > 0) {
            searchResults.style.display = 'block';
            // Reposition on click
            repositionSearchDropdown();
        }
    });

    // Reposition dropdown on scroll and resize (for position: fixed) - use passive listener
    window.addEventListener('scroll', repositionSearchDropdown, { passive: true });
    window.addEventListener('resize', repositionSearchDropdown, { passive: true });
});

// Reposition search dropdown (needed for position: absolute at body level)
function repositionSearchDropdown() {
    const searchResults = document.getElementById('quickSearchResults');
    const searchInput = document.getElementById('quickSearchInput');

    if (searchResults && searchInput && searchResults.style.display === 'block') {
        const rect = searchInput.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            searchResults.style.top = '425px';
        } else {
            searchResults.style.top = `${rect.bottom + scrollTop + 8}px`;
        }
        searchResults.style.left = `${rect.left + scrollLeft}px`;
        searchResults.style.width = `${rect.width}px`;
    }
}

// Create sparkle particles animation

// Perform search using the API
async function performQuickSearch(query) {
    const searchResults = document.getElementById('quickSearchResults');
    const searchInput = document.getElementById('quickSearchInput');

    // If query is not provided, get it from the input field
    if (!query && searchInput) {
        query = searchInput.value.trim();
    }

    // Don't search if query is empty
    if (!query) {
        searchResults.style.display = 'none';
        return;
    }

    // Cancel previous request if any
    if (currentSearchController) {
        currentSearchController.abort();
    }

    // Show loading state
    const loadingIcon = aiSearchEnabled ? 'fa-sparkles' : 'fa-spinner fa-spin';
    const loadingText = aiSearchEnabled ? 'AI searching...' : 'Searching...';
    searchResults.innerHTML = `<div class="search-loading"><i class="far ${loadingIcon}"></i> ${loadingText}</div>`;
    searchResults.style.display = 'block';

    try {
        // Create new abort controller
        currentSearchController = new AbortController();

        // Build API URL with useAI parameter and aiMode=pure
        const apiUrl = `/api/v2/search?q=${encodeURIComponent(query)}${aiSearchEnabled ? '&useAI=true&aiMode=pure' : ''}`;

        // Call search API
        const response = await fetch(apiUrl, {
            signal: currentSearchController.signal
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Search failed');
        }

        // Store AI data globally for displaying suggestions
        window.currentAIData = data.ai || null;

        displaySearchResults(data.results, query);

    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }


        searchResults.innerHTML = `
            <div class="search-error">
                <i class="far fa-exclamation-triangle"></i> 
                <p style="margin: 8px 0 0 0; font-size: 14px;">Search failed. Please try again.</p>
            </div>
        `;
        searchResults.style.display = 'block';
    }
}

// Display search results
function displaySearchResults(results, query) {
    const searchResults = document.getElementById('quickSearchResults');
    const searchInput = document.getElementById('quickSearchInput');

    // Store all results globally for expansion
    window.allSearchResults = results;
    window.currentDisplayCount = 8;
    window.currentSearchQuery = query;

    // Position dropdown below the search input (using absolute positioning)
    if (searchInput) {
        const rect = searchInput.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            searchResults.style.top = '425px';
        } else {
            searchResults.style.top = `${rect.bottom + scrollTop + 8}px`;
        }
        searchResults.style.left = `${rect.left + scrollLeft}px`;
        searchResults.style.width = `${rect.width}px`;
    }

    if (!results || results.length === 0) {
        const aiIcon = aiSearchEnabled ? '<i class="far fa-sparkles" style="color: #ff2d95;"></i> ' : '';
        const aiData = window.currentAIData;

        // Show AI suggestions if available
        let suggestionsHtml = '';
        if (aiSearchEnabled && aiData && aiData.suggestions && aiData.suggestions.length > 0) {
            suggestionsHtml = `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 130, 0, 0.1);">
                    <p style="font-size: 12px; font-weight: 600; color: #ff2d95; margin-bottom: 6px;">
                        <i class="far fa-lightbulb"></i> AI Suggestions:
                    </p>
                    ${aiData.suggestions.map(s => `
                        <div onclick="document.getElementById('quickSearchInput').value='${s.replace(/'/g, "\\'")}'; performQuickSearch('${s.replace(/'/g, "\\'")}')" 
                             style="padding: 6px 8px; margin: 4px 0; background: rgba(255, 130, 0, 0.05); border-radius: 4px; font-size: 11px; color: #666; cursor: pointer; transition: all 0.2s;"
                             onmouseover="this.style.background='rgba(255, 130, 0, 0.1)'"
                             onmouseout="this.style.background='rgba(255, 130, 0, 0.05)'">
                            <i class="far fa-search" style="opacity: 0.5; margin-right: 4px;"></i>${s}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            suggestionsHtml = '<p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.7;">Try: "os intro", "dadv qb", "epj servlets"</p>';
        }

        searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="far fa-search"></i>
                <p style="margin: 8px 0 0 0; font-size: 14px;">${aiIcon}No results found for "${query}"</p>
                ${suggestionsHtml}
            </div>
        `;
        searchResults.style.display = 'block';
        return;
    }

    renderSearchResults(query);
}

// Render search results (can be called to expand)
function renderSearchResults(query) {
    const searchResults = document.getElementById('quickSearchResults');
    const results = window.allSearchResults || [];
    const displayCount = window.currentDisplayCount || 8;

    // Build HTML for results
    let html = '';

    // Add AI mode indicator if enabled
    if (aiSearchEnabled) {
        const aiData = window.currentAIData;
        const intentText = aiData && aiData.intent ? aiData.intent : 'AI-Powered Results';

        html += `
            <div style="padding: 8px 16px; background: linear-gradient(135deg, rgba(255, 130, 0, 0.1), rgba(255, 45, 149, 0.1)); border-bottom: 1px solid rgba(255, 130, 0, 0.2);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="far fa-sparkles" style="color: #ff2d95; animation: sparkle 1.5s ease-in-out infinite;"></i>
                    <span style="font-size: 12px; font-weight: 600; color: #ff2d95;">AI-Powered Results</span>
                </div>
                ${aiData && aiData.intent ? `
                    <div style="margin-top: 4px; font-size: 11px; color: #666; font-style: italic;">
                        <i class="far fa-brain" style="margin-right: 4px;"></i>${aiData.intent}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Show results based on display count
    const topResults = results.slice(0, displayCount);

    topResults.forEach((result, index) => {
        const scoreColor = result.score >= 75 ? '#28a745' :
            result.score >= 60 ? '#ff8200' : '#6c757d';

        // Show AI explanation if available (pure AI mode)
        const aiExplanation = result.aiExplanation ? `
            <div class="search-result-ai-explanation" style="margin-top: 6px; font-size: 11px; color: #6c757d; font-style: italic; line-height: 1.4;">
                <i class="far fa-sparkles" style="color: #ff2d95; margin-right: 4px;"></i>
                ${result.aiExplanation}
            </div>
        ` : '';

        html += `
            <div class="search-result-item" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px;"
                 data-semester="${result.semester}"
                 data-subject="${result.subject}"
                 data-category="${result.category}"
                 data-topic="${result.topic}">
                <div style="flex: 1; min-width: 0; cursor: pointer;" onclick="selectSearchResult('${result.semester}', \`${result.subject.replace(/`/g, '\\`')}\`, \`${result.category.replace(/`/g, '\\`')}\`, \`${result.topic.replace(/`/g, '\\`')}\`)">
                    <div class="search-result-semester">
                        <i class="far fa-graduation-cap" style="margin-right: 4px;"></i>
                        Semester ${result.semester} • ${result.subject}
                    </div>
                    <div class="search-result-title">
                        ${result.topic}
                    </div>
                    <div class="search-result-category">
                        ${result.category}
                    </div>
                    ${aiExplanation}
                </div>
                <div style="flex-shrink: 0; display: flex; align-items: center; gap: 8px;">
                    <span class="search-result-score" style="background: ${scoreColor}20; color: ${scoreColor};">
                        ${result.score}%
                    </span>
                    <button onclick="openSearchResultPdf(event, '${result.semester}', \`${result.subject.replace(/`/g, '\\`')}\`, \`${result.topic.replace(/`/g, '\\`')}\`)" 
                            style="padding: 8px 16px; background: #ff8400; color: white; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; font-family: 'Manrope', sans-serif;"
                            onmouseover="this.style.background='#ff9500'; this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(255, 132, 0, 0.4)'"
                            onmouseout="this.style.background='#ff8400'; this.style.transform='scale(1)'; this.style.boxShadow='none'">
                        <i class="far fa-external-link" style="margin-right: 4px;"></i>Open
                    </button>
                </div>
            </div>
        `;
    });

    // Add "Show more" button if there are more results
    if (results.length > displayCount) {
        html += `
            <div onclick="showMoreSearchResults(event)" style="padding: 12px 16px; text-align: center; color: #ff8200; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border-top: 1px solid rgba(255, 130, 0, 0.1);" 
                 onmouseover="this.style.background='rgba(255, 130, 0, 0.05)'" 
                 onmouseout="this.style.background='transparent'">
                <i class="far fa-chevron-down"></i> Show ${results.length - displayCount} more result${results.length - displayCount === 1 ? '' : 's'}
            </div>
        `;
    } else if (displayCount > 8 && results.length === displayCount) {
        // Show collapse button if expanded
        html += `
            <div onclick="collapseSearchResults(event)" style="padding: 12px 16px; text-align: center; color: #6c757d; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border-top: 1px solid rgba(108, 117, 125, 0.1);" 
                 onmouseover="this.style.background='rgba(108, 117, 125, 0.05)'" 
                 onmouseout="this.style.background='transparent'">
                <i class="far fa-chevron-up"></i> Show less
            </div>
        `;
    }

    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
}

// Expand search results to show all
function showMoreSearchResults(event) {
    if (event) event.stopPropagation();
    window.currentDisplayCount = window.allSearchResults.length;
    renderSearchResults(window.currentSearchQuery);
}

// Collapse search results back to 8
function collapseSearchResults(event) {
    if (event) event.stopPropagation();
    window.currentDisplayCount = 8;
    renderSearchResults(window.currentSearchQuery);

    // Scroll back to top of results
    const searchResults = document.getElementById('quickSearchResults');
    if (searchResults) {
        searchResults.scrollTop = 0;
    }
}

// Open PDF directly from search result
function openSearchResultPdf(event, semester, subject, topic) {
    // Stop event propagation to prevent selecting the result
    if (event) event.stopPropagation();

    // Hide search results
    const searchResults = document.getElementById('quickSearchResults');
    const searchInput = document.getElementById('quickSearchInput');
    if (searchResults) searchResults.style.display = 'none';
    if (searchInput) searchInput.value = '';

    // Get popup element
    const popup = document.getElementById('popup');
    if (!popup) {
        return;
    }

    // Build PDF URL
    let pdfUrl;
    if (semester === '9999') {
        // Special handling for Vault (semester 9999)
        pdfUrl = `https://cdn-materioa.vercel.app/pdfs/${semester}/${subject}/vault/${topic}.pdf`;
    } else {
        // Normal format: pdfs/semester/subject/topic.pdf
        pdfUrl = `https://cdn-materioa.vercel.app/pdfs/${semester}/${subject}/${topic}.pdf`;
    }

    // Transform to local CDN if enabled
    pdfUrl = window.MaterioLocalCDN?.transformUrl(pdfUrl) || pdfUrl;

    // Open PDF using cache system if available
    if (typeof window.loadPdfWithCache === 'function') {
        window.loadPdfWithCache(pdfUrl);
        popup.classList.remove('closing');
        popup.style.display = 'block';
    } else {
        // Fallback to original behavior
        document.getElementById('popupContent').innerHTML =
            `<iframe id="pdf-iframe" scrolling='no' allowfullscreen webkitallowfullscreen style="border:none; width:100%; height:calc(100% - 17px); border-radius:25px; margin-top:22px; corner-shape: squircle;" 
        src="/oread/web/viewer.html?disableStream=false&disableRange=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}"></iframe>`;

        popup.classList.remove('closing');
        popup.style.display = 'block';
    }
}

// Handle result selection
function selectSearchResult(semester, subject, category, topic) {
    // Hide search results first
    const searchResults = document.getElementById('quickSearchResults');
    const searchInput = document.getElementById('quickSearchInput');
    if (searchResults) searchResults.style.display = 'none';
    if (searchInput) searchInput.value = '';

    // Populate the selection form
    const semesterSelect = document.getElementById('semesterSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const categorySelect = document.getElementById('categorySelect');
    const topicSelect = document.getElementById('topicSelect');

    if (!semesterSelect || !subjectSelect || !categorySelect || !topicSelect) {
        return;
    }

    // Helper function to wait for dropdown to be enabled and populated
    function waitForDropdownReady(selectElement, targetValue, maxAttempts = 30, matchByText = false) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;

                // Check if dropdown is enabled and has the target option
                const isEnabled = !selectElement.disabled;
                const hasOptions = selectElement.options.length > 1; // More than just placeholder

                let option;
                if (matchByText) {
                    // For category dropdown - match by text content
                    option = Array.from(selectElement.options).find(opt => opt.textContent.trim() === targetValue.trim());
                } else {
                    // For other dropdowns - match by value
                    option = Array.from(selectElement.options).find(opt => opt.value === targetValue);
                }

                if (isEnabled && hasOptions && option) {
                    clearInterval(checkInterval);
                    resolve(option.value); // Return the actual value (index for category)
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    reject(false);
                }
            }, 150); // Check every 150ms
        });
    }

    // Helper function to set dropdown value and trigger change
    function setDropdownValue(selectElement, value) {
        // Remove disabled attribute
        selectElement.disabled = false;

        // Set the value
        selectElement.value = value;

        // Trigger multiple events to ensure compatibility
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        selectElement.dispatchEvent(new Event('input', { bubbles: true }));

        // Also trigger jQuery change if available (some forms use jQuery)
        if (window.jQuery) {
            window.jQuery(selectElement).trigger('change');
        }
    }

    // Chain the selections with proper waiting
    async function populateAllFields() {
        try {
            // Step 1: Set semester
            setDropdownValue(semesterSelect, semester);
            await new Promise(resolve => setTimeout(resolve, 300)); // Give it time to process

            // Step 2: Wait for subject dropdown to populate, then set it
            await waitForDropdownReady(subjectSelect, subject);
            setDropdownValue(subjectSelect, subject);
            await new Promise(resolve => setTimeout(resolve, 300)); // Give it time to process

            // Step 3: Wait for category dropdown to populate, then find by TEXT and set by INDEX
            const categoryIndex = await waitForDropdownReady(categorySelect, category, 30, true); // matchByText = true
            setDropdownValue(categorySelect, categoryIndex);
            await new Promise(resolve => setTimeout(resolve, 300)); // Give it time to process

            // Step 4: Wait for topic dropdown to populate, then set it
            await waitForDropdownReady(topicSelect, topic);
            setDropdownValue(topicSelect, topic);

            // Scroll to the form
            setTimeout(() => {
                const readingCard = document.getElementById('reading');
                if (readingCard) {
                    readingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);

        } catch (error) {

        }
    }

    // Execute the population
    populateAllFields();
}

// Expose functions globally for inline onclick handlers
window.selectSearchResult = selectSearchResult;
window.performQuickSearch = performQuickSearch;
window.openSearchResultPdf = openSearchResultPdf;
window.showMoreSearchResults = showMoreSearchResults;
window.collapseSearchResults = collapseSearchResults;

// ================================================
// CUSTOM MODAL SYSTEM (Alert & Confirm)
// ================================================

/**
 * Custom alert modal - replaces browser's native alert()
 * @param {string} message - The message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Modal title (default: "Notice")
 * @param {string} options.type - Icon type: 'info', 'success', 'warning', 'danger' (default: 'info')
 * @param {string} options.buttonText - OK button text (default: "OK")
 * @returns {Promise<void>} Resolves when user clicks OK
 */
function materioAlert(message, options = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Notice',
            type = 'info',
            buttonText = 'OK'
        } = options;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'materio-modal-overlay';
        overlay.innerHTML = `
            <div class="materio-modal" role="alertdialog" aria-modal="true" aria-labelledby="materio-modal-title">
                <div class="materio-modal-icon ${type}">
                    <i class="fa-solid ${getIconForType(type)}"></i>
                </div>
                <h3 class="materio-modal-title" id="materio-modal-title">${escapeHtml(title)}</h3>
                <p class="materio-modal-message">${escapeHtml(message)}</p>
                <div class="materio-modal-buttons">
                    <button class="materio-modal-btn primary" id="materio-modal-ok">${escapeHtml(buttonText)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        // Focus the button
        const okBtn = overlay.querySelector('#materio-modal-ok');
        setTimeout(() => okBtn.focus(), 100);

        // Close function
        function closeModal() {
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 250);
        }

        // Event listeners
        okBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape' || e.key === 'Enter') {
                document.removeEventListener('keydown', escHandler);
                closeModal();
            }
        });
    });
}

/**
 * Custom confirm modal - replaces browser's native confirm()
 * @param {string} message - The message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Modal title (default: "Confirm")
 * @param {string} options.type - Icon type: 'info', 'success', 'warning', 'danger' (default: 'warning')
 * @param {string} options.confirmText - Confirm button text (default: "Confirm")
 * @param {string} options.cancelText - Cancel button text (default: "Cancel")
 * @param {boolean} options.danger - If true, confirm button is red (default: false)
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
function materioConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Confirm',
            type = 'warning',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            danger = false
        } = options;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'materio-modal-overlay';
        overlay.innerHTML = `
            <div class="materio-modal" role="alertdialog" aria-modal="true" aria-labelledby="materio-modal-title">
                <div class="materio-modal-icon ${type}">
                    <i class="fa-solid ${getIconForType(type)}"></i>
                </div>
                <h3 class="materio-modal-title" id="materio-modal-title">${escapeHtml(title)}</h3>
                <p class="materio-modal-message">${escapeHtml(message)}</p>
                <div class="materio-modal-buttons">
                    <button class="materio-modal-btn secondary" id="materio-modal-cancel">${escapeHtml(cancelText)}</button>
                    <button class="materio-modal-btn ${danger ? 'danger' : 'primary'}" id="materio-modal-confirm">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        // Focus the cancel button (safer default)
        const cancelBtn = overlay.querySelector('#materio-modal-cancel');
        const confirmBtn = overlay.querySelector('#materio-modal-confirm');
        setTimeout(() => cancelBtn.focus(), 100);

        // Close function
        function closeModal(result) {
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 250);
        }

        // Event listeners
        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(false);
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                closeModal(false);
            } else if (e.key === 'Enter') {
                document.removeEventListener('keydown', escHandler);
                closeModal(true);
            }
        });
    });
}

// Helper: Get FontAwesome icon class for modal type
function getIconForType(type) {
    const icons = {
        'info': 'fa-circle-info',
        'success': 'fa-circle-check',
        'warning': 'fa-triangle-exclamation',
        'danger': 'fa-circle-xmark'
    };
    return icons[type] || icons.info;
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make modal functions globally accessible
window.materioAlert = materioAlert;
window.materioConfirm = materioConfirm;

(function () {
    var breakAfter = 4; // change to 5 if you prefer 5 words
    var mobileWidth = 600;

    function applyWordWrap() {
        document.querySelectorAll('.paper-mode-description').forEach(function (el) {
            // store original text once
            var original = el.getAttribute('data-original-text');
            if (!original) {
                original = (el.textContent || '').trim();
                el.setAttribute('data-original-text', original);
            }
            if (window.innerWidth <= mobileWidth) {
                var words = original.split(/\s+/);
                if (words.length > breakAfter) {
                    var first = words.slice(0, breakAfter).join(' ');
                    var rest = words.slice(breakAfter).join(' ');
                    el.innerHTML = first + '<br>' + rest;
                } else {
                    el.textContent = original;
                }
            } else {
                // restore original on larger screens
                el.textContent = original;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', applyWordWrap);
    var _t;
    window.addEventListener('resize', function () {
        clearTimeout(_t);
        _t = setTimeout(applyWordWrap, 120);
    });
})();

// ================================================
// KEYBOARD SHORTCUTS MODAL
// ================================================

(function () {
    function openKeyboardShortcutsModal() {
        const modal = document.getElementById('keyboardShortcutsModal');
        if (modal) {
            modal.classList.add('visible');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeKeyboardShortcutsModal() {
        const modal = document.getElementById('keyboardShortcutsModal');
        if (modal) {
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        const openBtn = document.getElementById('keyboardShortcutsBtn');
        const closeBtn = document.getElementById('shortcutsCloseBtn');
        const backdrop = document.getElementById('keyboardShortcutsBackdrop');

        // Open modal on button click
        if (openBtn) {
            // Check if user has seen shortcuts before
            if (localStorage.getItem('keyboardShortcutsSeen')) {
                openBtn.classList.add('seen');
            }

            openBtn.addEventListener('click', function (e) {
                e.preventDefault();
                // Mark as seen
                localStorage.setItem('keyboardShortcutsSeen', 'true');
                openBtn.classList.add('seen');
                openKeyboardShortcutsModal();
            });
        }

        // Close modal on close button click
        if (closeBtn) {
            closeBtn.addEventListener('click', closeKeyboardShortcutsModal);
        }

        // Close modal on backdrop click
        if (backdrop) {
            backdrop.addEventListener('click', closeKeyboardShortcutsModal);
        }
    });

    // Expose functions globally for keyboard-shortcuts.js
    window.openKeyboardShortcutsModal = openKeyboardShortcutsModal;
    window.closeKeyboardShortcutsModal = closeKeyboardShortcutsModal;
})();

// Changelog update indicator logic
document.addEventListener('DOMContentLoaded', function () {
    const changelogBtn = document.querySelector('.changelog-btn');
    if (!changelogBtn) return;

    const latestUpdate = changelogBtn.getAttribute('data-latest-update');
    if (!latestUpdate) return;

    const lastSeenUpdate = localStorage.getItem('lastSeenChangelogDate');

    // Show indicator if we have a new update we haven't seen yet
    if (!lastSeenUpdate || parseInt(latestUpdate) > parseInt(lastSeenUpdate)) {
        changelogBtn.classList.add('has-update');
    }

    // Mark as seen when clicked
    changelogBtn.addEventListener('click', function () {
        localStorage.setItem('lastSeenChangelogDate', latestUpdate);
        changelogBtn.classList.remove('has-update');
    });
});

// ================================================
// PDF LINK INTERCEPTOR
// ================================================
document.addEventListener('click', function (e) {
    // Find closest anchor tag
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.href;
    if (!href) return;

    // Check if it's a PDF
    // 1. Ends with .pdf (ignoring query params)
    // 2. Has data-type="pdf"
    let isPdf = false;

    try {
        const urlObj = new URL(href, window.location.origin);
        // Check pathname for .pdf extension
        if (urlObj.pathname.toLowerCase().endsWith('.pdf')) {
            isPdf = true;
        }
    } catch (e) {
        // invalid URL, ignore
    }

    if (!isPdf && link.dataset.type === 'pdf') {
        isPdf = true;
    }

    if (isPdf) {
        // Prevent default navigation (opening in new tab or navigating away)
        e.preventDefault();

        // Use the cache loader/popup viewer if available
        if (typeof window.loadPdfWithCache === 'function') {
            window.loadPdfWithCache(href);
        } else {
            // Fallback context: just let it open if our viewer isn't ready, 
            // but we intercepted it so we must handle it.
            window.open(href, '_blank');
        }
    }
});