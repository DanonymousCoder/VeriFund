import os
import socket
import time
import uuid
from urllib.parse import urlparse

import httpx
import psycopg2
from psycopg2.extras import RealDictCursor


GATEWAY_URL = os.getenv("GATEWAY_URL", "http://127.0.0.1:8000").rstrip("/")
AI_URL = os.getenv("AI_URL", "http://127.0.0.1:8005").rstrip("/")
NOTIFY_URL = os.getenv("NOTIFY_URL", "http://127.0.0.1:8006").rstrip("/")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgres://pxxluser_mp58m1hl46f52cc:615abd4d6986d9ed98727fd31b3ec539d985f317bfd7022150e7c2720ad20723@db.pxxl.pro:48721/pxxldb_mp58m1hld5a33f1",
)


def db_execute(query: str, params: tuple | list | None = None) -> None:
    with psycopg2.connect(DATABASE_URL) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params or [])
        connection.commit()


def assert_status(response: httpx.Response, expected: int, label: str) -> dict:
    if response.status_code != expected:
        raise AssertionError(f"{label} failed: expected {expected}, got {response.status_code}, body={response.text}")
    return response.json() if response.content else {}


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
            httpx.get(url, timeout=2)
            return
        except Exception:
            time.sleep(1)
    raise TimeoutError(f"Timed out waiting for {url}")


def register_user(client: httpx.Client, suffix: str) -> dict:
    digits = "".join(ch for ch in suffix if ch.isdigit())[-9:]
    bvn = f"12{digits:0>9}"[:11]
    payload = {
        "bvn": bvn,
        "first_name": f"Test{suffix}",
        "last_name": "User",
        "phone_number": f"080{suffix[-8:]}",
        "email": f"test-{suffix}@verifund.local",
        "password": "Passw0rd!123",
    }
    response = client.post(f"{GATEWAY_URL}/api/auth/register/", json=payload)
    data = assert_status(response, 201, f"register {suffix}")
    return data


def promote_member(member_id: str, role: str) -> None:
    db_execute("UPDATE members SET role = %s WHERE id = %s", [role, member_id])


def login_user(client: httpx.Client, phone_number: str) -> str:
    response = client.post(
        f"{GATEWAY_URL}/api/auth/login/",
        json={"phone_number": phone_number, "password": "Passw0rd!123"},
    )
    data = assert_status(response, 200, f"login {phone_number}")
    return data["token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def main() -> None:
    wait_for(f"{GATEWAY_URL}/api/cooperatives/non-existent/trust-score/")
    wait_for(f"{AI_URL}/api/ai/health-scores/")
    wait_for(f"{NOTIFY_URL}/api/notify/sms/")

    run_id = uuid.uuid4().hex[:8]
    with httpx.Client(timeout=20) as client:
        admin1 = register_user(client, f"{run_id}01")
        admin2 = register_user(client, f"{run_id}02")
        admin3 = register_user(client, f"{run_id}03")

        promote_member(admin1["member"]["id"], "ADMIN")
        promote_member(admin2["member"]["id"], "ADMIN")
        promote_member(admin3["member"]["id"], "ADMIN")

        token1 = login_user(client, admin1["member"]["phone_number"])
        token2 = login_user(client, admin2["member"]["phone_number"])
        token3 = login_user(client, admin3["member"]["phone_number"])

        me = assert_status(
            client.get(f"{GATEWAY_URL}/api/members/me/", headers=auth_headers(token1)),
            200,
            "member profile",
        )
        assert_status(
            client.patch(
                f"{GATEWAY_URL}/api/members/me/",
                headers=auth_headers(token1),
                json={"first_name": f"Updated{run_id}", "email": f"updated-{run_id}@verifund.local"},
            ),
            200,
            "member profile patch",
        )

        cooperative = assert_status(
            client.post(
                f"{GATEWAY_URL}/api/cooperatives/",
                json={
                    "name": f"VeriFund Coop {run_id}",
                    "registration_number": f"REG-{run_id}",
                    "state": "Lagos",
                    "cooperative_type": "MULTIPURPOSE",
                    "treasurer_bvn": "12345678901",
                },
            ),
            201,
            "create cooperative",
        )
        cooperative_id = cooperative["id"]

        assert_status(client.get(f"{GATEWAY_URL}/api/cooperatives/{cooperative_id}/"), 200, "cooperative detail")
        assert_status(
            client.get(f"{GATEWAY_URL}/api/cooperatives/{cooperative_id}/trust-score/"),
            200,
            "trust score",
        )
        assert_status(
            client.get(f"{GATEWAY_URL}/api/cooperatives/{cooperative_id}/regulator-summary/"),
            200,
            "regulator summary",
        )

        va = assert_status(
            client.post(
                f"{GATEWAY_URL}/api/contributions/virtual-account/",
                headers=auth_headers(token1),
                json={
                    "cooperative_id": cooperative_id,
                    "bvn": "12345678901",
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
            client.get(
                f"{GATEWAY_URL}/api/contributions/virtual-account/list/",
                headers=auth_headers(token1),
            ),
            200,
            "list contribution virtual accounts",
        )

        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/contributions/virtual-account/simulate/",
                headers=auth_headers(token1),
                json={"cooperative_id": cooperative_id, "amount_kobo": 500000},
            ),
            200,
            "simulate contribution payment",
        )

        webhook_ref = f"WEB-{run_id}"
        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/webhooks/squad/",
                json={
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
            client.get(f"{GATEWAY_URL}/api/contributions/history/", headers=auth_headers(token1)),
            200,
            "contribution history",
        )
        assert_status(
            client.get(
                f"{GATEWAY_URL}/api/contributions/audit/{cooperative_id}/",
                headers=auth_headers(token1),
            ),
            200,
            "contribution audit",
        )

        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/contributions/mandate/",
                headers=auth_headers(token1),
                json={
                    "cooperative_id": cooperative_id,
                    "amount_kobo": 150000,
                    "account_number": "0123456789",
                    "bank_code": "000013",
                    "debit_day": 5,
                    "bvn": "12345678901",
                    "address": "22 Marina Road, Lagos",
                    "customer_email": admin1["member"]["email"],
                    "description": "Monthly contribution mandate",
                },
            ),
            201,
            "direct debit mandate",
        )
        mandate_status = assert_status(
            client.get(
                f"{GATEWAY_URL}/api/contributions/mandate/VFMANDATE-DOES-NOT-EXIST/",
                headers=auth_headers(token1),
            ),
            404,
            "missing mandate status",
        )

        created_mandate = client.post(
            f"{GATEWAY_URL}/api/contributions/mandate/",
            headers=auth_headers(token1),
            json={
                "cooperative_id": cooperative_id,
                "amount_kobo": 160000,
                "account_number": "0123456789",
                "bank_code": "000013",
                "debit_day": 5,
                "bvn": "12345678901",
                "address": "22 Marina Road, Lagos",
                "customer_email": admin1["member"]["email"],
                "description": "Second monthly contribution mandate",
            },
        )
        created_mandate_data = assert_status(created_mandate, 201, "create second mandate")
        assert_status(
            client.get(
                f"{GATEWAY_URL}/api/contributions/mandate/{created_mandate_data['merchant_reference']}/",
                headers=auth_headers(token1),
            ),
            200,
            "mandate status",
        )
        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/contributions/mandate/debit/",
                headers=auth_headers(token1),
                json={
                    "mandate_id": created_mandate_data["mandate_id"],
                    "amount_kobo": 50000,
                    "narration": "Smoke debit",
                    "customer_email": admin1["member"]["email"],
                    "pass_charge": False,
                },
            ),
            201,
            "mandate debit",
        )
        assert_status(
            client.get(
                f"{GATEWAY_URL}/api/contributions/webhooks/events/",
                headers=auth_headers(token1),
            ),
            200,
            "webhook event list",
        )

        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/withdrawals/lookup/",
                headers=auth_headers(token1),
                json={"destination_bank_code": "000013", "destination_account": "0123456789"},
            ),
            200,
            "withdrawal recipient lookup",
        )

        withdrawal = assert_status(
            client.post(
                f"{GATEWAY_URL}/api/withdrawals/request/",
                headers=auth_headers(token1),
                json={
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
            client.get(
                f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/",
                headers=auth_headers(token1),
            ),
            200,
            "withdrawal detail",
        )

        assert_status(
            client.get(
                f"{GATEWAY_URL}/api/withdrawals/pending/?cooperative_id={cooperative_id}",
                headers=auth_headers(token1),
            ),
            200,
            "pending withdrawals",
        )

        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/sign/",
                headers=auth_headers(token2),
                json={"role": "EXECUTIVE1"},
            ),
            200,
            "withdrawal sign 1",
        )
        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/sign/",
                headers=auth_headers(token3),
                json={"role": "EXECUTIVE2"},
            ),
            200,
            "withdrawal sign 2",
        )
        assert_status(
            client.post(
                f"{GATEWAY_URL}/api/withdrawals/{withdrawal_id}/requery/",
                headers=auth_headers(token1),
            ),
            200,
            "withdrawal requery",
        )

        assert_status(
            client.post(
                f"{AI_URL}/api/ai/score-transaction/",
                json={"amount_kobo": 500000, "rolling_90d_mean": 300000},
            ),
            200,
            "ai score transaction",
        )
        assert_status(
            client.post(
                f"{AI_URL}/api/ai/score-cooperative/",
                json={"cooperative_id": cooperative_id, "breakdown": {"member_churn_rate": 0.1}},
            ),
            200,
            "ai score cooperative post",
        )
        assert_status(
            client.get(f"{AI_URL}/api/ai/score-cooperative/{cooperative_id}/"),
            200,
            "ai score cooperative get",
        )
        assert_status(
            client.post(
                f"{AI_URL}/api/ai/triage-report/",
                json={"report_text": "Suspicious withdrawal missing 50000", "reporter_cooperative_id": cooperative_id},
            ),
            200,
            "ai triage report",
        )
        assert_status(client.get(f"{AI_URL}/api/ai/health-scores/"), 200, "ai health scores")
        assert_status(client.get(f"{AI_URL}/api/ai/health-scores/all/"), 200, "ai health scores all")

        assert_status(
            client.post(
                f"{NOTIFY_URL}/api/notify/sms/",
                json={"phone_number": "08012345678", "message": "VeriFund smoke test"},
            ),
            200,
            "notification sms",
        )
        assert_status(
            client.get(f"{NOTIFY_URL}/api/notify/history/?limit=5"),
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
    main()
