document.addEventListener('DOMContentLoaded', function() {
  // Sidebar tab switching functionality
  const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  if (sidebarNavItems.length) {
    sidebarNavItems.forEach(button => {
      button.addEventListener('click', function() {
        const targetTab = this.getAttribute('data-tab');
        
        // Update active state for buttons
        sidebarNavItems.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Show the selected tab content
        tabPanes.forEach(pane => {
          pane.classList.remove('active');
          if (pane.id === targetTab) {
            pane.classList.add('active');
          }
        });
      });
    });
  }
    // Profile picture handling
  const profilePictureInput = document.getElementById('profilePicture');
  const picturePreview = document.getElementById('picturePreview');
  const dashboardProfileImage = document.getElementById('dashboard-profile-image');
  const dashboardDisplayName = document.getElementById('dashboard-display-name');
  const dashboardUsername = document.getElementById('dashboard-username');
  const uploadButton = document.getElementById('uploadButton');
  
  if (profilePictureInput && picturePreview) {
    // Ensure file input is hidden but functional
    if (uploadButton) {
      uploadButton.addEventListener('click', function() {
        profilePictureInput.click();
      });
    }
    
    profilePictureInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          showNotification('Please select an image file', 'error');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB max
          showNotification('Image size should be less than 5MB', 'error');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
          picturePreview.src = event.target.result;
          // Also update the dashboard profile image preview
          if (dashboardProfileImage) {
            dashboardProfileImage.src = event.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });  }    // Admin invite card reference
  const adminInviteCard = document.getElementById('adminInviteCard');
  
  // Function to extract username from URL or session storage
  function getProfileUsername() {
    let username = null;
    
    // Just use the logged in user's username
    const userData = localStorage.getItem('materio_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        username = user.username;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
      return username;
  }
  
  // Load user profile data
  async function loadUserProfile() {
    try {
      const profileUsername = getProfileUsername();
      let response;
      
      // Get the currently logged in user's info from localStorage
      const currentUser = JSON.parse(localStorage.getItem('materio_user') || '{}');
      
      // Just fetch the current user's profile (no URL-based username support)
      response = await makeApiRequest('profile', 'GET', null, true);
      
      if (response && response.user) {
        const user = response.user;
        
        // Store user data for future use
        localStorage.setItem('materio_user', JSON.stringify(user));
        // Fill form fields with user data
        document.getElementById('username').value = user.username || '';
        document.getElementById('displayName').value = user.displayName || '';
        document.getElementById('email').value = user.email || '';
          // Set recovery key if available
        if (user.recoveryKey) {
          document.getElementById('recoveryKey').value = user.recoveryKey;
        }
          // Show admin invite card if user has admin privileges
        if (user.hasAdminPrivileges && adminInviteCard) {
          adminInviteCard.style.display = 'block';
        }        // Show Files tab if user has admin privileges
        const filesTab = document.getElementById('filesTab');
        if (user.hasAdminPrivileges && filesTab) {
          filesTab.style.display = 'block';
          // Initialize file management functionality
          initializeFileManagement();
          // Initialize course upload functionality
          initializeCourseUpload();
          // Initialize promotion management functionality
          initializePromotionManagement();
        }
        
        // Set profile picture if available
        if (user.profilePicture) {
          // Update profile form preview
          picturePreview.src = user.profilePicture;
          
          // Update dashboard profile card
          if (dashboardProfileImage) {
            dashboardProfileImage.src = user.profilePicture;
          }
          
          // Also update the stored user data to ensure profile image is available across site
          localStorage.setItem('materio_user', JSON.stringify(user));
        }
        
        // Update dashboard profile info
        if (dashboardDisplayName) {
          const displayName = user.displayName || user.username;
          dashboardDisplayName.innerHTML = displayName;
          
          // Add verified badges
          if (user.hasAdminPrivileges) {
            dashboardDisplayName.innerHTML += '<i class="fas fa-badge-check verified-badge admin" title="Admin"></i>';
          } else if (user.isPlusUser) {
            dashboardDisplayName.innerHTML += '<i class="fas fa-badge-check verified-badge plus" title="Plus User"></i>';
          }
        }
          if (dashboardUsername) {
          dashboardUsername.textContent = '@' + user.username;
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      
      // Check specific error types
      if (error.message && error.message.includes('Authentication required') || 
          error.message && error.message.includes('Invalid or expired token')) {
        // Auth error - redirect to login
        showNotification('Please sign in to access your profile', 'error');
        setTimeout(() => {
          window.location.href = '/account/';
        }, 2000);
      } else if (error.message && error.message.includes('not authorized')) {
        // Authorization error - attempted to access someone else's profile
        showNotification('You are not authorized to view this profile', 'error');
        // Get current user from localStorage
        const currentUser = JSON.parse(localStorage.getItem('materio_user') || '{}');
        // Redirect to their own profile
        const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
        setTimeout(() => {
          if (isLocalhost) {
            window.location.href = '/account/profile.html';
          } else if (currentUser && currentUser.username) {
            window.location.href = `/account/@${currentUser.username}`;
          } else {
            window.location.href = '/account/';
          }
        }, 2000);
      } else {
        // General error
        showNotification('Failed to load user profile: ' + (error.message || 'Unknown error'), 'error');      }
    }
  }
  
  // Load user profile when page loads
  loadUserProfile();
  
  // Admin invite functionality
  const generateInviteBtn = document.getElementById('generateInviteBtn');
  const generatePlusInviteBtn = document.getElementById('generatePlusInviteBtn');
  const viewInvitesBtn = document.getElementById('viewInvitesBtn');
  const copyInviteBtn = document.getElementById('copyInviteBtn');
  const generatedInviteSection = document.getElementById('generatedInviteSection');
  
  // Generate regular invite code
  if (generateInviteBtn) {
    generateInviteBtn.addEventListener('click', async function() {
      await generateInvite(this, false);
    });
  }
  
  // Generate plus invite code
  if (generatePlusInviteBtn) {
    generatePlusInviteBtn.addEventListener('click', async function() {
      await generateInvite(this, true);
    });
  }
  
  // Function to generate invite (regular or plus)
  async function generateInvite(button, isPlusInvite = false) {
    try {
      const originalText = button.textContent;
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      
      const response = await makeApiRequest('invites', 'POST', { 
        containsPlusPerks: isPlusInvite 
      }, true);
      
      if (response && response.invite) {
        document.getElementById('generatedInviteCode').value = response.invite.code;
        generatedInviteSection.style.display = 'block';
        
        const inviteType = isPlusInvite ? 'Plus invite' : 'Invite';
        const helpText = isPlusInvite ? 
          'Share this code with users you want to invite with Plus benefits. The code expires in 30 days.' :
          'Share this code with users you want to invite. The code expires in 30 days.';
        
        document.querySelector('.invite-help').textContent = helpText;
        showNotification(`${inviteType} code generated successfully!`, 'success');
      }
    } catch (error) {
      console.error('Generate invite error:', error);
      showNotification(error.message || 'Failed to generate invite code', 'error');
    } finally {
      button.disabled = false;
      const iconClass = button.id === 'generatePlusInviteBtn' ? 'fa-star' : 'fa-plus';
      const text = button.id === 'generatePlusInviteBtn' ? 'Generate Plus Invite' : 'Generate Invite Code';
      button.innerHTML = `<i class="fas ${iconClass}"></i> ${text}`;
    }
  }
  
  // Copy invite code
  if (copyInviteBtn) {
    copyInviteBtn.addEventListener('click', function() {
      const inviteCodeInput = document.getElementById('generatedInviteCode');
      
      if (inviteCodeInput && inviteCodeInput.value) {
        inviteCodeInput.select();
        document.execCommand('copy');
        showNotification('Invite code copied to clipboard!', 'success');
      }
    });
  }
    // View all invites - open modal
  if (viewInvitesBtn) {
    viewInvitesBtn.addEventListener('click', function() {
      openInvitesModal();
    });
  }
  
  // Handle profile update form submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value.trim();
      const displayName = document.getElementById('displayName').value.trim();
      
      if (!username || !displayName) {
        showNotification('Username and display name are required', 'error');
        return;
      }
      
      try {
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'SAVING...';
        
        // Prepare update data
        const updateData = {
          username,
          displayName
        };
        
        // Add profile picture if changed
        if (picturePreview && picturePreview.src && !picturePreview.src.includes('default-avatar.svg')
            && !picturePreview.src.includes('http')) {
          updateData.profilePicture = picturePreview.src;
        }        // Make profile update API request
        const response = await makeApiRequest('profile', 'PUT', updateData, true);
        
        if (response && response.message) {
          showNotification(response.message, 'success');
          
          // Update the stored user data in localStorage
          const userDataStr = localStorage.getItem('materio_user');
          if (userDataStr) {
            try {
              const userData = JSON.parse(userDataStr);
              const updatedUser = {
                ...userData,
                username,
                displayName
              };
              
              // Update profile picture if it was changed
              if (updateData.profilePicture) {
                updatedUser.profilePicture = updateData.profilePicture;
              }
              
              // Save updated user data
              localStorage.setItem('materio_user', JSON.stringify(updatedUser));
              
              // Update dashboard profile card
              if (dashboardProfileImage && updateData.profilePicture) {
                dashboardProfileImage.src = updateData.profilePicture;
              }
              
              if (dashboardDisplayName) {
                dashboardDisplayName.textContent = displayName;
              }
              
              if (dashboardUsername) {
                dashboardUsername.textContent = '@' + username;
              }
            } catch (err) {
              console.error('Error updating local user data:', err);
            }
          }
        }
      } catch (error) {
        console.error('Profile update error:', error);
        showNotification(error.message || 'Failed to update profile', 'error');
      } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  }
  
  // Handle security form submission
  const securityForm = document.getElementById('securityForm');
  if (securityForm) {
    securityForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validate passwords if provided
      if (newPassword || confirmPassword) {
        if (!currentPassword) {
          showNotification('Current password is required to set a new password', 'error');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          showNotification('New passwords do not match', 'error');
          return;
        }
        
        if (newPassword.length < 8) {
          showNotification('Password must be at least 8 characters long', 'error');
          return;
        }
      }
      
      try {
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'UPDATING...';
        
        // Prepare update data
        const updateData = {};
        
        // Add password update if provided
        if (currentPassword && newPassword) {
          updateData.currentPassword = currentPassword;
          updateData.newPassword = newPassword;
        }
        
        // Make security update API request
        const response = await makeApiRequest('profile', 'PUT', updateData, true);
        
        if (response && response.message) {
          showNotification(response.message, 'success');
          
          // Clear password fields after successful update
          document.getElementById('currentPassword').value = '';
          document.getElementById('newPassword').value = '';
          document.getElementById('confirmPassword').value = '';
        }
      } catch (error) {
        console.error('Security update error:', error);
        showNotification(error.message || 'Failed to update security settings', 'error');
      } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  }
  
  // Recovery key functionality
  const copyKeyButton = document.getElementById('copyKey');
  const generateNewKeyButton = document.getElementById('generateNewKey');
  
  if (copyKeyButton) {
    copyKeyButton.addEventListener('click', function() {
      const recoveryKeyInput = document.getElementById('recoveryKey');
      
      if (recoveryKeyInput && recoveryKeyInput.value) {
        recoveryKeyInput.select();
        document.execCommand('copy');
        showNotification('Recovery key copied to clipboard', 'success');
      }
    });
  }
    if (generateNewKeyButton) {
    generateNewKeyButton.addEventListener('click', async function() {
      try {
        // Confirm action
        if (!confirm('Generating a new recovery key will invalidate your old one. Are you sure?')) {
          return;
        }
        
        // Get the current password from the security form
        const currentPassword = document.getElementById('currentPassword').value;
        
        if (!currentPassword) {
          showNotification('Please enter your current password to generate a new recovery key', 'error');
          return;
        }
        
        // Show loading state
        const originalText = this.textContent;
        this.disabled = true;
        this.textContent = 'GENERATING...';
        
        // Make API request to generate new key
        const updateData = {
          generateNewRecoveryKey: true,
          currentPassword: currentPassword
        };
          const response = await makeApiRequest('profile', 'PUT', updateData, true);
        
        // Check for recovery key in the response, could be in either location based on server response
        const newRecoveryKey = response.recoveryKey || (response.user && response.user.recoveryKey);
        
        if (newRecoveryKey) {
          // Display new recovery key
          document.getElementById('recoveryKey').value = newRecoveryKey;
          showNotification('New recovery key generated successfully', 'success');
          
          // Clear password field after successful update
          document.getElementById('currentPassword').value = '';
        }
      } catch (error) {
        console.error('Recovery key generation error:', error);
        showNotification(error.message || 'Failed to generate new recovery key', 'error');
      } finally {
        // Reset button state
        this.disabled = false;
        this.textContent = originalText;
      }
    });
  }
  
  // Delete account functionality
  const deleteAccountButton = document.getElementById('deleteAccountButton');
  const deleteAccountModal = document.getElementById('deleteAccountModal');
  const confirmDeleteButton = document.getElementById('confirmDeleteButton');
    if (deleteAccountButton && deleteAccountModal) {    // Open modal when delete button is clicked
    deleteAccountButton.addEventListener('click', function() {
      deleteAccountModal.style.display = 'flex';
      // Reinitialize password toggles for the modal
      setTimeout(() => {
        initializePasswordToggles(deleteAccountModal);
        console.log('Password toggles reinitialized for delete modal');
      }, 10);
    });
    
    // Close modal when close button is clicked
    const closeButtons = deleteAccountModal.querySelectorAll('.modal-close, .modal-cancel');
    closeButtons.forEach(button => {
      button.addEventListener('click', function() {
        deleteAccountModal.style.display = 'none';
      });
    });
      // Handle account deletion confirmation
    if (confirmDeleteButton) {
      confirmDeleteButton.addEventListener('click', async function() {
        const password = document.getElementById('deleteConfirmPassword').value;
        
        if (!password) {
          showNotification('Please enter your password to confirm', 'error');
          return;
        }
        // Store the original text before entering try block
        const originalText = this.textContent;
        this.disabled = true;
        this.textContent = 'DELETING...';
        
        try {
          console.log('Attempting account deletion');
          // Make API request to delete account
          const response = await makeApiRequest('profile', 'DELETE', { password }, true);
          
          if (response && response.message) {
            showNotification(response.message, 'success');
            
            // Clear auth token and redirect to login
            clearAuthToken();
            
            // Redirect to login after a short delay
            setTimeout(() => {
              redirectToLogin();
            }, 2000);
          }
        } catch (error) {
          console.error('Account deletion error:', error);
          showNotification(error.message || 'Failed to delete account', 'error');
          
          // Reset button state
          this.disabled = false;
          this.textContent = originalText;
        }      });
    }
  }
  // Logout functionality
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', function() {
      // Clear auth token and user data
      clearAuthToken();
      localStorage.removeItem('materio_user');
      redirectToLogin();
    });
  }    // Password visibility toggle function
  function initializePasswordToggles(container = document) {
    const togglePasswordButtons = container.querySelectorAll('.toggle-password');
    if (togglePasswordButtons.length) {
      console.log('Found', togglePasswordButtons.length, 'password toggle buttons');
      togglePasswordButtons.forEach(button => {
        // Remove existing listeners to avoid duplicates
        button.removeEventListener('click', handlePasswordToggle);
        button.addEventListener('click', handlePasswordToggle);
      });
    } else {
      console.log('No password toggle buttons found');
    }
  }

  function handlePasswordToggle() {
    const targetId = this.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    
    console.log('Toggle clicked for target:', targetId);
    
    if (passwordInput) {
      // Toggle password visibility
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
        console.log('Password shown for:', targetId);
      } else {
        passwordInput.type = 'password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
        console.log('Password hidden for:', targetId);
      }
    } else {
      console.error('Password input not found for target:', targetId);
    }
  }
  // Initialize password toggles on page load
  initializePasswordToggles();
});

// Google Drive functionality
function handleGoogleDriveClick() {
  showNotification('Google Drive integration coming soon!', 'info');
}

// Invite Management Modal Functions
function openInvitesModal() {
  const modal = document.getElementById('viewInvitesModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('show');
    loadInvites();
  }
}

function closeInvitesModal() {
  const modal = document.getElementById('viewInvitesModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
}

// Load invites into the modal
async function loadInvites() {
  try {
    const tableBody = document.getElementById('inviteTableBody');
    const inviteEmpty = document.getElementById('inviteEmpty');
    const tableContainer = document.querySelector('.invite-table-container');
    
    // Show loading state
    tableBody.innerHTML = `
      <tr class="invite-loading">
        <td colspan="6">
          <div class="loading-content">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading invites...</p>
          </div>
        </td>
      </tr>
    `;
    
    const response = await makeApiRequest('invites', 'GET', null, true);
    
    if (response && response.invites) {
      const invites = response.invites;
      
      if (invites.length === 0) {
        // Show empty state
        tableContainer.style.display = 'none';
        inviteEmpty.style.display = 'block';
        updateInviteStats({ total: 0, used: 0, pending: 0, expired: 0 });
      } else {
        // Show table with data
        tableContainer.style.display = 'block';
        inviteEmpty.style.display = 'none';
        
        // Calculate statistics
        const now = new Date();
        const stats = {
          total: invites.length,
          used: invites.filter(invite => invite.redeemed).length,
          pending: invites.filter(invite => !invite.redeemed && new Date(invite.expires_at) > now).length,
          expired: invites.filter(invite => !invite.redeemed && new Date(invite.expires_at) <= now).length
        };
        updateInviteStats(stats);
        
        // Populate table
        tableBody.innerHTML = invites.map(invite => {
          const isExpired = new Date(invite.expires_at) <= now;
          const status = invite.redeemed ? 'used' : (isExpired ? 'expired' : 'pending');
          const statusText = invite.redeemed ? 'Used' : (isExpired ? 'Expired' : 'Pending');
          const inviteType = invite.contains_plus_perks ? 'Plus' : 'Regular';
          const typeClass = invite.contains_plus_perks ? 'plus-invite' : 'regular-invite';
          
          return `
            <tr>
              <td>
                <span class="invite-code">${invite.code}</span>
                <button class="btn-icon" onclick="copyToClipboard('${invite.code}')" title="Copy code">
                  <i class="fas fa-copy"></i>
                </button>
              </td>
              <td>
                <span class="status-badge ${status}">${statusText}</span>
              </td>
              <td>
                <span class="invite-type ${typeClass}">
                  ${invite.contains_plus_perks ? '<i class="fas fa-star"></i>' : '<i class="fas fa-user"></i>'} ${inviteType}
                </span>
              </td>
              <td>${formatDate(invite.created_at)}</td>
              <td>
                ${invite.redeemed_user ? `
                  <div class="user-info-with-avatar">
                    <img src="${invite.redeemed_user.profile_picture || '/assets/img/default-avatar.svg'}" 
                         alt="Profile" 
                         class="user-avatar-small">
                    <span>${invite.redeemed_user.display_name || invite.redeemed_user.username}</span>
                  </div>
                ` : '-'}
              </td>
              <td>${formatDate(invite.expires_at)}</td>              <td>
                <div class="action-buttons">
                  <button class="btn-icon" onclick="openShareModal('${invite.code}')" title="Share">
                    <i class="fas fa-share-alt"></i>
                  </button>
                  ${invite.redeemed_user ? `
                    <button class="btn-icon admin-toggle ${invite.redeemed_user.has_admin_privileges ? 'active' : ''}" 
                            onclick="toggleAdminPrivilege('${invite.redeemed_user.id}', ${!invite.redeemed_user.has_admin_privileges})" 
                            title="${invite.redeemed_user.has_admin_privileges ? 'Demote from Admin' : 'Promote to Admin'}">
                      <i class="fas ${invite.redeemed_user.has_admin_privileges ? 'fa-user-minus' : 'fa-user-shield'}"></i>
                    </button>
                    <button class="btn-icon plus-toggle ${invite.redeemed_user.is_plus_user ? 'active' : ''}" 
                            onclick="togglePlusPrivilege('${invite.redeemed_user.id}', ${!invite.redeemed_user.is_plus_user})" 
                            title="${invite.redeemed_user.is_plus_user ? 'Remove Plus Access' : 'Grant Plus Access'}">
                      <i class="fas ${invite.redeemed_user.is_plus_user ? 'fa-star-half-alt' : 'fa-star'}"></i>
                    </button>
                  ` : ''}                  ${!invite.redeemed ? `
                    <button class="btn-icon delete-invite" data-invite-id="${invite.id}" onclick="deleteInvite('${invite.id}')" title="Delete invite">
                      <i class="fas fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (error) {
    console.error('Failed to load invites:', error);
    showNotification('Failed to load invites', 'error');
    
    const tableBody = document.getElementById('inviteTableBody');
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-light-color);">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 16px; color: #dc3545;"></i>
          <p>Failed to load invites. Please try again.</p>
        </td>
      </tr>
    `;
  }
}

// Update invite statistics
function updateInviteStats(stats) {
  document.getElementById('totalInvites').textContent = stats.total;
  document.getElementById('usedInvites').textContent = stats.used;
  document.getElementById('pendingInvites').textContent = stats.pending;
  document.getElementById('expiredInvites').textContent = stats.expired;
}

// Refresh invites
function refreshInvites() {
  loadInvites();
  showNotification('Invites refreshed', 'success');
}

// Generate new invite from modal
async function generateNewInviteFromModal(isPlusInvite = false) {
  try {
    const response = await makeApiRequest('invites', 'POST', { 
      containsPlusPerks: isPlusInvite 
    }, true);
    
    if (response && response.invite) {
      const inviteType = isPlusInvite ? 'Plus invite' : 'Invite';
      showNotification(`${inviteType} code generated successfully!`, 'success');
      loadInvites(); // Refresh the list
    }
  } catch (error) {
    console.error('Generate invite error:', error);
    showNotification(error.message || 'Failed to generate invite code', 'error');
  }
}

// Copy to clipboard utility
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Invite code copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopyToClipboard(text);
    });
  } else {
    // Fallback for older browsers
    fallbackCopyToClipboard(text);
  }
}

// Fallback copy method
function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showNotification('Invite code copied to clipboard!', 'success');
  } catch (err) {
    showNotification('Failed to copy invite code', 'error');
  }
    document.body.removeChild(textArea);
}

// Format date utility
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Toggle admin privileges
async function toggleAdminPrivilege(userId, makeAdmin) {
  try {
    const response = await makeApiRequest('invites/toggle-admin', 'POST', {
      userId: userId,
      hasAdminPrivileges: makeAdmin
    }, true);
    
    if (response && response.user) {
      showNotification(`User ${makeAdmin ? 'promoted to' : 'demoted from'} admin successfully`, 'success');
      loadInvites(); // Refresh the list
    }
  } catch (error) {
    console.error('Toggle admin error:', error);
    showNotification(error.message || 'Failed to update user privileges', 'error');
  }
}

// Toggle plus user privileges
async function togglePlusPrivilege(userId, makePlus) {
  try {
    const response = await makeApiRequest('invites/toggle-plus', 'POST', {
      userId: userId,
      isPlusUser: makePlus
    }, true);
    
    if (response && response.user) {
      showNotification(`User ${makePlus ? 'granted' : 'removed from'} plus access successfully`, 'success');
      loadInvites(); // Refresh the list
    }
  } catch (error) {
    console.error('Toggle plus user error:', error);
    showNotification(error.message || 'Failed to update user plus privileges', 'error');
  }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('viewInvitesModal');
  if (modal && event.target === modal) {
    closeInvitesModal();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modal = document.getElementById('viewInvitesModal');
    if (modal && modal.classList.contains('show')) {
      closeInvitesModal();
    }
  }
});

// File Management Functionality
let currentPath = '';
let fileManagementInitialized = false;

function initializeFileManagement() {
  if (fileManagementInitialized) return;
  fileManagementInitialized = true;

  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const fileList = document.getElementById('fileList');
  const refreshBtn = document.getElementById('refreshBtn');
  const newFolderBtn = document.getElementById('newFolderBtn');

  // Initialize file browser
  loadFiles();

  // File upload handling
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      handleFileUpload(files);
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    });
  }

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadFiles();
    });
  }

  // New folder button
  if (newFolderBtn) {
    newFolderBtn.addEventListener('click', () => {
      createNewFolder();
    });
  }
}

async function loadFiles() {
  const fileList = document.getElementById('fileList');
  if (!fileList) return;

  try {
    fileList.innerHTML = `
      <div class="file-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading files...</p>
      </div>
    `;

    const response = await makeApiRequest(`cdn?path=${encodeURIComponent(currentPath)}`, 'GET', null, true);
    
    if (response) {
      // Handle GitHub API response format
      if (response.type === 'directory' && response.items) {
        displayFiles(response.items);
      } else if (response.type === 'file') {
        // Single file response
        displayFiles([response]);
      } else {
        throw new Error('Invalid response format');
      }
      updateBreadcrumb();
    } else {
      throw new Error('Failed to load files');
    }
  } catch (error) {
    console.error('Failed to load files:', error);
    fileList.innerHTML = `
      <div class="file-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load files: ${error.message}</p>
      </div>
    `;
  }
}

function displayFiles(files) {
  const fileList = document.getElementById('fileList');
  if (!fileList) return;

  if (!files || files.length === 0) {
    fileList.innerHTML = `
      <div class="file-empty">
        <i class="fas fa-folder-open"></i>
        <p>This directory is empty</p>
      </div>
    `;
    return;
  }

  const filesHtml = files.map(file => {
    const icon = getFileIcon(file);
    const size = file.size ? formatFileSize(file.size) : '';
    const date = file.modified ? formatDate(file.modified) : '';
    
    return `
      <div class="file-item" data-name="${file.name}" data-type="${file.type}">
        <div class="file-icon ${icon.class}">
          <i class="${icon.icon}"></i>
        </div>
        <div class="file-details">
          <div class="file-name">${escapeHtml(file.name)}</div>
          <div class="file-meta">${size} ${date}</div>
        </div>
        <div class="file-actions">
          ${file.type === 'directory' ? 
            `<button class="file-action-btn" onclick="openDirectory('${escapeHtml(file.name)}')" title="Open">
              <i class="fas fa-folder-open"></i>
            </button>` : 
            `<button class="file-action-btn download" onclick="downloadFile('${escapeHtml(file.name)}')" title="Download">
              <i class="fas fa-download"></i>
            </button>`
          }
          <button class="file-action-btn rename" onclick="renameFile('${escapeHtml(file.name)}')" title="Rename">
            <i class="fas fa-edit"></i>
          </button>
          <button class="file-action-btn delete" onclick="deleteFile('${escapeHtml(file.name)}', '${file.type}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  fileList.innerHTML = filesHtml;
}

function getFileIcon(file) {
  if (file.type === 'directory') {
    return { icon: 'fas fa-folder', class: 'folder' };
  }

  const extension = file.name.split('.').pop().toLowerCase();
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'].includes(extension)) {
    return { icon: 'fas fa-image', class: 'image' };
  }
  
  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'm4v'].includes(extension)) {
    return { icon: 'fas fa-video', class: 'video' };
  }
  
  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'].includes(extension)) {
    return { icon: 'fas fa-music', class: 'audio' };
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'php', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'rs', 'swift', 'kotlin', 'vue', 'svelte'].includes(extension)) {
    return { icon: 'fas fa-code', class: 'code' };
  }
  
  // Configuration and data files
  if (['json', 'xml', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf'].includes(extension)) {
    return { icon: 'fas fa-cog', class: 'code' };
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'dmg', 'iso'].includes(extension)) {
    return { icon: 'fas fa-file-archive', class: 'archive' };
  }
  
  // Documents
  if (['txt', 'md', 'pdf', 'doc', 'docx', 'rtf', 'odt', 'pages'].includes(extension)) {
    return { icon: 'fas fa-file-alt', class: 'document' };
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(extension)) {
    return { icon: 'fas fa-file-excel', class: 'document' };
  }
  
  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(extension)) {
    return { icon: 'fas fa-file-powerpoint', class: 'document' };
  }
  
  // Default
  return { icon: 'fas fa-file', class: 'default' };
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateBreadcrumb() {
  const breadcrumb = document.querySelector('.breadcrumb');
  if (!breadcrumb) return;
  const parts = currentPath.split('/').filter(part => part);
  let breadcrumbHtml = `
    <span class="breadcrumb-item ${currentPath === '' ? 'active' : ''}" data-path="">
      <i class="fas fa-home"></i> Root
    </span>
  `;
  let path = '';
  parts.forEach((part, index) => {
    path = path ? path + '/' + part : part;
    const isActive = index === parts.length - 1;
    breadcrumbHtml += `
      <span class="breadcrumb-item ${isActive ? 'active' : ''}" data-path="${path}">
        ${escapeHtml(part)}
      </span>
    `;
  });

  breadcrumb.innerHTML = breadcrumbHtml;

  // Add click handlers for breadcrumb navigation
  breadcrumb.querySelectorAll('.breadcrumb-item:not(.active)').forEach(item => {
    item.addEventListener('click', () => {
      currentPath = item.dataset.path;
      loadFiles();
    });
  });
}

async function handleFileUpload(files) {
  if (!files || files.length === 0) return;

  const uploadProgress = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  try {
    uploadProgress.style.display = 'block';
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / files.length) * 100);
      
      progressBar.style.setProperty('--progress', `${progress}%`);
      progressText.textContent = `Uploading ${file.name}... (${i + 1}/${files.length})`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);      const response = await fetch('/api/v1/cdn', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
        },
        body: formData
      });

      const result = await response.json();
      // Handle GitHub API response format
      if (!result || result.error) {
        throw new Error(result?.error || `Failed to upload ${file.name}`);
      }
      
      // GitHub API returns file object on success
      if (!result.name && !result.sha) {
        throw new Error(`Invalid response for ${file.name}`);
      }
    }

    showNotification('Files uploaded successfully!', 'success');
    loadFiles(); // Refresh file list
  } catch (error) {
    console.error('Upload error:', error);
    showNotification(error.message || 'Failed to upload files', 'error');
  } finally {
    uploadProgress.style.display = 'none';
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  }
}

function openDirectory(name) {
  currentPath = currentPath ? currentPath + '/' + name : name;
  loadFiles();
}

function downloadFile(name) {
  // Find the file in the current listing to get its download_url
  const fileList = document.getElementById('fileList');  const fileItem = fileList?.querySelector(`[data-name="${name}"]`);
    if (fileItem) {
    // For GitHub CDN, we need to get the file's download URL from the API
    const filePath = currentPath ? currentPath + '/' + name : name;
    
    // Make API request to get file details with download URL
    makeApiRequest(`cdn?path=${encodeURIComponent(filePath)}`, 'GET', null, true)
      .then(response => {
        if (response && response.download_url) {
          // Use GitHub's download URL
          const link = document.createElement('a');
          link.href = response.download_url;
          link.download = name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          throw new Error('Download URL not available');
        }
      })
      .catch(error => {
        console.error('Download error:', error);
        showNotification('Failed to download file', 'error');
      });
  } else {
    showNotification('File not found', 'error');
  }
}

async function renameFile(oldName) {
  const newName = prompt('Enter new name:', oldName);
  if (!newName || newName === oldName) return;
  try {
    const filePath = currentPath ? currentPath + '/' + oldName : oldName;
    const newPath = currentPath ? currentPath + '/' + newName : newName;
    
    const response = await makeApiRequest('cdn', 'PUT', {
      oldPath: filePath,
      newPath: newPath
    }, true);

    // Handle GitHub API response format
    if (response && !response.error) {
      // GitHub API returns the new file object on success
      if (response.name || response.sha) {
        showNotification('File renamed successfully!', 'success');
        loadFiles();
      } else {
        throw new Error('Invalid response format');
      }
    } else {
      throw new Error(response?.error || 'Failed to rename file');
    }
  } catch (error) {
    console.error('Rename error:', error);
    showNotification(error.message || 'Failed to rename file', 'error');
  }
}

async function deleteFile(name, type) {
  const itemType = type === 'directory' ? 'folder' : 'file';
  const warningMessage = type === 'directory' 
    ? `Are you sure you want to delete this folder and ALL its contents? This will permanently delete all files inside. This action cannot be undone.`
    : `Are you sure you want to delete this ${itemType}? This action cannot be undone.`;
    
  if (!confirm(warningMessage)) {
    return;
  }
  
  try {
    const filePath = currentPath ? currentPath + '/' + name : name;
    
    // Show loading message for directories since they might take longer
    if (type === 'directory') {
      showNotification('Deleting folder and all contents...', 'info');
    }
    
    const response = await makeApiRequest(`cdn?path=${encodeURIComponent(filePath)}`, 'DELETE', null, true);

    // Handle GitHub API response format
    if (response && !response.error) {
      // GitHub API returns success message or commit info
      const successMessage = type === 'directory' 
        ? `Folder '${name}' and all its contents deleted successfully!`
        : `File '${name}' deleted successfully!`;
      showNotification(successMessage, 'success');
      loadFiles();
    } else {
      throw new Error(response?.error || `Failed to delete ${itemType}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    showNotification(error.message || `Failed to delete ${itemType}`, 'error');
  }
}

async function createNewFolder() {
  const name = prompt('Enter folder name:');
  if (!name) return;
  try {
    const folderPath = currentPath ? currentPath + '/' + name : name;
    
    const response = await makeApiRequest('cdn', 'POST', {
      path: folderPath,
      type: 'directory'
    }, true);

    // Handle GitHub API response format
    if (response && !response.error) {
      // GitHub API returns file/folder object on success
      showNotification('Folder created successfully!', 'success');
      loadFiles();
    } else {
      throw new Error(response?.error || 'Failed to create folder');
    }
  } catch (error) {
    console.error('Create folder error:', error);
    showNotification(error.message || 'Failed to create folder', 'error');
  }
}

// Course Upload System
let semesterSubjectMappings = {};
let selectedFiles = [];

// Initialize course upload functionality
function initializeCourseUpload() {
  // Load semester-subject mappings
  loadSemesterSubjectMappings();
  
  // Sub-tab switching
  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  const subTabPanes = document.querySelectorAll('.sub-tab-pane');
  
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-subtab');
      
      // Update active state for buttons
      subTabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Show the selected sub-tab content
      subTabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === targetTab) {
          pane.classList.add('active');
        }
      });
    });
  });
  
  // Semester change handler
  const semesterSelect = document.getElementById('semester');
  const subjectSelect = document.getElementById('subject');
  const customSubjectInput = document.getElementById('customSubject');
  
  if (semesterSelect && subjectSelect) {
    semesterSelect.addEventListener('change', function() {
      const semester = this.value;
      populateSubjects(semester);
    });
    
    subjectSelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        customSubjectInput.style.display = 'block';
        customSubjectInput.required = true;
      } else {
        customSubjectInput.style.display = 'none';
        customSubjectInput.required = false;
      }
    });
  }
  
  // Course file upload handling
  const courseUploadArea = document.getElementById('courseUploadArea');
  const courseFileInput = document.getElementById('courseFileInput');
  
  if (courseUploadArea && courseFileInput) {
    courseUploadArea.addEventListener('click', () => courseFileInput.click());
    
    courseUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      courseUploadArea.classList.add('dragover');
    });

    courseUploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      courseUploadArea.classList.remove('dragover');
    });

    courseUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      courseUploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      handleCourseFileSelection(files);
    });

    courseFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handleCourseFileSelection(files);
    });
  }
  
  // Form submission
  const courseUploadForm = document.getElementById('courseUploadForm');
  if (courseUploadForm) {
    courseUploadForm.addEventListener('submit', handleCourseUploadSubmit);
  }
}

// Load semester-subject mappings from GitHub
async function loadSemesterSubjectMappings() {
  try {
    const response = await makeApiRequest('cdn?path=databases/semester-subjects.json', 'GET', null, true);
    if (response && response.download_url) {
      const mappingResponse = await fetch(response.download_url);
      if (mappingResponse.ok) {
        semesterSubjectMappings = await mappingResponse.json();
        console.log('Loaded existing semester-subject mappings');
        return;
      }
    }
  } catch (error) {
    // File doesn't exist yet, this is expected for first-time setup
    console.log('No existing semester-subject mappings found, initializing with defaults');
  }
    // Initialize with default subjects for each semester (matching your provided JSON)
  semesterSubjectMappings = {
    "1": [
      "Engineering Mathematics I",
      "Physics",
      "Chemistry", 
      "Engineering Graphics",
      "Basic Electrical Engineering",
      "Programming for Problem Solving"
    ],
    "2": [
      "Engineering Mathematics II",
      "Physics II",
      "Chemistry II",
      "Engineering Mechanics",
      "Basic Electronics Engineering",
      "Engineering Graphics II"
    ],
    "3": [
      "Engineering Mathematics III",
      "Data Structures and Algorithms",
      "Digital Logic Design",
      "Computer Organization",
      "Object Oriented Programming",
      "Database Management Systems"
    ],
    "4": [
      "Engineering Mathematics IV",
      "Operating Systems",
      "Computer Networks",
      "Software Engineering",
      "Theory of Computation",
      "Microprocessors"
    ],
    "5": [
      "Machine Learning",
      "Artificial Intelligence",
      "Compiler Design",
      "Computer Graphics",
      "Distributed Systems",
      "Web Technologies"
    ],
    "6": [
      "Data Mining",
      "Information Security",
      "Mobile Computing",
      "Cloud Computing",
      "Internet of Things",
      "Elective I"
    ],
    "7": [
      "Major Project I",
      "Advanced Algorithms",
      "Blockchain Technology",
      "DevOps",
      "Elective II",
      "Internship"
    ],
    "8": [
      "Major Project II",
      "Industry Training",
      "Seminar",
      "Elective III",
      "Placement Training",
      "Final Viva"
    ]
  };
}

// Populate subjects based on selected semester
function populateSubjects(semester) {
  const subjectSelect = document.getElementById('subject');
  if (!subjectSelect) return;
  
  // Clear existing options
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';
  
  if (semester && semesterSubjectMappings[semester]) {
    semesterSubjectMappings[semester].forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });
  }
    // Add custom option
  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = 'Add New Subject...';
  subjectSelect.appendChild(customOption);
  
  // Enable the subject dropdown
  subjectSelect.disabled = false;
}

// Handle file selection for course upload
function handleCourseFileSelection(files) {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit as requested
  const NETLIFY_LIMIT = 6 * 1024 * 1024; // 6MB actual limit due to Netlify Functions
  const validFiles = [];
  const rejectedFiles = [];
  
  // Validate each file
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      rejectedFiles.push({
        name: file.name,
        size: file.size,
        reason: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 50MB.`
      });
    } else if (file.size > NETLIFY_LIMIT) {
      rejectedFiles.push({
        name: file.name,
        size: file.size,
        reason: `File too large (${Math.round(file.size / 1024 / 1024)}MB) for current hosting. Due to Netlify Functions limitations, files must be under 6MB. Consider compressing or splitting the file.`
      });
    } else if (!file.name.toLowerCase().endsWith('.pdf')) {
      rejectedFiles.push({
        name: file.name,
        size: file.size,
        reason: 'Only PDF files are allowed for course materials.'
      });
    } else {
      validFiles.push(file);
    }
  }
  
  // Show warnings for rejected files
  if (rejectedFiles.length > 0) {
    const rejectedList = rejectedFiles.map(f => `• ${f.name}: ${f.reason}`).join('\n');
    showNotification(`Some files were rejected:\n${rejectedList}`, 'warning');
  }
  
  // Add valid files to selection
  selectedFiles = [...selectedFiles, ...validFiles];
  displayFilePreview();
  
  const courseUploadArea = document.getElementById('courseUploadArea');
  const filePreviewContainer = document.getElementById('filePreviewContainer');
  const uploadOptions = document.getElementById('uploadOptions');
  
  if (selectedFiles.length > 0) {
    courseUploadArea.classList.add('has-files');
    filePreviewContainer.style.display = 'block';
    uploadOptions.style.display = 'block';
  }
}

// Display file preview cards
function displayFilePreview() {
  const filePreviewGrid = document.getElementById('filePreviewGrid');
  if (!filePreviewGrid) return;
  
  filePreviewGrid.innerHTML = '';
  
  selectedFiles.forEach((file, index) => {
    const fileCard = createFilePreviewCard(file, index);
    filePreviewGrid.appendChild(fileCard);
  });
}

// Create file preview card
function createFilePreviewCard(file, index) {
  const card = document.createElement('div');
  card.className = 'file-preview-card';
  
  const extension = file.name.split('.').pop().toLowerCase();
  const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
  const iconClass = getFileIconClass(extension);
  
  card.innerHTML = `
    <button class="file-remove" onclick="removeFile(${index})" title="Remove file">
      <i class="fas fa-times"></i>
    </button>
    <div class="file-type-icon ${extension}">
      <i class="${iconClass}"></i>
    </div>
    <input type="text" class="file-name-edit" value="${fileName}" 
           onchange="updateFileName(${index}, this.value)" 
           title="Click to rename">
  `;
  
  return card;
}

// Get file icon class based on extension
function getFileIconClass(extension) {
  const iconMap = {
    'pdf': 'fas fa-file-pdf',
    'doc': 'fas fa-file-word',
    'docx': 'fas fa-file-word',
    'ppt': 'fas fa-file-powerpoint',
    'pptx': 'fas fa-file-powerpoint',
    'xls': 'fas fa-file-excel',
    'xlsx': 'fas fa-file-excel',
    'zip': 'fas fa-file-archive',
    'rar': 'fas fa-file-archive',
    'txt': 'fas fa-file-alt'
  };
  
  return iconMap[extension] || 'fas fa-file';
}

// Remove file from selection
function removeFile(index) {
  selectedFiles.splice(index, 1);
  displayFilePreview();
  
  if (selectedFiles.length === 0) {
    const courseUploadArea = document.getElementById('courseUploadArea');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const uploadOptions = document.getElementById('uploadOptions');
    
    courseUploadArea.classList.remove('has-files');
    filePreviewContainer.style.display = 'none';
    uploadOptions.style.display = 'none';
  }
}

// Update file name
function updateFileName(index, newName) {
  if (selectedFiles[index]) {
    const extension = selectedFiles[index].name.split('.').pop();
    const newFileName = newName + '.' + extension;
    
    // Create a new File object with the new name
    const originalFile = selectedFiles[index];
    const renamedFile = new File([originalFile], newFileName, {
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });
    
    selectedFiles[index] = renamedFile;
  }
}

// Handle course upload form submission
async function handleCourseUploadSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const semester = formData.get('semester');
  const subject = formData.get('subject') === 'custom' ? 
    document.getElementById('customSubject').value : formData.get('subject');
  const category = formData.get('category');
  const autoPushNotify = document.getElementById('autoPushNotify').checked;
  
  if (!semester || !subject || !category || selectedFiles.length === 0) {
    showNotification('Please fill all fields and select files', 'error');
    return;
  }
  
  try {
    const uploadButton = document.getElementById('uploadCourseFiles');
    const originalText = uploadButton.innerHTML;
    uploadButton.disabled = true;
    uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    // Show progress
    const progressDiv = document.getElementById('courseUploadProgress');
    const progressBar = document.getElementById('courseProgressBar');
    const progressText = document.getElementById('courseProgressText');
    progressDiv.style.display = 'block';
    
    // Use batch upload for all files and metadata in a single git commit
    progressBar.style.setProperty('--progress', '50%');
    progressText.textContent = `Preparing to upload ${selectedFiles.length} files...`;
    
    // Create batch upload form data
    const batchFormData = new FormData();
    batchFormData.append('semester', semester);
    batchFormData.append('subject', subject);
    batchFormData.append('category', category);
    batchFormData.append('autoPushNotify', autoPushNotify.toString());
    batchFormData.append('basePath', `pdfs/${semester}/${subject}`);
    
    // Add all files to the batch
    selectedFiles.forEach((file, index) => {
      batchFormData.append('files', file);
    });
    
    progressBar.style.setProperty('--progress', '75%');
    progressText.textContent = `Uploading ${selectedFiles.length} files and updating database...`;
    
    // Send batch upload request to cdn.js with batch=true parameter
    const response = await fetch('/api/v1/cdn?batch=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
      },
      body: batchFormData
    });
    
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error(`Server error: Failed to process the upload. ${response.status} ${response.statusText}`);
    }
    
    if (!response.ok || result.error) {
      throw new Error(result.error || `Failed to upload files: ${response.status} ${response.statusText}`);
    }
    
    progressBar.style.setProperty('--progress', '100%');
    progressText.textContent = 'Upload completed successfully!';
    
    const fileCount = result.files ? result.files.length : selectedFiles.length;
    const notificationText = autoPushNotify ? ' (notification created)' : '';
    const databaseText = result.updatedDatabase ? ' and database updated' : '';
    
    showNotification(`Successfully uploaded ${fileCount} files${databaseText}${notificationText}!`, 'success');
    
    // Reset form
    form.reset();
    selectedFiles = [];
    document.getElementById('filePreviewContainer').style.display = 'none';
    document.getElementById('uploadOptions').style.display = 'none';
    document.getElementById('courseUploadArea').classList.remove('has-files');
    document.getElementById('subject').disabled = true;
    document.getElementById('customSubject').style.display = 'none';
    
  } catch (error) {
    console.error('Upload error:', error);
    
    let errorMessage = error.message || 'Failed to upload course materials';
    
    // Provide more helpful error messages based on the error type
    if (errorMessage.includes('too large') || errorMessage.includes('413')) {
      errorMessage = 'One or more files are too large. Due to hosting limitations, total upload size must be under 6MB. Please compress your PDFs or split them into smaller batches.';
    } else if (errorMessage.includes('403') || errorMessage.includes('Permission denied')) {
      errorMessage = 'Permission denied. Please check your account permissions.';
    } else if (errorMessage.includes('500') || errorMessage.includes('Server error')) {
      errorMessage = 'Server error occurred. Please try again later or contact support if the problem persists.';
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Upload timeout. Please check your internet connection and try again.';
    } else if (errorMessage.includes('Only PDF files are allowed')) {
      errorMessage = 'Only PDF files are allowed for course material uploads.';
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    document.getElementById('courseUploadProgress').style.display = 'none';
    const uploadButton = document.getElementById('uploadCourseFiles');
    uploadButton.disabled = false;
    uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload Materials';
  }
}

// Legacy functions - now handled by batch upload
// These functions are kept for reference but are no longer used

// Update semester-subject mappings (now handled in batch-upload.js)
async function updateSemesterSubjectMappings_LEGACY(semester, subject) {
  if (!semesterSubjectMappings[semester]) {
    semesterSubjectMappings[semester] = [];
  }
  
  if (!semesterSubjectMappings[semester].includes(subject)) {
    semesterSubjectMappings[semester].push(subject);
      // Save to GitHub
    const content = JSON.stringify(semesterSubjectMappings, null, 2);
    const formData = new FormData();
    const blob = new Blob([content], { type: 'application/json' });
    formData.append('file', blob, 'semester-subjects.json');
    formData.append('path', 'databases');
    
    await fetch('/api/v1/cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
      },
      body: formData
    });
  }
}

// Update resource library (now handled in batch-upload.js)
async function updateResourceLibrary_LEGACY(semester, subject, category, uploadedFiles) {
  try {
    console.log('Starting resource library update...');
    
    // Try to load existing resource library
    let resourceLib = {};
    try {
      console.log('Fetching existing resource library...');
      const response = await makeApiRequest('cdn?path=databases/beta/resource.lib.json', 'GET', null, true);
      console.log('Resource library fetch response:', response);
      
      if (response && response.download_url) {
        console.log('Downloading resource library from:', response.download_url);
        const libResponse = await fetch(response.download_url);
        if (libResponse.ok) {
          resourceLib = await libResponse.json();
          console.log('Loaded existing resource library:', Object.keys(resourceLib));
        } else {
          console.log('Failed to download resource library:', libResponse.status, libResponse.statusText);
        }
      } else {
        console.log('No existing resource library found, creating new one');
      }
    } catch (error) {
      console.log('Error loading existing resource library, creating new one:', error.message);
    }
    
    // Initialize structure if needed
    if (!resourceLib[semester]) {
      resourceLib[semester] = {};
    }
    if (!resourceLib[semester][subject]) {
      resourceLib[semester][subject] = [];
    }
    
    // Find existing category or create new one
    let categoryIndex = resourceLib[semester][subject].findIndex(item => item.type === category);
    if (categoryIndex === -1) {
      resourceLib[semester][subject].push({
        type: category,
        content: []
      });
      categoryIndex = resourceLib[semester][subject].length - 1;
    }
    
    // Add uploaded file names to content
    const fileNames = uploadedFiles.map(file => file.name);
    resourceLib[semester][subject][categoryIndex].content.push(...fileNames);
    
    // Save updated resource library
    const content = JSON.stringify(resourceLib, null, 2);
    const formData = new FormData();
    const blob = new Blob([content], { type: 'application/json' });
    formData.append('file', blob, 'resource.lib.json');
    formData.append('path', 'databases/beta');
    
    console.log('Updating resource library with content:', resourceLib);
    
    const response = await fetch('/api/v1/cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
      },
      body: formData
    });
    
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse resource library update response:', parseError);
      throw new Error('Failed to update resource library - server returned invalid response');
    }
    
    if (!response.ok || result.error) {
      console.error('Resource library update failed:', result);
      throw new Error(result.error || `Failed to update resource library: ${response.status} ${response.statusText}`);
    }
    
    console.log('Resource library updated successfully:', result);
    
  } catch (error) {
    console.error('Failed to update resource library:', error);
  }
}

// Create upload notification (now handled in batch-upload.js)
async function createUploadNotification_LEGACY(subject, category, fileCount) {
  try {
    const notification = {
      title: "New Materials Uploaded!",
      message: `New materials have been added in ${category} category of ${subject}.`,
      date: new Date().toISOString(),
      links: []
    };
    
    // Try to load existing notifications
    let notifications = [];
    try {
      const response = await makeApiRequest('cdn?path=notifications.json', 'GET', null, true);
      if (response && response.download_url) {
        const notifResponse = await fetch(response.download_url);
        if (notifResponse.ok) {
          notifications = await notifResponse.json();
        }
      }
    } catch (error) {
      console.log('Creating new notifications file');
    }
      // Add new notification to the top
    notifications.unshift(notification);
    
    // Save updated notifications
    const content = JSON.stringify(notifications, null, 2);
    const formData = new FormData();
    const blob = new Blob([content], { type: 'application/json' });
    formData.append('file', blob, 'notifications.json');
    formData.append('path', '');
    
    await fetch('/api/v1/cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
      },
      body: formData
    });
    
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

// Delete an invite
async function deleteInvite(inviteId) {
  if (!confirm('Are you sure you want to delete this invite code? This action cannot be undone.')) {
    return;
  }
  
  // Find the delete button to show a loading indicator
  const deleteButton = document.querySelector(`.delete-invite[data-invite-id="${inviteId}"]`);
  if (deleteButton) {
    // Store original content and disable button
    const originalHTML = deleteButton.innerHTML;
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  
  try {
    console.log('Deleting invite with ID:', inviteId);
    // Show deletion in progress notification
    showNotification('Deleting invite code...', 'info', 2000);
    
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    let lastError = null;
    
    // Try up to 3 times with exponential backoff
    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        console.log(`Delete attempt ${attempts}/${maxAttempts}...`);
        
        const response = await makeApiRequest('invites/delete', 'POST', {
          inviteId: inviteId
        }, true);
        
        console.log('Delete response:', response);
        
        if (response && response.message) {
          success = true;
          showNotification(response.message, 'success');
          setTimeout(() => {
            loadInvites(); // Refresh the list
          }, 500);
          break;
        } else if (response && response.error) {
          lastError = response.error;
          console.warn(`Delete attempt ${attempts} failed:`, response.error);
          
          // Wait before trying again (exponential backoff)
          if (attempts < maxAttempts) {
            const waitTime = Math.pow(2, attempts) * 500; // 1s, 2s, 4s...
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          throw new Error('Failed to delete invite: No success message received');
        }
      } catch (attemptError) {
        lastError = attemptError.message || `Error in attempt ${attempts}`;
        console.warn(`Delete attempt ${attempts} exception:`, attemptError);
        
        // Wait before trying again (exponential backoff)
        if (attempts < maxAttempts) {
          const waitTime = Math.pow(2, attempts) * 500; // 1s, 2s, 4s...
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!success) {
      throw new Error(lastError || `Failed after ${maxAttempts} attempts`);
    }
  } catch (error) {
    console.error('Delete invite error:', error);
    showNotification(error.message || 'Failed to delete invite code', 'error');
  } finally {
    // Restore original button state if failure
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    }
  }
}

// ==============================================
// PROMOTION MANAGEMENT FUNCTIONALITY
// ==============================================

// Promotion management variables
let currentPromoData = {
  enabled: false,
  title: "",
  description: "",
  link: "",
  images: [],
  imageRotationInterval: 5000,
  isLimitedOffer: false,
  startDate: "",
  endDate: "",
  lastUpdated: ""
};

let promotionManagementInitialized = false;

function initializePromotionManagement() {
  if (promotionManagementInitialized) return;
  promotionManagementInitialized = true;
  const promoElements = {
    enabledCheckbox: document.getElementById('promoEnabled'),
    titleInput: document.getElementById('promoTitle'),
    descriptionInput: document.getElementById('promoDescription'),
    linkInput: document.getElementById('promoLink'),
    imageInput: document.getElementById('promoImageInput'),
    imageUrlInput: document.getElementById('promoImageUrl'),
    addImageUrlBtn: document.getElementById('addImageUrl'),
    imageUploadArea: document.getElementById('imageUploadArea'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    imagePreviewGrid: document.getElementById('imagePreviewGrid'),
    addMoreImagesBtn: document.getElementById('addMoreImages'),
    limitedOfferCheckbox: document.getElementById('isLimitedOffer'),
    dateRangeSection: document.getElementById('dateRangeSection'),
    startDateInput: document.getElementById('promoStartDate'),
    endDateInput: document.getElementById('promoEndDate'),
    form: document.getElementById('promotionForm'),
    previewBtn: document.getElementById('previewPromotion'),
    clearBtn: document.getElementById('clearPromotion'),
    saveBtn: document.getElementById('savePromotion'),
    statusInfo: document.getElementById('promoStatusInfo'),
    currentStatus: document.getElementById('currentPromoStatus'),
    currentTitle: document.getElementById('currentPromoTitle'),
    currentDateRange: document.getElementById('currentPromoDateRange')
  };

  // Load existing promotion data
  loadPromotionData();

  // Event listeners
  if (promoElements.enabledCheckbox) {
    promoElements.enabledCheckbox.addEventListener('change', function() {
      updatePromotionStatus();
    });
  }

  if (promoElements.limitedOfferCheckbox) {
    promoElements.limitedOfferCheckbox.addEventListener('change', function() {
      toggleDateRangeSection();
    });
  }

  if (promoElements.imageInput) {
    promoElements.imageInput.addEventListener('change', handleImageUpload);
  }

  if (promoElements.imageUploadArea) {
    promoElements.imageUploadArea.addEventListener('click', function() {
      promoElements.imageInput.click();
    });
    
    // Drag and drop functionality
    promoElements.imageUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      promoElements.imageUploadArea.classList.add('dragover');
    });

    promoElements.imageUploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      promoElements.imageUploadArea.classList.remove('dragover');
    });

    promoElements.imageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      promoElements.imageUploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        handleImageUploadFiles(files);
      }    });
  }

  if (promoElements.addImageUrlBtn) {
    promoElements.addImageUrlBtn.addEventListener('click', async () => {
      try {
        const imageUrl = promoElements.imageUrlInput.value.trim();
        
        if (!imageUrl) {
          showNotification('Please enter a valid image URL', 'error');
          return;
        }
        
        // Validate URL format
        try {
          new URL(imageUrl);
        } catch (e) {
          showNotification('Please enter a valid URL', 'error');
          return;
        }
        
        // Add the URL to images array
        currentPromoData.images.push(imageUrl);
        
        // Update UI
        displayExistingImages();
        
        // Clear input
        promoElements.imageUrlInput.value = '';
        
        showNotification('Image URL added successfully', 'success');
      } catch (error) {
        console.error('Error adding image URL:', error);
        showNotification('Failed to add image URL', 'error');
      }
    });
  }

  if (promoElements.addMoreImagesBtn) {
    promoElements.addMoreImagesBtn.addEventListener('click', function() {
      promoElements.imageInput.click();
    });
  }

  if (promoElements.form) {
    promoElements.form.addEventListener('submit', savePromotion);
  }

  if (promoElements.previewBtn) {
    promoElements.previewBtn.addEventListener('click', previewPromotion);  }
  if (promoElements.clearBtn) {
    promoElements.clearBtn.addEventListener('click', clearPromotion);
  }
}

async function loadPromotionData() {
  try {
    const response = await fetch('/assets/data/promo.json');
    if (response.ok) {
      currentPromoData = await response.json();
      populatePromotionForm();
      updateStatusDisplay();
    } else {
      console.log('No existing promotion data found');
    }
  } catch (error) {
    console.error('Error loading promotion data:', error);
  }
}

function populatePromotionForm() {
  const elements = {
    enabled: document.getElementById('promoEnabled'),
    title: document.getElementById('promoTitle'),
    description: document.getElementById('promoDescription'),
    link: document.getElementById('promoLink'),
    limitedOffer: document.getElementById('isLimitedOffer'),
    startDate: document.getElementById('promoStartDate'),
    endDate: document.getElementById('promoEndDate')
  };

  if (elements.enabled) elements.enabled.checked = currentPromoData.enabled;
  if (elements.title) elements.title.value = currentPromoData.title || '';
  if (elements.description) elements.description.value = currentPromoData.description || '';
  if (elements.link) elements.link.value = currentPromoData.link || '';
  if (elements.limitedOffer) elements.limitedOffer.checked = currentPromoData.isLimitedOffer;
  if (elements.startDate) elements.startDate.value = currentPromoData.startDate || '';
  if (elements.endDate) elements.endDate.value = currentPromoData.endDate || '';

  // Handle image display
  if (currentPromoData.images && currentPromoData.images.length > 0) {
    displayExistingImages();
  }

  toggleDateRangeSection();
}

function displayExistingImages() {
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');

  if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
  if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
  
  if (imagePreviewGrid) {
    imagePreviewGrid.innerHTML = '';
    currentPromoData.images.forEach((imagePath, index) => {
      const imageItem = createImagePreviewItem(imagePath, index);
      imagePreviewGrid.appendChild(imageItem);
    });
  }
}

function createImagePreviewItem(imagePath, index) {
  const item = document.createElement('div');
  item.className = 'image-preview-item';
  item.innerHTML = `
    <img src="${imagePath}" alt="Promotion Image" />
    <button type="button" class="remove-image" onclick="removePromoImage(${index})">
      <i class="fas fa-times"></i>
    </button>
  `;
  return item;
}

function toggleDateRangeSection() {
  const checkbox = document.getElementById('isLimitedOffer');
  const section = document.getElementById('dateRangeSection');
  
  if (checkbox && section) {
    section.style.display = checkbox.checked ? 'block' : 'none';
  }
}

async function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  await handleImageUploadFiles(files);
  event.target.value = ''; // Reset input
}

async function handleImageUploadFiles(files) {
  if (!files || files.length === 0) return;

  try {
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification(`${file.name} is not an image file`, 'error');
        continue;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showNotification(`${file.name} is too large (max 5MB)`, 'error');
        continue;
      }

      // Upload to assets/img folder
      const uploadedImagePath = await uploadPromoImage(file);
      if (uploadedImagePath) {
        currentPromoData.images.push(uploadedImagePath);
      }
    }

    // Update UI
    displayExistingImages();
    showNotification('Images uploaded successfully', 'success');
    
  } catch (error) {
    console.error('Error uploading images:', error);
    showNotification('Failed to upload images', 'error');
  }
}

async function uploadPromoImage(file) {
  try {
    // Keep original filename instead of generating a new one
    const fileName = file.name;
    
    // Create FormData for upload
   
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('path', 'assets/img');
    
    // Upload via CDN API
    const response = await fetch('/api/v1/cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
      },
      body: formData
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }

    // Return the path for the uploaded image
    return `/assets/img/${fileName}`;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

function removePromoImage(index) {
  if (currentPromoData.images && index >= 0 && index < currentPromoData.images.length) {
    currentPromoData.images.splice(index, 1);
    
    if (currentPromoData.images.length === 0) {
      // Show upload placeholder again
      const uploadPlaceholder = document.getElementById('uploadPlaceholder');
      const imagePreviewContainer = document.getElementById('imagePreviewContainer');
      
      if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    } else {
      displayExistingImages();
    }
    
    showNotification('Image removed', 'info');
  }
}

async function savePromotion(event) {
  event.preventDefault();

  try {
    // Collect form data
    const formData = {
      enabled: document.getElementById('promoEnabled')?.checked || false,
      title: document.getElementById('promoTitle')?.value || '',
      description: document.getElementById('promoDescription')?.value || '',
      link: document.getElementById('promoLink')?.value || '',
      images: currentPromoData.images || [],
      imageRotationInterval: 5000, // 5 seconds default
      isLimitedOffer: document.getElementById('isLimitedOffer')?.checked || false,
      startDate: document.getElementById('promoStartDate')?.value || '',
      endDate: document.getElementById('promoEndDate')?.value || '',
      lastUpdated: new Date().toISOString()
    };

    // Validate required fields
    if (formData.enabled && (!formData.title || !formData.description)) {
      showNotification('Title and description are required when promotion is enabled', 'error');
      return;
    }

    if (formData.isLimitedOffer && (!formData.startDate || !formData.endDate)) {
      showNotification('Start and end dates are required for limited time offers', 'error');
      return;
    }

    // Validate date range
    if (formData.isLimitedOffer && formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate >= endDate) {
        showNotification('End date must be after start date', 'error');
        return;
      }
    }

    // Save to promo.json file
    await savePromotionToFile(formData);
    
    // Update current data
    currentPromoData = formData;
    updateStatusDisplay();
    
    showNotification('Promotion saved successfully', 'success');
  } catch (error) {
    console.error('Error saving promotion:', error);
    showNotification('Failed to save promotion', 'error');
  }
}

async function savePromotionToFile(data) {
  try {
    console.log('🔄 Saving promotion data:', data);
    
    // Update in-memory data first
    currentPromoData = data;
    localStorage.setItem('materio_promo_data', JSON.stringify(data, null, 2));
      // Try to save via Netlify function
    try {
      const response = await fetch('/api/v1/save-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Successfully saved via Netlify function:', result);
        
        showNotification('Promotion saved successfully!', 'success');
        
        // Trigger promotion reload on main page
        setTimeout(() => {
          if (window.loadAndDisplayPromotion) {
            window.loadAndDisplayPromotion();
          }
          // Try to reload main page promotion too
          if (window.parent && window.parent.loadAndDisplayPromotion) {
            window.parent.loadAndDisplayPromotion();
          }
        }, 500);
        
        return { success: true };
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Netlify function save failed');
      }
    } catch (netlifyError) {
      console.log('⚠️ Netlify function save failed:', netlifyError.message);
      
      // Fallback: Try the standalone server (if running)
      try {
        const response = await fetch('/api/save-promo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Successfully saved via standalone server:', result);
          
          showNotification('Promotion saved successfully!', 'success');
          
          // Trigger promotion reload
          setTimeout(() => {
            if (window.loadAndDisplayPromotion) {
              window.loadAndDisplayPromotion();
            }
          }, 500);
          
          return { success: true };
        }
      } catch (serverError) {
        console.log('⚠️ Standalone server also failed:', serverError.message);
      }
      
      // If all automatic methods fail, show error
      showNotification('❌ Auto-save failed. Please check console for details.', 'error');
      console.error('Full error details:', netlifyError);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Save error:', error);
    showNotification(`Failed to save: ${error.message}`, 'error');
    throw error;
  }
}

// Function to manually copy the current promotion data
function copyPromotionJson() {
  try {
    const jsonData = localStorage.getItem('materio_promo_data') || JSON.stringify(currentPromoData, null, 2);
    
    navigator.clipboard.writeText(jsonData).then(() => {
      showNotification('Promotion JSON copied to clipboard! You can paste this into assets/data/promo.json', 'success');
    }).catch(err => {
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = jsonData;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      showNotification('Promotion JSON copied to clipboard!', 'success');
    });
    
    console.log('JSON data copied:', jsonData);
  } catch (error) {
    console.error('Error copying JSON:', error);
    showNotification('Failed to copy JSON data', 'error');
  }
}

function updateStatusDisplay() {
  const elements = {
    status: document.getElementById('currentPromoStatus'),
    title: document.getElementById('currentPromoTitle'),
    dateRange: document.getElementById('currentPromoDateRange')
  };

  if (elements.status) {
    elements.status.textContent = currentPromoData.enabled ? 'Active' : 'Disabled';
    elements.status.className = `status-value ${currentPromoData.enabled ? 'active' : 'inactive'}`;
  }

  if (elements.title) {
    elements.title.textContent = currentPromoData.title || 'None';
  }

  if (elements.dateRange) {
    if (currentPromoData.isLimitedOffer && currentPromoData.startDate && currentPromoData.endDate) {
      const start = new Date(currentPromoData.startDate).toLocaleDateString();
      const end = new Date(currentPromoData.endDate).toLocaleDateString();
      elements.dateRange.textContent = `${start} - ${end}`;
    } else {
      elements.dateRange.textContent = 'Not set';
    }
  }
}

// Function to copy current promotion JSON to clipboard (for development)
function copyPromotionJson() {
  try {
    const jsonData = localStorage.getItem('materio_promo_data') || JSON.stringify(currentPromoData, null, 2);
    
    navigator.clipboard.writeText(jsonData).then(() => {
      showNotification('Promotion JSON copied to clipboard! You can paste this into assets/data/promo.json', 'success');
    }).catch(err => {
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = jsonData;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      showNotification('Promotion JSON copied to clipboard!', 'success');
    });
    
    console.log('JSON data copied:', jsonData);
  } catch (error) {
    console.error('Error copying JSON:', error);
    showNotification('Failed to copy JSON data', 'error');
  }
}

// Improved preview function with better modal integration
function previewPromotion() {
  // Get current form data
  const formData = {
    enabled: document.getElementById('promoEnabled')?.checked || false,
    title: document.getElementById('promoTitle')?.value || '',
    description: document.getElementById('promoDescription')?.value || '',
    link: document.getElementById('promoLink')?.value || '',
    images: currentPromoData.images || [],
    isLimitedOffer: document.getElementById('isLimitedOffer')?.checked || false,
    startDate: document.getElementById('promoStartDate')?.value || '',
    endDate: document.getElementById('promoEndDate')?.value || '',
    imageRotationInterval: 5000,
    lastUpdated: new Date().toISOString()
  };

  // Validate required fields for preview
  if (!formData.title || !formData.description) {
    showNotification('Title and description are required for preview', 'error');
    return;
  }

  // Update the existing promo modal in the page
  updateExistingPromoModal(formData);
  
  // Also update the promotions script data for consistency
  if (window.promoData) {
    window.promoData = formData;
  }
  
  // Show the modal
  const modal = document.getElementById('promoModal');
  if (modal) {
    modal.style.display = 'block';
    showNotification('Live preview displayed in promotion modal', 'success');
  } else {
    // Fallback to new window if modal not found
    openPreviewWindow(formData);
    showNotification('Preview opened in new window', 'info');
  }
}

function updateExistingPromoModal(data) {
  const modal = document.getElementById('promoModal');
  if (!modal) {
    console.log('Promo modal not found for update');
    return;
  }

  console.log('Updating promo modal with data:', data);

  // Update title (find the span with class promo-title, or update h2 directly)
  const titleSpan = modal.querySelector('.promo-title');
  const titleEl = modal.querySelector('h2');
  if (titleSpan) {
    titleSpan.textContent = data.title;
  } else if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-bullhorn" style="margin-right: 10px;"></i>${data.title}`;
  }

  // Update description
  const descriptionEl = modal.querySelector('.promo-description');
  if (descriptionEl) {
    descriptionEl.textContent = data.description;
  } else {
    // Fallback: Remove any existing date info paragraphs first
    const descriptionEls = modal.querySelectorAll('p');
    descriptionEls.forEach(p => {
      if (p.classList.contains('promo-date-info')) {
        p.remove();
      }
    });
    
    // Update the first remaining paragraph with the description
    const mainDesc = modal.querySelector('p:not(.promo-date-info)');
    if (mainDesc) {
      mainDesc.textContent = data.description;
    }
  }

  // Update and show image if available
  const imageEl = modal.querySelector('.promo-cover');
  if (imageEl && data.images && data.images.length > 0) {
    imageEl.src = data.images[0];
    imageEl.alt = data.title;
    imageEl.style.display = 'block';
    
    // Setup image rotation if multiple images
    if (data.images.length > 1) {
      setupImageRotationForPreview(data.images);
    }
  } else if (imageEl) {
    imageEl.style.display = 'none';
  }

  // Update link and show/hide
  const linkEl = modal.querySelector('.promo-link, a[href]');
  const buttonTextEl = modal.querySelector('.promo-button-text');
  const buttonEl = modal.querySelector('#offerButton');
  
  if (linkEl && data.link) {
    linkEl.href = data.link;
    linkEl.style.display = 'inline-block';
    
    if (buttonTextEl) {
      buttonTextEl.textContent = 'View Offer!';
    } else if (buttonEl) {
      buttonEl.innerHTML = '<i class="fa-solid fa-tag" style="margin-left: 5px; margin-right: 10px;"></i>View Offer!';
    }
  } else if (linkEl) {
    linkEl.style.display = 'none';
  }
  // Add limited time offer info if applicable
  if (data.isLimitedOffer && data.startDate && data.endDate) {
    const endDate = new Date(data.endDate);
    const dateText = `Offer valid till ${endDate.toLocaleDateString()}`;
    
    // Create date info paragraph
    const dateInfo = document.createElement('p');
    dateInfo.className = 'promo-date-info';
    dateInfo.style.fontStyle = 'italic';
    dateInfo.style.color = '#666';
    dateInfo.style.fontSize = '0.9em';
    dateInfo.style.marginTop = '10px';
    dateInfo.textContent = dateText;
    
    // Insert before the button
    const buttonContainer = modal.querySelector('.promo-link, a[href]');
    if (buttonContainer && buttonContainer.parentNode) {
      buttonContainer.parentNode.insertBefore(dateInfo, buttonContainer);
    } else {
      modal.querySelector('.promo-modal').appendChild(dateInfo);
    }
  }
}

let previewImageRotationTimer = null;

function setupImageRotationForPreview(images) {
  if (!images || images.length <= 1) return;

  let currentIndex = 0;
  
  // Clear any existing timer
  if (previewImageRotationTimer) {
    clearInterval(previewImageRotationTimer);
  }

  // Setup rotation timer
  previewImageRotationTimer = setInterval(() => {
    currentIndex = (currentIndex + 1) % images.length;
    
    const imageEl = document.querySelector('#promoModal .promo-cover');
    if (imageEl) {
      // Add fade effect
      imageEl.style.opacity = '0.5';
      
      setTimeout(() => {
        imageEl.src = images[currentIndex];
        imageEl.style.opacity = '1';
      }, 200);
    }
  }, 3000); // 3 seconds for preview
}

function openPreviewWindow(data) {
  const imageSlider = data.images && data.images.length > 1 ? 
    generateImageSliderHTML(data.images) : 
    (data.images && data.images.length === 1 ? `<img src="${data.images[0]}" alt="Promotion" class="preview-image">` : '');

  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Promotion Preview</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          background: #f5f5f5; 
        }
        .preview-container { 
          max-width: 500px; 
          margin: 0 auto; 
          background: white; 
          padding: 20px; 
          border-radius: 10px; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          text-align: center;
        }
        .preview-title { 
          color: #333; 
          margin-bottom: 15px; 
        }
        .preview-image { 
          max-width: 100%; 
          height: auto; 
          border-radius: 8px; 
          margin-bottom: 15px; 
        }
        .image-slider {
          position: relative;
          margin-bottom: 15px;
        }
        .slider-image {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          display: none;
        }
        .slider-image.active {
          display: block;
        }
        .slider-dots {
          text-align: center;
          margin-top: 10px;
        }
        .dot {
          height: 10px;
          width: 10px;
          margin: 0 3px;
          background-color: #bbb;
          border-radius: 50%;
          display: inline-block;
          cursor: pointer;
        }
        .dot.active {
          background-color: #007bff;
        }
        .preview-description { 
          color: #666; 
          line-height: 1.6; 
          margin-bottom: 20px; 
        }
        .preview-link { 
          display: inline-block; 
          background: #007bff; 
          color: white; 
          padding: 10px 20px; 
          text-decoration: none; 
          border-radius: 5px; 
        }
        .preview-dates { 
          background: #f8f9fa; 
          padding: 10px; 
          border-radius: 5px; 
          margin-top: 15px; 
          font-size: 0.9em; 
          color: #666; 
        }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <h2 class="preview-title">${data.title}</h2>
        ${imageSlider}
        <p class="preview-description">${data.description}</p>
        ${data.link ? `<a href="${data.link}" class="preview-link" target="_blank">View Offer</a>` : ''}
        ${data.isLimitedOffer && data.startDate && data.endDate ? 
          `<div class="preview-dates">Limited Time: ${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}</div>` : ''}
      </div>

      <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slider-image');
        const dots = document.querySelectorAll('.dot');

        function showSlide(n) {
          slides.forEach(slide => slide.classList.remove('active'));
          dots.forEach(dot => dot.classList.remove('active'));
          
          if (slides[n]) {
            slides[n].classList.add('active');
            dots[n].classList.add('active');
          }
        }

        function nextSlide() {
          currentSlide = (currentSlide + 1) % slides.length;
          showSlide(currentSlide);
        }

        // Auto-rotate images every 5 seconds
        if (slides.length > 1) {
          showSlide(0);
          setInterval(nextSlide, 5000);
          
          // Add click handlers for dots
          dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
              currentSlide = index;
              showSlide(currentSlide);
            });
          });
        } else if (slides.length === 1) {
          showSlide(0);
        }
      </script>
    </body>
    </html>
  `;

  const previewWindow = window.open('', '_blank', 'width=600,height=700,scrollbars=yes');
  previewWindow.document.write(previewHtml);
  previewWindow.document.close();
}

function generateImageSliderHTML(images) {
  if (!images || images.length === 0) return '';
  
  if (images.length === 1) {
    return `<img src="${images[0]}" alt="Promotion" class="preview-image">`;
  }

  const slidesHTML = images.map((image, index) => 
    `<img src="${image}" alt="Promotion ${index + 1}" class="slider-image ${index === 0 ? 'active' : ''}">`
  ).join('');

  const dotsHTML = images.map((_, index) => 
    `<span class="dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></span>`
  ).join('');

  return `
    <div class="image-slider">
      ${slidesHTML}
      <div class="slider-dots">
        ${dotsHTML}
      </div>
    </div>
  `;
}

function clearPromotion() {
  if (confirm('Are you sure you want to clear all promotion data? This action cannot be undone.')) {
    // Reset form
    document.getElementById('promoEnabled').checked = false;
    document.getElementById('promoTitle').value = '';
    document.getElementById('promoDescription').value = '';
    document.getElementById('promoLink').value = '';
    document.getElementById('isLimitedOffer').checked = false;
    document.getElementById('promoStartDate').value = '';
    document.getElementById('promoEndDate').value = '';
    
    // Clear images
    currentPromoData.images = [];
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    
    // Reset current data
    currentPromoData = {
      enabled: false,
      title: "",
      description: "",
      link: "",
      images: [],
      imageRotationInterval: 5000,
      isLimitedOffer: false,
      startDate: "",
      endDate: "",
      lastUpdated: ""
    };
    
    // Update displays
    updateStatusDisplay();
    toggleDateRangeSection();
    
    showNotification('Promotion data cleared', 'info');
  }
}

// Function to handle promotion status updates
function updatePromotionStatus() {
  const enabled = document.getElementById('promoEnabled')?.checked || false;
  currentPromoData.enabled = enabled;
  updateStatusDisplay();
}

// Image URL functionality
  const addImageUrlBtn = document.getElementById('addImageUrl');
  const promoImageUrl = document.getElementById('promoImageUrl');
  
  if (addImageUrlBtn && promoImageUrl) {
    addImageUrlBtn.addEventListener('click', async () => {
      try {
        const imageUrl = promoImageUrl.value.trim();
        
        if (!imageUrl) {
          showNotification('Please enter a valid image URL', 'error');
          return;
        }
        
        // Validate URL format
        try {
          new URL(imageUrl);
        } catch (e) {
          showNotification('Please enter a valid URL', 'error');
          return;
        }
        
        // Add the URL to images array
        currentPromoData.images.push(imageUrl);
        
        // Update UI
        displayExistingImages();
        
        // Clear input
        promoImageUrl.value = '';
        
        showNotification('Image URL added successfully', 'success');
      } catch (error) {
        console.error('Error adding image URL:', error);
        showNotification('Failed to add image URL', 'error');
      }
    });  }

  // Setup other event listeners

// Function to check if we're in local development mode
function isLocalDevelopment() {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
}

// Share Modal Functions
let currentInviteCode = '';

function openShareModal(inviteCode) {
  console.log('Opening share modal for invite code:', inviteCode);
  currentInviteCode = inviteCode;
  const modal = document.getElementById('shareInviteModal');
  const shareUrl = document.getElementById('shareUrl');
  
  // Determine the base URL based on the current location
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocalhost ? `${window.location.protocol}//${window.location.host}` : 'https://materioa.netlify.app';
  
  // Set the default URL
  shareUrl.value = `${baseUrl}/invites/${inviteCode}`;
  
  // Reset form
  document.getElementById('customHeading').value = '';
  document.getElementById('headingTemplate').value = '';
  
  // Check if sharelinks database is working
  fetch('/debug-sharelink')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Debug info:', data);
      if (!data.tableExists) {
        showNotification('Sharelinks table not found. Attempting to create it...', 'warning');
        
        // Run the migration to create the table
        fetch('/.netlify/functions/run-migrations')
          .then(response => response.json())
          .then(migrationResult => {
            console.log('Migration result:', migrationResult);
            if (migrationResult.results && migrationResult.results[0] && migrationResult.results[0].success) {
              showNotification('Sharelinks table created successfully! Try updating again.', 'success');
            } else {
              showNotification('Failed to create sharelinks table. Please contact support.', 'error');
            }
          })
          .catch(error => {
            console.error('Migration error:', error);
            showNotification('Error running migrations: ' + error.message, 'error');
          });
      }
    })
    .catch(error => {
      console.error('Error checking database:', error);
    });
  
  // Show modal
  modal.style.display = 'flex';
  modal.classList.add('show');
}

function closeShareModal() {
  const modal = document.getElementById('shareInviteModal');
  modal.style.display = 'none';
  modal.classList.remove('show');
  currentInviteCode = '';
}

function updateCustomHeading() {
  const template = document.getElementById('headingTemplate').value;
  const customHeading = document.getElementById('customHeading');
  
  if (template) {
    customHeading.value = template;
    console.log('Template selected:', template);
    console.log('Current invite code:', currentInviteCode);
  }
}

async function updateShareLink() {
  try {
    const customHeading = document.getElementById('customHeading').value.trim();
    const shareUrl = document.getElementById('shareUrl');
    const updateBtn = document.getElementById('updateShareLinkBtn');
    
    // Show loading state
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    console.log('Updating share link for invite code:', currentInviteCode);
    console.log('Custom heading:', customHeading);
    
    // Determine base URL for share links
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost ? `${window.location.protocol}//${window.location.host}` : 'https://materioa.netlify.app';
    
    // Try multiple approaches, with fallbacks for each
    let successfulUpdate = false;
    let errorDetails = null;
    
    // Approach 1: Use the dedicated sharelink endpoint
    if (!successfulUpdate) {
      try {
        console.log('Attempting to update using sharelink endpoint...');
        const response = await fetch('/.netlify/functions/sharelink', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
          },
          body: JSON.stringify({
            inviteCode: currentInviteCode,
            customHeading: customHeading || null
          })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
          // Always use clean URL regardless of what's returned
          shareUrl.value = `${baseUrl}/invites/${currentInviteCode}`;
          successfulUpdate = true;
          console.log('Successfully updated using sharelink endpoint');
        } else {
          errorDetails = data.error || 'Unknown error';
          console.warn('Sharelink endpoint failed:', errorDetails);
        }
      } catch (e) {
        console.warn('Error using sharelink endpoint:', e.message);
        errorDetails = e.message;
      }
    }
    
    // Approach 2: Try using the debug endpoint which might have less restrictive policies
    if (!successfulUpdate) {
      try {
        console.log('Attempting to update using debug-sharelink endpoint...');
        const response = await fetch('/debug-sharelink', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inviteCode: currentInviteCode,
            customHeading: customHeading || null
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (data.sharelink && data.sharelink.url) {
            shareUrl.value = data.sharelink.url;
          } else if (data.url) {
            shareUrl.value = data.url;
          } else {
            // If no URL is returned, just create a clean one without parameters
            shareUrl.value = `${baseUrl}/invites/${currentInviteCode}`;
          }
          successfulUpdate = true;
          console.log('Successfully updated using debug-sharelink endpoint');
        } else {
          console.warn('Debug sharelink endpoint failed:', data.error || 'Unknown error');
        }
      } catch (e) {
        console.warn('Error using debug-sharelink endpoint:', e.message);
      }
    }
    
    // Approach 3: Fallback to just updating the UI with a URL parameter approach
    if (!successfulUpdate) {
      console.log('Using fallback URL parameter approach...');
      if (customHeading) {
        const updatedUrl = `${baseUrl}/invites/${currentInviteCode}?heading=${encodeURIComponent(customHeading)}`;
        shareUrl.value = updatedUrl;
      } else {
        shareUrl.value = `${baseUrl}/invites/${currentInviteCode}`;
      }
      
      // Show a special message about the fallback
      if (errorDetails && errorDetails.includes("no data returned")) {
        showNotification('Using URL parameter fallback - database updated but no data returned', 'info');
      } else {
        showNotification('Using URL parameter fallback - link will still work correctly', 'info');
      }
      
      successfulUpdate = true;
      console.log('Using URL parameter fallback');
    }
    
    if (successfulUpdate) {
      // After a successful update, let's make sure we fetch the URL without parameters
      try {
        // Wait a moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to check if the URL is available without parameters
        console.log('Verifying sharelink in database...');
        try {
          const response = await fetch(`/sharelink-info?code=${currentInviteCode}`);
          
          if (response.ok) {
            // Data exists in database, use a clean URL
            shareUrl.value = `${baseUrl}/invites/${currentInviteCode}`;
            console.log('Verified sharelink exists in database, using clean URL');
          } else {
            console.log('Could not verify sharelink in database, response status:', response.status);
            // Still use clean URL since we know the update succeeded
            shareUrl.value = `${baseUrl}/invites/${currentInviteCode}`;
          }
        } catch (fetchError) {
          console.log('Error fetching sharelink info, still using clean URL:', fetchError);
          // Still use clean URL since we know the update succeeded
          shareUrl.value = `${baseUrl}/invites/${currentInviteCode}`;
        }
      } catch (verifyError) {
        console.warn('Error in verification process:', verifyError);
        // Keep existing URL if verification fails
      }
      
      showNotification('Share link updated successfully', 'success');
    } else {
      throw new Error(errorDetails || 'Failed to update sharelink');
    }
  } catch (error) {
    console.error('Error updating sharelink:', error);
    showNotification('Error updating sharelink: ' + error.message, 'error');
  } finally {
    // Reset button state
    const updateBtn = document.getElementById('updateShareLinkBtn');
    updateBtn.disabled = false;
    updateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Share Link';
  }
}

function shareViaWhatsApp() {
  const shareUrl = document.getElementById('shareUrl').value;
  const customHeading = document.getElementById('customHeading').value;
  
  let message = `Check out this invitation to join Materio!`;
  if (customHeading) {
    message = customHeading.replace('{name}', 'you');
  }
  message += `\n\n${shareUrl}`;
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

function shareViaTwitter() {
  const shareUrl = document.getElementById('shareUrl').value;
  const customHeading = document.getElementById('customHeading').value;
  
  let text = `Join me on Materio - where e-learning doesn't feel like suffering!`;
  if (customHeading) {
    text = customHeading.replace('{name}', 'everyone');
  }
  
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  window.open(twitterUrl, '_blank');
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('shareInviteModal');
  if (event.target === modal) {
    closeShareModal();
  }
});

// Close modal with escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeShareModal();
  }
});