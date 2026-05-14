# Frontend Route Guide

Base gateway URL:

- Local Docker: `http://localhost:8000`
- Direct cloud/API gateway deployment: `https://your-domain.com`

Auth rules:

- Public endpoints do not need a token.
- Protected endpoints need `Authorization: Bearer <jwt>`.
- All payloads are JSON.

## Response envelope pattern

Most endpoints return raw JSON objects instead of wrapping everything in `{ "data": ... }`.

Common error shape:

```json
{
  "detail": "Human readable error message"
}
```

Serializer validation errors can also come back field-by-field:

```json
{
  "phone_number": ["This field is required."],
  "password": ["This field may not be blank."]
}
```

## Auth and Member Service

### `POST /api/auth/register/`

Use for onboarding. This is where BVN verification is enforced.

Request:

```json
{
  "bvn": "12345678901",
  "first_name": "Ada",
  "last_name": "Okafor",
  "phone_number": "08012345678",
  "email": "ada@example.com",
  "password": "Passw0rd!123"
}
```

Success `201`:

```json
{
  "member": {
    "id": "105a9639-4998-46bf-a510-a678b7016a45",
    "first_name": "Ada",
    "last_name": "Okafor",
    "phone_number": "08012345678",
    "email": "ada@example.com",
    "bvn_verified": true,
    "bvn_verified_at": "2026-05-14T12:31:22.000Z",
    "role": "MEMBER",
    "is_active": true,
    "created_at": "2026-05-14T12:31:22.000Z"
  },
  "token": "eyJhbGciOi..."
}
```

Typical errors:

- `400` if BVN verification fails
- `400` if phone/email/BVN already exists
- `400` if required fields are missing

### `POST /api/auth/login/`

Request:

```json
{
  "phone_number": "08012345678",
  "password": "Passw0rd!123"
}
```

Success `200`:

```json
{
  "token": "eyJhbGciOi...",
  "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
  "role": "MEMBER"
}
```

Typical errors:

- `401` invalid phone/password
- `400` serializer validation failure

### `GET /api/members/me/`

Protected. Use this right after login to hydrate the app shell.

Success `200`:

```json
{
  "id": "105a9639-4998-46bf-a510-a678b7016a45",
  "first_name": "Ada",
  "last_name": "Okafor",
  "phone_number": "08012345678",
  "email": "ada@example.com",
  "bvn_verified": true,
  "bvn_verified_at": "2026-05-14T12:31:22.000Z",
  "role": "ADMIN",
  "is_active": true,
  "created_at": "2026-05-14T12:31:22.000Z"
}
```

Typical errors:

- `401` missing or bad JWT
- `404` member missing

## Cooperative Service

### `POST /api/cooperatives/`

Creates the cooperative and provisions the cooperative-level Squad virtual account.

Request:

```json
{
  "name": "Lagos Market Women Coop",
  "registration_number": "REG-12345",
  "state": "Lagos",
  "cooperative_type": "MULTIPURPOSE",
  "treasurer_bvn": "12345678901"
}
```

Success `201`:

```json
{
  "id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "name": "Lagos Market Women Coop",
  "registration_number": "REG-12345",
  "state": "Lagos",
  "cooperative_type": "MULTIPURPOSE",
  "squad_virtual_account_number": "9013151600",
  "squad_customer_id": "COOP-LAG-REG12345",
  "health_score": 50,
  "health_score_updated_at": "2026-05-14T12:35:10.000Z",
  "is_active": true,
  "created_at": "2026-05-14T12:35:10.000Z"
}
```

Typical errors:

- `400` registration number already exists
- `400` Squad VA creation failed
- `400` invalid `cooperative_type`

### `GET /api/cooperatives/{cooperative_id}/`

Success `200`:

```json
{
  "id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "name": "Lagos Market Women Coop",
  "registration_number": "REG-12345",
  "state": "Lagos",
  "cooperative_type": "MULTIPURPOSE",
  "squad_virtual_account_number": "9013151600",
  "squad_customer_id": "COOP-LAG-REG12345",
  "health_score": 78,
  "health_score_updated_at": "2026-05-14T12:40:10.000Z",
  "is_active": true,
  "created_at": "2026-05-14T12:35:10.000Z"
}
```

### `GET /api/cooperatives/{cooperative_id}/trust-score/`

Use for public badges, dashboards, and the cooperative profile page.

Success `200`:

```json
{
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "cooperative_name": "Lagos Market Women Coop",
  "health_score": 78,
  "breakdown": {
    "member_verification_rate": 100,
    "contribution_regularity": 92,
    "withdrawal_pattern": 85,
    "transparency_index": 71,
    "ai_risk_signal": 22
  },
  "badge": "UNDER_REVIEW",
  "top_features": [
    {
      "feature": "withdrawal_frequency",
      "impact": 0.21,
      "direction": "increases_risk"
    }
  ]
}
```

### `GET /api/cooperatives/{cooperative_id}/regulator-summary/`

Use for audit/regulator screens.

Success `200`:

```json
{
  "cooperative": {
    "id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
    "name": "Lagos Market Women Coop",
    "registration_number": "REG-12345",
    "state": "Lagos",
    "cooperative_type": "MULTIPURPOSE",
    "squad_virtual_account_number": "9013151600",
    "squad_customer_id": "COOP-LAG-REG12345",
    "health_score": 78,
    "health_score_updated_at": "2026-05-14T12:40:10.000Z",
    "is_active": true,
    "created_at": "2026-05-14T12:35:10.000Z"
  },
  "trust": {
    "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
    "cooperative_name": "Lagos Market Women Coop",
    "health_score": 78,
    "breakdown": {
      "member_verification_rate": 100,
      "contribution_regularity": 92,
      "withdrawal_pattern": 85,
      "transparency_index": 71,
      "ai_risk_signal": 22
    },
    "badge": "UNDER_REVIEW",
    "top_features": []
  },
  "controls": {
    "member_bvn_gate": true,
    "contribution_collection": "dedicated_virtual_accounts_plus_signed_webhooks",
    "withdrawal_control": "multi_signature_plus_ai_risk_screening"
  },
  "totals": {
    "total_contributions": 18,
    "contribution_volume_kobo": 4500000,
    "flagged_contributions": 1,
    "total_withdrawals": 2,
    "withdrawal_volume_kobo": 200000,
    "released_withdrawals": 1,
    "high_risk_withdrawals": 0,
    "total_signatures": 4
  }
}
```

## Contribution Service

Preferred hackathon path:

1. User signs up and logs in.
2. Frontend creates or fetches the member’s dedicated contribution VA.
3. Frontend shows that bank account number and transfer instructions.
4. Squad webhook confirms the payment.
5. Frontend reloads contribution history and cooperative trust score.

### `POST /api/contributions/virtual-account/`

Protected.

Request:

```json
{
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "bvn": "12345678901",
  "dob": "07/19/1990",
  "address": "22 Marina Road, Lagos",
  "gender": "1",
  "phone_number": "08012345678",
  "email": "ada@example.com"
}
```

Success `201`:

```json
{
  "virtual_account": {
    "id": "3349715f-4ed7-4d1a-81b7-2fcfe3b9473d",
    "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
    "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
    "customer_identifier": "VF-F15BD461-105A9639",
    "virtual_account_number": "9013151601",
    "account_name": "Ada Okafor",
    "bank_name": "GTBank",
    "status": "active",
    "created_at": "2026-05-14T12:42:01.000Z",
    "updated_at": "2026-05-14T12:42:01.000Z"
  },
  "cooperative": {
    "id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
    "name": "Lagos Market Women Coop",
    "squad_virtual_account_number": "9013151600",
    "squad_customer_id": "COOP-LAG-REG12345"
  },
  "instructions": {
    "payment_channel": "bank-transfer",
    "message": "Transfer contributions into this dedicated Squad virtual account.",
    "webhook_expected": true
  }
}
```

Notes:

- If an account already exists for this member/cooperative pair, the backend returns the existing one.
- `gender` is `"1"` for male and `"2"` for female in the current Squad payload contract.

### `GET /api/contributions/virtual-account/list/`

Protected.

Success `200`:

```json
{
  "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
  "virtual_accounts": [
    {
      "id": "3349715f-4ed7-4d1a-81b7-2fcfe3b9473d",
      "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
      "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
      "customer_identifier": "VF-F15BD461-105A9639",
      "virtual_account_number": "9013151601",
      "account_name": "Ada Okafor",
      "bank_name": "GTBank",
      "status": "active",
      "created_at": "2026-05-14T12:42:01.000Z",
      "updated_at": "2026-05-14T12:42:01.000Z"
    }
  ]
}
```

### `POST /api/contributions/virtual-account/simulate/`

Protected. Sandbox/demo helper only.

Request:

```json
{
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "amount_kobo": 500000
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Simulation accepted",
  "data": {
    "transaction_reference": "SIM-001"
  },
  "recorded_contribution": {
    "id": "9ddf3dd1-0cb9-4bcb-9f38-24a1b2f7b380",
    "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
    "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
    "amount_kobo": 500000,
    "squad_transaction_ref": "SIM-001",
    "mandate_id": null,
    "contribution_virtual_account_id": "3349715f-4ed7-4d1a-81b7-2fcfe3b9473d",
    "payment_channel": "virtual-account",
    "status": "CONFIRMED",
    "anomaly_score": 0.18,
    "contributed_at": "2026-05-14T12:43:10.000Z"
  }
}
```

### `GET /api/contributions/history/`

Protected.

Success `200`:

```json
{
  "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
  "contributions": [
    {
      "id": "9ddf3dd1-0cb9-4bcb-9f38-24a1b2f7b380",
      "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
      "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
      "amount_kobo": 500000,
      "squad_transaction_ref": "SIM-001",
      "mandate_id": null,
      "contribution_virtual_account_id": "3349715f-4ed7-4d1a-81b7-2fcfe3b9473d",
      "payment_channel": "virtual-account",
      "status": "CONFIRMED",
      "anomaly_score": 0.18,
      "contributed_at": "2026-05-14T12:43:10.000Z"
    }
  ]
}
```

### `GET /api/contributions/audit/{cooperative_id}/`

Protected. This is the detailed contribution evidence view for internal dashboards.

Success `200`:

```json
{
  "cooperative": {
    "id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
    "name": "Lagos Market Women Coop",
    "registration_number": "REG-12345",
    "squad_virtual_account_number": "9013151600",
    "squad_customer_id": "COOP-LAG-REG12345"
  },
  "summary": {
    "total_contributions": 18,
    "total_amount_kobo": 4500000,
    "average_amount_kobo": 250000,
    "flagged_count": 1,
    "contribution_virtual_accounts": 12,
    "direct_debit_mandates": 3
  },
  "recent_contributions": [],
  "virtual_accounts": [],
  "mandates": []
}
```

### `POST /api/contributions/mandate/`

Protected. This still works, but for demo flow the product should lead with virtual accounts.

Request:

```json
{
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "amount_kobo": 150000,
  "account_number": "0123456789",
  "bank_code": "000013",
  "debit_day": 5,
  "bvn": "12345678901",
  "address": "22 Marina Road, Lagos",
  "customer_email": "ada@example.com",
  "description": "Monthly contribution mandate"
}
```

Success `201`:

```json
{
  "message": "Direct debit mandate created. For the hackathon demo, prefer the virtual-account contribution flow.",
  "mandate_id": "sqaudDDa27chviz8nwhv3d6w4gy",
  "merchant_reference": "VFMANDATE-ABC123456789",
  "status": "pending",
  "ready_to_debit": false
}
```

### `POST /api/webhooks/squad/`

Backend-to-backend only. Frontend should never call this directly.

When a webhook is processed successfully, the backend returns the normalized contribution record:

```json
{
  "id": "9ddf3dd1-0cb9-4bcb-9f38-24a1b2f7b380",
  "member_id": "105a9639-4998-46bf-a510-a678b7016a45",
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "amount_kobo": 700000,
  "squad_transaction_ref": "WEB-001",
  "mandate_id": null,
  "contribution_virtual_account_id": "3349715f-4ed7-4d1a-81b7-2fcfe3b9473d",
  "payment_channel": "virtual-account",
  "status": "CONFIRMED",
  "anomaly_score": 0.24,
  "contributed_at": "2026-05-14T12:44:10.000Z"
}
```

## Withdrawal Service

Business rule summary:

- Only `TREASURER` or `ADMIN` can create a withdrawal request.
- Treasurer signature is captured automatically at request time.
- Extra signatures come from `EXECUTIVE1` and `EXECUTIVE2`.
- Once the minimum signer count is reached, the backend attempts Squad payout release.

### `POST /api/withdrawals/request/`

Protected.

Request:

```json
{
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "amount_kobo": 100000,
  "destination_account": "0123456789",
  "destination_bank_code": "000013",
  "purpose": "Emergency member support"
}
```

Success `201`:

```json
{
  "id": "89776caf-9141-442e-a1ce-012c99bd1a7e",
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "requested_by": "105a9639-4998-46bf-a510-a678b7016a45",
  "amount_kobo": 100000,
  "destination_account": "0123456789",
  "destination_bank_code": "000013",
  "purpose": "Emergency member support",
  "ai_risk_score": 0.12,
  "status": "PARTIALLY_SIGNED",
  "squad_transfer_ref": null,
  "created_at": "2026-05-14T12:46:01.000Z",
  "signatures": [
    {
      "id": "2b732d5b-0e85-4f15-ae9d-22e746db6325",
      "signed_by": "105a9639-4998-46bf-a510-a678b7016a45",
      "role": "TREASURER",
      "signed_at": "2026-05-14T12:46:01.000Z"
    }
  ]
}
```

Typical errors:

- `400` only treasurer/admin can initiate
- `400` cooperative not found
- `401` unauthenticated

### `POST /api/withdrawals/{withdrawal_id}/sign/`

Protected.

Request:

```json
{
  "role": "EXECUTIVE1"
}
```

Partial success `200`:

```json
{
  "withdrawal_id": "89776caf-9141-442e-a1ce-012c99bd1a7e",
  "signatures_collected": 2,
  "signatures_required": 3,
  "status": "PARTIALLY_SIGNED",
  "signatures": [
    {
      "id": "2b732d5b-0e85-4f15-ae9d-22e746db6325",
      "signed_by": "105a9639-4998-46bf-a510-a678b7016a45",
      "role": "TREASURER",
      "signed_at": "2026-05-14T12:46:01.000Z"
    },
    {
      "id": "9ff72f76-8eb8-4ec3-ac8f-8fb5c261ac93",
      "signed_by": "4f6aeb28-e57e-4551-b54f-7a26f84c3d30",
      "role": "EXECUTIVE1",
      "signed_at": "2026-05-14T12:47:01.000Z"
    }
  ]
}
```

Release success `200` after final signature:

```json
{
  "id": "89776caf-9141-442e-a1ce-012c99bd1a7e",
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "requested_by": "105a9639-4998-46bf-a510-a678b7016a45",
  "amount_kobo": 100000,
  "destination_account": "0123456789",
  "destination_bank_code": "000013",
  "purpose": "Emergency member support",
  "ai_risk_score": 0.12,
  "status": "RELEASED",
  "squad_transfer_ref": "SBS5B8VU36_Test222",
  "created_at": "2026-05-14T12:46:01.000Z",
  "signatures": [
    {
      "id": "2b732d5b-0e85-4f15-ae9d-22e746db6325",
      "signed_by": "105a9639-4998-46bf-a510-a678b7016a45",
      "role": "TREASURER",
      "signed_at": "2026-05-14T12:46:01.000Z"
    },
    {
      "id": "9ff72f76-8eb8-4ec3-ac8f-8fb5c261ac93",
      "signed_by": "4f6aeb28-e57e-4551-b54f-7a26f84c3d30",
      "role": "EXECUTIVE1",
      "signed_at": "2026-05-14T12:47:01.000Z"
    },
    {
      "id": "5177d4f1-bfbc-4aa1-b2d9-4b6ca9af0e88",
      "signed_by": "d02144e0-f34e-4fcb-8a0c-c8911e89f628",
      "role": "EXECUTIVE2",
      "signed_at": "2026-05-14T12:48:01.000Z"
    }
  ]
}
```

Typical errors:

- `400` role already signed
- `400` treasurer cannot re-sign
- `400` actor role mismatch
- `400` high AI risk blocked release

### `GET /api/withdrawals/pending/?cooperative_id={cooperative_id}`

Protected.

Success `200`:

```json
{
  "pending": [
    {
      "id": "89776caf-9141-442e-a1ce-012c99bd1a7e",
      "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
      "requested_by": "105a9639-4998-46bf-a510-a678b7016a45",
      "amount_kobo": 100000,
      "destination_account": "0123456789",
      "destination_bank_code": "000013",
      "purpose": "Emergency member support",
      "ai_risk_score": 0.12,
      "status": "PARTIALLY_SIGNED",
      "squad_transfer_ref": null,
      "created_at": "2026-05-14T12:46:01.000Z",
      "signatures": []
    }
  ],
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3"
}
```

## Notification Service

### `POST /api/notify/sms/`

Public right now, but usually called by backend services.

Request:

```json
{
  "phone_number": "08012345678",
  "message": "Your VeriFund contribution has been confirmed."
}
```

Success `200` with real Africa's Talking credentials:

```json
{
  "status": "sent",
  "recipient": "08012345678",
  "provider_response": {}
}
```

Success `200` without a live SMS API key:

```json
{
  "status": "queued_local",
  "recipient": "08012345678"
}
```

Failure `200` if provider call itself fails:

```json
{
  "status": "failed",
  "recipient": "08012345678",
  "detail": "provider error text"
}
```

Validation error `400`:

```json
{
  "detail": "phone_number and message are required."
}
```

## AI Service

The AI service is already wired and callable today. Right now it uses deterministic heuristic fallbacks, which is good for the hackathon because the rest of the system already has a stable contract.

### `POST /api/ai/score-transaction/`

Use this from backend flows, especially after a contribution webhook lands.

Request:

```json
{
  "amount_kobo": 500000,
  "rolling_90d_mean": 300000,
  "days_since_last_contribution": 12,
  "member_transaction_count": 7,
  "cooperative_flagged_rate": 0.05
}
```

Success `200`:

```json
{
  "anomaly_score": 0.321,
  "flagged": false,
  "reason": "Transaction fits the recent contribution pattern.",
  "model": "heuristic_isolation_forest_fallback"
}
```

### `POST /api/ai/score-cooperative/`

Request:

```json
{
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "breakdown": {
    "contribution_regularity_score": 82,
    "withdrawal_frequency": 2,
    "member_churn_rate": 0.08,
    "avg_transaction_size": 250000,
    "num_large_withdrawals_30d": 0,
    "bvn_verification_rate": 1.0,
    "avg_withdrawal_risk": 0.12,
    "flagged_ratio": 0.03,
    "net_asset_trend_90d": 1200000
  }
}
```

Success `200`:

```json
{
  "cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3",
  "risk_score": 22,
  "health_score": 78,
  "top_features": [
    {
      "feature": "withdrawal_frequency",
      "impact": 0.21,
      "direction": "increases_risk"
    }
  ],
  "feature_snapshot": {
    "contribution_regularity_score": 82,
    "withdrawal_frequency": 2,
    "member_churn_rate": 0.08,
    "avg_transaction_size": 250000,
    "num_large_withdrawals_30d": 0,
    "bvn_verification_rate": 1.0,
    "avg_withdrawal_risk": 0.12,
    "flagged_ratio": 0.03,
    "net_asset_trend_90d": 1200000
  },
  "model": "heuristic_xgboost_fallback"
}
```

### `GET /api/ai/score-cooperative/{cooperative_id}/`

Same response shape as the `POST` version, but the backend computes features from the DB for you.

### `POST /api/ai/triage-report/`

Request:

```json
{
  "report_text": "Suspicious withdrawal missing 50000 from the cooperative wallet",
  "reporter_cooperative_id": "f15bd461-9609-49b1-93d2-fda2fa8729b3"
}
```

Success `200`:

```json
{
  "intent": "suspected_fraud",
  "corroboration_score": 0.74,
  "evidence_summary": "2 flagged contributions and 1 risky withdrawals already exist for this cooperative. Matched suspicious terms: missing, suspicious, withdrawal. Referenced amounts: 50000.",
  "escalate": true,
  "model": "rule_based_triage"
}
```

### `GET /api/ai/health-scores/`
### `GET /api/ai/health-scores/all/`

Success `200`:

```json
{
  "scores": {
    "f15bd461-9609-49b1-93d2-fda2fa8729b3": 78
  }
}
```

## Suggested frontend flow by role

### Member app

1. Call register or login.
2. Call `GET /api/members/me/`.
3. Call `POST /api/contributions/virtual-account/`.
4. Render the bank account details.
5. Poll or refresh `GET /api/contributions/history/`.

### Cooperative dashboard

1. Load cooperative detail.
2. Load trust score.
3. Load regulator summary.
4. Load contribution audit.
5. Load pending withdrawals.

### Treasurer/executive flow

1. Treasurer creates withdrawal request.
2. Executives sign with `EXECUTIVE1` and `EXECUTIVE2`.
3. Refresh pending withdrawals and trust score after release.

## Completeness check

These services do have working backend endpoints in the current codebase:

- Member service
- Cooperative service
- Contribution service
- Withdrawal service
- Notification service
- AI service

What is still intentionally thin:

- No frontend-specific pagination/filter endpoints yet
- No admin CRUD for bank codes or member management yet
- Notification service is currently SMS-first
- AI service is contract-complete but still powered by fallback heuristics unless the AI/ML dev swaps in trained models
