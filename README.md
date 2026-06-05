# VeriFund

VeriFund is a cooperative finance platform for member onboarding, cooperative registration, contribution tracking, multi-signature withdrawals, AI risk scoring, and notifications.

If you need the one-line version: it helps cooperatives collect money, verify members, monitor trust/risk, and control withdrawals safely.

## What The Project Does

- Lets members register and log in with JWT auth.
- Lets admins create cooperatives and view trust/regulator summaries.
- Creates Squad virtual accounts for contributions and records webhook events.
- Supports withdrawal requests with signer approval and requery flows.
- Runs AI scoring for transactions, cooperatives, graph analysis, and whistleblower triage.
- Sends email notifications and stores notification history.
- Persists endpoint test runs in quick.db so you can show progress, coverage, and regressions in a demo-friendly way.

## Architecture

| Service | Port | Role |
|---|---|---|
| `api-gateway` | `8000` | Public API surface for the frontend |
| `member-service` | `8001` | Auth and member profiles |
| `cooperative-service` | `8002` | Cooperatives, trust scores, regulator views |
| `contribution-service` | `8003` | Virtual accounts, contributions, webhook intake |
| `withdrawal-service` | `8004` | Multi-signature withdrawals |
| `ai-service` | `8005` | Anomaly scoring, cooperative risk, triage |
| `notification-service` | `8006` | Email notifications and notification history |

The browser should only talk to the gateway on port `8000`. The gateway forwards requests to the internal services.

## VeriFund Workflow

This is the mental model for how the endpoints work together:

1. A user joins the platform with `POST /api/auth/register/` or comes back with `POST /api/auth/login/`.
2. The frontend stores the JWT and uses it for every member, cooperative, contribution, withdrawal, AI, and notification request.
3. The user creates or joins a cooperative with `POST /api/cooperatives/`.
4. The cooperative can then receive and track money through `POST /api/contributions/virtual-account/`, which creates a Squad virtual account for the member.
5. When Squad sends payment events, `POST /api/webhooks/squad/` records the webhook and updates contribution history.
6. Members and admins can review what happened with `GET /api/contributions/history/`, `GET /api/contributions/audit/{cooperative_id}/`, and the webhook/event listing endpoints.
7. When funds need to leave the cooperative, a user creates a withdrawal with `POST /api/withdrawals/request/`.
8. Authorized signers approve the withdrawal with `POST /api/withdrawals/{withdrawal_id}/sign/`, and the transfer status is checked again with `POST /api/withdrawals/{withdrawal_id}/requery/`.
9. AI endpoints score risky activity, cooperative health, graph structure, and whistleblower reports so the system can surface trust and fraud signals before money moves.
10. Notifications send the human follow-up by email or history lookup after important events such as registration, contribution settlement, or withdrawal updates.
11. The quick.db-backed QA scoreboard records end-to-end test runs so you can prove coverage, spot regressions, and show judges that the platform is actively validated.

Put simply: auth creates the identity, cooperatives create the trust boundary, contributions bring money in, webhooks confirm settlement, withdrawals move money out safely, AI watches for risk, and notifications keep everyone informed.

## Railway Deployment

Use two Railway services from this repo:

1. Backend monolith: root `Dockerfile` with `railway.json`
2. Optional separate AI service: `ai-service/Dockerfile` with `railway.ai.json`

Recommended backend variables:

- `DATABASE_URL` = Neon pooler URL
- `DATABASE_SSLMODE` = `require`
- `JWT_SECRET` = shared auth secret
- `DEBUG` = `False`
- `AI_SERVICE_URL` = either `http://127.0.0.1:8005` for built-in AI, or your separate live AI URL
- SMTP settings if you want email delivery

If you do not set `AI_SERVICE_URL` in the backend service, the backend now falls back to the built-in AI container.

## Local Development

1. Copy `.env.example` to `.env` and fill in secrets.
2. Start the stack:

```bash
docker compose up --build -d
```

3. Bootstrap the database:

```bash
docker compose exec contribution-service python /app/scripts/bootstrap_db.py
```

4. Open the API at `http://localhost:8000`

Manual endpoint examples are in `tests/verifund-endpoints.http`.

## What quick.db Does

quick.db is a small local key-value database backed by SQLite. In this project it stores:

- the result of each full endpoint run,
- a history of recent runs,
- the latest run summary,
- a compact scoreboard for demo/reporting purposes.

It is written by the test runner under `tests/quickdb-runner/` and read back by the gateway ops endpoint. It does not power member, contribution, or withdrawal traffic.

Optional env vars:

- `DATABASE_URL` on the test runner only, to seed withdrawal signers for the full multi-sign flow.
- `VERIFUND_QADB_PATH` on the gateway only, if you want to point the scoreboard reader at a different SQLite file.

The production gateway exposes a read-only ops view at `GET /api/ops/qa-scoreboard/` that reads the same quick.db SQLite file if it is present in the container. If the file is missing, the endpoint returns an empty status instead of failing the app.

The frontend also has a small public ops page at `/ops/qa-scoreboard` that renders the same data for demos and judging.

The stored file is:

`tests/quickdb-runner/data/verifund-endpoint-runs.sqlite`

## Endpoint Reference

All frontend requests should use the gateway base URL.

### Health

- `GET /health/` - liveness check for the gateway.
- `GET /api/health/` - same health check under the API namespace.

### Auth And Members

- `POST /api/auth/register/` - create a member account and return a JWT.
- `POST /api/auth/login/` - log a member in and return a JWT.
- `GET /api/members/me/` - fetch the authenticated member profile.
- `PATCH /api/members/me/` - update the authenticated member profile.

### Cooperatives

- `POST /api/cooperatives/` - create a cooperative record.
- `GET /api/cooperatives/{cooperative_id}/` - fetch one cooperative.
- `GET /api/cooperatives/{cooperative_id}/trust-score/` - get the trust score breakdown.
- `GET /api/cooperatives/{cooperative_id}/regulator-summary/` - get an audit-oriented regulator summary.

### Contributions

- `POST /api/contributions/virtual-account/` - create a Squad virtual account for a member.
- `GET /api/contributions/virtual-account/list/` - list the member's virtual accounts.
- `POST /api/contributions/virtual-account/simulate/` - simulate a contribution payment in sandbox/local testing.
- `GET /api/contributions/history/` - list contribution history for the authenticated member.
- `GET /api/contributions/audit/{cooperative_id}/` - view contribution audit data for a cooperative.
- `GET /api/contributions/webhooks/events/` - list recorded webhook events.
- `POST /api/webhooks/squad/` - Squad webhook intake for contribution settlement events.

### Withdrawals

- `POST /api/withdrawals/lookup/` - look up destination bank/account details.
- `POST /api/withdrawals/request/` - create a withdrawal request.
- `GET /api/withdrawals/{withdrawal_id}/` - fetch withdrawal details.
- `GET /api/withdrawals/pending/?cooperative_id={cooperative_id}` - list pending withdrawals for a cooperative.
- `POST /api/withdrawals/{withdrawal_id}/sign/` - add a withdrawal signature from an authorized role.
- `POST /api/withdrawals/{withdrawal_id}/requery/` - requery transfer status after processing.

### AI

- `POST /api/ai/score-transaction/` - score a transaction for anomaly/risk.
- `POST /api/ai/score-cooperative/` - score a cooperative from supplied breakdown or stored features.
- `GET /api/ai/score-cooperative/{cooperative_id}/` - fetch a stored cooperative score.
- `POST /api/ai/triage-report/` - triage a whistleblower report.
- `POST /api/ai/analyze-graph/` - analyze a cooperative graph for suspicious structure.
- `GET /api/ai/analyze-graph/{cooperative_id}/` - fetch a saved graph analysis.
- `GET /api/ai/health-scores/` - list cooperative health scores.
- `GET /api/ai/health-scores/all/` - alias for the health score list.

### Notifications

- `POST /api/notify/email/` - send an email notification.
- `POST /api/notify/sms/` - legacy alias that uses the same notification handler.
- `GET /api/notify/history/?recipient=email@example.com&status=sent&limit=20` - list notification history.

### Ops

- `GET /api/ops/qa-scoreboard/` - read-only QA scoreboard backed by quick.db; shows the latest run, recent runs, and summary metadata if the SQLite file exists.

### Client-Only Methods

These methods exist in the frontend API client, but the gateway does not expose them in this release:

- `POST /api/contributions/mandate/` - create a direct-debit mandate.
- `GET /api/contributions/mandate/{merchant_reference}/` - fetch a direct-debit mandate.
- `POST /api/contributions/mandate/debit/` - debit a direct-debit mandate.

## Quick Test Runner

The full endpoint suite stores results in quick.db and produces a scoreboard.

```bash
cd tests/quickdb-runner
npm install
npm run test:production
npm run test:local
npm run summarize
```

Use an 11-digit test BVN (`SQUAD_TEST_BVN`, default `22222222222`). Set `DATABASE_URL` only when you want the runner to seed extra withdrawal signers locally.

## Frontend

The React app lives in `frontend/`. Point `VITE_API_URL` at your gateway URL, local or Railway.

## Webhooks

Configure Squad to call `POST /api/webhooks/squad/` on your public gateway URL.
