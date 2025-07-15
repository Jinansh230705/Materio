# PowerShell script to update promo.json files
param(
    [Parameter(Mandatory=$true)]
    [string]$JsonContent
)

$ErrorActionPreference = "Stop"

try {
    Write-Host "Updating promo.json files..." -ForegroundColor Yellow
    
    # Define file paths
    $sourceFile = "assets\data\promo.json"
    $siteFile = "_site\assets\data\promo.json"
    
    # Update source file
    if (Test-Path $sourceFile) {
        $JsonContent | Out-File -FilePath $sourceFile -Encoding UTF8
        Write-Host "✅ Updated $sourceFile" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Source file not found: $sourceFile" -ForegroundColor Yellow
    }
    
    # Update _site file
    if (Test-Path $siteFile) {
        $JsonContent | Out-File -FilePath $siteFile -Encoding UTF8
        Write-Host "✅ Updated $siteFile" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Site file not found: $siteFile" -ForegroundColor Yellow
    }
    
    Write-Host "✅ Promo.json files updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error updating files: $_" -ForegroundColor Red
    exit 1
}
