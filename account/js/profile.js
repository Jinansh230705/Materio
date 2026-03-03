document.addEventListener('DOMContentLoaded', function () {
  // Sidebar tab switching functionality
  const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  if (sidebarNavItems.length) {
    sidebarNavItems.forEach(button => {
      button.addEventListener('click', function () {
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
      uploadButton.addEventListener('click', function () {
        profilePictureInput.click();
      });
    }

    profilePictureInput.addEventListener('change', function (e) {
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
        reader.onload = function (event) {
          picturePreview.src = event.target.result;
          // Also update the dashboard profile image preview
          if (dashboardProfileImage) {
            dashboardProfileImage.src = event.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }    // Admin invite card reference
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
          const upgradeContainer = document.getElementById('upgrade-plus-container');

          // Build the display name HTML
          let nameHtml = displayName;

          // Add verified badges and hide/update upgrade link
          if (user.hasAdminPrivileges) {
            nameHtml += ' <i class="fas fa-badge-check verified-badge admin" title="Admin"></i>';
            if (upgradeContainer) upgradeContainer.style.display = 'none';
          } else if (user.isProUser || user.isPlusUser) {
            nameHtml += ' <i class="fas fa-badge-check verified-badge pro" title="Pro User"></i>'; // Pro Badge
            if (upgradeContainer) upgradeContainer.style.display = 'none';
          } else if (user.isLiteUser) {
            nameHtml += ' <i class="fas fa-badge-check verified-badge plus" title="Plus User"></i>'; // Plus Badge

            // Add expiry info if available
            if (user.plusExpiry) {
              const expiryDate = new Date(user.plusExpiry).toLocaleDateString();
              nameHtml += ` <span class="expiry-text" style="font-size: 0.7rem; color: #666; margin-left: 5px;">(Expires: ${expiryDate})</span>`;
            }

            // If they are Plus, keep upgrade link but change text to "Upgrade to Pro"
            if (upgradeContainer) {
              const upgradeLink = upgradeContainer.querySelector('.upgrade-link');
              if (upgradeLink) {
                upgradeLink.textContent = 'Upgrade to Pro →';
              }
            }
          }

          // Add upgrade container back at the end if it exists and is visible
          if (upgradeContainer && upgradeContainer.style.display !== 'none') {
            nameHtml += ' ' + upgradeContainer.outerHTML;
            upgradeContainer.remove(); // Remove original to avoid duplicate
          }

          dashboardDisplayName.innerHTML = nameHtml;
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
        showNotification('Failed to load user profile: ' + (error.message || 'Unknown error'), 'error');
      }
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
    generateInviteBtn.addEventListener('click', async function () {
      await generateInvite(this, false);
    });
  }

  // Generate plus invite code
  if (generatePlusInviteBtn) {
    generatePlusInviteBtn.addEventListener('click', async function () {
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
    copyInviteBtn.addEventListener('click', function () {
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
    viewInvitesBtn.addEventListener('click', function () {
      openInvitesModal();
    });
  }

  // Handle profile update form submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async function (e) {
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
    securityForm.addEventListener('submit', async function (e) {
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
    copyKeyButton.addEventListener('click', function () {
      const recoveryKeyInput = document.getElementById('recoveryKey');

      if (recoveryKeyInput && recoveryKeyInput.value) {
        recoveryKeyInput.select();
        document.execCommand('copy');
        showNotification('Recovery key copied to clipboard', 'success');
      }
    });
  }
  if (generateNewKeyButton) {
    generateNewKeyButton.addEventListener('click', async function () {
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
    deleteAccountButton.addEventListener('click', function () {
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
      button.addEventListener('click', function () {
        deleteAccountModal.style.display = 'none';
      });
    });
    // Handle account deletion confirmation
    if (confirmDeleteButton) {
      confirmDeleteButton.addEventListener('click', async function () {
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
        }
      });
    }
  }
  // Logout functionality
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', function () {
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
document.addEventListener('click', function (event) {
  const modal = document.getElementById('viewInvitesModal');
  if (modal && event.target === modal) {
    closeInvitesModal();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function (event) {
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
    const isJson = file.name.toLowerCase().endsWith('.json');
    const downloadUrl = file.download_url || '';

    return `
      <div class="file-item" data-name="${file.name}" data-type="${file.type}" data-path="${file.path || ''}" data-download-url="${escapeHtml(downloadUrl)}">
        <div class="file-icon ${icon.class}">
          <i class="${icon.icon}"></i>
        </div>
        <div class="file-details">
          <div class="file-name">${escapeHtml(file.name)}${stagedJsonChanges[file.path] ? '<span class="staged-json-badge"><i class="fas fa-layer-group"></i> Staged</span>' : ''}</div>
          <div class="file-meta">${size} ${date}</div>
        </div>
        <div class="file-actions">
          ${isJson && file.type !== 'directory' ?
        `<button class="edit-json-btn" onclick="openJsonEditor('${escapeHtml(file.path || currentPath + '/' + file.name)}', '${escapeHtml(downloadUrl)}')" title="Edit JSON">
              <i class="fas fa-edit"></i> Edit
            </button>` : ''
      }
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
      formData.append('path', currentPath); const response = await fetch('/api/v2/cdn', {
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
  const fileList = document.getElementById('fileList'); const fileItem = fileList?.querySelector(`[data-name="${name}"]`);
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

// Course Upload System - Multi-Section with Queue
let semesterSubjectMappings = {};
let uploadSections = {}; // { sectionId: { semester, subject, category, files: [] } }
let sectionCounter = 0;
const BATCH_SIZE_LIMIT = 3.5 * 1024 * 1024; // 3.5MB to stay safely under Vercel's 4MB limit

// Initialize course upload functionality
function initializeCourseUpload() {
  // Load semester-subject mappings
  loadSemesterSubjectMappings();

  // Sub-tab switching
  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  const subTabPanes = document.querySelectorAll('.sub-tab-pane');

  subTabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
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

  // Initialize the first section
  initializeSection(0);

  // Add Section button
  const addSectionBtn = document.getElementById('addSectionBtn');
  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', addNewSection);
  }

  // Upload All button
  const uploadAllBtn = document.getElementById('uploadAllBtn');
  if (uploadAllBtn) {
    uploadAllBtn.addEventListener('click', handleMultiSectionUpload);
  }

  // Clear All button
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllSections);
  }
}

// Initialize a section with event listeners
function initializeSection(sectionId) {
  uploadSections[sectionId] = { semester: '', subject: '', category: '', files: [] };

  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (!section) return;

  const semesterSelect = section.querySelector('.section-semester');
  const subjectSelect = section.querySelector('.section-subject');
  const customSubjectInput = section.querySelector('.section-custom-subject');
  const uploadArea = section.querySelector('.section-upload-area');
  const fileInput = section.querySelector('.section-file-input');

  // Semester change handler
  if (semesterSelect) {
    semesterSelect.addEventListener('change', function () {
      const semester = this.value;
      uploadSections[sectionId].semester = semester;
      populateSectionSubjects(sectionId, semester);
      updateGlobalUploadOptions();
    });
  }

  // Subject change handler
  if (subjectSelect) {
    subjectSelect.addEventListener('change', function () {
      if (this.value === 'custom') {
        customSubjectInput.style.display = 'block';
        customSubjectInput.required = true;
        uploadSections[sectionId].subject = '';
      } else {
        customSubjectInput.style.display = 'none';
        customSubjectInput.required = false;
        uploadSections[sectionId].subject = this.value;
      }
      updateGlobalUploadOptions();
    });
  }

  // Custom subject input handler
  if (customSubjectInput) {
    customSubjectInput.addEventListener('input', function () {
      uploadSections[sectionId].subject = this.value;
      updateGlobalUploadOptions();
    });
  }

  // Category change handler
  const categorySelect = section.querySelector('.section-category');
  const customCategoryInput = section.querySelector('.section-custom-category');

  if (categorySelect) {
    categorySelect.addEventListener('change', function () {
      if (this.value === 'Other') {
        if (customCategoryInput) {
          customCategoryInput.style.display = 'block';
          customCategoryInput.required = true;
        }
        uploadSections[sectionId].category = '';
      } else {
        if (customCategoryInput) {
          customCategoryInput.style.display = 'none';
          customCategoryInput.required = false;
        }
        uploadSections[sectionId].category = this.value;
      }
      updateGlobalUploadOptions();
    });
  }

  // Custom category input handler
  if (customCategoryInput) {
    customCategoryInput.addEventListener('input', function () {
      uploadSections[sectionId].category = this.value;
      updateGlobalUploadOptions();
    });
  }

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
      handleSectionFileSelection(sectionId, files);
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handleSectionFileSelection(sectionId, files);
      fileInput.value = ''; // Reset to allow selecting same files again
    });
  }
}

// Add a new upload section
function addNewSection() {
  sectionCounter++;
  const newSectionId = sectionCounter;
  const container = document.getElementById('uploadSectionsContainer');
  const previousSection = container.querySelector('.upload-section:last-child');
  const previousSectionId = previousSection ? parseInt(previousSection.dataset.sectionId) : 0;

  // Create new section HTML with match previous option
  const newSection = document.createElement('div');
  newSection.className = 'upload-section';
  newSection.dataset.sectionId = newSectionId;

  newSection.innerHTML = `
    <div class="upload-section-header">
      <span class="upload-section-title">
        <i class="fas fa-layer-group"></i>
        Section ${newSectionId + 1}
      </span>
      <button type="button" class="remove-section-btn" onclick="removeUploadSection(${newSectionId})">
        <i class="fas fa-times"></i> Remove
      </button>
    </div>

    <div class="match-previous-option">
      <input type="checkbox" class="match-previous-checkbox" data-section="${newSectionId}" id="matchPrevious${newSectionId}">
      <label for="matchPrevious${newSectionId}">Match previous section's semester</label>
      <small>Uses Semester ${uploadSections[previousSectionId]?.semester || '?'}</small>
    </div>

    <!-- Collapsible form fields -->
    <div class="section-form-fields">
      <div class="form-row">
        <div class="form-group">
          <label>Semester</label>
          <select class="section-semester" data-section="${newSectionId}" required>
            <option value="">Select Semester</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
            <option value="9">Miscellaneous</option>
          </select>
        </div>
        <div class="form-group">
          <label>Subject</label>
          <select class="section-subject" data-section="${newSectionId}" required disabled>
            <option value="">Select Semester First</option>
          </select>
          <input type="text" class="section-custom-subject form-control" data-section="${newSectionId}"
            placeholder="Enter new subject name" style="display: none; margin-top: 8px;">
        </div>
      </div>

      <div class="form-group">
        <label>Category</label>
        <select class="section-category" data-section="${newSectionId}" required>
          <option value="">Select Category</option>
          <option value="Syllabus">Syllabus</option>
          <option value="Chapters">Chapters</option>
          <option value="Presentations">Presentations</option>
          <option value="Assignments">Assignments</option>
          <option value="Question Banks">Question Banks</option>
          <option value="Lab">Lab</option>
          <option value="Previous Year Papers">Previous Year Papers</option>
          <option value="Reference Books">Reference Books</option>
          <option value="Lecture Notes">Lecture Notes</option>
          <option value="Handwritten Notes">Handwritten Notes</option>
          <option value="NPTEL Book">NPTEL Book</option>
          <option value="NPTEL Assignment with Solutions">NPTEL Assignment with Solutions</option>
          <option value="NPTEL Weekly Materials">NPTEL Weekly Materials</option>
          <option value="Other">Other</option>
        </select>
        <input type="text" class="section-custom-category form-control" data-section="${newSectionId}"
          placeholder="Enter new category name" style="display: none; margin-top: 8px;">
      </div>
    </div>

    <div class="upload-area section-upload-area" data-section="${newSectionId}">
      <div class="upload-icon">
        <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--text-secondary);"></i>
      </div>
      <div class="upload-text">
        <h4>Drop files here or click to upload</h4>
        <p>Supports only PDF Format files</p>
      </div>
      <input type="file" class="section-file-input" data-section="${newSectionId}" multiple accept=".pdf" style="display: none;">
    </div>

    <div class="section-file-preview" data-section="${newSectionId}" style="display: none;">
      <div class="section-collapsed-summary"></div>
      <div class="section-file-header">
        <h5>Selected Files</h5>
        <button type="button" class="section-expand-btn" onclick="expandUploadSection(${newSectionId})" title="Add more files">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <div class="section-file-list"></div>
    </div>
  `;

  container.appendChild(newSection);

  // Collapse previous sections that have files
  collapsePreviousSections();

  // Initialize the new section
  initializeSection(newSectionId);

  // Set up match previous checkbox
  const matchPreviousCheckbox = newSection.querySelector('.match-previous-checkbox');
  if (matchPreviousCheckbox) {
    matchPreviousCheckbox.addEventListener('change', function () {
      const semesterSelect = newSection.querySelector('.section-semester');
      if (this.checked && uploadSections[previousSectionId]?.semester) {
        semesterSelect.value = uploadSections[previousSectionId].semester;
        semesterSelect.disabled = true;
        uploadSections[newSectionId].semester = uploadSections[previousSectionId].semester;
        populateSectionSubjects(newSectionId, uploadSections[previousSectionId].semester);
      } else {
        semesterSelect.disabled = false;
      }
      updateGlobalUploadOptions();
    });
  }

  // Scroll to new section
  newSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Remove an upload section
function removeUploadSection(sectionId) {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (section) {
    section.remove();
    delete uploadSections[sectionId];
    updateGlobalUploadOptions();
    renumberSections();
  }
}

// Renumber sections after removal
function renumberSections() {
  const sections = document.querySelectorAll('.upload-section');
  sections.forEach((section, index) => {
    const title = section.querySelector('.upload-section-title');
    if (title) {
      title.innerHTML = `<i class="fas fa-layer-group"></i> Section ${index + 1}`;
    }
  });
}

// Collapse all previous sections that have files
function collapsePreviousSections() {
  const sections = document.querySelectorAll('.upload-section');
  sections.forEach((section, index) => {
    // Collapse all sections except the last one
    if (index < sections.length - 1) {
      const sectionId = parseInt(section.dataset.sectionId);
      const sectionData = uploadSections[sectionId];

      // Only collapse if it has files
      if (sectionData?.files && sectionData.files.length > 0) {
        section.classList.add('collapsed');
        updateCollapsedSummary(sectionId);
      }
    }
  });
}

// Expand a collapsed section
function expandUploadSection(sectionId) {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (section) {
    section.classList.remove('collapsed');
  }
}

// Update the collapsed summary text
function updateCollapsedSummary(sectionId) {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (!section) return;

  const summary = section.querySelector('.section-collapsed-summary');
  if (!summary) return;

  const sectionData = uploadSections[sectionId];
  if (!sectionData) return;

  const subject = sectionData.subject || 'No subject';
  const category = sectionData.category || 'No category';
  const fileCount = sectionData.files?.length || 0;

  summary.innerHTML = `<i class="fas fa-info-circle"></i> ${subject} • ${category} • ${fileCount} file(s)`;
}

// Populate subjects for a specific section
function populateSectionSubjects(sectionId, semester) {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (!section) return;

  const subjectSelect = section.querySelector('.section-subject');
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

// Handle file selection for a specific section
function handleSectionFileSelection(sectionId, files) {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
  const validFiles = [];
  const rejectedFiles = [];

  // Validate each file
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      rejectedFiles.push({
        name: file.name,
        reason: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 50MB.`
      });
    } else if (!file.name.toLowerCase().endsWith('.pdf')) {
      rejectedFiles.push({
        name: file.name,
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

  // Add valid files to section
  if (!uploadSections[sectionId]) {
    uploadSections[sectionId] = { semester: '', subject: '', category: '', files: [] };
  }
  uploadSections[sectionId].files = [...uploadSections[sectionId].files, ...validFiles];

  // Update file preview
  displaySectionFilePreview(sectionId);
  updateGlobalUploadOptions();
}

// Display file preview for a specific section
function displaySectionFilePreview(sectionId) {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (!section) return;

  const previewContainer = section.querySelector('.section-file-preview');
  const fileList = section.querySelector('.section-file-list');
  const files = uploadSections[sectionId]?.files || [];

  if (files.length === 0) {
    previewContainer.style.display = 'none';
    return;
  }

  previewContainer.style.display = 'block';
  fileList.innerHTML = files.map((file, index) => {
    const displayName = file.displayName || file.name.replace(/\.[^/.]+$/, "");
    const priority = file.priority !== undefined ? file.priority : index + 1;
    return `
    <div class="section-file-chip" data-file-index="${index}" draggable="true">
      <i class="fas fa-grip-vertical drag-handle" title="Drag to reorder"></i>
      <i class="fas fa-file-pdf"></i>
      <input type="text" class="file-name-input" value="${displayName}" 
             onchange="renameSectionFile(${sectionId}, ${index}, this.value)"
             onclick="event.stopPropagation()"
             title="Click to rename">
      <span class="file-extension">.pdf</span>
      <input type="number" class="priority-input" value="${priority}" min="1"
             onchange="setFilePriority(${sectionId}, ${index}, this.value)"
             onclick="event.stopPropagation(); this.select()"
             title="Priority (lower = first)">
      <button type="button" class="remove-file" onclick="removeSectionFile(${sectionId}, ${index})">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  }).join('');

  // Add sort by priority button if more than 1 file
  if (files.length > 1) {
    const existingBtn = previewContainer.querySelector('.sort-by-priority-btn');
    if (!existingBtn) {
      const sortBtn = document.createElement('button');
      sortBtn.type = 'button';
      sortBtn.className = 'sort-by-priority-btn';
      sortBtn.innerHTML = '<i class="fas fa-sort-numeric-down"></i> Sort by Priority';
      sortBtn.onclick = () => sortFilesByPriority(sectionId);
      previewContainer.appendChild(sortBtn);
    }
  }

  // Set up drag-and-drop for file reordering
  setupFileDragAndDrop(sectionId, fileList);

  // Update collapsed summary in case this section gets collapsed
  updateCollapsedSummary(sectionId);
}

// Set file priority
function setFilePriority(sectionId, fileIndex, priority) {
  if (uploadSections[sectionId]?.files && uploadSections[sectionId].files[fileIndex]) {
    uploadSections[sectionId].files[fileIndex].priority = parseInt(priority) || 1;
  }
}

// Sort files by priority number
function sortFilesByPriority(sectionId) {
  const files = uploadSections[sectionId]?.files;
  if (!files || files.length < 2) return;

  // Sort by priority (lower number = first)
  files.sort((a, b) => {
    const priorityA = a.priority !== undefined ? a.priority : Infinity;
    const priorityB = b.priority !== undefined ? b.priority : Infinity;
    return priorityA - priorityB;
  });

  // Re-render the file list
  displaySectionFilePreview(sectionId);
  showNotification('Files sorted by priority', 'info');
}

// Set up drag-and-drop for file reordering within a section
function setupFileDragAndDrop(sectionId, fileList) {
  const chips = fileList.querySelectorAll('.section-file-chip');

  chips.forEach(chip => {
    chip.addEventListener('dragstart', (e) => {
      chip.classList.add('dragging');
      fileList.classList.add('drag-active');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', chip.dataset.fileIndex);
    });

    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      fileList.classList.remove('drag-active');
      chips.forEach(c => c.classList.remove('drag-over'));
    });

    chip.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const dragging = fileList.querySelector('.dragging');
      if (dragging && chip !== dragging) {
        chip.classList.add('drag-over');
      }
    });

    chip.addEventListener('dragleave', () => {
      chip.classList.remove('drag-over');
    });

    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      chip.classList.remove('drag-over');

      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = parseInt(chip.dataset.fileIndex);

      if (fromIndex !== toIndex) {
        reorderSectionFiles(sectionId, fromIndex, toIndex);
      }
    });
  });
}

// Reorder files within a section
function reorderSectionFiles(sectionId, fromIndex, toIndex) {
  const files = uploadSections[sectionId]?.files;
  if (!files) return;

  // Remove the file from its original position
  const [movedFile] = files.splice(fromIndex, 1);

  // Insert at the new position
  files.splice(toIndex, 0, movedFile);

  // Re-render the file list
  displaySectionFilePreview(sectionId);
}

// Rename a file in a section
function renameSectionFile(sectionId, fileIndex, newName) {
  if (uploadSections[sectionId]?.files && uploadSections[sectionId].files[fileIndex]) {
    const originalFile = uploadSections[sectionId].files[fileIndex];
    const newFileName = newName + '.pdf';

    // Create a new File object with the new name
    const renamedFile = new File([originalFile], newFileName, {
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });

    // Store the display name for UI
    renamedFile.displayName = newName;

    uploadSections[sectionId].files[fileIndex] = renamedFile;
  }
}


// Remove a file from a section
function removeSectionFile(sectionId, fileIndex) {
  if (uploadSections[sectionId]?.files) {
    uploadSections[sectionId].files.splice(fileIndex, 1);
    displaySectionFilePreview(sectionId);
    updateGlobalUploadOptions();
  }
}

// Update global upload options visibility
function updateGlobalUploadOptions() {
  const globalOptions = document.getElementById('globalUploadOptions');
  const hasFiles = Object.values(uploadSections).some(s => s.files && s.files.length > 0);

  if (globalOptions) {
    globalOptions.style.display = hasFiles ? 'block' : 'none';
  }
}

// Clear all sections (with confirmation for user-initiated clear)
function clearAllSections() {
  if (!confirm('Are you sure you want to clear all sections and files?')) return;
  clearAllSectionsInternal();
  showNotification('All sections cleared', 'info');
}

// Internal function to clear sections without confirmation
function clearAllSectionsInternal() {
  // Reset all sections
  Object.keys(uploadSections).forEach(sectionId => {
    uploadSections[sectionId].files = [];
    displaySectionFilePreview(sectionId);

    const section = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (section) {
      section.querySelector('.section-semester').value = '';
      const subjectSelect = section.querySelector('.section-subject');
      subjectSelect.innerHTML = '<option value="">Select Semester First</option>';
      subjectSelect.disabled = true;
      section.querySelector('.section-category').value = '';
      const customSubject = section.querySelector('.section-custom-subject');
      if (customSubject) {
        customSubject.style.display = 'none';
        customSubject.value = '';
      }
    }
  });

  // Remove all sections except the first one
  const container = document.getElementById('uploadSectionsContainer');
  const sections = container.querySelectorAll('.upload-section');
  sections.forEach((section, index) => {
    if (index > 0) {
      section.remove();
      const id = parseInt(section.dataset.sectionId);
      delete uploadSections[id];
    } else {
      // Uncollapse the first section
      section.classList.remove('collapsed');
      // Clear valid state if any
      section.querySelector('.section-collapsed-summary').innerHTML = '';
    }
  });

  renumberSections();
  updateGlobalUploadOptions();
}

// Create batches from all sections' files to stay under size limit
function createUploadBatches() {
  const batches = [];
  let currentBatch = { items: [], totalSize: 0 };

  // Collect all files with their metadata
  Object.entries(uploadSections).forEach(([sectionId, section]) => {
    if (!section.files || section.files.length === 0) return;

    const subject = section.subject ||
      document.querySelector(`[data-section-id="${sectionId}"] .section-custom-subject`)?.value;

    section.files.forEach(file => {
      const item = {
        file,
        sectionId,
        semester: section.semester,
        subject,
        category: section.category
      };

      // Check if adding this file would exceed the batch limit
      if (currentBatch.totalSize + file.size > BATCH_SIZE_LIMIT && currentBatch.items.length > 0) {
        // Push current batch and start a new one
        batches.push(currentBatch);
        currentBatch = { items: [], totalSize: 0 };
      }

      // If single file is larger than limit, it gets its own batch (will likely fail but we try)
      if (file.size > BATCH_SIZE_LIMIT) {
        if (currentBatch.items.length > 0) {
          batches.push(currentBatch);
          currentBatch = { items: [], totalSize: 0 };
        }
        batches.push({ items: [item], totalSize: file.size });
      } else {
        currentBatch.items.push(item);
        currentBatch.totalSize += file.size;
      }
    });
  });

  // Don't forget the last batch
  if (currentBatch.items.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

// Handle multi-section upload with queue - uses staged uploads for single commit
async function handleMultiSectionUpload() {
  // Validate all sections
  let hasValidSection = false;
  let validationError = null;

  for (const [sectionId, section] of Object.entries(uploadSections)) {
    if (section.files && section.files.length > 0) {
      const sectionEl = document.querySelector(`[data-section-id="${sectionId}"]`);
      const subject = section.subject ||
        sectionEl?.querySelector('.section-custom-subject')?.value;

      if (!section.semester || !subject || !section.category) {
        validationError = `Section ${parseInt(sectionId) + 1}: Please fill all required fields (semester, subject, category)`;
        break;
      }
      hasValidSection = true;
    }
  }

  if (validationError) {
    showNotification(validationError, 'error');
    return;
  }

  if (!hasValidSection) {
    showNotification('Please select files to upload in at least one section', 'error');
    return;
  }

  const autoPushNotify = document.getElementById('autoPushNotify')?.checked ?? true;

  // Create batches
  const batches = createUploadBatches();

  if (batches.length === 0) {
    showNotification('No files to upload', 'error');
    return;
  }

  // Show queue progress
  const queueProgress = document.getElementById('queueProgress');
  const queueItems = document.getElementById('queueItems');
  const queueStats = document.getElementById('queueStats');
  const queueProgressBar = document.getElementById('queueProgressBar');
  const queueProgressPercent = document.getElementById('queueProgressPercent');
  const batchCommitInfo = document.getElementById('batchCommitInfo');
  const commitMessage = document.getElementById('commitMessage');
  const uploadAllBtn = document.getElementById('uploadAllBtn');

  queueProgress.style.display = 'block';
  batchCommitInfo.style.display = 'none';
  uploadAllBtn.disabled = true;
  uploadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing files...';

  // Initialize queue display with processing + upload phases
  const totalSteps = batches.length + 1; // batches + 1 processing step
  queueStats.textContent = `0 / ${totalSteps} steps`;

  // Build queue items display
  let queueHTML = batches.map((batch, index) => {
    const fileCount = batch.items.length;
    const size = (batch.totalSize / 1024 / 1024).toFixed(2);
    return `
      <div class="queue-item" data-batch="${index}">
        <div class="queue-item-icon pending">
          <i class="fas fa-clock"></i>
        </div>
        <div class="queue-item-details">
          <div class="queue-item-name">Process batch ${index + 1}: ${fileCount} file(s)</div>
          <div class="queue-item-meta">${size} MB</div>
        </div>
        <span class="queue-item-status pending">Pending</span>
      </div>
    `;
  }).join('');

  // Add final upload step
  queueHTML += `
    <div class="queue-item" data-batch="commit">
      <div class="queue-item-icon pending">
        <i class="fas fa-clock"></i>
      </div>
      <div class="queue-item-details">
        <div class="queue-item-name">Finalize Upload</div>
        <div class="queue-item-meta">Saving files to server</div>
      </div>
      <span class="queue-item-status pending">Pending</span>
    </div>
  `;
  queueItems.innerHTML = queueHTML;

  // Phase 1: Process all files in batches
  let successCount = 0;
  let failedCount = 0;
  const allStagedFiles = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const queueItem = queueItems.querySelector(`[data-batch="${i}"]`);
    const icon = queueItem.querySelector('.queue-item-icon');
    const status = queueItem.querySelector('.queue-item-status');

    // Update to processing state
    icon.className = 'queue-item-icon uploading';
    icon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    status.className = 'queue-item-status uploading';
    status.textContent = 'Processing...';

    try {
      // Group files by semester/subject/category for the API
      const groupedFiles = {};
      batch.items.forEach(item => {
        const key = `${item.semester}|${item.subject}|${item.category}`;
        if (!groupedFiles[key]) {
          groupedFiles[key] = {
            semester: item.semester,
            subject: item.subject,
            category: item.category,
            files: []
          };
        }
        groupedFiles[key].files.push(item.file);
      });

      const groups = Object.values(groupedFiles);

      for (const group of groups) {
        const stageFormData = new FormData();
        stageFormData.append('semester', group.semester);
        stageFormData.append('subject', group.subject);
        stageFormData.append('category', group.category);
        stageFormData.append('basePath', `pdfs/${group.semester}/${group.subject}`);

        group.files.forEach(file => {
          stageFormData.append('files', file);
        });

        // Use the new stage endpoint
        const response = await fetch('/api/v2/cdn?stage=true', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
          },
          body: stageFormData
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || `Processing failed: ${response.status}`);
        }

        // Collect processed files for the final upload
        if (result.stagedFiles) {
          allStagedFiles.push(...result.stagedFiles);
        }
      }

      // Update to success state
      icon.className = 'queue-item-icon success';
      icon.innerHTML = '<i class="fas fa-check"></i>';
      status.className = 'queue-item-status success';
      status.textContent = 'Ready';
      successCount++;

    } catch (error) {
      console.error(`Batch ${i + 1} processing failed:`, error);

      // Update to error state
      icon.className = 'queue-item-icon error';
      icon.innerHTML = '<i class="fas fa-exclamation"></i>';
      status.className = 'queue-item-status error';
      status.textContent = 'Failed';
      failedCount++;
    }

    // Update progress
    const progress = Math.round(((i + 1) / totalSteps) * 100);
    queueProgressBar.style.setProperty('--progress', `${progress}%`);
    queueProgressPercent.textContent = `${progress}%`;
    queueStats.textContent = `${i + 1} / ${totalSteps} steps`;
  }

  // Phase 2: Finalize upload with all files
  const commitQueueItem = queueItems.querySelector('[data-batch="commit"]');
  const commitIcon = commitQueueItem.querySelector('.queue-item-icon');
  const commitStatus = commitQueueItem.querySelector('.queue-item-status');
  const stagedJsonFiles = getStagedJsonForCommit();

  if (failedCount > 0) {
    // If processing failed, don't attempt upload
    commitIcon.className = 'queue-item-icon error';
    commitIcon.innerHTML = '<i class="fas fa-ban"></i>';
    commitStatus.className = 'queue-item-status error';
    commitStatus.textContent = 'Skipped';

    showNotification(`Processing failed for ${failedCount} batch(es). Upload cancelled.`, 'error');
  } else if (allStagedFiles.length === 0 && stagedJsonFiles.length === 0) {
    commitIcon.className = 'queue-item-icon error';
    commitIcon.innerHTML = '<i class="fas fa-exclamation"></i>';
    commitStatus.className = 'queue-item-status error';
    commitStatus.textContent = 'No items';

    showNotification('No files or JSON edits were staged. Upload cancelled.', 'error');
  } else {
    // Update to uploading state
    uploadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizing...';
    commitIcon.className = 'queue-item-icon uploading';
    commitIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    commitStatus.className = 'queue-item-status uploading';
    commitStatus.textContent = 'Finalizing...';

    try {
      // Get staged JSON changes
      const stagedJsonFiles = getStagedJsonForCommit();

      // Send commit request with all staged files
      const response = await fetch('/api/v2/cdn?commit=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stagedFiles: allStagedFiles,
          stagedJsonFiles, // Include staged JSON changes
          autoPushNotify
        })
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || `Upload failed: ${response.status}`);
      }

      // Update to success state
      commitIcon.className = 'queue-item-icon success';
      commitIcon.innerHTML = '<i class="fas fa-check"></i>';
      commitStatus.className = 'queue-item-status success';
      commitStatus.textContent = 'Complete';

      // Update progress to 100%
      queueProgressBar.style.setProperty('--progress', '100%');
      queueProgressPercent.textContent = '100%';
      queueStats.textContent = `${totalSteps} / ${totalSteps} steps`;

      // Show success
      batchCommitInfo.style.display = 'flex';
      const jsonCount = stagedJsonFiles.length;
      const totalCount = allStagedFiles.length + jsonCount;
      const jsonNote = jsonCount > 0 ? ` + ${jsonCount} JSON edit(s)` : '';
      commitMessage.textContent = `All ${allStagedFiles.length} files${jsonNote} uploaded successfully!`;
      showNotification(`Successfully uploaded ${totalCount} item(s)!`, 'success');

      // Clear all sections and staged JSON on success
      setTimeout(() => {
        clearAllSectionsInternal();
        clearStagedJson();
        queueProgress.style.display = 'none';
      }, 3000);

    } catch (error) {
      console.error('Upload failed:', error);

      commitIcon.className = 'queue-item-icon error';
      commitIcon.innerHTML = '<i class="fas fa-exclamation"></i>';
      commitStatus.className = 'queue-item-status error';
      commitStatus.textContent = 'Failed';

      showNotification(`Upload failed: ${error.message}`, 'error');
    }
  }

  // Reset button
  uploadAllBtn.disabled = false;
  uploadAllBtn.innerHTML = '<i class="fas fa-upload"></i> Upload All Sections';
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
  // Initialize with default subjects for each semester
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

    await fetch('/api/v2/cdn', {
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

    const response = await fetch('/api/v2/cdn', {
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

    await fetch('/api/v2/cdn', {
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
  media: [],
  mediaFit: "contain",
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
    promoElements.enabledCheckbox.addEventListener('change', function () {
      updatePromotionStatus();
    });
  }

  if (promoElements.limitedOfferCheckbox) {
    promoElements.limitedOfferCheckbox.addEventListener('change', function () {
      toggleDateRangeSection();
    });
  }

  if (promoElements.imageInput) {
    promoElements.imageInput.addEventListener('change', handleImageUpload);
  }

  if (promoElements.imageUploadArea) {
    promoElements.imageUploadArea.addEventListener('click', function () {
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
      }
    });
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

        // Add the URL to media array
        currentPromoData.media.push(imageUrl);

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
    promoElements.addMoreImagesBtn.addEventListener('click', function () {
      promoElements.imageInput.click();
    });
  }

  if (promoElements.form) {
    promoElements.form.addEventListener('submit', savePromotion);
  }

  if (promoElements.previewBtn) {
    promoElements.previewBtn.addEventListener('click', previewPromotion);
  }
  if (promoElements.clearBtn) {
    promoElements.clearBtn.addEventListener('click', clearPromotion);
  }
}

async function loadPromotionData() {
  try {
    const response = await fetch('/assets/data/promo.json');
    if (response.ok) {
      const loadedData = await response.json();
      // Support both 'media' (new) and 'images' (legacy) properties
      currentPromoData = {
        ...loadedData,
        media: loadedData.media || loadedData.images || [],
        mediaFit: loadedData.mediaFit || 'cover'
      };
      // Remove legacy 'images' key if media exists
      delete currentPromoData.images;
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

  // Handle media display (support both 'media' and legacy 'images')
  const mediaItems = currentPromoData.media || currentPromoData.images || [];
  if (mediaItems.length > 0) {
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
    const mediaItems = currentPromoData.media || [];
    mediaItems.forEach((mediaPath, index) => {
      const imageItem = createImagePreviewItem(mediaPath, index);
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

      // Upload to assets/media folder
      const uploadedMediaPath = await uploadPromoImage(file);
      if (uploadedMediaPath) {
        currentPromoData.media.push(uploadedMediaPath);
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
    const response = await fetch('/api/v2/cdn', {
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
  const mediaItems = currentPromoData.media || [];
  if (index >= 0 && index < mediaItems.length) {
    currentPromoData.media.splice(index, 1);

    if (currentPromoData.media.length === 0) {
      // Show upload placeholder again
      const uploadPlaceholder = document.getElementById('uploadPlaceholder');
      const imagePreviewContainer = document.getElementById('imagePreviewContainer');

      if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    } else {
      displayExistingImages();
    }

    showNotification('Media removed', 'info');
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
      media: currentPromoData.media || [],
      mediaFit: currentPromoData.mediaFit || 'contain',
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
      const response = await fetch('/api/v2/features/save-promo', {
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
        const response = await fetch('/api/v2/features/save-promo', {
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
    media: currentPromoData.media || [],
    mediaFit: currentPromoData.mediaFit || 'contain',
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

  // Update and show media if available (support both 'media' and legacy 'images')
  const imageEl = modal.querySelector('.promo-cover');
  const mediaItems = data.media || data.images || [];

  if (imageEl && mediaItems.length > 0) {
    imageEl.src = mediaItems[0];
    imageEl.alt = data.title;
    imageEl.style.display = 'block';

    // Apply media fit style
    if (data.mediaFit) {
      imageEl.style.objectFit = data.mediaFit;
    }

    // Setup image rotation if multiple media items
    if (mediaItems.length > 1) {
      setupImageRotationForPreview(mediaItems);
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
  const mediaItems = data.media || data.images || [];
  const imageSlider = mediaItems.length > 1 ?
    generateImageSliderHTML(mediaItems) :
    (mediaItems.length === 1 ? `<img src="${mediaItems[0]}" alt="Promotion" class="preview-image" style="object-fit: ${data.mediaFit || 'cover'};">` : '');

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

    // Clear media
    currentPromoData.media = [];
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
      media: [],
      mediaFit: "contain",
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

      // Add the URL to media array
      currentPromoData.media.push(imageUrl);

      // Update UI
      displayExistingImages();

      // Clear input
      promoImageUrl.value = '';

      showNotification('Image URL added successfully', 'success');
    } catch (error) {
      console.error('Error adding image URL:', error);
      showNotification('Failed to add image URL', 'error');
    }
  });
}

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
  fetch('/api/v2/invites/diagnostic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode: inviteCode })
  })
    .then(response => {
      if (!response.ok) {
        // If 404, it might be because the endpoint is not available or path is wrong
        // Try the features endpoint as fallback if needed, or just ignore for now
        console.warn(`Diagnostic check failed with status: ${response.status}`);
        return null;
      }
      return response.json();
    })
    .then(data => {
      if (data) {
        console.log('Debug info:', data);
        if (!data.tableExists && data.found === false && data.error && data.error.includes('relation "sharelinks" does not exist')) {
          showNotification('Sharelinks table not found. Please contact admin.', 'warning');
        }
      }
    })
    .catch(error => {
      console.error('Debug check failed:', error);
      // Don't show error to user, just log it
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
        const response = await fetch('/api/v2/features?action=sharelink', {
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
          const response = await fetch(`/api/v2/invites/sharelink-info?code=${currentInviteCode}`);

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
document.addEventListener('click', function (event) {
  const modal = document.getElementById('shareInviteModal');
  if (event.target === modal) {
    closeShareModal();
  }
});

// Close modal with escape key
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    closeShareModal();
    closeJsonEditor();
  }
});

// =============================================
// JSON Editor Functions
// =============================================

// Store for staged JSON changes
let stagedJsonChanges = {}; // { path: { content: string, originalContent: string } }
let currentJsonFile = null;
let originalJsonContent = '';

// Open JSON editor for a file
async function openJsonEditor(filePath, downloadUrl) {
  const panel = document.getElementById('jsonEditorPanel');
  const textarea = document.getElementById('jsonEditorTextarea');
  const fileName = document.getElementById('jsonEditorFileName');
  const status = document.getElementById('jsonEditorStatus');
  const statusText = document.getElementById('jsonEditorStatusText');

  // Set the file name
  fileName.textContent = filePath.split('/').pop();
  currentJsonFile = filePath;

  // Show loading state
  textarea.value = 'Loading...';
  textarea.disabled = true;
  panel.classList.add('open');

  try {
    // Fetch the JSON content
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to fetch file');

    const content = await response.text();
    originalJsonContent = content;

    // Check if there's already a staged version
    if (stagedJsonChanges[filePath]) {
      textarea.value = stagedJsonChanges[filePath].content;
      statusText.textContent = 'Loaded (has staged changes)';
      status.className = 'json-editor-status success';
    } else {
      // Try to format it
      try {
        const parsed = JSON.parse(content);
        textarea.value = JSON.stringify(parsed, null, 2);
      } catch {
        textarea.value = content;
      }
      statusText.textContent = 'Ready';
      status.className = 'json-editor-status';
    }

    textarea.disabled = false;
  } catch (error) {
    console.error('Error loading JSON:', error);
    textarea.value = '// Error loading file: ' + error.message;
    statusText.textContent = 'Error loading file';
    status.className = 'json-editor-status error';
  }

  // Set up live validation
  textarea.oninput = validateJsonLive;
}

// Close JSON editor
function closeJsonEditor() {
  const panel = document.getElementById('jsonEditorPanel');
  panel.classList.remove('open');
  currentJsonFile = null;
  originalJsonContent = '';
}

// Format JSON in the editor
function formatJson() {
  const textarea = document.getElementById('jsonEditorTextarea');
  const status = document.getElementById('jsonEditorStatus');
  const statusText = document.getElementById('jsonEditorStatusText');

  try {
    const parsed = JSON.parse(textarea.value);
    textarea.value = JSON.stringify(parsed, null, 2);
    statusText.textContent = 'Formatted successfully';
    status.className = 'json-editor-status success';
  } catch (error) {
    statusText.textContent = 'Invalid JSON: ' + error.message;
    status.className = 'json-editor-status error';
  }
}

// Reset JSON editor to original content
function resetJsonEditor() {
  const textarea = document.getElementById('jsonEditorTextarea');
  const status = document.getElementById('jsonEditorStatus');
  const statusText = document.getElementById('jsonEditorStatusText');

  if (originalJsonContent) {
    try {
      const parsed = JSON.parse(originalJsonContent);
      textarea.value = JSON.stringify(parsed, null, 2);
    } catch {
      textarea.value = originalJsonContent;
    }
    statusText.textContent = 'Reset to original';
    status.className = 'json-editor-status';
  }
}

// Validate JSON live as user types
function validateJsonLive() {
  const textarea = document.getElementById('jsonEditorTextarea');
  const status = document.getElementById('jsonEditorStatus');
  const statusText = document.getElementById('jsonEditorStatusText');
  const lineInfo = document.getElementById('jsonEditorLineInfo');

  // Update line info
  const lines = textarea.value.split('\n').length;
  const chars = textarea.value.length;
  lineInfo.textContent = `${lines} lines, ${chars} chars`;

  try {
    JSON.parse(textarea.value);
    statusText.textContent = 'Valid JSON';
    status.className = 'json-editor-status success';
    return true;
  } catch (error) {
    statusText.textContent = 'Invalid: ' + error.message.substring(0, 50);
    status.className = 'json-editor-status error';
    return false;
  }
}

// Load staged changes from localStorage on init
const STAGED_JSON_STORAGE_KEY = 'materio_staged_json';
try {
  const savedStagedJson = localStorage.getItem(STAGED_JSON_STORAGE_KEY);
  if (savedStagedJson) {
    stagedJsonChanges = JSON.parse(savedStagedJson);
    setTimeout(updateStagedJsonCount, 1000); // Update UI after page load
  }
} catch (e) {
  console.error('Failed to load staged JSON from storage:', e);
}

// Warn user if leaving with staged changes
window.addEventListener('beforeunload', (e) => {
  if (Object.keys(stagedJsonChanges).length > 0) {
    e.preventDefault();
    e.returnValue = 'You have staged JSON changes that have not been uploaded. Are you sure you want to leave?';
  }
});

// Stage JSON changes for next upload
function stageJsonChanges() {
  const textarea = document.getElementById('jsonEditorTextarea');
  const status = document.getElementById('jsonEditorStatus');
  const statusText = document.getElementById('jsonEditorStatusText');

  if (!currentJsonFile) {
    showNotification('No file open', 'error');
    return;
  }

  // Validate JSON first
  try {
    JSON.parse(textarea.value);
  } catch (error) {
    showNotification('Cannot stage invalid JSON: ' + error.message, 'error');
    return;
  }

  // Check if content has changed
  const currentContent = textarea.value;
  let originalFormatted;
  try {
    originalFormatted = JSON.stringify(JSON.parse(originalJsonContent), null, 2);
  } catch {
    originalFormatted = originalJsonContent;
  }

  if (currentContent === originalFormatted) {
    showNotification('No changes to stage', 'info');
    return;
  }

  // Stage the changes
  stagedJsonChanges[currentJsonFile] = {
    content: currentContent,
    originalContent: originalJsonContent,
    path: currentJsonFile
  };

  // Save to localStorage
  localStorage.setItem(STAGED_JSON_STORAGE_KEY, JSON.stringify(stagedJsonChanges));

  statusText.textContent = 'Changes staged!';
  status.className = 'json-editor-status success';

  showNotification(`Staged changes to ${currentJsonFile.split('/').pop()}`, 'success');
  updateStagedJsonCount();

  // Close the editor
  setTimeout(() => closeJsonEditor(), 500);
}

// Update the staged JSON count display
function updateStagedJsonCount() {
  const count = Object.keys(stagedJsonChanges).length;

  // Update the global upload options to show staged count
  const globalOptions = document.getElementById('globalUploadOptions');
  if (globalOptions) {
    let badge = globalOptions.querySelector('.staged-json-count');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'staged-json-count';
        globalOptions.querySelector('.upload-all-container')?.prepend(badge);
      }
      badge.innerHTML = `<i class="fas fa-code"></i> ${count} JSON file(s) staged`;
      globalOptions.style.display = 'block';
    } else if (badge) {
      badge.remove();
    }
  }
}

// Get staged JSON for the commit
function getStagedJsonForCommit() {
  return Object.values(stagedJsonChanges).map(item => ({
    path: item.path,
    content: item.content
  }));
}

// Clear staged JSON after successful upload
function clearStagedJson() {
  stagedJsonChanges = {};
  localStorage.removeItem(STAGED_JSON_STORAGE_KEY);
  updateStagedJsonCount();
}