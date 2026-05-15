# Tests

`live_route_smoke.py` is a lightweight end-to-end smoke test for the public backend routes.
`verifund-endpoints.http` is a manual request file you can use before the frontend exists.

It expects the services to be running locally on:

- `http://127.0.0.1:8000` for the API gateway
- `http://127.0.0.1:8005` for AI
- `http://127.0.0.1:8006` for notification

The script:

1. registers test users,
2. promotes them in Postgres for withdrawal signing,
3. creates a cooperative,
4. exercises contribution virtual account and webhook flows,
5. exercises withdrawal approval/release,
6. hits AI and notification endpoints.

Run it with:

```bash
python tests/live_route_smoke.py
```

The smoke test now fails fast with a clear database preflight message when the configured
`DATABASE_URL` cannot be resolved or reached.

For manual endpoint checks, open `tests/verifund-endpoints.http` in a REST client that
supports `.http` files, then run the requests from top to bottom and paste the returned
JWT, cooperative id, withdrawal id, and merchant reference into the request variables.
