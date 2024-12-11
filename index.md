---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
title: Materio - Home
---
<body>
<div class="content">
        <h1>Welcome to Materio</h1>
    </div>

    <section>
        <img src="https://materioa.netlify.app/static/res/bag.png" alt="Bag" class="right-align">
        <div class="rounded-rectangle">
            Resources
        </div>
        <p>
            Materio is a platform for learning and sharing knowledge. It's a place where you can find resources and chat
            with
            other people about topics that interest you.
        </p>
        <form id="resourceForm">
            <select id="semesterSelect" onchange="populateSubjects()">
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
                <option value="3">3rd Semester</option>
                <option value="4" selected>4th Semester</option>
            </select>
            <select id="subjectSelect" onchange="populateChapters()">
            </select>
            <select id="chapterSelect">
            </select>
            <button type="button" onclick="displayContent()">Submit</button>
        </form>
    </section>

    <section>
        <div class="viewer">
            <div id="contentDisplay"></div>
        </div>
    </section>
     <!-- <script src="https://materioa.netlify.app/static/assets/notify.js"></script> -->
    