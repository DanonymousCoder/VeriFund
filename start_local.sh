#!/bin/bash
set -eu

# Resolve the absolute path to this directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if it exists
if [ -f "$ROOT_DIR/.env" ]; then
  # Load env variables ignoring comments
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

export PYTHONPATH="$ROOT_DIR"
export SECRET_KEY="${SECRET_KEY:-verifund-dev-secret-key-change-me}"
export DEBUG="${DEBUG:-True}"
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
export AI_SERVICE_URL="http://127.0.0.1:8005"

# Setup virtual environment if not present
if [ ! -d "$ROOT_DIR/.venv" ]; then
  echo "[start] Creating python virtual environment..."
  python3 -m venv "$ROOT_DIR/.venv"
fi

# Activate virtualenv and install dependencies
source "$ROOT_DIR/.venv/bin/activate"
echo "[start] Installing/updating python dependencies..."
pip install -q -r "$ROOT_DIR/requirements.txt"

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
  
  cd "$ROOT_DIR/member-service" && python manage.py runserver 127.0.0.1:8001 --noreload &
  MEMBER_PID=$!

  cd "$ROOT_DIR/cooperative-service" && python manage.py runserver 127.0.0.1:8002 --noreload &
  COOP_PID=$!

  cd "$ROOT_DIR/contribution-service" && python manage.py runserver 127.0.0.1:8003 --noreload &
  CONTRIB_PID=$!

  cd "$ROOT_DIR/withdrawal-service" && python manage.py runserver 127.0.0.1:8004 --noreload &
  WITHDRAW_PID=$!

  cd "$ROOT_DIR/ai-service" && python manage.py runserver 127.0.0.1:8005 --noreload &
  AI_PID=$!

  cd "$ROOT_DIR/notification-service" && python manage.py runserver 127.0.0.1:8006 --noreload &
  NOTIFY_PID=$!

  wait "$MEMBER_PID" "$COOP_PID" "$CONTRIB_PID" "$WITHDRAW_PID" "$NOTIFY_PID" "$AI_PID"
}

cleanup() {
  echo ""
  echo "[start] shutting down background services (PIDs: $MEMBER_PID $COOP_PID $CONTRIB_PID $WITHDRAW_PID $NOTIFY_PID $AI_PID)..."
  kill $MEMBER_PID $COOP_PID $CONTRIB_PID $WITHDRAW_PID $NOTIFY_PID $AI_PID 2>/dev/null || true
}

trap cleanup INT TERM EXIT

start_microservices &
SERVICES_PID=$!

echo "[start] waiting for internal services to bind..."
sleep 5

echo "[start] launching api-gateway on http://127.0.0.1:8000..."
cd "$ROOT_DIR/api-gateway"
exec python manage.py runserver 127.0.0.1:8000 --noreload
