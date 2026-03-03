@echo off
setlocal enabledelayedexpansion

:: Handle CLI arguments
if "%1" == "--steam" goto full
if "%1" == "--diesel" goto jekyll
if "%1" == "--ship" goto deploy

:: No args passed, show options menu
echo Select Local Server type:
echo 1. Full - Netlify CLI
echo 2. Blog write - Jekyll only!
echo 3. Deploy to Production
set /p var=Select the operation: 

if "%var%"=="1" goto full
if "%var%"=="2" goto jekyll
if "%var%"=="3" goto deploy

echo Invalid selection
goto end

:full
vercel dev --listen 1000
goto end

:jekyll
bundle exec jekyll serve
goto end

:jekyll-build
jekyll build
goto end

:end
echo.
pause
