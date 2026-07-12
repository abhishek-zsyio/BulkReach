# 🌐 BulkReach Production Deployment Guide

This guide provides instructions for deploying **BulkReach** to a production environment using **Docker Compose**, **Nginx**, **Gunicorn**, **Celery**, **PostgreSQL**, and **Redis**.

---

## 🏗️ Production Architecture Overview

In a production environment, the services are organized as follows:

![Production Architecture Diagram](./bulkreach/system_architecture.png)

- **Nginx**: Handles SSL/TLS termination, routes API requests to Gunicorn, serves the static React frontend, and serves media/static files.
- **Gunicorn**: WSGI HTTP server running Django, configured with multiple worker processes for concurrent request handling.
- **Celery Worker**: Processes asynchronous outreach campaigns, Excel/CSV file parsing, and web scraping tasks in the background.
- **Celery Beat**: Triggers scheduled tasks (e.g. database cleanups, scraping schedules, campaign queues) using the Django database database scheduler.
- **PostgreSQL**: Production-grade relational database for persistent data.
- **Redis**: Fast, in-memory database acting as the Celery message broker and caching layer.

---

## 📋 Prerequisites

Before starting the deployment, make sure you have:
1. A Linux server (e.g., Ubuntu 22.04 LTS on AWS EC2, DigitalOcean, or Linode) with at least **2 CPU cores and 4GB RAM** (recommended due to Chrome/Playwright scraping requirements).
2. **Docker** and **Docker Compose (v2)** installed on the server.
3. A registered domain name (e.g., `bulkreach.com`) pointed to your server's public IP using **DNS A Records** (e.g., `bulkreach.com` and `www.bulkreach.com`).
4. **Google Cloud Console OAuth Credentials** configured with production callback URLs (see [Gmail OAuth Configuration](#-gmail-oauth-configuration)).

---

## 🔒 Step 1: SSL & Domain Setup (Let's Encrypt)

Before booting up Nginx in production, you should obtain a free SSL certificate from Let's Encrypt using **Certbot**.

### 1. Install Certbot
On Ubuntu:
```bash
sudo apt update
sudo apt install -y certbot
```

### 2. Generate Certificates
Run Certbot in standalone mode to obtain the certificate (make sure port 80 is not currently occupied):
```bash
sudo certbot certonly --standalone -d bulkreach.com -d www.bulkreach.com
```
Your certificates will be saved to `/etc/letsencrypt/live/bulkreach.com/`.

---

## ⚙️ Step 2: Configure Environment Variables

Create the production environment files on your server.

### 1. Backend Environment Configuration (`bulkreach/backend/.env`)

Create a secure `.env` file in the `backend/` directory:

```env
# ─── Core Django Settings ───────────────────────────────────────────────────
SECRET_KEY=your_very_long_random_production_secret_key_here
DEBUG=False
ALLOWED_HOSTS=bulkreach.com,www.bulkreach.com,backend_service

# ─── Database & Cache Settings ──────────────────────────────────────────────
DATABASE_URL=postgres://bulkreach_prod_user:your_secure_db_password@db:5432/bulkreach_prod
REDIS_URL=redis://redis:6379/0

# ─── Postgres Settings (Used by db container initialization) ────────────────
POSTGRES_DB=bulkreach_prod
POSTGRES_USER=bulkreach_prod_user
POSTGRES_PASSWORD=your_secure_db_password

# ─── Django Environment Configuration ───────────────────────────────────────
DJANGO_SETTINGS_MODULE=config.settings.production
SECURE_SSL_REDIRECT=True

# ─── Gmail OAuth2 Production Setup ──────────────────────────────────────────
GOOGLE_CLIENT_ID=your_production_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
GOOGLE_REDIRECT_URI=https://bulkreach.com/api/auth/gmail/callback/

# ─── Cryptography Settings ──────────────────────────────────────────────────
# Generating Key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FIELD_ENCRYPTION_KEY=your_32_byte_base64_encryption_key_here
JWT_SECRET_KEY=your_secure_jwt_signing_key_here

# ─── Celery Settings ────────────────────────────────────────────────────────
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# ─── URLs ───────────────────────────────────────────────────────────────────
FRONTEND_URL=https://bulkreach.com
BACKEND_URL=https://bulkreach.com
```

### 2. Frontend Environment Configuration (`bulkreach/frontend/.env`)

Create `.env` in the `frontend/` directory:

```env
VITE_API_BASE_URL=https://bulkreach.com/api
VITE_GOOGLE_CLIENT_ID=your_production_google_client_id.apps.googleusercontent.com
```

---

## 🛠️ Step 3: Production Adjustments (Nginx & Dockerfiles)

The default Docker setup requires some modifications to support:
1. Compiling and packaging the React frontend assets inside Nginx.
2. Installing Playwright dependencies inside the Celery and Django backend container.

### 1. Create a Multi-Stage Dockerfile for Nginx
Create a new file [nginx/Dockerfile](file:///Users/apple/untitled%20folder/job/bulkreach/nginx/Dockerfile) to build the frontend and serve it:

```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

# Inject production environment variables during the build
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from the builder stage
COPY --from=builder /app/dist /var/www/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Update Production Docker Compose (`bulkreach/docker-compose.prod.yml`)

Modify the `nginx` service in [docker-compose.prod.yml](file:///Users/apple/untitled%20folder/job/bulkreach/docker-compose.prod.yml) to use this Dockerfile and mount the SSL certificates. 

Replace the `nginx` service block with:

```yaml
  nginx:
    build:
      context: .
      dockerfile: ./nginx/Dockerfile
      args:
        - VITE_API_BASE_URL=https://bulkreach.com/api
        - VITE_GOOGLE_CLIENT_ID=your_production_google_client_id.apps.googleusercontent.com
    container_name: bulkreach_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - static_files:/var/www/static
      - media_files:/var/www/media
    networks:
      - bulkreach_network
    depends_on:
      - backend
```

### 3. Update the Production Nginx Configuration (`bulkreach/nginx/nginx.conf`)

Update [nginx/nginx.conf](file:///Users/apple/untitled%20folder/job/bulkreach/nginx/nginx.conf) to support both HTTP (redirection) and HTTPS (SSL configuration):

```nginx
upstream backend {
    server backend:8000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name bulkreach.com www.bulkreach.com;
    return 301 https://$host$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name bulkreach.com www.bulkreach.com;

    ssl_certificate /etc/letsencrypt/live/bulkreach.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bulkreach.com/privkey.pem;

    # SSL hardening (Recommended)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    client_max_body_size 20M;

    # API Proxy Routing
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Django Admin Proxy Routing
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Static Files
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Django Media Files
    location /media/ {
        alias /var/www/media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Serve React SPA Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Enable Playwright Browsers in Backend (`bulkreach/backend/Dockerfile`)

Because the scraping engine runs in the Celery worker container, the backend image needs **Chromium** and all necessary **system libraries** installed. 

Update the [backend/Dockerfile](file:///Users/apple/untitled%20folder/job/bulkreach/backend/Dockerfile) to install Playwright and download browsers during build time:

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (including curl and packages required by playwright)
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

RUN mkdir -p /app/media /app/staticfiles

EXPOSE 8000
```

---

## 🔑 Gmail OAuth Configuration

In order to allow users to authenticate and send outreach emails through Gmail in production, update your OAuth Client ID settings:

1. Visit the [Google Cloud Console Credentials Screen](https://console.cloud.google.com/apis/credentials).
2. Edit your **OAuth 2.0 Client ID** created for BulkReach.
3. Under **Authorized JavaScript origins**, add:
   - `https://bulkreach.com`
   - `https://www.bulkreach.com`
4. Under **Authorized redirect URIs**, add:
   - `https://bulkreach.com/api/auth/gmail/callback/`
   - `https://www.bulkreach.com/api/auth/gmail/callback/`
5. Click **Save**.

---

## 🚀 Step 4: Deploying the Application

Execute these steps on the server to build and run the services.

### 1. Build and Run the Stack
From the workspace root directory (where `docker-compose.prod.yml` resides), run:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
This builds your Django backend, downloads Playwright and chromium, builds the React frontend within the custom Nginx image, and boots PostgreSQL, Redis, Celery, and Nginx.

### 2. Apply Database Migrations
Run the migrations to create the database schemas inside PostgreSQL:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### 3. Create a Django Superuser
To access the Admin panel at `https://bulkreach.com/admin/`:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

## 🛠️ Step 5: Operations, Monitoring & Maintenance

### 1. Logging and Troubleshooting
Monitor logs for the entire stack or individual containers:
```bash
# Check all logs
docker compose -f docker-compose.prod.yml logs -f

# Check celery worker (useful for tracking scrapers and email sending)
docker compose -f docker-compose.prod.yml logs -f celery

# Check Nginx access/error logs
docker compose -f docker-compose.prod.yml logs -f nginx
```

### 2. PostgreSQL Backups
To create a database backup:
```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U bulkreach_prod_user bulkreach_prod > backup.sql
```

To restore a database backup:
```bash
docker compose -f docker-compose.prod.yml exec -T db psql -U bulkreach_prod_user -d bulkreach_prod < backup.sql
```

### 3. Scaling Celery Workers
If email sending or scraping jobs are queuing up, scale your worker instance count:
```bash
docker compose -f docker-compose.prod.yml up -d --scale celery=3
```

### 4. Celery Beat Scheduler Restart
If periodic tasks do not trigger, verify that celery-beat is running properly:
```bash
docker compose -f docker-compose.prod.yml restart celery-beat
```
