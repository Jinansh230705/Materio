
  // --- GA4 Event Wrapper ---
  function sendGAEvent(eventName, method, label) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        method: method,
        event_category: 'engagement',
        event_label: label
      });
    }
  }

  // --- Monkey-patch sharePost ---
  if (typeof sharePost === 'function') {
    const originalSharePost = sharePost;
    window.sharePost = function (...args) {
      sendGAEvent('share', 'button', 'Share Post');
      return originalSharePost.apply(this, args);
    };
  }

  // --- Monkey-patch printPost ---
  if (typeof printPost === 'function') {
    const originalPrintPost = printPost;
    window.printPost = function (...args) {
      sendGAEvent('printables_made', 'button', 'Print Post');
      return originalPrintPost.apply(this, args);
    };
  }

  // --- Listen for Ctrl+P or Cmd+P ---
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      sendGAEvent('printables_made', 'keypress', 'Keyboard Print');
    }
  });

