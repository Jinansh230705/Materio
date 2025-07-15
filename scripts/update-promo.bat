@echo off
echo Updating promo.json files...

if exist "assets\data\promo.json" (
    echo Source file exists: assets\data\promo.json
) else (
    echo WARNING: Source file not found: assets\data\promo.json
)

if exist "_site\assets\data\promo.json" (
    echo Site file exists: _site\assets\data\promo.json
) else (
    echo WARNING: Site file not found: _site\assets\data\promo.json
)

echo.
echo To update the promo.json files:
echo 1. Copy the JSON from your clipboard
echo 2. Replace the content in assets\data\promo.json
echo 3. Replace the content in _site\assets\data\promo.json
echo 4. The changes will take effect immediately

pause
