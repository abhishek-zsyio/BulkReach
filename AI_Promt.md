# 📬 BulkReach — AI-Powered Job Outreach Platform
### Cursor / Windsurf / Antigravity Prompt

---

## 🎯 Project Overview

Build a full-stack **AI-powered bulk email outreach platform** called **BulkReach** that allows users to:

1. Upload a spreadsheet (`.xlsx` / `.csv`) containing recipient data (name, email, company, job title, etc.)
2. Select or create a **custom HTML email template** with dynamic variable injection
3. Attach a **PDF resume** per send campaign
4. Send **personalized bulk emails via Gmail SMTP / Gmail API**
5. View real-time **sending status, logs, and delivery reports**
6. (Phase 2) **Auto-scrape job listings** from LinkedIn, Naukri, Indeed, and similar platforms to auto-populate the spreadsheet

The system must be production-ready, modular, and built so that future developers can extend it without needing to reverse-engineer the codebase.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| State Management | Redux Toolkit + RTK Query |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Python 3.11 + Django 5.x |
| REST API | Django REST Framework (DRF) |
| Task Queue | Celery + Redis |
| Database | PostgreSQL |
| Email Sending | Gmail API (OAuth2) + SMTP fallback |
| File Parsing | openpyxl, pandas |
| PDF Handling | PyMuPDF / pdfplumber |
| Auth | JWT (djangorestframework-simplejwt) |
| Scraping (Phase 2) | Playwright + BeautifulSoup4 + Scrapy |
| Containerization | Docker + Docker Compose |
| Environment | `.env` managed via python-decouple |

---

## 📁 Folder Structure

Generate **exactly** this folder structure. Do not deviate.

```
bulkreach/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── celery_worker.sh
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py          # Shared settings
│   │   │   ├── development.py   # Dev overrides
│   │   │   └── production.py    # Prod overrides
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── accounts/            # User auth, Gmail OAuth token storage
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── services/
│   │   │       └── gmail_oauth.py   # Gmail OAuth2 token management
│   │   ├── campaigns/           # Core: campaigns, templates, attachments
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   ├── tasks.py         # Celery tasks for bulk sending
│   │   │   └── services/
│   │   │       ├── spreadsheet_parser.py   # xlsx/csv parsing logic
│   │   │       ├── email_sender.py          # Gmail API + SMTP abstraction
│   │   │       ├── template_renderer.py     # Jinja2 variable injection
│   │   │       └── attachment_handler.py    # PDF attach logic
│   │   ├── recipients/          # Recipient list management
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   ├── logs/                # Per-email send status tracking
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   └── scraper/             # Phase 2: job scraping engine
│   │       ├── models.py
│   │       ├── views.py
│   │       ├── urls.py
│   │       ├── tasks.py         # Celery scraping tasks
│   │       └── scrapers/
│   │           ├── base_scraper.py      # Abstract base class
│   │           ├── linkedin_scraper.py
│   │           ├── naukri_scraper.py
│   │           └── indeed_scraper.py
│   └── utils/
│       ├── pagination.py
│       ├── permissions.py
│       └── exceptions.py
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router/
│       │   └── index.tsx           # React Router v6 routes
│       ├── store/
│       │   ├── index.ts            # Redux store
│       │   └── slices/
│       │       ├── authSlice.ts
│       │       └── campaignSlice.ts
│       ├── api/
│       │   ├── baseApi.ts          # RTK Query base with JWT interceptor
│       │   ├── campaignApi.ts
│       │   ├── recipientApi.ts
│       │   └── logApi.ts
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Login.tsx
│       │   ├── Campaigns/
│       │   │   ├── CampaignList.tsx
│       │   │   ├── CampaignCreate.tsx
│       │   │   └── CampaignDetail.tsx
│       │   ├── Templates/
│       │   │   ├── TemplateList.tsx
│       │   │   └── TemplateEditor.tsx
│       │   ├── Recipients/
│       │   │   ├── RecipientList.tsx
│       │   │   └── SpreadsheetUpload.tsx
│       │   ├── Logs/
│       │   │   └── SendLogs.tsx
│       │   └── Scraper/            # Phase 2
│       │       └── ScraperDashboard.tsx
│       ├── components/
│       │   ├── ui/                 # shadcn/ui re-exports
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Navbar.tsx
│       │   │   └── AppLayout.tsx
│       │   ├── campaign/
│       │   │   ├── CampaignCard.tsx
│       │   │   └── StatusBadge.tsx
│       │   ├── spreadsheet/
│       │   │   ├── DropzoneUpload.tsx
│       │   │   └── ColumnMapper.tsx     # Map spreadsheet columns → template vars
│       │   ├── template/
│       │   │   └── RichTemplateEditor.tsx  # WYSIWYG + variable chips
│       │   └── logs/
│       │       └── LogTable.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useCampaign.ts
│       ├── types/
│       │   ├── campaign.ts
│       │   ├── recipient.ts
│       │   └── log.ts
│       └── utils/
│           ├── constants.ts
│           └── helpers.ts
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/
│   └── nginx.conf
└── README.md
```

---

## 🗄️ Django Models

### `accounts/models.py`
```python
# UserProfile — extends AbstractUser
# Fields: gmail_access_token (encrypted), gmail_refresh_token (encrypted),
#         gmail_token_expiry, sender_name, sender_email
```

### `campaigns/models.py`
```python
# Campaign
# Fields: id, user (FK), name, subject_template, status (draft/queued/running/done/failed),
#         spreadsheet_file, resume_attachment, template (FK to EmailTemplate),
#         total_recipients, sent_count, failed_count, created_at, started_at, completed_at

# EmailTemplate
# Fields: id, user (FK), name, html_body, available_variables (JSONField),
#         is_default, created_at

# Note: html_body uses Jinja2 syntax: {{ recipient_name }}, {{ company_name }}, etc.
```

### `recipients/models.py`
```python
# RecipientList
# Fields: id, campaign (FK), raw_data (JSONField — full row from spreadsheet),
#         email, name, status (pending/sent/failed/skipped), error_message, sent_at
```

### `logs/models.py`
```python
# SendLog
# Fields: id, campaign (FK), recipient (FK), timestamp, event_type (sent/failed/bounced),
#         gmail_message_id, error_detail
```

---

## 🔌 Django REST API Endpoints

```
# Auth
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/token/refresh/
GET    /api/auth/gmail/connect/      → redirect to Google OAuth
GET    /api/auth/gmail/callback/     → handle OAuth2 callback, store tokens

# Campaigns
GET    /api/campaigns/
POST   /api/campaigns/
GET    /api/campaigns/:id/
PATCH  /api/campaigns/:id/
DELETE /api/campaigns/:id/
POST   /api/campaigns/:id/start/     → enqueue Celery bulk send task
POST   /api/campaigns/:id/pause/
POST   /api/campaigns/:id/cancel/

# Spreadsheet
POST   /api/campaigns/:id/upload-spreadsheet/    → parse and return columns + preview rows
POST   /api/campaigns/:id/map-columns/           → save column→variable mapping

# Email Templates
GET    /api/templates/
POST   /api/templates/
GET    /api/templates/:id/
PUT    /api/templates/:id/
DELETE /api/templates/:id/
POST   /api/templates/:id/preview/   → render template with sample data and return HTML

# Recipients
GET    /api/campaigns/:id/recipients/
GET    /api/campaigns/:id/recipients/export/     → download as CSV

# Logs
GET    /api/campaigns/:id/logs/
GET    /api/campaigns/:id/logs/stats/   → { total, sent, failed, pending }

# Scraper (Phase 2)
POST   /api/scraper/jobs/             → trigger scrape job { platform, keywords, location }
GET    /api/scraper/jobs/
GET    /api/scraper/jobs/:id/results/
POST   /api/scraper/jobs/:id/import/  → import scraped results into a campaign
```

---

## ⚙️ Celery Tasks

### `campaigns/tasks.py`

```python
# Task: send_campaign_emails(campaign_id)
# - Fetch all pending RecipientList entries for the campaign
# - For each recipient:
#     1. Render html_body via template_renderer.py (inject row variables)
#     2. Attach resume PDF via attachment_handler.py
#     3. Send via email_sender.py (Gmail API preferred, SMTP fallback)
#     4. Update RecipientList status → sent or failed
#     5. Write to SendLog
#     6. Update Campaign.sent_count / failed_count
#     7. Sleep configurable delay (default 1.5s) between sends to avoid Gmail rate limits
# - On completion: update Campaign.status → done or failed
# - On exception: set Campaign.status → failed, log error
```

### `scraper/tasks.py` (Phase 2)

```python
# Task: run_scrape_job(scrape_job_id)
# - Instantiate the correct scraper class based on platform
# - Run scraper with keywords + location filters
# - Store structured results: { name, email (if public), company, job_title, linkedin_url }
# - Update ScrapeJob status and result count
```

---

## 📧 Gmail Integration Details

### OAuth2 Flow
- Use `google-auth`, `google-auth-oauthlib`, `google-api-python-client`
- Scopes required: `https://www.googleapis.com/auth/gmail.send`
- Store encrypted tokens in `UserProfile`
- Auto-refresh expired tokens before send
- Fallback to SMTP if no OAuth token present (use `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` from `.env`)

### Email Sending (Gmail API)
```python
# In email_sender.py:
# build_message(to, subject, html_body, attachment_path) → MIMEMultipart object
# send_via_gmail_api(user, mime_message) → message_id
# send_via_smtp(mime_message) → bool
```

---

## 📊 Spreadsheet Parsing Rules

- Supported formats: `.xlsx`, `.xls`, `.csv`
- On upload: parse headers, return column names + first 5 rows as preview
- User maps columns to template variables via UI (e.g., `Column B → {{ recipient_name }}`)
- Validation: email column is required; warn if email format invalid
- Store mapping in `Campaign.column_mapping` (JSONField)
- Library: `openpyxl` for xlsx, `pandas` for csv + complex sheets

---

## 🎨 Frontend Pages & Behavior

### Dashboard (`/dashboard`)
- Stats cards: total campaigns, emails sent today, success rate, failed count
- Recent campaigns table with status badges
- Quick action: "New Campaign" button

### Campaign Create (`/campaigns/new`) — Multi-step wizard
- **Step 1 — Details**: Campaign name, email subject (supports `{{ }}` variables)
- **Step 2 — Template**: Select existing template OR create new in rich editor
  - WYSIWYG editor (use Quill or TipTap)
  - Variable chip panel on the right: click to insert `{{ variable_name }}`
  - Live preview panel
- **Step 3 — Recipients**: Drag-and-drop spreadsheet upload → column mapper UI → preview table
- **Step 4 — Attachment**: Upload PDF resume (optional, max 5MB)
- **Step 5 — Review & Launch**: Summary of all settings, "Start Campaign" button

### Campaign Detail (`/campaigns/:id`)
- Real-time progress bar (poll `/logs/stats/` every 3s while running)
- Status badge (draft / queued / running / done / failed)
- Recipient table with individual status per row
- "Pause" and "Cancel" buttons when running
- Export recipients as CSV

### Template Editor (`/templates/:id/edit`)
- Rich HTML editor with variable chips
- Send test email feature (sends to logged-in user's email)

### Send Logs (`/campaigns/:id/logs`)
- Filterable table: All / Sent / Failed
- Columns: Recipient, Email, Status, Timestamp, Error (if any)
- Export as CSV

### Scraper Dashboard (`/scraper`) — Phase 2
- Form: platform selector (LinkedIn / Naukri / Indeed), keywords, location, max results
- Trigger scrape → real-time progress indicator
- Results table: Name, Email, Company, Job Title, Source URL
- "Import to Campaign" button → opens campaign selector modal

---

## 🔐 Environment Variables

### `backend/.env.example`
```
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://bulkreach:password@localhost:5432/bulkreach
REDIS_URL=redis://localhost:6379/0

# Gmail OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/gmail/callback/

# SMTP Fallback
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Security
FIELD_ENCRYPTION_KEY=   # for encrypting OAuth tokens at rest
JWT_SECRET_KEY=
```

### `frontend/.env.example`
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=
```

---

## 🐳 Docker Compose

Generate a `docker-compose.yml` with these services:
- `db` — PostgreSQL 15
- `redis` — Redis 7
- `backend` — Django app (gunicorn)
- `celery` — Celery worker (same image as backend)
- `celery-beat` — Celery beat scheduler
- `frontend` — Vite dev server (or Nginx for prod)

All services share a `bulkreach_network`. Use named volumes for Postgres data.

---

## 📦 Python Dependencies (`requirements.txt`)

```
django>=5.0
djangorestframework
djangorestframework-simplejwt
django-cors-headers
django-decouple
psycopg2-binary
celery[redis]
redis
google-auth
google-auth-oauthlib
google-api-python-client
openpyxl
pandas
PyMuPDF
Pillow
django-encrypted-model-fields
gunicorn

# Phase 2 (scraping)
playwright
beautifulsoup4
scrapy
```

---

## 📦 Frontend Dependencies (`package.json`)

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@reduxjs/toolkit": "latest",
    "react-redux": "latest",
    "@tanstack/react-query": "latest",
    "axios": "latest",
    "tailwindcss": "latest",
    "@radix-ui/react-*": "latest",
    "shadcn-ui": "latest",
    "@tiptap/react": "latest",
    "@tiptap/starter-kit": "latest",
    "react-dropzone": "latest",
    "react-hook-form": "latest",
    "zod": "latest",
    "date-fns": "latest",
    "lucide-react": "latest",
    "xlsx": "latest",
    "papaparse": "latest",
    "react-hot-toast": "latest"
  }
}
```

---

## 🧱 Code Quality Rules

1. **Every Django view must use DRF class-based views** (`APIView` or `ModelViewSet`).
2. **Every serializer must include validation** for required fields.
3. **All Celery tasks must be idempotent** — safe to retry on failure.
4. **Gmail tokens must never be logged** or returned in API responses.
5. **React components must be typed** — no `any`, use defined TypeScript interfaces.
6. **All API calls go through RTK Query** — no raw `fetch` or `axios` calls outside `api/`.
7. **Spreadsheet parsing happens server-side only** — never parse in the browser.
8. **Rate limiting**: add 1.5s sleep between emails. Make this configurable via `Campaign.send_delay_seconds`.
9. **Email send must not block the request** — always goes through Celery.
10. **Template variables** follow strictly `{{ variable_name }}` Jinja2 syntax.

---

## 🚀 Phase Roadmap

| Phase | Features |
|---|---|
| **Phase 1 (MVP)** | Auth, Gmail OAuth, spreadsheet upload, template editor, bulk send, logs |
| **Phase 2** | LinkedIn/Naukri/Indeed scraper, auto-import to campaign |
| **Phase 3** | Email open tracking (pixel), bounce handling, unsubscribe link, analytics dashboard |
| **Phase 4** | Multi-user / team support, role-based access, shared template library |

---

## ✅ Start Here — Build Order

Build in this exact sequence:

1. `docker-compose.yml` + all Dockerfiles
2. Django project scaffold with split settings
3. `accounts` app — models, auth endpoints, Gmail OAuth flow
4. `campaigns` app — models, serializers, basic CRUD views
5. `recipients` app — models, spreadsheet upload + parsing endpoint
6. `logs` app — models, status endpoint
7. Celery setup — worker, beat, Redis connection
8. `campaigns/tasks.py` — bulk send task with Gmail API
9. React scaffold — Vite + Tailwind + shadcn/ui + Redux
10. Auth pages — Login, JWT storage, route guard
11. Dashboard page
12. Campaign create wizard (5 steps)
13. Campaign detail + live polling
14. Template editor
15. Send logs page
16. Phase 2: scraper app + frontend scraper dashboard

---

## 📝 Additional Notes for the AI Editor

- Generate complete, working files — no placeholder comments like `# TODO: implement`
- Every model must have a `__str__` method and a `Meta` class with `ordering`
- Every Django app must be registered in `INSTALLED_APPS` in `base.py`
- Generate `admin.py` for every app with all models registered
- Generate database migrations for all apps
- Include `CORS_ALLOWED_ORIGINS` pointing to the frontend dev port
- Use `django-decouple` for all env vars — no hardcoded secrets
- The README must include: local setup steps, env var explanations, Gmail OAuth setup guide, how to run Celery, and how to run the scraper