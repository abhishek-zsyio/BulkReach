#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load NVM (Node Version Manager) if it exists to resolve node/npm commands
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi

BASE_DIR="$(pwd)"
BACKEND_DIR="$BASE_DIR/bulkreach/backend"
FRONTEND_DIR="$BASE_DIR/bulkreach/frontend"

# Helper function to update environment variables in .env file
update_env_var() {
    local var_name=$1
    local new_val=$2
    local env_file="$BACKEND_DIR/.env"
    
    if [ -f "$env_file" ]; then
        if grep -q "^${var_name}=" "$env_file"; then
            # Replace existing variable
            sed "s|^${var_name}=.*|${var_name}=${new_val}|" "$env_file" > "${env_file}.tmp" && mv "${env_file}.tmp" "$env_file"
        else
            # Append new variable
            echo "${var_name}=${new_val}" >> "$env_file"
        fi
    fi
}

# Clean up function to kill all background processes on exit
cleanup() {
    echo -e "\n\n${RED}🛑 Stopping all BulkReach services...${NC}"
    kill $TUNNEL_PID $BACKEND_PID $WORKER_PID $BEAT_PID $FRONTEND_PID 2>/dev/null || true
    rm -f "$BACKEND_DIR/ssh_tunnel.log"
    echo -e "${GREEN}✓ All services stopped.${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to clean up background processes
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}===============================================================${NC}"
echo -e "${BLUE}        🚀 Starting BulkReach Services Natively...               ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Check that virtualenv exists
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${RED}Error: Virtual environment not found in backend/venv. Run ./setup_local.sh first.${NC}"
    exit 1
fi

# Present options menu to user
echo -e "${YELLOW}Please choose which services you want to launch:${NC}"
echo -e "  ${GREEN}1)${NC} Start All Services (Recommended)"
echo -e "  ${GREEN}2)${NC} Start Frontend Only (Vite Dev Server)"
echo -e "  ${GREEN}3)${NC} Start Backend Only (Django Server + Celery Workers)"
echo -e "  ${GREEN}4)${NC} Start All Services without SSH Webhook Tunnel (Localhost Only)"
echo -e "  ${GREEN}5)${NC} Exit"
read -p "Enter choice [1-5, default 1]: " START_CHOICE
START_CHOICE=${START_CHOICE:-1}

if [ "$START_CHOICE" == "5" ]; then
    echo -e "${GREEN}Exiting...${NC}"
    exit 0
fi

# 0. Start SSH Tunnel (if Option 1 selected)
if [ "$START_CHOICE" == "1" ]; then
    echo -e "${GREEN}0. Starting SSH Tunnel to expose backend port 8000...${NC}"
    ssh -o StrictHostKeyChecking=no -R 80:localhost:8000 nokey@localhost.run > "$BACKEND_DIR/ssh_tunnel.log" 2>&1 &
    TUNNEL_PID=$!
    
    echo -ne "${YELLOW}⏳ Waiting for public tunnel URL (up to 25s)...${NC}"
    TUNNEL_URL=""
    for i in {1..25}; do
        echo -n "."
        sleep 1
        if [ -f "$BACKEND_DIR/ssh_tunnel.log" ]; then
            TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.(lhr\.life|localhost\.run)" "$BACKEND_DIR/ssh_tunnel.log" | head -n 1)
            if [ ! -z "$TUNNEL_URL" ]; then
                break
            fi
        fi
    done
    echo ""
    
    if [ -z "$TUNNEL_URL" ]; then
        echo -e "${RED}⚠️ Warning: Could not establish SSH tunnel. Email open tracking will only work on localhost.${NC}"
        update_env_var "BACKEND_URL" "http://localhost:8000"
        update_env_var "ALLOWED_HOSTS" "localhost,127.0.0.1"
    else
        echo -e "${GREEN}🔑 Public Tunnel established!${NC}"
        echo -e "👉 Backend exposed at: ${BLUE}${TUNNEL_URL}${NC}"
        
        TUNNEL_DOMAIN=$(echo "$TUNNEL_URL" | sed -E 's|https://||')
        update_env_var "BACKEND_URL" "$TUNNEL_URL"
        update_env_var "ALLOWED_HOSTS" "localhost,127.0.0.1,${TUNNEL_DOMAIN}"
    fi
elif [ "$START_CHOICE" == "4" ] || [ "$START_CHOICE" == "3" ]; then
    echo -e "${YELLOW}Bypassing SSH Webhook Tunnel. Running on localhost only.${NC}"
    update_env_var "BACKEND_URL" "http://localhost:8000"
    update_env_var "ALLOWED_HOSTS" "localhost,127.0.0.1"
fi

# 1. Start Backend API Server & Celery (if Option 1, 3, or 4 selected)
if [ "$START_CHOICE" == "1" ] || [ "$START_CHOICE" == "3" ] || [ "$START_CHOICE" == "4" ]; then
    echo -e "${GREEN}1. Starting Backend API Server (Django)...${NC}"
    cd "$BACKEND_DIR"
    source venv/bin/activate
    python manage.py runserver 0.0.0.0:8000 &
    BACKEND_PID=$!
    
    echo -e "${GREEN}2. Starting Celery Worker (output redirected to backend/celery_worker.log)...${NC}"
    celery -A config worker --loglevel=info --queues=default,emails,scraping > celery_worker.log 2>&1 &
    WORKER_PID=$!
    
    echo -e "${GREEN}3. Starting Celery Beat Scheduler (output redirected to backend/celery_beat.log)...${NC}"
    celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler > celery_beat.log 2>&1 &
    BEAT_PID=$!
fi

# 2. Start Frontend React Client (if Option 1, 2, or 4 selected)
if [ "$START_CHOICE" == "1" ] || [ "$START_CHOICE" == "2" ] || [ "$START_CHOICE" == "4" ]; then
    echo -e "${GREEN}4. Starting Frontend React Server (Vite)...${NC}"
    cd "$FRONTEND_DIR"
    if command -v bun &> /dev/null; then
        echo -e "${BLUE}Using bun to start frontend...${NC}"
        bun run dev -- --host &
    else
        echo -e "${BLUE}Using npm to start frontend...${NC}"
        npm run dev -- --host &
    fi
    FRONTEND_PID=$!
fi

echo -e "\n========================================================"
echo -e "🎉 ${GREEN}Services launched successfully!${NC}"
echo -e "========================================================"
if [ "$START_CHOICE" == "1" ] || [ "$START_CHOICE" == "2" ] || [ "$START_CHOICE" == "4" ]; then
    echo -e "   - Frontend Client:  ${BLUE}http://localhost:5173${NC} (or http://localhost:5174)"
fi
if [ "$START_CHOICE" == "1" ] || [ "$START_CHOICE" == "3" ] || [ "$START_CHOICE" == "4" ]; then
    echo -e "   - Backend API:      ${BLUE}http://localhost:8000${NC}"
    echo -e "   - Django Admin:     ${BLUE}http://localhost:8000/admin/${NC}"
fi
echo -e "========================================================"
echo -e "👉 ${YELLOW}Press Ctrl+C in this terminal window to stop all running services.${NC}"
echo -e "========================================================\n"

# Keep the script running to wait for child processes
wait
