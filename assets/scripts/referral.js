/**
 * Materio Referral & Short URL Handler
 * Handles shortened referral links like /?jinansh or /jinansh
 */
(function () {
    'use strict';

    function initReferralHandler() {
        const urlParams = new URLSearchParams(window.location.search);
        let referrer = null;

        // 1. Check for standalone parameter (e.g., ?jinansh)
        // URLSearchParams considers ?jinansh as a key with an empty value
        for (const [key, value] of urlParams.entries()) {
            // A valid referrer slug is likely alphanumeric, 2-20 chars, and has no value
            if (value === "" && /^[a-zA-Z0-9_-]{2,20}$/.test(key)) {
                // List of reserved words to ignore as standalone params
                const reserved = ['fbclid', 'gclid', 'msclkid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
                if (!reserved.includes(key.toLowerCase())) {
                    referrer = key;
                    break;
                }
            }
        }

        // 2. Check for explicit referrer parameter (e.g., ?referrer=jinansh or ?r=jinansh)
        if (!referrer) {
            referrer = urlParams.get('referrer') || urlParams.get('ref') || urlParams.get('r');
        }

        if (referrer) {
            // console.log('[Referral] Detected:', referrer);

            // Get UTM parameters or set defaults from the user's preferred format
            const utm_source = urlParams.get('utm_source') || 'whatsapp';
            const utm_medium = urlParams.get('utm_medium') || 'social';
            const utm_campaign = urlParams.get('utm_campaign') || 'share';

            // Store in localStorage for persistence (used during signup or metrics)
            localStorage.setItem('materio_referrer', referrer);
            localStorage.setItem('materio_utm_source', utm_source);
            localStorage.setItem('materio_utm_medium', utm_medium);
            localStorage.setItem('materio_utm_campaign', utm_campaign);

            // Set timestamp of when this referral was captured
            localStorage.setItem('materio_referrer_time', Date.now().toString());

            // Optional: Clean up the URL to keep it pretty
            // Only clean if we were using the shorthand ?slug format or the 'r' param
            const hasShorthand = Array.from(urlParams.keys()).some(k => urlParams.get(k) === "" && k === referrer);
            const hasRParam = urlParams.has('r') || urlParams.has('ref');

            if ((hasShorthand || hasRParam) && window.history.replaceState) {
                // Clear the search params but keep other ones if they exist (though usually they don't in shorthand)
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({ path: newUrl }, '', newUrl);
            }

            // Dispatch event for other scripts (like metrics) to know about the referral
            window.dispatchEvent(new CustomEvent('materio-referral-detected', {
                detail: { referrer, utm_source, utm_medium, utm_campaign }
            }));
        }
    }

    // Run immediately
    initReferralHandler();

})();
