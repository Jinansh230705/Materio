---
#
# By default, content added below the "---" mark will appear in the home page
# between the top bar and the list of recent posts.
# To change the home page layout, edit the _layouts/home.html file.
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
#
layout: home
permalink: /blog/
---
<script>
    (function () {
    const authToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!authToken) {
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
        window.location.href = "/auth";
    } else {
        injectLogoutButton();
    }

    function injectLogoutButton() {
        const footer = document.querySelector("footer") || document.body;

        const logoutButton = document.createElement("button");
        logoutButton.textContent = "Logout";
        logoutButton.style.cssText = `
            font-family: "Fira Sans", sans-serif;
            font-weight: bold;
            position: fixed; 
            bottom: 10px; 
            right: 10px; 
            padding: 10px 15px; 
            background: #cbbceb; 
            color: #171717; 
            border: none; 
            cursor: pointer; 
            border-radius: 5px;
        `;

        logoutButton.addEventListener("click", function () {
            localStorage.removeItem("authToken");
            sessionStorage.removeItem("authToken");
            window.location.href = "/auth";
        });

        footer.appendChild(logoutButton);
    }
})();
</script>