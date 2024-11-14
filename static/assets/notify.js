// Function to load notifications from localStorage
        function loadNotifications() {
            const storedNotifications = localStorage.getItem('notifications');
            return storedNotifications ? JSON.parse(storedNotifications) : [];
        }

        // Function to save notifications to localStorage
        function saveNotifications() {
            localStorage.setItem('notifications', JSON.stringify(notifications));
        }

        // Array of notifications loaded from localStorage
        const notifications = loadNotifications();

        // Function to format date and time
        function formatDateTime(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', { 
                dateStyle: 'medium', 
                timeStyle: 'short' 
            });
        }

        // Function to add a new notification with the current date and time
        function addNotification(title, message) {
            const date = new Date().toISOString();  // Get current date and time in ISO format
            notifications.unshift({ title, message, date }); // Add new notification at the top of the array
            saveNotifications(); // Save updated notifications to localStorage
            displayNotifications();
        }

        // Function to display notifications
        function displayNotifications() {
            const notificationBoard = document.getElementById('notificationBoard');
            notificationBoard.innerHTML = ''; // Clear the board before adding notifications

            notifications.forEach(notification => {
                const notificationElement = document.createElement('div');
                notificationElement.classList.add('notification');
                notificationElement.innerHTML = `
                    <h3>${notification.title}</h3>
                    <p>${notification.message}</p>
                    <div class="date-time">Published on: ${formatDateTime(notification.date)}</div>
                `;
                notificationBoard.appendChild(notificationElement);
            });
        }

        // Display the notifications on page load
        displayNotifications();

        // Example initial notifications
        if (notifications.length === 0) {
            addNotification("Exam Update", "The midterm exams are scheduled to begin from 15th November.");
            addNotification("Holiday Notice", "The campus will remain closed on 25th December for Christmas.");
            addNotification("Workshop Registration", "AI workshop registration is open until 10th November.");
        }