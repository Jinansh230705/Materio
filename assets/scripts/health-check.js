/**
 * Health Check Module
 * Monitors system health status and updates the indicator.
 * Checks incident.io public status page API for active incidents.
 * © 2024-2026, Materio by JTC.
 * @module health-check
 */

const HEALTH_API_URL = '/api/v2/health';

/**
 * Check system health and update indicator
 * Fetches status from our internal health API (which proxies incident.io)
 * @returns {Promise<void>}
 */
async function checkHealth() {
    const healthIndicator = document.getElementById('healthIndicator');
    const healthStatusText = document.getElementById('healthStatusText');
    if (!healthIndicator) return;

    try {
        const response = await fetch(HEALTH_API_URL);
        const data = await response.json();

        healthIndicator.classList.remove('ok', 'degraded', 'partial-outage', 'error');

        // Check for active incident from our health API response
        const incident = data.incident;
        const status = data.status;

        if (incident) {
            const impact = incident.impact || 'partial_outage';

            // Map impact to indicator class
            if (impact === 'major_outage') {
                healthIndicator.classList.add('error');
                if (healthStatusText) healthStatusText.textContent = 'Outage';
            } else if (impact === 'partial_outage') {
                healthIndicator.classList.add('partial-outage');
                if (healthStatusText) healthStatusText.textContent = 'Partial Outage';
            } else if (impact === 'degraded_performance' || impact === 'maintenance') {
                healthIndicator.classList.add('degraded');
                if (healthStatusText) healthStatusText.textContent = 'Degraded';
            } else {
                healthIndicator.classList.add('partial-outage');
                if (healthStatusText) healthStatusText.textContent = 'Issues';
            }
            healthIndicator.title = incident.name || 'Active incident';
            return;
        }

        // If status is offline, handle accordingly
        if (status === 'offline') {
            healthIndicator.classList.add('degraded'); // or a new 'offline' class if styles exist
            healthIndicator.title = data.message || 'Please check your internet connection';
            if (healthStatusText) healthStatusText.textContent = 'Offline';
            return;
        }

        // If no incident but status is degraded, show degraded
        if (status === 'degraded') {
            healthIndicator.classList.add('degraded');
            healthIndicator.title = data.message || 'Systems are experiencing issues';
            if (healthStatusText) healthStatusText.textContent = 'Degraded';
            return;
        }

        // No incidents - all systems operational
        healthIndicator.classList.add('ok');
        healthIndicator.title = 'All systems operational';
        if (healthStatusText) healthStatusText.textContent = 'Operational';
    } catch (error) {
        // If we can't reach our health API
        if (!navigator.onLine) {
            healthIndicator.classList.add('degraded');
            healthIndicator.title = 'You are currently offline';
            if (healthStatusText) healthStatusText.textContent = 'Offline';
        } else {
            // If online but API failed, show as ok (don't alarm users)
            healthIndicator.classList.add('ok');
            healthIndicator.title = 'All systems operational';
            if (healthStatusText) healthStatusText.textContent = 'Operational';
        }
    }
}

/**
 * Initialize health check on DOM ready
 */
function init() {
    const healthIndicator = document.getElementById('healthIndicator');
    if (!healthIndicator) return;

    checkHealth();
    // Uncomment to enable periodic checks:
    // setInterval(checkHealth, 90 * 60 * 1000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for potential future use
export { checkHealth, init };
