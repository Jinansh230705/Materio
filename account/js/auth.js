// Constants
// For this scenario, we're always targeting the production auth server
// Since we're running the main app locally but using the deployed auth server
const API_URL = '/.netlify/functions';
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
    const response = await fetch(`${API_URL}/${endpoint}`, options);    // Parse response
    let result;
    try {
      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();
      
      try {
        // Try to parse as JSON first
        result = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get as text from the cloned response
        try {
          const textResponse = await responseClone.text();
          result = { error: textResponse || 'Unknown server error' };
        } catch (textError) {
          result = { error: 'Unable to parse server response' };
        }
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      throw new Error(`Failed to parse server response: ${parseError.message}`);
    }
    
    // Handle API errors
    if (!response.ok) {
      console.error('API Error Response:', result);
      throw new Error(result.error || result.message || 'Something went wrong');
    }
    
    return result;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Auth Functions
function isAuthenticated() {
  return !!localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
}

function getAuthToken() {
  return localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
}

function clearAuthToken() {
  localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
}

function redirectToProfile() {
  // In development mode (localhost), always use profile.html
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
                      
  if (isLocalhost) {    window.location.href = '/account/profile.html';
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
document.addEventListener('DOMContentLoaded', function() {
  const toggleButtons = document.querySelectorAll('.toggle-password');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
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
  const currentPage = window.location.pathname.split('/').pop();
  
  // Pages that require authentication
  const authRequiredPages = ['profile'];
  
  // Pages that are for non-authenticated users
  const nonAuthPages = ['index', 'signup', 'forgot-password', ''];

  if (authRequiredPages.includes(currentPage) && !isAuthenticated()) {
    // Redirect to login if trying to access protected page without auth
    redirectToLogin();
  } else if (nonAuthPages.includes(currentPage) && isAuthenticated()) {
    // Redirect to profile if already logged in but trying to access login pages
    redirectToProfile();
  }
});
