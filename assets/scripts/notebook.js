/**
 * Notebook Module (ESM)
 * Rich text note-taking with markdown support, PDF linking, and AI writing
 * 
 * Features:
 * - Markdown formatting
 * - LaTeX/KaTeX support
 * - Syntax highlighting
 * - PDF linking
 * - localStorage persistence
 * - Cloud sync for Plus/Super users
 * - AI writing for Super users
 */

// ================================================
// CONSTANTS
// ================================================

const STORAGE_KEY = 'materio_notebooks';
const CLOUD_SYNC_ENDPOINT = '/api/v2/features?action=notebooks';
// const AI_CHAT_ENDPOINT = '/api/v1/chat';

// Default notebook structure
const createDefaultNotebook = () => ({
    id: generateId(),
    title: '',
    content: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkedPdf: null,
    tags: [],
    syncedToCloud: false
});

// ================================================
// UTILITIES
// ================================================

/**
 * Generate a unique ID for notebooks
 */
function generateId() {
    return 'nb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Format date for display
 */
function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

/**
 * Count words in text/HTML content
 */
function countWords(content) {
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').filter(w => w.length > 0).length : 0;
}

/**
 * Debounce function for auto-save
 */
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Convert HTML to Markdown (basic conversion)
 */
function htmlToMarkdown(html) {
    let md = html;

    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');

    // Bold, Italic, Strikethrough
    md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
    md = md.replace(/<(del|s|strike)[^>]*>(.*?)<\/(del|s|strike)>/gi, '~~$2~~');

    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

    // Lists
    md = md.replace(/<ul[^>]*>/gi, '\n');
    md = md.replace(/<\/ul>/gi, '\n');
    md = md.replace(/<ol[^>]*>/gi, '\n');
    md = md.replace(/<\/ol>/gi, '\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

    // Blockquote
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n');

    // Code blocks
    md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n');
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

    // Horizontal rule
    md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

    // Paragraphs and line breaks
    md = md.replace(/<\/p>/gi, '\n\n');
    md = md.replace(/<p[^>]*>/gi, '');
    md = md.replace(/<br[^>]*\/?>/gi, '\n');

    // Clean up divs
    md = md.replace(/<\/?div[^>]*>/gi, '\n');

    // Remove remaining HTML tags
    md = md.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = md;
    md = textarea.value;

    // Clean up whitespace
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
}

/**
 * Basic markdown to HTML conversion
 */
function markdownToHtml(md) {
    let html = md;

    // Escape HTML
    html = html.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks (before other processing)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold, Italic, Strikethrough
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Blockquote
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Checkboxes
    html = html.replace(/\[ \]/g, '<input type="checkbox">');
    html = html.replace(/\[x\]/gi, '<input type="checkbox" checked>');

    // Paragraphs
    html = html.split('\n\n').map(para => {
        if (para.trim() &&
            !para.startsWith('<h') &&
            !para.startsWith('<pre') &&
            !para.startsWith('<ul') &&
            !para.startsWith('<ol') &&
            !para.startsWith('<blockquote') &&
            !para.startsWith('<hr')) {
            return `<p>${para.replace(/\n/g, '<br>')}</p>`;
        }
        return para;
    }).join('\n');

    return html;
}

// ================================================
// NOTEBOOK MANAGER CLASS
// ================================================

class NotebookManager {
    constructor() {
        this.notebooks = [];
        this.currentNotebook = null;
        this.isOpen = false;
        this.isDirty = false;
        this.isPlusUser = false;
        this.hasAdminPrivileges = false; // Super user
        this.isLoggedIn = false;
        this.aiAbortController = null;

        this.init();
    }

    /**
     * Initialize the notebook manager
     */
    init() {
        this.loadFromStorage();
        this.detectUserPrivileges(); // Async but don't await
        this.bindEvents();
        this.exposeGlobalAPI();
    }

    /**
     * Load notebooks from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            this.notebooks = data ? JSON.parse(data) : [];
        } catch (e) {
            this.notebooks = [];
        }
    }

    /**
     * Save notebooks to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notebooks));
        } catch (e) {
            // Failed to save to storage
        }
    }

    /**
     * Detect user privileges from API/localStorage
     * Uses hasAdminPrivileges for super users and isPlusUser for plus users
     */
    async detectUserPrivileges() {
        const token = localStorage.getItem('materio_auth_token');

        if (!token) {
            this.isLoggedIn = false;
            this.isPlusUser = false;
            this.hasAdminPrivileges = false;
            this.updateAIToolbarVisibility();
            return;
        }

        try {
            // Try to get from cached user data first
            const userDataStr = localStorage.getItem('materio_user');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                this.isPlusUser = userData.isPlusUser || false;
                this.hasAdminPrivileges = userData.hasAdminPrivileges || false;
                this.isLoggedIn = true;
            }

            // Also fetch fresh from API
            const response = await fetch('/api/v2/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                this.isPlusUser = data.user?.isPlusUser || false;
                this.hasAdminPrivileges = data.user?.hasAdminPrivileges || false;
                this.isLoggedIn = true;
            }
        } catch (e) {
            // Failed to detect privileges
        }

        this.updateAIToolbarVisibility();

        // Load notebooks from cloud for Plus/Super users
        if (this.isPlusUser || this.hasAdminPrivileges) {
            this.loadFromCloud();
        }
    }

    /**
     * Update AI toolbar visibility based on user privileges
     */
    updateAIToolbarVisibility() {
        const aiToolbar = document.getElementById('notebookAiToolbar');
        if (aiToolbar) {
            // AI writing is available for super (admin) users only
            aiToolbar.style.display = this.hasAdminPrivileges ? 'flex' : 'none';
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Use DOMContentLoaded to ensure elements exist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Modal open/close
        const closeBtn = document.getElementById('notebookCloseBtn');
        const backdrop = document.getElementById('notebookBackdrop');

        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (backdrop) backdrop.addEventListener('click', () => this.close());

        // Editor events
        const editor = document.getElementById('notebookEditor');
        if (editor) {
            editor.addEventListener('input', debounce(() => this.onEditorChange(), 500));
            editor.addEventListener('keydown', (e) => this.handleEditorKeydown(e));
            editor.addEventListener('paste', (e) => this.handlePaste(e));
        }

        // Title input
        const titleInput = document.getElementById('notebookTitleInput');
        if (titleInput) {
            titleInput.addEventListener('input', debounce(() => this.onTitleChange(), 500));
        }

        // Toolbar buttons
        const toolbar = document.getElementById('notebookToolbar');
        if (toolbar) {
            toolbar.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
                btn.addEventListener('click', () => this.handleToolbarAction(btn.dataset.action));
            });
        }

        // Footer buttons
        const saveBtn = document.getElementById('notebookSaveBtn');
        const previewBtn = document.getElementById('notebookPreviewBtn');
        const exportBtn = document.getElementById('notebookExportBtn');
        const deleteBtn = document.getElementById('notebookDeleteBtn');

        if (saveBtn) saveBtn.addEventListener('click', () => this.save());
        if (previewBtn) previewBtn.addEventListener('click', () => this.showPreview());
        if (exportBtn) exportBtn.addEventListener('click', () => this.showExportOptions());
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteCurrent());

        // AI input
        const aiSubmitBtn = document.getElementById('aiSubmitBtn');
        const aiCancelBtn = document.getElementById('aiCancelBtn');
        const aiPromptInput = document.getElementById('aiPromptInput');
        const aiStopBtn = document.getElementById('aiStopBtn');

        if (aiSubmitBtn) aiSubmitBtn.addEventListener('click', () => this.submitAiPrompt());
        if (aiCancelBtn) aiCancelBtn.addEventListener('click', () => this.hideAiInput());
        if (aiStopBtn) aiStopBtn.addEventListener('click', () => this.stopAiWriting());
        if (aiPromptInput) {
            aiPromptInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.submitAiPrompt();
                }
                if (e.key === 'Escape') {
                    this.hideAiInput();
                }
            });
        }

        // AI suggestions
        document.querySelectorAll('.ai-suggestion').forEach(el => {
            el.addEventListener('click', () => {
                const input = document.getElementById('aiPromptInput');
                if (input) {
                    input.value = el.dataset.prompt;
                    input.focus();
                }
            });
        });

        // Link PDF modal
        const linkPdfCloseBtn = document.getElementById('linkPdfCloseBtn');
        const linkNewNoteBtn = document.getElementById('linkNewNoteBtn');

        if (linkPdfCloseBtn) {
            linkPdfCloseBtn.addEventListener('click', () => this.closeLinkPdfModal());
        }

        if (linkNewNoteBtn) {
            linkNewNoteBtn.addEventListener('click', () => {
                this.closeLinkPdfModal();
                this.open(null, false, true); // Open new note (forceNew = true)
            });
        }

        // Preview modal
        const previewCloseBtn = document.getElementById('notebookPreviewCloseBtn');
        if (previewCloseBtn) {
            previewCloseBtn.addEventListener('click', () => this.closePreviewModal());
        }

        // Export modal
        const exportCloseBtn = document.getElementById('notebookExportCloseBtn');
        if (exportCloseBtn) {
            exportCloseBtn.addEventListener('click', () => this.closeExportModal());
        }

        document.querySelectorAll('.export-option').forEach(el => {
            el.addEventListener('click', () => this.exportAs(el.dataset.format));
        });

        // Manage Notebooks link - close modal and navigate to notebooks tab
        const manageBtn = document.getElementById('notebookManageBtn');
        if (manageBtn) {
            manageBtn.addEventListener('click', (e) => {
                e.preventDefault();

                // Auto-save if dirty and exists
                if (this.isDirty && this.currentNotebook) {
                    const isNew = !this.notebooks.some(n => n.id === this.currentNotebook.id);
                    if (!isNew) {
                        this.save();
                    }
                }

                // Close the modal without prompting (since we're navigating)
                const modal = document.getElementById('notebookModal');
                if (modal) {
                    modal.classList.remove('visible');
                }
                this.isOpen = false;
                this.currentNotebook = null;
                this.isDirty = false;

                // Close any sub-modals
                this.closeLinkPdfModal();
                this.closePreviewModal();
                this.closeExportModal();

                // Navigate to notebooks tab
                const tabLink = document.querySelector('[data-tab="notebooks"]');
                if (tabLink) {
                    tabLink.click();
                } else {
                    // Fallback: directly activate the tab
                    const notebooksTab = document.getElementById('notebooks');
                    if (notebooksTab) {
                        // Hide all tabs
                        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                        // Show notebooks tab
                        notebooksTab.classList.add('active');
                        // Dispatch event for tab logic
                        document.dispatchEvent(new CustomEvent('tabOpened', { detail: { tab: 'notebooks' } }));
                    }
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            // Escape to close
            if (e.key === 'Escape') {
                this.close();
                e.preventDefault();
            }

            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                this.save();
                e.preventDefault();
            }
        });
    }

    /**
     * Expose global API for external access
     */
    exposeGlobalAPI() {
        window.MaterioNotebook = {
            open: (notebookId, viewMode, forceNew, isGeneral) => this.open(notebookId, viewMode, forceNew, isGeneral),
            close: () => this.close(),
            create: (isGeneral) => this.create(isGeneral),
            getAll: () => this.notebooks,
            delete: (id) => this.delete(id),
            deleteCurrent: () => this.deleteCurrent(),
            syncToCloud: () => this.syncToCloud(),
            loadFromCloud: () => this.loadFromCloud()
        };

        // Global function for opening notebook modal
        window.openNotebookModal = (notebookId, viewMode, forceNew, isGeneral) => this.open(notebookId, viewMode, forceNew, isGeneral);
        window.closeNotebookModal = () => this.close();
        window.createNewNotebook = (isGeneral) => this.create(isGeneral);
    }

    // ================================================
    // NOTEBOOK CRUD OPERATIONS
    // ================================================

    /**
     * Create a new notebook
     * @param {boolean} isGeneral - If true, create a general note (not linked to PDF)
     */
    create(isGeneral = false) {
        this.open(null, false, false, isGeneral);
    }

    /**
     * Open a notebook in the modal
     * @param {string|null} notebookId - ID of notebook to open, or null for new
     * @param {boolean} viewMode - If true, open in view mode (default for existing notebooks)
     * @param {boolean} forceNew - If true, force creation of a new note regardless of existing links
     * @param {boolean} isGeneral - If true, create a general note (skip PDF linking)
     */
    async open(notebookId = null, viewMode = null, forceNew = false, isGeneral = false) {
        const modal = document.getElementById('notebookModal');
        if (!modal) {
            console.error('[Notebook] Modal element not found');
            return;
        }

        // Clear any stored content from previous session
        this._originalEditorContent = undefined;

        // Find or create notebook
        if (notebookId) {
            this.currentNotebook = this.notebooks.find(n => n.id === notebookId);
            if (!this.currentNotebook) {
                console.error('[Notebook] Notebook not found:', notebookId);
                return;
            }
            // Default to view mode for existing notebooks if not specified
            if (viewMode === null) viewMode = true;
        } else if (isGeneral) {
            // Force general note
            this.currentNotebook = createDefaultNotebook();
            viewMode = false;
        } else if (!forceNew) {
            // Check if there's already a note linked to the current PDF
            // Only auto-link if the PDF viewer is actually open
            const popup = document.getElementById('popup');
            const isPopupVisible = popup && popup.style.display !== 'none' && !popup.classList.contains('closing');

            const currentPdf = isPopupVisible ? window.currentPdfInfo : null;
            const existingLinkedNote = currentPdf ? this.notebooks.find(n =>
                n.linkedPdf && (n.linkedPdf.id === currentPdf.id || n.linkedPdf.url === currentPdf.url)
            ) : null;

            if (existingLinkedNote) {
                // Prompt user to open existing or create new
                if (window.materioConfirm) {
                    const result = await window.materioConfirm(`A note for "${currentPdf.name}" already exists. Would you like to open it?`, {
                        title: 'Linked Note Found',
                        confirmText: 'Open Existing',
                        cancelText: 'Create New',
                        type: 'info'
                    });

                    if (result) {
                        this.currentNotebook = existingLinkedNote;
                        viewMode = true;
                    } else {
                        // User chose to create new anyway
                        this.currentNotebook = createDefaultNotebook();
                        viewMode = false;
                        this.currentNotebook.linkedPdf = {
                            id: currentPdf.id,
                            url: currentPdf.url,
                            name: currentPdf.name,
                            path: currentPdf.path
                        };
                        this.currentNotebook.title = `Notes on ${currentPdf.name} (New)`;
                    }
                } else {
                    // Fallback to existing behavior if materioConfirm isn't available
                    this.currentNotebook = existingLinkedNote;
                    viewMode = true;
                }
            } else {
                // Create new notebook object but DON'T add to list yet
                this.currentNotebook = createDefaultNotebook();
                viewMode = false; // Always edit mode for new notebooks

                // Auto-link to current PDF if one is open and visible
                if (currentPdf) {
                    this.currentNotebook.linkedPdf = {
                        id: currentPdf.id,
                        url: currentPdf.url,
                        name: currentPdf.name,
                        path: currentPdf.path
                    };
                    this.currentNotebook.title = `Notes on ${currentPdf.name}`;
                }
            }
        } else {
            // Force create new
            this.currentNotebook = createDefaultNotebook();
            viewMode = false;

            // Only auto-link if the PDF viewer is actually open
            const popup = document.getElementById('popup');
            const isPopupVisible = popup && popup.style.display !== 'none' && !popup.classList.contains('closing');
            const currentPdf = isPopupVisible ? window.currentPdfInfo : null;

            if (currentPdf) {
                this.currentNotebook.linkedPdf = {
                    id: currentPdf.id,
                    url: currentPdf.url,
                    name: currentPdf.name,
                    path: currentPdf.path
                };
                this.currentNotebook.title = `Notes on ${currentPdf.name}`;
            }
        }

        // Store current mode
        this.isViewMode = viewMode;

        // Show/hide delete button based on whether it's a new or existing notebook
        const deleteBtn = document.getElementById('notebookDeleteBtn');
        if (deleteBtn) {
            deleteBtn.style.display = notebookId ? 'inline-flex' : 'none';
        }

        // Populate UI
        this.populateEditorFromNotebook();
        this.updateSaveStatus('saved');
        this.isDirty = false;

        // Apply view mode or edit mode
        this.setViewMode(viewMode);

        // Show modal
        modal.classList.add('visible');
        this.isOpen = true;

        // Focus editor only in edit mode
        if (!viewMode) {
            setTimeout(() => {
                const editor = document.getElementById('notebookEditor');
                if (editor) editor.focus();
            }, 300);
        }

        // Check for current PDF in popup
        this.checkCurrentPdf();
    }

    /**
     * Set view or edit mode
     */
    setViewMode(isView) {
        this.isViewMode = isView;
        const editor = document.getElementById('notebookEditor');
        const toolbar = document.getElementById('notebookToolbar');
        const titleInput = document.getElementById('notebookTitleInput');
        const saveBtn = document.getElementById('notebookSaveBtn');
        const editBtn = document.getElementById('notebookEditBtn');

        if (isView) {
            // View mode: disable editing, render content
            if (editor) {
                // Store original HTML for edit mode restoration
                this._originalEditorContent = editor.innerHTML;

                // Convert HTML to markdown, then markdown to rendered HTML
                const markdown = htmlToMarkdown(editor.innerHTML);
                editor.innerHTML = markdownToHtml(markdown);

                editor.contentEditable = 'false';
                editor.classList.add('view-mode');

                // Render syntax highlighting
                if (window.hljs) {
                    editor.querySelectorAll('pre code').forEach(block => {
                        window.hljs.highlightElement(block);
                    });
                }

                // Render LaTeX
                if (window.renderMathInElement) {
                    try {
                        window.renderMathInElement(editor, {
                            delimiters: [
                                { left: '$$', right: '$$', display: true },
                                { left: '$', right: '$', display: false }
                            ],
                            throwOnError: false
                        });
                    } catch (e) {
                        // LaTeX render error
                    }
                }
            }
            if (toolbar) toolbar.style.display = 'none';
            if (titleInput) titleInput.readOnly = true;
            if (saveBtn) saveBtn.style.display = 'none';

            // Show edit button
            if (editBtn) {
                editBtn.style.display = 'inline-flex';
            } else {
                // Create edit button if it doesn't exist
                this.createEditButton();
            }
        } else {
            // Edit mode: enable editing
            if (editor) {
                // Restore original HTML content if we have it
                if (this._originalEditorContent !== undefined) {
                    editor.innerHTML = this._originalEditorContent;
                }
                editor.contentEditable = 'true';
                editor.classList.remove('view-mode');
            }
            if (toolbar) toolbar.style.display = 'flex';
            if (titleInput) titleInput.readOnly = false;
            if (saveBtn) saveBtn.style.display = 'inline-flex';
            if (editBtn) editBtn.style.display = 'none';
        }
    }

    /**
     * Create the edit button dynamically
     */
    createEditButton() {
        const footerActions = document.querySelector('.notebook-footer-actions');
        if (!footerActions) return;

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'notebook-btn notebook-btn-primary';
        editBtn.id = 'notebookEditBtn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
        editBtn.addEventListener('click', () => this.setViewMode(false));

        // Insert at the beginning
        footerActions.insertBefore(editBtn, footerActions.firstChild);
    }

    /**
     * Close the notebook modal
     */
    close() {
        if (this.isDirty) {
            const isNew = !this.notebooks.some(n => n.id === this.currentNotebook.id);
            const message = isNew
                ? 'Discard this new note?'
                : 'You have unsaved changes. Discard them?';

            if (!confirm(message)) {
                return; // User cancelled closing
            }
        }

        const modal = document.getElementById('notebookModal');
        if (modal) {
            modal.classList.remove('visible');
        }

        this.isOpen = false;
        this.currentNotebook = null;
        this.isDirty = false;

        // Close any sub-modals
        this.closeLinkPdfModal();
        this.closePreviewModal();
        this.closeExportModal();
    }

    /**
     * Save current notebook
     */
    save() {
        if (!this.currentNotebook) return;

        const editor = document.getElementById('notebookEditor');
        const titleInput = document.getElementById('notebookTitleInput');

        if (editor) {
            this.currentNotebook.content = editor.innerHTML;
        }

        if (titleInput) {
            this.currentNotebook.title = titleInput.value || 'Untitled Note';
        }

        this.currentNotebook.updatedAt = new Date().toISOString();
        this.currentNotebook.syncedToCloud = false;

        // Update in array or add if new
        const index = this.notebooks.findIndex(n => n.id === this.currentNotebook.id);
        if (index !== -1) {
            this.notebooks[index] = { ...this.currentNotebook };
        } else {
            this.notebooks.unshift({ ...this.currentNotebook });
            // Show delete button now that it's saved
            const deleteBtn = document.getElementById('notebookDeleteBtn');
            if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        }

        this.isDirty = false;
        this.saveToStorage();
        this.updateSaveStatus('saved');

        // Sync to cloud for Plus/Super users
        if (this.isPlusUser || this.hasAdminPrivileges) {
            this.syncNotebookToCloud(this.currentNotebook);
        }

        // Notify tab to update if it exists
        document.dispatchEvent(new CustomEvent('notebook:update'));
    }

    /**
     * Delete a notebook
     */
    delete(notebookId) {
        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return;
        }

        const index = this.notebooks.findIndex(n => n.id === notebookId);
        if (index !== -1) {
            const notebook = this.notebooks[index];
            this.notebooks.splice(index, 1);
            this.saveToStorage();

            // Sync deletion to cloud
            if (this.isPlusUser || this.hasAdminPrivileges) {
                this.deleteNotebookFromCloud(notebookId);
            }

            document.dispatchEvent(new CustomEvent('notebook:update'));
        }
    }

    /**
     * Delete currently open notebook
     */
    deleteCurrent() {
        if (!this.currentNotebook) return;

        const isNew = !this.notebooks.some(n => n.id === this.currentNotebook.id);
        if (isNew) {
            this.close(); // Just close it if it was never saved
            return;
        }

        const id = this.currentNotebook.id;
        this.delete(id);
        this.close();
    }

    // ================================================
    // EDITOR METHODS
    // ================================================

    /**
     * Populate editor from current notebook
     */
    populateEditorFromNotebook() {
        const editor = document.getElementById('notebookEditor');
        const titleInput = document.getElementById('notebookTitleInput');
        const dateEl = document.getElementById('notebookDate');
        const linkBadge = document.getElementById('notebookLinkBadge');
        const linkText = document.getElementById('notebookLinkText');

        if (editor) {
            editor.innerHTML = this.currentNotebook.content || '';
        }

        if (titleInput) {
            titleInput.value = this.currentNotebook.title || '';
        }

        if (dateEl) {
            dateEl.textContent = formatDate(this.currentNotebook.updatedAt);
        }

        // Show linked PDF badge
        if (linkBadge && this.currentNotebook.linkedPdf) {
            linkBadge.style.display = 'inline-flex';
            if (linkText) {
                linkText.textContent = this.currentNotebook.linkedPdf.name || 'PDF';
            }
        } else if (linkBadge) {
            linkBadge.style.display = 'none';
        }

        this.updateWordCount();
    }

    /**
     * Handle editor content change
     */
    onEditorChange() {
        this.isDirty = true;
        this.updateSaveStatus('saving');
        this.updateWordCount();

        // Auto-save after debounce if NOT a new notebook
        const isNew = !this.notebooks.some(n => n.id === this.currentNotebook.id);
        if (!isNew) {
            setTimeout(() => {
                if (this.isDirty) {
                    this.save();
                }
            }, 1000);
        }
    }

    /**
     * Handle title change
     */
    onTitleChange() {
        this.isDirty = true;
        this.updateSaveStatus('saving');
    }

    /**
     * Update word count display
     */
    updateWordCount() {
        const editor = document.getElementById('notebookEditor');
        const countEl = document.getElementById('notebookWordCount');

        if (editor && countEl) {
            const words = countWords(editor.innerHTML);
            countEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Update save status indicator
     */
    updateSaveStatus(status) {
        const statusEl = document.getElementById('notebookSaveStatus');
        if (!statusEl) return;

        const icon = statusEl.querySelector('i');
        const text = statusEl.querySelector('span');

        statusEl.className = 'save-status';

        switch (status) {
            case 'saving':
                statusEl.classList.add('saving');
                if (icon) icon.className = 'fas fa-spinner fa-spin';
                if (text) text.textContent = 'Saving...';
                break;
            case 'saved':
                if (icon) icon.className = 'fas fa-cloud-check';
                if (text) {
                    text.textContent = (this.isPlusUser || this.hasAdminPrivileges)
                        ? 'Synced to cloud'
                        : 'Saved locally';
                }
                break;
            case 'error':
                statusEl.classList.add('error');
                if (icon) icon.className = 'fas fa-exclamation-circle';
                if (text) text.textContent = 'Save failed';
                break;
        }
    }

    /**
     * Handle keyboard shortcuts in editor
     */
    handleEditorKeydown(e) {
        // Ctrl/Cmd + B for bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            this.handleToolbarAction('bold');
        }

        // Ctrl/Cmd + I for italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            this.handleToolbarAction('italic');
        }

        // Ctrl/Cmd + U for underline
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            this.handleToolbarAction('underline');
        }

        // Ctrl/Cmd + K for link
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.handleToolbarAction('link');
        }

        // Tab for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
    }

    /**
     * Handle paste event (clean up pasted content)
     */
    handlePaste(e) {
        // Get plain text if available
        const text = e.clipboardData?.getData('text/plain');

        // For now, allow default paste behavior
        // Could be enhanced to clean up HTML
    }

    // ================================================
    // TOOLBAR ACTIONS
    // ================================================

    /**
     * Handle toolbar button click
     */
    handleToolbarAction(action) {
        const editor = document.getElementById('notebookEditor');
        if (!editor) return;

        editor.focus();

        switch (action) {
            case 'bold':
                document.execCommand('bold');
                break;
            case 'italic':
                document.execCommand('italic');
                break;
            case 'underline':
                document.execCommand('underline');
                break;
            case 'strikethrough':
                document.execCommand('strikeThrough');
                break;
            case 'heading1':
                document.execCommand('formatBlock', false, 'h1');
                break;
            case 'heading2':
                document.execCommand('formatBlock', false, 'h2');
                break;
            case 'heading3':
                document.execCommand('formatBlock', false, 'h3');
                break;
            case 'bulletList':
                document.execCommand('insertUnorderedList');
                break;
            case 'numberedList':
                document.execCommand('insertOrderedList');
                break;
            case 'checkbox':
                this.insertCheckbox();
                break;
            case 'link':
                this.insertLink();
                break;
            case 'image':
                this.insertImage();
                break;
            case 'code':
                this.insertCodeBlock();
                break;
            case 'math':
                this.insertMath();
                break;
            case 'quote':
                document.execCommand('formatBlock', false, 'blockquote');
                break;
            case 'divider':
                document.execCommand('insertHorizontalRule');
                break;
            case 'linkPdf':
                this.showLinkPdfModal();
                break;
            case 'attachment':
                this.insertAttachment();
                break;
            case 'aiWrite':
                this.showAiInput();
                break;
        }

        this.onEditorChange();
    }

    /**
     * Insert checkbox
     */
    insertCheckbox() {
        const html = `<div class="checkbox-item"><input type="checkbox"><span>&nbsp;</span></div>`;
        document.execCommand('insertHTML', false, html);
    }

    /**
     * Insert link
     */
    insertLink() {
        const selection = window.getSelection();
        const text = selection.toString() || 'Link text';
        const url = prompt('Enter URL:', 'https://');

        if (url) {
            document.execCommand('insertHTML', false, `<a href="${url}" target="_blank">${text}</a>`);
        }
    }

    /**
     * Insert image
     */
    insertImage() {
        const url = prompt('Enter image URL:', 'https://');
        if (url) {
            document.execCommand('insertHTML', false, `<img src="${url}" alt="Image">`);
        }
    }

    /**
     * Insert code block
     */
    insertCodeBlock() {
        const language = prompt('Enter language (optional):', 'javascript') || '';
        const html = `<pre><code class="language-${language}">// Your code here</code></pre><br>`;
        document.execCommand('insertHTML', false, html);
    }

    /**
     * Insert LaTeX math
     */
    insertMath() {
        const latex = prompt('Enter LaTeX expression:', '\\frac{a}{b}');
        if (latex) {
            // Wrap in special markers for KaTeX rendering
            document.execCommand('insertHTML', false, `<span class="math-inline">$${latex}$</span>`);
        }
    }

    /**
     * Insert attachment (file upload)
     */
    insertAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf,.doc,.docx,.txt';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // For images, convert to base64
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.execCommand('insertHTML', false,
                        `<img src="${event.target.result}" alt="${file.name}">`);
                };
                reader.readAsDataURL(file);
            } else {
                // For other files, just show a placeholder
                document.execCommand('insertHTML', false,
                    `<div class="file-attachment"><i class="fas fa-paperclip"></i> ${file.name}</div>`);
            }
        };

        input.click();
    }

    // ================================================
    // PDF LINKING
    // ================================================

    /**
     * Check if a PDF is currently open in popup
     */
    checkCurrentPdf() {
        const popup = document.getElementById('popup');
        const currentOption = document.getElementById('linkPdfCurrentOption');

        if (popup && popup.style.display !== 'none' && currentOption) {
            this.updateLinkPdfCurrentOption();
        }
    }

    /**
     * Update the "Link Current PDF" option in the modal.
     */
    updateLinkPdfCurrentOption() {
        const currentOption = document.getElementById('linkPdfCurrentOption');
        if (currentOption) {
            const pdfInfo = window.currentPdfInfo;
            if (pdfInfo) {
                currentOption.style.display = 'flex';
                document.getElementById('linkPdfCurrentName').textContent = pdfInfo.name;
                document.getElementById('linkPdfCurrentPath').textContent = pdfInfo.path;

                // Add click handler to link the current PDF
                currentOption.onclick = () => {
                    this.linkPdf({
                        id: pdfInfo.id || 'current',
                        name: pdfInfo.name,
                        subject: pdfInfo.subject || '',
                        semester: pdfInfo.semester || ''
                    });
                };
            } else {
                currentOption.style.display = 'none';
            }
        }
    }

    /**
     * Show link PDF modal
     */
    showLinkPdfModal() {
        const modal = document.getElementById('linkPdfModal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadDownloadedPdfs();
        }
    }

    /**
     * Close link PDF modal
     */
    closeLinkPdfModal() {
        const modal = document.getElementById('linkPdfModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Load downloaded PDFs for linking
     */
    async loadDownloadedPdfs() {
        const listEl = document.getElementById('linkPdfList');
        if (!listEl) return;

        listEl.innerHTML = '<div class="link-pdf-empty">Loading...</div>';

        try {
            // Access the downloads from pdfDownloadManager if available
            if (window.pdfDownloadManager && typeof window.pdfDownloadManager.getAllDownloads === 'function') {
                const downloads = await window.pdfDownloadManager.getAllDownloads();

                if (downloads.length === 0) {
                    listEl.innerHTML = '<div class="link-pdf-empty">No downloaded PDFs found</div>';
                    return;
                }

                listEl.innerHTML = downloads.map(pdf => `
                    <div class="link-pdf-option" data-pdf-id="${pdf.id}">
                        <i class="fas fa-file-pdf"></i>
                        <div class="link-pdf-info">
                            <span class="link-pdf-name">${pdf.name || pdf.fileName}</span>
                            <span class="link-pdf-path">${pdf.subject || ''} • ${pdf.semester || ''}</span>
                        </div>
                        <button class="link-pdf-select-btn" data-pdf-id="${pdf.id}">Link</button>
                    </div>
                `).join('');

                // Bind click events
                listEl.querySelectorAll('.link-pdf-select-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const pdfId = e.target.dataset.pdfId;
                        const pdf = downloads.find(d => d.id === pdfId);
                        if (pdf) this.linkPdf(pdf);
                    });
                });
            } else {
                listEl.innerHTML = '<div class="link-pdf-empty">Download manager not available</div>';
            }
        } catch (e) {
            listEl.innerHTML = '<div class="link-pdf-empty">Failed to load PDFs</div>';
        }
    }

    /**
     * Link a PDF to current notebook
     */
    linkPdf(pdf) {
        if (!this.currentNotebook) return;

        this.currentNotebook.linkedPdf = {
            id: pdf.id,
            name: pdf.name || pdf.fileName,
            path: `${pdf.subject || ''} / ${pdf.semester || ''}`
        };

        // Update UI
        const linkBadge = document.getElementById('notebookLinkBadge');
        const linkText = document.getElementById('notebookLinkText');

        if (linkBadge) linkBadge.style.display = 'inline-flex';
        if (linkText) linkText.textContent = this.currentNotebook.linkedPdf.name;

        this.isDirty = true;
        this.save();
        this.closeLinkPdfModal();
    }

    // ================================================
    // PREVIEW & EXPORT
    // ================================================

    /**
     * Show markdown preview
     */
    showPreview() {
        const modal = document.getElementById('notebookPreviewModal');
        const content = document.getElementById('notebookPreviewContent');
        const editor = document.getElementById('notebookEditor');

        if (!modal || !content || !editor) return;

        // Convert editor HTML to markdown and back to get clean rendering
        const markdown = htmlToMarkdown(editor.innerHTML);
        content.innerHTML = markdownToHtml(markdown);

        // Trigger syntax highlighting
        if (window.hljs) {
            content.querySelectorAll('pre code').forEach(block => {
                window.hljs.highlightElement(block);
            });
        }

        // Trigger KaTeX rendering
        if (window.renderMathInElement) {
            window.renderMathInElement(content, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ]
            });
        }

        modal.style.display = 'flex';
    }

    /**
     * Close preview modal
     */
    closePreviewModal() {
        const modal = document.getElementById('notebookPreviewModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Show export options
     */
    showExportOptions() {
        const modal = document.getElementById('notebookExportModal');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Close export modal
     */
    closeExportModal() {
        const modal = document.getElementById('notebookExportModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Export notebook in specified format
     */
    exportAs(format) {
        if (!this.currentNotebook) return;

        const title = this.currentNotebook.title || 'Untitled Note';
        const editor = document.getElementById('notebookEditor');
        const content = editor ? editor.innerHTML : '';

        let blob, filename;

        switch (format) {
            case 'markdown':
                const md = htmlToMarkdown(content);
                blob = new Blob([`# ${title}\n\n${md}`], { type: 'text/markdown' });
                filename = `${title}.md`;
                break;

            case 'html':
                const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
        pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
        blockquote { border-left: 4px solid #ff8200; padding-left: 16px; margin-left: 0; color: #666; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`;
                blob = new Blob([htmlContent], { type: 'text/html' });
                filename = `${title}.html`;
                break;

            case 'txt':
                const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                blob = new Blob([`${title}\n${'='.repeat(title.length)}\n\n${text}`], { type: 'text/plain' });
                filename = `${title}.txt`;
                break;

            case 'pdf':
                // For PDF, we'll open print dialog
                this.printNotebook();
                this.closeExportModal();
                return;
        }

        // Download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace(/[^a-z0-9.-]/gi, '_');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.closeExportModal();
    }

    /**
     * Print notebook (opens print dialog)
     */
    printNotebook() {
        const printWindow = window.open('', '_blank');
        const title = this.currentNotebook?.title || 'Untitled Note';
        const editor = document.getElementById('notebookEditor');
        const content = editor ? editor.innerHTML : '';

        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               max-width: 100%; margin: 0; padding: 40px; line-height: 1.6; }
        h1 { margin-bottom: 24px; }
        pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
        blockquote { border-left: 4px solid #ff8200; padding-left: 16px; margin-left: 0; color: #666; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ================================================
    // AI WRITING (Super users only)
    // ================================================

    /**
     * Show AI input overlay
     */
    showAiInput() {
        if (!this.hasAdminPrivileges) {
            alert('AI writing is available for Super users only.');
            return;
        }

        const overlay = document.getElementById('aiInputOverlay');
        const editor = document.getElementById('notebookEditor');

        if (!overlay || !editor) return;

        // Position overlay at cursor
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();

            overlay.style.left = `${Math.max(16, rect.left - editorRect.left)}px`;
            overlay.style.top = `${rect.bottom - editorRect.top + 8}px`;
        } else {
            overlay.style.left = '24px';
            overlay.style.top = '50px';
        }

        overlay.style.display = 'block';

        const input = document.getElementById('aiPromptInput');
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    /**
     * Hide AI input overlay
     */
    hideAiInput() {
        const overlay = document.getElementById('aiInputOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Submit AI prompt
     */
    async submitAiPrompt() {
        const input = document.getElementById('aiPromptInput');
        const prompt = input?.value?.trim();

        if (!prompt) return;

        this.hideAiInput();
        this.showAiWritingIndicator();

        try {
            // Get context (linked PDF, current content)
            const linkedPdf = this.currentNotebook?.linkedPdf?.name || '';
            const title = this.currentNotebook?.title || 'Untitled Note';
            const currentContent = document.getElementById('notebookEditor')?.textContent?.slice(-1000) || '';

            // Build the AI prompt with context
            let aiPrompt = prompt;
            if (linkedPdf) {
                aiPrompt = `Context: This note is linked to a PDF titled "${linkedPdf}".\n\n${prompt}`;
            }
            if (currentContent) {
                aiPrompt = `${aiPrompt}\n\nCurrent note content (for context):\n${currentContent}`;
            }

            // Create abort controller
            this.aiAbortController = new AbortController();

            // Get auth token
            const token = localStorage.getItem('materio_auth_token');

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Call AI API using the same format as post.js
            const response = await fetch('/api/v2/chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: aiPrompt,
                    messages: [],
                    mode: 'general',
                    model: 'openai/gpt-oss-20b:free'
                }),
                signal: this.aiAbortController.signal
            });

            if (!response.ok) {
                throw new Error(`AI request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.response) {
                // Insert AI-generated text
                const editor = document.getElementById('notebookEditor');
                if (editor) {
                    editor.focus();
                    document.execCommand('insertText', false, data.response);
                    this.onEditorChange();
                }
            } else {
                throw new Error(data.error || 'No response from AI');
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                // AI writing cancelled
            } else {
                // Show error message to user
                const editor = document.getElementById('notebookEditor');
                if (editor) {
                    editor.focus();
                    document.execCommand('insertText', false,
                        `[AI writing failed: ${e.message}. Please try again.]`);
                }
            }
        } finally {
            this.hideAiWritingIndicator();
            this.aiAbortController = null;
        }
    }

    /**
     * Stop AI writing
     */
    stopAiWriting() {
        if (this.aiAbortController) {
            this.aiAbortController.abort();
        }
        this.hideAiWritingIndicator();
    }

    /**
     * Show AI writing indicator
     */
    showAiWritingIndicator() {
        const indicator = document.getElementById('aiWritingIndicator');
        if (indicator) indicator.style.display = 'flex';
    }

    /**
     * Hide AI writing indicator
     */
    hideAiWritingIndicator() {
        const indicator = document.getElementById('aiWritingIndicator');
        if (indicator) indicator.style.display = 'none';
    }

    // ================================================
    // CLOUD SYNC (Plus/Super users)
    // ================================================

    /**
     * Sync a notebook to cloud
     */
    async syncNotebookToCloud(notebook) {
        if (!this.isPlusUser && !this.hasAdminPrivileges) return;

        const token = localStorage.getItem('materio_auth_token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(CLOUD_SYNC_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subAction: 'sync',
                    notebook: { ...notebook, syncedToCloud: true }
                }),
                credentials: 'include'
            });

            if (response.ok) {
                // Update the object reference directly
                notebook.syncedToCloud = true;

                // Also update in the main array to ensure it's saved correctly
                const index = this.notebooks.findIndex(n => n.id === notebook.id);
                if (index !== -1) {
                    this.notebooks[index].syncedToCloud = true;
                }

                this.saveToStorage();

                // Notify UI to update (show the cloud badge in tab)
                document.dispatchEvent(new CustomEvent('notebook:update'));
            } else {
            }
        } catch (e) {
            // Cloud sync failed
        }
    }

    /**
     * Delete a notebook from cloud
     */
    async deleteNotebookFromCloud(notebookId) {
        if (!this.isPlusUser && !this.hasAdminPrivileges) return;

        const token = localStorage.getItem('materio_auth_token');
        if (!token) return;

        try {
            await fetch(CLOUD_SYNC_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subAction: 'delete',
                    id: notebookId
                }),
                credentials: 'include'
            });
        } catch (e) {
            // Cloud deletion failed
        }
    }

    /**
     * Sync all notebooks to cloud
     */
    async syncToCloud() {
        if (!this.isPlusUser && !this.hasAdminPrivileges) return;

        for (const notebook of this.notebooks) {
            if (!notebook.syncedToCloud) {
                await this.syncNotebookToCloud(notebook);
            }
        }
    }

    /**
     * Load notebooks from cloud
     */
    async loadFromCloud() {
        if (!this.isPlusUser && !this.hasAdminPrivileges) return;

        const token = localStorage.getItem('materio_auth_token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(`${CLOUD_SYNC_ENDPOINT}&subAction=list`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                const cloudNotebooks = result.notebooks || [];

                // Merge with local notebooks
                for (let cloudNotebook of cloudNotebooks) {
                    // Force syncedToCloud to true since it came from the cloud
                    cloudNotebook.syncedToCloud = true;

                    const localIndex = this.notebooks.findIndex(n => n.id === cloudNotebook.id);

                    if (localIndex === -1) {
                        // New notebook from cloud
                        this.notebooks.push(cloudNotebook);
                    } else {
                        // Merge: use most recently updated
                        const local = this.notebooks[localIndex];
                        if (new Date(cloudNotebook.updatedAt) > new Date(local.updatedAt)) {
                            this.notebooks[localIndex] = cloudNotebook;
                        }
                    }
                }

                this.saveToStorage();

                // Notify UI to update list
                document.dispatchEvent(new CustomEvent('notebook:update'));
            }
        } catch (e) {
            // Failed to load from cloud
        }
    }
}

// ================================================
// INITIALIZE
// ================================================

// Create singleton instance
const notebookManager = new NotebookManager();

// Export for ESM
export default notebookManager;
export { NotebookManager, htmlToMarkdown, markdownToHtml };
