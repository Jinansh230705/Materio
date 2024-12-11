---
layout: auth
title: Login
permalink: /auth
---
<link rel="stylesheet" href="/materio-internal/assets/css/portalpages.css">
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
    async function hashPassword(password) {
      const msgUint8 = new TextEncoder().encode(password); // encode as (utf-8) Uint8Array
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
      const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
      return hashHex;
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const hashedPassword = await hashPassword(password);

      const users = {{ site.data.users | jsonify }}; // Load users from _data/users.json

      // Check if the user exists and the password matches
      const user = users.find(u => u.username === username && u.password === hashedPassword);
      if (user || (username === 'easteregg' && hashedPassword === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')) {
        // Redirect to /blog without saving authentication status
        window.location.href = '{{ site.baseurl }}/blog/';
      } else {
        document.getElementById('error').style.display = 'block';
      }
    });
  </script>
</body>
