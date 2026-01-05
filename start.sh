#!/bin/bash

# AutoMFlows Startup Script
# This script installs dependencies, builds the shared package, and starts both backend and frontend servers

set -e  # Exit on error

echo "🚀 Starting AutoMFlows..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Step 1: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Step 2: Install Playwright browsers
echo -e "${BLUE}🌐 Installing Playwright browsers...${NC}"
cd backend
npx playwright install chromium || echo -e "${YELLOW}Warning: Playwright browser installation failed. You may need to install manually.${NC}"
cd ..

# Step 3: Build shared package
echo -e "${BLUE}🔨 Building shared package...${NC}"
cd shared
npm run build
cd ..

# Step 4: Start backend server
echo -e "${GREEN}🔧 Starting backend server...${NC}"
npm run dev:backend &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a bit for backend to start
sleep 3

# Step 5: Start frontend server
echo -e "${GREEN}🎨 Starting frontend server...${NC}"
npm run dev:frontend &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait a bit for frontend to start
sleep 3

# Wait a bit more for servers to fully start and port file to be written
sleep 2

# Step 6: Read backend port from file
BACKEND_PORT=$(cat .automflows-port 2>/dev/null || echo "3003")
FRONTEND_PORT=5173

# Step 7: Open browser
echo -e "${GREEN}🌐 Opening browser...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:$FRONTEND_PORT
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:$FRONTEND_PORT 2>/dev/null || true
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    start http://localhost:$FRONTEND_PORT
fi

echo -e "\n${GREEN}✅ AutoMFlows is running!${NC}"
echo -e "${BLUE}Backend: http://localhost:$BACKEND_PORT${NC}"
echo -e "${BLUE}Frontend: http://localhost:$FRONTEND_PORT${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for processes
wait

