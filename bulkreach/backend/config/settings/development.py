"""Development settings — extends base."""
from .base import *  # noqa

DEBUG = True

# Allow all hosts in dev (enables testing on local network Wi-Fi)
ALLOWED_HOSTS = ["*"]

DATABASES["default"]["HOST"] = "localhost"

# Allow all origins in dev
CORS_ALLOW_ALL_ORIGINS = True

# Django Debug Toolbar (optional, install separately)
INTERNAL_IPS = ["127.0.0.1"]

# Email backend override for local testing
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Allow Google OAuth to use HTTP instead of HTTPS for local development
import os
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

# Enable verbose app logging in development
LOGGING["loggers"]["apps"]["level"] = "DEBUG"  # type: ignore[index]

# Disable Celery task time limits in dev so tasks don't timeout during debugging
CELERY_TASK_SOFT_TIME_LIMIT = None
CELERY_TASK_TIME_LIMIT = None

