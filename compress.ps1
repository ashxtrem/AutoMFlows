# AutoMFlows Project Compression Script for Windows
# Compresses the entire project excluding node_modules and other build artifacts

$ErrorActionPreference = "Stop"

Write-Host "📦 Compressing AutoMFlows project..." -ForegroundColor Blue

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
    ".git",
    ".vscode",
    ".idea",
    ".cache",
    ".temp",
    "coverage",
    ".nyc_output",
    ".npm",
    ".parcel-cache",
    ".next",
    ".nuxt",
    ".vite",
    "test-results",
    "playwright-report",
    "playwright\.cache",
    "screenshots",
    "videos",
    "blob-report",
    "logs",
    "__pycache__",
    "venv",
    "env",
    "ENV",
    "docker\data",
    "docker\volumes"
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

try {
    # Get all files and folders, excluding the patterns
    $filesToCompress = Get-ChildItem -Path . -Recurse -File | Where-Object {
        $file = $_
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
        
        # Check directory exclusions
        $excluded = $false
        foreach ($pattern in $EXCLUDE_PATTERNS) {
            if ($relativePath -match $pattern) {
                $excluded = $true
                break
            }
        }
        
        # Check file exclusions
        if (-not $excluded) {
            foreach ($filePattern in $EXCLUDE_FILES) {
                if ($file.Name -like $filePattern) {
                    $excluded = $true
                    break
                }
            }
        }
        
        return -not $excluded
    }
    
    if ($filesToCompress.Count -eq 0) {
        Write-Host "⚠️  No files found to compress" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Found $($filesToCompress.Count) files to compress..." -ForegroundColor Cyan
    
    # Create temporary directory for compression
    $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    
    # Copy files maintaining directory structure
    foreach ($file in $filesToCompress) {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
        $destPath = Join-Path $tempDir $relativePath
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item $file.FullName -Destination $destPath -Force
    }
    
    # Compress the temporary directory
    Write-Host "Creating archive..." -ForegroundColor Cyan
    Compress-Archive -Path "$tempDir\*" -DestinationPath $ARCHIVE_NAME -Force
    
    # Cleanup temporary directory
    Remove-Item -Path $tempDir -Recurse -Force
    
    # Get archive size
    $archiveSize = (Get-Item $ARCHIVE_NAME).Length
    $archiveSizeMB = [math]::Round($archiveSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "✅ Successfully created archive: $ARCHIVE_NAME" -ForegroundColor Green
    Write-Host "📊 Archive size: $archiveSizeMB MB" -ForegroundColor Blue
    Write-Host "💡 Location: $(Resolve-Path $ARCHIVE_NAME)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✨ Compression complete!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error creating archive: $_" -ForegroundColor Red
    exit 1
}
