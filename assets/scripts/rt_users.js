 async function fetchRealtimeUsers() {
                    try {
                        const response = await fetch('/api/v1/getRealtimeUsers');
                        const data = await response.json();

                        const userCount = parseInt(data.users);
                        const userCountSpan = document.getElementById('user-count');
                        const card = document.getElementById('realtime-users-card');

                        if (!isNaN(userCount) && userCountSpan && card) {
                            userCountSpan.textContent = userCount;

                            const labelText = userCount === 1
                                ? ' person is reading with you'
                                : ' people are reading with you';
                            const labelSpan = document.getElementById('user-label');
                            labelSpan.textContent = labelText;
                            card.style.opacity = 1;
                        }
                    } catch (err) {
                        console.error('Error fetching realtime users:', err);
                    }
                }

                document.addEventListener('DOMContentLoaded', () => {
                    fetchRealtimeUsers();
                    setInterval(fetchRealtimeUsers, 30000);
                });