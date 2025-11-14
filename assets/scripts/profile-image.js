document.addEventListener('DOMContentLoaded', function() {
  // Constants for authentication storage
  const LOCAL_STORAGE_TOKEN_KEY = 'materio_auth_token';
  const LOCAL_STORAGE_USER_KEY = 'materio_user';
    // Get the profile image elements
  const profileImage = document.getElementById('profile-image');
  const settingsIcon = document.getElementById('settings-icon');
  const accountProfileImage = document.getElementById('account-profile-image');
  const accountName = document.getElementById('account-name');
  const accountUsername = document.getElementById('account-username');
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileIconLink = document.querySelector('.profile-icon');
  
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
  
  // Update navbar elements - always show profile icon with dropdown for everyone
  if (profileImage && settingsIcon) {
    if (isLoggedIn) {
      // User is logged in: Show their profile image
      updateProfileImage(profileImage);
      profileImage.style.display = 'block';
      settingsIcon.style.display = 'none';
    } else {
      // User is not logged in: Show default profile icon (not settings icon)
      profileImage.style.display = 'block';
      profileImage.src = '/assets/img/default-avatar.svg';
      settingsIcon.style.display = 'none';
    }
    
    // Always set up profile dropdown functionality (for both logged in and logged out users)
    setupProfileDropdown();
  }
  
  // Update account card in settings tab
  if (accountProfileImage && accountName) {
    if (isLoggedIn) {
      updateAccountCard();
    } else {
      // Set default state for not logged in
      accountProfileImage.src = '/assets/img/default-avatar.svg';
      accountName.textContent = 'Log in to Materio Account';
      accountUsername.textContent = '';
    }
  }
  
  // Function to set up profile dropdown functionality
  function setupProfileDropdown() {
    if (!profileIconLink || !profileDropdown) return;
    
    // Add a special class to mark this as having dropdown functionality
    profileIconLink.classList.add('has-dropdown');
    
    // Add click event listener to profile icon
    profileIconLink.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Only toggle dropdown if clicking on the image or icon itself, not the dropdown
      if (!e.target.closest('.profile-dropdown')) {
        const currentDropdown = document.getElementById('profile-dropdown');
        if (currentDropdown) {
          const isShowing = currentDropdown.classList.contains('show');
          currentDropdown.classList.toggle('show');
          
          // Update aria-hidden for accessibility
          currentDropdown.setAttribute('aria-hidden', isShowing ? 'true' : 'false');
          
          // Focus management for accessibility
          if (!isShowing) {
            // Dropdown is now open, focus first item
            const firstItem = currentDropdown.querySelector('.dropdown-item');
            if (firstItem) {
              firstItem.focus();
            }
          }
        }
      }
    }, true);
    
    // Handle settings dropdown item click (prevent default and trigger tab switch)
    const settingsDropdownItem = profileDropdown.querySelector('.dropdown-item[data-action="settings"]');
    if (settingsDropdownItem) {
      settingsDropdownItem.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Close dropdown
        profileDropdown.classList.remove('show');
        profileDropdown.setAttribute('aria-hidden', 'true');
        
        // Trigger settings tab switch
        showSettingsTab();
      });
    }
    
    // Handle downloads dropdown item click (prevent default and trigger tab switch)
    const downloadsDropdownItem = profileDropdown.querySelector('.dropdown-item[data-action="downloads"]');
    if (downloadsDropdownItem) {
      downloadsDropdownItem.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Close dropdown
        profileDropdown.classList.remove('show');
        profileDropdown.setAttribute('aria-hidden', 'true');
        
        // Trigger downloads tab switch
        showDownloadsTab();
      });
    }
    
    // The profile dropdown item will work naturally as an anchor link to /account/profile
    
    // Close dropdown when clicking outside
    document.addEventListener('click', handleOutsideClick);
    
    // Handle keyboard navigation
    document.addEventListener('keydown', handleDropdownKeydown);
    
    // Set initial aria state
    profileDropdown.setAttribute('aria-hidden', 'true');
  }
  
  // Function to set up settings click for non-logged users
  function setupSettingsClick() {
    if (!profileIconLink) return;
    
    // Remove existing event listeners
    profileIconLink.removeEventListener('click', handleProfileClick);
    
    // Add click event listener for settings
    profileIconLink.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      showSettingsTab();
    });
  }
  
  // Handle profile icon click
  // Handle clicks outside dropdown
  function handleOutsideClick(e) {
    const currentProfileIconLink = document.querySelector('.profile-icon');
    const currentProfileDropdown = document.getElementById('profile-dropdown');
    
    if (currentProfileDropdown && 
        !currentProfileIconLink.contains(e.target) && 
        !currentProfileDropdown.contains(e.target)) {
      currentProfileDropdown.classList.remove('show');
      currentProfileDropdown.setAttribute('aria-hidden', 'true');
    }
  }
  
  // Handle dropdown item clicks
  // Handle keyboard navigation
  function handleDropdownKeydown(e) {
    const currentProfileDropdown = document.getElementById('profile-dropdown');
    const currentProfileIconLink = document.querySelector('.profile-icon');
    
    if (!currentProfileDropdown.classList.contains('show')) return;
    
    const items = currentProfileDropdown.querySelectorAll('.dropdown-item');
    const currentIndex = Array.from(items).indexOf(document.activeElement);
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        currentProfileDropdown.classList.remove('show');
        currentProfileDropdown.setAttribute('aria-hidden', 'true');
        currentProfileIconLink.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex].focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement.classList.contains('dropdown-item')) {
          document.activeElement.click();
        }
        break;
    }
  }
  
  // Function to show settings tab
  function showSettingsTab() {
    // Use the same logic as main.js for tab switching
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const settingsContent = document.getElementById('settings');
    
    if (settingsContent) {
      // Remove active class from all tabs and contents, change icons to regular
      tabLinks.forEach(tab => {
        tab.classList.remove('active');
        const icon = tab.querySelector('i');
        if (icon && !tab.querySelector('img')) {
          icon.classList.remove('fas');
          icon.classList.add('far');
        }
      });
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to profile icon (since it represents settings when logged in)
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
      
      // Hide search dropdown (settings tab is not home)
      const searchResults = document.getElementById('quickSearchResults');
      if (searchResults) {
        searchResults.style.display = 'none';
      }
      
      // Update cookie
      if (typeof setCookie === 'function') {
        setCookie('activeTab', 'settings', 7);
      }
    }
  }
  
  // Function to show downloads tab
  function showDownloadsTab() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const downloadsContent = document.getElementById('downloads');
    
    if (downloadsContent) {
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
      
      // Hide search dropdown (downloads tab is not home)
      const searchResults = document.getElementById('quickSearchResults');
      if (searchResults) {
        searchResults.style.display = 'none';
      }
      
      // Update cookie
      if (typeof setCookie === 'function') {
        setCookie('activeTab', 'downloads', 7);
      }
      
      // Trigger downloads load
      if (typeof window.loadDownloads !== 'undefined') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const event = new Event('downloadsTabOpened');
          document.dispatchEvent(event);
        }, 100);
      }
    }
  }
  
  // Helper function to set cookie (copied from main.js for consistency)
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }
  
  // Function to update profile image
  function updateProfileImage(imgElement) {
    if (isLoggedIn) {
      const userData = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user.profilePicture) {
            imgElement.src = user.profilePicture;
            // console.log('Profile image updated');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }
  
  // Function to update account card in settings tab
  function updateAccountCard() {
    const userData = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        // Update profile picture
        if (user.profilePicture) {
          accountProfileImage.src = user.profilePicture;
        }
        
        // Update display name and username
        if (user.displayName) {
          accountName.innerHTML = user.displayName;
        } else {
          accountName.innerHTML = user.username;
        }
        
        // Add verified badges
        if (user.hasAdminPrivileges) {
          accountName.innerHTML += '<i class="fas fa-badge-check verified-badge admin" title="Admin"></i>';
        } else if (user.isPlusUser) {
          accountName.innerHTML += '<i class="fas fa-badge-check verified-badge plus" title="Plus User"></i>';
        }
        
        if (user.username) {
          accountUsername.textContent = '@' + user.username;
        }
      } catch (error) {
        console.error('Error updating account card:', error);
      }
    }
  }
});