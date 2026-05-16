# VeriFund

Cooperative finance platform: member onboarding, Squad-powered contributions, multi-signature withdrawals, AI risk scoring, and email notifications.

## Architecture

| Service | Port | Role |
|---|---|---|
| `api-gateway` | `8000` | Public API for the frontend |
| `member-service` | `8001` | Auth and member profiles |
| `cooperative-service` | `8002` | Cooperatives, trust scores, regulator views |
| `contribution-service` | `8003` | Virtual accounts and Squad webhooks |
| `withdrawal-service` | `8004` | Multi-signature withdrawals |
| `ai-service` | `8005` | Anomaly scoring, cooperative risk, triage |
| `notification-service` | `8006` | Email notifications (Python `smtplib`) |

## Local development

1. Copy `.env.example` to `.env` and fill in secrets.
2. Start services:

```bash
docker compose up --build -d
```

3. Bootstrap the database:

```bash
docker compose exec contribution-service python /app/scripts/bootstrap_db.py
```

4. API base URL: `http://localhost:8000`

Manual endpoint examples: `tests/verifund-endpoints.http`

## Deploy on Railway

Use **two services** from this repo (same root directory for both).

### Backend (monolith)

- `railway.json` + root `Dockerfile`
- Set `DATABASE_URL`, `JWT_SECRET`, Squad keys, SMTP settings (see `.env.example`)
- Set `AI_SERVICE_URL` to the **public URL** of your AI Railway service

### AI service (separate)

- `railway.ai.json` + `ai-service/Dockerfile`
- Set `DATABASE_URL`, `JWT_SECRET`, `SECRET_KEY`, `ALLOWED_HOSTS=*`, `DEBUG=False`
- Optional: `OPENROUTER_API_KEY` for LLM whistleblower triage

### How many Railway services?

**Two, not seven.**

| Railway service | Dockerfile | Public URL purpose |
|---|---|---|
| **Backend (monolith)** | root `Dockerfile` | Frontend hits this — all APIs on one URL |
| **AI only** | `ai-service/Dockerfile` | Called by backend via `AI_SERVICE_URL` |

You do **not** deploy member/cooperative/contribution/etc. separately. The monolith starts them on ports `8001–8006` inside one container; only the gateway uses Railway's `PORT`.

### Connecting services

**Backend Railway variables** (dashboard → Variables):

| Variable | Value |
|---|---|
| `AI_SERVICE_URL` | `https://independent-optimism-production-7724.up.railway.app` (your AI URL, with `https://`) |
| `DATABASE_URL` | Your Neon URL |
| `JWT_SECRET` | Same on backend + AI |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASSWORD` | **Gmail App Password** (not your login password) |
| `EMAIL_FROM` | Same Gmail address |
| `DEFAULT_NOTIFICATION_EMAIL` | Where to send if member has no email |

Do **not** set `MEMBER_SERVICE_URL` to the public Railway URL on the backend service. The monolith uses internal `127.0.0.1` ports automatically.

**AI Railway variables:** `DATABASE_URL`, `JWT_SECRET`, `SECRET_KEY`, `ALLOWED_HOSTS=*`, `DEBUG=False`

Health check: `GET https://your-backend.up.railway.app/health/`

Local `.env` is for development only. **Never commit `.env`.**

Test deployed URLs:

```bash
set DEPLOYED_AI_URL=https://your-ai.up.railway.app
set DEPLOYED_BACKEND_URL=https://your-backend.up.railway.app
python scripts/test_deployed_services.py
```

## Frontend

The React app lives in `frontend/`. Point `VITE_API_URL` at your gateway URL (local or Railway).

## Webhooks

Configure Squad to call `POST /api/webhooks/squad/` on your public gateway URL.
