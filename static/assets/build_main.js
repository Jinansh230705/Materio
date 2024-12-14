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


        window.onload = function () {
            populateSubjects();
            changeTab('resources'); // Hide the Giscus comment section when the page loads
        }


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
                'Maths-2': ['HODE', 'Power Series', 'Laplace Transform', 'Fourier Integral', 'Vector Calculus', 'Multivariable Calculus (Integration)', 'Tutorial 1A', 'Tutorial 1B', 'Tutorial 2', 'Tutorial 3', 'Assignment 1', 'Assignment 2', 'Assignment 5', 'Question Bank 1', 'Question Bank 2', 'PYQ_19.11.22', 'PYQ_15.05.23', 'PYQ_18.01.24'],
                'E-Physics': ['Modern Physics', 'Band Theory and Semiconductors', 'Materials', 'Laser and Fibre optics', 'Devices', 'Book for Optical Fibre', 'Book for Laser', 'Question Bank 1', 'Assignment 1', 'Assignment 2', 'Important Questions'],
                'GCF': ['Cloud Concepts', 'Azure Services', 'Security, Privacy, Compliance, and Trust', 'Azure Pricing and Support', 'Azure SLA and Service Lifecycles', 'Azure Question Bank', 'Assignment 1', 'Important Questions', 'QB for Mid Sem'],
                'DT': ['Overview of Design Thinking', 'Defining Needs, Ideation for Solutions,Prototyping', 'Testing the solution,Problem Solving Mindset', 'Human Centered Design, Design for the Enviroment', 'Design Thinking and Innovation Management Culture'],
                'ICT': ['Lab'],
                'ACTW': ['Developing Effective Listening Skills', 'Error Analysis', 'Delivering Different Types of Speeches', 'Professional Presentations', 'Essay writting', 'Reading Comprehension', 'Project Proposal', 'Misplaced Modifiers', 'Movie Review', 'Narrative Writting', 'Writting Reports', 'Critical Thinking', 'Activity Session (Presentation)'],

            },
            '3': {
                'Object Oriented Programming with Java': ['Design Introduction', 'Data types,variable,operators', 'Control Statements', 'Arrays', 'Object Oriented Programming', 'Inheritance', 'Strings, Packages and interfaces', 'Exception Handling', 'Multi Threading', 'Collections Framework'],
                'Design of Data Structures': ['Introduction', 'Stacks, Recursion and Queue', 'Linked Lists', 'Searching and Sorting', 'Trees', 'Red Black Trees and AVL Trees', 'Hashing', 'Graphs', 'DSA Using C - 2nd Edition'],
                'Database Management Systems': ['Introduction', 'SQL', 'Data Models', 'Relational Data Model', 'Relational Database Design', 'Transaction', 'Query Processing', 'Security', 'PL/SQL Concepts'],
                'Discrete Mathematics': ['Sets, Relation and Function', ' Principles of Mathematical Induction', 'Propositional Logic', 'Algebraic Structures and Morphism', 'Graphs and Trees'],
                'Digital Electronics': ['Fundamentals of Digital Systems and logicfamilies', 'Minimization Techniques', 'Combinational Digital Circuits', 'SEQUENTIAL CIRCUITS', 'A/D and D/A Converters', 'Semiconductor Memories And Programmable Logic Devices'],
                'Professional Communication Skills': [],

            },
            '4': {
                'Operating System':['Syllabus', 'Syllabus-lab', 'Introduction', 'Processes, Thread & Process Scheduling', 'Inter-Process Communictaion','Deadlocks', 'Memory Management', 'Virtual Memory', 'IO Systems', 'IO Systems, File & Disk Management'],
                'Computer Organization and Microprocessor':['Syllabus', 'Syllabus-Lab', 'Introduction to Microprocessor 8085', 'Microprocessor Architecture and Interfacing', 'Programming Methods with Instructions', 'Additional Programming Techniques', '8085 Interrupts', 'Computer Organization - Register Transfer and Basic Computer Design Register Transfer','Computer Organization - Assembler and Memory Organization'],
                'Computer Network':['Syllabus', 'Syllabus-Lab', 'Data Communication Components', 'Data Link Layer and Medium Acess Sub Layer', 'Network Layer', 'Transport Layer','Application Layer'],
                'Programming in Python with Full Stack':['Syllabus','Syllabus-lab', 'Introduction to Python Programmning', 'Functions', 'Modules and Packages', 'Flask Framework', 'Django Framework', 'RESTful APIs'],
                'Probability, Statistics and Numerical Methods':['Syllabus', 'Correlation, Regression and Curve fitting', 'Probability and Probability Distributions', 'Testing of Hypothesis', 'Finite Differences and Interpolation', 'Numerical Integration'],
                'Professional Grooming and Personality Development':['Syllabus', 'Slef Development and Assesment', 'Corporate Etiquette', 'Public Speaking', 'Reading Skills Activity & Reading Comprehension', 'Listening Skills- Inquiry Based Listening Questions'],
                'Competitive Coding':['Syllabus'],
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
  
  // Function to initialize the Adobe DC View and display the PDF
  async function displayContent() {
    const semesterSelect = document.getElementById('semesterSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    const semester = semesterSelect.value;
    const subject = subjectSelect.value;
    const chapter = chapterSelect.value;
  
    // Get the URL of the PDF file based on the selected semester, subject, and chapter
    const pdfUrl = getPdfUrl(semester, subject, chapter);
  
    const contentDisplay = document.getElementById('contentDisplay');
  
    try {
      // Fetch the Adobe client ID dynamically
      const clientId = await getAdobeClientId();
  
      // Create an Adobe DC View instance with the dynamically fetched clientId
      var adobeDCView = new AdobeDC.View({ clientId: clientId, divId: "contentDisplay" });
  
      // Configure the view
      adobeDCView.previewFile({
        content: { location: { url: pdfUrl } },
        metaData: { fileName: pdfUrl.split("/").slice(-1)[0] }
      }, { embedMode: "SIZED_CONTAINER" });
  
    } catch (err) {
      console.error("Error initializing Adobe DC View:", err);
      alert("Failed to load the document viewer. Please try again later.");
    }
  }
  
  // Function to generate the PDF URL
  function getPdfUrl(semester, subject, chapter) {
    // Example base URL for PDFs
    var baseUrl = 'https://cdn-materioa.netlify.app/pdfs';
    var pdfUrl = `${baseUrl}/${semester}/${subject}/${chapter}.pdf`;
    return pdfUrl;
  }
  
  window.onload = function () {
    populateSubjects(); // Your function to populate subjects
  };
  
