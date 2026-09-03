#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$ArchiveName = 'legoparts-production.zip'
$ArchivePath = Join-Path $Root $ArchiveName
$StageRoot = Join-Path $env:TEMP "legoparts-production-$([Guid]::NewGuid().ToString('N'))"
$Stage = Join-Path $StageRoot 'legoparts'

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

try {
    Write-Step 'Building frontend'
    Push-Location (Join-Path $Root 'web')
    if (-not (Test-Path 'node_modules')) {
        npm ci
    }
    npm run build
    Pop-Location

    Write-Step 'Installing production PHP dependencies'
    Push-Location $Root
    composer install --no-dev --optimize-autoloader --no-interaction
    Pop-Location

    Write-Step 'Staging production files'
    New-Item -ItemType Directory -Path $Stage | Out-Null

    $directories = @(
        'app',
        'assets',
        'bootstrap',
        'config',
        'database',
        'public',
        'routes',
        'storage',
        'vendor'
    )

    foreach ($directory in $directories) {
        $source = Join-Path $Root $directory
        if (Test-Path $source) {
            Copy-Item -Path $source -Destination (Join-Path $Stage $directory) -Recurse -Force
        }
    }

    $files = @(
        '.env.example',
        '.htaccess',
        'artisan',
        'composer.json',
        'composer.lock',
        'favicon.svg',
        'icons.svg',
        'index.html',
        'index.php',
        'no-color.png'
    )

    foreach ($file in $files) {
        $source = Join-Path $Root $file
        if (Test-Path $source) {
            Copy-Item -Path $source -Destination (Join-Path $Stage $file) -Force
        }
    }

    Get-ChildItem -Path (Join-Path $Stage 'storage\logs') -File -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Path (Join-Path $Stage 'storage\framework\cache\data') -File -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Path (Join-Path $Stage 'storage\framework\sessions') -File -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Path (Join-Path $Stage 'storage\framework\views') -File -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Path (Join-Path $Stage 'bootstrap\cache') -File -Filter '*.php' -ErrorAction SilentlyContinue | Remove-Item -Force

    if (Test-Path $ArchivePath) {
        Remove-Item $ArchivePath -Force
    }

    Write-Step "Creating archive: $ArchiveName"
    Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath $ArchivePath -CompressionLevel Optimal

    $sizeMb = [Math]::Round((Get-Item $ArchivePath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "Production archive ready: $ArchivePath ($sizeMb MB)" -ForegroundColor Green
    Write-Host ""
    Write-Host 'Deploy steps:'
    Write-Host '  1. Upload and extract the archive to the web root (keep existing uploads/ on server)'
    Write-Host '  2. Copy .env.example to .env and configure database/admin keys'
    Write-Host '  3. Run: php artisan key:generate'
    Write-Host '  4. Run: php artisan migrate --force'
    Write-Host '  5. Run: php artisan db:seed --force'
    Write-Host '  6. Ensure storage/ and bootstrap/cache/ are writable'
    Write-Host '  7. Run: php artisan config:cache && php artisan route:cache'
}
finally {
    if (Test-Path $StageRoot) {
        Remove-Item $StageRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
