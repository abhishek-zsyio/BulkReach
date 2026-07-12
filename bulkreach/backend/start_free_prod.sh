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
