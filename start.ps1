# AutoMFlows Startup Script for Windows
# This script installs dependencies, builds the shared package, and starts both backend and frontend servers

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting AutoMFlows..." -ForegroundColor Cyan

# Function to cleanup on exit
function Cleanup {
    Write-Host "`nShutting down servers..." -ForegroundColor Yellow
    if ($script:BACKEND_PROCESS) {
        try {
            if (!$script:BACKEND_PROCESS.HasExited) {
                Stop-Process -Id $script:BACKEND_PROCESS.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Ignore errors
        }
    }
    if ($script:FRONTEND_PROCESS) {
        try {
            if (!$script:FRONTEND_PROCESS.HasExited) {
                Stop-Process -Id $script:FRONTEND_PROCESS.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Ignore errors
        }
    }
    exit 0
}

# Note: Ctrl+C will be handled by the try-finally block below

# Step 1: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: npm install failed. Continuing anyway..." -ForegroundColor Yellow
}

# Step 2: Install Playwright browsers
Write-Host "🌐 Installing Playwright browsers..." -ForegroundColor Blue
Push-Location backend
try {
    npx playwright install chromium 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Chromium installation failed. You may need to install manually." -ForegroundColor Yellow
    }
    
    npx playwright install firefox 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Firefox installation failed. You may need to install manually." -ForegroundColor Yellow
    }
    
    npx playwright install webkit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: WebKit installation failed. You may need to install manually." -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# Step 3: Build shared package
Write-Host "🔨 Building shared package..." -ForegroundColor Blue
Push-Location shared
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to build shared package" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# Step 4: Start backend server
Write-Host "🔧 Starting backend server..." -ForegroundColor Green
$backendProcessInfo = Start-Process -FilePath "npm" -ArgumentList "run", "dev:backend" -PassThru -WindowStyle Hidden
$script:BACKEND_PROCESS = $backendProcessInfo
Write-Host "Backend started (PID: $($backendProcessInfo.Id))"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Step 5: Start frontend server
Write-Host "🎨 Starting frontend server..." -ForegroundColor Green
$frontendProcessInfo = Start-Process -FilePath "npm" -ArgumentList "run", "dev:frontend" -PassThru -WindowStyle Hidden
$script:FRONTEND_PROCESS = $frontendProcessInfo
Write-Host "Frontend started (PID: $($frontendProcessInfo.Id))"

# Wait a bit for frontend to start
Start-Sleep -Seconds 3

# Wait a bit more for servers to fully start and port file to be written
Start-Sleep -Seconds 2

# Step 6: Read backend port from file (with retry)
$BACKEND_PORT = "3003"
for ($i = 1; $i -le 5; $i++) {
    if (Test-Path ".automflows-port") {
        try {
            $portContent = Get-Content ".automflows-port" -Raw -ErrorAction SilentlyContinue
            if ($portContent) {
                $BACKEND_PORT = $portContent.Trim()
                if ($BACKEND_PORT -and $BACKEND_PORT -ne "3003") {
                    break
                }
            }
        } catch {
            # Ignore errors
        }
    }
    Start-Sleep -Seconds 1
}

# Step 7: Detect actual frontend port (Vite may use a different port if 5173 is taken)
$FRONTEND_PORT = 5173

# Try to use Get-NetTCPConnection (requires admin or works in some cases)
try {
    $connections = Get-NetTCPConnection -LocalPort 5173,5174,5175,5176,5177,5178,5179,5180 -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($port in @(5173,5174,5175,5176,5177,5178,5179,5180)) {
            $conn = $connections | Where-Object { $_.LocalPort -eq $port }
            if ($conn) {
                # Check if it's likely our Vite process
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($process -and ($process.ProcessName -like "*node*" -or $process.ProcessName -like "*vite*")) {
                    $FRONTEND_PORT = $port
                    break
                }
            }
        }
    }
} catch {
    # Fallback to netstat if Get-NetTCPConnection fails
    try {
        $netstatOutput = netstat -ano | Select-String "LISTENING" | Select-String ":(517[3-9]|5180)"
        if ($netstatOutput) {
            foreach ($port in @(5173,5174,5175,5176,5177,5178,5179,5180)) {
                $match = $netstatOutput | Select-String ":$port"
                if ($match) {
                    $FRONTEND_PORT = $port
                    break
                }
            }
        }
    } catch {
        # If both methods fail, use default port
        Write-Host "Warning: Could not detect frontend port, using default 5173" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ AutoMFlows is running!" -ForegroundColor Green
Write-Host "Backend: http://localhost:$BACKEND_PORT" -ForegroundColor Blue
Write-Host "Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Blue
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow

# Wait for user interrupt
try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Check if processes are still running
        if ($script:BACKEND_PROCESS -and $script:BACKEND_PROCESS.HasExited) {
            Write-Host "Backend server has stopped." -ForegroundColor Yellow
            break
        }
        if ($script:FRONTEND_PROCESS -and $script:FRONTEND_PROCESS.HasExited) {
            Write-Host "Frontend server has stopped." -ForegroundColor Yellow
            break
        }
    }
} catch {
    # User pressed Ctrl+C or other interrupt
} finally {
    Cleanup
}
