let notifications = [];
fetch('https://cdn-materioa.netlify.app/notifications.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        notifications = data;
        displayNotifications();
    })
    .catch(error => {
        console.error('Error loading notifications:', error);
    });
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
    });
}
function displayNotifications() {
    const notificationBoard = document.getElementById('notificationBoard');
    notificationBoard.innerHTML = '';
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (notifications.length === 0) {
        const noNotification = document.createElement('div');
        noNotification.classList.add('no-notifications');
        noNotification.textContent = "No New Notifications";
        notificationBoard.appendChild(noNotification);
        return;
    }

    notifications.forEach((notification) => {
        const container = document.createElement('div');
        container.classList.add('notification');
        const title = document.createElement('h3');
        title.textContent = notification.title;
        container.appendChild(title);
        const message = document.createElement('p');
        message.textContent = notification.message;
        container.appendChild(message);
        const date = document.createElement('span');
        date.classList.add('notification-date');
        date.textContent = formatDateTime(notification.date);
        container.appendChild(date);
        if (notification.links && notification.links.length > 0) {
            const linksContainer = document.createElement('div');
            linksContainer.classList.add('notification-links');
            notification.links.forEach(linkObj => {
                const link = document.createElement('a');
                link.href = linkObj.url;
                link.textContent = linkObj.text;
                linksContainer.appendChild(link);
            });
            container.appendChild(linksContainer);
        }
        notificationBoard.appendChild(container);
    });
}