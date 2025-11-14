document.addEventListener('DOMContentLoaded', function() {
  const inviteForm = document.getElementById('inviteForm');
  const signupForm = document.getElementById('signupForm');
  const inviteStep = document.getElementById('inviteStep');
  const signupStep = document.getElementById('signupStep');
  const profilePictureInput = document.getElementById('profilePicture');
  const picturePreview = document.getElementById('picturePreview');
  const uploadButton = document.getElementById('uploadButton');
    let validatedInviteCode = null;

  // Step 1: Handle invite code validation
  if (inviteForm) {
    inviteForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const inviteCode = document.getElementById('inviteCodeInput').value.trim();
      
      if (!inviteCode) {
        showNotification('Please enter an invite code', 'error');
        return;
      }      try {
        // Validate invite code with the server
        const response = await fetch('/api/v1/invites/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inviteCode })
        });

        const data = await response.json();if (response.ok && data.valid) {
          // Store the validated invite code
          validatedInviteCode = inviteCode;
          
          // Hide invite step and show signup step
          inviteStep.style.display = 'none';
          signupStep.style.display = 'block';
          
          showNotification(data.message || 'Invite code validated! Complete your registration.', 'success');
          
          // Set up reservation timeout warning
          if (data.reservedUntil) {
            const reservationTime = new Date(data.reservedUntil);
            const timeUntilExpiry = reservationTime.getTime() - Date.now();
            
            // Warn user 1 minute before expiry
            if (timeUntilExpiry > 60000) {
              setTimeout(() => {
                showNotification('Your invite code reservation expires in 1 minute. Please complete registration soon.', 'warning');
              }, timeUntilExpiry - 60000);
            }
          }
        } else {
          showNotification(data.message || 'Invalid or used invite code', 'error');
        }
      } catch (error) {
        console.error('Error validating invite code:', error);
        showNotification('Error validating invite code. Please try again.', 'error');
      }
    });
  }

  // Handle file input for profile picture
  if (profilePictureInput && picturePreview) {
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
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Trigger file selection when the upload button is clicked
    if (uploadButton) {
      uploadButton.addEventListener('click', function() {
        profilePictureInput.click();
      });
    }
  }

  // Step 2: Handle main signup form
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!validatedInviteCode) {
        showNotification('Please validate your invite code first', 'error');
        return;
      }
      
      const username = document.getElementById('username').value.trim();
      const displayName = document.getElementById('displayName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const termsAgreed = document.getElementById('terms').checked;
      
      // Basic validation
      if (!username || !displayName || !email || !password) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }
      
      if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
      }
      
      if (password.length < 8) {
        showNotification('Password must be at least 8 characters long', 'error');
        return;
      }
      
      if (!termsAgreed) {
        showNotification('Please agree to the terms and conditions', 'error');
        return;
      }
      
      try {
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'SIGNING UP...';        
        // Prepare data for API request
        const signupData = {
          inviteCode: validatedInviteCode,
          username,
          displayName,
          email,
          password
        };
        
        // Add profile picture if uploaded
        if (picturePreview && picturePreview.src && !picturePreview.src.includes('default-avatar.svg')) {
          signupData.profilePicture = picturePreview.src;
        }
        
        // Make signup API request
        const response = await makeApiRequest('signup', 'POST', signupData);        // Handle successful signup
        if (response && response.token) {
          setAuthToken(response.token);
          
          // Show success notification with recovery key and plus benefits
          let successMessage = response.message || 'Account created successfully!';
          
          if (response.user && response.user.grantedPlusFromInvite) {
            successMessage += ' 🌟 You have been granted Plus benefits from your invite code!';
          }
          
          if (response.user && response.user.recoveryKey) {
            successMessage += ` Your recovery key is: ${response.user.recoveryKey}. Please save this in a secure place.`;
          }
          
          showNotification(successMessage, 'success');
          
          // Redirect to profile page after a short delay
          setTimeout(() => {
            redirectToProfile();
          }, 5000);  // Longer delay so user can see the recovery key
        }
      } catch (error) {
        console.error('Signup error:', error);
        showNotification(error.message || 'Failed to create account. Please try again.', 'error');
        
        // Reset button state
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'SIGN UP';
      }
    });
  }
  // Enable social signup buttons if needed (currently just UI placeholders)
  const socialButtons = document.querySelectorAll('.btn-social');
  socialButtons.forEach(button => {
    button.addEventListener('click', function() {
      showNotification('Social signup is not available at this time', 'info');
    });
  });
});


document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("code");
    if (inviteCode) {
        document.getElementById("inviteCodeInput").value = inviteCode;
    }
});


