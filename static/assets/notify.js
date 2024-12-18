     const notifications = [
        { 
               title: "Materio V3 is Out", 
               message: "Materio V3 is live! Now based on Jekyll checkout the Release Notes from Settings tab for more details.", 
               date: "2024-12-12T20:30:00", 
               links: []
           },
   
           { 
               title: "Materials Updated", 
               message: "Few Materials have been added/updated in the PSNM ,OS, PPFSD and PGPD.", 
               date: "2024-12-18T18:34:00", 
               links: [] 
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