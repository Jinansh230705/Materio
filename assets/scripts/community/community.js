/**
 * Materio Community - Injectable Module
 * A self-contained community/forum widget that can be embedded anywhere
 * Similar to how giscus works for comments
 * 
 * Usage:
 * <div id="materio-community" 
 *      data-api-url="https://materio-community.vercel.app"
 *      data-theme="auto"
 *      data-semester="6"
 *      data-subject="computer-networks">
 * </div>
 * <script src="https://materioa.netlify.app/assets/scripts/community/community.js" async></script>
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const DEFAULT_CONFIG = {
        apiUrl: 'http://localhost:3001',
        theme: 'auto',
        feedType: 'all', // 'all', 'semester', 'subject'
        semester: null,
        subject: null,
        postsPerPage: 10,
        enableAnonymous: true,
        enableNotes: true,
        enableAttachments: true
    };

    // Supabase config for realtime (using proxy URL as primary, fallback to direct URL)
    const SUPABASE_URL = 'https://materio.jiobase.com' || 'https://popaoujsfvznlqltszfr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcGFvdWpzZnZ6bmxxbHRzemZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTg1NTIsImV4cCI6MjA2MjY5NDU1Mn0.nJFDXqpcnQDnZa7OueLSiHeqE0RxbINEcKcwv8l8bRw';

    // ============================================
    // STATE
    // ============================================

    let config = { ...DEFAULT_CONFIG };
    let container = null;
    let currentUser = null;
    let authToken = null;
    let currentPage = 1;
    let currentSort = 'newest';
    let isLoading = false;
    let hasMorePosts = true;
    let supabaseClient = null;
    let realtimeChannel = null;

    // ============================================
    // STYLES
    // ============================================

    const STYLES = `
        /* Materio Community Styles */
        .materio-community {
            --mc-primary: #ff8200;
            --mc-primary-hover: #e67500;
            --mc-bg: #ffffff;
            --mc-bg-secondary: #f8f9fa;
            --mc-bg-tertiary: #f0f0f0;
            --mc-text: #333333;
            --mc-text-secondary: #666666;
            --mc-text-muted: #999999;
            --mc-border: rgba(0, 0, 0, 0.1);
            --mc-shadow: rgba(0, 0, 0, 0.08);
            --mc-success: #28a745;
            --mc-error: #dc3545;
            --mc-warning: #ffc107;
            --mc-radius: 12px;
            --mc-radius-sm: 8px;
            --mc-transition: 0.2s ease;
            
            font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--mc-text);
            background: var(--mc-bg);
            border-radius: var(--mc-radius);
            overflow: hidden;
        }

        .materio-community.dark {
            --mc-bg: #0f1115;
            --mc-bg-secondary: #1a1d23;
            --mc-bg-tertiary: #2a2e37;
            --mc-text: #ffffff;
            --mc-text-secondary: #9499a5;
            --mc-text-muted: #646975;
            --mc-border: rgba(255, 255, 255, 0.08);
            --mc-shadow: rgba(0, 0, 0, 0.4);
            --mc-primary: #7c9dff;
            --mc-primary-hover: #5d7fe6;
        }

        /* Header */
        .mc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: var(--mc-bg-secondary);
            border-bottom: 1px solid var(--mc-border);
        }

        .mc-header-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
            font-weight: 700;
        }

        .mc-header-title i {
            color: var(--mc-primary);
        }

        .mc-header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .mc-user-snippet {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 10px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 20px;
        }

        .dark .mc-user-snippet {
            background: rgba(255, 255, 255, 0.05);
        }

        .mc-user-avatar-small {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            object-fit: cover;
        }

        .mc-user-name-small {
            font-size: 13px;
            font-weight: 600;
            color: var(--mc-text);
        }

        /* Posting as Snippet */
        .mc-post-author-snippet {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 24px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--mc-border);
            border-radius: 16px;
        }

        .mc-author-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .mc-avatar-lg {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--mc-border);
        }

        .mc-author-details {
            display: flex;
            flex-direction: column;
        }

        .mc-author-name {
            font-size: 16px;
            font-weight: 700;
            color: var(--mc-text);
        }

        .mc-author-sub {
            font-size: 13px;
            color: var(--mc-text-secondary);
        }

        .mc-change-link {
            color: var(--mc-primary);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
        }

        .mc-change-link:hover {
            text-decoration: underline;
        }

        /* Pins & Badges */
        .mc-pinned-badge {
            font-size: 11px;
            color: var(--mc-primary);
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .mc-verified {
            color: #007bff;
            font-size: 12px;
        }

        /* Buttons */
        .mc-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 16px;
            border: none;
            border-radius: var(--mc-radius-sm);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--mc-transition);
        }

        .mc-btn-primary {
            background: var(--mc-primary);
            color: white;
        }

        .mc-btn-primary:hover {
            background: var(--mc-primary-hover);
            transform: translateY(-1px);
        }

        .mc-btn-secondary {
            background: var(--mc-bg-tertiary);
            color: var(--mc-text);
        }

        .mc-btn-secondary:hover {
            background: var(--mc-border);
        }

        .mc-btn-icon {
            width: 36px;
            height: 36px;
            padding: 0;
            border-radius: 50%;
        }

        .mc-btn-small {
            padding: 4px 10px;
            font-size: 12px;
        }

        /* Filter Pills */
        .mc-filters {
            display: flex;
            gap: 8px;
            padding: 12px 20px;
            overflow-x: auto;
            border-bottom: 1px solid var(--mc-border);
        }

        .mc-filter-pill {
            padding: 6px 14px;
            border-radius: 20px;
            background: var(--mc-bg-tertiary);
            color: var(--mc-text-secondary);
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            cursor: pointer;
            transition: all var(--mc-transition);
            border: none;
        }

        .mc-filter-pill:hover {
            background: var(--mc-border);
        }

        .mc-filter-pill.active {
            background: var(--mc-primary);
            color: white;
        }

        /* Feed */
        .mc-feed {
            padding: 12px;
            min-height: 200px;
        }

        /* Post Card */
        .mc-post-card {
            background: var(--mc-bg-secondary);
            border-radius: var(--mc-radius);
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid var(--mc-border);
            transition: all var(--mc-transition);
            cursor: pointer;
        }

        .mc-post-card:hover {
            border-color: var(--mc-primary);
            box-shadow: 0 4px 12px var(--mc-shadow);
        }

        .mc-post-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }

        .mc-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--mc-bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--mc-text-muted);
            font-size: 14px;
            overflow: hidden;
        }

        .mc-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .mc-post-meta {
            flex: 1;
        }

        .mc-post-author {
            font-weight: 600;
            font-size: 14px;
            color: var(--mc-text);
        }

        .mc-post-time {
            font-size: 12px;
            color: var(--mc-text-muted);
        }

        .mc-post-tags {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .mc-tag {
            padding: 2px 8px;
            background: rgba(255, 130, 0, 0.1);
            color: var(--mc-primary);
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }

        .mc-post-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--mc-text);
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .mc-post-preview {
            font-size: 14px;
            color: var(--mc-text-secondary);
            line-height: 1.5;
            margin-bottom: 12px;
        }

        .mc-post-footer {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .mc-vote-group {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .mc-vote-btn {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: transparent;
            border: none;
            color: var(--mc-text-muted);
            cursor: pointer;
            transition: all var(--mc-transition);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .mc-vote-btn:hover {
            background: var(--mc-bg-tertiary);
            color: var(--mc-primary);
        }

        .mc-vote-btn.active {
            color: var(--mc-primary);
        }

        .mc-vote-btn.down.active {
            color: var(--mc-error);
        }

        .mc-vote-count {
            font-size: 13px;
            font-weight: 600;
            min-width: 20px;
            text-align: center;
        }

        .mc-stat {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--mc-text-muted);
        }

        .mc-stat i {
            font-size: 12px;
        }

        /* Community Note Badge */
        .mc-note-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: rgba(40, 167, 69, 0.1);
            border-left: 3px solid var(--mc-success);
            border-radius: 0 var(--mc-radius-sm) var(--mc-radius-sm) 0;
            margin-top: 12px;
            font-size: 13px;
            color: var(--mc-success);
        }

        .mc-note-badge i {
            font-size: 14px;
        }

        /* Loading States */
        .mc-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: var(--mc-text-muted);
        }

        .mc-loading i {
            font-size: 24px;
            color: var(--mc-primary);
            margin-bottom: 12px;
            animation: mc-spin 1s linear infinite;
        }

        @keyframes mc-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* Empty State */
        .mc-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
            color: var(--mc-text-secondary);
        }

        .mc-empty i {
            font-size: 48px;
            color: var(--mc-text-muted);
            margin-bottom: 16px;
        }

        .mc-empty h3 {
            font-size: 18px;
            margin-bottom: 8px;
        }

        .mc-empty p {
            font-size: 14px;
            color: var(--mc-text-muted);
            margin-bottom: 16px;
        }

        /* Load More */
        .mc-load-more {
            display: flex;
            justify-content: center;
            padding: 20px;
        }

        /* Create Post Modal */
        .mc-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: all var(--mc-transition);
        }

        .mc-modal-overlay.open {
            opacity: 1;
            visibility: visible;
        }

        .mc-modal {
            background: var(--mc-bg);
            border-radius: var(--mc-radius);
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            transform: translateY(20px);
            transition: transform var(--mc-transition);
        }

        .mc-modal-overlay.open .mc-modal {
            transform: translateY(0);
        }

        .mc-modal-header {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 24px 24px 16px;
        }

        .mc-modal-header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .mc-modal-title {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }

        .mc-modal-header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .mc-status-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: rgba(40, 167, 69, 0.1);
            color: #4cd964;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .mc-modal-subtitle {
            font-size: 15px;
            color: var(--mc-text-secondary);
        }

        .mc-modal-close {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: transparent;
            border: none;
            color: var(--mc-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--mc-transition);
            font-size: 20px;
        }

        .mc-modal-close:hover {
            color: var(--mc-text);
            background: rgba(255, 255, 255, 0.1);
        }

        .mc-modal-body {
            padding: 0 24px 24px;
        }

        .mc-form-group {
            margin-bottom: 20px;
        }

        .mc-label-group {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .mc-form-label {
            display: block;
            font-size: 14px;
            font-weight: 700;
            color: var(--mc-text);
        }

        .mc-char-count {
            font-size: 12px;
            color: var(--mc-text-muted);
        }

        .mc-input, .mc-textarea, .mc-select {
            width: 100%;
            padding: 14px 16px;
            border: 1px solid var(--mc-border);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--mc-text);
            font-size: 15px;
            font-family: inherit;
            transition: all var(--mc-transition);
            box-sizing: border-box;
        }

        .mc-select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239499a5' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C2.185 5.355 2.408 4.867 2.812 4.867h9.478c.404 0 .627.488.361.791l-4.796 5.482a.5.5 0 0 1-.76 0z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
            padding-right: 40px;
        }

        .mc-input:focus, .mc-textarea:focus, .mc-select:focus {
            outline: none;
            border-color: var(--mc-primary);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 4px rgba(124, 157, 255, 0.1);
        }

        /* Toolbar */
        .mc-toolbar {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--mc-border);
            border-bottom: none;
            border-radius: 12px 12px 0 0;
            flex-wrap: wrap;
        }

        .mc-toolbar-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            color: var(--mc-text-secondary);
            cursor: pointer;
            transition: all 0.1s;
            font-size: 14px;
        }

        .mc-toolbar-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--mc-text);
        }

        .mc-toolbar-divider {
            width: 1px;
            height: 20px;
            background: var(--mc-border);
            margin: 0 4px;
        }

        .mc-textarea-toolbar {
            border-radius: 0 0 12px 12px;
            min-height: 150px;
        }

        .mc-modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            padding: 0 24px 24px;
        }

        .mc-btn-pill {
            padding: 12px 32px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 700;
        }

        .mc-btn-outline {
            background: transparent;
            border: 1.5px solid var(--mc-border);
            color: var(--mc-text);
        }

        .mc-btn-outline:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--mc-text-secondary);
        }

        /* Attachments */
        .mc-attachments-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 12px;
        }

        .mc-attachment-item {
            width: 80px;
            height: 80px;
            border-radius: var(--mc-radius-sm);
            overflow: hidden;
            position: relative;
            background: var(--mc-bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .mc-attachment-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .mc-attachment-item .mc-file-icon {
            font-size: 24px;
            color: var(--mc-text-muted);
        }

        .mc-attachment-remove {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--mc-error);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Upload Area */
        .mc-upload-area {
            border: 2px dashed var(--mc-border);
            border-radius: var(--mc-radius-sm);
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all var(--mc-transition);
        }

        .mc-upload-area:hover {
            border-color: var(--mc-primary);
            background: rgba(255, 130, 0, 0.05);
        }

        .mc-upload-area i {
            font-size: 24px;
            color: var(--mc-text-muted);
            margin-bottom: 8px;
        }

        .mc-upload-area p {
            font-size: 13px;
            color: var(--mc-text-muted);
        }

        /* Pinned Badge */
        .mc-pinned-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 6px;
            background: rgba(255, 130, 0, 0.1);
            color: var(--mc-primary);
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }

        /* Verified Badge */
        .mc-verified {
            color: var(--mc-success);
        }

        /* Responsive */
        @media (max-width: 640px) {
            .mc-header {
                flex-direction: column;
                gap: 12px;
                align-items: stretch;
            }

            .mc-header-actions {
                justify-content: center;
            }

            .mc-post-footer {
                flex-wrap: wrap;
            }

            .mc-modal {
                max-height: 100vh;
                border-radius: 0;
            }
        }

        /* Scroll indicator */
        .mc-new-posts-indicator {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            padding: 10px;
            z-index: 100;
        }

        .mc-new-posts-btn {
            background: var(--mc-primary);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(255, 130, 0, 0.3);
            animation: mc-bounce 0.5s ease;
        }

        @keyframes mc-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
    `;

    // ============================================
    // UTILITIES
    // ============================================

    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function detectTheme() {
        if (config.theme === 'dark') return 'dark';
        if (config.theme === 'light') return 'light';

        // Auto-detect
        const isDark = document.documentElement.classList.contains('dark') ||
            document.body.classList.contains('dark-mode') ||
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? 'dark' : 'light';
    }

    // ============================================
    // API CALLS
    // ============================================

    async function apiCall(endpoint, options = {}) {
        const url = `${config.apiUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Community API unavailable');
            }

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || 'API request failed');
                throw new Error(errorMsg);
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                console.warn('[Community] API server unreachable at', config.apiUrl);
                throw new Error('Community server is offline. Please try again later.');
            }
            console.error('API Error:', error);
            throw error;
        }
    }

    async function fetchPosts(page = 1, sort = 'newest') {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: config.postsPerPage.toString(),
            sort
        });

        if (config.semester) params.append('semester', config.semester);
        if (config.subject) params.append('subject', config.subject);

        return apiCall(`/posts?${params}`);
    }

    async function createPost(postData) {
        return apiCall('/posts', {
            method: 'POST',
            body: JSON.stringify(postData)
        });
    }

    async function fetchPost(postId) {
        return apiCall(`/posts/${postId}`);
    }

    async function fetchComments(postId) {
        return apiCall(`/comments/${postId}`);
    }

    async function submitComment(postId, commentData) {
        return apiCall(`/comments/${postId}`, {
            method: 'POST',
            body: JSON.stringify(commentData)
        });
    }

    async function castVote(targetId, targetType, voteType) {
        return apiCall('/votes', {
            method: 'POST',
            body: JSON.stringify({ target_id: targetId, target_type: targetType, vote_type: voteType })
        });
    }

    // ============================================
    // RENDERING
    // ============================================

    function renderHeader() {
        const userHtml = currentUser ? `
            <div class="mc-user-snippet">
                <img src="${currentUser.avatar || '/assets/img/default-avatar.svg'}" class="mc-user-avatar-small" alt="${currentUser.name}">
                <span class="mc-user-name-small">${currentUser.name}</span>
            </div>
        ` : '';

        return `
            <div class="mc-header">
                <div class="mc-header-title">
                    <i class="fa-solid fa-messages"></i>
                    <span>Materio Community</span>
                </div>
                <div class="mc-header-actions">
                    ${userHtml}
                    <button class="mc-btn mc-btn-primary" onclick="MaterioCommunit.openCreateModal()" title="New Post">
                        <i class="fa-solid fa-plus"></i>
                        <span class="mc-btn-text">New Post</span>
                    </button>
                    ${!currentUser ? `
                        <button class="mc-btn mc-btn-secondary" onclick="MaterioCommunit.promptLogin()" title="Sign in for more features">
                            <i class="fa-solid fa-right-to-bracket"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function renderFilters() {
        const filters = [
            { id: 'newest', label: 'Latest', icon: 'fa-clock' },
            { id: 'popular', label: 'Popular', icon: 'fa-fire' },
            { id: 'unanswered', label: 'Unanswered', icon: 'fa-circle-question' }
        ];

        return `
            <div class="mc-filters">
                ${filters.map(f => `
                    <button class="mc-filter-pill ${currentSort === f.id ? 'active' : ''}" 
                            onclick="MaterioCommunit.setSort('${f.id}')">
                        <i class="fa-solid ${f.icon}"></i> ${f.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    function renderPost(post) {
        const score = post.score || (post.upvotes - post.downvotes);
        const hasNote = post.community_notes?.length > 0;

        return `
            <div class="mc-post-card" onclick="MaterioCommunit.openPost('${post.id}')" data-post-id="${post.id}">
                <div class="mc-post-header">
                    <div class="mc-avatar">
                        ${post.is_anonymous
                ? '<i class="fa-solid fa-user-secret"></i>'
                : (post.author_avatar
                    ? `<img src="${post.author_avatar}" alt="${post.author_name}">`
                    : `<span>${post.author_name?.charAt(0).toUpperCase() || 'U'}</span>`)
            }
                    </div>
                    <div class="mc-post-meta">
                        <div class="mc-post-author">${escapeHtml(post.author_name || 'materio_user')}</div>
                        <div class="mc-post-time">${formatTimeAgo(post.created_at)}</div>
                    </div>
                    <div class="mc-post-tags">
                        ${post.is_pinned ? '<span class="mc-pinned-badge"><i class="fa-solid fa-thumbtack"></i> Pinned</span>' : ''}
                        ${post.is_verified ? '<i class="fa-solid fa-circle-check mc-verified" title="Verified"></i>' : ''}
                    </div>
                </div>
                <div class="mc-post-title">${escapeHtml(post.title)}</div>
                <div class="mc-post-preview">${escapeHtml(post.content_preview || post.content?.substring(0, 200) || '')}</div>
                ${post.tags?.length > 0 ? `
                    <div class="mc-post-tags" style="margin-bottom: 12px;">
                        ${post.tags.map(tag => `<span class="mc-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="mc-post-footer">
                    <div class="mc-vote-group" onclick="event.stopPropagation()">
                        <button class="mc-vote-btn ${post.user_vote === 'up' ? 'active' : ''}" 
                                onclick="MaterioCommunit.vote('${post.id}', 'post', 'up')">
                            <i class="fa-solid fa-arrow-up"></i>
                        </button>
                        <span class="mc-vote-count">${score}</span>
                        <button class="mc-vote-btn down ${post.user_vote === 'down' ? 'active' : ''}" 
                                onclick="MaterioCommunit.vote('${post.id}', 'post', 'down')">
                            <i class="fa-solid fa-arrow-down"></i>
                        </button>
                    </div>
                    <div class="mc-stat">
                        <i class="fa-regular fa-comment"></i>
                        <span>${post.comment_count || 0}</span>
                    </div>
                </div>
                ${hasNote ? `
                    <div class="mc-note-badge">
                        <i class="fa-solid fa-lightbulb"></i>
                        <span>Community note added</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function renderFeed(posts) {
        if (!posts || posts.length === 0) {
            return `
                <div class="mc-empty">
                    <i class="fa-solid fa-messages"></i>
                    <h3>No posts yet</h3>
                    <p>Be the first to start a discussion!</p>
                    ${currentUser ? `
                        <button class="mc-btn mc-btn-primary" onclick="MaterioCommunit.openCreateModal()">
                            Create Post
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return posts.map(post => renderPost(post)).join('');
    }

    function renderLoading() {
        return `
            <div class="mc-loading">
                <i class="fa-solid fa-spinner"></i>
                <span>Loading posts...</span>
            </div>
        `;
    }

    function renderCreateModal() {
        const authorName = currentUser?.name || 'materio_user';
        const authorAvatar = currentUser?.avatar || '/assets/img/default-avatar.svg';

        return `
            <div class="mc-modal-overlay" id="mcCreateModal">
                <div class="mc-modal">
                    <div class="mc-modal-header">
                        <div class="mc-modal-header-top">
                            <span class="mc-modal-title">Create Post</span>
                            <div class="mc-modal-header-actions">
                                <div class="mc-status-badge">
                                    <i class="fa-solid fa-check"></i>
                                    Saved
                                </div>
                                <button class="mc-modal-close" onclick="MaterioCommunit.closeCreateModal()">
                                    <i class="fa-solid fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <span class="mc-modal-subtitle">Share with the campus community.</span>
                    </div>

                    <div class="mc-modal-body">
                        <div class="mc-post-author-snippet">
                            <div class="mc-author-info">
                                <img src="${authorAvatar}" class="mc-avatar-lg" id="mcPostAuthorAvatar">
                                <div class="mc-author-details">
                                    <span class="mc-author-name" id="mcPostAuthorName">${authorName}</span>
                                </div>
                            </div>
                            <span class="mc-change-link" onclick="document.getElementById('mcAnonymous').click()">Change</span>
                            <input type="checkbox" id="mcAnonymous" style="display:none">
                        </div>

                        <div class="mc-form-group">
                            <label class="mc-form-label">Post Type</label>
                            <select class="mc-select" id="mcPostType">
                                <option value="general">General</option>
                                <option value="question">Question</option>
                                <option value="announcement">Announcement</option>
                                <option value="resource">Resource</option>
                            </select>
                        </div>

                        <div class="mc-form-group">
                            <div class="mc-label-group">
                                <label class="mc-form-label">Title (Optional)</label>
                                <span class="mc-char-count" id="mcTitleCount">0/150</span>
                            </div>
                            <input type="text" class="mc-input" id="mcPostTitle" placeholder="Enter title..." maxlength="150" 
                                oninput="document.getElementById('mcTitleCount').textContent = this.value.length + '/150'">
                        </div>

                        <div class="mc-form-group">
                            <label class="mc-form-label">Content</label>
                            <div class="mc-toolbar">
                                <div class="mc-toolbar-btn" title="Bold"><i class="fa-solid fa-bold"></i></div>
                                <div class="mc-toolbar-btn" title="Italic"><i class="fa-solid fa-italic"></i></div>
                                <div class="mc-toolbar-btn" title="Underline"><i class="fa-solid fa-underline"></i></div>
                                <div class="mc-toolbar-btn" title="Strikethrough"><i class="fa-solid fa-strikethrough"></i></div>
                                <div class="mc-toolbar-divider"></div>
                                <div class="mc-toolbar-btn" title="Bullet List"><i class="fa-solid fa-list-ul"></i></div>
                                <div class="mc-toolbar-btn" title="Number List"><i class="fa-solid fa-list-ol"></i></div>
                                <div class="mc-toolbar-btn" title="Quote"><i class="fa-solid fa-quote-right"></i></div>
                                <div class="mc-toolbar-btn" title="Code"><i class="fa-solid fa-code"></i></div>
                                <div class="mc-toolbar-divider"></div>
                                <div class="mc-toolbar-btn" title="Link"><i class="fa-solid fa-link"></i></div>
                                <div class="mc-toolbar-btn" title="Image" onclick="document.getElementById('mcFileInput').click()"><i class="fa-solid fa-image"></i></div>
                                <div class="mc-toolbar-btn" title="Video"><i class="fa-solid fa-play"></i></div>
                                <div style="flex-grow: 1"></div>
                                <div class="mc-toolbar-btn" title="Undo"><i class="fa-solid fa-rotate-left"></i></div>
                                <div class="mc-toolbar-btn" title="Redo"><i class="fa-solid fa-rotate-right"></i></div>
                            </div>
                            <textarea class="mc-textarea mc-textarea-toolbar" id="mcPostContent" placeholder="What's on your mind?"></textarea>
                            <input type="file" id="mcFileInput" multiple hidden accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx">
                            <div class="mc-attachments-preview" id="mcAttachmentsPreview"></div>
                        </div>
                    </div>

                    <div class="mc-modal-footer">
                        <button class="mc-btn mc-btn-outline mc-btn-pill" onclick="MaterioCommunit.closeCreateModal()">Cancel</button>
                        <button class="mc-btn mc-btn-primary mc-btn-pill" id="mcSubmitBtn" onclick="MaterioCommunit.submitPost()">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    function render() {
        const theme = detectTheme();

        container.innerHTML = `
            <div class="materio-community ${theme}">
                ${renderHeader()}
                ${renderFilters()}
                <div class="mc-feed" id="mcFeed">
                    ${renderLoading()}
                </div>
            </div>
            ${renderCreateModal()}
        `;

        // Load initial posts
        loadPosts();
    }

    async function loadPosts(append = false) {
        if (isLoading) return;
        isLoading = true;

        const feedEl = document.getElementById('mcFeed');

        if (!append) {
            feedEl.innerHTML = renderLoading();
        }

        try {
            const data = await fetchPosts(currentPage, currentSort);

            if (append) {
                feedEl.insertAdjacentHTML('beforeend', renderFeed(data.posts));
            } else {
                feedEl.innerHTML = renderFeed(data.posts);
            }

            hasMorePosts = currentPage < data.pagination.pages;

            if (hasMorePosts) {
                feedEl.insertAdjacentHTML('beforeend', `
                    <div class="mc-load-more">
                        <button class="mc-btn mc-btn-secondary" onclick="MaterioCommunit.loadMore()">
                            Load More
                        </button>
                    </div>
                `);
            }
        } catch (error) {
            feedEl.innerHTML = `
                <div class="mc-empty">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>Failed to load posts</h3>
                    <p>${error.message}</p>
                    <button class="mc-btn mc-btn-primary" onclick="MaterioCommunit.refresh()">
                        Retry
                    </button>
                </div>
            `;
        } finally {
            isLoading = false;
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================

    window.MaterioCommunit = {
        setSort(sort) {
            currentSort = sort;
            currentPage = 1;

            // Update active filter
            document.querySelectorAll('.mc-filter-pill').forEach(pill => {
                pill.classList.toggle('active', pill.textContent.toLowerCase().includes(sort));
            });

            loadPosts();
        },

        loadMore() {
            currentPage++;
            loadPosts(true);
        },

        refresh() {
            currentPage = 1;
            loadPosts();
        },

        async vote(targetId, targetType, voteType) {
            // Optional auth - backend handles anonymous votes via IP/Session
            try {
                const result = await castVote(targetId, targetType, voteType);

                // Update UI
                const postCard = document.querySelector(`[data-post-id="${targetId}"]`);
                if (postCard) {
                    const upBtn = postCard.querySelector('.mc-vote-btn:not(.down)');
                    const downBtn = postCard.querySelector('.mc-vote-btn.down');
                    const countEl = postCard.querySelector('.mc-vote-count');

                    upBtn.classList.remove('active');
                    downBtn.classList.remove('active');

                    if (result.new_vote === 'up') {
                        upBtn.classList.add('active');
                    } else if (result.new_vote === 'down') {
                        downBtn.classList.add('active');
                    }

                    // Refresh to get updated count (simpler than trying to calculate)
                    // In a more optimized version, we'd calculate this client-side
                }
            } catch (error) {
                console.error('Vote failed:', error);
            }
        },

        openPost(postId) {
            // For now, open in a simple way - could be expanded to full modal
            console.log('Opening post:', postId);
            // TODO: Implement post detail view
        },

        openCreateModal() {
            const modal = document.getElementById('mcCreateModal');
            if (modal) {
                modal.classList.add('open');

                // Sync initial state
                const anonCheckbox = document.getElementById('mcAnonymous');
                const authorName = document.getElementById('mcPostAuthorName');
                const authorAvatar = document.getElementById('mcPostAuthorAvatar');
                const titleInput = document.getElementById('mcPostTitle');
                const titleCount = document.getElementById('mcTitleCount');

                // Initialize count
                if (titleInput && titleCount) {
                    titleCount.textContent = `${titleInput.value.length}/150`;
                }

                if (anonCheckbox && authorName && authorAvatar) {
                    const updateUI = () => {
                        if (anonCheckbox.checked) {
                            authorName.textContent = 'materio_user';
                            authorAvatar.src = '/assets/img/default-avatar.svg';
                        } else {
                            authorName.textContent = currentUser?.name || 'materio_user';
                            authorAvatar.src = currentUser?.avatar || '/assets/img/default-avatar.svg';
                        }
                    };

                    anonCheckbox.onchange = updateUI;
                    updateUI(); // Run once to sync
                }
            }
        },

        closeCreateModal() {
            const modal = document.getElementById('mcCreateModal');
            if (modal) {
                modal.classList.remove('open');
                // Clear form
                document.getElementById('mcPostTitle').value = '';
                document.getElementById('mcPostContent').value = '';
            }
        },

        async submitPost() {
            const title = document.getElementById('mcPostTitle').value.trim();
            const content = document.getElementById('mcPostContent').value.trim();
            const isAnonymous = document.getElementById('mcAnonymous')?.checked || false;
            const postType = document.getElementById('mcPostType')?.value || 'general';

            if (!content || content.length === 0) {
                alert('Please enter some content');
                return;
            }

            try {
                const post = await createPost({
                    title: title || '', // Title is optional in new UI
                    content,
                    is_anonymous: isAnonymous,
                    category: postType,
                    semester: config.semester,
                    subject: config.subject
                });

                this.closeCreateModal();
                this.refresh();
            } catch (error) {
                alert('Failed to create post: ' + error.message);
            }
        },

        promptLogin() {
            // Redirect to Materio login
            window.location.href = '/account?callback=' + encodeURIComponent(window.location.href);
        },

        // Initialize with config
        init(containerEl, userConfig = {}) {
            container = containerEl;
            config = { ...DEFAULT_CONFIG, ...userConfig };

            // Helper to get cookie by name
            const getCookie = (name) => {
                const nameEQ = name + "=";
                const ca = document.cookie.split(';');
                for (let i = 0; i < ca.length; i++) {
                    let c = ca[i].trim();
                    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
                }
                return null;
            };

            // Try to get user from Materio's localStorage or Cookie
            try {
                const materioUserStr = localStorage.getItem('materio_user') || getCookie('materio_user');
                if (materioUserStr) {
                    let materioUser;
                    try {
                        materioUser = JSON.parse(materioUserStr);
                    } catch (e) {
                        materioUser = JSON.parse(decodeURIComponent(materioUserStr));
                    }

                    currentUser = {
                        id: materioUser.id || materioUser.uid || materioUser.username || materioUser.email,
                        name: materioUser.displayName || materioUser.name || materioUser.username || 'User',
                        email: materioUser.email,
                        role: materioUser.role || (materioUser.hasAdminPrivileges ? 'admin' : 'student'),
                        avatar: materioUser.profilePicture || materioUser.photoURL || materioUser.avatar
                    };

                    // Check if token is inside user object as fallback
                    if (!authToken) {
                        authToken = materioUser.token || materioUser.accessToken || materioUser.auth_token;
                    }
                }

                // Get auth token from Materio's specific key
                if (!authToken) {
                    authToken = localStorage.getItem('materio_auth_token') ||
                        localStorage.getItem('materio_token') ||
                        getCookie('materio_auth_token') ||
                        getCookie('materio_token');
                }
            } catch (e) {
                console.warn('Failed to read Materio user data:', e);
            }

            render();
        }
    };

    // ============================================
    // AUTO-INITIALIZATION
    // ============================================

    function initStyles() {
        if (document.getElementById('materio-community-styles')) return;

        const styleEl = document.createElement('style');
        styleEl.id = 'materio-community-styles';
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
    }

    function autoInit() {
        initStyles();

        // Find container element
        const el = document.getElementById('materio-community');
        if (!el) return;

        // Read config from data attributes
        const dataConfig = {
            apiUrl: el.dataset.apiUrl,
            theme: el.dataset.theme,
            semester: el.dataset.semester,
            subject: el.dataset.subject,
            feedType: el.dataset.feedType,
            postsPerPage: parseInt(el.dataset.postsPerPage) || undefined,
            enableAnonymous: el.dataset.enableAnonymous !== 'false',
            enableNotes: el.dataset.enableNotes !== 'false',
            enableAttachments: el.dataset.enableAttachments !== 'false'
        };

        // Remove undefined values
        Object.keys(dataConfig).forEach(key => {
            if (dataConfig[key] === undefined) delete dataConfig[key];
        });

        window.MaterioCommunit.init(el, dataConfig);
    }

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (config.theme === 'auto') {
            const communityEl = document.querySelector('.materio-community');
            if (communityEl) {
                communityEl.classList.toggle('dark', detectTheme() === 'dark');
            }
        }
    });
})();
