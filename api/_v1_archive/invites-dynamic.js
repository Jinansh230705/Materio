const { 
  supabase, 
  corsHeaders 
} = require('./utils');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  console.log('Dynamic invite handler - Received request for path:', event.path);
  console.log('HTTP Method:', event.httpMethod);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }

  // Only handle GET requests for invite pages
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders(origin),
      body: 'Method Not Allowed'
    };
  }

    try {
    // Extract invite code from path: /invites/ABCD1234
    const pathParts = event.path.split('/');
    const inviteCode = pathParts[pathParts.length - 1];
    
    if (!inviteCode || inviteCode === 'invites') {
      return {
        statusCode: 404,
        headers: corsHeaders(origin),
        body: 'Invite code not found'
      };
    }

    console.log('Looking up invite code:', inviteCode);
    console.log('Query parameters:', event.queryStringParameters);

    // Check for custom heading in URL parameter
    const customHeadingFromUrl = event.queryStringParameters?.heading;

    // First, check if there's a sharelink for this invite
    let sharelink = null;
    let sharelinkError = null;
    
    try {
      // Method 1: Standard Supabase API
      const result = await supabase
        .from('sharelinks')
        .select('custom_heading, invite_code')
        .eq('invite_code', inviteCode)
        .single();
        
      sharelink = result.data;
      sharelinkError = result.error;
      
      if (sharelinkError) {
        console.log('Standard sharelink lookup failed, trying direct SQL...');
        
        // Method 2: Direct SQL via RPC as fallback
        try {
          const sql = `
            SELECT custom_heading, invite_code 
            FROM sharelinks 
            WHERE invite_code = '${inviteCode}'
            LIMIT 1;
          `;
          
          const { data, error } = await supabase.rpc('execute_sql', { sql_command: sql });
          
          if (!error && data) {
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            if (parsedData && parsedData.length > 0) {
              sharelink = parsedData[0];
              sharelinkError = null;
              console.log('Direct SQL sharelink lookup succeeded:', sharelink);
            }
          } else {
            console.log('Direct SQL sharelink lookup failed:', error);
          }
        } catch (sqlError) {
          console.error('Error executing direct SQL:', sqlError);
        }
      } else {
        console.log('Standard sharelink lookup succeeded:', sharelink);
      }
    } catch (e) {
      console.error('Error during sharelink lookup:', e);
    }    // Check if the invite exists and is valid
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, code, redeemed, expires_at, created_at, contains_plus_perks')
      .ilike('code', inviteCode)
      .single();
      
    if (inviteError || !invite) {
      console.log('Invite lookup failed:', { inviteError, inviteCode });
      return {
        statusCode: 404,
        headers: corsHeaders(origin),
        body: generateErrorPage('Invite Not Found', 'This invite code does not exist or has been removed.')
      };
    }

    // Check if invite is already redeemed
    if (invite.redeemed) {
      return {
        statusCode: 410,
        headers: corsHeaders(origin),
        body: generateErrorPage('Invite Already Used', 'This invite code has already been used by another user.')
      };
    }

    // Check if invite is expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    
    if (now > expiresAt) {
      return {
        statusCode: 410,
        headers: corsHeaders(origin),
        body: generateErrorPage('Invite Expired', 'This invite code has expired and is no longer valid.')
      };
    }

    // Generate the invite page
    const defaultHeading = "You have been invited to try";
    
    // Get custom heading from sharelink or URL parameter
    let heading = defaultHeading;
    
    // Priority: 1. Sharelink record, 2. URL parameter, 3. Default
    if (sharelink?.custom_heading) {
      heading = sharelink.custom_heading;
      console.log('Using custom heading from sharelink record:', heading);
    } else if (customHeadingFromUrl) {
      heading = decodeURIComponent(customHeadingFromUrl);
      console.log('Using custom heading from URL parameter:', heading);
    }
    
    // For now, replace {name} with a generic placeholder since we don't have user context
    heading = heading.replace(/{name}/g, "friend");
    
    const invitePage = generateInvitePage({
      inviteCode: invite.code,
      heading: heading,
      isPlusInvite: invite.contains_plus_perks
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: invitePage
    };
    
  } catch (error) {
    console.error('Dynamic invite handler error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: generateErrorPage('Server Error', 'An error occurred while loading this invite.')
    };
  }
};

function generateInvitePage({ inviteCode, heading, isPlusInvite }) {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Materio Plus Onboarding</title>
  <script src="https://materioa.github.io/kit/6a787c7335.js"></script>
  <link rel="stylesheet" href="/account/css/styles.css">
  <link rel="stylesheet" href="/account/css/redesigned-styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
    rel="stylesheet">
    
<!-- Open Graph Meta Tags -->
<meta property="og:title" content="Materio Plus">
<meta property="og:description" content="Official materials you trust, in a way you love — Because e-learning shouldn't feel like suffering. Find organized, official study materials, notes, and peer help — all in one clean place." />
<meta property="og:image" itemprop="image" content="https://materioa.netlify.app/assets/img/ogp.jpeg">
<meta property="og:image:secure_url" itemprop="image" content="https://materioa.netlify.app/assets/img/ogp.jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://materioa.netlify.app">
<meta property="og:type" content="website">
  <style>
    body {
      background-image: url('/assets/img/events/invite_bg.webp');
      background-color: #ebebeb;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      background-attachment: fixed;
    }

    .invite-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }

    .invite-heading {
      font-family: 'Libre Baskerville', serif;
      font-style: italic;
      font-size: 1.82rem;
      margin-top: 50px;
      margin-bottom: 2px;
      color: var(--invite-text-color);
      text-align: center;
      max-width: 600px;
    }

    .plus-banner {
      width: 320px;
      margin: 2rem 0;
    }

    .benefits-section {
      margin: 2rem 0;
      color: var(--invite-text-color);
    }

    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      max-width: 900px;
    }

    .benefit-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 1.5rem;
      color: rgba(255, 250, 239, 0.95);
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }

    .benefit-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      background: rgba(255, 255, 255, 0.15);
    }

    .benefit-card h2 {
      color: rgba(255, 250, 239, 0.95);
      font-family: var(--font-family);
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .benefit-card h4 {
      color: rgba(255, 250, 239, 0.8);
      font-family: var(--font-family);
      font-size: 0.9rem;
      font-weight: 400;
      line-height: 1.5;
      margin: 0;
    }

    .claim-button {
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 100%);
      color: white;
      border: none;
      padding: 0.75rem 1rem 0.75rem 1.5rem;
      font-size: 1rem;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: var(--font-family);
      font-weight: 600;
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
    }

    .claim-button .arrow-circle {
      width: 28px;
      height: 28px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .claim-button .arrow-circle i {
      color: #333;
      font-size: 12px;
      transform: rotate(-45deg);
    }

    .claim-button:hover {
      transform: translateY(-2px);
      box-shadow: 0px 8px 25px rgba(255, 130, 0, 0.3);
    }

    .registration-form {
      display: none;
      min-height: 100vh;
      padding: 2rem;
      align-items: center;
      justify-content: center;
    }

    .card-one {
      max-width: 560px;
      width: 100%;
      background: rgba(50, 50, 50, 0.8);
      backdrop-filter: blur(20px);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .auth-form h2 {
      color: white;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
      text-align: center;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.9);
    }

    .form-group input[type="text"],
    .form-group input[type="email"],
    .form-group input[type="password"] {
      width: 100%;
      padding: 0.75rem;
      border-radius: var(--border-radius);
      border: 1px solid #3a3a3a;
      background: rgba(255, 255, 255, 0.08);
      color: white;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .profile-picture-input {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .profile-picture-input input[type="file"] {
      display: none;
    }

    .profile-picture-preview {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .profile-picture-preview img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border-color);
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--primary-color);
      color: var(--primary-color);
      padding: 0.5rem 1rem;
      border-radius: var(--border-radius);
      cursor: pointer;
      font-family: var(--font-family);
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }

    .btn-outline:hover {
      background: var(--primary-color);
      color: white;
    }

    .terms-agreement {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .terms-agreement input[type="checkbox"] {
      width: 18px;
      height: 18px;
      border: 2px solid #888;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      -webkit-appearance: none;
      -moz-appearance: none;
      position: relative;
      transition: all 0.3s ease;
    }

    .terms-agreement input[type="checkbox"]:checked {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .terms-agreement input[type="checkbox"]:checked::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    .terms-agreement label {
      color: #e8e4e0;
      font-size: 0.9rem;
      line-height: 1.4;
      margin: 0;
    }

    .terms-agreement a {
      color: var(--primary-color);
      text-decoration: none;
    }

    .terms-agreement a:hover {
      text-decoration: underline;
    }

    .password-input {
      position: relative;
    }

    .password-input .toggle-password {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: #aaa;
      z-index: 1;
    }

    .form-footer {
      margin-top: 1.5rem;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
    }

    .form-footer a {
      color: var(--primary-color);
      text-decoration: none;
    }

    .form-footer a:hover {
      text-decoration: underline;
    }

    .error-message {
      color: #ff5252;
      font-size: 0.85rem;
      margin-top: 0.5rem;
      display: none;
    }

    .success-message {
      color: #66bb6a;
      font-size: 0.95rem;
      margin-top: 1rem;
      padding: 0.5rem;
      background: rgba(102, 187, 106, 0.1);
      border-radius: var(--border-radius);
      text-align: center;
      display: none;
    }

    .btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border-radius: var(--border-radius);
      cursor: pointer;
      font-family: var(--font-family);
      width: 100%;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .btn:hover {
      background: var(--primary-hover);
    }

    @media (max-width: 768px) {
      .card-one {
        padding: 1.5rem;
      }

      .benefit-card {
        padding: 1.2rem;
      }

      .benefits-grid {
        grid-template-columns: 1fr;
        padding: 0 1rem;
      }

      .invite-heading {
        font-size: 1.5rem;
        margin-top: 20px;
      }

      .plus-banner {
        width: 280px;
        margin: 1.5rem 0;
      }
    }

    @media (max-width: 380px) {
      .plus-banner {
        width: 240px;
      }

      .card-one {
        padding: 1.2rem;
      }
    }
  </style>
</head>

<body>
  <!-- Initial Invite Display -->
  <div id="inviteDisplay" class="invite-container">
    <h1 class="invite-heading">${heading}</h1>
    
    <img src="/assets/img/plus_shim.svg" alt="Materio Plus" class="plus-banner">
    
    <div class="benefits-section">
      
<div class="benefits-grid">
<div class="benefit-card">
    <h2><i class="fa-solid fa-down-to-bracket"></i>  Download the PDFs</h2>
    <h4>Get to download and save PDFs for offline reading</h4>
  </div>

  <div class="benefit-card">
    <h2><i class="fa-solid fa-wand-magic-sparkles"></i>  AI Summary</h2>
    <h4>Access AI Summaries and follow ups inside insightroom posts</h4>
  </div>
  
  <div class="benefit-card">
    <h2><i class="fa-solid fa-book-open-cover"></i>  Read all resources</h2>
    <h4>Access to all posts without restrictions of visibility</h4>
  </div>
  
  <div class="benefit-card">
    <h2><i class="fa-solid fa-vial"></i>  Get latest features first.</h2>
    <h4>Be the first to try out new feature drops and UI changes</h4>
  </div>
  
  <div class="benefit-card">
    <h2><i class="fa-solid fa-gift"></i>  More Perks...</h2>
    <h4>Additional exclusive benefits. </h4>
  </div>
</div>
    </div>
    
    <button class="claim-button" onclick="showRegistrationForm()">
      Claim Invite
      <div class="arrow-circle">
        <i class="fa-solid fa-arrow-right"></i>
      </div>
    </button>
  </div>

  <!-- Registration Form (hidden initially) -->
  <div id="registrationForm" class="registration-form">
    <div class="card-one">
      <div class="auth-form">
        <h2>Complete Your Registration</h2>
        <form id="signupForm">
          <input type="hidden" id="inviteCode" name="inviteCode" value="${inviteCode}">
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" placeholder="Enter your username" required>
            <div class="error-message" id="usernameError"></div>
          </div>

          <div class="form-group">
            <label for="displayName">Display Name</label>
            <input type="text" id="displayName" name="displayName" placeholder="Enter your display name" required>
            <div class="error-message" id="displayNameError"></div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required>
            <div class="error-message" id="emailError"></div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input">
              <input type="password" id="password" name="password" placeholder="Enter your password" required>
              <i class="fas fa-eye toggle-password" data-target="password"></i>
            </div>
            <div class="error-message" id="passwordError"></div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <div class="password-input">
              <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" required>
              <i class="fas fa-eye toggle-password" data-target="confirmPassword"></i>
            </div>
            <div class="error-message" id="confirmPasswordError"></div>
          </div>

          <div class="form-group">
            <label for="profilePicture">Profile Picture</label>
            <div class="profile-picture-input">
              <input type="file" id="profilePicture" name="profilePicture" accept="image/*">
              <div class="profile-picture-preview">
                <img id="picturePreview" src="/assets/img/default-avatar.svg" alt="Profile Preview">
                <button type="button" id="uploadButton" class="btn btn-outline">Upload</button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <div class="terms-agreement">
              <input type="checkbox" id="terms" name="terms" required>
              <label for="terms">I agree to <a href="/privacy" target="_blank">privacy policy & terms</a></label>
            </div>
          </div>

          <button type="submit" class="btn">Create Account</button>
          <div class="success-message" id="successMessage">Account created successfully!</div>
          <div class="error-message" id="generalError"></div>
        </form>

        <div class="form-footer">
          <p><i class="fas fa-arrow-left"></i> <a href="#" onclick="showInviteDisplay()">Back to Invite</a></p>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Constants (same as auth.js)
    const API_URL = '/api/v1';
    const LOCAL_STORAGE_TOKEN_KEY = 'materio_auth_token';

    // API Functions (from auth.js)
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
          headers['Authorization'] = \`Bearer \${token}\`;
        }
        
        const options = {
          method,
          headers,
          credentials: 'include'
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(data);
        }
        
        const response = await fetch(\`\${API_URL}/\${endpoint}\`, options);
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.error || 'An error occurred');
        }
        
        return responseData;
      } catch (error) {
        console.error(\`API \${method} \${endpoint} Error:\`, error);
        throw error;
      }
    }
    
    function setAuthToken(token) {
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
    }
    
    // Toggle password visibility
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
      button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          this.classList.remove('fa-eye');
          this.classList.add('fa-eye-slash');
        } else {
          passwordInput.type = 'password';
          this.classList.remove('fa-eye-slash');
          this.classList.add('fa-eye');
        }
      });
    });
    
    // Profile picture preview
    const profilePictureInput = document.getElementById('profilePicture');
    const picturePreview = document.getElementById('picturePreview');
    const uploadButton = document.getElementById('uploadButton');
    
    if (uploadButton) {
      uploadButton.addEventListener('click', function() {
        profilePictureInput.click();
      });
    }
    
    if (profilePictureInput && picturePreview) {
      profilePictureInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          if (!file.type.startsWith('image/')) {
            document.getElementById('generalError').textContent = 'Please select an image file';
            document.getElementById('generalError').style.display = 'block';
            return;
          }
          
          if (file.size > 5 * 1024 * 1024) { // 5MB max
            document.getElementById('generalError').textContent = 'Image size should be less than 5MB';
            document.getElementById('generalError').style.display = 'block';
            return;
          }
          
          const reader = new FileReader();
          reader.onload = function(event) {
            picturePreview.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }
    
    // Show/hide registration form
    function showRegistrationForm() {
      document.getElementById('inviteDisplay').style.display = 'none';
      document.getElementById('registrationForm').style.display = 'flex';
    }
    
    function showInviteDisplay() {
      document.getElementById('registrationForm').style.display = 'none';
      document.getElementById('inviteDisplay').style.display = 'flex';
    }
    
    // Form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset error messages
        document.querySelectorAll('.error-message').forEach(element => {
          element.style.display = 'none';
        });
        document.getElementById('successMessage').style.display = 'none';
        
        // Get form data
        const username = document.getElementById('username').value;
        const displayName = document.getElementById('displayName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const inviteCode = document.getElementById('inviteCode').value;
        const profilePicture = document.getElementById('profilePicture').files[0];
        
        // Basic validation
        if (password !== confirmPassword) {
          document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
          document.getElementById('confirmPasswordError').style.display = 'block';
          return;
        }
        
        // Prepare form data
        const formData = {
          username,
          displayName,
          email,
          password,
          inviteCode
        };
        
        // Handle profile picture upload
        if (profilePicture) {
          const reader = new FileReader();
          reader.readAsDataURL(profilePicture);
          reader.onload = function() {
            formData.profilePicture = reader.result;
            submitForm(formData);
          };
          reader.onerror = function(error) {
            document.getElementById('generalError').textContent = 'Error reading profile picture';
            document.getElementById('generalError').style.display = 'block';
          };
        } else {
          submitForm(formData);
        }
      });
    }
    
    async function submitForm(formData) {
      try {
        // Disable the submit button to prevent double submission
        const submitButton = document.querySelector('#signupForm button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        // Make API request to create account
        const response = await makeApiRequest('signup', 'POST', formData);
        
        // Handle successful signup
        if (response && response.token) {
          setAuthToken(response.token);
          
          // Show success notification with recovery key
          let successMessage = 'Account created successfully!';
          if (response.user && response.user.recoveryKey) {
            successMessage += \` Your recovery key is: \${response.user.recoveryKey}. Please save this in a secure place.\`;
          }
          
          document.getElementById('successMessage').textContent = successMessage;
          document.getElementById('successMessage').style.display = 'block';
          
          // Redirect to profile page after a short delay
          setTimeout(() => {
            window.location.href = '/account/profile.html';
          }, 5000);
        }
      } catch (error) {
        console.error('Registration error:', error);
        document.getElementById('generalError').textContent = error.message || 'Failed to create account. Please try again.';
        document.getElementById('generalError').style.display = 'block';
        
        // Reset button state
        const submitButton = document.querySelector('#signupForm button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Create Account';
      }
    }
    
    // Apply theme based on system preference or stored preference
    function applyTheme() {
      const darkModePreference = localStorage.getItem('darkMode');
      const themeCookie = document.cookie.split('; ').find(row => row.startsWith('theme='));
      const cookieValue = themeCookie ? themeCookie.split('=')[1] : null;
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      let shouldUseDarkMode = false;

      if (darkModePreference !== null) {
        shouldUseDarkMode = darkModePreference === 'true';
      } else if (cookieValue) {
        shouldUseDarkMode = cookieValue === 'dark';
      } else {
        shouldUseDarkMode = systemPrefersDark;
      }

      if (shouldUseDarkMode) {
        document.body.classList.add('dark-mode');
        document.documentElement.style.setProperty('--invite-text-color', '#ffffff');
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.style.setProperty('--invite-text-color', '#333333');
      }
    }

    document.addEventListener('DOMContentLoaded', applyTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  </script>
</body>

</html>`;
}

function generateErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Materio</title>
  <script src="https://materioa.github.io/kit/6a787c7335.js"></script>
  <link rel="stylesheet" href="/account/css/styles.css">
  <link rel="stylesheet" href="/account/css/redesigned-styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    body {
      background-image: url('/assets/img/events/invite_bg.webp');
      background-color: #ebebeb;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      background-attachment: fixed;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-family);
    }
    
    .error-container {
      background: rgba(50, 50, 50, 0.8);
      backdrop-filter: blur(20px);
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 500px;
      width: 90%;
      color: white;
    }
    
    .error-icon {
      font-size: 4rem;
      color: #ff6b35;
      margin-bottom: 1.5rem;
    }
    
    .error-title {
      font-family: 'Libre Baskerville', serif;
      font-style: italic;
      font-size: 1.8rem;
      font-weight: 600;
      color: white;
      margin-bottom: 1.5rem;
    }
    
    .error-message {
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 2rem;
      line-height: 1.5;
      font-size: 1.1rem;
    }
    
    .home-btn {
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      box-shadow: var(--shadow);
    }
    
    .home-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0px 8px 25px rgba(255, 130, 0, 0.3);
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </div>
    <h1 class="error-title">${title}</h1>
    <p class="error-message">${message}</p>
    <a href="/" class="home-btn">
      <i class="fa-solid fa-house"></i> Return to Materio
    </a>
  </div>
  
  <script>
    // Apply theme based on system preference or stored preference
    function applyTheme() {
      const darkModePreference = localStorage.getItem('darkMode');
      const themeCookie = document.cookie.split('; ').find(row => row.startsWith('theme='));
      const cookieValue = themeCookie ? themeCookie.split('=')[1] : null;
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      let shouldUseDarkMode = false;

      if (darkModePreference !== null) {
        shouldUseDarkMode = darkModePreference === 'true';
      } else if (cookieValue) {
        shouldUseDarkMode = cookieValue === 'dark';
      } else {
        shouldUseDarkMode = systemPrefersDark;
      }

      if (shouldUseDarkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }

    document.addEventListener('DOMContentLoaded', applyTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  </script>
</body>
</html>`;
}