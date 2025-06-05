function closePromoModal() {
                    const modal = document.getElementById('promoModal');
                    modal.style.display = 'none';
                }

                document.addEventListener('DOMContentLoaded', function () {
                    var year = new Date().getFullYear();
                    var creatorInfo = document.getElementById('creatorInfo');
                    if (creatorInfo) {
                        var p = creatorInfo.querySelector('p');
                        if (p) {
                            p.innerHTML = '&copy; ' + year + ' - Materio';
                        }
                    }
                });
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
                document.addEventListener("DOMContentLoaded", function () {
                    const activeTab = getCookie("activeTab") || "home";
                    const tabLinks = document.querySelectorAll(".tab-link");
                    const tabContents = document.querySelectorAll(".tab-content");
                    tabLinks.forEach(link => link.classList.remove("active"));
                    tabContents.forEach(content => content.classList.remove("active"));

                    const selectedTabLink = document.querySelector(`.tab-link[data-tab="${activeTab}"]`);
                    if (selectedTabLink) {
                        selectedTabLink.classList.add("active");
                        document.getElementById(activeTab)?.classList.add("active");
                    } else {
                        document.querySelector('.tab-link[data-tab="home"]').classList.add("active");
                        document.getElementById("home").classList.add("active");
                    }

                    tabLinks.forEach(link => {
                        link.addEventListener("click", function (e) {
                            e.preventDefault();
                            tabLinks.forEach(tab => tab.classList.remove("active"));
                            tabContents.forEach(content => content.classList.remove("active"));
                            this.classList.add("active");
                            const tab = this.getAttribute("data-tab");
                            document.getElementById(tab)?.classList.add("active");
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
                        `<iframe id="pdf-iframe" scrolling='no' allowfullscreen webkitallowfullscreen style="border:none; width:100%; height:calc(100% - 17px); border-radius:10px; margin-top:22px;" 
    src="/oread/web/viewer.html?disableStream=false&disableRange=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}"></iframe>`;

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
                    fetch('https://cdn-materioa.netlify.app/databases/beta/resource.lib.json')
                        .then(response => response.json())
                        .then(data => {
                            const semesterMapping = { "9": "Additional Resources" };
                            const semesterSelect = document.getElementById('semesterSelect');
                            semesterSelect.innerHTML = '';
                            const placeholder = document.createElement('option');
                            placeholder.value = '';
                            placeholder.textContent = 'Select Semester';
                            semesterSelect.appendChild(placeholder);

                            for (let sem in data) {
                                const option = document.createElement('option');
                                option.value = sem;
                                option.textContent = semesterMapping[sem] ? semesterMapping[sem] : "Semester " + sem;
                                if (sem === "4") {
                                    option.selected = true;
                                }
                                semesterSelect.appendChild(option);
                            }

                            if (semesterSelect.value) {
                                semesterSelect.dispatchEvent(new Event('change'));
                            }

                            semesterSelect.addEventListener('change', function () {
                                clearSelect('subjectSelect', 'Select Subject');
                                clearSelect('categorySelect', 'Select Category');
                                clearSelect('topicSelect', 'Select Topic');
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
                                clearSelect('categorySelect', 'Select Category');
                                clearSelect('topicSelect', 'Select Topic');
                                const semKey = document.getElementById('semesterSelect').value;
                                const subjectKey = this.value;
                                if (!subjectKey) return;
                                const categoriesArr = data[semKey][subjectKey];
                                const categorySelect = document.getElementById('categorySelect');
                                if (categoriesArr && categoriesArr.length) {
                                    let defaultSet = false;
                                    categoriesArr.forEach((catObj, idx) => {
                                        const option = document.createElement('option');
                                        option.value = idx;
                                        option.textContent = catObj.type;
                                        if (catObj.type.trim().toLowerCase() === "chapters") {
                                            option.selected = true;
                                            defaultSet = true;
                                        }
                                        categorySelect.appendChild(option);
                                    });
                                    categorySelect.disabled = false;
                                    if (defaultSet) {
                                        categorySelect.dispatchEvent(new Event('change'));
                                    }
                                }
                            });

                            document.getElementById('categorySelect').addEventListener('change', function () {
                                clearSelect('topicSelect', 'Select Topic');
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


                const themeToggle = document.getElementById('themeToggle');
                themeToggle.addEventListener('change', function () {
                    // Existing elements
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
                        document.getElementById('notificationBoard'),
                        document.getElementById('about')
                    ];



                    // Append all notification cards (they all share id "notify")
                    const notifyCards = document.querySelectorAll('#notify');
                    notifyCards.forEach(card => elements.push(card));

                    elements.forEach(el => {
                        if (el) {
                            this.checked ? el.classList.add('dark-mode') : el.classList.remove('dark-mode');
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
                        document.getElementById('about'),
                        document.getElementById('notificationBoard')
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
                fullscreenButton.addEventListener('click', () => {
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().then(() => {
                            popup.classList.add('fullscreen');
                        }).catch(err => {
                            console.error(`Failed to enable fullscreen mode: ${err.message}`);
                        });
                    } else {
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
                        // alert('Please select a semester, subject, category, and topic.');
                        return;
                    }

                    const pdfUrl = `https://cdn-materioa.netlify.app/pdfs/${semester}/${subject}/${topic}.pdf`;
                    document.getElementById('popupContent').innerHTML =
                        `<iframe id="pdf-iframe" style="border:none; width:100%; height:calc(100% - 17px); border-radius:10px; margin-top:22px;" 
      src="/oread/web/viewer.html?disableStream=false&disableRange=false&rangeChunkSize=1048576&file=${encodeURIComponent(pdfUrl)}"></iframe>`;
                    popup.classList.remove('closing');
                    popup.style.display = 'block';
                });

                fetch('https://cdn-materioa.netlify.app/databases/beta/resource.lib.json')
                    .then(response => response.json())
                    .then(data => {
                        const semesterMapping = {
                            "9": "Additional Resources"
                        };

                        const semesterSelect = document.getElementById('semesterSelect');
                        semesterSelect.innerHTML = '';
                        const placeholder = document.createElement('option');
                        placeholder.value = '';
                        placeholder.textContent = 'Select Semester';
                        semesterSelect.appendChild(placeholder);

                        for (let sem in data) {
                            const option = document.createElement('option');
                            option.value = sem;
                            option.textContent = (semesterMapping[sem]) ? semesterMapping[sem] : "Semester " + sem;
                            semesterSelect.appendChild(option);
                        }

                        semesterSelect.value = "4";
                        if (semesterSelect.value) {
                            semesterSelect.dispatchEvent(new Event('change'));
                        }

                        semesterSelect.addEventListener('change', function () {
                            clearSelect('subjectSelect', 'Select Subject');
                            clearSelect('categorySelect', 'Select Category');
                            clearSelect('topicSelect', 'Select Topic');
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

                        function clearSelect(selectId, placeholderText) {
                            const select = document.getElementById(selectId);
                            select.innerHTML = '';
                            const option = document.createElement('option');
                            option.value = '';
                            option.textContent = placeholderText;
                            select.appendChild(option);
                            select.disabled = true;
                        }
                    })
                    .catch(err => console.error('Error loading data:', err));

