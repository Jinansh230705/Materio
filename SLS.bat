@echo off
setlocal

echo Choose the development server to start:
echo 1. Jekyll 
echo 2. Netlify 
set /p choice="Enter 1 or 2: "

if "%choice%"=="1" (
    echo Starting Jekyll server...
    bundle exec jekyll serve
) else if "%choice%"=="2" (
    echo Starting Netlify server...
    netlify dev
) else (
    echo Invalid choice. Please run the script again.
)

endlocal
pause
