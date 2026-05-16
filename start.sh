#!/bin/sh
set -eu

ROOT_DIR="/app"

export PYTHONPATH="$ROOT_DIR"
export SECRET_KEY="${SECRET_KEY:-verifund-dev-secret-key-change-me}"
export DEBUG="${DEBUG:-False}"
export ALLOWED_HOSTS="${ALLOWED_HOSTS:-*}"
export JWT_SECRET="${JWT_SECRET:-verifund-dev-jwt-secret}"
export JWT_EXPIRY_HOURS="${JWT_EXPIRY_HOURS:-24}"
export DATABASE_CONNECT_TIMEOUT="${DATABASE_CONNECT_TIMEOUT:-10}"
export DATABASE_SSLMODE="${DATABASE_SSLMODE:-require}"

# In the monolith container, microservices always talk over loopback.
# Do NOT point these at the public Railway URL — only the gateway is public.
export MEMBER_SERVICE_URL="http://127.0.0.1:8001"
export COOPERATIVE_SERVICE_URL="http://127.0.0.1:8002"
export CONTRIBUTION_SERVICE_URL="http://127.0.0.1:8003"
export WITHDRAWAL_SERVICE_URL="http://127.0.0.1:8004"
export NOTIFICATION_SERVICE_URL="http://127.0.0.1:8006"
# AI may be external (separate Railway service) or local on 8005.
export AI_SERVICE_URL="${AI_SERVICE_URL:-http://127.0.0.1:8005}"

should_run_builtin_ai() {
  case "$AI_SERVICE_URL" in
    http://127.0.0.1:*|http://localhost:*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

python "$ROOT_DIR/scripts/bootstrap_db.py"

(
  cd "$ROOT_DIR/member-service"
  python manage.py runserver 127.0.0.1:8001
) &
MEMBER_PID=$!

(
  cd "$ROOT_DIR/cooperative-service"
  python manage.py runserver 127.0.0.1:8002
) &
COOP_PID=$!

(
  cd "$ROOT_DIR/contribution-service"
  python manage.py runserver 127.0.0.1:8003
) &
CONTRIB_PID=$!

(
  cd "$ROOT_DIR/withdrawal-service"
  python manage.py runserver 127.0.0.1:8004
) &
WITHDRAW_PID=$!

AI_PID=""
if should_run_builtin_ai; then
  (
    cd "$ROOT_DIR/ai-service"
    python manage.py runserver 127.0.0.1:8005
  ) &
  AI_PID=$!
fi

(
  cd "$ROOT_DIR/notification-service"
  python manage.py runserver 127.0.0.1:8006
) &
NOTIFY_PID=$!

cleanup() {
  pids="$MEMBER_PID $COOP_PID $CONTRIB_PID $WITHDRAW_PID $NOTIFY_PID"
  if [ -n "$AI_PID" ]; then
    pids="$pids $AI_PID"
  fi
  kill $pids 2>/dev/null || true
}

trap cleanup INT TERM EXIT

cd "$ROOT_DIR/api-gateway"
exec python manage.py runserver "0.0.0.0:${PORT:-8000}"
