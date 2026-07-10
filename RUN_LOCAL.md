# 🚀 BulkReach — Local Development Setup Guide

This guide provides step-by-step instructions to run the BulkReach project on your local machine. You can choose to run the entire stack using **Docker Compose** (recommended) or run services **natively** on your machine.

---

## ⚡ Automated Setup & Execution (Quickest)

We have provided interactive bash scripts to configure environments, databases, and start the project services.

### 1. Setup the Environment
To configure the environment, database, and install dependencies, run:
```bash
./setup_local.sh
```
The script will prompt you whether you want to set up with **Docker Compose** or **Completely Natively (without Docker)**, and perform all configurations and installs for you.

### 2. Start the local services natively
Once setup is complete, you can start the entire stack (Django server, Celery worker, Celery beat, and React frontend) natively with a single command:
```bash
./start_local.sh
```
This script handles starting all services in parallel and terminates all of them cleanly when you hit `Ctrl+C`.

---

## 📋 Prerequisites

Before getting started, make sure you have the following installed:
*   **Docker & Docker Compose** (highly recommended for running all database and backend services easily)
*   **Node.js 20+** and **npm** (required if running frontend natively)
*   **Python 3.11+** (required if running backend natively)
*   **PostgreSQL** and **Redis** (required if running backend natively without Docker)

---

## 🔑 Environment Configuration

Ensure that you have created the respective `.env` files for both frontend and backend using the pre-configured environment values:

1.  **Backend Env**: Save to [bulkreach/backend/.env](file:///Users/apple/untitled%20folder/job/bulkreach/backend/.env)
2.  **Frontend Env**: Save to [bulkreach/frontend/.env](file:///Users/apple/untitled%20folder/job/bulkreach/frontend/.env)

> [!NOTE]
> You can reference the pre-generated environment secrets and Google OAuth keys in [env_setup.md](file:///Users/apple/untitled%20folder/job/env_setup.md).

---

## 🐳 Option 1: Running with Docker Compose (Recommended)

Docker Compose starts all backend, database, cache, workers, and frontend services in containers.

### Step 1: Spin up the Docker containers
From the `bulkreach/` directory (where [docker-compose.yml](file:///Users/apple/untitled%20folder/job/bulkreach/docker-compose.yml) is located), run:
```bash
docker compose up --build
```
*(Use `docker-compose up --build` if you are using Docker Compose V1)*

### Step 2: Apply Database Migrations
Once the database and backend services are active, run the migrations:
```bash
docker compose exec backend python manage.py migrate
```

### Step 3: Create an Admin Superuser
To access the Django admin dashboard and log in:
```bash
docker compose exec backend python manage.py createsuperuser
```

---

## 💻 Option 2: Running Natively (Without Docker / Hybrid)

Running natively provides faster reload times and easier debugging. You can also use a **hybrid approach** (recommended if you don't have local Postgres/Redis installations) where you run Postgres and Redis inside Docker while running your Python and React servers natively.

### Step 0: Start Postgres & Redis

You can choose either of the two methods below to run Postgres and Redis:

#### Method A: Using Docker (Easiest hybrid setup)
If you don't want to install Postgres or Redis directly on your system, you can spin up just those services using Docker:
```bash
docker compose up -d db redis
```

#### Method B: Completely Natively (Using Homebrew on macOS)
If you do not want to use Docker at all, you can install and run Postgres and Redis using Homebrew:

1. **Install & Start Redis**:
   ```bash
   brew install redis
   brew services start redis
   ```

2. **Install & Start PostgreSQL 15**:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

3. **Configure the PostgreSQL User and Database**:
   Since the backend `.env` is configured to connect using user `bulkreach` and password `password` on database `bulkreach`, you will need to create them:
   ```bash
   # Create the user/role 'bulkreach'
   createuser -s bulkreach
   
   # Create the database 'bulkreach' owned by 'bulkreach'
   createdb bulkreach -O bulkreach
   
   # Set the password for 'bulkreach' to 'password'
   psql -d bulkreach -c "ALTER USER bulkreach WITH PASSWORD 'password';"
   ```

---

### 🐍 Part A: Backend Setup (Django & Celery)

1.  **Navigate to the backend directory**:
    ```bash
    cd bulkreach/backend
    ```

2.  **Create and activate a Python virtual environment**:
    *   **macOS/Linux**:
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    *   **Windows (Command Prompt)**:
        ```cmd
        python -m venv venv
        venv\Scripts\activate.bat
        ```
    *   **Windows (PowerShell)**:
        ```powershell
        python -m venv venv
        .\venv\Scripts\Activate.ps1
        ```

3.  **Install the dependencies**:
    Make sure you install the packages listed in [requirements.txt](file:///Users/apple/untitled%20folder/job/bulkreach/backend/requirements.txt):
    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```

4.  **Run Database Migrations**:
    ```bash
    python manage.py migrate
    ```

5.  **Create a Django Admin User**:
    ```bash
    python manage.py createsuperuser
    ```

6.  **Run the Django Development Server**:
    ```bash
    python manage.py runserver
    ```
    The API will now be running at `http://127.0.0.1:8000/`.

7.  **Install Playwright Browsers (Required for Phase 2 Scraper)**:
    ```bash
    playwright install chromium
    ```

8.  **Start Celery Workers & Scheduler (In separate terminal windows with `venv` activated)**:
    *   **Celery Worker** (to process outreach emails and scraper tasks):
        ```bash
        celery -A config worker --loglevel=info --queues=default,emails,scraping
        ```
    *   **Celery Beat** (to trigger scheduled tasks):
        ```bash
        celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
        ```

---

### ⚛️ Part B: Frontend Setup (React & Vite)

1.  **Navigate to the frontend directory**:
    ```bash
    cd bulkreach/frontend
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Vite Development Server**:
    ```bash
    npm run dev
    ```
    The frontend will now be running at `http://localhost:5173/`.

---

## 🔗 Accessible Endpoints Reference

Once the services are running, you can access the following addresses:

| Component | URL / Endpoint | Details |
| :--- | :--- | :--- |
| **Frontend Application** | `http://localhost:5173` | React Dashboard UI |
| **Django API Server** | `http://localhost:8000` | Backend Base API |
| **API Documentation** | `http://localhost:8000/api/docs/` | Interactive Swagger/OpenAPI docs |
| **Django Admin Panel** | `http://localhost:8000/admin/` | Manage users, databases, tasks |
| **PostgreSQL Database** | `localhost:5432` | Username/Password: `bulkreach` / `password` |
| **Redis Cache / Broker** | `localhost:6379` | Shared queue memory store |

---

## 🛠️ Troubleshooting

*   **Redis Connection Error**: Ensure Redis is running (`redis-cli ping` should return `PONG`). If using Docker, check that the `redis` container healthcheck is green.
*   **Database Migrations Fail**: Ensure the database is accessible and that your `DATABASE_URL` in `.env` is set correctly. If you recreate the Postgres container, make sure the volume is not corrupted.
*   **Gmail Consent / OAuth Errors**: Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` are correctly set up and match your app configuration in the Google Cloud Console. Make sure you've authorized `http://localhost:8000/api/auth/gmail/callback/` in the Google Credentials Redirect URIs list.
