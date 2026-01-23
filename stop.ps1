# AutoMFlows Stop Script for Windows
# Stops all running AutoMFlows processes

Write-Host "🛑 Stopping AutoMFlows servers..." -ForegroundColor Yellow

# Find and kill backend processes
$backendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
    $cmdLine -match "npm run dev:backend" -or $cmdLine -match "tsx watch src/server.ts"
}

if ($backendProcesses) {
    Write-Host "Stopping backend servers..." -ForegroundColor Cyan
    foreach ($proc in $backendProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped backend process (PID: $($proc.Id))" -ForegroundColor Gray
        } catch {
            # Ignore errors
        }
    }
}

# Find and kill frontend processes
$frontendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
    $cmdLine -match "npm run dev:frontend" -or $cmdLine -match "vite"
}

if ($frontendProcesses) {
    Write-Host "Stopping frontend servers..." -ForegroundColor Cyan
    foreach ($proc in $frontendProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped frontend process (PID: $($proc.Id))" -ForegroundColor Gray
        } catch {
            # Ignore errors
        }
    }
}

# Kill processes on common ports (including dynamically assigned ones)
$ports = @(3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180)

foreach ($port in $ports) {
    try {
        # Try Get-NetTCPConnection first
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                try {
                    $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                    if ($process) {
                        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                        Write-Host "  Stopped process on port $port (PID: $($conn.OwningProcess))" -ForegroundColor Gray
                    }
                } catch {
                    # Ignore errors
                }
            }
        }
    } catch {
        # Fallback to netstat
        try {
            $netstatOutput = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
            if ($netstatOutput) {
                $pids = $netstatOutput | ForEach-Object {
                    $parts = $_ -split '\s+'
                    if ($parts.Length -gt 0) {
                        $parts[-1]
                    }
                } | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique
                
                foreach ($pid in $pids) {
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Host "  Stopped process on port $port (PID: $pid)" -ForegroundColor Gray
                    } catch {
                        # Ignore errors
                    }
                }
            }
        } catch {
            # Ignore errors
        }
    }
}

# Clean up port file
if (Test-Path ".automflows-port") {
    try {
        Remove-Item ".automflows-port" -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed .automflows-port file" -ForegroundColor Gray
    } catch {
        # Ignore errors
    }
}

Write-Host "✅ All servers stopped" -ForegroundColor Green
