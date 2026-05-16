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

### Connecting services

| Variable | Where to set | Value |
|---|---|---|
| `AI_SERVICE_URL` | **Backend** Railway service | `https://<your-ai-service>.up.railway.app` |
| `OPENROUTER_API_KEY` | **AI** Railway service | Your OpenRouter key (optional) |
| `SMTP_*` | **Backend** (notification runs in monolith) | Gmail or other SMTP credentials |

Local `.env` is for development only. **Do not commit `.env`.** Set the same variables in the Railway dashboard for each service.

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
