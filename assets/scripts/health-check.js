(function() {
    const healthIndicator = document.getElementById('healthIndicator');
    if (!healthIndicator) return;

    async function checkHealth() {
        try {
            const response = await fetch('/api/v1/health');
            const data = await response.json();
            healthIndicator.classList.remove('ok', 'degraded', 'error');
            if (data.status === 'ok') {
                healthIndicator.classList.add('ok');
                healthIndicator.title = 'All systems operational';
            } else if (data.status === 'degraded') {
                healthIndicator.classList.add('degraded');
                healthIndicator.title = 'Some systems degraded';
            } else {
                healthIndicator.classList.add('error');
                healthIndicator.title = 'System error';
            }
        } catch (error) {
            healthIndicator.classList.remove('ok', 'degraded');
            healthIndicator.classList.add('error');
            healthIndicator.title = 'Unable to check system health';
            console.error('Health check failed:', error);
        }
    }
    checkHealth();
    setInterval(checkHealth, 10 * 60 * 1000);
    healthIndicator.addEventListener('click', async () => {
        await checkHealth();
    });
})();
