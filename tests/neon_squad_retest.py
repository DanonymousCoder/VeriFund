import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
import psycopg2


ROOT = Path(__file__).resolve().parents[1]
DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_W7Is4YfkZFJS@ep-wispy-wave-apgo0600.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require",
)
JWT_SECRET = os.getenv("JWT_SECRET", "verifund-dev-jwt-secret")
TEST_BVN = os.getenv("SQUAD_TEST_BVN", "123456789")


def _service_env() -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "DATABASE_URL": DB_URL,
            "JWT_SECRET": JWT_SECRET,
            "JWT_EXPIRY_HOURS": "24",
            "SQUAD_SECRET_KEY": "sandbox_sk_d2b7b476263bee86da36113d1d7e7d654ebfb9c4e878",
            "SQUAD_PUBLIC_KEY": "sandbox_pk_d2b7b476263bee86da360d4d6b1f7b0828deb4ade870",
            "SQUAD_WEBHOOK_SECRET": "sandbox_sk_d2b7b476263bee86da36113d1d7e7d654ebfb9c4e878",
            "SQUAD_BASE_URL": "https://sandbox-api-d.squadco.com",
            "SQUAD_REQUEST_TIMEOUT": "20",
            "SQUAD_DIRECT_DEBIT_PATH": "/transaction/mandate/create",
            "SQUAD_SETTLEMENT_ACCOUNT": "1005369069",
            "SQUAD_SETTLEMENT_MOBILE": "09133049290",
            "SQUAD_SETTLEMENT_EMAIL": "olumidemichellle@gmail.com",
            "SQUAD_SETTLEMENT_ADDRESS": "22a adebayo farogbe street new town ikorodu lagos state",
            "SQUAD_SETTLEMENT_DOB": "10/09/2007",
            "SQUAD_SETTLEMENT_GENDER": "2",
            "ALLOW_UNVERIFIED_WEBHOOKS": "True",
            "ALLOWED_HOSTS": "127.0.0.1,localhost,0.0.0.0,testserver,*",
            "REDIS_URL": os.getenv(
                "REDIS_URL",
                "redis://default:gQAAAAAAAeKzAAIgcDIzYmU2ZjI4ZjgwMTg0NjMxOWFkYzgxMDIxZjYyMDM5ZQ@major-piglet-123571.upstash.io:6379",
            ),
            "PYTHONPATH": str(ROOT),
        }
    )
    return env


def _db():
    return psycopg2.connect(DB_URL)


def _run_python(code: str, cwd: Path, extra_env: dict[str, str]) -> dict:
    env = _service_env()
    env.update(extra_env)
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(cwd),
        env=env,
        text=True,
        capture_output=True,
        timeout=180,
    )
    payload = {
        "returncode": result.returncode,
        "stdout": result.stdout.strip(),
        "stderr": result.stderr.strip(),
    }
    return payload


def _token(member_id: str, role: str) -> str:
    payload = {"member_id": member_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def main() -> None:
    run_id = uuid.uuid4().hex[:8]
    suffix = run_id[:6]
    phone = f"08012{suffix[:6]}"
    email = f"neon-{run_id}@example.com"
    registration_number = f"NEON-{run_id.upper()}"

    member_code = f"""
import json, os, sys, django
sys.path.insert(0, r"{ROOT}")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client
client = Client()
response = client.post("/api/auth/register/", data=json.dumps({{
    "bvn": "{TEST_BVN}",
    "first_name": "Ada",
    "last_name": "Okafor",
    "phone_number": "{phone}",
    "email": "{email}",
    "password": "Passw0rd!123"
}}), content_type="application/json")
print(json.dumps({{"status": response.status_code, "body": json.loads(response.content.decode())}}))
"""
    member_result = _run_python(member_code, ROOT / "member-service", {"DJANGO_SETTINGS_MODULE": "config.settings"})

    coop_code = f"""
import json, os, sys, django
sys.path.insert(0, r"{ROOT}")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client
client = Client()
response = client.post("/api/cooperatives/", data=json.dumps({{
    "name": "Neon Coop {run_id}",
    "registration_number": "{registration_number}",
    "state": "Lagos",
    "cooperative_type": "THRIFT",
    "treasurer_bvn": "{TEST_BVN}"
}}), content_type="application/json")
print(json.dumps({{"status": response.status_code, "body": json.loads(response.content.decode())}}))
"""
    coop_result = _run_python(coop_code, ROOT / "cooperative-service", {"DJANGO_SETTINGS_MODULE": "config.settings"})

    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, bvn_verified FROM members WHERE email = %s ORDER BY created_at DESC LIMIT 1", [email])
            member_row = cur.fetchone()
            cur.execute(
                "SELECT id, squad_virtual_account_number, squad_customer_id FROM cooperatives WHERE registration_number = %s ORDER BY created_at DESC LIMIT 1",
                [registration_number],
            )
            coop_row = cur.fetchone()

    contribution_result = None
    webhook_charge_result = None
    webhook_ignore_result = None
    withdrawal_lookup_result = None
    withdrawal_requery_result = None

    if member_row and coop_row:
        member_id = member_row[0]
        cooperative_id = coop_row[0]
        member_token = _token(member_id, "MEMBER")
        contrib_code = f"""
import json, os, sys, django
sys.path.insert(0, r"{ROOT}")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client
client = Client(HTTP_AUTHORIZATION="Bearer {member_token}")
va_response = client.post("/api/contributions/virtual-account/", data=json.dumps({{
    "cooperative_id": "{cooperative_id}",
    "bvn": "{TEST_BVN}",
    "dob": "10/09/2007",
    "address": "22a adebayo farogbe street new town ikorodu lagos state",
    "gender": "2",
    "phone_number": "{phone}",
    "email": "{email}"
}}), content_type="application/json")
print(json.dumps({{"status": va_response.status_code, "body": json.loads(va_response.content.decode())}}))
"""
        contribution_result = _run_python(
            contrib_code,
            ROOT / "contribution-service",
            {"DJANGO_SETTINGS_MODULE": "config.settings"},
        )

        with _db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT virtual_account_number, customer_identifier
                    FROM contribution_virtual_accounts
                    WHERE member_id = %s AND cooperative_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    [member_id, cooperative_id],
                )
                va_row = cur.fetchone()

        if va_row:
            va_number, customer_identifier = va_row
            webhook_charge_code = f"""
import json, os, sys, django
sys.path.insert(0, r"{ROOT}")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client
client = Client()
response = client.post("/api/webhooks/squad/", data=json.dumps({{
    "Event": "charge_successful",
    "TransactionRef": "WEB-{run_id}",
    "Body": {{
        "transaction_reference": "WEB-{run_id}",
        "virtual_account_number": "{va_number}",
        "principal_amount": "70.00",
        "settled_amount": "70.00",
        "currency": "NGN",
        "customer_identifier": "{customer_identifier}",
        "amount": 7000,
        "transaction_type": "Transfer"
    }}
}}), content_type="application/json")
print(json.dumps({{"status": response.status_code, "body": json.loads(response.content.decode())}}))
"""
            webhook_charge_result = _run_python(
                webhook_charge_code,
                ROOT / "contribution-service",
                {"DJANGO_SETTINGS_MODULE": "config.settings"},
            )

        webhook_ignore_code = f"""
import json, os, sys, django
sys.path.insert(0, r"{ROOT}")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client
client = Client()
response = client.post("/api/webhooks/squad/", data=json.dumps({{
    "Event": "transfer.failed",
    "Body": {{"transaction_reference": "WEB-IGNORE-{run_id}"}}
}}), content_type="application/json")
print(json.dumps({{"status": response.status_code, "body": json.loads(response.content.decode())}}))
"""
        webhook_ignore_result = _run_python(
            webhook_ignore_code,
            ROOT / "contribution-service",
            {"DJANGO_SETTINGS_MODULE": "config.settings"},
        )

        treasurer_token = _token(f"treasurer-{run_id}", "TREASURER")
        withdrawal_lookup_code = f"""
import json, os, sys, django
sys.path.insert(0, r"{ROOT}")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client
client = Client(HTTP_AUTHORIZATION="Bearer {treasurer_token}")
response = client.post("/api/withdrawals/lookup/", data=json.dumps({{
    "destination_bank_code": "000013",
    "destination_account": "0123456789"
}}), content_type="application/json")
print(json.dumps({{"status": response.status_code, "body": json.loads(response.content.decode())}}))
"""
        withdrawal_lookup_result = _run_python(
            withdrawal_lookup_code,
            ROOT / "withdrawal-service",
            {"DJANGO_SETTINGS_MODULE": "config.settings"},
        )

        requery_id = str(uuid.uuid4())
        with _db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO withdrawal_requests (
                        id, cooperative_id, requested_by, amount_kobo, destination_account,
                        destination_bank_code, destination_account_name, purpose, ai_risk_score, status, squad_transfer_ref
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    [
                        requery_id,
                        cooperative_id,
                        f"treasurer-{run_id}",
                        20000,
                        "0123456789",
                        "000013",
                        "Sandbox Recipient",
                        "Neon requery test",
                        0.1,
                        "APPROVED",
                        f"VF-REQ-{run_id}",
                    ],
                )

        withdrawal_requery_code = f"""
import json, os, sys, django
sys.path.insert(0, r"{ROOT}")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client
client = Client(HTTP_AUTHORIZATION="Bearer {treasurer_token}")
response = client.post("/api/withdrawals/{requery_id}/requery/", data=json.dumps({{}}), content_type="application/json")
print(json.dumps({{"status": response.status_code, "body": json.loads(response.content.decode())}}))
"""
        withdrawal_requery_result = _run_python(
            withdrawal_requery_code,
            ROOT / "withdrawal-service",
            {"DJANGO_SETTINGS_MODULE": "config.settings"},
        )

    print(
        json.dumps(
            {
                "db_url": DB_URL,
                "member_route": member_result,
                "cooperative_route": coop_result,
                "member_db_row": list(member_row) if member_row else None,
                "cooperative_db_row": list(coop_row) if coop_row else None,
                "contribution_virtual_account_route": contribution_result,
                "webhook_charge_route": webhook_charge_result,
                "webhook_ignore_route": webhook_ignore_result,
                "withdrawal_lookup_route": withdrawal_lookup_result,
                "withdrawal_requery_route": withdrawal_requery_result,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
