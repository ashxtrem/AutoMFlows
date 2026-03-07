# AutoMFlows Project Compression Script for Windows
# Compresses the entire project excluding node_modules and other build artifacts

$ErrorActionPreference = "Stop"

Write-Host "[Compress] Compressing AutoMFlows project..." -ForegroundColor Blue

# Get the project directory name
$PROJECT_NAME = Split-Path -Leaf (Get-Location)
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$ARCHIVE_NAME = "${PROJECT_NAME}_${TIMESTAMP}.zip"

# Define exclusion patterns
$EXCLUDE_PATTERNS = @(
    "node_modules",
    "dist",
    "build",
    "output",
    "\.git",
    "\.vscode",
    "\.idea",
    "\.cache",
    "\.temp",
    "coverage",
    "\.nyc_output",
    "\.npm",
    "\.parcel-cache",
    "\.next",
    "\.nuxt",
    "\.vite",
    "test-results",
    "playwright-report",
    "playwright\\\.cache",
    "screenshots",
    "videos",
    "blob-report",
    "logs",
    "__pycache__",
    "venv",
    "docker\\data",
    "docker\\volumes"
)

$EXCLUDE_FILES = @(
    "*.log",
    "*.tsbuildinfo",
    "*.db",
    "*.sqlite",
    "*.sqlite3",
    ".DS_Store",
    "*.swp",
    "*.swo",
    "*~",
    ".automflows-port",
    ".browserflow-port"
)

function Test-ShouldInclude {
    param([System.IO.FileInfo]$File, [string]$BasePath)
    $relativePath = $File.FullName.Replace($BasePath + "\", "").Replace("\", "/")
    foreach ($pattern in $EXCLUDE_PATTERNS) {
        if ($relativePath -match $pattern) { return $false }
    }
    foreach ($filePattern in $EXCLUDE_FILES) {
        if ($File.Name -like $filePattern) { return $false }
    }
    return $true
}

$basePath = (Get-Location).Path
$filesToCompress = Get-ChildItem -Path . -Recurse -File | Where-Object {
    Test-ShouldInclude -File $_ -BasePath $basePath
}

if ($null -eq $filesToCompress -or $filesToCompress.Count -eq 0) {
    Write-Host "[Warning] No files found to compress" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($filesToCompress.Count) files to compress..." -ForegroundColor Cyan

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("automflows_compress_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    foreach ($file in $filesToCompress) {
        $relativePath = $file.FullName.Replace($basePath + "\", "")
        $destPath = Join-Path $tempDir $relativePath
        $destDir = Split-Path $destPath -Parent

        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        Copy-Item $file.FullName -Destination $destPath -Force
    }

    Write-Host "Creating archive..." -ForegroundColor Cyan
    Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $ARCHIVE_NAME -Force

    $archiveSize = (Get-Item $ARCHIVE_NAME).Length
    $archiveSizeMB = [math]::Round($archiveSize / 1MB, 2)

    Write-Host ""
    Write-Host "[OK] Successfully created archive: $ARCHIVE_NAME" -ForegroundColor Green
    Write-Host "[Size] Archive size: $archiveSizeMB MB" -ForegroundColor Blue
    Write-Host "[Path] Location: $(Resolve-Path $ARCHIVE_NAME)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[Done] Compression complete!" -ForegroundColor Green
}
catch {
    $errMsg = $_.Exception.Message
    Write-Host "[Error] Failed to create archive: $errMsg" -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
