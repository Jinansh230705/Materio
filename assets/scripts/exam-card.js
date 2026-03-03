// Exam Card Display and Modal Script
// Handles the exam card in InsightRoom with 3 dynamic views and exam modal
// Supports multiple semesters with semester-based filtering

let examData = null;
let currentSemesterData = null;
let examViewRotationTimer = null;
let currentExamView = 0; // 0 = preexam, 1 = ongoing, 2 = timeline

// Debug: Fake date for testing (set via console)
let _fakeDate = null;

// Helper to get current date (uses fake date if set, otherwise real date)
function getCurrentDate() {
    return _fakeDate ? new Date(_fakeDate) : new Date();
}

// Debug functions - use these in browser console to test different dates and times
// Example: setFakeDate('2026-02-16') to simulate exam day start
// Example: setFakeDate('2026-02-16T11:20:00') to simulate 11:20 AM on exam day
// Example: clearFakeDate() to reset to real date/time
window.setFakeDate = function (dateTimeString) {
    _fakeDate = dateTimeString;
    const dateObj = new Date(dateTimeString);
    console.log(`[ExamCard Debug] Fake date/time set to: ${dateObj.toLocaleString()}`);
    console.log(`[ExamCard Debug] Refreshing exam card...`);
    // Refresh the exam card with new date
    if (examData && currentSemesterData) {
        displayExamCard(examData, currentSemesterData);
        generateExamTimeline();
    }
    return `Fake date/time set to ${dateObj.toLocaleString()}. Card and modal refreshed.`;
};

window.clearFakeDate = function () {
    _fakeDate = null;
    console.log('[ExamCard Debug] Fake date cleared. Using real date now.');
    if (examData && currentSemesterData) {
        displayExamCard(examData, currentSemesterData);
        generateExamTimeline();
    }
    return 'Fake date cleared. Using real date now.';
};

window.getFakeDate = function () {
    return _fakeDate ? `Fake date: ${_fakeDate}` : 'No fake date set (using real date)';
};

// Constants
const VIEW_ROTATION_INTERVAL = 15000; // 15 seconds shuffle as default
const SHOW_BEFORE_DAYS = 7; // Show card 7 days before exam starts

// Load exam data when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        loadAndDisplayExamCard();
        // Re-run after a delay to catch any late DOM modifications
        setTimeout(loadAndDisplayExamCard, 500);
        setTimeout(loadAndDisplayExamCard, 1500);
    });
} else {
    loadAndDisplayExamCard();
    // Re-run after a delay to catch any late DOM modifications
    setTimeout(loadAndDisplayExamCard, 500);
    setTimeout(loadAndDisplayExamCard, 1500);
}

async function loadAndDisplayExamCard() {
    try {
        // Add cache busting to ensure we get the latest data
        const timestamp = new Date().getTime();
        const response = await fetch(`https://cdn-materioa.vercel.app/databases/beta/examdata.json?t=${timestamp}`);

        if (!response.ok) {

            return;
        }

        examData = await response.json();


        // Get current semester from user selection or default
        const currentSemester = getCurrentUserSemester();


        // Find matching semester data
        currentSemesterData = findSemesterData(examData, currentSemester);


        if (currentSemesterData) {
            const shouldDisplay = shouldDisplayExamCard(examData, currentSemesterData);
            if (shouldDisplay) {
                displayExamCard(examData, currentSemesterData);
            } else {
                hideExamCards();
            }
        } else {
            hideExamCards();
        }

        // Listen for semester/subject changes
        const semesterSelect = document.getElementById('semesterSelect');
        const subjectSelect = document.getElementById('subjectSelect');

        function updateExamCard() {
            const newSemester = getCurrentUserSemester();

            currentSemesterData = findSemesterData(examData, newSemester);

            if (currentSemesterData && shouldDisplayExamCard(examData, currentSemesterData)) {
                displayExamCard(examData, currentSemesterData);
            } else {
                hideExamCards();
            }
        }

        if (semesterSelect) {
            semesterSelect.addEventListener('change', updateExamCard);
        }
        if (subjectSelect) {
            subjectSelect.addEventListener('change', updateExamCard);
        }

        // Also listen for custom semesterChanged event
        document.addEventListener('semesterChanged', updateExamCard);

    } catch (error) {
        console.error('[ExamCard] Error loading exam data:', error);
    }
}

function getCurrentUserSemester() {
    // Try to get semester from the dropdown first (most accurate)
    const semesterSelect = document.getElementById('semesterSelect');
    if (semesterSelect && semesterSelect.value && semesterSelect.value.trim() !== '') {
        const match = semesterSelect.value.match(/\d+/);
        if (match) {

            return parseInt(match[0]);
        }
    }

    // Try localStorage as fallback
    const savedSemester = localStorage.getItem('userSemester');
    if (savedSemester) {
        const match = savedSemester.match(/\d+/);
        if (match) {

            return parseInt(match[0]);
        }
    }

    // Default: return null to find first available semester

    return null;
}

function getSelectedSubjectName() {
    const subjectSelect = document.getElementById('subjectSelect');
    if (subjectSelect && subjectSelect.value && subjectSelect.value.trim() !== '') {
        // The option text is the subject name, value might be different
        const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
        if (selectedOption) {
            return selectedOption.text || selectedOption.value;
        }
    }
    return null;
}

function findSemesterData(data, semester) {
    if (!data.semesters || data.semesters.length === 0) {
        // Legacy format - single semester
        if (data.examPeriod && data.exams) {
            return {
                semester: null,
                examPeriod: data.examPeriod,
                exams: data.exams
            };
        }
        return null;
    }

    // If no specific semester, find the first one with upcoming/ongoing exams
    if (semester === null) {
        const now = getCurrentDate();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const showBeforeDays = data.showBeforeDays || SHOW_BEFORE_DAYS;



        for (const semData of data.semesters) {
            const startDate = new Date(semData.examPeriod.startDate);
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDate = semData.examPeriod.endDate ? new Date(semData.examPeriod.endDate) : null;
            const endDateOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;

            const daysUntilExam = Math.ceil((startDateOnly - today) / (1000 * 60 * 60 * 24));



            // Check if this semester's exams are within display window
            // Show if: within showBeforeDays before start OR exams ongoing (using full datetime for end check)
            if ((daysUntilExam <= showBeforeDays && daysUntilExam >= 0) ||
                (today >= startDateOnly && (!endDate || now <= endDate))) {

                return semData;
            }
        }

        return null;
    }

    // Find specific semester
    const found = data.semesters.find(s => s.semester === semester);

    return found || null;
}

function shouldDisplayExamCard(data, semesterData) {
    // Don't show if disabled
    if (!data.enabled) {

        return false;
    }

    if (!semesterData || !semesterData.examPeriod || !semesterData.examPeriod.startDate) {

        return false;
    }

    const now = getCurrentDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(semesterData.examPeriod.startDate);
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDate = semesterData.examPeriod.endDate ? new Date(semesterData.examPeriod.endDate) : null;
    const endDateOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;

    // Calculate days until exam starts
    const daysUntilExam = Math.ceil((startDateOnly - today) / (1000 * 60 * 60 * 24));
    const showBeforeDays = data.showBeforeDays || SHOW_BEFORE_DAYS;



    // Show if within showBeforeDays before start (including exam day)
    if (daysUntilExam <= showBeforeDays && daysUntilExam >= 0) {

        return true;
    }

    // Show if exams are currently ongoing (use full datetime for end check so card hides once last exam finishes)
    if (today >= startDateOnly && (!endDate || now <= endDate)) {

        return true;
    }


    return false;
}

function hideExamCards() {
    const examCards = [
        document.getElementById('examCard'),
        document.getElementById('examCardDefault')
    ].filter(Boolean);

    // Hide the cards themselves
    examCards.forEach(card => card.style.display = 'none');

    // Hide the parent containers if they exist (insightroom carousel item)
    examCards.forEach(card => {
        const insightItem = card.closest('.insight-item');
        if (insightItem) {
            insightItem.style.display = 'none';
        }
    });

    // Also hide from smart recommendations if it exists there
    const smartRecExam = document.querySelector('.recommendation-item#examCardDefault');
    if (smartRecExam) {
        smartRecExam.style.display = 'none';
    }

    // If #recommendedPosts has no other visible content, hide it to avoid empty area
    const recommendedPosts = document.getElementById('recommendedPosts');
    if (recommendedPosts) {
        const hasVisiblePosts = recommendedPosts.querySelectorAll('.insight-card-link').length > 0;
        const attachmentsCard = document.getElementById('attachmentsCard');
        const hasVisibleAttachments = attachmentsCard && attachmentsCard.style.display !== 'none';
        if (!hasVisiblePosts && !hasVisibleAttachments) {
            recommendedPosts.style.setProperty('display', 'none', 'important');
        }
    }
}

function displayExamCard(data, semesterData) {


    // Handle both default and recommended view exam cards
    const examCards = [
        document.getElementById('examCard'),
        document.getElementById('examCardDefault')
    ].filter(Boolean);



    if (examCards.length === 0) {
        console.error('[ExamCard] No exam card elements found in DOM');
        return;
    }

    const now = new Date();
    const startDate = new Date(semesterData.examPeriod.startDate);
    const isPreExam = now < startDate;

    // Update period name in all views (both regular and default IDs)
    const periodName = semesterData.examPeriod.shortName || semesterData.examPeriod.name || 'Semester';
    const periodNameIds = [
        'examPeriodName', 'examPeriodNameOngoing', 'examPeriodNameTimeline',
        'examPeriodNameDefault', 'examPeriodNameOngoingDefault', 'examPeriodNameTimelineDefault'
    ];
    periodNameIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = periodName;
    });

    // Get sorted exams
    const sortedExams = [...semesterData.exams].sort((a, b) => new Date(a.date) - new Date(b.date));



    // Show the exam cards with !important to override any CSS issues
    examCards.forEach(card => {
        card.style.setProperty('display', 'flex', 'important');
    });

    // If smart recommendations are active (defaultPosts hidden), ensure
    // #recommendedPosts is visible so #examCard can render inside it.
    // Don't do this for #examCardDefault — its parent is managed by the default view.
    const defaultPosts = document.getElementById('defaultPosts');
    const isSmartRecommendationsActive = defaultPosts && getComputedStyle(defaultPosts).display === 'none';
    if (isSmartRecommendationsActive) {
        const recommendedPosts = document.getElementById('recommendedPosts');
        if (recommendedPosts) {
            recommendedPosts.style.removeProperty('display');
            if (getComputedStyle(recommendedPosts).display === 'none') {
                recommendedPosts.style.display = 'flex';
            }
        }
    }

    if (isPreExam) {
        // Pre-exam phase: Only show the info/countdown view
        showPreExamView(sortedExams, data, false);
        showPreExamView(sortedExams, data, true);
        currentExamView = 0;
    } else {
        // Ongoing phase: show based on current rotation state (Info vs Timeline)
        if (currentExamView === 2) {
            showTimelineView(sortedExams, false);
            showTimelineView(sortedExams, true);
        } else {
            showOngoingViews(sortedExams, data, false);
            showOngoingViews(sortedExams, data, true);
            currentExamView = 1; // Default to 1 (Ongoing Info)
        }
    }

    // Setup view rotation for all states (rotates subjects in pre-exam, rotates views in ongoing)
    // Only rotate if no specific subject is selected (to avoid jumping away from user selection)
    const selectedSubject = getSelectedSubjectName();
    if (!selectedSubject) {
        setupViewRotation(sortedExams, data);
    }
}

function showPreExamView(exams, data, isDefault = false) {
    const suffix = isDefault ? 'Default' : '';
    hideAllExamViews(suffix);

    const preexamView = document.getElementById('examViewPreexam' + suffix);
    if (!preexamView) return;

    preexamView.style.display = 'flex';

    // Get first upcoming exam, or filter by selected subject if one is selected
    const now = new Date();
    const upcomingExams = exams.filter(e => new Date(e.date) >= now);

    // Check if a specific subject is selected
    const selectedSubject = getSelectedSubjectName();
    let targetExam = null;

    if (selectedSubject) {
        // Normalize for comparison
        const normalizeForMatch = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        const selectedNorm = normalizeForMatch(selectedSubject);



        // Find exam matching the selected subject or any of its aliases
        targetExam = upcomingExams.find(e => {
            const examNorm = normalizeForMatch(e.subject);

            // Check subject name
            if (examNorm.includes(selectedNorm) || selectedNorm.includes(examNorm)) {
                return true;
            }

            // Check aliases if available
            if (e.aliases && Array.isArray(e.aliases)) {
                for (const alias of e.aliases) {
                    const aliasNorm = normalizeForMatch(alias);
                    if (aliasNorm.includes(selectedNorm) || selectedNorm.includes(aliasNorm)) {

                        return true;
                    }
                }
            }

            // Check exam code
            if (e.code && selectedNorm.includes(e.code.toLowerCase())) {
                return true;
            }

            return false;
        });


    }

    // Fallback to first upcoming exam
    if (!targetExam) {
        targetExam = upcomingExams[0] || exams[0];
    }
    if (targetExam) {
        // Update exam info
        const subjectEl = document.getElementById('preexamFirstSubject' + suffix);
        const dateEl = document.getElementById('preexamFirstDate' + suffix);
        const syllabusEl = document.getElementById('preexamSyllabus' + suffix);
        const labelEl = preexamView.querySelector('.exam-label');

        // Global countdown for exam period start
        const headerSpan = preexamView.querySelector('.exam-card-header span');
        const headerIcon = preexamView.querySelector('.exam-card-header i');
        const subtitle = preexamView.querySelector('.exam-subtitle');

        // Calculate days until the WHOLE exam period starts
        const periodStartDate = new Date(currentSemesterData.examPeriod.startDate);
        const daysUntilStart = getDaysUntil(periodStartDate.toISOString());

        if (daysUntilStart === 0) {
            if (headerSpan) headerSpan.textContent = "Exams are on going!";
            if (headerIcon) {
                headerIcon.className = 'fa-solid fa-fire';
                headerIcon.style.color = '#ff8200';
            }
        } else if (daysUntilStart > 0 && daysUntilStart <= 3) {
            if (headerSpan) headerSpan.textContent = `${daysUntilStart} Day${daysUntilStart > 1 ? 's' : ''} Left!`;
            if (headerIcon) {
                headerIcon.className = 'fa-solid fa-fire';
                headerIcon.style.color = '#ff8200';
            }
            if (subtitle) {
                const periodName = currentSemesterData?.examPeriod?.shortName || 'Semester';
                subtitle.textContent = `Your ${periodName} exams are starting soon`;
            }
        } else {
            if (headerSpan) headerSpan.textContent = "Exams are on the way!";
            if (headerIcon) {
                headerIcon.className = 'fa-solid fa-calendar-check';
                headerIcon.style.color = '';
            }
        }

        if (labelEl) labelEl.textContent = "Start with";

        if (subjectEl) {
            const subject = targetExam.subject;
            subjectEl.textContent = subject.toLowerCase().endsWith('exam') ? subject : subject + " exam";
        }
        if (dateEl) dateEl.textContent = formatDate(targetExam.date);

        // Show syllabus topics for this exam - stable if locked in
        if (syllabusEl && targetExam.syllabus && targetExam.syllabus.length > 0) {
            const isLocked = daysUntilStart <= 3;
            const topics = isLocked ? targetExam.syllabus.slice(0, 2) : getRandomItems(targetExam.syllabus, 2);
            syllabusEl.innerHTML = `<span>Topics: ${topics.join(', ')}</span>`;
        }
    }
}

function showOngoingViews(exams, data, isDefault = false) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's and tomorrow's exams
    let todayExam = exams.find(e => {
        const examDate = new Date(e.date);
        return examDate.toDateString() === today.toDateString();
    });

    // If today's exam exists, check if it's already finished
    if (todayExam && isExamFinished(todayExam, now)) {
        todayExam = null; // Treat as already past
    }

    const tomorrowExam = exams.find(e => {
        const examDate = new Date(e.date);
        return examDate.toDateString() === tomorrow.toDateString();
    });

    // Get next upcoming exam (strictly in the future from 'now')
    const upcomingExams = exams.filter(e => {
        const examDate = new Date(e.date);
        if (examDate.toDateString() === today.toDateString()) {
            return !isExamFinished(e, now);
        }
        return examDate > now;
    });
    const nextExam = upcomingExams[0];

    // Show ongoing view first
    showOngoingView(todayExam, tomorrowExam, nextExam, exams, isDefault);
}

function showOngoingView(todayExam, tomorrowExam, nextExam, allExams, isDefault = false) {
    const suffix = isDefault ? 'Default' : '';
    hideAllExamViews(suffix);

    const ongoingView = document.getElementById('examViewOngoing' + suffix);
    if (!ongoingView) return;

    ongoingView.style.display = 'flex';

    const itemContainer = document.getElementById('examTodayItem' + suffix);
    const labelEl = itemContainer?.querySelector('.exam-item-label');
    const subjectEl = document.getElementById('examTodaySubject' + suffix);
    const dateEl = document.getElementById('examTodayDate' + suffix);
    const syllabusEl = document.getElementById('ongoingSyllabus' + suffix);

    // Determine which exam to show
    const displayExam = todayExam || tomorrowExam || nextExam;

    if (itemContainer && displayExam) {
        itemContainer.style.display = 'block';

        if (todayExam) {
            const headerSpan = ongoingView.querySelector('.exam-card-header span');
            if (headerSpan) headerSpan.textContent = "Exams are on going!";
            if (labelEl) labelEl.textContent = "Today is";
            if (subjectEl) {
                const subject = todayExam.subject;
                subjectEl.textContent = subject.toLowerCase().endsWith('exam') ? subject : subject + " exam";
            }
            if (dateEl) dateEl.textContent = formatDate(todayExam.date);
            if (syllabusEl && todayExam.syllabus) {
                const topics = todayExam.syllabus.slice(0, 2); // Stable for ongoing
                syllabusEl.innerHTML = `<span>Topics: ${topics.join(', ')}</span>`;
            }
        } else if (tomorrowExam) {
            const headerSpan = ongoingView.querySelector('.exam-card-header span');
            if (headerSpan) headerSpan.textContent = "Tomorrow is the day!";
            if (labelEl) labelEl.textContent = "Tomorrow you have";
            if (subjectEl) {
                const subject = tomorrowExam.subject;
                subjectEl.textContent = subject.toLowerCase().endsWith('exam') ? subject : subject + " exam";
            }
            if (dateEl) dateEl.textContent = formatDate(tomorrowExam.date);
            if (syllabusEl && tomorrowExam.syllabus) {
                const topics = tomorrowExam.syllabus.slice(0, 2); // Stable for ongoing
                syllabusEl.innerHTML = `<span>Topics: ${topics.join(', ')}</span>`;
            }
        } else if (nextExam) {
            const headerSpan = ongoingView.querySelector('.exam-card-header span');

            // Simplified: Always show "Exams are on going!" and "Next exam" for next upcoming
            if (headerSpan) headerSpan.textContent = "Exams are on going!";
            if (labelEl) labelEl.textContent = "Next exam";

            if (subjectEl) {
                const subject = nextExam.subject;
                subjectEl.textContent = subject.toLowerCase().endsWith('exam') ? subject : subject + " exam";
            }
            if (dateEl) dateEl.textContent = formatDate(nextExam.date);
            if (syllabusEl && nextExam.syllabus) {
                const topics = nextExam.syllabus.slice(0, 2); // Stable for ongoing
                syllabusEl.innerHTML = `<span>Topics: ${topics.join(', ')}</span>`;
            }
        }
    }
}

function showTimelineView(exams, isDefault = false) {
    const suffix = isDefault ? 'Default' : '';
    hideAllExamViews(suffix);

    const timelineView = document.getElementById('examViewTimeline' + suffix);
    const timelineContainer = document.getElementById('examMiniTimeline' + suffix);

    if (!timelineView || !timelineContainer) return;

    timelineView.style.display = 'flex';

    const now = getCurrentDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter to show ONLY today's (if not finished) and upcoming exams
    const relevantExams = exams.filter(e => {
        const examDate = new Date(e.date);
        const examDateOnly = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate());

        if (examDateOnly.toDateString() === today.toDateString()) {
            // It's today, only include if not finished
            return !isExamFinished(e, now);
        }

        return examDateOnly > today;
    });

    // Generate mini timeline HTML for the next 2 exams
    let timelineHTML = '';
    relevantExams.slice(0, 2).forEach((exam, index) => {
        const examDate = new Date(exam.date);
        const isToday = examDate.toDateString() === today.toDateString();

        const statusClass = isToday ? 'today' : 'upcoming';

        // Get a random topic and truncate if necessary
        let topicStr = '';
        if (exam.syllabus && exam.syllabus.length > 0) {
            const randomTopic = exam.syllabus[Math.floor(Math.random() * exam.syllabus.length)];
            // Limit topic length for mini timeline
            topicStr = randomTopic.length > 30 ? randomTopic.substring(0, 27) + '...' : randomTopic;
        }

        timelineHTML += `
            <div class="exam-mini-item ${statusClass}">
                <div class="exam-mini-content">
                    <div class="exam-mini-subject">${exam.subject}</div>
                    <div class="exam-mini-date">${formatDate(exam.date)}${topicStr ? ` - ${topicStr}` : ''}</div>
                </div>
            </div>
        `;
    });

    timelineContainer.innerHTML = timelineHTML;
}

function hideAllExamViews(suffix = '') {
    ['examViewPreexam', 'examViewOngoing', 'examViewTimeline'].forEach(id => {
        const el = document.getElementById(id + suffix);
        if (el) el.style.display = 'none';
    });
}

function setupViewRotation(exams, data) {
    // Clear any existing timer
    if (examViewRotationTimer) {
        clearInterval(examViewRotationTimer);
    }

    const rotationInterval = 15000; // 15 seconds shuffle

    // Determine the state once
    const now = getCurrentDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = currentSemesterData ? new Date(currentSemesterData.examPeriod.startDate) : null;
    const isPreExam = startDate && now < startDate;

    // Use current state or default
    if (currentExamView === undefined || currentExamView === null) {
        currentExamView = isPreExam ? 0 : 1;
    }

    let subIndex = 0;
    const upcomingExams = exams.filter(e => new Date(e.date) >= today);

    examViewRotationTimer = setInterval(() => {
        // Refresh 'now' for date calculations inside interval
        const innerNow = getCurrentDate();
        const innerToday = new Date(innerNow.getFullYear(), innerNow.getMonth(), innerNow.getDate());

        // Use daysUntilStart to determine if we are in the countdown phase or ongoing phase
        const innerStartDate = currentSemesterData ? new Date(currentSemesterData.examPeriod.startDate) : null;
        const daysUntilStart = innerStartDate ? getDaysUntil(innerStartDate.toISOString()) : 99;

        const isCurrentlyOngoing = daysUntilStart <= 0;

        if (!isCurrentlyOngoing) {
            // Countdown/Pre-exam phase
            if (daysUntilStart > 3) {
                // More than 3 days: Rotate through upcoming exams
                if (upcomingExams.length > 1) {
                    subIndex = (subIndex + 1) % upcomingExams.length;
                    const nextTarget = upcomingExams[subIndex];
                    updatePreExamWithSubject(nextTarget, false);
                    updatePreExamWithSubject(nextTarget, true);
                }
            } else {
                // 3 days or less: Lock in with the FIRST upcoming exam
                const firstExam = upcomingExams[0];
                if (firstExam) {
                    updatePreExamWithSubject(firstExam, false);
                    updatePreExamWithSubject(firstExam, true);
                }
            }
            currentExamView = 0;
        } else {
            // Ongoing phase: Toggle between Ongoing Info (focus exam) and Timeline
            if (currentExamView === 2) {
                // Switch back to info view (Today/Tomorrow/Next)
                const tomorrow = new Date(innerToday);
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Refetch focusing only on what's current - NO rotation of subjects here
                const todayExam = exams.find(e => new Date(e.date).toDateString() === innerToday.toDateString());
                const tomorrowExam = exams.find(e => new Date(e.date).toDateString() === tomorrow.toDateString());
                const nextUpcoming = exams.filter(e => new Date(e.date) > innerToday)[0];

                showOngoingView(todayExam, tomorrowExam, nextUpcoming, exams, false);
                showOngoingView(todayExam, tomorrowExam, nextUpcoming, exams, true);
                currentExamView = 1;
            } else {
                // Switch to timeline view (shows current and next)
                showTimelineView(exams, false);
                showTimelineView(exams, true);
                currentExamView = 2;
            }
        }
    }, rotationInterval);
}

function updatePreExamWithSubject(exam, isDefault = false) {
    const suffix = isDefault ? 'Default' : '';
    const preexamView = document.getElementById('examViewPreexam' + suffix);
    const subjectEl = document.getElementById('preexamFirstSubject' + suffix);
    const dateEl = document.getElementById('preexamFirstDate' + suffix);
    const syllabusEl = document.getElementById('preexamSyllabus' + suffix);
    const labelEl = preexamView ? preexamView.querySelector('.exam-label') : null;
    const headerSpan = preexamView ? preexamView.querySelector('.exam-card-header span') : null;
    const headerIcon = preexamView ? preexamView.querySelector('.exam-card-header i') : null;

    const periodStartDate = new Date(currentSemesterData.examPeriod.startDate);
    const daysUntilStart = getDaysUntil(periodStartDate.toISOString());

    if (daysUntilStart > 0 && daysUntilStart <= 3) {
        if (headerSpan) headerSpan.textContent = `${daysUntilStart} Day${daysUntilStart > 1 ? 's' : ''} Left!`;
        if (headerIcon) {
            headerIcon.className = 'fa-solid fa-fire';
            headerIcon.style.color = '#ff8200';
        }
    } else {
        if (headerSpan) headerSpan.textContent = "Exams are on the way!";
        if (headerIcon) {
            headerIcon.className = 'fa-solid fa-calendar-check';
            headerIcon.style.color = '';
        }
    }

    // In pre-exam phase, the label is always "Start with"
    if (labelEl) labelEl.textContent = "Start with";

    if (subjectEl) {
        const subject = exam.subject;
        subjectEl.textContent = subject.toLowerCase().endsWith('exam') ? subject : subject + " exam";
    }
    if (dateEl) dateEl.textContent = formatDate(exam.date);

    if (syllabusEl && exam.syllabus) {
        const isLocked = daysUntilStart <= 3 || daysUntilStart <= 0;
        const topics = isLocked ? exam.syllabus.slice(0, 2) : getRandomItems(exam.syllabus, 2);
        syllabusEl.innerHTML = `<span>Topics: ${topics.join(', ')}</span>`;
    }
}

// Helper functions
function getRandomItems(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
}

function formatDateLong(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Helper to get days until a date
function getDaysUntil(dateStr) {
    const now = getCurrentDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(dateStr);
    const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffTime = targetDay.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Helper to check if an exam has finished based on its start time and duration
function isExamFinished(exam, now) {
    if (!exam || !exam.time) return false;

    try {
        // Parse exam start time
        const [hours, minutes] = exam.time.split(':').map(Number);
        const examStartDate = new Date(exam.date);
        examStartDate.setHours(hours, minutes, 0, 0);

        // Parse duration (e.g., "1.5 hours", "60 mins")
        let durationMinutes = 90; // Default 1.5 hours
        if (exam.duration) {
            const durationStr = String(exam.duration).toLowerCase();
            if (durationStr.includes('hour')) {
                const hoursMatch = durationStr.match(/(\d+\.?\d*)\s*hour/);
                if (hoursMatch) durationMinutes = parseFloat(hoursMatch[1]) * 60;
            } else if (durationStr.includes('min')) {
                const minsMatch = durationStr.match(/(\d+)\s*min/);
                if (minsMatch) durationMinutes = parseInt(minsMatch[1]);
            }
        }

        const examEndDate = new Date(examStartDate.getTime() + durationMinutes * 60000);
        return now > examEndDate;
    } catch (e) {
        console.error('[ExamCard] Error calculating if exam is finished:', e);
        return false;
    }
}

// Open exam modal
function openExamModal() {
    if (!currentSemesterData) {
        console.error('[ExamCard] No exam data available for modal');
        return;
    }

    const modal = document.getElementById('examModal');
    if (!modal) {
        console.error('[ExamCard] Exam modal element not found');
        return;
    }

    // Update modal title
    const titleEl = document.getElementById('examModalTitle');
    if (titleEl) {
        const periodName = currentSemesterData.examPeriod.name || 'Semester';
        const now = new Date();
        const startDate = new Date(currentSemesterData.examPeriod.startDate);
        const isPreExam = now < startDate;

        const fullText = isPreExam ? `${periodName} Exams are coming!` : `${periodName} Exams are on going !`;
        const words = fullText.split(' ');
        if (words.length > 3) {
            titleEl.innerHTML = words.slice(0, 3).join(' ') + '<br>' + words.slice(3).join(' ');
        } else {
            titleEl.textContent = fullText;
        }
    }

    // Generate timeline
    generateExamTimeline();

    // Auto-load saved enrollment for seating lookup
    if (typeof initSeatingLookup === 'function') {
        initSeatingLookup();
    }

    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.classList.add('modal-open');

    // Scroll to active/today exam after a brief delay
    setTimeout(() => {
        scrollToActiveExam();
    }, 100);

    // Haptic feedback
    if (window.MaterioHaptics) {
        window.MaterioHaptics.vibrate('select');
    }
}

function scrollToActiveExam() {
    const timeline = document.getElementById('examModalTimeline');
    if (!timeline) return;

    // Get all exam items from the DOM
    const allItems = timeline.querySelectorAll('.exam-timeline-item');
    if (allItems.length === 0) return;

    // Find the first item that is NOT completed (i.e., today or upcoming)
    // This ensures we scroll to show the first non-completed exam at the top
    let targetItem = null;

    for (const item of allItems) {
        if (!item.classList.contains('completed')) {
            targetItem = item;
            break;
        }
    }

    // If all exams are completed, show the last one
    if (!targetItem) {
        targetItem = allItems[allItems.length - 1];
    }

    if (targetItem) {
        // Use scrollIntoView for more reliable positioning
        targetItem.scrollIntoView({ behavior: 'instant', block: 'start' });

        // Add a small offset so it's not flush with the top
        timeline.scrollTop = Math.max(0, timeline.scrollTop - 10);
    }
}

// Close exam modal
function closeExamModal() {
    const modal = document.getElementById('examModal');
    const slider = document.getElementById('examModalSlider');

    if (modal) {
        // Add closing animation - works on both mobile and desktop
        const examModalElement = modal.querySelector('.exam-modal');
        if (examModalElement) {
            // Prepare for animation
            examModalElement.style.willChange = 'transform, opacity';
            examModalElement.classList.add('closing');

            // Reset slider to timeline page for next opening (smoothly)
            if (slider) {
                setTimeout(() => {
                    slider.classList.remove('show-syllabus');
                }, 300);
            }

            // Animate overlay fade out
            modal.style.transition = 'opacity 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
            modal.style.opacity = '0';

            // Wait for animation to finish before hiding
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('show');
                modal.style.opacity = '';
                modal.style.transition = '';
                examModalElement.classList.remove('closing');
                examModalElement.style.willChange = '';
                examModalElement.style.transform = '';
                document.body.classList.remove('modal-open');
            }, 400); // Match the animation duration
        } else {
            // Fallback if .exam-modal doesn't exist
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            if (slider) slider.classList.remove('show-syllabus');
        }
    }
}

function generateExamTimeline() {
    const timelineContainer = document.getElementById('examModalTimeline');
    if (!timelineContainer || !currentSemesterData || !currentSemesterData.exams) return;

    const now = getCurrentDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sortedExams = [...currentSemesterData.exams].sort((a, b) => new Date(a.date) - new Date(b.date));

    let timelineHTML = '';
    let foundFirstUpcoming = false; // Track if we've found the first upcoming exam

    sortedExams.forEach((exam, index) => {
        const examDate = new Date(exam.date);
        const examDateOnly = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate());

        const isPastDate = examDateOnly < today;
        const isToday = examDateOnly.toDateString() === today.toDateString();
        // Check if today's exam has actually finished (start time + duration passed)
        const isFinished = isToday && isExamFinished(exam, now);
        const isCompleted = isPastDate || isFinished;

        let statusClass = 'upcoming';
        if (isCompleted) {
            statusClass = 'completed';
        } else if (isToday) {
            // Today's exam is still in progress - active blinking indicator
            statusClass = 'today active';
            foundFirstUpcoming = true; // Today counts as "found"
        } else if (!foundFirstUpcoming) {
            // First upcoming exam (after today or after last completed) gets active indicator
            // This shows blinking even on gap days between exams
            statusClass = 'upcoming active';
            foundFirstUpcoming = true;
        }

        // Generate syllabus HTML with truncation
        let syllabusHTML = '';
        if (exam.syllabus && exam.syllabus.length > 0) {
            const displayLimit = 2;
            const hasMore = exam.syllabus.length > displayLimit;
            const shownItems = exam.syllabus.slice(0, displayLimit);

            syllabusHTML = `
                <div class="exam-timeline-syllabus">
                    <div class="exam-timeline-syllabus-label">Syllabus</div>
                    <div class="exam-timeline-syllabus-list">
                        ${shownItems.map(item => `<div class="exam-timeline-syllabus-item">${item}</div>`).join('')}
                        ${hasMore ? `<span class="syllabus-show-link" onclick="showExamSyllabus('${exam.id || index}')">... show</span>` : ''}
                    </div>
                </div>
            `;
        }

        timelineHTML += `
            <div class="exam-timeline-item ${statusClass}" data-exam-id="${exam.id || index}">
                <div class="exam-timeline-dot"></div>
                <div class="exam-timeline-content">
                    <div class="exam-timeline-subject">${exam.subject}${exam.code ? ` (${exam.code})` : ''}</div>
                    <div class="exam-timeline-date">${formatDateLong(exam.date)}${exam.time ? ` at ${exam.time}` : ''}</div>
                    ${syllabusHTML}
                </div>
            </div>
        `;
    });

    timelineContainer.innerHTML = timelineHTML;
}

// Syllabus View Functions
function showExamSyllabus(examId) {
    if (!currentSemesterData || !currentSemesterData.exams) return;

    // Find the exam by ID or index
    const exam = currentSemesterData.exams.find(e => (e.id || '').toString() === examId.toString()) ||
        currentSemesterData.exams[parseInt(examId)];

    if (!exam) return;

    const slider = document.getElementById('examModalSlider');
    const titleEl = document.getElementById('syllabusSubjectTitle');
    const contentEl = document.getElementById('syllabusFullContent');
    const bannerImg = document.getElementById('syllabusBannerImg');

    if (!slider || !titleEl || !contentEl) return;

    // Update syllabus view content
    titleEl.textContent = `${exam.subject} Syllabus`;

    // Set banner image
    if (bannerImg) {
        if (exam.image) {
            bannerImg.src = exam.image;
            bannerImg.style.display = 'block';
        } else {
            // Placeholder: Use a solid dark color or a generic pattern
            bannerImg.src = '';
            bannerImg.style.display = 'none'; // Will show the .syllabus-banner-img background
        }
    }

    // Joint syllabus array into a single string for markdown parsing
    const syllabusText = Array.isArray(exam.syllabus) ? exam.syllabus.join('\n\n') : (exam.syllabus || '');
    contentEl.innerHTML = parseSyllabusMarkdown(syllabusText);

    // Slide to syllabus page
    slider.classList.add('show-syllabus');

    // Reset scroll
    contentEl.scrollTop = 0;

    // Haptic feedback
    if (window.MaterioHaptics) {
        window.MaterioHaptics.vibrate('light');
    }
}

function showExamTimeline() {
    const slider = document.getElementById('examModalSlider');
    if (!slider) return;

    // Slide back to timeline
    slider.classList.remove('show-syllabus');

    // Haptic feedback
    if (window.MaterioHaptics) {
        window.MaterioHaptics.vibrate('light');
    }
}



function parseSyllabusMarkdown(text) {
    if (!text) return '';

    // Handle literal '\n' strings converted from JSON if any
    let formattedText = text.replace(/\\n/g, '\n');

    // Basic markdown parsing
    let html = formattedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold **text**
        .replace(/__(.*?)__/g, '<strong>$1</strong>');     // Bold __text__

    // Split into lines to handle lists and paragraphs properly
    const lines = html.split('\n');
    let inList = false;
    let result = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            if (inList) {
                result += '</ul>';
                inList = false;
            }
            return;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) {
                result += '<ul>';
                inList = true;
            }
            result += `<li>${trimmed.substring(2)}</li>`;
        } else {
            if (inList) {
                result += '</ul>';
                inList = false;
            }
            // If it's a normal line, wrap in a div or p if it's meant to be a block
            result += `<p>${trimmed}</p>`;
        }
    });

    if (inList) result += '</ul>';

    return result;
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
    const modal = document.getElementById('examModal');
    if (modal && e.target === modal) {
        closeExamModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeExamModal();
    }
});

// Expose functions globally
window.openExamModal = openExamModal;
window.closeExamModal = closeExamModal;
window.showExamSyllabus = showExamSyllabus;
window.showExamTimeline = showExamTimeline;

// ================================================
// SEATING LOOKUP
// ================================================
let seatingData = null; // Cached CSV data
const SEATING_LS_KEY = 'usr_enr';

async function fetchSeatingData() {
    if (seatingData) return seatingData;
    try {
        const response = await fetch('/assets/data/seating_data.csv');
        if (!response.ok) throw new Error('CSV not found');
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        seatingData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= headers.length) {
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = (values[idx] || '').trim();
                });
                seatingData.push(row);
            }
        }
        return seatingData;
    } catch (e) {
        console.error('[SeatingLookup] Error fetching CSV:', e);
        return null;
    }
}

async function lookupSeating() {
    const input = document.getElementById('enrollmentInput');
    const inputRow = document.getElementById('seatingInputRow');
    const resultDiv = document.getElementById('seatingResult');
    const resultText = document.getElementById('seatingResultText');
    if (!input || !resultDiv || !resultText) return;

    const enrollment = input.value.trim();
    if (!enrollment) {
        input.focus();
        return;
    }

    // Show loading state
    const searchBtn = document.getElementById('seatingSearchBtn');
    if (searchBtn) searchBtn.innerHTML = '<i class="fa-regular fa-loader fa-spin"></i>';

    const data = await fetchSeatingData();

    // Restore button
    if (searchBtn) searchBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';

    if (!data) {
        resultText.textContent = 'Could not load seating data';
        resultDiv.className = 'seating-result not-found';
        resultDiv.style.display = 'flex';
        inputRow.style.display = 'none';
        return;
    }

    // Search for enrollment number
    const match = data.find(row => row.enrollment_no === enrollment);

    if (match) {
        const room = match.room_no || '—';
        const bench = match.bench_no || '—';
        resultText.innerHTML = `<i class="fa-regular fa-location-dot"></i> Room ${room} · Bench ${bench}`;
        resultDiv.className = 'seating-result';
        // Save to localStorage
        try { localStorage.setItem(SEATING_LS_KEY, enrollment); } catch (e) { }
    } else {
        resultText.innerHTML = 'Enrollment not found';
        resultDiv.className = 'seating-result not-found';
    }

    resultDiv.style.display = 'flex';
    inputRow.style.display = 'none';
}

function clearSeatingLookup() {
    const input = document.getElementById('enrollmentInput');
    const inputRow = document.getElementById('seatingInputRow');
    const resultDiv = document.getElementById('seatingResult');
    if (input) input.value = '';
    if (inputRow) inputRow.style.display = 'flex';
    if (resultDiv) resultDiv.style.display = 'none';
    // Remove from localStorage
    try { localStorage.removeItem(SEATING_LS_KEY); } catch (e) { }
}

// Auto-load saved enrollment when modal opens
function initSeatingLookup() {
    try {
        const saved = localStorage.getItem(SEATING_LS_KEY);
        if (saved) {
            const input = document.getElementById('enrollmentInput');
            if (input) {
                input.value = saved;
                lookupSeating();
            }
        }
    } catch (e) { }
}

// Enter key support for enrollment input
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'enrollmentInput') {
        e.preventDefault();
        lookupSeating();
    }
});

window.lookupSeating = lookupSeating;
window.clearSeatingLookup = clearSeatingLookup;
window.initSeatingLookup = initSeatingLookup;

