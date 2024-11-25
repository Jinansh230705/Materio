 // Notifications logic
      // Array of notifications with date and time manually added
     // Array of notifications with support for multiple links
     const notifications = [
        { 
               title: "DBMS Exam", 
               message: " DBMS Materials Can be accessed on PULMS under classroom section", 
               date: "2024-11-09T15:24:00", 
               links: [
                   { url: "elearning.paruluniversity.ac.in", label: "PULMS" }
               ]
           },
   
           { 
               title: "Useful Links", 
               message: "Other useful links (Gdrive)", 
               date: "2024-11-11T14:00:00", 
               links: [{url: "https://drive.google.com/drive/folders/1MJg9XOitcisGjBh9HLSySVTX7ZiyUesb?usp=drive_link", label:"Link 1"}, {url:"https://drive.google.com/drive/folders/15cKyJQY2zo9bob-lmM5WfOiftq0g1lML?usp=drive_link", label:"Link 2"}] 
           }
           
          
       ];
   
       // Function to format date and time
       function formatDateTime(dateString) {
           const date = new Date(dateString);
           return date.toLocaleString('en-US', { 
               dateStyle: 'medium', 
               timeStyle: 'short' 
           });
       }
   
       // Function to display notifications
       function displayNotifications() {
           const notificationBoard = document.getElementById('notificationBoard');
           notificationBoard.innerHTML = ''; // Clear the board before adding notifications
   
           // Iterate over notifications and add the newest first
           notifications.forEach(notification => {
               const notificationElement = document.createElement('div');
               notificationElement.classList.add('notification');
               
               // Generate links dynamically if any are provided
               const linksHTML = notification.links.length > 0 
                   ? notification.links.map(link => `<a href="${link.url}" target="_blank" style="color: #3498db; text-decoration: none; font-weight: bold; display: block; margin-top: 5px;">${link.label || link.url}</a>`).join("")
                   : "";
   
               notificationElement.innerHTML = `
                   <h3>${notification.title}</h3>
                   <p>${notification.message}</p>
                   <div class="date-time">Published on: ${formatDateTime(notification.date)}</div>
                   ${linksHTML}
               `;
               
               notificationBoard.appendChild(notificationElement);
           });
       }
   
       // Display notifications on page load
       displayNotifications();
   
       // Function to add a new notification with multiple links
       function addNotification(title, message, date, links = []) {
           notifications.unshift({ title, message, date, links });
           displayNotifications(); // Refresh the notifications display
       }