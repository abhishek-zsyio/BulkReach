"""
Desktop settings for BulkReach.
Configured for zero-dependency standalone local running.
Supports writeable home-directory storage and auto-generated keys.
"""
import os
from pathlib import Path
from cryptography.fernet import Fernet

# Define persistent user data directory in the user's home directory
USER_DATA_DIR = Path.home() / ".bulkreach"
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)

# ─── Helper: Load .env programmatically ──────────────────────────────────────
def load_env_file(env_path: Path):
    if env_path.exists():
        try:
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        # Strip whitespaces and quotes
                        os.environ[key.strip()] = val.strip().strip("'\"")
        except Exception as e:
            print(f"Failed to read env file {env_path}: {e}")

import sys

# Load environment variables from CWD or persistent home folder
load_env_file(Path.cwd() / ".env")
load_env_file(USER_DATA_DIR / ".env")

# Dev Fallback (Script): Find backend/.env relative to the settings file
script_dir = Path(__file__).resolve().parent
load_env_file(script_dir.parent.parent / ".env")

# Dev Fallback (Tauri Sidecar): Traverse up from the executable to locate backend/.env
if hasattr(sys, "frozen"):
    exe_dir = Path(sys.executable).resolve().parent
    for _ in range(6):
        dev_env = exe_dir / "backend" / ".env"
        if dev_env.exists():
            load_env_file(dev_env)
            break
        exe_dir = exe_dir.parent

# ─── Persistent Keys Management (Before base import to avoid Decouple crash) ─
# django-decouple raises an UndefinedValueError if SECRET_KEY is missing.
# We generate and persist it inside the user's home directory.
secret_key_file = USER_DATA_DIR / ".desktop_secret_key"
if not os.environ.get("SECRET_KEY"):
    if secret_key_file.exists():
        os.environ["SECRET_KEY"] = secret_key_file.read_text().strip()
    else:
        new_key = Fernet.generate_key().decode()
        try:
            secret_key_file.write_text(new_key)
        except Exception:
            pass
        os.environ["SECRET_KEY"] = new_key

# django-encrypted-model-fields requires a 32-byte urlsafe base64 key.
desktop_key_file = USER_DATA_DIR / ".desktop_encryption_key"
if not os.environ.get("FIELD_ENCRYPTION_KEY"):
    if desktop_key_file.exists():
        os.environ["FIELD_ENCRYPTION_KEY"] = desktop_key_file.read_text().strip()
    else:
        new_key = Fernet.generate_key().decode()
        try:
            desktop_key_file.write_text(new_key)
        except Exception:
            pass
        os.environ["FIELD_ENCRYPTION_KEY"] = new_key

# Now import the base settings, which will read keys from os.environ
from .base import *  # noqa

DEBUG = True

# Allow all local hosts
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "*"]

# ─── SQLite Database in User Home Folder ─────────────────────────────────────
# Using BASE_DIR fails in read-only Applications directory or temp folder.
# Writing it to USER_DATA_DIR ensures it's persistent and writeable.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": USER_DATA_DIR / "bulkreach.db",
    }
}

# ─── Celery Eager Mode (No Redis needed) ─────────────────────────────────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TASK_SOFT_TIME_LIMIT = None
CELERY_TASK_TIME_LIMIT = None

# Allow Google OAuth to use HTTP instead of HTTPS locally
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

# ─── Email Backend ───────────────────────────────────────────────────────────
# If email credentials are provided, use SMTP; otherwise, print to console.
if config("EMAIL_HOST_USER", default=""):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# CORS configuration for local UI connections
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
