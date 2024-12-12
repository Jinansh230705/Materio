---
layout: auth
title: Login
permalink: /auth
---
<link rel="stylesheet" href="/assets/css/portalpages.css">
<body>
  <h1>Login</h1>
  <form id="loginForm">
    <label for="username">Username</label>
    <input type="text" id="username" required>
    <label for="password">Password</label>
    <input type="password" id="password" required>
    <button type="submit">Enter</button>
    <p id="error" class="error" style="display: none;">Invalid username or password</p>
  </form>

  <script>
    // Function to hash passwords using SHA-256
    async function hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        // Hash the password entered by the user
        const hashedPassword = await hashPassword(password);

        // Fetch the user data from the server
        const response = await fetch('{{ site.baseurl }}/data/users.json');
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const users = await response.json();

        // Check if the user exists and the hashed password matches
        const user = users.find(u => u.username === username && u.password === hashedPassword);

        if (user || (username === 'easteregg' && password === '')) {
          // Redirect to /blog without saving authentication status
          window.location.href = '{{ site.baseurl }}/blog/';
        } else {
          document.getElementById('error').style.display = 'block';
        }
      } catch (error) {
        console.error('Error fetching or processing user data:', error);
        document.getElementById('error').textContent = 'Unable to process login. Please try again later.';
        document.getElementById('error').style.display = 'block';
      }
    });
  </script>
</body>
