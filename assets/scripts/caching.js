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
    }

    async function preloadPdf(pdfUrl) {
        if (pdfCache.has(pdfUrl)) {
            console.log('PDF already preloaded:', pdfUrl);
            return;
        }
        try {
            const response = await fetch(pdfUrl);
            if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            const pdfBlob = await response.blob();
            const pdfBlobUrl = URL.createObjectURL(pdfBlob);
            pdfCache.set(pdfUrl, pdfBlobUrl);
            console.log('PDF preloaded:', pdfUrl);
        } catch (error) {
            console.error('Error preloading PDF:', error);
        }
    }    function initializeIframe() {
        if (!pdfIframe) {
            pdfIframe = document.createElement('iframe');
            pdfIframe.id = 'pdf-iframe';
            pdfIframe.style.border = 'none';
            pdfIframe.style.width = '100%';
            pdfIframe.style.height = 'calc(100% - 17px)';
            pdfIframe.style.borderRadius = '10px';
            pdfIframe.style.marginTop = '22px';
            
            // Add load event listener to request overlay mode application
            pdfIframe.addEventListener('load', function() {
                // Give PDF.js a moment to initialize, then request overlay modes
                setTimeout(() => {
                    const mainPopup = document.getElementById('popup');
                    if (mainPopup && pdfIframe.contentWindow) {
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
                    }
                }, 500);
            });
        }
        if (!document.getElementById('pdf-iframe')) {
            popupContent.appendChild(pdfIframe);
        }
    }

    submitButton.addEventListener('click', async () => {
        const semester = document.getElementById('semesterSelect').value;
        const subject = document.getElementById('subjectSelect').value;
        const categorySelect = document.getElementById('categorySelect');
        const topic = document.getElementById('topicSelect').value;

        if (!semester || !subject || categorySelect.selectedIndex === 0 || !topic) {

            return;
        }

        const pdfUrl = `https://cdn-materioa.netlify.app/pdfs/${semester}/${subject}/${topic}.pdf`;

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
        try {
            const headResponse = await fetch(pdfUrl, { method: 'HEAD' });
            if (!headResponse.ok) {
                document.getElementById('popupContent').innerHTML =
                    `<div style="padding:20px;text-align:center;">
<i class="fa-solid fa-triangle-exclamation" style="font-size: 72px; color:#ff8400; margin-top:220px;"></i>
 <p class="popup-message">File not found !</p>
 <p class="popup-errcode">Error: ${headResponse.status}</p>
</div>`;
                popup.classList.remove('closing');
                popup.style.display = 'block';
                return;
            }
        } catch (error) {
            document.getElementById('popupContent').innerHTML =
                `<div style="padding:20px;text-align:center;">
<i class="fa-solid fa-rotate-exclamation" style="font-size: 72px; color:#ff8400; margin-top:220px;"></i>
<p class="popup-message">Error checking file !</p>
<p class="popup-errcode">Error: ${error.message || 'NETWORK_ERROR'}</p>
</div>`;
            popup.classList.remove('closing');
            popup.style.display = 'block';
            return;
        }

        let pdfBlobUrl = pdfCache.get(pdfUrl);
        if (!pdfBlobUrl) {
            console.log('PDF not preloaded, fetching now...');
            await preloadPdf(pdfUrl);
            pdfBlobUrl = pdfCache.get(pdfUrl);
        }

        initializeIframe();
        pdfIframe.src = `/oread/web/viewer.html?disableStream=false&disableRange=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}`;
        popup.classList.remove('closing');
        popup.style.display = 'block';
        addToCache(pdfUrl);
    });

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
    });
});