# AI Integration and Hosting Guide

This is the practical handoff for the AI/ML dev and whoever will deploy the backend.

## How to test the AI endpoints

If the full stack is running locally:

```bash
curl -X POST http://127.0.0.1:8005/api/ai/score-transaction/ ^
  -H "Content-Type: application/json" ^
  -d "{\"amount_kobo\":500000,\"rolling_90d_mean\":300000,\"days_since_last_contribution\":12,\"member_transaction_count\":7,\"cooperative_flagged_rate\":0.05}"
```

Expected response:

```json
{
  "anomaly_score": 0.321,
  "flagged": false,
  "reason": "Transaction fits the recent contribution pattern.",
  "model": "heuristic_isolation_forest_fallback"
}
```

Test cooperative scoring with manual features:

```bash
curl -X POST http://127.0.0.1:8005/api/ai/score-cooperative/ ^
  -H "Content-Type: application/json" ^
  -d "{\"cooperative_id\":\"demo-coop\",\"breakdown\":{\"contribution_regularity_score\":82,\"withdrawal_frequency\":2,\"member_churn_rate\":0.08,\"avg_transaction_size\":250000,\"num_large_withdrawals_30d\":0,\"bvn_verification_rate\":1.0,\"avg_withdrawal_risk\":0.12,\"flagged_ratio\":0.03,\"net_asset_trend_90d\":1200000}}"
```

Test whistleblower triage:

```bash
curl -X POST http://127.0.0.1:8005/api/ai/triage-report/ ^
  -H "Content-Type: application/json" ^
  -d "{\"report_text\":\"Suspicious withdrawal missing 50000 from the cooperative wallet\",\"reporter_cooperative_id\":\"demo-coop\"}"
```

Test DB-driven health scores:

```bash
curl http://127.0.0.1:8005/api/ai/health-scores/
```

Full-route smoke test already included:

```bash
python tests/live_route_smoke.py
```

That smoke script hits:

- Auth register/login
- Member profile
- Cooperative create/detail/trust/regulator
- Contribution VA create/list/simulate/history/audit
- Squad webhook ingestion
- Withdrawal request/sign/list
- AI score endpoints
- Notification SMS

## How the AI/ML dev should plug in their code

The current AI service already exposes stable HTTP contracts. That means the AI/ML dev should swap internals, not change endpoint shapes unless the whole team agrees.

### Current files to own

- `ai-service/ai_service/services/anomaly_service.py`
- `ai-service/ai_service/services/risk_service.py`
- `ai-service/ai_service/services/whistleblower_service.py`
- Optional training scripts/data:
  - `ai-service/data/`
  - `ai-service/trained_models/`
  - `ai-service/data/generate_synthetic.py`

### Recommended structure

Keep this layering:

1. `views/ai_views.py`
   Keep this thin. It should only parse input and return JSON.
2. `services/*.py`
   Put feature engineering, model loading, inference, confidence thresholds, and fallback logic here.
3. `trained_models/`
   Store serialized model artifacts here if the team is bundling models in the repo or image.
4. `data/`
   Keep synthetic datasets, benchmark datasets, and notebooks/scripts here.

### Safe upgrade path

#### Transaction anomaly model

Replace `score_transaction()` in `anomaly_service.py` with:

- input normalization
- feature vector build
- model inference
- fallback to the current heuristic if model file is missing or invalid

Do not remove these response keys:

- `anomaly_score`
- `flagged`
- `reason`
- `model`

#### Cooperative health/risk model

Replace the inside of `score_cooperative()` in `risk_service.py`.

Keep these response keys:

- `cooperative_id`
- `risk_score`
- `health_score`
- `top_features`
- `feature_snapshot`
- `model`

Very important: `withdrawal-service` already calls this endpoint and expects `risk_score`. `cooperative-service` also calls it and expects `health_score` and `top_features`.

#### Whistleblower triage

Upgrade `triage_report()` in `whistleblower_service.py` with:

- text preprocessing
- keyword or embedding features
- fraud classification
- escalation recommendation

Keep these response keys:

- `intent`
- `corroboration_score`
- `evidence_summary`
- `escalate`
- `model`

## How the whole system currently uses AI

### Contribution flow

1. User pays into dedicated virtual account.
2. Squad webhook lands in contribution service.
3. `contribution_service.record_contribution()` calls `POST /api/ai/score-transaction/`.
4. Response decides whether the contribution becomes `CONFIRMED` or `FLAGGED`.

### Withdrawal flow

1. Treasurer/admin requests withdrawal.
2. `withdrawal_service.request_withdrawal()` calls `POST /api/ai/score-cooperative/`.
3. Returned `risk_score` is stored as `ai_risk_score`.
4. If the score is above the block threshold, final release is blocked.

### Trust and regulator flow

1. Frontend requests cooperative trust score or regulator summary.
2. `cooperative_service.get_trust_score()` calls `POST /api/ai/score-cooperative/`.
3. Response feeds the badge, health score, and top feature explanations.

## Recommended AI/ML dev checklist

1. Keep endpoint contracts backward compatible.
2. Add model version names to the `model` field.
3. Add robust fallback when the model file is unavailable.
4. Keep inference under a few hundred milliseconds if possible.
5. Log bad payloads and model-loading failures clearly.
6. Add unit tests around feature engineering and response shapes.

## How to host the backend

For the hackathon, the cleanest path is Docker-based hosting with one managed Postgres database.

## Recommended deployment shape

### Option A: One VM with Docker Compose

Fastest for a hackathon demo.

Deploy:

- `api-gateway`
- `member-service`
- `cooperative-service`
- `contribution-service`
- `withdrawal-service`
- `ai-service`
- `notification-service`
- Postgres

Recommended stack:

- Ubuntu VM on Hetzner, AWS EC2, DigitalOcean, or similar
- Docker and Docker Compose
- Nginx or Caddy in front of port `8000`
- Domain mapped to the gateway
- HTTPS via Let's Encrypt

### Option B: Split services on Railway/Render/Fly.io

Cleaner managed experience, but slightly more setup.

Minimum requirement:

- Each Django service deployed as a web service
- Shared Postgres
- Public gateway URL
- Public webhook URL for Squad

## Production env checklist

Set these at minimum:

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
- `SQUAD_WEBHOOK_URL`
- `AT_USERNAME`
- `AT_API_KEY`

Also set service discovery URLs correctly if services are not on Docker internal DNS:

- `AI_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- any other inter-service base URLs used by the gateway

## Deployment steps

1. Push the repo.
2. Provision Postgres.
3. Set all env vars.
4. Build and start containers.
5. Run bootstrap:

```bash
python scripts/bootstrap_db.py
```

6. Run smoke test:

```bash
python tests/live_route_smoke.py
```

7. Configure Squad webhook to:

```text
https://your-domain.com/api/webhooks/squad/
```

8. Confirm SMS provider credentials if live notifications are required.

## Hosting notes per service

### API gateway

- This is the only base URL the frontend should target.
- Put HTTPS and rate limiting here.

### AI service

- Keep enough memory for model loading if you add real model artifacts.
- If models are large, mount them as build artifacts or download them at boot.

### Contribution service

- Must be publicly reachable through the gateway for Squad webhook delivery.

### Notification service

- Can run without live SMS credentials for demo mode.
- Without Africa's Talking keys, it falls back to local queued logging behavior.

## Demo-safe recommendation

For the hackathon, deploy with:

- real Postgres
- real gateway URL
- real Squad sandbox creds
- real webhook URL
- optional SMS sandbox mode
- current heuristic AI fallback still enabled

That gives you a reliable end-to-end story even if the ML team is still tuning models.
