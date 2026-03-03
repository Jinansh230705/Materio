// Constants
// For this scenario, we're always targeting the production auth server
// Since we're running the main app locally but using the deployed auth server
const API_URL = '/api/v2';
const FRONTEND_URL = 'https://materioa.netlify.app';
const LOCAL_STORAGE_TOKEN_KEY = 'materio_auth_token';

// Utility Functions
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  const messageElement = notification.querySelector('.notification-message');

  // Set message and type
  messageElement.textContent = message;
  notification.className = `notification ${type}`;

  // Show notification
  notification.classList.add('show');

  // Auto hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 10000);

  // Close button event
  const closeButton = notification.querySelector('.notification-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      notification.classList.remove('show');
    });
  }
}

// API Calls
async function makeApiRequest(endpoint, method = 'GET', data = null, requiresAuth = false) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add auth token if required
    if (requiresAuth) {
      const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
      if (!token) {
        throw new Error('Authentication required');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
      credentials: 'same-origin'
    };
    // Add request body if needed
    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      options.body = JSON.stringify(data);
    }
    // Make fetch request
    console.log(`Making ${method} request to ${API_URL}/${endpoint}`, options);
    const response = await fetch(`${API_URL}/${endpoint}`, options);

    // Parse response
    let result;
    try {
      // Try to parse as JSON first
      const text = await response.text();
      try {
        result = text ? JSON.parse(text) : {};
      } catch (jsonError) {
        // If JSON parsing fails, use text or unknown error
        result = { error: text || 'Unknown server error' };
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      throw new Error(`Failed to parse server response: ${parseError.message}`);
    }

    // Handle API errors
    if (!response.ok) {
      console.error('API Error Response:', result);
      const error = new Error(result.error || result.message || 'API request failed');
      error.details = result.details;
      error.status = response.status;
      throw error;
    }

    return result;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Auth Functions
function isAuthenticated() {
  const localStorageToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
  const cookieToken = document.cookie.split('; ').find(row => row.startsWith('materio_auth_token='));

  // If localStorage has token but cookie doesn't, restore the cookie
  if (localStorageToken && !cookieToken) {
    console.log('Cookie missing but localStorage has token - restoring cookie');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    document.cookie = `${LOCAL_STORAGE_TOKEN_KEY}=${localStorageToken}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
    return true;
  }

  // If cookie has token but localStorage doesn't, sync them
  if (cookieToken && !localStorageToken) {
    const token = cookieToken.split('=')[1];
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
  }

  // Both must have token for user to be authenticated
  return !!(localStorageToken && cookieToken);
}

function getAuthToken() {
  return localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);

  // Also set it in a cookie for session persistence and server-side compatibility
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry
  document.cookie = `${LOCAL_STORAGE_TOKEN_KEY}=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
}

function clearAuthToken() {
  localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);

  // Also clear the cookie
  document.cookie = `${LOCAL_STORAGE_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function redirectToProfile() {
  // In development mode (localhost), always use profile.html
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    window.location.href = '/account/profile.html';
    return;
  }

  // Always redirect to profile.html
  window.location.href = '/account/profile.html';
}

function redirectToLogin() {
  window.location.href = '/account';
}

function redirectToMainSite() {
  window.location.href = FRONTEND_URL;
}

// Handle password visibility toggle
document.addEventListener('DOMContentLoaded', function () {
  const toggleButtons = document.querySelectorAll('.toggle-password');

  toggleButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const inputField = document.getElementById(targetId);

      if (inputField.type === 'password') {
        inputField.type = 'text';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      } else {
        inputField.type = 'password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      }
    });
  });
  // Protect authenticated pages
  const path = window.location.pathname;
  const currentPage = path.split('/').pop().replace('.html', '');

  // Pages that require authentication
  const authRequiredPages = ['profile', 'files', 'settings'];

  // Pages that are for non-authenticated users
  const nonAuthPages = ['index', 'signup', 'forgot-password', '', 'login'];

  if (authRequiredPages.includes(currentPage) && !isAuthenticated()) {
    // Redirect to login if trying to access protected page without auth
    redirectToLogin();
  } else if (nonAuthPages.includes(currentPage) && isAuthenticated()) {
    // Check if there is a redirect param before sending to profile
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('callback');

    if (redirectUrl) {
      // Already logged in - create a handoff code via API
      const token = getAuthToken();
      fetch('/api/v2/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => response.json())
        .then(data => {
          if (data.handoffCode) {
            const targetUrl = new URL(redirectUrl, window.location.origin);
            targetUrl.searchParams.set('handoff', data.handoffCode);
            window.location.href = targetUrl.toString();
          } else {
            // Fallback redirect
            window.location.href = redirectUrl;
          }
        })
        .catch(() => {
          // Fallback redirect
          window.location.href = redirectUrl;
        });
    } else {
      // Redirect to profile if already logged in but trying to access login pages
      redirectToProfile();
    }
  }
});
