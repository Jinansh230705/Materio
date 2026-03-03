// ================================================
// KEYBOARD SHORTCUTS SYSTEM
// ================================================
// Features:
// - OS detection for macOS-friendly labels
// - Customizable shortcuts with localStorage persistence
// - Full keyboard event handling
// ================================================

(function () {
    'use strict';

    // Detect if macOS
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
        navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

    // Key label mappings for different OS
    const keyLabels = {
        ctrl: isMac ? '⌘' : 'Ctrl',
        alt: isMac ? '⌥' : 'Alt',
        shift: '⇧',
        escape: 'Esc',
        backspace: '⌫',
        enter: '↵'
    };

    // Default shortcuts configuration
    const defaultShortcuts = {
        // Navigation (Alt + key for cross-tab navigation)
        nav_home: { keys: { alt: true, key: 'h' }, display: 'Alt+H', action: 'navigateToTab', params: 'home' },
        nav_chat: { keys: { alt: true, key: 'c' }, display: 'Alt+C', action: 'navigateToTab', params: 'chat' },
        nav_notifications: { keys: { alt: true, key: 'n' }, display: 'Alt+N', action: 'navigateToTab', params: 'notifications' },
        nav_settings: { keys: { alt: true, key: 's' }, display: 'Alt+S', action: 'openSettings', params: null },
        nav_profile: { keys: { alt: true, key: 'p' }, display: 'Alt+P', action: 'navigateToProfile', params: null },
        nav_downloads: { keys: { alt: true, key: 'd' }, display: 'Alt+D', action: 'navigateToDownloads', params: null },

        // Reading
        reading_start: { keys: { shift: true, key: 'Enter' }, display: 'Shift+Enter', action: 'startReading', params: null },
        reading_fullscreen: { keys: { shift: true, key: 'f' }, display: 'Shift+F', action: 'toggleViewerFullscreen', params: null },
        reading_bookmark: { keys: { shift: true, key: 'b' }, display: 'Shift+B', action: 'downloadBookmark', params: null },
        reading_mode_inversion: { keys: { alt: true, key: 'i' }, display: 'Alt+I', action: 'toggleInversion', params: null },
        reading_mode_paper: { keys: { alt: true, shift: true, key: 'p' }, display: 'Alt+Shift+P', action: 'togglePaperMode', params: null },
        reading_cycle_texture: { keys: { ctrl: true, shift: true, key: '1' }, display: 'Ctrl+Shift+!', action: 'cyclePaperTexture', params: null },
        reading_mode_eink: { keys: { alt: true, key: 'e' }, display: 'Alt+E', action: 'toggleEinkMode', params: null },

        // Search
        search_finder: { keys: { ctrl: true, key: 'k' }, display: 'Ctrl+K', action: 'openFinder', params: null },
        search_ai_mode: { keys: { ctrl: true, shift: true, key: 'k' }, display: 'Ctrl+Shift+K', action: 'toggleFinderAI', params: null },
        clear_search: { keys: { shift: true, key: 'Backspace' }, display: 'Shift+Backspace', action: 'clearSearch', params: null },

        // Actions
        show_shortcuts: { keys: { shift: true, key: '?' }, display: 'Shift+?', action: 'showShortcuts', params: null },
        close_popup: { keys: { key: 'Escape' }, display: 'Escape', action: 'closePopup', params: null },
        toggle_dark_mode: { keys: { ctrl: true, shift: true, key: 'd' }, display: 'Ctrl+Shift+D', action: 'toggleDarkMode', params: null },

        // Settings Toggles
        toggle_wallpaper: { keys: { ctrl: true, alt: true, key: 'w' }, display: 'Ctrl+Alt+W', action: 'toggleWallpaper', params: null },

        toggle_insightroom: { keys: { alt: true, shift: true, key: 'n' }, display: 'Alt+Shift+N', action: 'toggleInsightroom', params: null },
        toggle_insightroom_view: { keys: { ctrl: true, shift: true, key: 'i' }, display: 'Ctrl+Shift+I', action: 'toggleInsightroomView', params: null },
        clear_data: { keys: { ctrl: true, key: 'Backspace' }, display: 'Ctrl+Backspace', action: 'clearData', params: null },
        clear_all_data: { keys: { ctrl: true, shift: true, key: 'Backspace' }, display: 'Ctrl+Shift+Backspace', action: 'clearAllData', params: null }
    };

    // Current shortcuts (loaded from localStorage or defaults)
    let shortcuts = {};

    // Edit mode state
    let editingShortcutId = null;
    let capturedKeys = null;
    let capturedDisplay = '';
    const activeKeys = new Set();

    // Double-tap Shift toggle for number/symbol display
    let showSymbolsMode = false;
    let lastShiftPressTime = 0;
    const DOUBLE_TAP_THRESHOLD = 300; // milliseconds

    // ================================================
    // INITIALIZATION
    // ================================================

    function init() {
        loadShortcuts();
        renderShortcuts();
        setupKeyListeners();
        setupEditListeners();
    }

    function loadShortcuts() {
        const saved = localStorage.getItem('materioKeyboardShortcuts');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
                for (const id in parsed) {
                    if (shortcuts[id]) {
                        shortcuts[id].keys = parsed[id].keys;
                        shortcuts[id].display = parsed[id].display;
                    }
                }
            } catch (e) {
                console.error('Failed to parse saved shortcuts:', e);
                shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
            }
        } else {
            shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
        }
    }

    function saveShortcuts() {
        const customized = {};
        for (const id in shortcuts) {
            if (shortcuts[id].display !== defaultShortcuts[id].display) {
                customized[id] = {
                    keys: shortcuts[id].keys,
                    display: shortcuts[id].display
                };
            }
        }
        if (Object.keys(customized).length > 0) {
            localStorage.setItem('materioKeyboardShortcuts', JSON.stringify(customized));
        } else {
            localStorage.removeItem('materioKeyboardShortcuts');
        }
    }

    function resetShortcuts() {
        shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
        localStorage.removeItem('materioKeyboardShortcuts');
        renderShortcuts();
    }

    // ================================================
    // RENDERING
    // ================================================

    function formatKeyDisplay(display) {
        if (!display) return '';
        const keys = display.split('+');
        return keys.map(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'ctrl') return keyLabels.ctrl;
            if (lowerKey === 'alt') return keyLabels.alt;
            if (lowerKey === 'shift') return keyLabels.shift;
            if (lowerKey === 'escape') return keyLabels.escape;
            if (lowerKey === 'backspace') return keyLabels.backspace;
            if (lowerKey === 'enter') return keyLabels.enter;
            return key;
        }).join(' + ');
    }

    function formatKeyDisplayKbd(display) {
        if (!display) return '';
        const keys = display.split('+');
        return keys.map(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'ctrl') return `<kbd>${keyLabels.ctrl}</kbd>`;
            if (lowerKey === 'alt') return `<kbd>${keyLabels.alt}</kbd>`;
            if (lowerKey === 'shift') return `<kbd>${keyLabels.shift}</kbd>`;
            if (lowerKey === 'escape') return `<kbd>${keyLabels.escape}</kbd>`;
            if (lowerKey === 'backspace') return `<kbd>${keyLabels.backspace}</kbd>`;
            if (lowerKey === 'enter') return `<kbd>${keyLabels.enter}</kbd>`;
            return `<kbd>${key}</kbd>`;
        }).join(' ');
    }

    function renderShortcuts() {
        const items = document.querySelectorAll('.shortcut-item[data-shortcut-id]');
        items.forEach(item => {
            const id = item.dataset.shortcutId;
            const keysContainer = item.querySelector('.shortcut-keys');
            if (shortcuts[id] && keysContainer) {
                keysContainer.textContent = formatKeyDisplay(shortcuts[id].display);
                if (shortcuts[id].display !== defaultShortcuts[id].display) {
                    item.classList.add('customized');
                } else {
                    item.classList.remove('customized');
                }
            }
        });
    }

    // ================================================
    // KEY LISTENERS
    // ================================================

    function setupKeyListeners() {
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyUp, true);
        window.addEventListener('blur', () => activeKeys.clear());
    }

    // Helper function to normalize key from event.code to a readable key name
    function normalizeKeyFromCode(code) {
        if (!code) return null;
        const codeLower = code.toLowerCase();

        // Map key codes to readable key names
        if (codeLower.startsWith('key')) {
            return codeLower.slice(3); // KeyA -> a
        }
        if (codeLower.startsWith('digit')) {
            return codeLower.slice(5); // Digit1 -> 1
        }

        // Special key mappings
        const codeMap = {
            'backquote': '`',
            'minus': '-',
            'equal': '=',
            'bracketleft': '[',
            'bracketright': ']',
            'backslash': '\\',
            'semicolon': ';',
            'quote': "'",
            'comma': ',',
            'period': '.',
            'slash': '/',
            'space': 'space',
            'enter': 'enter',
            'backspace': 'backspace',
            'tab': 'tab',
            'escape': 'escape',
            'arrowup': 'arrowup',
            'arrowdown': 'arrowdown',
            'arrowleft': 'arrowleft',
            'arrowright': 'arrowright'
        };

        return codeMap[codeLower] || null;
    }

    function handleKeyDown(e) {
        // Track held keys (exclude modifiers which are handled via e.ctrlKey etc)
        const ignoreKeys = ['control', 'alt', 'shift', 'meta'];
        if (!ignoreKeys.includes(e.key.toLowerCase())) {
            // Use normalized key from code for consistency (avoids shifted characters like ?)
            const normalizedKey = normalizeKeyFromCode(e.code) || e.key.toLowerCase();
            activeKeys.add(normalizedKey);
        }

        if (editingShortcutId) {
            handleEditKeyDown(e);
            return;
        }

        const tagName = document.activeElement.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || document.activeElement.isContentEditable;
        if (isInput && e.key !== 'Escape') return;

        const matched = matchShortcut(e);
        if (matched) {
            e.preventDefault();
            e.stopPropagation();
            executeAction(matched);
        }
    }

    function handleKeyUp(e) {
        // Use normalized key from code for consistency
        const normalizedKey = normalizeKeyFromCode(e.code) || e.key.toLowerCase();
        if (activeKeys.has(normalizedKey)) {
            activeKeys.delete(normalizedKey);
        }
        // Also try to delete the raw key in case it was added differently
        if (activeKeys.has(e.key.toLowerCase())) {
            activeKeys.delete(e.key.toLowerCase());
        }
    }

    function matchShortcut(e) {
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        const alt = e.altKey;
        const shift = e.shiftKey;

        for (const id in shortcuts) {
            const shortcut = shortcuts[id];
            const k = shortcut.keys;

            // Check modifiers
            const ctrlMatch = (k.ctrl === true) === ctrl;
            const altMatch = (k.alt === true) === alt;
            const shiftMatch = (k.shift === true) === shift;

            if (!ctrlMatch || !altMatch || !shiftMatch) continue;

            // Check non-modifier keys
            // Normalize k.key/k.keys to array
            const targetKeys = k.keys ? (Array.isArray(k.keys) ? k.keys : [k.keys]) : (k.key ? [k.key] : []);

            if (targetKeys.length === 0) continue;

            // Special key code mapping for non-alphanumeric keys
            const specialKeyCodes = {
                '`': 'backquote',
                '~': 'backquote',
                '-': 'minus',
                '=': 'equal',
                '[': 'bracketleft',
                ']': 'bracketright',
                '\\': 'backslash',
                ';': 'semicolon',
                "'": 'quote',
                ',': 'comma',
                '.': 'period',
                '/': 'slash'
            };

            // 1. Trigger condition: The current key event must correspond to one of the target keys
            // (either character match or code match fallbacks)
            let triggers = false;
            const codeLower = e.code ? e.code.toLowerCase() : '';

            for (const tk of targetKeys) {
                const tkLower = tk.toLowerCase();
                if (tkLower === key) { triggers = true; break; }
                if (codeLower === `key${tkLower}`) { triggers = true; break; }
                // Check digit codes (digit1 matches '1', etc.)
                if (/^[0-9]$/.test(tk) && codeLower === `digit${tk}`) { triggers = true; break; }
                // Check special key codes
                if (specialKeyCodes[tk] && codeLower === specialKeyCodes[tk]) { triggers = true; break; }
            }
            if (!triggers) continue;

            // 2. All target keys must be held
            let allHeld = true;
            for (const tk of targetKeys) {
                const tkLower = tk.toLowerCase();
                // We check if it's in activeKeys OR it's the current key event (which implies its pressed)
                // Also check special key codes for non-alphanumeric keys and digit codes
                const isHeld = activeKeys.has(tkLower) ||
                    (tkLower === key) ||
                    (codeLower === `key${tkLower}`) ||
                    (/^[0-9]$/.test(tk) && codeLower === `digit${tk}`) ||
                    (specialKeyCodes[tk] && codeLower === specialKeyCodes[tk]);
                if (!isHeld) {
                    allHeld = false;
                    break;
                }
            }

            if (allHeld) {
                return shortcut;
            }
        }
        return null;
    }

    // ================================================
    // SHORTCUT ACTIONS
    // ================================================

    function executeAction(shortcut) {
        const actions = {
            navigateToTab: (tab) => {
                const tabLink = document.querySelector(`.tab-link[data-tab="${tab}"]`);
                if (tabLink) tabLink.click();
            },

            navigateToProfile: () => {
                window.location.href = '/account/profile';
            },

            navigateToDownloads: () => {
                const settingsLink = document.querySelector('.tab-link[data-tab="settings"]');
                if (settingsLink) settingsLink.click();
                setTimeout(() => {
                    const downloadsLink = document.querySelector('[data-action="downloads"]');
                    if (downloadsLink) downloadsLink.click();
                }, 100);
            },

            openSettings: () => {
                // Click the settings dropdown item
                const settingsItem = document.querySelector('[data-action="settings"]');
                if (settingsItem) settingsItem.click();
            },

            startReading: () => {
                const submitBtn = document.getElementById('submitButton');
                if (submitBtn) submitBtn.click();
            },

            toggleViewerFullscreen: () => {
                const fullscreenBtn = document.getElementById('fullscreenButton');
                if (fullscreenBtn) {
                    // If we're currently in fullscreen and about to exit, set the intentional flag
                    if (document.fullscreenElement && typeof window.setIntentionalFullscreenExit === 'function') {
                        window.setIntentionalFullscreenExit(true);
                    }
                    fullscreenBtn.click();
                }
            },

            downloadBookmark: () => {
                const downloadBtn = document.getElementById('downloadButton');
                if (downloadBtn) downloadBtn.click();
            },

            toggleInversion: () => {
                const toggle = document.getElementById('invertModeToggle');
                if (toggle) toggle.click();
            },

            togglePaperMode: () => {
                const toggle = document.getElementById('paperModeToggle');
                if (toggle) toggle.click();
            },

            cyclePaperTexture: () => {
                // Available textures in order
                const textures = ['black-paper', 'cardboard-flat', 'light-paper-fibers', 'sandpaper', 'textured-paper', 'gaussian'];
                const textureNames = {
                    'black-paper': 'Black Paper',
                    'cardboard-flat': 'Cardboard',
                    'light-paper-fibers': 'Light Paper',
                    'sandpaper': 'Sandpaper',
                    'textured-paper': 'Textured Paper',
                    'gaussian': 'Gaussian'
                };

                // Get current texture from cookie or default
                const getCookieValue = (name) => {
                    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
                    return match ? match[2] : null;
                };

                const currentTexture = getCookieValue('paperTexture') || 'black-paper';
                const currentIndex = textures.indexOf(currentTexture);
                const nextIndex = (currentIndex + 1) % textures.length;
                const nextTexture = textures[nextIndex];

                // Update the dropdown UI
                const selectedText = document.getElementById('paperTextureSelectedText');
                if (selectedText) {
                    selectedText.textContent = textureNames[nextTexture];
                }

                // Update selected state in dropdown items
                document.querySelectorAll('.paper-texture-item').forEach(item => {
                    if (item.dataset.value === nextTexture) {
                        item.classList.add('selected');
                    } else {
                        item.classList.remove('selected');
                    }
                });

                // Apply the texture change (trigger the same logic as advanced.js)
                const popup = document.getElementById('popup');
                const textureUrl = `/assets/textures/${nextTexture}.png`;
                if (popup) {
                    popup.style.setProperty('--paper-texture-url', `url('${textureUrl}')`);
                }

                // Send to PDF iframe
                const pdfIframe = document.getElementById('pdf-iframe');
                if (pdfIframe) {
                    try {
                        const iframeDoc = pdfIframe.contentDocument;
                        if (iframeDoc && iframeDoc.body) {
                            iframeDoc.body.style.setProperty('--paper-texture-url', `url('${textureUrl}')`);
                        }
                    } catch (e) {
                        // Cross-origin, use postMessage
                        try {
                            pdfIframe.contentWindow.postMessage({
                                type: 'paperTexture',
                                textureUrl: textureUrl
                            }, '*');
                        } catch (err) {
                            // ignore
                        }
                    }
                }

                // Save to cookie
                const date = new Date();
                date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
                document.cookie = `paperTexture=${nextTexture}; expires=${date.toUTCString()}; path=/`;
            },

            toggleEinkMode: () => {
                const toggle = document.getElementById('einkModeToggle');
                if (toggle) toggle.click();
            },

            openFinder: () => {
                const searchInput = document.getElementById('quickSearchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            },

            toggleFinderAI: () => {
                // Toggle AI search mode on/off
                const aiModeBtn = document.getElementById('aiSearchToggle');
                if (aiModeBtn) {
                    aiModeBtn.click();
                }
                setTimeout(() => {
                    const searchInput = document.getElementById('quickSearchInput');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }, 100);
            },

            clearSearch: () => {
                // Clear the search query
                const clearBtn = document.getElementById('clearSearchBtn');
                if (clearBtn) {
                    clearBtn.click();
                } else {
                    // Fallback: directly clear the input
                    const searchInput = document.getElementById('quickSearchInput');
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            },

            showShortcuts: () => {
                if (typeof window.openKeyboardShortcutsModal === 'function') {
                    window.openKeyboardShortcutsModal();
                }
            },

            closePopup: () => {
                // Close keyboard shortcuts modal
                const shortcutsModal = document.getElementById('keyboardShortcutsModal');
                if (shortcutsModal && shortcutsModal.classList.contains('visible')) {
                    if (typeof window.closeKeyboardShortcutsModal === 'function') {
                        window.closeKeyboardShortcutsModal();
                    }
                    return;
                }

                // Close dynamic form modal
                const dynamicFormModal = document.getElementById('dynamicFormModal');
                if (dynamicFormModal && dynamicFormModal.classList.contains('show')) {
                    if (typeof window.closeDynamicForm === 'function') {
                        window.closeDynamicForm();
                    } else {
                        dynamicFormModal.classList.remove('show');
                    }
                    return;
                }

                // Close promo modal
                const promoModal = document.getElementById('promoModal');
                if (promoModal && promoModal.style.display !== 'none' && promoModal.style.display !== '') {
                    if (typeof window.closePromoModal === 'function') {
                        window.closePromoModal();
                    }
                    return;
                }

                // Close #popup by clicking the close button
                const popup = document.getElementById('popup');
                if (popup && (popup.style.display !== 'none' && popup.style.display !== '')) {
                    const closePopupBtn = document.getElementById('closePopup');
                    if (closePopupBtn) {
                        closePopupBtn.click();
                        return;
                    }
                }

                // Note: Fullscreen is NOT exited by ESC - use Shift+F to toggle fullscreen

                // Try to close any other visible modals
                const modals = document.querySelectorAll('.modal.visible, [role="dialog"].visible');
                modals.forEach(m => m.classList.remove('visible'));
            },

            toggleDarkMode: () => {
                const toggle = document.getElementById('themeToggle');
                if (toggle) toggle.click();
            },

            toggleWallpaper: () => {
                const toggle = document.getElementById('enableBgToggle');
                if (toggle) toggle.click();
            },



            toggleInsightroom: () => {
                // Use the global function that properly toggles and persists state
                if (typeof window.toggleInsightroomFeed === 'function') {
                    window.toggleInsightroomFeed();
                } else {
                    // Fallback: click the toggle
                    const toggle = document.getElementById('insightroomToggle');
                    if (toggle) toggle.click();
                }
            },

            toggleInsightroomView: () => {
                const selectedText = document.getElementById('viewStyleSelectedText');
                if (selectedText) {
                    const currentView = selectedText.textContent.toLowerCase();
                    const newView = currentView === 'normal' ? 'folded' : 'normal';
                    const item = document.querySelector(`.view-style-item[data-value="${newView}"]`);
                    if (item) item.click();
                }
            },

            clearData: () => {
                // Call the clearAllSiteData function from main.html
                if (typeof window.clearAllSiteData === 'function') {
                    window.clearAllSiteData();
                } else {
                    // Fallback: click the clear data card
                    const clearCard = document.getElementById('clearSiteDataCard');
                    if (clearCard) {
                        const clickableContainer = clearCard.querySelector('.toggle-container');
                        if (clickableContainer) clickableContainer.click();
                    }
                }
            },

            clearAllData: () => {
                if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie.split(';').forEach(c => {
                        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                    });
                    window.location.reload();
                }
            }
        };

        const actionFn = actions[shortcut.action];
        if (actionFn) {
            actionFn(shortcut.params);
        }
    }

    // ================================================
    // SHORTCUT EDITING
    // ================================================

    function setupEditListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.shortcut-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = e.target.closest('.shortcut-item');
                    if (item) {
                        openEditModal(item.dataset.shortcutId);
                    }
                });
            });

            const cancelBtn = document.getElementById('editCancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeEditModal);
            }

            const saveBtn = document.getElementById('editSaveBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', saveEdit);
            }

            const resetBtn = document.getElementById('resetShortcutsBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (confirm('Reset all shortcuts to defaults?')) {
                        resetShortcuts();
                    }
                });
            }

            const editModal = document.getElementById('shortcutEditModal');
            if (editModal) {
                editModal.addEventListener('click', (e) => {
                    if (e.target === editModal) {
                        closeEditModal();
                    }
                });
            }
        });
    }

    function openEditModal(shortcutId) {
        editingShortcutId = shortcutId;
        capturedKeys = null;
        capturedDisplay = '';
        showSymbolsMode = false;
        lastShiftPressTime = 0;

        const modal = document.getElementById('shortcutEditModal');
        const actionName = document.getElementById('editActionName');
        const keysDisplay = document.getElementById('editKeysDisplay');

        if (!modal) return;

        const item = document.querySelector(`[data-shortcut-id="${shortcutId}"]`);
        if (item && actionName) {
            actionName.textContent = item.querySelector('.shortcut-action').textContent;
        }

        if (keysDisplay) {
            keysDisplay.innerHTML = 'Press new key combination...';
        }

        modal.classList.add('visible');
    }

    function closeEditModal() {
        editingShortcutId = null;
        capturedKeys = null;
        capturedDisplay = '';
        const modal = document.getElementById('shortcutEditModal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    function handleEditKeyDown(e) {
        e.preventDefault();
        e.stopPropagation();

        // Detect double-tap Shift to toggle symbol mode
        if (e.key === 'Shift') {
            const now = Date.now();
            if (now - lastShiftPressTime < DOUBLE_TAP_THRESHOLD) {
                showSymbolsMode = !showSymbolsMode;
                // Show feedback in the display
                const keysDisplayEl = document.getElementById('editKeysDisplay');
                if (keysDisplayEl && capturedDisplay) {
                    // Re-render with new mode
                    const modeLabel = showSymbolsMode ? ' (symbols)' : ' (numbers)';
                    keysDisplayEl.innerHTML = formatKeyDisplayKbd(capturedDisplay) +
                        `<span style="opacity: 0.5; font-size: 11px;">${modeLabel}</span>`;
                }
            }
            lastShiftPressTime = now;
        }

        const keys = {
            ctrl: e.ctrlKey || e.metaKey,
            alt: e.altKey,
            shift: e.shiftKey
        };

        const displayParts = [];
        if (keys.ctrl) displayParts.push(isMac ? 'Cmd' : 'Ctrl');
        if (keys.alt) displayParts.push(isMac ? 'Option' : 'Alt');
        if (keys.shift) displayParts.push('Shift');

        // Capture non-modifier keys from activeKeys set
        const currentKeys = Array.from(activeKeys);

        // Shift+number symbol mappings for symbol mode
        const shiftSymbols = {
            '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
            '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
            '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|',
            ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
            '`': '~'
        };

        currentKeys.forEach(k => {
            let keyName = k;
            // Format the key name for display
            if (keyName === 'space' || keyName === ' ') keyName = 'Space';
            else if (keyName === 'enter') keyName = 'Enter';
            else if (keyName === 'backspace') keyName = 'Backspace';
            else if (keyName === 'escape') keyName = 'Escape';
            else if (keyName === 'tab') keyName = 'Tab';
            else if (keyName.startsWith('arrow')) keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
            // Show shifted symbols if symbol mode is enabled and Shift is pressed
            else if (showSymbolsMode && keys.shift && shiftSymbols[keyName]) keyName = shiftSymbols[keyName];
            else if (keyName.length === 1) keyName = keyName.toUpperCase();
            displayParts.push(keyName);
        });

        if (displayParts.length > 0) {
            // Update display
            const currentDisplay = displayParts.join('+');
            const keysDisplayEl = document.getElementById('editKeysDisplay');
            if (keysDisplayEl) {
                const modeLabel = (showSymbolsMode && keys.shift) ? ' (symbols)' : '';
                keysDisplayEl.innerHTML = formatKeyDisplayKbd(currentDisplay) +
                    (modeLabel ? `<span style="opacity: 0.5; font-size: 11px;">${modeLabel}</span>` : '');
            }

            // Capture logic
            // We require at least one non-modifier key to save, 
            // OR if the user is pressing modifiers only? No, standard is Key.
            if (currentKeys.length > 0) {
                // Add keys array to keys object
                keys.keys = currentKeys;
                capturedKeys = keys;
                capturedDisplay = currentDisplay;
            }
        }
    }

    function saveEdit() {
        if (!editingShortcutId || !capturedKeys) {
            closeEditModal();
            return;
        }

        let normalizedDisplay = capturedDisplay
            .replace('Cmd', 'Ctrl')
            .replace('Option', 'Alt');

        shortcuts[editingShortcutId].keys = capturedKeys;
        shortcuts[editingShortcutId].display = normalizedDisplay;

        saveShortcuts();
        renderShortcuts();
        closeEditModal();
    }

    // ================================================
    // EXPOSE GLOBALS
    // ================================================

    window.materioShortcuts = {
        init,
        reset: resetShortcuts,
        getShortcuts: () => ({ ...shortcuts }),
        isMac
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
