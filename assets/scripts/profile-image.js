/**
 * Profile Image Module (ESM)
 * Handles user profile image display, dropdown functionality, and account card updates.
 * 
 * @module profile-image
 */

import { setCookie, getCookie } from './utils.js';

// Constants for authentication storage
const LOCAL_STORAGE_TOKEN_KEY = 'materio_auth_token';
const LOCAL_STORAGE_USER_KEY = 'materio_user';

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isUserLoggedIn() {
  // Check both localStorage and cookies for production compatibility
  return !!(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY) ||
    localStorage.getItem(LOCAL_STORAGE_USER_KEY) ||
    getCookie(LOCAL_STORAGE_TOKEN_KEY) ||
    getCookie(LOCAL_STORAGE_USER_KEY));
}

/**
 * Get current user data
 * @returns {Object|null}
 */
function getUserData() {
  const userData = localStorage.getItem(LOCAL_STORAGE_USER_KEY) || getCookie(LOCAL_STORAGE_USER_KEY);
  if (!userData) return null;

  try {
    return typeof userData === 'string' ? JSON.parse(userData) : userData;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Update profile image element with user's image
 * @param {HTMLImageElement} imgElement
 */
function updateProfileImage(imgElement) {
  const user = getUserData();
  if (user?.profilePicture) {
    imgElement.src = user.profilePicture;
  }
}

/**
 * Update account card in settings tab
 * @param {HTMLImageElement} accountProfileImage
 * @param {HTMLElement} accountName
 * @param {HTMLElement} accountUsername
 */
function updateAccountCard(accountProfileImage, accountName, accountUsername) {
  const user = getUserData();
  if (!user) return;

  // Update profile picture
  if (user.profilePicture && accountProfileImage) {
    accountProfileImage.src = user.profilePicture;
  }

  // Update display name and username
  if (accountName) {
    accountName.innerHTML = user.displayName || user.username || user.name || '';

    // Add verified badges
    if (user.hasAdminPrivileges) {
      accountName.innerHTML += '<i class="fas fa-badge-check verified-badge admin" title="Admin"></i>';
    } else if (user.isProUser || user.isPlusUser) {
      accountName.innerHTML += '<i class="fas fa-badge-check verified-badge pro" title="Pro User"></i>';
    } else if (user.isLiteUser) {
      accountName.innerHTML += '<i class="fas fa-badge-check verified-badge plus" title="Plus User"></i>';
    }
  }

  if (accountUsername && user.username) {
    accountUsername.textContent = '@' + user.username;
  }
}

/**
 * Show settings tab
 */
function showSettingsTab() {
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  const settingsContent = document.getElementById('settings');

  if (!settingsContent) return;

  // Remove active class from all tabs and contents
  tabLinks.forEach(tab => {
    tab.classList.remove('active');
    const icon = tab.querySelector('i');
    if (icon && !tab.querySelector('img')) {
      icon.classList.remove('fas');
      icon.classList.add('far');
    }
  });
  tabContents.forEach(content => content.classList.remove('active'));

  // Add active class to profile icon
  const profileIcon = document.querySelector('.profile-icon');
  if (profileIcon) {
    profileIcon.classList.add('active');
    const icon = profileIcon.querySelector('i');
    if (icon && !profileIcon.querySelector('img')) {
      icon.classList.remove('far');
      icon.classList.add('fas');
    }
  }

  // Show settings content
  settingsContent.classList.add('active');

  // Hide search dropdown
  const searchResults = document.getElementById('quickSearchResults');
  if (searchResults) {
    searchResults.style.display = 'none';
  }

  // Update cookie
  setCookie('activeTab', 'settings', 7);
}

/**
 * Show downloads tab
 */
function showDownloadsTab() {
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  const downloadsContent = document.getElementById('downloads');

  if (!downloadsContent) return;

  // Remove active class from all tabs and contents
  tabLinks.forEach(tab => tab.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  // Add active class to profile icon
  const profileIcon = document.querySelector('.profile-icon');
  if (profileIcon) {
    profileIcon.classList.add('active');
  }

  // Show downloads content
  downloadsContent.classList.add('active');

  // Hide search dropdown
  const searchResults = document.getElementById('quickSearchResults');
  if (searchResults) {
    searchResults.style.display = 'none';
  }

  // Update cookie
  setCookie('activeTab', 'downloads', 7);

  // Trigger downloads load
  setTimeout(() => {
    document.dispatchEvent(new Event('downloadsTabOpened'));
  }, 100);
}

/**
 * Handle clicks outside dropdown to close it
 * @param {Event} e
 */
function handleOutsideClick(e) {
  const profileIconLink = document.querySelector('.profile-icon');
  const profileDropdown = document.getElementById('profile-dropdown');

  if (profileDropdown &&
    !profileIconLink?.contains(e.target) &&
    !profileDropdown.contains(e.target)) {
    profileDropdown.classList.remove('show');
    profileDropdown.setAttribute('aria-hidden', 'true');
    profileDropdown.querySelectorAll('.dropdown-item').forEach(
      item => item.setAttribute('tabindex', '-1')
    );
    // Reset submenus
    profileDropdown.querySelectorAll('.has-submenu').forEach(
      p => p.classList.remove('submenu-open')
    );
  }
}

/**
 * Handle keyboard navigation in dropdown
 * @param {KeyboardEvent} e
 */
function handleDropdownKeydown(e) {
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileIconLink = document.querySelector('.profile-icon');

  if (!profileDropdown?.classList.contains('show')) return;

  const items = profileDropdown.querySelectorAll('.dropdown-item');
  const currentIndex = Array.from(items).indexOf(document.activeElement);

  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      profileDropdown.classList.remove('show');
      profileDropdown.setAttribute('aria-hidden', 'true');
      items.forEach(item => item.setAttribute('tabindex', '-1'));
      profileDropdown.querySelectorAll('.has-submenu').forEach(p => p.classList.remove('submenu-open'));
      profileIconLink?.focus();
      break;
    case 'ArrowDown':
      e.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (document.activeElement?.classList.contains('dropdown-item')) {
        document.activeElement.click();
      }
      break;
  }
}

/**
 * Set up profile dropdown functionality
 * @param {HTMLElement} profileIconLink
 * @param {HTMLElement} profileDropdown
 */
function setupProfileDropdown(profileIconLink, profileDropdown) {
  if (!profileIconLink || !profileDropdown) return;

  // Mark as having dropdown functionality
  profileIconLink.classList.add('has-dropdown');

  // Profile icon click handler
  profileIconLink.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (!e.target.closest('.profile-dropdown')) {
      const isShowing = profileDropdown.classList.contains('show');

      // Haptic feedback
      if (window.MaterioHaptics) {
        window.MaterioHaptics.vibrate(isShowing ? 'dropdownClose' : 'dropdownOpen');
      }

      profileDropdown.classList.toggle('show');
      profileDropdown.setAttribute('aria-hidden', isShowing ? 'true' : 'false');

      // Update tabindex for focusable items
      const dropdownItems = profileDropdown.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.setAttribute('tabindex', isShowing ? '-1' : '0');
      });

      // Focus first item when opening
      if (!isShowing) {
        dropdownItems[0]?.focus();
      }
    }
  }, true);

  // Settings dropdown item click
  const settingsItem = profileDropdown.querySelector('.dropdown-item[data-action="settings"]');
  if (settingsItem) {
    settingsItem.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (window.MaterioHaptics) {
        window.MaterioHaptics.vibrate('select');
      }

      profileDropdown.classList.remove('show');
      profileDropdown.setAttribute('aria-hidden', 'true');
      profileDropdown.querySelectorAll('.dropdown-item').forEach(
        item => item.setAttribute('tabindex', '-1')
      );

      showSettingsTab();
    });
  }

  // Downloads dropdown item click
  const downloadsItem = profileDropdown.querySelector('.dropdown-item[data-action="downloads"]');
  if (downloadsItem) {
    downloadsItem.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (window.MaterioHaptics) {
        window.MaterioHaptics.vibrate('select');
      }

      profileDropdown.classList.remove('show');
      profileDropdown.setAttribute('aria-hidden', 'true');
      profileDropdown.querySelectorAll('.dropdown-item').forEach(
        item => item.setAttribute('tabindex', '-1')
      );

      showDownloadsTab();
    });
  }

  // Handle nested submenu interactions (event delegation for dynamic classes)
  profileDropdown.addEventListener('click', function (e) {
    const parent = e.target.closest('.has-submenu');
    if (!parent) return;

    // If we clicked inside the submenu itself (on an actual item), don't toggle the submenu
    if (e.target.closest('.dropdown-submenu')) return;

    // Prevent event from bubbling up, closing the menu, or following links
    e.preventDefault();
    e.stopPropagation();

    const isOpening = !parent.classList.contains('submenu-open');

    // Close all other submenus in this dropdown
    profileDropdown.querySelectorAll('.has-submenu').forEach(p => {
      if (p !== parent) p.classList.remove('submenu-open');
    });

    // Toggle this one
    parent.classList.toggle('submenu-open');

    if (window.MaterioHaptics) {
      window.MaterioHaptics.vibrate(isOpening ? 'dropdownOpen' : 'dropdownClose');
    }
  });

  // Close dropdown when any item inside a submenu is clicked
  profileDropdown.addEventListener('click', function (e) {
    const item = e.target.closest('.dropdown-submenu .dropdown-item');
    if (!item) return;

    // Close everything
    profileDropdown.classList.remove('show');
    profileDropdown.setAttribute('aria-hidden', 'true');
    profileDropdown.querySelectorAll('.has-submenu').forEach(p => p.classList.remove('submenu-open'));

    if (window.MaterioHaptics) {
      window.MaterioHaptics.vibrate('select');
    }
  });

  // Event listeners for closing dropdown
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleDropdownKeydown);

  // Initial aria state
  profileDropdown.setAttribute('aria-hidden', 'true');
}

/**
 * Log out current user
 */
window.handleLogout = function () {
  localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  // Also clear cookies
  document.cookie = LOCAL_STORAGE_TOKEN_KEY + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = LOCAL_STORAGE_USER_KEY + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  if (window.MaterioHaptics) {
    window.MaterioHaptics.vibrate('success');
  }

  // Delay reload slightly for haptic feedback
  setTimeout(() => {
    window.location.reload();
  }, 100);
}

/**
 * Initialize profile image module
 */
function init() {
  const profileImage = document.getElementById('profile-image');
  const settingsIcon = document.getElementById('settings-icon');
  const accountProfileImage = document.getElementById('account-profile-image');
  const accountName = document.getElementById('account-name');
  const accountUsername = document.getElementById('account-username');
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileIconLink = document.querySelector('.profile-icon');
  const accountLink = document.querySelector('.account-link');

  // Handle Profile dynamic nested menu elements
  const profileMenuItem = document.getElementById('profile-menu-item');
  const profileItemText = document.getElementById('profile-item-text');
  const profileChevron = document.getElementById('profile-chevron');
  const profileSubmenu = document.getElementById('profile-submenu');

  // Helper safe cookie reader to prevent external dependency crashes
  const getCookieSafe = (name) => {
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for(let i=0;i < ca.length;i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
      }
      return null;
    } catch(e) { return null; }
  };

  // Robust login check using local helper
  const isUserLoggedInSafe = () => {
    return !!(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY) ||
      localStorage.getItem(LOCAL_STORAGE_USER_KEY) ||
      getCookieSafe(LOCAL_STORAGE_TOKEN_KEY) ||
      getCookieSafe(LOCAL_STORAGE_USER_KEY));
  };

  const isLoggedIn = isUserLoggedInSafe();
  
  // Handle Profile Menu Item Logic (Run early to ensure UI state)
  if (profileMenuItem) {
    if (isLoggedIn) {
      // Add has-submenu class — CSS handles showing chevron and submenu
      profileMenuItem.classList.add('has-submenu');
      if (profileItemText) profileItemText.textContent = 'Profile';
    } else {
      // Remove has-submenu class — CSS hides chevron and submenu
      profileMenuItem.classList.remove('has-submenu');
      if (profileItemText) profileItemText.textContent = 'Account';
      // Login redirect is handled by inline onclick in HTML as a no-JS fallback
    }
  }

  // Update navbar elements
  if (profileImage && settingsIcon) {
    if (isLoggedIn) {
      updateProfileImage(profileImage);
      profileImage.style.display = 'block';
      settingsIcon.style.display = 'none';
    } else {
      profileImage.style.display = 'block';
      profileImage.src = '/assets/img/default-avatar.svg';
      settingsIcon.style.display = 'none';
    }

    setupProfileDropdown(profileIconLink, profileDropdown);
  }

  // Handle Handoff Code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const handoffCode = urlParams.get('handoff');

  if (handoffCode) {
    // Validate Handoff Code
    fetch('/api/v2/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: handoffCode,
        action: 'exchange'
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.token) {
          // Use the token to fetch full user profile to get Pro/Plus status and all perks
          return fetch('/api/v2/profile', {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          })
            .then(userRes => {
              if (!userRes.ok) throw new Error('Failed to fetch user profile');
              return userRes.json();
            })
            .then(userData => {
              // userData is likely { user: Object } based on profile.js
              return { token: data.token, user: userData.user || userData };
            });
        }
        throw new Error(data.error || 'Invalid handoff code');
      })
      .then(({ token, user }) => {
        // Store session
        localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));

        // Set cookies with a 7-day expiration (or match your auth duration)
        const date = new Date();
        date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
        const expires = "; expires=" + date.toUTCString();

        document.cookie = LOCAL_STORAGE_TOKEN_KEY + "=" + (token || "") + expires + "; path=/";
        document.cookie = LOCAL_STORAGE_USER_KEY + "=" + (JSON.stringify(user) || "") + expires + "; path=/";

        // Re-query DOM elements to avoid stale references
        const _profileImage = document.getElementById('profile-image');
        const _settingsIcon = document.getElementById('settings-icon');
        const _accountProfileImage = document.getElementById('account-profile-image');
        const _accountName = document.getElementById('account-name');
        const _accountUsername = document.getElementById('account-username');
        const _accountLink = document.querySelector('.account-link');
        const _profileMenuItem = document.getElementById('profile-menu-item');
        const _profileItemText = document.getElementById('profile-item-text');

        // Update navbar profile image
        if (_profileImage) {
          _profileImage.src = user.profilePicture || '/assets/img/default-avatar.svg';
          _profileImage.style.display = 'block';
        }
        if (_settingsIcon) _settingsIcon.style.display = 'none';

        // Update account card in settings tab
        if (_accountProfileImage) {
          _accountProfileImage.src = user.profilePicture || '/assets/img/default-avatar.svg';
        }

        if (_accountName) {
          _accountName.innerHTML = user.displayName || user.username || user.name || '';
          if (user.hasAdminPrivileges) {
            _accountName.innerHTML += '<i class="fas fa-badge-check verified-badge admin" title="Admin"></i>';
          } else if (user.isProUser || user.isPlusUser) {
            _accountName.innerHTML += '<i class="fas fa-badge-check verified-badge pro" title="Pro User"></i>';
          } else if (user.isLiteUser) {
            _accountName.innerHTML += '<i class="fas fa-badge-check verified-badge plus" title="Plus User"></i>';
          }
        }

        if (_accountUsername && user.username) {
          _accountUsername.textContent = '@' + user.username;
        }

        if (_accountLink) {
          _accountLink.href = '/account/profile';
        }

        // Re-enable profile menu (CSS handles chevron/submenu visibility via has-submenu class)
        if (_profileMenuItem) {
          _profileMenuItem.classList.add('has-submenu');
          if (_profileItemText) _profileItemText.textContent = 'Profile';
        }

        console.log('Session restored via handoff');

        // Clean URL
        urlParams.delete('handoff');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);

        // Dispatch auth event so other components can react to the login
        window.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));

        // Notify same-tab storage listeners (storage event only fires in other tabs)
        if (typeof window.checkAndApplyAdFreeExperience === 'function') {
          window.checkAndApplyAdFreeExperience();
        }

      })
      .catch(err => {
        console.error('Handoff validation failed:', err);
        // Clean URL anyway to avoid stale codes
        urlParams.delete('handoff');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
      });
  }



  // Update account card in settings tab
  if (accountProfileImage && accountName) {
    if (isLoggedIn) {
      updateAccountCard(accountProfileImage, accountName, accountUsername);
      if (accountLink) accountLink.href = '/account/profile';
    } else {
      accountProfileImage.src = '/assets/img/default-avatar.svg';
      accountName.textContent = 'Log in to Materio Account';
      if (accountUsername) {
        accountUsername.textContent = '';
      }
      if (accountLink) accountLink.href = '/account?callback=../';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for potential future use
export {
  init,
  isUserLoggedIn,
  getUserData,
  updateProfileImage,
  updateAccountCard,
  showSettingsTab,
  showDownloadsTab
};