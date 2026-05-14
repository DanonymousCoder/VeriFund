# Frontend Route Guide

Base URL through the gateway: `http://localhost:8000`

## Auth and member

- `POST /api/auth/register/`
  Use for sign-up. This is where BVN verification happens.
  Body:
  ```json
  {
    "bvn": "22343211654",
    "first_name": "Ada",
    "last_name": "Okafor",
    "phone_number": "08012345678",
    "email": "ada@example.com",
    "password": "strong-password"
  }
  ```

- `POST /api/auth/login/`
  Returns JWT.

- `GET /api/members/me/`
  Send `Authorization: Bearer <token>`.

## Cooperative

- `POST /api/cooperatives/`
  Creates a cooperative and provisions its Squad cooperative-level virtual account.
  Body:
  ```json
  {
    "name": "Lagos Market Women Coop",
    "registration_number": "REG-12345",
    "state": "Lagos",
    "cooperative_type": "MULTIPURPOSE",
    "treasurer_bvn": "22343211654"
  }
  ```

- `GET /api/cooperatives/{cooperative_id}/`
  Fetch one cooperative.

- `GET /api/cooperatives/{cooperative_id}/trust-score/`
  Public trust view for badges/scorecards.

- `GET /api/cooperatives/{cooperative_id}/regulator-summary/`
  Public regulator/audit summary view.

## Contribution flow

Preferred hackathon flow: use dedicated member virtual accounts, not direct debit.

- `POST /api/contributions/virtual-account/`
  Creates or returns the member’s dedicated Squad virtual account for one cooperative.
  Requires auth.
  Body:
  ```json
  {
    "cooperative_id": "coop-uuid",
    "bvn": "22343211654",
    "dob": "07/19/1990",
    "address": "22 Marina Road, Lagos",
    "gender": "1",
    "phone_number": "08012345678",
    "email": "ada@example.com"
  }
  ```
  Use the returned `virtual_account.virtual_account_number` for bank-transfer instructions.

- `GET /api/contributions/virtual-account/list/`
  Lists the authenticated member’s dedicated contribution virtual accounts.

- `POST /api/contributions/virtual-account/simulate/`
  Sandbox helper for demos.
  Body:
  ```json
  {
    "cooperative_id": "coop-uuid",
    "amount_kobo": 500000
  }
  ```

- `GET /api/contributions/history/`
  Member contribution history.

- `GET /api/contributions/audit/{cooperative_id}/`
  Internal contribution audit pack for that cooperative.

- `POST /api/webhooks/squad/`
  Backend-only Squad webhook endpoint. Frontend does not call this directly.

## Direct debit

- `POST /api/contributions/mandate/`
  Still available, but use only if you intentionally want the mandate flow.

## Withdrawals

- `POST /api/withdrawals/request/`
  Treasurer/admin starts a withdrawal request.

- `POST /api/withdrawals/{withdrawal_id}/sign/`
  Executives/admin co-sign.

- `GET /api/withdrawals/pending/?cooperative_id={cooperative_id}`
  Review pending or partially signed withdrawals.

## Suggested frontend UX

1. Register and login.
2. Create or load cooperative.
3. Call `POST /api/contributions/virtual-account/`.
4. Show the returned account number as “Pay by bank transfer”.
5. For demo mode, call `/api/contributions/virtual-account/simulate/`.
6. Refresh `GET /api/contributions/history/` and `GET /api/cooperatives/{id}/trust-score/`.
