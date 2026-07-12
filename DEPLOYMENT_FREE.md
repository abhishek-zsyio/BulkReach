# 🆓 BulkReach Free Tier Deployment Guide

This guide describes how to deploy the entire **BulkReach** stack (React Frontend, Django Backend, PostgreSQL DB, Redis Broker, Celery Worker & Beat) **completely for free** using modern serverless and free-tier cloud platforms.

---

## 🗺️ Free Tier Cloud Architecture

To avoid paying for a VPS (like AWS or DigitalOcean) and to fit within various free limits, we split the application across specialized free-tier providers:

![Free Tier Architecture Diagram](./bulkreach/system_architecture.png)
| Service / Component | Free Platform | Details & Limits |
|---|---|---|
| **Frontend React Client** | **Vercel** (or Netlify / Cloudflare Pages) | Unlimited bandwidth (within fair use), free SSL, automatic git deployments. |
| **Backend API Server** | **Render** (Free Web Service) | 512 MB RAM, 0.1 vCPU. Spins down after 15 mins of inactivity (first request takes ~50s to wake up). |
| **Celery Worker & Beat** | **Render** (Co-located in Backend container) | Run inside the *same* Render Web Service container to bypass the paid-only Background Worker restriction. |
| **PostgreSQL Database** | **Neon.tech** (or Supabase) | Serverless Postgres, 3 GB storage, auto-suspend when idle. |
| **Redis Broker / Cache** | **Upstash** | Serverless Redis, free tier up to 10,000 commands/day. |

---

## 📦 Step 1: Database Setup (Neon.tech)

**Neon** offers a serverless PostgreSQL database with a generous free tier.

1. Go to [Neon.tech](https://neon.tech/) and sign up.
2. Create a new project named `bulkreach`.
3. Select your preferred region (choose a region close to your Render deployment region, e.g., US East / Oregon / Frankfurt).
4. Copy the **Connection String** from the dashboard. It will look like this:
   ```
   postgresql://alex:password@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this connection string; you will use it as your `DATABASE_URL` in Step 4.

---

## ⚡ Step 2: Redis Broker Setup (Upstash)

**Upstash** provides serverless Redis with a free tier that is perfect for low-frequency message queuing.

1. Go to [Upstash](https://upstash.com/) and log in.
2. Click **Create Database**.
3. Select **Redis**, name it `bulkreach-broker`, and choose your region (match your Neon and Render regions).
4. Scroll down to the **Node / Redis Client** connection details and copy the **Redis URL**. It will look like:
   ```
   rediss://default:your_secure_password@cool-monkey-12345.upstash.io:6379
   ```
   > ⚠️ **Note**: Upstash URLs start with `rediss://` (secure Redis). Ensure you keep the double `s` in the scheme so Django connects securely.
5. Save this URL; you will use it as your `REDIS_URL` in Step 4.

---

## 🕸️ Step 3: Configure Gmail API for Production

1. Visit your [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit your OAuth Web Application credentials.
3. Update **Authorized JavaScript origins** to include your Vercel URL (e.g., `https://bulkreach.vercel.app`).
4. Update **Authorized redirect URIs** to point to your backend API hosted on Render (e.g., `https://bulkreach-backend.onrender.com/api/auth/gmail/callback/`).

---

## 🐍 Step 4: Deploy Backend (Render Web Service)

Render's free tier allows you to deploy a web application via a `Dockerfile`. Since Render charges for background worker services ($7+/month), we will **co-locate** the Django web server, Celery worker, and Celery beat inside a **single** free web service container.

### 1. Create a Monolithic Entrypoint Script
Create a new file in your project under [bulkreach/backend/start_free_prod.sh](file:///Users/apple/untitled%20folder/job/bulkreach/backend/start_free_prod.sh):

```bash
#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Booting BulkReach Production Stack..."

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Collect static files for Django Admin UI
echo "Collecting Django static files..."
python manage.py collectstatic --noinput

# Start Celery Beat in the background (schedules cron/periodic scrapers)
echo "Starting Celery Beat..."
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler &

# Start Celery Worker in the background (concurrency set to 1 to save memory)
echo "Starting Celery Worker..."
celery -A config worker --loglevel=info --concurrency=1 --queues=default,emails,scraping &

# Start Gunicorn server in the foreground
# Set workers/threads to a minimum to fit in Render's 512MB RAM
echo "Starting Gunicorn Web Server..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:10000 \
    --workers 1 \
    --threads 2 \
    --timeout 120
```

### 2. Update Backend `Dockerfile`
Render will build the backend using [bulkreach/backend/Dockerfile](file:///Users/apple/untitled%20folder/job/bulkreach/backend/Dockerfile). Update it to support execution of our script and install Playwright (scrapers):

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Install Playwright and chromium browser along with its system dependencies
RUN playwright install --with-deps chromium

COPY . .

# Grant execute permissions to the entrypoint script
RUN chmod +x start_free_prod.sh

RUN mkdir -p /app/media /app/staticfiles

EXPOSE 10000

CMD ["./start_free_prod.sh"]
```

### 3. Setup Render Web Service
1. Go to [Render](https://render.com/) and create a free account.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Set the following options:
   - **Name**: `bulkreach-backend`
   - **Root Directory**: `bulkreach/backend`
   - **Language**: `Docker`
   - **Branch**: `main`
   - **Instance Type**: `Free`
5. Add the following **Environment Variables** in the Render settings tab:

| Key | Value | Description |
|---|---|---|
| `SECRET_KEY` | *random_secure_string* | Django secret key |
| `DEBUG` | `False` | Turn off debugging |
| `ALLOWED_HOSTS` | `bulkreach-backend.onrender.com` | Your Render domain |
| `DATABASE_URL` | *your_neon_postgres_url* | From Step 1 |
| `REDIS_URL` | *your_upstash_redis_url* | From Step 2 |
| `CELERY_BROKER_URL` | *your_upstash_redis_url* | Same as `REDIS_URL` |
| `CELERY_RESULT_BACKEND` | *your_upstash_redis_url* (appended with `/1`) | e.g. `rediss://.../1` |
| `GOOGLE_CLIENT_ID` | *your_google_client_id* | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | *your_google_client_secret* | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://bulkreach-backend.onrender.com/api/auth/gmail/callback/` | Callback redirect URI |
| `FIELD_ENCRYPTION_KEY` | *your_32_byte_fernet_key* | Cryptography key |
| `JWT_SECRET_KEY` | *random_jwt_secret* | JWT signature key |
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | Django production settings |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel frontend URL (from Step 5) |
| `BACKEND_URL` | `https://bulkreach-backend.onrender.com` | Your Render backend URL |

6. Click **Deploy Web Service**. Render will build the container, install dependencies, run migrations, and spin up Django + Celery.

---

## ⚛️ Step 5: Deploy Frontend (Vercel)

Vercel provides a lightning-fast, edge-network hosting platform for Vite/React applications.

1. Go to [Vercel](https://vercel.com/) and sign up.
2. Click **Add New** → **Project**.
3. Import your GitHub repository.
4. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `bulkreach/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand the **Environment Variables** section and add:
   - `VITE_API_BASE_URL` = `https://bulkreach-backend.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID` = *your_google_client_id*
6. Click **Deploy**. Vercel will build your React application and provide you with a deployment URL (e.g. `https://bulkreach.vercel.app`).
7. **Important**: Copy this URL and paste it back into your Render Backend service as the `FRONTEND_URL` environment variable.

---

## ⚠️ Free Tier Limitations & Workarounds

Deploying on free tiers is excellent for prototyping, demonstration, or low-usage scenarios, but it has specific quirks you must plan around:

### 1. Render Inactivity Spin-Down
Render's free tier puts your container to sleep after **15 minutes of inactivity**.
* **Effect**: When a user visits the site after it has slept, the first request triggers a container wake-up, taking **50–60 seconds**.
* **Workaround**: You can set up a free uptime monitor (like [Uptime Robot](https://uptimerobot.com/)) to ping `https://bulkreach-backend.onrender.com/api/auth/login/` every 10–14 minutes, keeping the container active 24/7.

### 2. 512 MB Memory Constraints (Playwright Scraper)
Chromium (launched by Playwright) consumes substantial RAM. On a 512MB RAM free instance, running too many parallel tabs or scraping large sites will result in **Out-Of-Memory (OOM) errors** and crash the container.
* **Mitigation**:
  * Set Celery concurrency to `1` (`--concurrency=1` is already in the `start_free_prod.sh` file). This forces scraper jobs to run sequentially rather than concurrently.
  * In the scraper script, run Chromium in headless mode and pass lightweight flags like `--no-sandbox` and `--disable-dev-shm-usage`.

### 3. Serverless Neon Database Sleeping
Neon's free database branches auto-suspend after **5 minutes of inactivity**.
* **Effect**: The first database transaction after a period of inactivity may experience a latency bump of 2-3 seconds as Neon provisions compute. This is handled gracefully by Django and simple-jwt.
