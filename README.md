# VeriFund Backend

Squad Hackathon backend for cooperative transparency, contribution collection, and controlled withdrawals.

## What changed for the hackathon pass

- Member registration no longer depends on a standalone BVN verification endpoint.
- Cooperative creation still provisions a Squad virtual account.
- Contribution collection now supports a stronger default flow: each member can create a dedicated Squad virtual account per cooperative, then incoming transfer webhooks are matched back to that member automatically.
- Direct debit mandate routes are disabled from the public API surface for this deploy path.
- Regulator and audit endpoints now expose trust, contribution, and withdrawal evidence in one place.

## Services

| Service | Port | Role |
|---|---|---|
| `api-gateway` | `8000` | Frontend entry point |
| `member-service` | `8001` | Auth and registration |
| `cooperative-service` | `8002` | Cooperative records, trust score, regulator summary |
| `contribution-service` | `8003` | Member contribution VAs and Squad webhook ingestion |
| `withdrawal-service` | `8004` | Multi-signature withdrawals, Squad payouts |
| `ai-service` | `8005` | Risk and anomaly scoring |
| `notification-service` | `8006` | SMS notifications |

## Install and run

1. Copy `.env.example` to `.env`.
2. Fill in your Squad and Africa's Talking credentials where available.
3. Start the stack:

```bash
docker compose up --build -d
```

4. Bootstrap the shared Postgres tables:

```bash
docker compose exec contribution-service python /app/scripts/bootstrap_db.py
```

5. Smoke-check the services:

```bash
docker compose ps
```

## Deploy on Railway

This repo now includes a root `Dockerfile`, root `requirements.txt`, root `start.sh`, and `railway.json`.

That gives Railway a clear build and start contract from the repo root.

1. Push this repo to GitHub.
2. In Railway, create a new project from the repo.
3. Railway should detect the root `Dockerfile`.
4. Set these env vars:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SQUAD_SECRET_KEY`
   - `SQUAD_PUBLIC_KEY`
   - `SQUAD_WEBHOOK_SECRET`
   - `SQUAD_SETTLEMENT_ACCOUNT`
   - `SQUAD_SETTLEMENT_MOBILE`
   - `SQUAD_SETTLEMENT_EMAIL`
   - `SQUAD_SETTLEMENT_ADDRESS`
   - `SQUAD_SETTLEMENT_DOB`
   - `SQUAD_SETTLEMENT_GENDER`
   - `AT_USERNAME`
   - `AT_API_KEY`
5. Use the Railway public URL as your backend base URL.

Railway supports Python. The earlier failure came from missing root-level build/start metadata, not from Python support.

## Deploy on Render

This repo now includes `render.yaml` so you can deploy the full stack as a Render Blueprint.

1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select the repo and import `render.yaml`.
4. Set the secret env vars Render cannot auto-fill:
   - `JWT_SECRET`
   - `SQUAD_SECRET_KEY`
   - `SQUAD_PUBLIC_KEY`
   - `SQUAD_WEBHOOK_SECRET`
   - `SQUAD_SETTLEMENT_ACCOUNT`
   - `SQUAD_SETTLEMENT_MOBILE`
   - `SQUAD_SETTLEMENT_EMAIL`
   - `SQUAD_SETTLEMENT_ADDRESS`
   - `SQUAD_SETTLEMENT_DOB`
   - `SQUAD_SETTLEMENT_GENDER`
   - `AT_USERNAME`
   - `AT_API_KEY`
5. Deploy the blueprint, then use the public `verifund-api-gateway` URL as your frontend/backend base URL.

The Dockerfiles now respect Render's dynamic `PORT` env var, so the same images still work locally and on Render.

## Squad env you still need

You asked where to get the Squad settlement env values. Use the Squad dashboard plus your technical account manager:

- `SQUAD_SECRET_KEY`: Squad sandbox or live secret key from your dashboard.
- `SQUAD_PUBLIC_KEY`: Squad public key from your dashboard.
- `SQUAD_WEBHOOK_SECRET`: usually the same secret key unless Squad gave you a different webhook secret.
- `SQUAD_SETTLEMENT_ACCOUNT`: your profiled GTBank settlement/beneficiary account number. Squad virtual accounts require this.
- `SQUAD_SETTLEMENT_MOBILE`, `SQUAD_SETTLEMENT_EMAIL`, `SQUAD_SETTLEMENT_ADDRESS`, `SQUAD_SETTLEMENT_DOB`, `SQUAD_SETTLEMENT_GENDER`: fallback KYC fields used when a specific request does not supply them.
- `SQUAD_WEBHOOK_URL`: the public callback URL you paste into Squad Dashboard > Profile > API & Webhook.
- `SQUAD_REDIRECT_URL`: optional frontend redirect after payment flows.

For live virtual accounts, Squad’s docs indicate your settlement account must be a GTBank account and the merchant/profile must be configured by Squad before go-live.

## Webhook notes

- Configure Squad to call `POST /api/webhooks/squad/` through the gateway.
- The backend now accepts `x-squad-signature` and also tolerates the legacy encrypted-body header.
- Virtual-account transfer webhooks are mapped through the dedicated member contribution VA `customer_identifier`.

## Primary demo route flow

1. Register member.
2. Create cooperative.
3. Member creates dedicated contribution virtual account for that cooperative. Squad validates the BVN in that flow.
4. Member pays by transfer into that VA.
5. Squad webhook records contribution and anomaly-scores it.
6. Trust/regulator screens reflect the new evidence.

## Team handoff docs

- `FRONTEND_ROUTES.md`: full frontend route map, request bodies, and response shapes.
- `AI_INTEGRATION_AND_HOSTING.md`: how to test AI endpoints, how the AI/ML dev should plug in models, and how to host the backend.
- `AI_ML_REPLACEMENT_GUIDE.md`: exact file-by-file AI/ML replacement handoff.

## Route coverage status

The current backend already has working endpoints for:

- auth and member profile
- cooperative creation, trust score, and regulator summary
- contribution virtual accounts, contribution history, webhook ingestion, and audit view
- withdrawal request, co-sign, and pending list
- SMS notifications
- AI scoring and triage routes

What is not built out yet is mostly breadth, not core flow:

- no advanced admin CRUD screens yet
- no pagination/filter params on most list endpoints yet
- no email/push notification service yet
- AI endpoints are production-shaped but still use heuristic fallback logic by default

See `FRONTEND_ROUTES.md` for the exact contract the frontend should integrate against.
