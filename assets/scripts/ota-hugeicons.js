/**
 * OTA Update Script - Hugeicons Migration
 * Only for Plus and Super (Admin) Users
 * Migrates from FontAwesome to Hugeicons
 */

(function () {
    'use strict';

    const OTA_VERSION = '1.0.0-hugeicons';
    const OTA_STORAGE_KEY = 'materio_ota_hugeicons';
    const HUGEICONS_CDN = 'https://use.hugeicons.com/font/icons.css';

    // Icon mapping: FontAwesome class -> Hugeicons class
    // Hugeicons uses format: hgi-stroke hgi-{icon-name}
    const ICON_MAP = {
        // Navigation icons
        'fa-house-chimney': 'home-09',
        'fa-comments': 'chat',
        'fa-bell': 'notification-01',
        'fa-robot': 'robot',
        'fa-lightbulb-on': 'book-open-02',
        'fa-cog': 'settings-01',

        // Common actions
        'fa-circle-plus': 'plus-sign-circle',
        'fa-refresh': 'refresh',
        'fa-arrow-up': 'arrow-up-01',
        'fa-user': 'user-sharing',
        'fa-folder-arrow-down': 'folder-download',
        'fa-download': 'download-01',
        'fa-trash': 'delete-02',
        'fa-play': 'play',
        'fa-pause': 'pause',
        'fa-chevron-right': 'arrow-right-01',
        'fa-chevron-down': 'arrow-down-01',
        'fa-chevron-left': 'arrow-left-01',
        'fa-chevron-up': 'arrow-up-01',
        'fa-bookmark-plus': 'bookmark-02',
        'fa-expand': 'square-arrow-diagonal-01',
        'fa-compress': 'square-arrow-shrink-02',
        'fa-hard-drive': 'server-stack-01',


        // Info & Legal icons
        'fa-circle-info': 'information-circle',
        'fa-scroll': 'scroll',
        'fa-file-contract': 'file-02',
        'fa-cookie': 'cookie',
        'fa-telescope': 'telescope-02',

        // Social
        'fa-github': 'github',

        // Badges
        'fa-badge-check': 'checkmark-badge-01',
        'fa-star': 'star',

        // Status
        'fa-check': 'tick-01',
        'fa-times': 'cancel-01',
        'fa-exclamation-triangle': 'alert-02',
    };

    /**
     * Check if user is Plus or Super (Admin)
     */
    function isPlusOrSuperUser() {
        try {
            const userData = localStorage.getItem('materio_user');
            if (!userData) {
                return false;
            }

            const user = JSON.parse(userData);
            return user.isPlusUser || user.hasAdminPrivileges || false;
        } catch (error) {
            console.error('[OTA] Error checking user status:', error);
            return false;
        }
    }

    /**
     * Check if OTA update is already installed
     */
    function isOTAInstalled() {
        const installed = localStorage.getItem(OTA_STORAGE_KEY);
        return installed === 'true';
    }

    /**
     * Mark OTA as installed
     */
    function markOTAInstalled() {
        localStorage.setItem(OTA_STORAGE_KEY, 'true');
    }

    /**
     * Load Hugeicons CSS
     */
    function loadHugeiconsCSS() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`link[href="${HUGEICONS_CDN}"]`)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = HUGEICONS_CDN;
            link.onload = () => {
                resolve();
            };
            link.onerror = () => {
                console.error('[OTA] Failed to load Hugeicons CSS');
                reject(new Error('Failed to load Hugeicons CSS'));
            };

            document.head.appendChild(link);
        });
    }

    /**
     * Migrate FontAwesome icons to Hugeicons
     */
    function migrateIcons() {
        let migratedCount = 0;

        // Find all FontAwesome icons
        const icons = document.querySelectorAll('i[class*="fa-"]');

        icons.forEach(icon => {
            let migrated = false;
            let targetIconName = null;

            // Check each class for a mapping
            icon.classList.forEach(className => {
                if (ICON_MAP[className]) {
                    targetIconName = ICON_MAP[className];
                    migrated = true;
                }
            });

            if (migrated && targetIconName) {
                // Remove all FontAwesome classes
                const classesToRemove = [];
                icon.classList.forEach(className => {
                    if (className.startsWith('fa-') || className === 'fas' || className === 'far' ||
                        className === 'fab' || className === 'fal' || className === 'fat' || className === 'fa') {
                        classesToRemove.push(className);
                    }
                });

                classesToRemove.forEach(className => {
                    icon.classList.remove(className);
                });

                // Add Hugeicons classes
                // Format: hgi-stroke hgi-{icon-name}
                icon.classList.add('hgi-stroke', `hgi-${targetIconName}`);

                migratedCount++;
            }
        });

        return migratedCount;
    }

    /**
     * Update version info to reflect beta branch
     */
    function updateVersionInfo() {
        fetch('/assets/data/releases.json')
            .then(response => response.json())
            .then(releases => {
                // Find beta branch
                const betaRelease = releases.find(r => r.branch.toLowerCase() === 'beta');

                if (betaRelease) {
                    // Wait a bit for DOM to be ready
                    setTimeout(() => {
                        const versionElem = document.getElementById("versionInfoText");
                        const buildElem = document.getElementById("buildInfoText");
                        const logElem = document.getElementById("changeLogContent");

                        if (versionElem) {
                            versionElem.textContent = "Version: " + betaRelease.version + " (Beta)";
                        }
                        if (buildElem) {
                            buildElem.textContent = "Build: " + betaRelease.build;
                        }
                        if (logElem && Array.isArray(betaRelease.logs)) {
                            let html = "";
                            betaRelease.logs.forEach(log => {
                                html += "<p>" + log + "</p>";
                            });
                            logElem.innerHTML = html;
                        }
                    }, 500);
                }
            })
            .catch(err => {
                console.error('[OTA] Error updating version info:', err);
            });
    }

    /**
     * Apply OTA update
     */
    async function applyOTAUpdate() {
        try {
            // Show loading state
            showUpdateProgress('Loading Hugeicons...', 30);

            // Load Hugeicons CSS
            await loadHugeiconsCSS();

            showUpdateProgress('Migrating icons...', 60);

            // Wait a bit for CSS to apply
            await new Promise(resolve => setTimeout(resolve, 500));

            // Migrate icons
            const count = migrateIcons();

            showUpdateProgress('Updating version info...', 80);

            // Update version info to beta branch
            updateVersionInfo();

            showUpdateProgress('Finalizing...', 90);

            // Mark as installed
            markOTAInstalled();

            showUpdateProgress('Complete!', 100);

            // Show success message
            setTimeout(() => {
                hideUpdateProgress();
                showUpdateSuccess(count);
            }, 1000);

            return true;
        } catch (error) {
            console.error('[OTA] Update failed:', error);
            hideUpdateProgress();
            showUpdateError(error.message);
            return false;
        }
    }

    /**
     * Auto-apply OTA if already installed (on page load)
     */
    async function autoApplyOTA() {
        if (!isPlusOrSuperUser()) {
            return;
        }

        if (isOTAInstalled()) {
            try {
                await loadHugeiconsCSS();
                await new Promise(resolve => setTimeout(resolve, 300));
                migrateIcons();

                // Update version info to beta branch
                updateVersionInfo();
            } catch (error) {
                console.error('[OTA] Auto-apply failed:', error);
            }
        }
    }

    /**
     * Show update progress
     */
    function showUpdateProgress(message, percent) {
        let modal = document.getElementById('otaProgressModal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'otaProgressModal';
            modal.innerHTML = `
                <div class="ota-progress-overlay">
                    <div class="ota-progress-card">
                        <h3>Installing Update</h3>
                        <div class="ota-progress-bar">
                            <div class="ota-progress-fill"></div>
                        </div>
                        <p class="ota-progress-text"></p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.style.display = 'block';
        modal.querySelector('.ota-progress-fill').style.width = percent + '%';
        modal.querySelector('.ota-progress-text').textContent = message;
    }

    /**
     * Hide update progress
     */
    function hideUpdateProgress() {
        const modal = document.getElementById('otaProgressModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show success notification
     */
    function showUpdateSuccess(count) {
        const notification = document.createElement('div');
        notification.className = 'ota-notification ota-success';
        notification.innerHTML = `
            <i class="hgi-stroke hgi-checkmark-badge-01"></i>
            <div>
                <strong>Update Successful</strong>
                <p>OTA was updated successfully</p>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Show error notification
     */
    function showUpdateError(message) {
        const notification = document.createElement('div');
        notification.className = 'ota-notification ota-error';
        notification.innerHTML = `
            <i class="hgi-stroke hgi-alert-02"></i>
            <div>
                <strong>Update Failed</strong>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Initialize OTA update button
     */
    function initOTAButton() {
        // Only show for Plus/Super users
        if (!isPlusOrSuperUser()) {
            return;
        }

        const button = document.getElementById('otaUpdateButton');
        if (!button) {
            return;
        }

        // Check if already installed - if so, don't show the button at all
        if (isOTAInstalled()) {
            button.style.display = 'none';
            return;
        }

        // Show the button only if not installed
        button.style.display = 'flex';

        // Add click handler
        button.addEventListener('click', async function () {
            if (this.disabled) return;

            this.disabled = true;
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="hgi-stroke hgi-loading"></i><span>Installing...</span>';

            const success = await applyOTAUpdate();

            if (success) {
                // Remove the button instead of showing installed state
                this.style.display = 'none';

                // Reload page after 2 seconds to apply all changes
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                this.innerHTML = originalHTML;
                this.disabled = false;
            }
        });
    }

    // Auto-apply on page load if already installed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoApplyOTA);
    } else {
        autoApplyOTA();
    }

    // Initialize button when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOTAButton);
    } else {
        initOTAButton();
    }

    // Expose public API
    window.MaterioOTA = {
        applyUpdate: applyOTAUpdate,
        isInstalled: isOTAInstalled,
        version: OTA_VERSION
    };

})();
