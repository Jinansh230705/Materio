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

echo Build ID file updated successfully!
