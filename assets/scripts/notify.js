/**
 * Notifications Module (ESM)
 * Fetches and displays system notifications with badge management.
 * 
 * @module notify
 */

import { setCookie, getCookie, formatDateTime } from './utils.js';

// Module state
let globalNotifications = [];

/**
 * Generate fake notifications for testing
 * @param {number} count - Number of notifications to generate
 * @returns {Array} Array of fake notification objects
 */
function generateFakeNotifications(count = 5) {
  const fakeNotifications = [];
  for (let i = 0; i < count; i++) {
    fakeNotifications.push({
      date: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 5)).toISOString(),
      title: `Test Notification ${i + 1}`,
      message: `This is a fake notification created for testing (notification ${i + 1}).`,
      links: []
    });
  }
  return fakeNotifications;
}

/**
 * Display notifications in the notification board
 * @param {Array} notifications - Array of notification objects
 */
function displayNotifications(notifications) {
  const container = document.getElementById('notificationBoard');
  if (!container) return;

  container.innerHTML = '';

  // Reset layout styles
  container.style.display = '';
  container.style.flexDirection = '';
  container.style.justifyContent = '';
  container.style.alignItems = '';
  container.style.minHeight = '';

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 10);

  const validNotifications = notifications
    .filter(n => new Date(n.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (validNotifications.length === 0) {
    renderEmptyState(container);
    return;
  }

  validNotifications.forEach(notification => {
    const card = createNotificationCard(notification);
    container.appendChild(card);
  });
}

/**
 * Render empty state when no notifications
 * @param {HTMLElement} container
 */
function renderEmptyState(container) {
  // Apply centering styles
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.minHeight = '60vh';

  // Create image element for empty state
  const emptyImg = document.createElement('img');
  emptyImg.src = '/assets/img/193d8b46-eaed-423e-9673-5bed950377ba.webp';
  emptyImg.alt = 'All Caught Up!';
  emptyImg.style.display = 'block';
  emptyImg.style.margin = '0 auto';
  emptyImg.style.height = 'auto';
  emptyImg.style.opacity = '0.7';
  emptyImg.classList.add('empty-state-img');

  // Add responsive styles if not already present
  if (!document.getElementById('notify-empty-style')) {
    const style = document.createElement('style');
    style.id = 'notify-empty-style';
    style.innerHTML = `
            .empty-state-img {
                max-width: 550px;
                width: 100%;
            }
            @media (max-width: 768px) {
                .empty-state-img {
                    max-width: 350px;
                }
            }
        `;
    document.head.appendChild(style);
  }

  container.appendChild(emptyImg);

  // Create text element below image
  const emptyText = document.createElement('p');
  emptyText.textContent = 'All Caught Up !';
  emptyText.style.textAlign = 'center';
  emptyText.style.marginTop = '16px';
  emptyText.style.marginBottom = '0';
  emptyText.style.color = '#666';
  emptyText.style.fontSize = '18px';
  emptyText.style.fontWeight = '900';

  container.appendChild(emptyText);
}

/**
 * Create a notification card element
 * @param {Object} notification - Notification data
 * @returns {HTMLElement} Card element
 */
function createNotificationCard(notification) {
  const card = document.createElement('div');
  card.classList.add('card-layout');
  card.id = 'notify';

  const title = document.createElement('h3');
  title.textContent = notification.title;
  card.appendChild(title);

  const message = document.createElement('p');
  message.textContent = notification.message;
  card.appendChild(message);

  const dateElem = document.createElement('span');
  dateElem.classList.add('notification-date');
  dateElem.textContent = formatDateTime(notification.date);
  card.appendChild(dateElem);

  if (notification.links?.length > 0) {
    const linksContainer = document.createElement('div');
    linksContainer.classList.add('notification-links');
    notification.links.forEach(linkObj => {
      const link = document.createElement('a');
      link.href = linkObj.url;
      link.textContent = linkObj.text;
      linksContainer.appendChild(link);
    });
    card.appendChild(linksContainer);
  }

  if (document.body.classList.contains('dark-mode')) {
    card.classList.add('dark-mode');
  }

  return card;
}

/**
 * Update the notification badge count
 * @param {Array} notifications - Array of notification objects
 */
function updateNotificationBadge(notifications) {
  const lastSeenCookie = getCookie('lastSeenNotification');
  const lastSeen = lastSeenCookie ? new Date(lastSeenCookie) : null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 10);

  const newCount = notifications
    .filter(n => new Date(n.date) >= cutoff)
    .filter(n => !lastSeen || new Date(n.date) > lastSeen)
    .length;

  const bellLink = document.querySelector('.tab-link[data-tab="notifications"]');
  if (!bellLink) return;

  // Remove old badge
  const oldBadge = bellLink.querySelector('.notification-badge');
  if (oldBadge) {
    oldBadge.remove();
  }

  if (newCount > 0) {
    const badge = document.createElement('span');
    badge.classList.add('notification-badge');
    badge.textContent = newCount;

    // Apply badge styles
    Object.assign(badge.style, {
      backgroundColor: '#ff8400',
      color: '#fff',
      borderRadius: '50%',
      height: '14px',
      width: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '8px',
      position: 'absolute',
      zIndex: '1'
    });

    // Position based on viewport
    if (window.innerWidth < 768) {
      badge.style.top = '18px';
      badge.style.right = '18px';
    } else {
      badge.style.top = '4px';
      badge.style.right = '16px';
    }

    bellLink.style.position = 'relative';
    bellLink.appendChild(badge);
  }
}

/**
 * Fetch notifications from server
 * @returns {Promise<Array>}
 */
async function fetchNotifications() {
  const notifyUrl = window.MaterioLocalCDN?.transformUrl(
    'https://cdn-materioa.vercel.app/notifications.json'
  ) || 'https://cdn-materioa.vercel.app/notifications.json';

  try {
    const response = await fetch(notifyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading notifications:', error);
    return [];
  }
}

/**
 * Setup tab click handlers for badge removal
 */
function setupTabClickHandlers() {
  document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', function () {
      const tab = this.getAttribute('data-tab');
      if (tab === 'notifications' && !window.devMode) {
        setCookie('lastSeenNotification', new Date().toISOString(), 7);

        const bellLink = document.querySelector('.tab-link[data-tab="notifications"]');
        const badge = bellLink?.querySelector('.notification-badge');
        if (badge) {
          badge.remove();
        }
      } else if (tab === 'notifications') {
        console.log('Dev mode active: badge remains visible');
      }
    });
  });
}

/**
 * Enable dev mode for testing notifications
 */
function enableDevMode() {
  window.devMode = true;
  console.log('Dev mode enabled for notifications. Badge removal is disabled.');
  setCookie('lastSeenNotification', '', -1);
  globalNotifications = generateFakeNotifications();
  displayNotifications(globalNotifications);
  updateNotificationBadge(globalNotifications);
}

/**
 * Generate test notifications (dev mode only)
 * @param {number} count - Number of notifications to generate
 */
function generateTestNotifications(count) {
  if (!window.devMode) {
    console.log('Activate dev mode first by typing test();');
    return;
  }
  globalNotifications = generateFakeNotifications(count);
  displayNotifications(globalNotifications);
  updateNotificationBadge(globalNotifications);
}

/**
 * Initialize notifications module
 */
async function init() {
  if (!window.devMode) {
    globalNotifications = await fetchNotifications();
  } else {
    globalNotifications = generateFakeNotifications();
  }

  displayNotifications(globalNotifications);
  updateNotificationBadge(globalNotifications);
  setupTabClickHandlers();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose dev mode functions to window
window.test = enableDevMode;
window.generate = generateTestNotifications;

// Export for module use
export {
  init,
  displayNotifications,
  updateNotificationBadge,
  fetchNotifications,
  enableDevMode,
  generateTestNotifications
};