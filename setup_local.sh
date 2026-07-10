#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}        📬 BulkReach — Local Setup Assistant (macOS)           ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Load NVM (Node Version Manager) if it exists to resolve node/npm commands in the subshell
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi

# Check directories
BASE_DIR="$(pwd)"
BACKEND_DIR="$BASE_DIR/bulkreach/backend"
FRONTEND_DIR="$BASE_DIR/bulkreach/frontend"

if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Make sure you run this script from the workspace root directory containing the 'bulkreach' folder.${NC}"
    exit 1
fi

# Step 1: Check Environment Files
echo -e "\n${YELLOW}[Step 1/4] Verifying Environment Variables Configuration...${NC}"

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: Backend .env file not found in $BACKEND_DIR/.env.${NC}"
    if [ -f "$BASE_DIR/env_setup.md" ]; then
        echo -e "${GREEN}Extracting backend .env from env_setup.md...${NC}"
        # Parse the block between ```env and ``` under Backend Configuration
        sed -n '/## 📁 Backend Configuration/,/---/p' "$BASE_DIR/env_setup.md" | sed -n '/```env/,/```/p' | grep -v '```' > "$BACKEND_DIR/.env"
        echo -e "${GREEN}Successfully generated $BACKEND_DIR/.env${NC}"
    elif [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo -e "${YELLOW}Copied backend/.env.example to backend/.env. Please configure it manually.${NC}"
    fi
else
    echo -e "${GREEN}✓ Backend .env file found.${NC}"
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: Frontend .env file not found in $FRONTEND_DIR/.env.${NC}"
    if [ -f "$BASE_DIR/env_setup.md" ]; then
        echo -e "${GREEN}Extracting frontend .env from env_setup.md...${NC}"
        # Parse the block between ```env and ``` under Frontend Configuration
        sed -n '/## 📁 Frontend Configuration/,/$/p' "$BASE_DIR/env_setup.md" | sed -n '/```env/,/```/p' | grep -v '```' > "$FRONTEND_DIR/.env"
        echo -e "${GREEN}Successfully generated $FRONTEND_DIR/.env${NC}"
    elif [ -f "$FRONTEND_DIR/.env.example" ]; then
        cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
        echo -e "${YELLOW}Copied frontend/.env.example to frontend/.env. Please configure it manually.${NC}"
    fi
else
    echo -e "${GREEN}✓ Frontend .env file found.${NC}"
fi

# Step 2: Choose Setup Type
echo -e "\n${YELLOW}[Step 2/4] Choose Setup Type${NC}"
echo "How would you like to run the databases (PostgreSQL, Redis) and services?"
echo -e "  ${GREEN}1)${NC} Docker Compose (runs everything in Docker containers - recommended)"
echo -e "  ${GREEN}2)${NC} Completely Natively (runs Postgres, Redis, Django, and React locally on host machine)"
read -p "Enter choice [1 or 2]: " SETUP_CHOICE

if [ "$SETUP_CHOICE" == "1" ]; then
    # --- DOCKER SETUP ---
    echo -e "\n${YELLOW}Setting up with Docker Compose...${NC}"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}Error: Docker daemon is not running.${NC}"
        echo -e "${YELLOW}Please open Docker Desktop on your Mac and wait for it to be active before continuing.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker daemon is active.${NC}"
    cd "$BASE_DIR/bulkreach"
    
    echo -e "${BLUE}Building and starting Docker services...${NC}"
    docker compose up -d db redis backend
    
    echo -e "${YELLOW}Waiting for Database to start up...${NC}"
    sleep 5
    
    echo -e "${BLUE}Running Django migrations in Docker...${NC}"
    docker compose exec backend python manage.py migrate
    
    echo -e "${BLUE}Setting up Django superuser (optional)...${NC}"
    read -p "Would you like to create a superuser admin account now? (y/n): " CREATE_SU
    if [[ "$CREATE_SU" =~ ^[Yy]$ ]]; then
        docker compose exec backend python manage.py createsuperuser
    fi
    
    echo -e "${BLUE}Starting remaining services (celery, beat, frontend)...${NC}"
    docker compose up -d
    
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}🎉 Setup Complete! BulkReach is running via Docker Compose.${NC}"
    echo -e "   - Frontend: http://localhost:5173"
    echo -e "   - Backend API: http://localhost:8000"
    echo -e "   - API Docs: http://localhost:8000/api/docs/"
    echo -e "   - Django Admin: http://localhost:8000/admin/"
    echo -e "\nTo see logs, run: ${YELLOW}docker compose logs -f${NC}"
    echo -e "To stop services, run: ${YELLOW}docker compose down${NC}"
    echo -e "${GREEN}================================================================${NC}"

else
    # --- NATIVE SETUP ---
    echo -e "\n${YELLOW}Setting up Natively without Docker...${NC}"
    
    # Check Homebrew
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}Error: Homebrew is not installed. Homebrew is required for automatic native installation of Postgres and Redis.${NC}"
        echo -e "Please install it from https://brew.sh/ or choose the Docker option."
        exit 1
    fi
    
    # Setup Redis
    if ! brew list redis &>/dev/null; then
        echo -e "${BLUE}Installing Redis via Homebrew...${NC}"
        brew install redis
    fi
    echo -e "${BLUE}Starting Redis service...${NC}"
    brew services start redis || true
    
    # Setup Postgres
    if ! brew list postgresql@15 &>/dev/null; then
        echo -e "${BLUE}Installing PostgreSQL 15 via Homebrew...${NC}"
        brew install postgresql@15
    fi
    echo -e "${BLUE}Starting PostgreSQL 15 service...${NC}"
    brew services start postgresql@15 || true
    
    # Wait for postgres to be ready
    echo -e "${YELLOW}Waiting for PostgreSQL to start...${NC}"
    sleep 3
    
    # Create DB user and Database
    echo -e "${BLUE}Configuring PostgreSQL role and database...${NC}"
    createuser -s bulkreach 2>/dev/null || true
    createdb bulkreach -O bulkreach 2>/dev/null || true
    psql -d bulkreach -c "ALTER USER bulkreach WITH PASSWORD 'password';" 2>/dev/null || true
    echo -e "${GREEN}✓ Database 'bulkreach' configured successfully.${NC}"
    
    # Setup Python virtualenv and backend dependencies
    echo -e "\n${YELLOW}[Step 3/4] Setting up Backend Python Environment...${NC}"
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        echo -e "${BLUE}Creating virtual environment (venv)...${NC}"
        python3 -m venv venv
    fi
    
    echo -e "${BLUE}Activating virtual environment & installing dependencies...${NC}"
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    echo -e "${BLUE}Running Django migrations...${NC}"
    python manage.py migrate
    
    echo -e "${BLUE}Installing Playwright web driver (Phase 2 Scraper)...${NC}"
    playwright install chromium
    
    echo -e "${BLUE}Setting up Django superuser (optional)...${NC}"
    read -p "Would you like to create a superuser admin account now? (y/n): " CREATE_SU
    if [[ "$CREATE_SU" =~ ^[Yy]$ ]]; then
        python manage.py createsuperuser
    fi
    
    # Setup Frontend React app
    echo -e "\n${YELLOW}[Step 4/4] Setting up Frontend React Application...${NC}"
    cd "$FRONTEND_DIR"
    echo -e "${BLUE}Installing npm packages...${NC}"
    npm install
    
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}🎉 Native Setup Complete! Here's how to run the services:${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo -e "\nRun each of the following commands in separate terminal windows:\n"
    
    echo -e "${YELLOW}1. Backend Development Server:${NC}"
    echo -e "   cd $BACKEND_DIR && source venv/bin/activate && python manage.py runserver\n"
    
    echo -e "${YELLOW}2. Celery Async Task Worker:${NC}"
    echo -e "   cd $BACKEND_DIR && source venv/bin/activate && celery -A config worker --loglevel=info --queues=default,emails,scraping\n"
    
    echo -e "${YELLOW}3. Celery Periodic Beat Scheduler:${NC}"
    echo -e "   cd $BACKEND_DIR && source venv/bin/activate && celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler\n"
    
    echo -e "${YELLOW}4. Frontend React Client:${NC}"
    echo -e "   cd $FRONTEND_DIR && npm run dev\n"
    
    echo -e "Access URLs:"
    echo -e "   - Frontend Client: http://localhost:5173"
    echo -e "   - Django API: http://localhost:8000"
    echo -e "   - Swagger Docs: http://localhost:8000/api/docs/"
    echo -e "   - Django Admin: http://localhost:8000/admin/"
fi
