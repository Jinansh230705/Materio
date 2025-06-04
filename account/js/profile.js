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
    });  }
  
  // Admin invite card reference
  const adminInviteCard = document.getElementById('adminInviteCard');

  // Load user profile data
  async function loadUserProfile() {
    try {
      const response = await makeApiRequest('profile', 'GET', null, true);
      
      if (response && response.user) {
        const user = response.user;
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
        }
          // Show Files tab if user has admin privileges
        const filesTab = document.getElementById('filesTab');
        if (user.hasAdminPrivileges && filesTab) {
          filesTab.style.display = 'block';
          // Initialize file management functionality
          initializeFileManagement();
          // Initialize course upload functionality
          initializeCourseUpload();
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
          dashboardDisplayName.textContent = user.displayName || user.username;
        }
        
        if (dashboardUsername) {
          dashboardUsername.textContent = '@' + user.username;
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      showNotification('Failed to load user profile', 'error');
    }
  }
  
  // Load user profile when page loads
  loadUserProfile();
    // Admin invite functionality
  const generateInviteBtn = document.getElementById('generateInviteBtn');
  const viewInvitesBtn = document.getElementById('viewInvitesBtn');
  const copyInviteBtn = document.getElementById('copyInviteBtn');
  const generatedInviteSection = document.getElementById('generatedInviteSection');
  
  // Generate invite code
  if (generateInviteBtn) {
    generateInviteBtn.addEventListener('click', async function() {
      try {
        const originalText = this.textContent;
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        const response = await makeApiRequest('invites', 'POST', null, true);
        
        if (response && response.invite) {
          document.getElementById('generatedInviteCode').value = response.invite.code;
          generatedInviteSection.style.display = 'block';
          showNotification('Invite code generated successfully!', 'success');
        }
      } catch (error) {
        console.error('Generate invite error:', error);
        showNotification(error.message || 'Failed to generate invite code', 'error');
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-plus"></i> Generate Invite Code';
      }
    });
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
    if (confirmDeleteButton) {      confirmDeleteButton.addEventListener('click', async function() {
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
              <td>${formatDate(invite.created_at)}</td>
              <td>${invite.redeemed_user ? invite.redeemed_user.display_name || invite.redeemed_user.username : '-'}</td>
              <td>${formatDate(invite.expires_at)}</td>              <td>
                <div class="action-buttons">
                  <button class="btn-icon" onclick="copyToClipboard('${invite.code}')" title="Copy">
                    <i class="fas fa-copy"></i>
                  </button>
                  ${invite.redeemed_user ? `
                    <button class="btn-icon admin-toggle ${invite.redeemed_user.has_admin_privileges ? 'active' : ''}" 
                            onclick="toggleAdminPrivilege('${invite.redeemed_user.id}', ${!invite.redeemed_user.has_admin_privileges})" 
                            title="${invite.redeemed_user.has_admin_privileges ? 'Demote from Admin' : 'Promote to Admin'}">
                      <i class="fas ${invite.redeemed_user.has_admin_privileges ? 'fa-user-minus' : 'fa-user-shield'}"></i>
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
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-light-color);">
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
async function generateNewInviteFromModal() {
  try {
    const response = await makeApiRequest('invites', 'POST', null, true);
    
    if (response && response.invite) {
      showNotification('New invite code generated successfully!', 'success');
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
  const fileList = document.getElementById('fileList');
  const fileItem = fileList?.querySelector(`[data-name="${name}"]`);
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
  selectedFiles = [...selectedFiles, ...files];
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
      // Create directory path - files go to pdfs/semester/subject/
    const dirPath = `pdfs/${semester}/${subject}`;
    
    // Upload files
    const uploadedFiles = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
      
      progressBar.style.setProperty('--progress', `${progress}%`);
      progressText.textContent = `Uploading ${file.name}... (${i + 1}/${selectedFiles.length})`;
      
      const fileFormData = new FormData();
      fileFormData.append('file', file);
      fileFormData.append('path', dirPath);
      
      const response = await fetch('/api/v1/cdn', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
        },
        body: fileFormData
      });
      
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      
      uploadedFiles.push({
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        path: result.path || `${dirPath}/${file.name}`,
        url: result.download_url || result.html_url
      });
    }
    
    // Update semester-subject mappings
    await updateSemesterSubjectMappings(semester, subject);
    
    // Update resource library
    await updateResourceLibrary(semester, subject, category, uploadedFiles);
    
    // Create notification if enabled
    if (autoPushNotify) {
      await createUploadNotification(subject, category, uploadedFiles.length);
    }
    
    showNotification('Course materials uploaded successfully!', 'success');
    
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
    showNotification(error.message || 'Failed to upload course materials', 'error');
  } finally {
    document.getElementById('courseUploadProgress').style.display = 'none';
    const uploadButton = document.getElementById('uploadCourseFiles');
    uploadButton.disabled = false;
    uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload Materials';
  }
}

// Update semester-subject mappings
async function updateSemesterSubjectMappings(semester, subject) {
  if (!semesterSubjectMappings[semester]) {
    semesterSubjectMappings[semester] = [];
  }
  
  if (!semesterSubjectMappings[semester].includes(subject)) {
    semesterSubjectMappings[semester].push(subject);
    
    // Save to GitHub
    const content = JSON.stringify(semesterSubjectMappings, null, 2);    const formData = new FormData();
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

// Update resource library
async function updateResourceLibrary(semester, subject, category, uploadedFiles) {
  try {
    // Try to load existing resource library
    let resourceLib = {};
    try {
      const response = await makeApiRequest('cdn?path=databases/beta/resource.lib.json', 'GET', null, true);
      if (response && response.download_url) {
        const libResponse = await fetch(response.download_url);
        if (libResponse.ok) {
          resourceLib = await libResponse.json();
        }
      }
    } catch (error) {
      console.log('Creating new resource library');
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
      await fetch('/api/v1/cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('materio_auth_token')}`
      },
      body: formData
    });
    
  } catch (error) {
    console.error('Failed to update resource library:', error);
  }
}

// Create upload notification
async function createUploadNotification(subject, category, fileCount) {
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