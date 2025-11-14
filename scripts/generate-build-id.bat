@echo off
REM Generate unique build ID and update Jekyll data file
REM This script is run during Netlify build process

echo Generating build ID...

REM Generate UUID using node
for /f %%i in ('node -e "console.log(require('crypto').randomUUID())"') do set BUILD_ID=%%i

REM Get current timestamp
for /f "tokens=1-4 delims=/ " %%i in ('date /t') do set BUILD_DATE=%%i-%%j-%%k
for /f "tokens=1-2 delims=: " %%i in ('time /t') do set BUILD_TIME=%%i:%%j

echo Build ID: %BUILD_ID%
echo Timestamp: %BUILD_DATE% %BUILD_TIME%

REM Update the Jekyll data file
(
echo # Build ID generated during Netlify build
echo # This file is automatically updated during deployment
echo build_id: "%BUILD_ID%"
echo build_timestamp: "%BUILD_DATE% %BUILD_TIME% UTC"
) > _data\build_id.yml

REM Maintain build history in JSON format
set HISTORY_FILE=_data\build_history.json

REM Check if history file exists
if exist "%HISTORY_FILE%" (
    REM File exists, we'll append to it
    echo Updating existing build history...
) else (
    REM Create new history file
    echo [] > "%HISTORY_FILE%"
    echo Created new build history file...
)

REM Create build entry using Node.js for proper JSON handling
node -e "
const fs = require('fs');
const historyPath = '_data/build_history.json';
let history = [];

try {
    if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
} catch (e) {
    history = [];
}

const buildEntry = {
    build_id: '%BUILD_ID%',
    timestamp: new Date().toISOString(),
    date: '%BUILD_DATE%',
    time: '%BUILD_TIME%',
    build_number: history.length + 1
};

history.unshift(buildEntry);
if (history.length > 100) history.splice(100);

fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
console.log('Build history updated: ' + historyPath + ' (' + history.length + ' builds recorded)');
"

echo Build ID file updated successfully!
echo Build history maintained in %HISTORY_FILE%
