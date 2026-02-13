#!/bin/bash

# AutoMFlows Startup Script
# This script installs dependencies, builds the shared package, and starts both backend and frontend servers

set -e  # Exit on error

echo "🚀 Starting AutoMFlows..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Function to kill processes on a port
kill_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        local pids=$(lsof -ti :$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo -e "${YELLOW}Stopping processes on port $port...${NC}"
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    elif command -v fuser >/dev/null 2>&1; then
        fuser -k $port/tcp 2>/dev/null || true
        sleep 1
    else
        echo -e "${YELLOW}Warning: Could not find lsof or fuser to stop processes on port $port${NC}"
    fi
}

# Stop any existing processes on backend and frontend ports
echo -e "${YELLOW}🛑 Stopping any existing processes on ports 3003 and 5173...${NC}"
kill_port 3003
kill_port 5173

# Step 1: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install || echo -e "${YELLOW}Warning: npm install failed. Continuing anyway...${NC}"

# Step 2: Install Playwright browsers
echo -e "${BLUE}🌐 Installing Playwright browsers...${NC}"
cd backend
npx playwright install chromium 2>&1 >/dev/null || echo -e "${YELLOW}Warning: Chromium installation failed. You may need to install manually.${NC}"
npx playwright install firefox 2>&1 >/dev/null || echo -e "${YELLOW}Warning: Firefox installation failed. You may need to install manually.${NC}"
npx playwright install webkit 2>&1 >/dev/null || echo -e "${YELLOW}Warning: WebKit installation failed. You may need to install manually.${NC}"
cd ..

# Step 3: Build shared package
echo -e "${BLUE}🔨 Building shared package...${NC}"
cd shared
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build shared package${NC}"
    exit 1
fi
cd ..

# Step 4: Start backend server
echo -e "${GREEN}🔧 Starting backend server...${NC}"
npm run dev:backend &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Wait a bit for backend to start
sleep 3

# Step 5: Start frontend server
echo -e "${GREEN}🎨 Starting frontend server...${NC}"
npm run dev:frontend &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

# Wait a bit for frontend to start
sleep 3

# Wait a bit more for servers to fully start and port file to be written
sleep 2

# Step 6: Read backend port from file (with retry)
BACKEND_PORT="3003"
for i in {1..5}; do
    if [ -f .automflows-port ]; then
        BACKEND_PORT=$(cat .automflows-port 2>/dev/null | tr -d '\n' || echo "3003")
        if [ "$BACKEND_PORT" != "3003" ] && [ ! -z "$BACKEND_PORT" ]; then
            break
        fi
    fi
    sleep 1
done

# Step 7: Detect actual frontend port (Vite may use a different port if 5173 is taken)
FRONTEND_PORT=5173
if command -v lsof >/dev/null 2>&1; then
    # Check ports 5173-5180 to find which one Vite is using
    for port in 5173 5174 5175 5176 5177 5178 5179 5180; do
        if lsof -Pi :$port -sTCP:LISTEN >/dev/null 2>&1; then
            # Check if it's likely our Vite process (node/vite/tsx)
            if lsof -Pi :$port -sTCP:LISTEN 2>/dev/null | grep -q -E "(node|vite|tsx)"; then
                FRONTEND_PORT=$port
                break
            fi
        fi
    done
else
    echo -e "${YELLOW}Warning: Could not detect frontend port, using default 5173${NC}"
fi

echo ""
echo -e "${GREEN}✅ AutoMFlows is running!${NC}"
echo -e "${BLUE}Backend: http://localhost:$BACKEND_PORT${NC}"
echo -e "${BLUE}Frontend: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${BLUE}Swagger API Docs: http://localhost:$BACKEND_PORT/api-docs${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for user interrupt and monitor processes
while true; do
    sleep 1
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${YELLOW}Backend server has stopped.${NC}"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${YELLOW}Frontend server has stopped.${NC}"
        break
    fi
done

cleanup

