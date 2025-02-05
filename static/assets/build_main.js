function toggleSettingsDialog() {
    var dialog = document.getElementById('settings-dialog');
    if (dialog.style.display === 'none') {
        dialog.style.display = 'block';
    } else {
        dialog.style.display = 'none';
    }
}

document.getElementById('notification-bell').onclick = function () {
    document.getElementById('notification-dialog').style.display = 'block';
}

document.getElementById('close-notification-dialog').onclick = function () {
    document.getElementById('notification-dialog').style.display = 'none';
}

window.onclick = function (event) {
    if (event.target == document.getElementById('notification-dialog')) {
        document.getElementById('notification-dialog').style.display = 'none';
    }
}

let subjects = {};
const semesterMapping = {
    "1": "1st Semester",
    "2": "2nd Semester",
    "3": "3rd Semester",
    "4": "4th Semester",
    "9": "Miscelleneous"
};
fetch('https://cdn-materioa.netlify.app/subjects.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        subjects = data;
        populateSemester();
        populateSubjects();
    })
    .catch(error => {
        console.error('Error loading subjects:', error);
    });

function populateSemester() {
    const semesterSelect = document.getElementById('semesterSelect');
    semesterSelect.innerHTML = '';
    for (let semester in subjects) {
        let option = document.createElement('option');
        option.value = semester;
        option.text = semesterMapping[semester] || semester;
        if (semester === "4") {
            option.selected = true;
        }
        semesterSelect.appendChild(option);
    }
}

function populateSubjects() {
    const semesterSelect = document.getElementById('semesterSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const semester = semesterSelect.value;
    if (subjects[semester]) {
        const subjectList = subjects[semester];
        subjectSelect.innerHTML = '';
        for (let subject in subjectList) {
            let option = document.createElement('option');
            option.value = subject;
            option.text = subject;
            subjectSelect.appendChild(option);
        }
        populateChapters();
    }
}


function populateChapters() {
    const semesterSelect = document.getElementById('semesterSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    const semester = semesterSelect.value;
    const subject = subjectSelect.value;
    chapterSelect.innerHTML = '';
    if (subjects[semester] && subjects[semester][subject]) {
        const chapterList = subjects[semester][subject];
        for (let chapter of chapterList) {
            let option = document.createElement('option');
            option.value = chapter;
            option.text = chapter;
            chapterSelect.appendChild(option);
        }
    }
}

// Function to fetch the Adobe client ID securely from Netlify Functions
async function getAdobeClientId() {
    const response = await fetch('/.netlify/functions/getAdobeClientId'); // Call the serverless function
    const data = await response.json();
    if (data.clientId) {
        return data.clientId;
    } else {
        throw new Error("Failed to fetch Adobe Client ID");
    }
}

async function displayContent() {
    const semesterSelect = document.getElementById('semesterSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    const semester = semesterSelect.value;
    const subject = subjectSelect.value;
    const chapter = chapterSelect.value;
    const pdfUrl = getPdfUrl(semester, subject, chapter);

    const contentDisplay = document.getElementById('contentDisplay');

    try {
        const clientId = await getAdobeClientId();
        var adobeDCView = new AdobeDC.View({ clientId: clientId, divId: "contentDisplay" });
        adobeDCView.previewFile({
            content: { location: { url: pdfUrl } },
            metaData: { fileName: pdfUrl.split("/").slice(-1)[0] }
        }, { embedMode: "SIZED_CONTAINER", enableAnnotationAPIs: true });
    } catch (err) {
        console.error("Error initializing Adobe DC View:", err);
        alert("Failed to load the document viewer. Please try again later.");
    }
}

function getPdfUrl(semester, subject, chapter) {
    var baseUrl = 'https://cdn-materioa.netlify.app/pdfs';
    var pdfUrl = `${baseUrl}/${semester}/${subject}/${chapter}.pdf`;
    return pdfUrl;
}

window.onload = function () {
    populateSubjects();
};

//GA4 Measurements
function setupTracking(viewer) {
    viewer.registerCallback(
        AdobeDC.View.Enum.CallbackType.PAGE_VIEW,
        function (event) {
            console.log("Page viewed:", event.data.pageNumber);
            gtag('event', 'pdf_page_view', {
                event_category: 'Adobe PDF',
                event_label: 'Page ' + event.data.pageNumber
            });
        }
    );
    viewer.registerCallback(
        AdobeDC.View.Enum.CallbackType.DOCUMENT_SCROLL,
        function () {
            console.log("Document scrolled");
            gtag('event', 'pdf_scroll', {
                event_category: 'Adobe PDF',
                event_label: 'User scrolled'
            });
        }
    );

    viewer.registerCallback(
        AdobeDC.View.Enum.CallbackType.ZOOM_LEVEL_CHANGED,
        function (event) {
            console.log("Zoom level changed:", event.data.zoomLevel);
            gtag('event', 'pdf_zoom', {
                event_category: 'Adobe PDF',
                event_label: 'Zoom level: ' + event.data.zoomLevel,
                value: event.data.zoomLevel
            });
        }
    );
    viewer.registerCallback(
        AdobeDC.View.Enum.CallbackType.ANNOTATION_ADDED,
        function (event) {
            console.log("Annotation added:", event.data);
            gtag('event', 'pdf_annotation', {
                event_category: 'Adobe PDF',
                event_label: 'Annotation added'
            });
        }
    );
    viewer.registerCallback(
        AdobeDC.View.Enum.CallbackType.FULLSCREEN_MODE_CHANGED,
        function (event) {
            console.log("Fullscreen mode:", event.data.isFullScreen);
            gtag('event', 'pdf_fullscreen', {
                event_category: 'Adobe PDF',
                event_label: event.data.isFullScreen ? 'Entered Fullscreen' : 'Exited Fullscreen'
            });
        }
    );
    setInterval(() => {
        gtag('event', 'pdf_engagement', {
            event_category: 'Adobe PDF',
            event_label: 'Active reading session',
            engagement_time: 15
        });
    }, 15000);
}
