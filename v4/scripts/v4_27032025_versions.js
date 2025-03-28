window.addEventListener("DOMContentLoaded", function() {
    var url = window.location.href;
    var branch = "stable";
    if (url.indexOf("/channels/") !== -1) {
        branch = "channels";
    } else if (url.indexOf("/labs") !== -1) {
        branch = "labs";
    }
    fetch('https://materioa.netlify.app/v4/data/releases.json')
        .then(function(response) {
            return response.json();
        })
        .then(function(releases) {
            var releaseFound = null;
            for (var i = 0; i < releases.length; i++) {
                if (releases[i].branch.toLowerCase() === branch) {
                    releaseFound = releases[i];
                    break;
                }
            }
            if (releaseFound) {
                var versionElem = document.getElementById("versionInfoText");
                var buildElem = document.getElementById("buildInfoText");
                var logElem = document.getElementById("changeLogContent");
                versionElem.textContent = "Version: " + releaseFound.version;
                buildElem.textContent = "Build: " + releaseFound.build;
                if (Array.isArray(releaseFound.logs)) {
                    var html = "";
                    for (var j = 0; j < releaseFound.logs.length; j++) {
                        html += "<p>" + releaseFound.logs[j] + "</p>";
                    }
                    logElem.innerHTML = html;
                } else {
                    logElem.textContent = releaseFound.logs;
                }
            } else {
                document.getElementById("changeLogContent").textContent = "No changelog available for this branch.";
            }
        })
        .catch(function(err) {
            console.error("Error loading releases:", err);
        });
});