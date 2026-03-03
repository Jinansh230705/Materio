@echo off
REM Local CDN Server Launcher with CORS
REM Place this file in your cdn-materio root directory

echo.
echo ========================================
echo   Starting Local CDN Server
echo ========================================
echo.

REM Check if cors-server.py exists in scripts folder
if exist "scripts\cors-server.py" (
    echo Using Materio CORS server...
    python scripts\cors-server.py 8080
) else (
    echo cors-server.py not found in scripts folder
    echo Falling back to standard Python server (may have CORS issues)
    echo.
    python -m http.server 8080
)

pause
