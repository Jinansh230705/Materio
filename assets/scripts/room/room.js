 document.addEventListener("DOMContentLoaded", function () {
      function setCookie(name, value, days) {
        let expires = "";
        if (days) {
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; path=/";
      }

      function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(";");
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i].trim();
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return null;
      }

      function applyTheme(isDark) {
        const elements = [
          document.body,
          document.querySelector('header'),
          document.querySelector('.site-header')
        ];

        elements.forEach(el => {
          if (el) {
            if (isDark) {
              el.classList.add('dark');
              el.classList.add('dark-mode');
            } else {
              el.classList.remove('dark');
              el.classList.remove('dark-mode');
            }
          }
        });
        
        // Dispatch theme change event for Mermaid
        window.dispatchEvent(new CustomEvent('themeChanged'));
      }

      // Initialize theme
      let userTheme = getCookie("theme");
      if (userTheme === "dark") {
        applyTheme(true);
      } else if (userTheme === "light") {
        applyTheme(false);
      } else if (userTheme === "system") {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(systemPrefersDark);
      } else {
        // Default to system preference if no theme is set
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(systemPrefersDark);
      }

      // Global function for footer theme buttons
      window.setTheme = function (theme) {
        if (theme === 'dark') {
          setCookie("theme", "dark", 30);
          applyTheme(true);
        } else if (theme === 'light') {
          setCookie("theme", "light", 30);
          applyTheme(false);
        } else if (theme === 'system') {
          setCookie("theme", "system", 30);
          const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          applyTheme(systemPrefersDark);
        }
      };

      // Listen for system theme changes when using system mode
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change', function (e) {
        if (getCookie("theme") === "system") {
          applyTheme(e.matches);
        }
      });
    });