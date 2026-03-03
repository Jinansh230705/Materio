/**
 * Releases Module (ESM)
 * Fetches and displays release information based on current branch.
 * 
 * @module releases
 */

/**
 * Determine the current branch from URL
 * @returns {string} Branch name ('stable', 'channels', or 'labs')
 */
function getCurrentBranch() {
    const url = window.location.href;
    if (url.includes('/channels/')) {
        return 'channels';
    } else if (url.includes('/labs')) {
        return 'labs';
    }
    return 'stable';
}

/**
 * Fetch and display release information
 * @returns {Promise<void>}
 */
async function loadReleases() {
    const branch = getCurrentBranch();

    try {
        const response = await fetch('/assets/data/releases.json');
        const releases = await response.json();

        // Find release for current branch
        const releaseFound = releases.find(
            release => release.branch.toLowerCase() === branch
        );

        const versionElem = document.getElementById('versionInfoText');
        const buildElem = document.getElementById('buildInfoText');
        const logElem = document.getElementById('changeLogContent');

        if (releaseFound) {
            if (versionElem) {
                versionElem.textContent = 'Version: ' + releaseFound.version;
            }
            if (buildElem) {
                buildElem.textContent = 'Build: ' + releaseFound.build;
            }
            if (logElem) {
                if (Array.isArray(releaseFound.logs)) {
                    logElem.innerHTML = releaseFound.logs
                        .map(log => `<p>${log}</p>`)
                        .join('');
                } else {
                    logElem.textContent = releaseFound.logs;
                }
            }
        } else {
            if (logElem) {
                logElem.textContent = 'No changelog available for this branch.';
            }
        }
    } catch (err) {
        console.error('Error loading releases:', err);
    }
}

/**
 * Initialize releases module
 */
function init() {
    loadReleases();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for potential future use
export { loadReleases, getCurrentBranch, init };