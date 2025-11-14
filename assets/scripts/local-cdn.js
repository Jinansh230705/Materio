/**
 * Local CDN Path Manager
 * For Super Users Only
 * Allows loading resources from local directory instead of CDN
 */

(function() {
    'use strict';
    
    const LOCAL_CDN_STORAGE_KEY = 'materio_local_cdn_path';
    const LOCAL_CDN_ENABLED_KEY = 'materio_local_cdn_enabled';
    
    /**
     * Check if user is Super (Admin)
     */
    function isSuperUser() {
        try {
            const userData = localStorage.getItem('materio_user');
            if (!userData) {
                return false;
            }
            
            const user = JSON.parse(userData);
            return user.hasAdminPrivileges || false;
        } catch (error) {
            console.error('[Local CDN] Error checking user status:', error);
            return false;
        }
    }
    
    /**
     * Get local CDN path
     */
    function getLocalCdnPath() {
        return localStorage.getItem(LOCAL_CDN_STORAGE_KEY) || '';
    }
    
    /**
     * Set local CDN path
     */
    function setLocalCdnPath(path) {
        // Normalize path - remove trailing slashes for consistency
        let normalizedPath = path.trim();
        // Remove trailing slashes/backslashes
        normalizedPath = normalizedPath.replace(/[\\\/]+$/, '');
        
        localStorage.setItem(LOCAL_CDN_STORAGE_KEY, normalizedPath);
        console.log('[Local CDN] Path saved:', normalizedPath);
    }
    
    /**
     * Check if local CDN is enabled
     */
    function isLocalCdnEnabled() {
        return localStorage.getItem(LOCAL_CDN_ENABLED_KEY) === 'true';
    }
    
    /**
     * Set local CDN enabled state
     */
    function setLocalCdnEnabled(enabled) {
        localStorage.setItem(LOCAL_CDN_ENABLED_KEY, enabled ? 'true' : 'false');
        console.log('[Local CDN] Enabled:', enabled);
    }
    
    /**
     * Transform CDN URL to local path
     */
    function transformCdnUrl(url) {
        if (!isLocalCdnEnabled()) {
            return url;
        }
        
        const localPath = getLocalCdnPath();
        if (!localPath) {
            return url;
        }
        
        // Replace CDN domain with local path
        const cdnDomain = 'https://cdn-materioa.netlify.app';
        if (url.includes(cdnDomain)) {
            // Extract the path after the domain
            let resourcePath = url.replace(cdnDomain + '/', '');
            
            // Special handling for Vault (semester 9999)
            // Format: pdfs/9999/UUID/vault/filename.pdf
            const vaultMatch = resourcePath.match(/^pdfs\/9999\/([a-f0-9-]{36})\/(.+)$/i);
            if (vaultMatch) {
                const uuid = vaultMatch[1];  // 36-char UUID (32 chars + 4 hyphens)
                const vaultPath = vaultMatch[2];  // Everything after UUID (e.g., "vault/filename.pdf")
                
                // Reconstruct path: pdfs/9999/uuid/vault/...
                resourcePath = `pdfs/9999/${uuid}/${vaultPath}`;
                console.log('[Local CDN] Vault path detected:', resourcePath);
            }
            
            // Check if local path is HTTP URL (localhost server) or file path
            let transformedUrl;
            if (localPath.startsWith('http://') || localPath.startsWith('https://')) {
                // It's a localhost server URL - ensure ends with /
                const basePath = localPath.endsWith('/') ? localPath : localPath + '/';
                transformedUrl = basePath + resourcePath;
            } else {
                // It's a file path - convert to file:// URL
                // Note: This may not work in all browsers due to CORS
                // Normalize both paths to use forward slashes for file:// URLs
                const normalizedLocalPath = localPath.replace(/\\/g, '/');
                const normalizedResourcePath = resourcePath.replace(/\\/g, '/');
                
                // Ensure no double slashes
                const separator = normalizedLocalPath.endsWith('/') ? '' : '/';
                transformedUrl = 'file:///' + normalizedLocalPath + separator + normalizedResourcePath;
            }
            
            console.log('[Local CDN] Transformed:', url, '->', transformedUrl);
            return transformedUrl;
        }
        
        return url;
    }
    
    /**
     * Check if running on Windows
     */
    function isWindows() {
        const platform = navigator.platform.toLowerCase();
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Check platform
        if (platform.includes('win')) {
            return true;
        }
        
        // Check user agent as fallback
        if (userAgent.includes('windows') || userAgent.includes('win32') || userAgent.includes('win64')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Initialize Local CDN UI
     */
    function initializeUI() {
        // Only show for Super users on Windows
        if (!isSuperUser()) {
            return;
        }
        
        if (!isWindows()) {
            console.log('[Local CDN] Feature only available on Windows');
            return;
        }
        
        const localCdnCard = document.getElementById('localCdnCard');
        const localTabLink = document.getElementById('localTabLink');
        const localCdnToggle = document.getElementById('localCdnToggle');
        const localCdnSettings = document.getElementById('localCdnSettings');
        const localCdnPath = document.getElementById('localCdnPath');
        const saveButton = document.getElementById('saveLocalCdnPath');
        
        if (!localCdnCard) {
            console.warn('[Local CDN] UI elements not found');
            return;
        }
        
        // Show the card and tab link for super users on Windows
        localCdnCard.style.display = 'block';
        if (localTabLink) {
            localTabLink.style.display = 'flex';
        }
        
        // Load saved settings
        const savedPath = getLocalCdnPath();
        const isEnabled = isLocalCdnEnabled();
        
        if (localCdnPath) {
            localCdnPath.value = savedPath;
        }
        
        if (localCdnToggle) {
            localCdnToggle.checked = isEnabled;
            if (isEnabled && localCdnSettings) {
                localCdnSettings.style.display = 'block';
            }
        }
        
        // Toggle event
        if (localCdnToggle) {
            localCdnToggle.addEventListener('change', function() {
                const enabled = this.checked;
                setLocalCdnEnabled(enabled);
                
                if (localCdnSettings) {
                    localCdnSettings.style.display = enabled ? 'block' : 'none';
                }
                
                if (enabled && !savedPath) {
                    // Show notification to set path
                    showNotification('Please set your local CDN path', 'info');
                }
            });
        }
        
        // Save button event
        if (saveButton) {
            saveButton.addEventListener('click', async function() {
                const path = localCdnPath.value.trim();
                
                if (!path) {
                    showNotification('Please enter a valid path', 'error');
                    return;
                }
                
                // Validate path format (Windows path or localhost URL)
                const isWindowsPath = path.match(/^[A-Za-z]:[\\\/]/);
                const isLocalhost = path.match(/^https?:\/\/(localhost|127\.0\.0\.1)/);
                
                if (!isWindowsPath && !isLocalhost) {
                    showNotification('Path should be Windows format (E:\\GitHub\\cdn-materio) or localhost URL (http://localhost:8080)', 'error');
                    return;
                }
                
                // Test connection if it's a localhost URL
                if (isLocalhost) {
                    saveButton.disabled = true;
                    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 5px;"></i>Testing...';
                    
                    try {
                        const testUrl = path.endsWith('/') ? path : path + '/';
                        const response = await fetch(testUrl + 'databases/beta/resource.lib.json', {
                            method: 'HEAD',
                            mode: 'cors'
                        });
                        
                        if (response.ok) {
                            setLocalCdnPath(path);
                            updateServerStatus(true, 'Server connected');
                            // showNotification('<i class="fa-solid fa-check"></i> Local CDN connected successfully!', 'success');
                        } else {
                            throw new Error('File not found');
                        }
                    } catch (error) {
                        console.error('[Local CDN] Connection test failed:', error);
                        updateServerStatus(false, 'Cannot connect - Start server first');
                        showNotification('⚠️ Cannot connect to local server. Please check:\n1. Server is running (python scripts/cors-server.py 8080)\n2. resource.lib.json exists in databases/beta/', 'error');
                    } finally {
                        saveButton.disabled = false;
                        saveButton.innerHTML = '<i class="fas fa-save" style="margin-right: 5px;"></i>Save Path';
                    }
                } else {
                    // File path - just save without testing
                    setLocalCdnPath(path);
                    updateServerStatus(false, 'Using file path (may not work)');
                    showNotification('⚠️ Path saved. Note: File paths may not work due to browser CORS restrictions. Use localhost server instead.', 'info');
                }
            });
            
            // Hover effect
            saveButton.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
            });
            saveButton.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        }
    }
    
    /**
     * Update server status indicator
     */
    function updateServerStatus(isConnected, message) {
        const statusEl = document.getElementById('serverStatus');
        const iconEl = document.getElementById('serverStatusIcon');
        const textEl = document.getElementById('serverStatusText');
        
        if (!statusEl || !iconEl || !textEl) return;
        
        statusEl.style.display = 'block';
        iconEl.style.color = isConnected ? '#4caf50' : '#f44336';
        iconEl.style.fontSize = '8px';
        iconEl.style.marginRight = '6px';
        textEl.textContent = message;
    }
    
    /**
     * Show notification
     */
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            max-width: 400px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Manrope', sans-serif;
            font-size: 14px;
            font-weight: 600;
            animation: slideIn 0.3s ease;
            white-space: pre-line;
            line-height: 1.5;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, type === 'error' ? 5000 : 3000); // Show errors longer
    }
    
    // Terminal Logger functionality
    function initializeTerminal() {
        const serverTerminal = document.getElementById('serverTerminal');
        const terminalOutput = document.getElementById('terminalOutput');
        const terminalContent = document.getElementById('terminalContent');
        const clearTerminalBtn = document.getElementById('clearTerminal');
        const toggleTerminalBtn = document.getElementById('toggleTerminal');
        
        if (!serverTerminal || !terminalOutput) return;
        
        let isTerminalCollapsed = false;
        let logPollInterval = null;
        let lastLogTimestamp = Date.now();
        let displayedLogs = new Set(); // Track displayed logs to prevent duplicates
        
        // Clear terminal
        if (clearTerminalBtn) {
            clearTerminalBtn.addEventListener('click', () => {
                terminalOutput.innerHTML = '<div class="terminal-line terminal-info"><span class="terminal-timestamp">[' + new Date().toLocaleTimeString('en-US', { hour12: false }) + ']</span> Terminal cleared</div>';
                displayedLogs.clear(); // Reset displayed logs tracking
            });
        }
        
        // Toggle terminal collapse/expand
        if (toggleTerminalBtn) {
            toggleTerminalBtn.addEventListener('click', () => {
                isTerminalCollapsed = !isTerminalCollapsed;
                terminalContent.classList.toggle('collapsed', isTerminalCollapsed);
                toggleTerminalBtn.querySelector('i').className = isTerminalCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            });
        }
        
        // Function to add server log entry (raw format like Apache/Python server)
        window.logServerRequest = function(logLine) {
            if (!terminalOutput) return;
            
            const line = document.createElement('div');
            line.className = 'terminal-line';
            line.style.color = '#d4d4d4';
            line.style.fontFamily = "'Consolas', 'Monaco', monospace";
            line.style.fontSize = '12px';
            line.textContent = logLine;
            
            // Color code based on status code
            if (logLine.includes(' 200 ')) {
                line.style.color = '#4ec9b0'; // Green for 200 OK
            } else if (logLine.includes(' 304 ')) {
                line.style.color = '#4fc1ff'; // Blue for 304 Not Modified
            } else if (logLine.includes(' 404 ')) {
                line.style.color = '#f48771'; // Red for 404
            } else if (logLine.includes(' 500 ') || logLine.includes(' 503 ')) {
                line.style.color = '#f48771'; // Red for server errors
            }
            
            terminalOutput.appendChild(line);
            
            // Auto-scroll to bottom
            if (terminalContent && !isTerminalCollapsed) {
                terminalContent.scrollTop = terminalContent.scrollHeight;
            }
            
            // Show terminal if hidden
            if (serverTerminal.style.display === 'none') {
                serverTerminal.style.display = 'block';
            }
            
            // Limit log entries to prevent memory issues (keep last 200)
            const lines = terminalOutput.querySelectorAll('.terminal-line');
            if (lines.length > 200) {
                lines[0].remove();
            }
        };
        
        // Function to poll server logs
        async function pollServerLogs() {
            const localPath = getLocalCdnPath();
            if (!localPath || !isLocalCdnEnabled()) {
                return;
            }
            
            // Only poll if it's a localhost server
            if (!localPath.startsWith('http://') && !localPath.startsWith('https://')) {
                return;
            }
            
            try {
                const logsUrl = localPath + (localPath.endsWith('/') ? '' : '/') + '.logs';
                const response = await fetch(logsUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const logs = await response.text();
                    if (logs && logs.trim()) {
                        const logLines = logs.trim().split('\n');
                        logLines.forEach(logLine => {
                            if (logLine.trim() && !displayedLogs.has(logLine)) {
                                displayedLogs.add(logLine);
                                window.logServerRequest(logLine);
                                
                                // Prevent Set from growing too large (keep last 200 unique logs)
                                if (displayedLogs.size > 200) {
                                    const firstLog = displayedLogs.values().next().value;
                                    displayedLogs.delete(firstLog);
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                // Silently fail - server might not support logs endpoint
                console.debug('[Terminal] Log polling failed:', error.message);
            }
        }
        
        // Start/stop log polling based on CDN state
        function updateLogPolling() {
            if (isLocalCdnEnabled() && getLocalCdnPath()) {
                if (!logPollInterval) {
                    // Poll every 2 seconds
                    logPollInterval = setInterval(pollServerLogs, 2000);
                    pollServerLogs(); // Initial poll
                    
                    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
                    terminalOutput.innerHTML = `<div class="terminal-line terminal-info"><span class="terminal-timestamp">[${timestamp}]</span> Monitoring server logs...</div>`;
                    serverTerminal.style.display = 'block';
                }
            } else {
                if (logPollInterval) {
                    clearInterval(logPollInterval);
                    logPollInterval = null;
                }
            }
        }
        
        // Monitor local CDN toggle
        const localCdnToggle = document.getElementById('localCdnToggle');
        if (localCdnToggle) {
            localCdnToggle.addEventListener('change', function() {
                updateLogPolling();
                
                if (this.checked) {
                    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
                    const line = document.createElement('div');
                    line.className = 'terminal-line terminal-success';
                    line.innerHTML = `<span class="terminal-timestamp">[${timestamp}]</span> <span style="color: #4ec9b0;">Local CDN enabled - Starting log monitor</span>`;
                    terminalOutput.appendChild(line);
                } else {
                    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
                    const line = document.createElement('div');
                    line.className = 'terminal-line terminal-warning';
                    line.innerHTML = `<span class="terminal-timestamp">[${timestamp}]</span> <span style="color: #dcdcaa;">Local CDN disabled - Stopping log monitor</span>`;
                    terminalOutput.appendChild(line);
                }
            });
        }
        
        // Initialize polling if already enabled
        updateLogPolling();
        
        // Monitor window visibility to pause/resume polling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && logPollInterval) {
                clearInterval(logPollInterval);
                logPollInterval = null;
            } else if (!document.hidden) {
                updateLogPolling();
            }
        });
        
        console.log('[Terminal] Server log monitor initialized');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeUI();
            initializeTerminal();
        });
    } else {
        initializeUI();
        initializeTerminal();
    }
    
    // Expose public API
    window.MaterioLocalCDN = {
        transformUrl: transformCdnUrl,
        isEnabled: isLocalCdnEnabled,
        getPath: getLocalCdnPath,
        setPath: setLocalCdnPath,
        setEnabled: setLocalCdnEnabled
    };
    
    console.log('[Local CDN] Module loaded - Super user feature');
    
})();
