/**
 * Materio Analytics/Metrics Client
 * Handles data collection: Page Views, PDF Reads, Engagement Time
 * Integrates with /collect and /identify endpoints
 */

(function () {
  'use strict';

  // Environment detection
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // UPDATE THIS URL after you rename the Vercel project
  const API_BASE = isLocal ? 'http://localhost:3000' : 'https://materiosync.vercel.app';

  const CONFIG = {
    DATA_PUSH: `${API_BASE}/sync`,
    DATA_VERIFY: `${API_BASE}/client`,
    BATCH_INTERVAL: 60000,
    MIN_ENGAGEMENT_TIME: 2000,
    STORAGE_KEY_V1: 'm_v1_store',
    STORAGE_KEY_ID: 'm_u_id',
    // STORAGE_KEY_TOKEN: 'materio_auth_token'
  };

  class MetricsClient {
    constructor() {
      this.buffer = [];
      this.sessionId = this.generateUUID();
      this.anonymousId = this.getAnonymousId();
      this.isTrackingEngagement = false;
      this.engagementStartTime = Date.now();
      this.pdfStartTime = null;
      this.currentPdf = null;
      this.hasIdentified = false;
      this.pendingPdfTitle = null;

      // Initial setup
      this.loadBuffer();
      this.setupEventListeners();

      // Track initial entry
      this.push('page_view', {
        title: document.title,
        path: window.location.pathname
      });

      // Attempt verification if user is logged in
      this.verify();
    }

    generateUUID() {
      if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    getAnonymousId() {
      let id = localStorage.getItem(CONFIG.STORAGE_KEY_ID);
      if (!id) {
        id = this.generateUUID();
        localStorage.setItem(CONFIG.STORAGE_KEY_ID, id);
      }
      return id;
    }

    getUserId() {
      const token = localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN);
      if (!token) return null;

      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        return payload.sub || payload.id || payload.user_id || payload.uid;
      } catch (e) {
        return null;
      }
    }

    async verify() {
      const userId = this.getUserId();
      if (userId && !this.hasIdentified) {
        try {
          const response = await fetch(CONFIG.DATA_VERIFY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              anonymousId: this.anonymousId
            })
          });

          if (response.ok) {
            this.hasIdentified = true;
            this.syncStats(userId);
          }
        } catch (e) {
        }
      }
    }

    async syncStats(userId) {
      try {
        const response = await fetch(`${API_BASE}/stats/${userId}?period=all_time`);
        if (response.ok) {
          const data = await response.json();
          const stats = {
            pdfsRead: data.metrics.unique_pdfs_count || 0,
            timeSpent: (data.metrics.reading_time_seconds || 0) + (data.metrics.engagement_time_seconds || 0),
            streak: data.streak || 0,
            trends: data.trends || {},
            history: data.history || [],
            lastReadDate: null
          };

          if (stats.history.length > 0) {
            stats.lastReadDate = stats.history[0].date.split('T')[0];
          }

          localStorage.setItem('materio_user_stats', JSON.stringify(stats));
          window.dispatchEvent(new CustomEvent('materio-stats-updated', { detail: stats }));
        }
      } catch (e) {
      }
    }

    push(eventName, properties = {}) {
      const event = {
        type: eventName,
        data: properties,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        url: window.location.href,
        referrer: document.referrer
      };

      this.buffer.push(event);
      this.saveBuffer();

      if (this.buffer.length >= 50) {
        this.flush();
      }
    }

    loadBuffer() {
      try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY_V1);
        if (stored) {
          this.buffer = JSON.parse(stored);
        }
      } catch (e) {
        this.buffer = [];
      }
    }

    saveBuffer() {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY_V1, JSON.stringify(this.buffer));
      } catch (e) {
      }
    }

    async flush() {
      if (this.buffer.length === 0) return;

      const eventsToSend = [...this.buffer];
      this.buffer = [];
      this.saveBuffer();

      try {
        const payload = {
          anonymousId: this.anonymousId,
          userId: this.getUserId(),
          events: eventsToSend
        };

        if (navigator.sendBeacon && document.visibilityState === 'hidden') {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(CONFIG.DATA_PUSH, blob);
        } else {
          const response = await fetch(CONFIG.DATA_PUSH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }
      } catch (e) {
        this.buffer = [...eventsToSend, ...this.buffer];
        this.saveBuffer();
      }
    }

    setupEventListeners() {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.stopEngagementTracking();
          this.flush();
        } else {
          this.startEngagementTracking();
        }
      });

      window.addEventListener('beforeunload', () => {
        this.stopEngagementTracking();
        this.flush();
      });

      this.setupPdfTracking();

      const submitBtn = document.getElementById('submitButton');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          this.captureDropdownSelection();
        });
      }
    }

    captureDropdownSelection() {
      try {
        const subject = document.getElementById('subjectSelect');
        const topic = document.getElementById('topicSelect');
        const category = document.getElementById('categorySelect');

        let name = '';

        if (topic && topic.selectedIndex >= 0) {
          name = topic.options[topic.selectedIndex].text;
          if (name === 'Select Topic') name = '';
        }

        if (!name && category && category.selectedIndex >= 0) {
          name = category.options[category.selectedIndex].text;
          if (name === 'Select Category') name = '';
        }

        if (subject && subject.selectedIndex >= 0) {
          const subName = subject.options[subject.selectedIndex].text;
          if (subName !== 'Select Subject') {
            this.pendingPdfTitle = name ? `${subName} - ${name}` : subName;
          } else {
            this.pendingPdfTitle = name || 'Unknown Document';
          }
        } else {
          this.pendingPdfTitle = name || 'Unknown Document';
        }
      } catch (e) {
        console.warn('Error capturing dropdown selection:', e);
      }
    }

    startBatchTimer() {
    }

    startEngagementTracking() {
      this.engagementStartTime = Date.now();
    }

    stopEngagementTracking() {
      const timeSpent = Date.now() - this.engagementStartTime;
      if (timeSpent >= CONFIG.MIN_ENGAGEMENT_TIME) {
        this.push('user_engagement', {
          duration_ms: timeSpent,
          duration_sec: Math.round(timeSpent / 1000)
        });
      }
    }

    setupPdfTracking() {
      const popup = document.getElementById('popup');
      const popupContent = document.getElementById('popupContent');

      if (!popup) return;

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isVisible = popup.style.display !== 'none' && popup.style.display !== '';

            if (isVisible && !this.currentPdf) {
              // Capture title right now just in case the button listener was bypassed or fired late
              this.captureDropdownSelection();
              this.handlePdfOpen(popupContent);
            } else if (!isVisible && this.currentPdf) {
              this.handlePdfClose();
            }
          }
        });
      });

      observer.observe(popup, { attributes: true });
    }

    handlePdfOpen(container) {
      const extractUrl = () => {
        const iframe = container.querySelector('iframe');
        let extractedUrl = 'unknown';

        if (iframe) {
          try {
            if (iframe.src.includes('viewer.html') || iframe.src.includes('oread/web/viewer.html')) {
              const src = new URL(iframe.src, window.location.origin);
              const fileParam = src.searchParams.get('file');
              if (fileParam) {
                extractedUrl = decodeURIComponent(fileParam);
              } else {
                extractedUrl = iframe.src;
              }
            } else {
              extractedUrl = iframe.src;
            }
          } catch (e) {
            extractedUrl = iframe.src;
          }

          if (extractedUrl === 'unknown' || extractedUrl.startsWith('blob:') || extractedUrl === 'about:blank') {
            const attrUrl = iframe.getAttribute('data-src') || iframe.getAttribute('data-file-url') || iframe.getAttribute('src');
            if (attrUrl && attrUrl.length > 5 && !attrUrl.startsWith('about:blank')) extractedUrl = attrUrl;
          }
        }

        if (extractedUrl === 'unknown' || extractedUrl.includes('viewer.html')) {
          const containerUrl = container.getAttribute('data-pdf-url') || container.getAttribute('data-filename');
          if (containerUrl) extractedUrl = containerUrl;
        }

        return extractedUrl;
      };

      let pdfUrl = extractUrl();
      // Ensure we use the latest captured title
      const title = this.pendingPdfTitle || 'Unknown PDF';

      if (pdfUrl === 'unknown' || pdfUrl === 'about:blank' || pdfUrl.startsWith('blob:') || pdfUrl.includes('viewer.html')) {
        setTimeout(() => {
          pdfUrl = extractUrl();
          // Final fallback: Use Title as the URL identifier if no real URL found
          if ((pdfUrl === 'unknown' || pdfUrl === 'about:blank' || pdfUrl.startsWith('blob:') || pdfUrl.includes('viewer.html')) && this.pendingPdfTitle) {
            pdfUrl = this.pendingPdfTitle;
          }
          this.currentPdf = pdfUrl;
          this.pdfStartTime = Date.now();
          this.push('pdf_open', { url: pdfUrl, title: title });
        }, 800); // Increased delay slightly
      } else {
        this.currentPdf = pdfUrl;
        this.pdfStartTime = Date.now();
        this.push('pdf_open', { url: pdfUrl, title: title });
      }
    }

    handlePdfClose() {
      if (!this.currentPdf) return;
      const duration = Date.now() - this.pdfStartTime;
      this.push('pdf_close', {
        url: this.currentPdf,
        duration_ms: duration,
        duration_sec: Math.round(duration / 1000)
      });
      this.currentPdf = null;
      this.pdfStartTime = null;
    }
  }

  window.MetricsClient = new MetricsClient();
  window.SyncManager = window.MetricsClient;
})();
