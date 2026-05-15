import json
import os
import socket
import time
import uuid
import hashlib
from pathlib import Path
from types import SimpleNamespace
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlparse

try:
    import psycopg2
    from psycopg2 import OperationalError
    from psycopg2.extras import RealDictCursor
except ModuleNotFoundError:
    psycopg2 = None
    OperationalError = Exception
    RealDictCursor = None


def load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file()

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://127.0.0.1:8000").rstrip("/")
AI_URL = os.getenv("AI_URL", "http://127.0.0.1:8005").rstrip("/")
NOTIFY_URL = os.getenv("NOTIFY_URL", "http://127.0.0.1:8006").rstrip("/")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
SQUAD_TEST_BVN = os.getenv("SQUAD_TEST_BVN", "22819094586").strip()


def db_execute(query: str, params: tuple | list | None = None) -> None:
    if psycopg2 is None or RealDictCursor is None:
        raise RuntimeError("psycopg2 is not installed. Install the backend requirements before running the smoke test.")
    with psycopg2.connect(DATABASE_URL) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params or [])
        connection.commit()


def db_fetch_one(query: str, params: tuple | list | None = None) -> dict | None:
    if psycopg2 is None or RealDictCursor is None:
        raise RuntimeError("psycopg2 is not installed. Install the backend requirements before running the smoke test.")
    with psycopg2.connect(DATABASE_URL) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params or [])
            return cursor.fetchone()


def request_json(
    method: str,
    url: str,
    headers: dict | None = None,
    payload: dict | None = None,
    timeout: int = 20,
):
    body = None
    request_headers = dict(headers or {})
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")

    request = Request(url, data=body, headers=request_headers, method=method.upper())
    try:
        with urlopen(request, timeout=timeout) as response:
            content = response.read()
            status_code = response.status
    except HTTPError as exc:
        content = exc.read()
        status_code = exc.code
    except URLError as exc:
        raise RuntimeError(f"{method.upper()} {url} failed before a response was received: {exc}") from exc

    text = content.decode("utf-8", errors="replace")
    return SimpleNamespace(status_code=status_code, text=text, content=content)


def assert_status(response, expected: int, label: str) -> dict:
    if response.status_code != expected:
        raise AssertionError(f"{label} failed: expected {expected}, got {response.status_code}, body={response.text}")
    return json.loads(response.text) if response.content else {}


def wait_for(url: str, timeout_seconds: int = 60) -> None:
    parsed = urlparse(url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2):
                return
        except OSError:
            pass
        try:
            with urlopen(url, timeout=2):
                return
        except HTTPError:
            return
        except Exception:
            time.sleep(1)
    raise TimeoutError(f"Timed out waiting for {url}")


def preflight_database() -> None:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is missing. Populate the root .env file before running the smoke test.")

    parsed = urlparse(DATABASE_URL)
    host = parsed.hostname
    port = parsed.port or 5432
    if not host:
        raise RuntimeError("DATABASE_URL is invalid. It must include a hostname.")

    try:
        socket.getaddrinfo(host, port)
    except socket.gaierror as exc:
        raise RuntimeError(
            f"Database host '{host}' could not be resolved (Errno {exc.errno}). "
            "Fix the hostname or use the provider's direct IP/connection string."
        ) from exc

    try:
        connection = psycopg2.connect(DATABASE_URL, connect_timeout=10)
        connection.close()
    except OperationalError as exc:
        raise RuntimeError(
            f"Database host '{host}:{port}' resolved, but the connection could not be opened: {exc}"
        ) from exc


def register_user(_client, suffix: str) -> dict:
    digits_only = "".join(ch for ch in suffix if ch.isdigit())
    unique_phone = f"08{digits_only[-9:]:0>9}"
    payload = {
        "bvn": SQUAD_TEST_BVN,
        "first_name": f"Test{suffix}",
        "last_name": "User",
        "phone_number": unique_phone,
        "email": f"test-{suffix}@verifund.local",
        "password": "Passw0rd!123",
    }
    response = request_json("POST", f"{GATEWAY_URL}/api/auth/register/", payload=payload)
    data = assert_status(response, 201, f"register {suffix}")
    return data


def promote_member(member_id: str, role: str) -> None:
    db_execute("UPDATE members SET role = %s WHERE id = %s", [role, member_id])


def seed_member_from_template(template_member_id: str, suffix: str, role: str) -> dict:
    template = db_fetch_one(
        """
        SELECT password_hash
        FROM members
        WHERE id = %s
        """,
        [template_member_id],
    )
    if not template:
        raise RuntimeError(f"Template member {template_member_id} was not found for smoke seeding.")

    digits_only = "".join(ch for ch in suffix if ch.isdigit())
    unique_phone = f"08{digits_only[-9:]:0>9}"
    member_id = str(uuid.uuid4())
    bvn_hash = hashlib.sha256(f"seed-{suffix}".encode("utf-8")).hexdigest()
    email = f"seed-{suffix}@verifund.local"
    db_fetch_one(
        """
        INSERT INTO members (
            id,
            bvn_hash,
            first_name,
            last_name,
            phone_number,
            email,
            password_hash,
            bvn_verified,
            bvn_verified_at,
            role,
            is_active
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, phone_number, email
        """,
        [
            member_id,
            bvn_hash,
            f"Seed{suffix}",
            "User",
            unique_phone,
            email,
            template["password_hash"],
            False,
            None,
            role,
            True,
        ],
    )
    return {"member": {"id": member_id, "phone_number": unique_phone, "email": email}}


def login_user(_client, phone_number: str) -> str:
    response = request_json(
        "POST",
        f"{GATEWAY_URL}/api/auth/login/",
        payload={"phone_number": phone_number, "password": "Passw0rd!123"},
    )
    data = assert_status(response, 200, f"login {phone_number}")
    return data["token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def main() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is not installed. Install the backend requirements before running the smoke test.")
    preflight_database()
    wait_for(f"{GATEWAY_URL}/api/cooperatives/non-existent/trust-score/")
    wait_for(f"{AI_URL}/api/ai/health-scores/")
    wait_for(f"{NOTIFY_URL}/api/notify/sms/")

    run_id = uuid.uuid4().hex[:8]
    admin1 = register_user(None, f"{run_id}01")
    admin2 = seed_member_from_template(admin1["member"]["id"], f"{run_id}02", "ADMIN")
    admin3 = seed_member_from_template(admin1["member"]["id"], f"{run_id}03", "ADMIN")

    promote_member(admin1["member"]["id"], "ADMIN")

    token1 = login_user(None, admin1["member"]["phone_number"])
    token2 = login_user(None, admin2["member"]["phone_number"])
    token3 = login_user(None, admin3["member"]["phone_number"])

    me = assert_status(
        request_json("GET", f"{GATEWAY_URL}/api/members/me/", headers=auth_headers(token1)),
        200,
        "member profile",
    )
    assert_status(
        request_json(
            "PATCH",
            f"{GATEWAY_URL}/api/members/me/",
            headers=auth_headers(token1),
            payload={"first_name": f"Updated{run_id}", "email": f"updated-{run_id}@verifund.local"},
        ),
        200,
        "member profile patch",
    )

    cooperative = assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/cooperatives/",
            payload={
                "name": f"VeriFund Coop {run_id}",
                "registration_number": f"REG-{run_id}",
                "state": "Lagos",
                "cooperative_type": "MULTIPURPOSE",
                "treasurer_bvn": SQUAD_TEST_BVN,
            },
        ),
        201,
        "create cooperative",
    )
    cooperative_id = cooperative["id"]

    assert_status(request_json("GET", f"{GATEWAY_URL}/api/cooperatives/{cooperative_id}/"), 200, "cooperative detail")
    assert_status(
        request_json("GET", f"{GATEWAY_URL}/api/cooperatives/{cooperative_id}/trust-score/"),
        200,
        "trust score",
    )
    assert_status(
        request_json("GET", f"{GATEWAY_URL}/api/cooperatives/{cooperative_id}/regulator-summary/"),
        200,
        "regulator summary",
    )

    va = assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/contributions/virtual-account/",
            headers=auth_headers(token1),
            payload={
                "cooperative_id": cooperative_id,
                "bvn": SQUAD_TEST_BVN,
                "dob": "07/19/1990",
                "address": "22 Marina Road, Lagos",
                "gender": "1",
                "phone_number": admin1["member"]["phone_number"],
                "email": admin1["member"]["email"],
            },
        ),
        201,
        "create contribution virtual account",
    )
    virtual_account = va["virtual_account"]

    assert_status(
        request_json(
            "GET",
            f"{GATEWAY_URL}/api/contributions/virtual-account/list/",
            headers=auth_headers(token1),
        ),
        200,
        "list contribution virtual accounts",
    )

    assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/contributions/virtual-account/simulate/",
            headers=auth_headers(token1),
            payload={"cooperative_id": cooperative_id, "amount_kobo": 500000},
        ),
        200,
        "simulate contribution payment",
    )

    webhook_ref = f"WEB-{run_id}"
    assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/webhooks/squad/",
            payload={
                "Event": "charge_successful",
                "TransactionRef": webhook_ref,
                "Body": {
                    "transaction_reference": webhook_ref,
                    "virtual_account_number": virtual_account["virtual_account_number"],
                    "principal_amount": "7000.00",
                    "settled_amount": "7000.00",
                    "currency": "NGN",
                    "customer_identifier": virtual_account["customer_identifier"],
                },
            },
        ),
        200,
        "squad webhook",
    )

    assert_status(
        request_json("GET", f"{GATEWAY_URL}/api/contributions/history/", headers=auth_headers(token1)),
        200,
        "contribution history",
    )
    assert_status(
        request_json(
            "GET",
            f"{GATEWAY_URL}/api/contributions/audit/{cooperative_id}/",
            headers=auth_headers(token1),
        ),
        200,
        "contribution audit",
    )

    assert_status(
        request_json(
            "GET",
            f"{GATEWAY_URL}/api/contributions/webhooks/events/",
            headers=auth_headers(token1),
        ),
        200,
        "webhook event list",
    )

    assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/withdrawals/lookup/",
            headers=auth_headers(token1),
            payload={"destination_bank_code": "000013", "destination_account": "0123456789"},
        ),
        200,
        "withdrawal recipient lookup",
    )

    withdrawal = assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/withdrawals/request/",
            headers=auth_headers(token1),
            payload={
                "cooperative_id": cooperative_id,
                "amount_kobo": 100000,
                "destination_account": "0123456789",
                "destination_bank_code": "000013",
                "purpose": "Hackathon release test",
            },
        ),
        201,
        "withdrawal request",
    )
    withdrawal_id = withdrawal["id"]
    assert_status(
        request_json(
            "GET",
            f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/",
            headers=auth_headers(token1),
        ),
        200,
        "withdrawal detail",
    )

    assert_status(
        request_json(
            "GET",
            f"{GATEWAY_URL}/api/withdrawals/pending/?cooperative_id={cooperative_id}",
            headers=auth_headers(token1),
        ),
        200,
        "pending withdrawals",
    )

    assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/sign/",
            headers=auth_headers(token2),
            payload={"role": "EXECUTIVE1"},
        ),
        200,
        "withdrawal sign 1",
    )
    assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/sign/",
            headers=auth_headers(token3),
            payload={"role": "EXECUTIVE2"},
        ),
        200,
        "withdrawal sign 2",
    )
    assert_status(
        request_json(
            "POST",
            f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/requery/",
            headers=auth_headers(token1),
        ),
        200,
        "withdrawal requery",
    )

    assert_status(
        request_json(
            "POST",
            f"{AI_URL}/api/ai/score-transaction/",
            payload={"amount_kobo": 500000, "rolling_90d_mean": 300000},
        ),
        200,
        "ai score transaction",
    )
    assert_status(
        request_json(
            "POST",
            f"{AI_URL}/api/ai/score-cooperative/",
            payload={"cooperative_id": cooperative_id, "breakdown": {"member_churn_rate": 0.1}},
        ),
        200,
        "ai score cooperative post",
    )
    assert_status(
        request_json("GET", f"{AI_URL}/api/ai/score-cooperative/{cooperative_id}/"),
        200,
        "ai score cooperative get",
    )
    assert_status(
        request_json(
            "POST",
            f"{AI_URL}/api/ai/triage-report/",
            payload={"report_text": "Suspicious withdrawal missing 50000", "reporter_cooperative_id": cooperative_id},
        ),
        200,
        "ai triage report",
    )
    assert_status(
        request_json(
            "POST",
            f"{AI_URL}/api/ai/analyze-graph/",
            payload={"cooperative_id": cooperative_id},
        ),
        200,
        "ai analyze graph post",
    )
    assert_status(
        request_json("GET", f"{AI_URL}/api/ai/analyze-graph/{cooperative_id}/"),
        200,
        "ai analyze graph get",
    )
    assert_status(request_json("GET", f"{AI_URL}/api/ai/health-scores/"), 200, "ai health scores")
    assert_status(request_json("GET", f"{AI_URL}/api/ai/health-scores/all/"), 200, "ai health scores all")

    assert_status(
        request_json(
            "POST",
            f"{NOTIFY_URL}/api/notify/sms/",
            payload={"phone_number": "08012345678", "message": "VeriFund smoke test"},
        ),
        200,
        "notification sms",
    )
    assert_status(
        request_json("GET", f"{NOTIFY_URL}/api/notify/history/?limit=5"),
        200,
        "notification history",
    )

    print(
        "Smoke test passed:",
        {
            "member_id": me["id"],
            "cooperative_id": cooperative_id,
            "virtual_account_id": virtual_account["id"],
            "withdrawal_id": withdrawal_id,
        },
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Smoke test failed: {exc}")
        raise
