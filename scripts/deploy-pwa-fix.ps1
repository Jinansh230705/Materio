# Quick deployment test script for PWA cache fixes (PowerShell version)

Write-Host "Testing PWA Cache Fix Deployment" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Update package version
Write-Host "Updating package version..." -ForegroundColor Yellow
npm version patch --no-git-tag-version

# Get the new version
$packageVersion = (Get-Content package.json | ConvertFrom-Json).version

# Update manifest version to match
Write-Host "Updating manifest version..." -ForegroundColor Yellow
$manifestContent = Get-Content manifest.json -Raw
$manifestContent = $manifestContent -replace '"version": "[^"]*"', "`"version`": `"$packageVersion`""
$manifestContent | Set-Content manifest.json

# Update service worker cache names
Write-Host "Updating service worker cache names..." -ForegroundColor Yellow
$cacheVersion = "v$($packageVersion.Replace('.', '-'))"
$swContent = Get-Content sw.js -Raw
$swContent = $swContent -replace 'materio-v[0-9-]*', "materio-$cacheVersion"
$swContent | Set-Content sw.js

# Create version file for client-side version checking
Write-Host "Creating version file..." -ForegroundColor Yellow
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$versionData = @{
    version = $packageVersion
    timestamp = $timestamp
    cache = "materio-$cacheVersion"
} | ConvertTo-Json -Compress
$versionData | Set-Content version.json

Write-Host "Version updates complete!" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Package: $packageVersion" -ForegroundColor White
Write-Host "   Cache: materio-$cacheVersion" -ForegroundColor White
Write-Host ""
Write-Host "Ready for deployment!" -ForegroundColor Green
Write-Host "Users will see updates within 2-10 minutes after deployment." -ForegroundColor Yellow
Write-Host ""
Write-Host "Debug URL: Add ?debug=pwa to your URL to see debug panel" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Magenta
Write-Host "   1. Run: netlify deploy --prod" -ForegroundColor White
Write-Host "   2. Monitor users get update notifications" -ForegroundColor White
Write-Host "   3. Users with old PWA will get automatic update prompts" -ForegroundColor White
