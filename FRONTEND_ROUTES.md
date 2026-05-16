# VeriFund API — Frontend Integration Guide

All frontend requests should use the **API gateway** base URL.

| Environment | Base URL |
|---|---|
| Local | `http://localhost:8000` |
| Production | `https://verifund-production-0ae5.up.railway.app` (or your current Railway URL) |

Set in the frontend: `VITE_API_URL=<base-url>`

## Conventions

- **Content-Type:** `application/json` on all POST/PATCH bodies
- **Auth:** Protected routes require `Authorization: Bearer <jwt>`
- **Errors:** Usually `{ "detail": "message" }` or field errors `{ "field": ["error"] }`
- **Money:** Amounts are in **kobo** (₦1 = 100 kobo) unless noted

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health/` | No | Liveness check |

**Response 200:**
```json
{ "status": "ok", "service": "api-gateway" }
```

---

## Auth & members

### Register

`POST /api/auth/register/` — **Public**

**Body:**
```json
{
  "bvn": "22819094586",
  "first_name": "Ada",
  "last_name": "Okafor",
  "phone_number": "08012345678",
  "email": "ada@example.com",
  "password": "Passw0rd!123"
}
```

**Response 201:**
```json
{
  "member": {
    "id": "uuid",
    "first_name": "Ada",
    "last_name": "Okafor",
    "phone_number": "08012345678",
    "email": "ada@example.com",
    "bvn_verified": false,
    "role": "MEMBER",
    "is_active": true,
    "created_at": "2026-05-16T..."
  },
  "token": "<jwt>"
}
```

### Login

`POST /api/auth/login/` — **Public**

**Body:**
```json
{
  "phone_number": "08012345678",
  "password": "Passw0rd!123"
}
```

**Response 200:** Same shape as register (`member` + `token`).

### Current member profile

`GET /api/members/me/` — **Bearer**

**Response 200:** Member object (same fields as above).

### Update profile

`PATCH /api/members/me/` — **Bearer**

**Body (all optional):**
```json
{
  "first_name": "Adaobi",
  "last_name": "Okafor",
  "phone_number": "08012345678",
  "email": "adaobi@example.com"
}
```

---

## Cooperatives

### Create cooperative

`POST /api/cooperatives/` — **Public** (no JWT required today)

**Body:**
```json
{
  "name": "Lagos Market Women Coop",
  "registration_number": "REG-12345",
  "state": "Lagos",
  "cooperative_type": "MULTIPURPOSE",
  "treasurer_bvn": "22819094586"
}
```

`cooperative_type`: `THRIFT` | `CREDIT` | `MULTIPURPOSE`

**Response 201:** Cooperative object including `id`, `squad_virtual_account_number`, `health_score`, etc.

### Cooperative detail

`GET /api/cooperatives/{cooperative_id}/` — **Public**

### Trust score

`GET /api/cooperatives/{cooperative_id}/trust-score/` — **Public**

**Response 200:** Trust breakdown and score used on dashboards.

### Regulator summary

`GET /api/cooperatives/{cooperative_id}/regulator-summary/` — **Public**

**Response 200:** Audit-oriented summary (contributions, withdrawals, flags).

---

## Contributions

### Create member virtual account

`POST /api/contributions/virtual-account/` — **Bearer**

Creates a Squad virtual account for this member + cooperative. BVN is validated in this flow.

**Body:**
```json
{
  "cooperative_id": "<uuid>",
  "bvn": "22819094586",
  "dob": "07/19/1990",
  "address": "22 Marina Road, Lagos",
  "gender": "1",
  "phone_number": "08012345678",
  "email": "ada@example.com"
}
```

**Response 201:** Virtual account details (`virtual_account_number`, `customer_identifier`, etc.).

### List virtual accounts

`GET /api/contributions/virtual-account/list/` — **Bearer**

### Simulate payment (sandbox)

`POST /api/contributions/virtual-account/simulate/` — **Bearer**

**Body:**
```json
{
  "cooperative_id": "<uuid>",
  "amount_kobo": 500000
}
```

### Contribution history

`GET /api/contributions/history/` — **Bearer**

### Cooperative audit

`GET /api/contributions/audit/{cooperative_id}/` — **Bearer**

### Webhook event log

`GET /api/contributions/webhooks/events/` — **Bearer**

### Squad webhook (server-to-server)

`POST /api/webhooks/squad/` — **Public** (Squad calls this; not for frontend)

Configure in Squad dashboard:
`https://<your-gateway>/api/webhooks/squad/`

---

## Withdrawals

### Lookup bank account

`POST /api/withdrawals/lookup/` — **Bearer**

**Body:**
```json
{
  "destination_bank_code": "000013",
  "destination_account": "0123456789"
}
```

### Request withdrawal

`POST /api/withdrawals/request/` — **Bearer**

**Body:**
```json
{
  "cooperative_id": "<uuid>",
  "amount_kobo": 100000,
  "destination_account": "0123456789",
  "destination_bank_code": "000013",
  "purpose": "Emergency member support"
}
```

**Response 201:** Withdrawal object with `id`, `status`, `ai_risk_score`, `signatures`, etc.

### Withdrawal detail

`GET /api/withdrawals/{withdrawal_id}/` — **Bearer**

### Pending withdrawals

`GET /api/withdrawals/pending/?cooperative_id={cooperative_id}` — **Bearer**

### Sign withdrawal

`POST /api/withdrawals/{withdrawal_id}/sign/` — **Bearer**

**Body:**
```json
{ "role": "EXECUTIVE1" }
```

Roles: `TREASURER` | `EXECUTIVE1` | `EXECUTIVE2`

### Requery transfer status

`POST /api/withdrawals/{withdrawal_id}/requery/` — **Bearer**

---

## AI (proxied to AI service)

All paths work on the **gateway** base URL.

### Score transaction

`POST /api/ai/score-transaction/` — **Public**

**Body:**
```json
{
  "amount_kobo": 500000,
  "rolling_90d_mean": 300000,
  "days_since_last_contribution": 12,
  "member_transaction_count": 7,
  "cooperative_flagged_rate": 0.05
}
```

**Response 200:**
```json
{
  "anomaly_score": 0.388,
  "flagged": false,
  "reason": "...",
  "model": "verifund_anomaly_v2"
}
```

### Score cooperative

`POST /api/ai/score-cooperative/` — **Public**

**Body:** `{ "cooperative_id": "<uuid>", "breakdown": { ... } }` (breakdown optional; DB features used if omitted)

`GET /api/ai/score-cooperative/{cooperative_id}/` — **Public**

### Triage whistleblower report

`POST /api/ai/triage-report/` — **Public**

**Body:**
```json
{
  "report_text": "Suspicious withdrawal missing 50000",
  "reporter_cooperative_id": "<uuid>"
}
```

### Graph analysis

`POST /api/ai/analyze-graph/` — **Public** — body: `{ "cooperative_id": "<uuid>" }`

`GET /api/ai/analyze-graph/{cooperative_id}/` — **Public**

### Health scores (all cooperatives)

`GET /api/ai/health-scores/` — **Public**

`GET /api/ai/health-scores/all/` — **Public** (alias)

---

## Notifications (email)

Email is sent via Python SMTP (Gmail App Password on the server). The gateway proxies these routes.

### Send email

`POST /api/notify/email/` — **Public**

**Body:**
```json
{
  "email": "member@example.com",
  "subject": "VeriFund notification",
  "message": "Your contribution was confirmed."
}
```

**Response 200:**
```json
{
  "status": "sent",
  "recipient": "member@example.com",
  "channel": "email",
  "provider_response": { "subject": "...", "smtp_host": "smtp.gmail.com" }
}
```

`status` may be `sent`, `queued_local` (SMTP not configured), or `failed`.

Legacy alias: `POST /api/notify/sms/` — same handler; pass `email` instead of `phone_number`.

### Notification history

`GET /api/notify/history/?recipient=email@example.com&status=sent&limit=20` — **Public**

---

## Typical frontend flows

### Member onboarding
1. `POST /api/auth/register/` → store `token`
2. `PATCH /api/members/me/` if needed

### Cooperative admin
1. `POST /api/cooperatives/`
2. Share `cooperative_id` with members

### Member contributes
1. `POST /api/contributions/virtual-account/`
2. Member transfers to returned VA number
3. Squad webhook → `POST /api/webhooks/squad/` (automatic)
4. `GET /api/contributions/history/`

### Executive withdrawal approval
1. `POST /api/withdrawals/request/`
2. `GET /api/withdrawals/pending/?cooperative_id=...`
3. `POST /api/withdrawals/{id}/sign/` (multiple executives)
4. `POST /api/withdrawals/{id}/requery/` when needed

### Regulator / trust dashboard
1. `GET /api/cooperatives/{id}/trust-score/`
2. `GET /api/cooperatives/{id}/regulator-summary/`
3. `GET /api/ai/health-scores/`

---

## Notes for frontend devs

- **Do not** call ports `8001–8006` from the browser in production; always use the gateway.
- Store JWT in `localStorage` (see `frontend/src/services/api.ts`).
- Direct debit **mandate** routes exist in backend code but are **not** exposed on the gateway in this release; use virtual-account flow only.
- For local testing, see `tests/verifund-endpoints.http` and `scripts/test_email.ps1`.
