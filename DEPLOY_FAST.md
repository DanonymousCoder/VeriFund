# Deploy Fast

This is the fastest path to get a backend URL ready so the frontend can start integration.

## Recommendation

Use Railway first for speed.

Reason:

- this repo is a multi-service backend, not one single app
- Railway is faster to stand up for many Docker-based services plus Postgres
- frontend only needs one stable public gateway URL to begin integration

Render is still a valid second choice, but it is more setup-heavy for this repo because you need one public service plus multiple private services.

## Fastest backend shape

Deploy these services:

- `api-gateway` as the only public URL
- `member-service`
- `cooperative-service`
- `contribution-service`
- `withdrawal-service`
- `ai-service`
- `notification-service`
- PostgreSQL

Frontend should integrate only against:

- `https://your-gateway-domain/api/...`

## Railway quick path

1. Create one Railway project from the repo.
2. Add a PostgreSQL service in the same Railway project.
3. Create one service per backend folder using its Dockerfile.
4. Make only `api-gateway` public.
5. Keep the other services private/internal.
6. Set each service env vars.
7. Point internal service URLs to Railway internal hostnames.
8. Run `python scripts/bootstrap_db.py` once against the live DB.
9. Set Squad webhook URL to:

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

- 1 Render Web Service for `api-gateway`
- 6 Render Private Services for the internal backends
- 1 Render Postgres database

That works, but Railway is the faster path for this repo right now.
