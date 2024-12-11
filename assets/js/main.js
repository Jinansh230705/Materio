 // JavaScript for tab switching
        function changeTab(tab) {
            const resourcesTab = document.getElementById('resourcesTab');
            const chatTab = document.getElementById('chatTab');
            const welcomeSection = document.getElementById('welcomeSection');
            const resourceForm = document.getElementById('resourceForm');
            const contentDisplay = document.getElementById('contentDisplay');
            const giscus = document.getElementById('giscus');

            if (tab === 'resources') {
                resourcesTab.classList.add('active');
                chatTab.classList.remove('active');
                welcomeSection.style.display = 'block';
                resourceForm.style.display = 'block';
                contentDisplay.style.display = 'block';
                giscus.style.visibility = 'hidden';
                giscus.style.height = '0';
            } else if (tab === 'chat') {
                resourcesTab.classList.remove('active');
                chatTab.classList.add('active');
                welcomeSection.style.display = 'none';
                resourceForm.style.display = 'none';
                contentDisplay.style.display = 'none';
                giscus.style.visibility = 'visible';
                giscus.style.height = 'auto';
            }
        }

        
        window.onload = function() {
            populateSubjects();
            changeTab('resources'); // Hide the Giscus comment section when the page loads
        }


        // JavaScript for form handling
        const subjects = {
            '1': {
                'oss': ['intro', 'case study', 'principles'],
                'maths-1': ['fode', 'matrices', 'multivariable'],
                'ctsd': ['pointers', 'loops', 'arrays', 'strings'],
                'eee': ['semiconductors', 'sensors', 'diode']
            },
            '2': {
                'CTSD-2': ['DMA', 'Preprocessor Directives', 'Enumerators, Structures, Unions', 'Searching and Sorting', 'Data Structures: List-Linear List'],
                'Maths-2': ['HODE', 'Power Series', 'Laplace Transform', 'Fourier Integral', 'Vector Calculus', 'Multivariable Calculus (Integration)','Tutorial 1A', 'Tutorial 1B', 'Tutorial 2', 'Tutorial 3', 'Assignment 1', 'Assignment 2', 'Assignment 5', 'Question Bank 1', 'Question Bank 2','PYQ_19.11.22', 'PYQ_15.05.23', 'PYQ_18.01.24'],
                'E-Physics': ['Modern Physics', 'Band Theory and Semiconductors', 'Materials', 'Laser and Fibre optics', 'Devices', 'Book for Optical Fibre', 'Book for Laser', 'Question Bank 1','Assignment 1', 'Assignment 2', 'Important Questions'],
                'GCF': ['Cloud Concepts', 'Azure Services', 'Security, Privacy, Compliance, and Trust', 'Azure Pricing and Support', 'Azure SLA and Service Lifecycles', 'Azure Question Bank', 'Assignment 1', 'Important Questions', 'QB for Mid Sem'],
                'DT': ['Overview of Design Thinking', 'Defining Needs, Ideation for Solutions,Prototyping', 'Testing the solution,Problem Solving Mindset', 'Human Centered Design, Design for the Enviroment', 'Design Thinking and Innovation Management Culture'],
                'ICT': ['Lab'],
                'ACTW': ['Developing Effective Listening Skills', 'Error Analysis', 'Delivering Different Types of Speeches', 'Professional Presentations', 'Essay writting', 'Reading Comprehension', 'Project Proposal', 'Misplaced Modifiers', 'Movie Review', 'Narrative Writting', 'Writting Reports', 'Critical Thinking', 'Activity Session (Presentation)'],

            },
            '3': {
                'Object Oriented Programming with Java': ['Design Introduction', 'Data types,variable,operators', 'Control Statements', 'Arrays', 'Object Oriented Programming', 'Inheritance', 'Strings, Packages and interfaces', 'Exception Handling', 'Multi Threading', 'Collections Framework'],
                'Design of Data Structures': ['Introduction', 'Stacks, Recursion and Queue', 'Linked Lists', 'Searching and Sorting', 'Trees', 'Red Black Trees and AVL Trees', 'Hashing', 'Graphs'],
                'Database Management Systems': [],
                'Discrete Mathematics': [],
                'Digital Electronics': [],
                'Professional Communication Skills': [],

            }
            
        };

        function populateSubjects() {
            const semesterSelect = document.getElementById('semesterSelect');
            const subjectSelect = document.getElementById('subjectSelect');
            const semester = semesterSelect.value;
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

        function populateChapters() {
            const semesterSelect = document.getElementById('semesterSelect');
            const subjectSelect = document.getElementById('subjectSelect');
            const chapterSelect = document.getElementById('chapterSelect');
            const semester = semesterSelect.value;
            const subject = subjectSelect.value;
            const chapterList = subjects[semester][subject];
            chapterSelect.innerHTML = '';
            for (let chapter of chapterList) {
                let option = document.createElement('option');
                option.value = chapter;
                option.text = chapter;
                chapterSelect.appendChild(option);
            }
        }

        function displayContent() {
    const semesterSelect = document.getElementById('semesterSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    const semester = semesterSelect.value;
    const subject = subjectSelect.value;
    const chapter = chapterSelect.value;

    // Get the URL of the PDF file based on the selected semester, subject, and chapter
    // This depends on how you store and access the PDF files
    const pdfUrl = getPdfUrl(semester, subject, chapter);

    const contentDisplay = document.getElementById('contentDisplay');

   // Create an Adobe DC View instance
var adobeDCView = new AdobeDC.View({clientId: "9861b9fc546a4db9a108c724eb9e9b75", divId: "contentDisplay"});

// Configure the view
var previewFilePromise = adobeDCView.previewFile({
    content: {location: {url: pdfUrl}},
    metaData: {fileName: pdfUrl.split("/").slice(-1)[0]}
}, {embedMode: "SIZED_CONTAINER"});

  

function getPdfUrl(semester, subject, chapter) {
     // This function should return the URL of the PDF file based on the selected semester, subject, and chapter
     // The implementation of this function depends on how you store and access the PDF files
     // For the sake of this example, let's assume that the PDF files are stored in a 'pdfs' folder in the same directory as this HTML file
     var pdfUrl = `pdfs/${semester}/${subject}/${chapter}.pdf`;
     return pdfUrl;
        }
}
        window.onload = function() {
            populateSubjects();
        }