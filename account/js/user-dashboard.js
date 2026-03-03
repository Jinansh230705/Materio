/**
 * User Dashboard Logic
 * Populates analytics data from local storage
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initial load from local storage
    loadUserAnalytics();

    // Fetch fresh "Super Data" from server
    fetchServerStats();

    // Listen for sync updates
    window.addEventListener('materio-stats-updated', function () {
        console.log('Refreshing dashboard with synced stats...');
        loadUserAnalytics();
    });
});

async function fetchServerStats() {
    // Wait for Metrics to be ready if needed
    if (!window.MetricsClient) {
        setTimeout(fetchServerStats, 500);
        return;
    }

    const userId = window.MetricsClient.getUserId();
    if (!userId) return;

    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_BASE = isLocal ? 'http://localhost:3000' : 'https://materiosync.vercel.app';

        const response = await fetch(`${API_BASE}/stats/${userId}?period=all_time`);
        if (response.ok) {
            const data = await response.json();

            // Construct the "Super Data" object with new trends support
            const stats = {
                pdfsRead: data.metrics.unique_pdfs_count || 0, // Switched to Unique count
                timeSpent: (data.metrics.reading_time_seconds || 0) + (data.metrics.engagement_time_seconds || 0),
                streak: data.streak || 0,
                history: data.history || [],
                trends: data.trends || {}, // New datewise trends from backend
                lastReadDate: null
            };

            if (stats.history.length > 0) {
                stats.lastReadDate = stats.history[0].date.split('T')[0];
            }

            // Save to local storage so other tabs/scripts see it
            localStorage.setItem('materio_user_stats', JSON.stringify(stats));

            // Update UI
            updateDashboardUI(stats);
            console.log('[Analytics] Fresh trends & stats synced:', stats.trends);
        }
    } catch (e) {
        console.error('Failed to fetch server stats', e);
    }
}

function loadUserAnalytics() {
    const statsKey = 'materio_user_stats';
    let stats = { pdfsRead: 0, timeSpent: 0, streak: 0, history: [] };

    try {
        const stored = localStorage.getItem(statsKey);
        if (stored) {
            stats = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load user stats', e);
    }

    updateDashboardUI(stats);
}

function updateDashboardUI(stats) {
    // Update Stats
    updateElement('dash-streak', stats.streak);
    updateElement('dash-pdfs-read', stats.pdfsRead);
    updateElement('dash-time-spent', formatTime(stats.timeSpent));

    // Render History
    renderHistory(stats.history);
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatTime(seconds) {
    if (!seconds) return '0m';
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.round(seconds / 60) + 'm';
    return (seconds / 3600).toFixed(1) + 'h';
}

function renderHistory(history) {
    const container = document.getElementById('dash-history-list');
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = '<div class="empty-state-text">No recently read PDFs.</div>';
        return;
    }

    container.innerHTML = '';

    // Show top 5 recent
    history.slice(0, 5).forEach(item => {
        // Prefer the captured title from the database
        let name = item.title;

        if (!name || name === 'Unknown PDF' || name === 'PDF Document') {
            try {
                // Try to get filename from URL as fallback
                const urlParts = item.url.split('/');
                const filename = urlParts[urlParts.length - 1];
                name = decodeURIComponent(filename.replace('.pdf', '')).split('?')[0];

                if (name.length > 30) name = name.substring(0, 27) + '...';
            } catch (e) {
                name = 'PDF Document';
            }
        }

        const el = document.createElement('div');
        el.className = 'list-item';
        // Note: No onclick or pointer cursor as per user request
        el.style.cursor = 'default';

        el.innerHTML = `
            <i class="fas fa-file-pdf"></i>
            <div class="item-details">
                <span class="item-title" style="font-style: normal;" title="${item.url}">${name}</span>
                <span class="item-meta">${formatTime(item.duration)} read • ${new Date(item.date).toLocaleDateString()}</span>
            </div>
        `;

        container.appendChild(el);
    });
}
