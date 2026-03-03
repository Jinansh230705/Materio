// Enhanced code block functionality
document.addEventListener('DOMContentLoaded', function () {
  // Wrap tables in responsive containers
  document.querySelectorAll('table').forEach(function (table) {
    // Skip if already wrapped
    if (table.parentElement.classList.contains('table-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  // Process all code blocks
  document.querySelectorAll('pre code').forEach(function (codeBlock) {
    const pre = codeBlock.parentElement;
    const classList = codeBlock.className;

    let language = '';

    // Method 1: Check Rouge classes (Jekyll's default highlighter)
    // Rouge uses classes like 'language-go', 'language-javascript', etc.
    const rougeMatch = classList.match(/(?:^|\s)language-([a-zA-Z0-9-]+)(?:\s|$)/);
    if (rougeMatch) {
      language = rougeMatch[1];
    }

    // Method 2: Check highlight.js classes 
    if (!language) {
      const hlMatch = classList.match(/(?:^|\s)(?:hljs-|hljs )([a-zA-Z0-9-]+)(?:\s|$)/);
      if (hlMatch) {
        language = hlMatch[1];
      }
    }

    // Method 3: Check pre element classes (sometimes language is on pre)
    if (!language) {
      const preClasses = pre.className;
      const preMatch = preClasses.match(/(?:^|\s)language-([a-zA-Z0-9-]+)(?:\s|$)/);
      if (preMatch) {
        language = preMatch[1];
      }
    }

    // Method 4: Check data attributes
    if (!language) {
      const dataLang = codeBlock.getAttribute('data-language') || pre.getAttribute('data-language');
      if (dataLang) {
        language = dataLang;
      }
    }

    // Method 5: Parse from text content or DOM structure
    if (!language) {
      // Look for Rouge's highlight class pattern
      const highlightMatch = classList.match(/(?:^|\s)highlight(?:\s|$)/);
      if (highlightMatch) {
        // Rouge often puts the language in a parent div or data attribute
        let parent = pre.parentElement;
        while (parent && !language) {
          const parentClass = parent.className;
          const parentLangMatch = parentClass.match(/(?:^|\s)language-([a-zA-Z0-9-]+)(?:\s|$)/);
          if (parentLangMatch) {
            language = parentLangMatch[1];
            break;
          }
          parent = parent.parentElement;
        }
      }
    }

    // Method 6: Manual detection for common languages
    if (!language) {
      const codeText = codeBlock.textContent.toLowerCase();

      // Go detection
      if (codeText.includes('func ') || codeText.includes('package ') || codeText.includes(':=') || codeText.includes('os.Open')) {
        language = 'go';
      }
      // JavaScript detection
      else if (codeText.includes('function ') || codeText.includes('const ') || codeText.includes('let ') || codeText.includes('=>')) {
        language = 'javascript';
      }
      // Java detection
      else if (codeText.includes('public class') || codeText.includes('int ') || codeText.includes('System.out')) {
        language = 'java';
      }
      // Python detection
      else if (codeText.includes('def ') || codeText.includes('import ') || codeText.includes('print(')) {
        language = 'python';
      }
    }

    // Check if this is a single-line code block
    const codeText = codeBlock.textContent.trim();
    const lineCount = codeText.split('\n').length;
    const isSingleLine = lineCount <= 1;

    if (isSingleLine) {
      pre.classList.add('single-line');
    }

    // Add language label if detected
    if (language) {
      pre.classList.add('has-language');

      // Create language label element
      const langLabel = document.createElement('div');
      langLabel.className = 'code-language';
      langLabel.textContent = language.toUpperCase();
      pre.insertBefore(langLabel, codeBlock);
    }

    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> ';
    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');

    // Add click handler
    copyBtn.addEventListener('click', function () {
      const code = codeBlock.textContent;

      navigator.clipboard.writeText(code).then(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> ';
        // copyBtn.style.background = '#28a745';

        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> ';
          copyBtn.style.background = '';
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        fallbackCopyToClipboard(code, copyBtn);
      });
    });

    pre.appendChild(copyBtn);

    // Apply syntax highlighting if highlight.js is available
    if (typeof hljs !== 'undefined') {
      hljs.highlightElement(codeBlock);
    }
  });

  // Handle Code Tabs
  document.querySelectorAll('.code-tabs').forEach(function (tabGroup) {
    const panes = tabGroup.querySelectorAll('.code-tab-pane');
    const buttons = tabGroup.querySelectorAll('.code-tab-btn');

    // Initialization: Ensure active tab is showing
    const activeBtn = tabGroup.querySelector('.code-tab-btn.active');
    if (activeBtn) {
      const targetId = activeBtn.getAttribute('data-tab');
      panes.forEach(pane => {
        if (pane.getAttribute('data-pane') === targetId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const targetId = btn.getAttribute('data-tab');

        // Update buttons
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update panes
        panes.forEach(pane => {
          if (pane.getAttribute('data-pane') === targetId) {
            pane.classList.add('active');
          } else {
            pane.classList.remove('active');
          }
        });
      });
    });
  });
});

// Fallback copy function for older browsers
function fallbackCopyToClipboard(text, button) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      button.innerHTML = ' ';
      button.style.background = '#28a745';

      setTimeout(() => {
        button.innerHTML = '<i class="fa-regular fa-copy"></i> ';
        button.style.background = '';
      }, 2000);
    }
  } catch (err) {

    button.innerHTML = 'Could not copy';

    setTimeout(() => {
      button.innerHTML = '<i class="fa-regular fa-copy"></i> ';
    }, 2000);
  }

  document.body.removeChild(textArea);
}

// Initialize Mermaid with theme support
document.addEventListener("DOMContentLoaded", function () {
  // Check current theme for Mermaid
  function getMermaidTheme() {
    const isDark = document.body.classList.contains('dark') ||
      (!getCookie("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches) ||
      getCookie("theme") === "dark";
    return isDark ? 'dark' : 'default';
  }

  // Initialize Mermaid
  mermaid.initialize({
    startOnLoad: true,
    theme: getMermaidTheme(),
    themeVariables: {
      primaryColor: '#3ea6ff',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#ff8200',
      lineColor: '#ff8200',
      secondaryColor: '#1e1e1e',
      tertiaryColor: '#333333'
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true
    },
    securityLevel: 'loose'
  });

  // Process Mermaid code blocks
  document.querySelectorAll('pre code.language-mermaid, pre code[class*="mermaid"]').forEach(function (element) {
    const pre = element.parentElement;
    const mermaidCode = element.textContent;

    // Create new div for mermaid
    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid-diagram';
    mermaidDiv.textContent = mermaidCode;

    // Replace the pre element with mermaid div
    pre.parentNode.replaceChild(mermaidDiv, pre);
  });

  // Re-render mermaid when theme changes
  window.addEventListener('themeChanged', function () {
    mermaid.initialize({
      startOnLoad: true,
      theme: getMermaidTheme(),
      themeVariables: {
        primaryColor: '#3ea6ff',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#ff8200',
        lineColor: '#ff8200',
        secondaryColor: '#1e1e1e',
        tertiaryColor: '#333333'
      }
    });
    mermaid.init(undefined, document.querySelectorAll('.mermaid-diagram'));
  });

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
  }
});

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

    // Update highlight.js theme
    updateHighlightTheme(isDark);

    // Dispatch theme change event for Mermaid
    window.dispatchEvent(new CustomEvent('themeChanged'));
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

  // Initialize theme
  let userTheme = getCookie("theme");
  if (userTheme === "dark") {
    applyTheme(true);
  } else if (userTheme === "light") {
    applyTheme(false);
  } else {
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(systemPrefersDark);
  }

  // Listen for system theme changes when using system mode
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change', function (e) {
    if (getCookie("theme") === "system") {
      applyTheme(e.matches);
    }
  });
});

// Highlight.js theme switching
function updateHighlightTheme(isDark) {
  const highlightTheme = document.getElementById('highlight-theme');
  if (highlightTheme) {
    if (isDark) {
      highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css';
    } else {
      highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
    }
  }
}

// Print enhancement - First page only header with QR code and logo
document.addEventListener("DOMContentLoaded", function () {
  // Generate print elements when printing
  window.addEventListener('beforeprint', function () {
    console.log('beforeprint event triggered');
    generatePrintElements();
  });

  function generatePrintElements() {
    console.log('generatePrintElements called');
    // Remove existing print elements
    const existingElements = document.querySelectorAll('.print-only-element');
    existingElements.forEach(el => el.remove());

    // Only add to post pages (check if we have a post container)
    const postContainer = document.querySelector('.post-container');
    if (!postContainer) {
      console.log('No post container found');
      return;
    }

    console.log('Creating print elements...');

    // Debug: Check if elements will be visible
    console.log('Post container found:', postContainer);
    console.log('Hidden QR found:', document.getElementById('hidden-qr-code'));

    // Create print-only container that appears before content
    const printContainer = document.createElement('div');
    printContainer.className = 'print-only-element print-page-header';
    printContainer.style.cssText = `
          display: none;
          width: 100%;
          height: 120px; /* increased height so header contents aren't clipped */
          margin-bottom: 10px;
          position: relative;
          border-bottom: 1px solid #ddd;
          padding-top: 8px; /* ensure content doesn't touch page margin */
          padding-bottom: 8px;
        `;

    // Logo on the left (use printable header SVG for print outputs)
    const logoDiv = document.createElement('div');
    // Move logo slightly further down so it aligns with the QR title and code
    // Additional 4px downward adjustment requested
    logoDiv.style.cssText = 'position: absolute; left: 0; top: 33px;';
    logoDiv.innerHTML = '<img src="/assets/printables/header.svg" alt="Materio" style="height: 32px; width: auto;">';

    // QR section on the right - just placeholder for print
    const qrSection = document.createElement('div');
    // Move QR so its top aligns with the logo on the left
    // Use flex column so the title remains visible above the QR image
    // Move QR down by 4px for better alignment with the logo
    qrSection.style.cssText = 'position: absolute; right: 0; top: -3px; text-align: center; display: flex; flex-direction: column; align-items: center;';

    // QR title
    const qrTitle = document.createElement('div');
    // Keep title above the QR by default; no relative vertical offset so flex controls spacing
    qrTitle.style.cssText = 'font-family: "Libre Baskerville", serif; font-size: 9px; color: #666; margin: 0 0 6px 0; z-index: 2;';
    qrTitle.textContent = 'Scan to read online';

    // QR container - will use the pre-generated one
    const qrContainer = document.createElement('div');
    qrContainer.id = 'print-qr-display';
    qrContainer.style.cssText = 'width: 90px; height: 90px; margin-top: 0; z-index: 1;';

    // Append title then QR
    qrSection.appendChild(qrTitle);
    qrSection.appendChild(qrContainer);

    // After insertion we may need to adjust if title is still outside printable area
    function adjustQrTitlePlacement() {
      try {
        const printRect = printContainer.getBoundingClientRect();
        const titleRect = qrTitle.getBoundingClientRect();
        // If the title's top is above the printable area's top (clipped), move the title below the QR
        if (titleRect.top < printRect.top + 4) {
          // move title below the QR
          qrSection.removeChild(qrTitle);
          qrSection.appendChild(qrTitle);
        }
      } catch (err) {
        // ignore measurement errors
      }
    }

    // Copy the pre-generated QR code from the hidden element
    const hiddenQR = document.getElementById('hidden-qr-code');
    console.log('Hidden QR element:', hiddenQR);
    console.log('Hidden QR has child:', hiddenQR && hiddenQR.firstChild);

    if (hiddenQR && hiddenQR.firstChild) {
      qrContainer.appendChild(hiddenQR.firstChild.cloneNode(true));
      console.log('QR code cloned successfully');
    } else {
      qrContainer.innerHTML = '<div style="font-size: 5px; word-break: break-all; text-align: center;">' + window.location.href + '</div>';
      console.log('Using fallback QR (text URL)');
    }

    printContainer.appendChild(logoDiv);
    printContainer.appendChild(qrSection);

    // Insert at the very beginning of post container
    postContainer.insertBefore(printContainer, postContainer.firstChild);
    console.log('Print container inserted into DOM');
    console.log('Print container element:', printContainer);

    // Give browser a moment to layout, then adjust QR title placement if needed
    setTimeout(adjustQrTitlePlacement, 40);

    // Add print styles
    addPrintStyles();
    console.log('Print elements created successfully');

    // Verify the element is actually in the DOM
    const inserted = document.querySelector('.print-page-header');
    console.log('Verification - print header in DOM:', inserted);
  }

  // Make generatePrintElements globally accessible for manual triggering
  window.generatePrintElements = generatePrintElements;

  function addPrintStyles() {
    // Remove existing print style
    const existingStyle = document.getElementById('print-element-style');
    if (existingStyle) existingStyle.remove();

    // Add new print style
    const printStyle = document.createElement('style');
    printStyle.id = 'print-element-style';
    printStyle.textContent = `
          @media print {
            .print-page-header {
              display: block !important;
            }
            
            /* Hide share and print icons in print view */
            .fa-share, .fa-print {
              display: none !important;
            }
            
            /* Reduce top margins significantly for first page, normal for others */
            @page :first {
              margin-top: 0.5in;
            }
            
            @page {
              margin-top: 0.75in;
            }
          }
          
          /* Hide in normal view */
          @media screen {
            .print-only-element {
              display: none !important;
            }
          }
        `;
    document.head.appendChild(printStyle);
    console.log('Print styles added to document head');
    console.log('Print style element:', printStyle);
  }

  // Clean up after printing
  window.addEventListener('afterprint', function () {
    const printElements = document.querySelectorAll('.print-only-element');
    printElements.forEach(el => el.remove());

    const printStyle = document.getElementById('print-element-style');
    if (printStyle) printStyle.remove();
  });

});


// QR Code pre-generation for posts (hidden, for print use)
document.addEventListener("DOMContentLoaded", function () {
  // Only generate QR for post pages
  const postContainer = document.querySelector('.post-container');
  if (!postContainer) return;

  // Create hidden QR code container
  const hiddenQRContainer = document.createElement('div');
  hiddenQRContainer.id = 'hidden-qr-code';
  hiddenQRContainer.style.cssText = 'position: absolute; left: -9999px; top: -9999px; visibility: hidden;';
  document.body.appendChild(hiddenQRContainer);

  // Generate QR code when page loads
  generateHiddenQRCode();

  function generateHiddenQRCode() {
    try {
      // Use Google Charts QR Code API - more reliable
      const qrSize = 90;
      const currentUrl = encodeURIComponent(window.location.href);
      const qrApiUrl = `https://chart.googleapis.com/chart?chs=${qrSize}x${qrSize}&cht=qr&chl=${currentUrl}&choe=UTF-8`;

      // Create img element for QR code
      const qrImg = document.createElement('img');
      qrImg.src = qrApiUrl;
      qrImg.style.cssText = 'width: 90px; height: 90px; display: block;';
      qrImg.alt = 'QR Code for ' + window.location.href;

      // Add to hidden container when loaded
      qrImg.onload = function () {

        hiddenQRContainer.appendChild(qrImg);
      };

      qrImg.onerror = function () {

        // Fallback to qr-server.com API
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${currentUrl}`;
        const fallbackImg = document.createElement('img');
        fallbackImg.src = fallbackUrl;
        fallbackImg.style.cssText = 'width: 90px; height: 90px; display: block;';
        fallbackImg.alt = 'QR Code for ' + window.location.href;

        fallbackImg.onload = function () {

          hiddenQRContainer.appendChild(fallbackImg);
        };

        fallbackImg.onerror = function () {

        };
      };

    } catch (error) {

    }
  }
});

document.addEventListener('keydown', function (e) {
  const key = e.key.toLowerCase();
  const isBlockedCombo =
    key === 'f12' ||
    (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
    (e.ctrlKey && ['u'].includes(key));

  if (isBlockedCombo) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, true);

document.addEventListener('contextmenu', function (e) {
  const target = e.target;
  if (
    target.tagName !== 'INPUT' &&
    target.tagName !== 'TEXTAREA' &&
    !target.isContentEditable
  ) {
    e.preventDefault();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const blockIfNotInput = (e) => {
    const tag = e.target.tagName;
    const editable = e.target.isContentEditable;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !editable) {
      e.preventDefault();
    }
  };

  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.mozUserSelect = 'none';
  document.body.style.msUserSelect = 'none';
  document.body.style.webkitTouchCallout = 'none';
  document.body.style.webkitUserDrag = 'none';

  document.addEventListener('selectstart', blockIfNotInput);
  document.addEventListener('dragstart', blockIfNotInput);
  document.addEventListener('mouseup', function (e) {
    if (
      e.target.tagName !== 'INPUT' &&
      e.target.tagName !== 'TEXTAREA' &&
      !e.target.isContentEditable
    ) {
      window.getSelection().removeAllRanges();
    }
  });
});
