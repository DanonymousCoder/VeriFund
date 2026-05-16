#!/bin/sh
set -eu

ROOT_DIR="/app"
APP_PORT="${PORT:-8000}"

export PYTHONPATH="$ROOT_DIR"
export SECRET_KEY="${SECRET_KEY:-verifund-dev-secret-key-change-me}"
export DEBUG="${DEBUG:-False}"
export ALLOWED_HOSTS="${ALLOWED_HOSTS:-*}"
export JWT_SECRET="${JWT_SECRET:-verifund-dev-jwt-secret}"
export JWT_EXPIRY_HOURS="${JWT_EXPIRY_HOURS:-24}"
export DATABASE_CONNECT_TIMEOUT="${DATABASE_CONNECT_TIMEOUT:-10}"
export DATABASE_SSLMODE="${DATABASE_SSLMODE:-require}"

export MEMBER_SERVICE_URL="http://127.0.0.1:8001"
export COOPERATIVE_SERVICE_URL="http://127.0.0.1:8002"
export CONTRIBUTION_SERVICE_URL="http://127.0.0.1:8003"
export WITHDRAWAL_SERVICE_URL="http://127.0.0.1:8004"
export NOTIFICATION_SERVICE_URL="http://127.0.0.1:8006"
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

MEMBER_PID=""
COOP_PID=""
CONTRIB_PID=""
WITHDRAW_PID=""
AI_PID=""
NOTIFY_PID=""
SERVICES_PID=""

start_microservices() {
  echo "[start] bootstrapping database..."
  if ! python "$ROOT_DIR/scripts/bootstrap_db.py"; then
    echo "[start] WARNING: database bootstrap failed; API may be limited until DB is reachable."
  fi

  echo "[start] launching internal microservices..."
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

  wait "$MEMBER_PID" "$COOP_PID" "$CONTRIB_PID" "$WITHDRAW_PID" "$NOTIFY_PID" ${AI_PID:+"$AI_PID"}
}

cleanup() {
  kill ${SERVICES_PID:-} $MEMBER_PID $COOP_PID $CONTRIB_PID $WITHDRAW_PID $NOTIFY_PID ${AI_PID:+"$AI_PID"} 2>/dev/null || true
}

trap cleanup INT TERM EXIT

start_microservices &
SERVICES_PID=$!

echo "[start] launching api-gateway on 0.0.0.0:${APP_PORT}..."
cd "$ROOT_DIR/api-gateway"
exec python manage.py runserver "0.0.0.0:${APP_PORT}"
