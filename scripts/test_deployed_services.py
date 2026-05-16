"""
Quick health checks for deployed Railway services.

Usage:
  set DEPLOYED_AI_URL=https://your-ai.up.railway.app
  set DEPLOYED_BACKEND_URL=https://your-backend.up.railway.app
  python scripts/test_deployed_services.py
"""

import json
import os
import sys
import urllib.error
import urllib.request

AI_URL = os.getenv("DEPLOYED_AI_URL", os.getenv("AI_SERVICE_URL", "")).rstrip("/")
BACKEND_URL = os.getenv("DEPLOYED_BACKEND_URL", "").rstrip("/")
NOTIFY_URL = os.getenv("DEPLOYED_NOTIFY_URL", "http://127.0.0.1:8006").rstrip("/")


def post_json(url: str, payload: dict) -> tuple[int, dict]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
            return response.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = {"raw": body}
        return exc.code, parsed


def main() -> int:
    failures = 0

    if AI_URL and not AI_URL.startswith("http://127.0.0.1") and "ai-service" not in AI_URL:
        print(f"Testing AI service: {AI_URL}")
        status, body = post_json(
            f"{AI_URL}/api/ai/score-transaction/",
            {
                "amount_kobo": 500000,
                "rolling_90d_mean": 300000,
                "days_since_last_contribution": 12,
                "member_transaction_count": 7,
                "cooperative_flagged_rate": 0.05,
            },
        )
        print(f"  score-transaction -> {status}: {body}")
        failures += status != 200

        status, body = post_json(
            f"{AI_URL}/api/ai/triage-report/",
            {
                "report_text": "Suspicious withdrawal missing 50000",
                "reporter_cooperative_id": "demo-coop",
            },
        )
        print(f"  triage-report -> {status}: {body}")
        failures += status != 200
    else:
        print("Skip AI: set DEPLOYED_AI_URL to your Railway AI public URL.")

    if BACKEND_URL:
        print(f"Testing backend gateway: {BACKEND_URL}")
        status, body = post_json(
            f"{BACKEND_URL}/api/ai/score-transaction/",
            {
                "amount_kobo": 500000,
                "rolling_90d_mean": 300000,
                "days_since_last_contribution": 12,
                "member_transaction_count": 7,
                "cooperative_flagged_rate": 0.05,
            },
        )
        print(f"  gateway /api/ai/score-transaction -> {status}: {body}")
        failures += status != 200
    else:
        print("Skip gateway: set DEPLOYED_BACKEND_URL to your Railway backend public URL.")

    print(f"Testing notifications: {NOTIFY_URL}")
    status, body = post_json(
        f"{NOTIFY_URL}/api/notify/email/",
        {
            "email": os.getenv("DEFAULT_NOTIFICATION_EMAIL", "demo@verifund.app"),
            "subject": "VeriFund deploy test",
            "message": "Notification service email test.",
        },
    )
    print(f"  notify/email -> {status}: {body}")
    failures += status != 200

    if failures:
        print(f"\n{failures} check(s) failed.")
        return 1
    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
