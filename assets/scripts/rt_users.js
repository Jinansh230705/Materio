    async function fetchRealtimeUsers() {
        try {
            // Use the new features endpoint for insights
            const response = await fetch('/api/v2/features/insights');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            // Update the user count display
            const userCountElement = document.getElementById('realtime-user-count');
            if (userCountElement) {
                userCountElement.textContent = data.users || '0';
                userCountElement.classList.add('updated');
                setTimeout(() => userCountElement.classList.remove('updated'), 1000);
            }
        } catch (error) {
            console.error('Error fetching realtime users:', error);
        }
    }                document.addEventListener('DOMContentLoaded', () => {
                    fetchRealtimeUsers();
                    setInterval(fetchRealtimeUsers, 30000);
                });