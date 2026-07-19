#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_DIR="$(pwd)"
BACKEND_DIR="$BASE_DIR/bulkreach/backend"
FRONTEND_DIR="$BASE_DIR/bulkreach/frontend"

# Clean up function to kill background processes on exit
cleanup() {
    echo -e "\n\n${RED}🛑 Stopping BulkReach Desktop services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped.${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to clean up background processes
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}    🚀 Starting BulkReach in Standalone Desktop Mode...        ${NC}"
echo -e "${BLUE}    (Zero dependencies: Uses SQLite & Celery Eager Mode)       ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Check backend virtual environment
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${RED}Error: Backend virtual environment not found in bulkreach/backend/venv.${NC}"
    exit 1
fi

# 1. Start Backend API Server (SQLite & Eager Mode)
echo -e "${GREEN}1. Starting Backend API Server (Django + SQLite)...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate
python desktop_entry.py &
BACKEND_PID=$!

# Wait for backend to initialize database and start up
sleep 3

# 2. Start Frontend React Client (Vite)
echo -e "${GREEN}2. Starting Frontend React Server (Vite)...${NC}"
cd "$FRONTEND_DIR"
if command -v bun &> /dev/null; then
    echo -e "${BLUE}Using Bun to start frontend...${NC}"
    bun run dev -- --open &
else
    echo -e "${BLUE}Using npm to start frontend...${NC}"
    npm run dev -- --open &
fi
FRONTEND_PID=$!

echo -e "\n========================================================"
echo -e "🎉 ${GREEN}Desktop Services launched successfully!${NC}"
echo -e "========================================================"
echo -e "   - Frontend Client:   ${BLUE}http://localhost:5173${NC}"
echo -e "   - Backend API:       ${BLUE}http://localhost:8000${NC}"
echo -e "   - Django Admin:      ${BLUE}http://localhost:8000/admin/${NC}"
echo -e "========================================================"
echo -e "👉 ${YELLOW}Press Ctrl+C in this terminal to stop all services.${NC}"
echo -e "========================================================\n"

# Keep the script running to wait for child processes
wait
