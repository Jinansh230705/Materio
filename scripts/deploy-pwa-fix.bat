@echo off
REM Quick deployment test script for PWA cache fixes (Windows)

echo 🚀 Testing PWA Cache Fix Deployment
echo ==================================

REM Update package version
echo 📦 Updating package version...
call npm version patch --no-git-tag-version

REM Get the new version
for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set PACKAGE_VERSION=%%i

REM Update manifest version to match
echo 📱 Updating manifest version...
powershell -Command "(Get-Content manifest.json) -replace '\"version\": \"[^\"]*\"', '\"version\": \"%PACKAGE_VERSION%\"' | Set-Content manifest.json"

REM Update service worker cache names  
echo 🔧 Updating service worker cache names...
set CACHE_VERSION=v%PACKAGE_VERSION:.=-%
powershell -Command "(Get-Content sw.js) -replace 'materio-v[0-9-]*', 'materio-%CACHE_VERSION%' | Set-Content sw.js"

echo  Version updates complete!
echo  Summary:
echo    Package: %PACKAGE_VERSION%
echo    Cache: materio-%CACHE_VERSION%
echo.
echo  Ready for deployment!
echo  Users will see updates within 2-10 minutes after deployment.
echo.
echo  Debug URL: Add ?debug=pwa to your URL to see debug panel
pause
