# 📬 BulkReach — AI-Powered Job Outreach Platform

> Production-ready bulk email outreach platform with Gmail API, Celery async sending, and a React dashboard.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+ (for local dev without Docker)

### 1. Clone & Configure Environment

```bash
git clone https://github.com/your-org/bulkreach.git
cd bulkreach

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your credentials (see Environment Variables below).

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

Services will start at:
| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Django API | http://localhost:8000 |
| API Docs | http://localhost:8000/api/docs/ |
| Django Admin | http://localhost:8000/admin/ |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 3. Run Migrations & Create Superuser

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### 4. Local Development (Without Docker)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit with your config

python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

---

## 🔑 Environment Variables

### `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | Django secret key | `django-insecure-...` |
| `DEBUG` | Enable debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/bulkreach` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `http://localhost:8000/api/auth/gmail/callback/` |
| `EMAIL_HOST_USER` | SMTP Gmail address (fallback) | `you@gmail.com` |
| `EMAIL_HOST_PASSWORD` | Gmail app password (fallback) | App-specific password |
| `CELERY_BROKER_URL` | Celery broker | `redis://localhost:6379/0` |
| `CELERY_RESULT_BACKEND` | Celery results | `redis://localhost:6379/1` |
| `FIELD_ENCRYPTION_KEY` | Fernet key for token encryption | 32-byte base64 key |
| `JWT_SECRET_KEY` | JWT signing key | Long random string |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL (e.g. `http://localhost:8000/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Google client ID (for frontend OAuth button) |

---

## 🔐 Gmail OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project → Enable **Gmail API**
3. Go to **OAuth consent screen** → External → Add your email as a test user
4. Go to **Credentials** → Create **OAuth 2.0 Client ID** → Web application
5. Add Authorized redirect URI: `http://localhost:8000/api/auth/gmail/callback/`
6. Copy the **Client ID** and **Client Secret** into `backend/.env`
7. In the app, go to your profile → **Connect Gmail** → Authorize

The app will store tokens **encrypted at rest** using `django-encrypted-model-fields`. Tokens are **never logged or returned via API**.

### Generating the `FIELD_ENCRYPTION_KEY`

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

---

## ⚙️ Running Celery

### With Docker (recommended)
Celery starts automatically via `docker-compose up`.

### Manually

```bash
# In the backend directory with venv activated:

# Start worker (processes emails + scraping)
celery -A config worker --loglevel=info --queues=default,emails,scraping

# Start beat scheduler (periodic tasks)
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# Monitor tasks (optional)
celery -A config flower
```

---

## 🕷️ Running the Job Scraper (Phase 2)

The scraper supports **LinkedIn**, **Naukri**, and **Indeed**.

### Install Playwright browsers

```bash
pip install playwright
playwright install chromium
```

### Trigger a scrape via API

```bash
curl -X POST http://localhost:8000/api/scraper/jobs/ \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"platform": "linkedin", "keywords": "python developer", "location": "remote", "max_results": 50}'
```

Or use the **Scraper Dashboard** at `http://localhost:5173/scraper`.

> ⚠️ **Note**: Web scraping may violate the Terms of Service of some platforms. Always check the ToS before scraping. Use the official LinkedIn API where possible.

---

## 📁 Project Structure

```
bulkreach/
├── backend/              # Django 5 + DRF + Celery
│   ├── apps/
│   │   ├── accounts/     # User auth + Gmail OAuth
│   │   ├── campaigns/    # Core: campaigns, templates, email sending
│   │   ├── recipients/   # Spreadsheet upload + recipient management
│   │   ├── logs/         # Send log tracking
│   │   └── scraper/      # Phase 2: job scraping engine
│   ├── config/           # Django settings (base / dev / prod)
│   └── utils/            # Pagination, permissions, exceptions
├── frontend/             # React 18 + TypeScript + Vite + Tailwind
│   └── src/
│       ├── api/          # RTK Query endpoints (all API calls go through here)
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route-level page components
│       ├── store/        # Redux store + slices
│       └── types/        # TypeScript interfaces
├── nginx/                # Nginx reverse proxy config
├── docker-compose.yml    # Development services
└── docker-compose.prod.yml  # Production services
```

---

## 🔄 API Reference

Interactive docs available at: **http://localhost:8000/api/docs/**

Key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register/` | Register new user |
| `POST` | `/api/auth/login/` | Login, get JWT tokens |
| `GET` | `/api/auth/gmail/connect/` | Start Gmail OAuth flow |
| `GET` | `/api/campaigns/` | List campaigns |
| `POST` | `/api/campaigns/` | Create campaign |
| `POST` | `/api/campaigns/:id/start/` | Queue bulk send task |
| `POST` | `/api/campaigns/:id/upload-spreadsheet/` | Upload & parse spreadsheet |
| `POST` | `/api/campaigns/:id/map-columns/` | Save column mapping |
| `GET` | `/api/templates/` | List templates |
| `POST` | `/api/templates/:id/preview/` | Render template preview |
| `GET` | `/api/logs/campaigns/:id/logs/stats/` | Get real-time send stats |
| `POST` | `/api/scraper/jobs/` | Trigger scrape job |

---

## 🏗️ Phase Roadmap

| Phase | Status | Features |
|---|---|---|
| **Phase 1 (MVP)** | ✅ Complete | Auth, Gmail OAuth, spreadsheet upload, template editor, bulk send, logs |
| **Phase 2** | 🚧 In Progress | LinkedIn/Naukri/Indeed scraper, auto-import |
| **Phase 3** | 📋 Planned | Open tracking, bounce handling, unsubscribe links, analytics |
| **Phase 4** | 📋 Planned | Multi-user teams, role-based access, shared templates |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see `LICENSE` file for details.
