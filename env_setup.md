# 🔑 BulkReach Environment Variables Configuration

This file contains the configuration variables for both the **Backend** and **Frontend** environments. 

The secret keys (`SECRET_KEY`, `JWT_SECRET_KEY`, and `FIELD_ENCRYPTION_KEY`) have been securely generated. The Google OAuth credentials have been pre-filled from your Google Client Secret JSON file.

---

## 📁 Backend Configuration (`backend/.env`)

Create a file named `.env` in the `backend/` directory (or overwrite the existing one) and paste the following content:

```env
SECRET_KEY=CRwHRTeDqmfgdj3VA8zCkU9xttEAoGOFQFSzTVtbdxf7ZxNNKxoG7eNfwj5bJBZhvCw
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_URL=postgres://bulkreach:password@localhost:5432/bulkreach

REDIS_URL=redis://localhost:6379/0

# Gmail OAuth (extracted from Google Credentials)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/gmail/callback/

# SMTP Fallback (Optional: configure if you want to use SMTP instead of Gmail API)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Security Cryptography Keys
FIELD_ENCRYPTION_KEY=UoKCOAG28tPVRLBrLoqFqpNWZsBI7PBwTwKZ3PFZ0Xw=
JWT_SECRET_KEY=rnGxYbNPmrP23eUiKM3Aik_qoUS8G3ul_S2JXzN-uRBZa8GeKBlQNHGjt7ExtzmzNr0

# Postgres (used by Docker setup)
POSTGRES_DB=bulkreach
POSTGRES_USER=bulkreach
POSTGRES_PASSWORD=password

# Django Settings Module
DJANGO_SETTINGS_MODULE=config.settings.development
```

---

## 📁 Frontend Configuration (`frontend/.env`)

Create a file named `.env` in the `frontend/` directory (or overwrite the existing one) and paste the following content:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```
