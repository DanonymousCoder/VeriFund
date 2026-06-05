"""
Verify Neon, Redis, and deployed Railway endpoints.

Usage:
  python scripts/verify_env.py
  set DEPLOYED_BACKEND_URL=https://verifund-production-0ae5.up.railway.app
  set DEPLOYED_AI_URL=https://your-ai.up.railway.app
"""

from __future__ import annotations

import json
import os
import socket
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def check(label: str, ok: bool, detail: str = "") -> bool:
    mark = "OK" if ok else "FAIL"
    print(f"[{mark}] {label}" + (f" — {detail}" if detail else ""))
    return ok


def check_postgres(url: str) -> bool:
    if not url:
        return check("DATABASE_URL", False, "not set")
    try:
        import psycopg2

        conn = psycopg2.connect(url, connect_timeout=15)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        conn.close()
        host = url.split("@")[1].split("/")[0] if "@" in url else "?"
        return check("Neon Postgres", True, host)
    except Exception as exc:
        return check("Neon Postgres", False, str(exc))


def check_redis(url: str) -> bool:
    if not url:
        return check("REDIS_URL", False, "not set")
    try:
        import redis

        client = redis.from_url(url, socket_connect_timeout=10)
        client.ping()
        return check("Upstash Redis", True, url.split("@")[-1].split("/")[0])
    except Exception as exc:
        return check("Upstash Redis", False, str(exc))


def http_get(url: str, timeout: int = 20) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status, resp.read(300).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(300).decode("utf-8", errors="replace")
    except Exception as exc:
        return 0, str(exc)


def http_post_json(url: str, payload: dict, timeout: int = 30) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(500).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(500).decode("utf-8", errors="replace")
    except Exception as exc:
        return 0, str(exc)


def main() -> int:
    load_env()
    fails = 0

    db_url = os.getenv("DATABASE_URL", "")
    redis_url = os.getenv("REDIS_URL", "")
    fails += 0 if check_postgres(db_url) else 1
    fails += 0 if check_redis(redis_url) else 1

    local = os.getenv("GATEWAY_URL", "http://127.0.0.1:8000").rstrip("/")
    code, body = http_get(f"{local}/health/")
    fails += 0 if check("Local gateway /health/", code == 200, f"HTTP {code}") else 1

    local_suffix = str(abs(hash(f"envcheck-{__import__('time').time()}")))[:9]
    code, body = http_post_json(
        f"{local}/api/auth/register/",
        {
            "bvn": f"22{local_suffix.zfill(9)}",
            "first_name": "EnvCheck",
            "last_name": "User",
            "phone_number": f"08{local_suffix}",
            "email": f"envcheck-{local_suffix}@verifund.local",
            "password": "Passw0rd!123",
        },
    )
    if code == 201:
        check("Local register", True, "member created")
    elif "InterfaceError" in body or "connection already closed" in body:
        check("Local register", False, "DB connection issue — rebuild containers after shared/db.py fix")
        fails += 1
    else:
        check("Local register", False, f"HTTP {code}: {body[:120]}")
        fails += 1

    backend = os.getenv("DEPLOYED_BACKEND_URL", "https://verifund-production-0ae5.up.railway.app").rstrip("/")
    code, _ = http_get(f"{backend}/health/")
    fails += 0 if check("Production /health/", code == 200, f"HTTP {code}") else 1

    import time

    prod_suffix = str(int(time.time()))[-9:]
    code, body = http_post_json(
        f"{backend}/api/auth/register/",
        {
            "bvn": f"22{prod_suffix.zfill(9)}",
            "first_name": "ProdCheck",
            "last_name": "User",
            "phone_number": f"08{prod_suffix}",
            "email": f"prodcheck-{prod_suffix}@verifund.local",
            "password": "Passw0rd!123",
        },
    )
    if code == 201:
        check("Production register", True, "member created")
    elif "InterfaceError" in body:
        check(
            "Production register",
            False,
            "InterfaceError — redeploy backend with updated shared/db.py; confirm Railway DATABASE_URL uses Neon pooler URL",
        )
        fails += 1
    else:
        check("Production register", False, f"HTTP {code}: {body[:120]}")
        fails += 1

    ai_candidates = [
        os.getenv("DEPLOYED_AI_URL", "").strip(),
        "https://independent-optimism-production-7724.up.railway.app",
    ]
    seen = set()
    for ai_base in ai_candidates:
        if not ai_base or ai_base in seen:
            continue
        seen.add(ai_base)
        code, body = http_get(f"{ai_base.rstrip('/')}/api/ai/health-scores/", timeout=30)
        if code == 200:
            check(f"AI service {ai_base}", True, "health-scores OK")
        else:
            check(f"AI service {ai_base}", False, f"HTTP {code} — set AI_SERVICE_URL to a live service or use built-in http://127.0.0.1:8005 on monolith")
            fails += 1

    code, body = http_post_json(
        f"{backend}/api/ai/score-transaction/",
        {"amount_kobo": 500000, "rolling_90d_mean": 300000},
    )
    fails += 0 if check("Production gateway AI proxy", code == 200, f"HTTP {code}") else 1

    print()
    if fails:
        print(f"{fails} check(s) failed.")
        return 1
    print("All environment checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
