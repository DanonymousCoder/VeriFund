# Tests

`live_route_smoke.py` is a lightweight end-to-end smoke test for the public backend routes.

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
