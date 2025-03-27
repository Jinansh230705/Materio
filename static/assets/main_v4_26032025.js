function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Then update your DOMContentLoaded event listener for handling tabs:
document.addEventListener("DOMContentLoaded", function () {
    // Check for an active tab in the cookies, defaulting to 'home'
    const activeTab = getCookie("activeTab") || "home";

    // Ensure all tabs are deactivated first
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");
    tabLinks.forEach(link => link.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));

    // Activate the tab stored in the cookie if it exists
    const selectedTabLink = document.querySelector(`.tab-link[data-tab="${activeTab}"]`);
    if (selectedTabLink) {
        selectedTabLink.classList.add("active");
        document.getElementById(activeTab)?.classList.add("active");
    } else {
        // Fallback to default tab (home)
        document.querySelector('.tab-link[data-tab="home"]').classList.add("active");
        document.getElementById("home").classList.add("active");
    }

    // Add a click listener on the tab links to update cookie value
    tabLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            // Deactivate all tabs
            tabLinks.forEach(tab => tab.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));
            // Activate selected tab
            this.classList.add("active");
            const tab = this.getAttribute("data-tab");
            document.getElementById(tab)?.classList.add("active");
            // Store active tab in cookie for 7 days
            setCookie("activeTab", tab, 7);
        });
    });
});
                const submitButton = document.getElementById('submitButton');
                const popup = document.getElementById('popup');
                const closePopup = document.getElementById('closePopup');

                submitButton.addEventListener('click', () => {
                    const semester = document.getElementById('semesterSelect').value;
                    const subject = document.getElementById('subjectSelect').value;
                    const categorySelect = document.getElementById('categorySelect');
                    const topic = document.getElementById('topicSelect').value;
                    if (!semester || !subject || categorySelect.selectedIndex === 0 || !topic) {
                        alert('Please select a semester, subject, category, and topic.');
                        return;
                    }
                    const pdfUrl = `https://cdn-materioa.netlify.app/pdfs/${semester}/${subject}/${topic}.pdf`;

                    document.getElementById('popupContent').innerHTML =
                        `<iframe id="pdf-iframe" style="border:none; width:100%; height:calc(100% - 17px); border-radius:10px; margin-top:22px;" 
         src="https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}"></iframe>`;

                    popup.classList.remove('closing');
                    popup.style.display = 'block';
                });
                closePopup.addEventListener('click', () => {
                    popup.classList.add('closing');
                });

                popup.addEventListener('animationend', (event) => {
                    if (event.animationName === 'popupFadeOut') {
                        popup.style.display = 'none';
                        popup.classList.remove('closing');
                    }
                });
                document.addEventListener('DOMContentLoaded', function () {
                    const tabLinks = document.querySelectorAll('.tab-link');
                    const tabContents = document.querySelectorAll('.tab-content');
                    tabLinks.forEach(link => {
                        link.addEventListener('click', function (e) {
                            e.preventDefault();
                            tabLinks.forEach(tab => tab.classList.remove('active'));
                            tabContents.forEach(content => content.classList.remove('active'));
                            this.classList.add('active');
                            const tab = this.getAttribute('data-tab');
                            document.getElementById(tab).classList.add('active');
                        });
                    });
                });

                document.addEventListener('DOMContentLoaded', function () {
                    // Fetch data from data.json and populate the dropdowns dynamically
                    fetch('https://cdn-materioa.netlify.app/databases/beta/resource.lib.json')
                        .then(response => response.json())
                        .then(data => {
                            const semesterSelect = document.getElementById('semesterSelect');

                            // Populate semester dropdown based on top-level keys (e.g. "1", "2", etc.)
                            for (let sem in data) {
                                const option = document.createElement('option');
                                option.value = sem;
                                option.textContent = "Semester " + sem;
                                semesterSelect.appendChild(option);
                            }

                            semesterSelect.addEventListener('change', function () {
                                clearSelect('subjectSelect', '--Select Subject--');
                                clearSelect('categorySelect', '--Select Category--');
                                clearSelect('topicSelect', '--Select Topic--');
                                const semKey = this.value;
                                if (!semKey) return;
                                const subjects = data[semKey];
                                const subjectSelect = document.getElementById('subjectSelect');
                                for (let subject in subjects) {
                                    const option = document.createElement('option');
                                    option.value = subject;
                                    option.textContent = subject;
                                    subjectSelect.appendChild(option);
                                }
                                subjectSelect.disabled = false;
                            });

                            document.getElementById('subjectSelect').addEventListener('change', function () {
                                clearSelect('categorySelect', '--Select Category--');
                                clearSelect('topicSelect', '--Select Topic--');
                                const semKey = document.getElementById('semesterSelect').value;
                                const subjectKey = this.value;
                                if (!subjectKey) return;
                                // The subject value is an array of category objects
                                const categoriesArr = data[semKey][subjectKey];
                                const categorySelect = document.getElementById('categorySelect');
                                if (categoriesArr && categoriesArr.length) {
                                    categoriesArr.forEach((catObj, idx) => {
                                        const option = document.createElement('option');
                                        option.value = idx; // Use index to reference the category object
                                        option.textContent = catObj.type;
                                        categorySelect.appendChild(option);
                                    });
                                    categorySelect.disabled = false;
                                }
                            });

                            document.getElementById('categorySelect').addEventListener('change', function () {
                                clearSelect('topicSelect', '--Select Topic--');
                                const semKey = document.getElementById('semesterSelect').value;
                                const subjectKey = document.getElementById('subjectSelect').value;
                                const categoryIndex = this.value;
                                if (categoryIndex === '') return;
                                const catObj = data[semKey][subjectKey][categoryIndex];
                                const topics = catObj.content;
                                const topicSelect = document.getElementById('topicSelect');
                                if (topics && topics.length > 0) {
                                    topics.forEach(topic => {
                                        const option = document.createElement('option');
                                        option.value = topic;
                                        option.textContent = topic;
                                        topicSelect.appendChild(option);
                                    });
                                    topicSelect.disabled = false;
                                }
                            });

                            function clearSelect(selectId, placeholder) {
                                const select = document.getElementById(selectId);
                                select.innerHTML = '';
                                const option = document.createElement('option');
                                option.value = '';
                                option.textContent = placeholder;
                                select.appendChild(option);
                                select.disabled = true;
                            }
                        })
                        .catch(err => console.error('Error loading data:', err));
                });

                themeToggle.addEventListener('change', function () {
                    const elements = [
                        document.body,
                        document.querySelector('header'),
                        document.querySelector('.navbar'),
                        document.querySelector('.content'),
                        document.getElementById('themeCard'),
                        document.getElementById('popup'),
                        document.getElementById('versionInfo'),
                        document.getElementById('reading'),
                        document.getElementById('notices'),
                        document.getElementById('vi')
                    ];
                    elements.forEach(el => {
                        if (this.checked) {
                            el.classList.add('dark-mode');
                        } else {
                            el.classList.remove('dark-mode');
                        }
                    });
                });
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    themeToggle.checked = true;
                    const elements = [
                        document.body,
                        document.querySelector('header'),
                        document.querySelector('.navbar'),
                        document.querySelector('.content'),
                        document.getElementById('themeCard'),
                        document.getElementById('popup'),
                        document.getElementById('versionInfo'),
                        document.getElementById('reading'),
                        document.getElementById('notices'),
                        document.getElementById('vi')
                    ];
                    elements.forEach(el => el.classList.add('dark-mode'));
                }
                document.addEventListener("DOMContentLoaded", function () {
                    const isDark = document.body.classList.contains("dark-mode") ||
                        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    const giscusScript = document.querySelector('script[src="https://giscus.app/client.js"]');
                    if (giscusScript) {
                        giscusScript.setAttribute('data-theme', isDark ? 'noborder_dark' : 'noborder_light');
                    }
                });

                const fullscreenButton = document.getElementById('fullscreenButton');

                // Toggle fullscreen mode when fullscreenButton is clicked
                fullscreenButton.addEventListener('click', () => {
                    // If not in fullscreen, request fullscreen
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().then(() => {
                            popup.classList.add('fullscreen');
                        }).catch(err => {
                            console.error(`Failed to enable fullscreen mode: ${err.message}`);
                        });
                    } else {
                        // Exit fullscreen
                        document.exitFullscreen().then(() => {
                            popup.classList.remove('fullscreen');
                        }).catch(err => {
                            console.error(`Failed to exit fullscreen mode: ${err.message}`);
                        });
                    }
                });

                submitButton.addEventListener('click', () => {
                    const semester = document.getElementById('semesterSelect').value;
                    const subject = document.getElementById('subjectSelect').value;
                    const categorySelect = document.getElementById('categorySelect');
                    const topic = document.getElementById('topicSelect').value;

                    if (!semester || !subject || categorySelect.selectedIndex === 0 || !topic) {
                        alert('Please select a semester, subject, category, and topic.');
                        return;
                    }

                    const pdfUrl = `https://cdn-materioa.netlify.app/pdfs/${semester}/${subject}/${topic}.pdf`;
                    document.getElementById('popupContent').innerHTML =
                        `<iframe id="pdf-iframe" style="border:none; width:100%; height:calc(100% - 17px); border-radius:10px; margin-top:22px;" 
      src="https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}"></iframe>`;
                    popup.classList.remove('closing');
                    popup.style.display = 'block';
                });