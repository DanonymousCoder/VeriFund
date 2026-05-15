# Deploy Fast

This is the fastest path to get a backend URL ready so the frontend can start integration.

## Recommendation

Use Railway with the repo root `Dockerfile`.

Reason:

- Railway supports Python and Docker without any issue
- the repo root now boots the internal services and exposes the gateway
- frontend only needs one stable public gateway URL to begin integration

Render is still valid, but Railway is simpler now for this repo.

## Fastest backend shape

Deploy one Railway service from the repo root plus PostgreSQL.

Frontend should integrate only against:

- `https://your-gateway-domain/api/...`

## Railway quick path

1. Create one Railway project from the repo.
2. Add a PostgreSQL service in the same Railway project, or use your Neon `DATABASE_URL`.
3. Deploy the repo root.
4. Railway should build from the root `Dockerfile`.
5. The root `start.sh` boots the internal services and exposes the gateway on `PORT`.
6. Set the env vars.
7. Set Squad webhook URL to:

```text
https://your-gateway-domain/api/webhooks/squad/
```

## Env values to use

Use these real values in Railway variables:

- `SQUAD_SECRET_KEY`
- `SQUAD_PUBLIC_KEY`
- `SQUAD_WEBHOOK_SECRET`
- `SQUAD_REDIRECT_URL`
- `SQUAD_WEBHOOK_URL`
- `SQUAD_SETTLEMENT_ACCOUNT=1005369069`
- `SQUAD_SETTLEMENT_MOBILE=09133049290`
- `SQUAD_SETTLEMENT_EMAIL=olumidemichellle@gmail.com`
- `SQUAD_SETTLEMENT_ADDRESS=22a adebayo farogbe street new town ikorodu lagos state`
- `SQUAD_SETTLEMENT_DOB=10/09/2007`
- `SQUAD_SETTLEMENT_GENDER=2`
- `DATABASE_URL`
- `JWT_SECRET`
- `AT_USERNAME`
- `AT_API_KEY`

## Frontend integration tip

Do not wait for every private service to get its own public URL.

The frontend only needs:

- one public gateway base URL
- working auth routes
- working cooperative routes
- working contribution routes
- working withdrawal routes
- working AI routes through the gateway

## If you insist on Render

Use:

- 1 Render Web Service from the repo root `Dockerfile`, or
- 1 Render Web Service for `api-gateway`
- 6 Render Private Services for the internal backends
- 1 Render Postgres database

That works, but Railway is the faster path for this repo right now.
