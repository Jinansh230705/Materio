document.addEventListener('DOMContentLoaded', function() {
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const passwordResetDiv = document.getElementById('passwordReset');
  const confirmPasswordResetDiv = document.getElementById('confirmPasswordReset');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
  
  let recoveryVerified = false;
  
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const recoveryKey = document.getElementById('recoveryKey').value.trim();
      
      // Basic validation
      if (!email || !recoveryKey) {
        showNotification('Please enter your email and recovery key', 'error');
        return;
      }
      
      try {
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        
        if (!recoveryVerified) {
          submitButton.textContent = 'VERIFYING...';
          
          // Step 1: Verify recovery key
          const verifyResponse = await makeApiRequest('auth?action=forgot-password', 'POST', {
            email,
            recoveryKey
          });
          
          if (verifyResponse && verifyResponse.verified) {
            // Recovery key is valid, show password reset fields
            recoveryVerified = true;
            passwordResetDiv.classList.remove('hidden');
            confirmPasswordResetDiv.classList.remove('hidden');
            submitButton.textContent = 'RESET PASSWORD';
            submitButton.disabled = false;
            
            showNotification('Recovery key verified! Please enter your new password.', 'success');
          }
        } else {
          // Step 2: Reset password
          const newPassword = newPasswordInput.value;
          const confirmNewPassword = confirmNewPasswordInput.value;
          
          // Validate new password
          if (!newPassword || !confirmNewPassword) {
            showNotification('Please enter and confirm your new password', 'error');
            submitButton.disabled = false;
            return;
          }
          
          if (newPassword !== confirmNewPassword) {
            showNotification('Passwords do not match', 'error');
            submitButton.disabled = false;
            return;
          }
          
          if (newPassword.length < 8) {
            showNotification('Password must be at least 8 characters long', 'error');
            submitButton.disabled = false;
            return;
          }
          
          submitButton.textContent = 'RESETTING...';
          
          // Make password reset API request
          const resetResponse = await makeApiRequest('auth?action=forgot-password', 'POST', {
            email,
            recoveryKey,
            newPassword
          });
          
          // Handle successful password reset
          if (resetResponse && resetResponse.token) {
            setAuthToken(resetResponse.token);
            
            showNotification('Password reset successfully!', 'success');
            
            // Redirect to profile page after a short delay
            setTimeout(() => {
              redirectToProfile();
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Password reset error:', error);
        showNotification(error.message || 'Failed to reset password. Please check your email and recovery key.', 'error');
        
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  }
});
