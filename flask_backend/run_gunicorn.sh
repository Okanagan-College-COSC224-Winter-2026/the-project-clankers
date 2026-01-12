#!/bin/sh
# Entrypoint for the Flask backend container. Ensures the DB schema exists
# before handing off to Gunicorn. Safe to run on every start.

set -e

APP_MODULE="${FLASK_APP:-api}"

if [ "${SKIP_DB_INIT:-false}" != "true" ]; then
    echo "[entrypoint] Ensuring database schema exists via 'flask init_db'..."
    flask --app "$APP_MODULE" init_db
    echo "[entrypoint] Ensuring default admin exists via 'flask ensure_admin' (set DEFAULT_ADMIN_* env vars)..."
    flask --app "$APP_MODULE" ensure_admin
fi

exec gunicorn \
    --bind 0.0.0.0:5000 \
    --workers "${GUNICORN_WORKERS:-4}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    "${APP_MODULE}:create_app()"
