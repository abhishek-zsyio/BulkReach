#!/bin/bash
set -e

echo "Starting Celery worker..."
celery -A config worker --loglevel=info --concurrency=4 -Q default,emails,scraping
