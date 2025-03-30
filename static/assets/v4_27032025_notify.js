document.addEventListener('DOMContentLoaded', () => {
  let globalNotifications = [];

  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function generateFakeNotifications(count = 5) {
    const fakeNotifications = [];
    for (let i = 0; i < count; i++) {
      fakeNotifications.push({
        date: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 5)).toISOString(), 
        title: `Test Notification ${i + 1}`,
        message: `This is a fake notification created for testing (notification ${i + 1}).`,
        links: []
      });
    }
    return fakeNotifications;
  }

  if (!window.devMode) {
    fetch('https://cdn-materioa.netlify.app/notifications.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(notifications => {
        globalNotifications = notifications; 
        displayNotifications(notifications);
        updateNotificationBadge(notifications);
      })
      .catch(error => console.error('Error loading notifications:', error));
  } else {

    globalNotifications = generateFakeNotifications();
    displayNotifications(globalNotifications);
    updateNotificationBadge(globalNotifications);
  }

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  }

  function displayNotifications(notifications) {
    const container = document.getElementById('notificationBoard');
    if (!container) return;
    container.innerHTML = '';

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 20);

    const validNotifications = notifications
        .filter(n => new Date(n.date) >= cutoff)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (validNotifications.length === 0) {
        const card = document.createElement('div');
        card.classList.add('card-layout');
        card.id = 'notify';
        card.textContent = "No New Notifications";

        if (document.body.classList.contains('dark-mode')) {
            card.classList.add('dark-mode');
        }

        container.appendChild(card);
        return;
    }

    validNotifications.forEach(notification => {
        const card = document.createElement('div');
        card.classList.add('card-layout');
        card.id = 'notify';

        const title = document.createElement('h3');
        title.textContent = notification.title;
        card.appendChild(title);

        const message = document.createElement('p');
        message.textContent = notification.message;
        card.appendChild(message);

        const dateElem = document.createElement('span');
        dateElem.classList.add('notification-date');
        dateElem.textContent = formatDateTime(notification.date);
        card.appendChild(dateElem);

        if (notification.links && notification.links.length > 0) {
            const linksContainer = document.createElement('div');
            linksContainer.classList.add('notification-links');
            notification.links.forEach(linkObj => {
                const link = document.createElement('a');
                link.href = linkObj.url;
                link.textContent = linkObj.text;
                linksContainer.appendChild(link);
            });
            card.appendChild(linksContainer);
        }

        if (document.body.classList.contains('dark-mode')) {
            card.classList.add('dark-mode');
        }

        container.appendChild(card);
    });
}


  function updateNotificationBadge(notifications) {

    const lastSeenCookie = getCookie("lastSeenNotification");
    const lastSeen = lastSeenCookie ? new Date(lastSeenCookie) : null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 20);

    const newCount = notifications
      .filter(n => new Date(n.date) >= cutoff)
      .filter(n => !lastSeen || new Date(n.date) > lastSeen)
      .length;

    const bellLink = document.querySelector('.tab-link[data-tab="notifications"]');
    if (!bellLink) return;

    const oldBadge = bellLink.querySelector('.notification-badge');
    if (oldBadge) {
      oldBadge.remove();
    }

    if (newCount > 0) {

      const badge = document.createElement('span');
      badge.classList.add('notification-badge');
      badge.textContent = newCount;

      badge.style.backgroundColor = '#ff8400';
      badge.style.color = '#fff';
      badge.style.borderRadius = '50%';
      badge.style.padding = '2px 6px';
      badge.style.fontSize = '12px';
      badge.style.position = 'absolute';
      badge.style.top = '5px';
      badge.style.right = '5px';
      badge.style.zIndex = '1';
      bellLink.style.position = 'relative';
      bellLink.appendChild(badge);
    }
  }

  document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', function(e) {
      const tab = this.getAttribute('data-tab');
      if (tab === 'notifications') {
        if (!window.devMode) {

          setCookie("lastSeenNotification", new Date().toISOString(), 7);

          const bellLink = document.querySelector('.tab-link[data-tab="notifications"]');
          const badge = bellLink ? bellLink.querySelector('.notification-badge') : null;
          if (badge) {
            badge.remove();
          }
        } else {
          console.log("Dev mode active: badge remains visible");
        }
      }
    });
  });

  window.test = function() {
    window.devMode = true;
    console.log("Dev mode enabled for notifications. Badge removal is disabled.");
    setCookie("lastSeenNotification", "", -1);
    globalNotifications = generateFakeNotifications();
    displayNotifications(globalNotifications);
    updateNotificationBadge(globalNotifications);
  };

  window.generate = function(count) {
    if (!window.devMode) {
      console.log("Activate dev mode first by typing test();");
      return;
    }
    globalNotifications = generateFakeNotifications(count);
    displayNotifications(globalNotifications);
    updateNotificationBadge(globalNotifications);
  };

});