#!/bin/bash

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

# Prerequisite checker function
check_dependency() {
    local cmd=$1
    local name=$2
    local required=$3
    if command -v "$cmd" &> /dev/null; then
        local version=""
        if [ "$cmd" = "node" ]; then
            version=" ($(node -v))"
        elif [ "$cmd" = "python3" ]; then
            version=" ($(python3 --version | awk '{print $2}'))"
        fi
        echo -e "   [${GREEN} OK ${NC}] $name is installed.$version"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "   [${RED}FAIL${NC}] $name is NOT installed. (Required)"
            return 1
        else
            echo -e "   [${YELLOW}WARN${NC}] $name is NOT installed. (Optional)"
            return 2
        fi
    fi
}

echo -e "\n${YELLOW}🔍 Checking System Prerequisites...${NC}"
HAS_PREREQS=true

check_dependency "node" "Node.js" "true" || HAS_PREREQS=false
check_dependency "npm" "NPM" "true" || HAS_PREREQS=false
check_dependency "python3" "Python 3" "true" || HAS_PREREQS=false
check_dependency "git" "Git" "true" || HAS_PREREQS=false
check_dependency "docker" "Docker" "false"

if [ "$HAS_PREREQS" = "false" ]; then
    echo -e "\n${RED}❌ Prerequisite checks failed. Please install the required software listed above and re-run setup.${NC}"
    exit 1
fi

# Step 1: Check Environment Files
echo -e "\n${YELLOW}[Step 1/4] Verifying Environment Variables Configuration...${NC}"

# Flag to see if we configured Google OAuth interactively
GOOGLE_ID=""
GOOGLE_SECRET=""
CONFIGURE_OAUTH_RUN=false

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: Backend .env file not found in $BACKEND_DIR/.env.${NC}"
    if [ -f "$BASE_DIR/env_setup.md" ]; then
        echo -e "${GREEN}Extracting backend .env template from env_setup.md...${NC}"
        sed -n '/## 📁 Backend Configuration/,/---/p' "$BASE_DIR/env_setup.md" | sed -n '/```env/,/```/p' | grep -v '```' > "$BACKEND_DIR/.env"
        echo -e "${GREEN}Successfully generated $BACKEND_DIR/.env template.${NC}"
        
        # Interactively prompt for Google OAuth Client secrets
        echo -e "\n${YELLOW}🔑 Google OAuth Setup Assistant${NC}"
        echo "Would you like to configure your Google OAuth credentials now?"
        echo "If you skip this step, generic placeholders will be used and you can configure them later."
        read -p "Configure Google credentials? (y/n) [default n]: " DO_OAUTH
        if [[ "$DO_OAUTH" =~ ^[Yy]$ ]]; then
            read -p "Enter Google OAuth Client ID: " GOOGLE_ID
            read -p "Enter Google OAuth Client Secret: " GOOGLE_SECRET
            
            # Clean up inputs
            GOOGLE_ID=$(echo "$GOOGLE_ID" | tr -d '[:space:]')
            GOOGLE_SECRET=$(echo "$GOOGLE_SECRET" | tr -d '[:space:]')
            
            if [ ! -z "$GOOGLE_ID" ]; then
                sed -E -i.bak "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${GOOGLE_ID}|" "$BACKEND_DIR/.env"
            fi
            if [ ! -z "$GOOGLE_SECRET" ]; then
                sed -E -i.bak "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${GOOGLE_SECRET}|" "$BACKEND_DIR/.env"
            fi
            rm -f "$BACKEND_DIR/.env.bak"
            echo -e "${GREEN}✓ Google credentials written to backend/.env.${NC}"
            CONFIGURE_OAUTH_RUN=true
        else
            echo -e "${YELLOW}Using default placeholders for Google OAuth variables.${NC}"
        fi
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
        echo -e "${GREEN}Extracting frontend .env template from env_setup.md...${NC}"
        sed -n '/## 📁 Frontend Configuration/,/$/p' "$BASE_DIR/env_setup.md" | sed -n '/```env/,/```/p' | grep -v '```' > "$FRONTEND_DIR/.env"
        echo -e "${GREEN}Successfully generated $FRONTEND_DIR/.env template.${NC}"
        
        # Inject Google Client ID if we configured it in the step above
        if [ "$CONFIGURE_OAUTH_RUN" = "true" ] && [ ! -z "$GOOGLE_ID" ]; then
            sed -E -i.bak "s|^VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=${GOOGLE_ID}|" "$FRONTEND_DIR/.env"
            rm -f "$FRONTEND_DIR/.env.bak"
            echo -e "${GREEN}✓ Synced Google Client ID to frontend/.env.${NC}"
        fi
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
    
    # Setup Redis (Smart Check)
    if command -v redis-server &>/dev/null || brew list redis &>/dev/null; then
        echo -e "${GREEN}✓ Redis is already installed.${NC}"
    else
        echo -e "${BLUE}Installing Redis via Homebrew...${NC}"
        brew install redis
    fi
    echo -e "${BLUE}Starting Redis service...${NC}"
    brew services start redis || true
    
    # Setup Postgres (Smart Check)
    HAS_POSTGRES=false
    POSTGRES_VER=""
    if command -v pg_config &>/dev/null; then
        HAS_POSTGRES=true
    else
        for v in {14..18}; do
            if brew list postgresql@$v &>/dev/null; then
                HAS_POSTGRES=true
                POSTGRES_VER=$v
                break
            fi
        done
        if brew list postgresql &>/dev/null; then
            HAS_POSTGRES=true
        fi
    fi

    if [ "$HAS_POSTGRES" = "true" ]; then
        echo -e "${GREEN}✓ PostgreSQL is already installed.${NC}"
    else
        echo -e "${BLUE}Installing PostgreSQL 15 via Homebrew...${NC}"
        brew install postgresql@15
        POSTGRES_VER=15
    fi

    echo -e "${BLUE}Starting PostgreSQL service...${NC}"
    if [ ! -z "${POSTGRES_VER}" ]; then
        brew services start postgresql@${POSTGRES_VER} || true
    else
        brew services start postgresql || true
    fi
    
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
    
    if ! pip install -r requirements.txt; then
        echo -e "${RED}❌ Failed to install Python dependencies. Please check the logs above.${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Running Django migrations...${NC}"
    python manage.py migrate
    
    echo -e "${BLUE}Installing Playwright web driver (Phase 2 Scraper)...${NC}"
    if ! playwright install chromium; then
        echo -e "${YELLOW}⚠️ Warning: Playwright browser download failed. You can run 'playwright install chromium' manually later.${NC}"
    fi
    
    echo -e "${BLUE}Setting up Django superuser (optional)...${NC}"
    read -p "Would you like to create a superuser admin account now? (y/n): " CREATE_SU
    if [[ "$CREATE_SU" =~ ^[Yy]$ ]]; then
        python manage.py createsuperuser
    fi
    
    # Setup Frontend React app
    echo -e "\n${YELLOW}[Step 4/4] Setting up Frontend React Application...${NC}"
    cd "$FRONTEND_DIR"
    echo -e "${BLUE}Installing npm packages...${NC}"
    if ! npm install; then
        echo -e "${RED}❌ npm install failed. Please verify your Node version and network connection.${NC}"
        exit 1
    fi
    
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
