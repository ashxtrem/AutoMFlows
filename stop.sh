#!/bin/bash

# AutoMFlows Stop Script
# Stops all running AutoMFlows processes

echo "🛑 Stopping AutoMFlows servers..."

# Find and kill backend processes
BACKEND_PIDS=$(pgrep -f "npm run dev:backend" || pgrep -f "tsx watch src/server.ts" || true)
if [ ! -z "$BACKEND_PIDS" ]; then
    echo "Stopping backend servers..."
    echo "$BACKEND_PIDS" | xargs kill 2>/dev/null || true
fi

# Find and kill frontend processes
FRONTEND_PIDS=$(pgrep -f "npm run dev:frontend" || pgrep -f "vite" || true)
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "Stopping frontend servers..."
    echo "$FRONTEND_PIDS" | xargs kill 2>/dev/null || true
fi

# Kill processes on common ports (including dynamically assigned ones)
for port in 3003 3004 3005 3006 3007 3008 3009 3010 5173; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Clean up port file
rm -f .automflows-port 2>/dev/null || true

echo "✅ All servers stopped"

