@echo off
setlocal enabledelayedexpansion

REM AutoMFlows Startup Script for Windows (Batch)
REM This script installs dependencies, builds the shared package, and starts both backend and frontend servers

echo [Start] Starting AutoMFlows...

REM Parse --host / --lan for LAN mode (bind to all interfaces, show LAN IP in logs)
set LAN_MODE=0
for %%a in (%*) do (
    if "%%a"=="--host" set LAN_MODE=1
    if "%%a"=="--lan" set LAN_MODE=1
)

REM Stop any existing processes on backend and frontend ports
echo [Stop] Stopping any existing processes on ports 3003, 3004, 5173, 5174...
call :stop_port 3003
call :stop_port 3004
call :stop_port 5173
call :stop_port 5174

REM Step 1: Install dependencies
echo [Packages] Installing dependencies...
call npm install
if errorlevel 1 echo Warning: npm install failed. Continuing anyway...

REM Step 2: Install Playwright browsers
echo [Playwright] Installing Playwright browsers...
pushd backend
call npx playwright install chromium >nul 2>&1
if errorlevel 1 echo Warning: Chromium installation failed. You may need to install manually.
call npx playwright install firefox >nul 2>&1
if errorlevel 1 echo Warning: Firefox installation failed. You may need to install manually.
call npx playwright install webkit >nul 2>&1
if errorlevel 1 echo Warning: WebKit installation failed. You may need to install manually.
popd

REM Step 3: Build shared package
echo [Build] Building shared package...
pushd shared
call npm run build
if errorlevel 1 (
    echo Error: Failed to build shared package
    exit /b 1
)
popd

REM Step 4: Start backend server
echo [Backend] Starting backend server...
if !LAN_MODE!==1 set HOST=0.0.0.0
start "AutoMFlows-Backend" cmd /c "npm run dev:backend"
echo Backend started in new window.

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Step 5: Start frontend server
echo [Frontend] Starting frontend server...
if !LAN_MODE!==1 (
    start "AutoMFlows-Frontend" cmd /c "npm run dev:frontend -- --host"
) else (
    start "AutoMFlows-Frontend" cmd /c "npm run dev:frontend"
)
echo Frontend started in new window.

REM Wait for frontend to start
timeout /t 3 /nobreak >nul
timeout /t 2 /nobreak >nul

REM Step 6: Read backend port from file (with retry)
set BACKEND_PORT=3003
set /a _RETRY=0
:read_port
if exist .automflows-port (
    set /p BACKEND_PORT=<.automflows-port
)
if not "!BACKEND_PORT!"=="3003" goto :port_found
set /a _RETRY+=1
if !_RETRY! lss 5 (
    timeout /t 1 /nobreak >nul
    goto :read_port
)
:port_found

REM Step 7: Detect actual frontend port (Vite may use a different port if 5173 is taken)
set FRONTEND_PORT=5173
call :detect_frontend_port

echo.
echo [OK] AutoMFlows is running!
echo Backend:          http://localhost:!BACKEND_PORT!
echo Frontend:         http://localhost:!FRONTEND_PORT!
echo Swagger API Docs: http://localhost:!BACKEND_PORT!/api-docs

if !LAN_MODE!==1 (
    call :detect_lan_ip
    if defined LAN_IP (
        echo.
        echo LAN access ^(other machines^):
        echo Backend:          http://!LAN_IP!:!BACKEND_PORT!
        echo Frontend:         http://!LAN_IP!:!FRONTEND_PORT!
        echo Swagger API Docs: http://!LAN_IP!:!BACKEND_PORT!/api-docs
    ) else (
        echo ^(LAN IP could not be detected^)
    )
)

echo.
echo Press any key to stop all servers...
pause >nul

REM Cleanup
echo.
echo Shutting down servers...
call :stop_port 3003
call :stop_port 3004
call :stop_port 5173
call :stop_port 5174
echo Servers stopped.
endlocal
exit /b 0

REM ============================================================
REM Subroutines
REM ============================================================

:stop_port
set _PORT=%~1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%_PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo Stopping process ^(PID: %%a^) on port %_PORT%
        taskkill /pid %%a /f >nul 2>&1
    )
)
timeout /t 1 /nobreak >nul
goto :eof

:detect_frontend_port
for %%p in (5173 5174 5175 5176 5177 5178 5179 5180) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        set FRONTEND_PORT=%%p
        goto :eof
    )
)
echo Warning: Could not detect frontend port, using default 5173
goto :eof

:detect_lan_ip
set LAN_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "_TEMP_IP=%%a"
    set "_TEMP_IP=!_TEMP_IP: =!"
    if not "!_TEMP_IP:~0,4!"=="127." (
        set "LAN_IP=!_TEMP_IP!"
        goto :eof
    )
)
goto :eof
