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
  
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
  
  // Update navbar elements based on login status
  if (profileImage && settingsIcon) {
    if (isLoggedIn) {
      // User is logged in: Show profile image, hide settings icon
      updateProfileImage(profileImage);
      profileImage.style.display = 'block';
      settingsIcon.style.display = 'none';
    } else {
      // User is not logged in: Hide profile image, show settings icon
      profileImage.style.display = 'none';
      settingsIcon.style.display = 'block';
    }
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
  
  // Function to update profile image
  function updateProfileImage(imgElement) {
    if (isLoggedIn) {
      const userData = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user.profilePicture) {
            imgElement.src = user.profilePicture;
            console.log('Profile image updated');
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
          accountName.textContent = user.displayName;
        } else {
          accountName.textContent = user.username;
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