# VeriFund Backend

Squad Hackathon backend for cooperative transparency, contribution collection, and controlled withdrawals.

## What changed for the hackathon pass

- BVN verification stays at member registration.
- Cooperative creation still provisions a Squad virtual account.
- Contribution collection now supports a stronger default flow: each member can create a dedicated Squad virtual account per cooperative, then incoming transfer webhooks are matched back to that member automatically.
- Direct debit remains available, but it is no longer the primary demo path.
- Regulator and audit endpoints now expose trust, contribution, and withdrawal evidence in one place.

## Services

| Service | Port | Role |
|---|---|---|
| `api-gateway` | `8000` | Frontend entry point |
| `member-service` | `8001` | Auth, registration, BVN gate |
| `cooperative-service` | `8002` | Cooperative records, trust score, regulator summary |
| `contribution-service` | `8003` | Member contribution VAs, mandates, Squad webhook ingestion |
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

1. Register member with BVN.
2. Create cooperative.
3. Member creates dedicated contribution virtual account for that cooperative.
4. Member pays by transfer into that VA.
5. Squad webhook records contribution and anomaly-scores it.
6. Trust/regulator screens reflect the new evidence.

See `FRONTEND_ROUTES.md` for the short frontend handoff.
