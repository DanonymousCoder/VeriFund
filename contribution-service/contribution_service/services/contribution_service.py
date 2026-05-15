import os
import re
import uuid
import json
from datetime import datetime, timezone

import httpx

from shared.db import atomic, execute, fetch_all, fetch_one
from shared.squad.client import (
    create_direct_debit_mandate,
    create_virtual_account,
    debit_mandate,
    get_mandate_by_reference,
    simulate_virtual_account_payment,
)


AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8005").rstrip("/")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8006").rstrip("/")
_SCHEMA_READY = False


def ensure_contribution_schema() -> None:
    global _SCHEMA_READY
    if _SCHEMA_READY:
        return
    execute(
        """
        CREATE TABLE IF NOT EXISTS direct_debit_mandates (
            id VARCHAR(36) PRIMARY KEY,
            member_id VARCHAR(36) NOT NULL,
            cooperative_id VARCHAR(36) NOT NULL,
            squad_mandate_id VARCHAR(128) UNIQUE NOT NULL,
            merchant_reference VARCHAR(128) UNIQUE NOT NULL,
            account_number VARCHAR(32) NOT NULL,
            bank_code VARCHAR(16) NOT NULL,
            customer_email VARCHAR(255),
            description TEXT,
            amount_kobo BIGINT NOT NULL,
            debit_day INT NOT NULL DEFAULT 1,
            frequency VARCHAR(32) NOT NULL DEFAULT 'monthly',
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            is_approved BOOLEAN NOT NULL DEFAULT FALSE,
            ready_to_debit BOOLEAN NOT NULL DEFAULT FALSE,
            start_date TIMESTAMPTZ NULL,
            end_date TIMESTAMPTZ NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    execute(
        """
        CREATE TABLE IF NOT EXISTS contribution_virtual_accounts (
            id VARCHAR(36) PRIMARY KEY,
            member_id VARCHAR(36) NOT NULL,
            cooperative_id VARCHAR(36) NOT NULL,
            customer_identifier VARCHAR(128) UNIQUE NOT NULL,
            virtual_account_number VARCHAR(32) UNIQUE NOT NULL,
            account_name VARCHAR(255),
            bank_name VARCHAR(255),
            bvn_last4 VARCHAR(4),
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    execute(
        """
        CREATE TABLE IF NOT EXISTS contributions (
            id VARCHAR(36) PRIMARY KEY,
            member_id VARCHAR(36) NOT NULL,
            cooperative_id VARCHAR(36) NOT NULL,
            amount_kobo BIGINT NOT NULL,
            squad_transaction_ref VARCHAR(128) UNIQUE NOT NULL,
            mandate_id VARCHAR(36),
            contribution_virtual_account_id VARCHAR(36),
            payment_channel VARCHAR(32) NOT NULL DEFAULT 'virtual-account',
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
            anomaly_score DECIMAL(4, 3),
            contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    execute(
        """
        CREATE TABLE IF NOT EXISTS squad_webhook_events (
            id VARCHAR(36) PRIMARY KEY,
            event_name VARCHAR(64) NOT NULL,
            transaction_reference VARCHAR(128),
            signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
            processing_status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
            payload_json TEXT NOT NULL,
            error_detail TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            processed_at TIMESTAMPTZ NULL
        )
        """
    )
    _SCHEMA_READY = True


def _serialize_contribution(row: dict) -> dict:
    return {
        "id": row["id"],
        "member_id": row["member_id"],
        "cooperative_id": row["cooperative_id"],
        "amount_kobo": int(row["amount_kobo"]),
        "squad_transaction_ref": row["squad_transaction_ref"],
        "mandate_id": row.get("mandate_id"),
        "contribution_virtual_account_id": row.get("contribution_virtual_account_id"),
        "payment_channel": row.get("payment_channel", "virtual-account"),
        "status": row["status"],
        "anomaly_score": float(row["anomaly_score"]) if row.get("anomaly_score") is not None else None,
        "contributed_at": row["contributed_at"],
    }


def _serialize_virtual_account(row: dict) -> dict:
    return {
        "id": row["id"],
        "member_id": row["member_id"],
        "cooperative_id": row["cooperative_id"],
        "customer_identifier": row["customer_identifier"],
        "virtual_account_number": row["virtual_account_number"],
        "account_name": row.get("account_name"),
        "bank_name": row.get("bank_name"),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _extract_payload_body(webhook_data: dict) -> dict:
    return webhook_data.get("Body") or webhook_data.get("data") or webhook_data


def _extract_event_name(webhook_data: dict) -> str:
    return (webhook_data.get("Event") or webhook_data.get("event") or "").lower()


def _extract_transaction_reference(webhook_data: dict) -> str | None:
    body = _extract_payload_body(webhook_data)
    return (
        body.get("transaction_ref")
        or body.get("transaction_reference")
        or body.get("reference")
        or webhook_data.get("TransactionRef")
    )


def _extract_mandate_lookup(webhook_data: dict) -> str | None:
    data = _extract_payload_body(webhook_data)
    metadata = data.get("metadata") or data.get("meta") or {}
    return (
        data.get("mandate_id")
        or data.get("mandateId")
        or metadata.get("mandate_id")
        or metadata.get("mandateId")
    )


def log_webhook_event(
    webhook_data: dict,
    *,
    signature_valid: bool,
    processing_status: str,
    error_detail: str | None = None,
) -> None:
    ensure_contribution_schema()
    execute(
        """
        INSERT INTO squad_webhook_events (
            id,
            event_name,
            transaction_reference,
            signature_valid,
            processing_status,
            payload_json,
            error_detail,
            processed_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """,
        [
            str(uuid.uuid4()),
            _extract_event_name(webhook_data) or "unknown",
            _extract_transaction_reference(webhook_data),
            signature_valid,
            processing_status,
            json.dumps(webhook_data),
            error_detail,
        ],
    )


def _score_transaction(payload: dict) -> float:
    try:
        response = httpx.post(f"{AI_SERVICE_URL}/api/ai/score-transaction/", json=payload, timeout=10)
        response.raise_for_status()
        return float(response.json().get("anomaly_score", 0.0))
    except Exception:
        amount = int(payload.get("amount_kobo", 0))
        baseline = max(float(payload.get("rolling_90d_mean", 0) or 0), 1)
        return round(min(amount / (baseline * 4), 1.0), 3)


def _send_receipt(member_id: str, cooperative_id: str, amount_kobo: int, transaction_ref: str, status: str) -> None:
    member = fetch_one("SELECT phone_number FROM members WHERE id = %s", [member_id])
    cooperative = fetch_one("SELECT name FROM cooperatives WHERE id = %s", [cooperative_id])
    if not member or not cooperative:
        return

    amount_naira = amount_kobo / 100
    message = (
        f"VeriFund: Your contribution of N{amount_naira:,.2f} to {cooperative['name']} "
        f"is {status.lower()}. Ref: {transaction_ref}."
    )
    try:
        httpx.post(
            f"{NOTIFICATION_SERVICE_URL}/api/notify/sms/",
            json={"phone_number": member["phone_number"], "message": message},
            timeout=5,
        )
    except Exception:
        return


def _build_customer_identifier(member_id: str, cooperative_id: str) -> str:
    member_slug = re.sub(r"[^A-Z0-9]", "", member_id.upper())[:8]
    cooperative_slug = re.sub(r"[^A-Z0-9]", "", cooperative_id.upper())[:8]
    return f"VF-{cooperative_slug or 'COOP'}-{member_slug or 'MEMBER'}"


def create_member_virtual_account(member_id: str, data: dict) -> dict:
    ensure_contribution_schema()
    member = fetch_one(
        """
        SELECT id, first_name, last_name, phone_number, email, bvn_verified
        FROM members
        WHERE id = %s
        """,
        [member_id],
    )
    if not member:
        return {"error": "Member not found."}

    cooperative = fetch_one(
        """
        SELECT id, name, squad_virtual_account_number, squad_customer_id
        FROM cooperatives
        WHERE id = %s
        """,
        [data["cooperative_id"]],
    )
    if not cooperative:
        return {"error": "Cooperative not found."}

    existing = fetch_one(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            customer_identifier,
            virtual_account_number,
            account_name,
            bank_name,
            status,
            created_at,
            updated_at
        FROM contribution_virtual_accounts
        WHERE member_id = %s AND cooperative_id = %s
        """,
        [member_id, data["cooperative_id"]],
    )
    if existing:
        return {
            "virtual_account": _serialize_virtual_account(existing),
            "cooperative": cooperative,
            "instructions": {
                "payment_channel": "bank-transfer",
                "message": "Transfer contributions into this dedicated Squad virtual account.",
            },
        }

    customer_identifier = _build_customer_identifier(member_id, data["cooperative_id"])
    squad_result = create_virtual_account(
        customer_identifier=customer_identifier,
        bvn=data["bvn"],
        first_name=member["first_name"],
        last_name=member["last_name"],
        phone_number=data.get("phone_number") or member["phone_number"],
        email=data.get("email") or member.get("email"),
        address=data["address"],
        date_of_birth=data["dob"],
        gender=data["gender"],
    )
    if not squad_result.get("success"):
        return {"error": squad_result.get("message", "Failed to create Squad contribution virtual account.")}

    account_data = squad_result.get("data", {})
    virtual_account_number = (
        account_data.get("virtual_account_number")
        or account_data.get("account_number")
        or account_data.get("virtualAccountNumber")
    )
    if not virtual_account_number:
        return {"error": "Squad did not return a virtual account number."}

    record_id = str(uuid.uuid4())
    with atomic():
        fetch_one(
            """
            UPDATE members
            SET bvn_verified = TRUE, bvn_verified_at = COALESCE(bvn_verified_at, NOW())
            WHERE id = %s
            RETURNING id
            """,
            [member_id],
        )
        fetch_one(
            """
            INSERT INTO contribution_virtual_accounts (
                id,
                member_id,
                cooperative_id,
                customer_identifier,
                virtual_account_number,
                account_name,
                bank_name,
                bvn_last4,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            [
                record_id,
                member_id,
                data["cooperative_id"],
                customer_identifier,
                virtual_account_number,
                account_data.get("account_name") or f"{member['first_name']} {member['last_name']}",
                account_data.get("bank") or account_data.get("bank_name") or "GTBank",
                data["bvn"][-4:],
                "active",
            ],
        )

    created = fetch_one(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            customer_identifier,
            virtual_account_number,
            account_name,
            bank_name,
            status,
            created_at,
            updated_at
        FROM contribution_virtual_accounts
        WHERE id = %s
        """,
        [record_id],
    )
    return {
        "virtual_account": _serialize_virtual_account(created),
        "cooperative": cooperative,
        "instructions": {
            "payment_channel": "bank-transfer",
            "message": "Transfer contributions into this dedicated Squad virtual account.",
            "webhook_expected": True,
        },
    }


def get_member_virtual_accounts(member_id: str) -> list[dict]:
    ensure_contribution_schema()
    rows = fetch_all(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            customer_identifier,
            virtual_account_number,
            account_name,
            bank_name,
            status,
            created_at,
            updated_at
        FROM contribution_virtual_accounts
        WHERE member_id = %s
        ORDER BY created_at DESC
        """,
        [member_id],
    )
    return [_serialize_virtual_account(row) for row in rows]


def simulate_member_virtual_account_payment(member_id: str, data: dict) -> dict:
    ensure_contribution_schema()
    virtual_account = fetch_one(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            customer_identifier,
            virtual_account_number,
            account_name,
            bank_name,
            status,
            created_at,
            updated_at
        FROM contribution_virtual_accounts
        WHERE member_id = %s AND cooperative_id = %s
        """,
        [member_id, data["cooperative_id"]],
    )
    if not virtual_account:
        return {"error": "Create a dedicated contribution virtual account before simulating payment."}

    squad_result = simulate_virtual_account_payment(
        amount_kobo=data["amount_kobo"],
        virtual_account_number=virtual_account["virtual_account_number"],
        customer_identifier=virtual_account["customer_identifier"],
    )
    if not squad_result.get("success"):
        return {"error": squad_result.get("message", "Squad sandbox simulation failed.")}

    if not os.getenv("SQUAD_SECRET_KEY"):
        synthetic_webhook = {
            "Event": "charge_successful",
            "TransactionRef": squad_result.get("data", {}).get("transaction_reference"),
            "Body": {
                "transaction_reference": squad_result.get("data", {}).get("transaction_reference"),
                "virtual_account_number": virtual_account["virtual_account_number"],
                "principal_amount": f"{data['amount_kobo'] / 100:.2f}",
                "settled_amount": f"{data['amount_kobo'] / 100:.2f}",
                "currency": "NGN",
                "customer_identifier": virtual_account["customer_identifier"],
                "amount": data["amount_kobo"],
                "transaction_type": "Transfer",
            },
        }
        contribution = record_contribution(synthetic_webhook)
        squad_result["recorded_contribution"] = contribution

    return squad_result


def create_mandate(member_id: str, cooperative_id: str, data: dict) -> dict:
    ensure_contribution_schema()
    member = fetch_one(
        """
        SELECT id, first_name, last_name, phone_number, email
        FROM members
        WHERE id = %s
        """,
        [member_id],
    )
    if not member:
        return {"error": "Member not found."}
    cooperative = fetch_one("SELECT id, name FROM cooperatives WHERE id = %s", [cooperative_id])
    if not cooperative:
        return {"error": "Cooperative not found."}

    transaction_reference = f"VFMANDATE-{uuid.uuid4().hex[:20].upper()}"
    start_date = data.get("start_date") or datetime.now(timezone.utc).date()
    end_date = data.get("end_date") or start_date.replace(year=start_date.year + 1)
    squad_result = create_direct_debit_mandate(
        amount_kobo=data["amount_kobo"],
        account_number=data["account_number"],
        bank_code=data["bank_code"],
        description=data.get("description") or f"{cooperative['name']} contribution mandate",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        customer_email=data.get("customer_email") or member.get("email") or "member@verifund.local",
        transaction_reference=transaction_reference,
        bvn=data["bvn"],
        first_name=member["first_name"],
        last_name=member["last_name"],
        address=data["address"],
        phone_number=member["phone_number"],
    )
    if not squad_result.get("success"):
        return {"error": squad_result.get("message", "Failed to create direct debit mandate.")}

    mandate_data = squad_result.get("data", {})
    mandate_id = mandate_data.get("mandate_id") or mandate_data.get("id") or f"mandate-{uuid.uuid4().hex[:12]}"
    local_id = str(uuid.uuid4())
    with atomic():
        fetch_one(
            """
            UPDATE members
            SET bvn_verified = TRUE, bvn_verified_at = COALESCE(bvn_verified_at, NOW())
            WHERE id = %s
            RETURNING id
            """,
            [member_id],
        )
        fetch_one(
            """
            INSERT INTO direct_debit_mandates (
                id,
                member_id,
                cooperative_id,
                squad_mandate_id,
                merchant_reference,
                account_number,
                bank_code,
                customer_email,
                description,
                amount_kobo,
                debit_day,
                frequency,
                status,
                is_approved,
                ready_to_debit,
                start_date,
                end_date,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            [
                local_id,
                member_id,
                cooperative_id,
                mandate_id,
                transaction_reference,
                data["account_number"],
                data["bank_code"],
                data.get("customer_email") or member.get("email"),
                data.get("description") or f"{cooperative['name']} contribution mandate",
                data["amount_kobo"],
                data["debit_day"],
                "monthly",
                mandate_data.get("status", "pending"),
                bool(mandate_data.get("approved") or mandate_data.get("is_approved")),
                bool(mandate_data.get("ready_to_debit")),
                datetime.fromisoformat(start_date.isoformat()),
                datetime.fromisoformat(end_date.isoformat()),
                True,
            ],
        )
    return {
        "message": "Direct debit mandate created successfully.",
        "mandate_id": mandate_id,
        "merchant_reference": transaction_reference,
        "status": mandate_data.get("status", "pending"),
        "ready_to_debit": bool(mandate_data.get("ready_to_debit")),
    }


def sync_mandate_status(reference: str) -> dict:
    ensure_contribution_schema()
    local = fetch_one(
        """
        SELECT id, squad_mandate_id, merchant_reference
        FROM direct_debit_mandates
        WHERE merchant_reference = %s
        """,
        [reference],
    )
    if not local:
        return {"error": "Mandate reference not found."}

    result = get_mandate_by_reference(reference)
    if not result.get("success"):
        return {"error": result.get("message", "Failed to fetch mandate status from Squad.")}

    payload = result.get("data", {})
    if isinstance(payload, list):
        payload = payload[0] if payload else {}

    updated = fetch_one(
        """
        UPDATE direct_debit_mandates
        SET
            status = %s,
            ready_to_debit = %s,
            is_approved = %s
        WHERE merchant_reference = %s
        RETURNING
            id,
            squad_mandate_id,
            merchant_reference,
            status,
            ready_to_debit,
            is_approved
        """,
        [
            payload.get("status", "pending"),
            bool(payload.get("ready_to_debit")),
            bool(payload.get("is_approved") or payload.get("approved")),
            reference,
        ],
    )
    return {"mandate": updated, "provider_result": result}


def debit_existing_mandate(member_id: str, data: dict) -> dict:
    ensure_contribution_schema()
    mandate = fetch_one(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            squad_mandate_id,
            merchant_reference,
            customer_email,
            status,
            ready_to_debit,
            is_active
        FROM direct_debit_mandates
        WHERE squad_mandate_id = %s
        """,
        [data["mandate_id"]],
    )
    if not mandate:
        return {"error": "Mandate not found."}
    if mandate["member_id"] != member_id:
        return {"error": "You can only debit your own mandate."}
    if not mandate.get("is_active"):
        return {"error": "Mandate is no longer active."}

    transaction_reference = f"VFDEBIT-{uuid.uuid4().hex[:20].upper()}"
    result = debit_mandate(
        amount_kobo=data["amount_kobo"],
        mandate_id=data["mandate_id"],
        transaction_reference=transaction_reference,
        narration=data["narration"],
        customer_email=data.get("customer_email") or mandate.get("customer_email") or "member@verifund.local",
        pass_charge=bool(data.get("pass_charge")),
    )
    if not result.get("success"):
        return {"error": result.get("message", "Failed to debit mandate.")}

    return {
        "mandate_id": data["mandate_id"],
        "transaction_reference": transaction_reference,
        "provider_result": result,
    }


def record_contribution(webhook_data: dict) -> dict:
    ensure_contribution_schema()
    body = _extract_payload_body(webhook_data)
    transaction_ref = _extract_transaction_reference(webhook_data)
    if not transaction_ref:
        return {"error": "Webhook payload is missing a transaction reference."}

    existing = fetch_one(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            amount_kobo,
            squad_transaction_ref,
            mandate_id,
            contribution_virtual_account_id,
            payment_channel,
            status,
            anomaly_score,
            contributed_at
        FROM contributions
        WHERE squad_transaction_ref = %s
        """,
        [transaction_ref],
    )
    if existing:
        return _serialize_contribution(existing)

    amount_kobo = int(body.get("amount") or 0)
    if not amount_kobo:
        principal_amount = body.get("principal_amount") or body.get("settled_amount")
        if principal_amount is not None:
            amount_kobo = int(round(float(principal_amount) * 100))

    mandate_lookup = _extract_mandate_lookup(webhook_data)
    mandate = None
    if mandate_lookup:
        mandate = fetch_one(
            """
            SELECT id, member_id, cooperative_id, squad_mandate_id
            FROM direct_debit_mandates
            WHERE squad_mandate_id = %s
            """,
            [mandate_lookup],
        )

    customer_identifier = body.get("customer_identifier")
    virtual_account = None
    if customer_identifier:
        virtual_account = fetch_one(
            """
            SELECT
                id,
                member_id,
                cooperative_id,
                customer_identifier,
                virtual_account_number,
                account_name,
                bank_name,
                status,
                created_at,
                updated_at
            FROM contribution_virtual_accounts
            WHERE customer_identifier = %s
            """,
            [customer_identifier],
        )

    member_id = (
        (body.get("metadata") or {}).get("member_id")
        or (body.get("meta") or {}).get("member_id")
        or (mandate["member_id"] if mandate else None)
        or (virtual_account["member_id"] if virtual_account else None)
    )
    cooperative_id = (
        (body.get("metadata") or {}).get("cooperative_id")
        or (body.get("meta") or {}).get("cooperative_id")
        or (mandate["cooperative_id"] if mandate else None)
        or (virtual_account["cooperative_id"] if virtual_account else None)
    )
    if not member_id or not cooperative_id:
        return {"error": "Unable to resolve the member and cooperative for this contribution."}

    history = fetch_one(
        """
        SELECT
            COUNT(*) AS total_transactions,
            COALESCE(AVG(amount_kobo), 0) AS rolling_90d_mean,
            MAX(contributed_at) AS last_contributed_at,
            COALESCE(AVG(CASE WHEN status = 'FLAGGED' THEN 1 ELSE 0 END), 0) AS flagged_ratio
        FROM contributions
        WHERE member_id = %s
          AND cooperative_id = %s
          AND contributed_at >= NOW() - INTERVAL '90 days'
        """,
        [member_id, cooperative_id],
    ) or {}

    last_contributed_at = history.get("last_contributed_at")
    if last_contributed_at:
        delta = datetime.now(timezone.utc) - last_contributed_at
        days_since_last = max(delta.days, 0)
    else:
        days_since_last = 30

    anomaly_score = _score_transaction(
        {
            "member_id": member_id,
            "cooperative_id": cooperative_id,
            "amount_kobo": amount_kobo,
            "rolling_90d_mean": float(history.get("rolling_90d_mean", 0) or 0),
            "days_since_last_contribution": days_since_last,
            "member_transaction_count": int(history.get("total_transactions", 0) or 0),
            "cooperative_flagged_rate": float(history.get("flagged_ratio", 0) or 0),
        }
    )
    status = "FLAGGED" if anomaly_score > 0.7 else "CONFIRMED"
    payment_channel = "direct-debit" if mandate else "virtual-account"

    with atomic():
        contribution = fetch_one(
            """
            INSERT INTO contributions (
                id,
                member_id,
                cooperative_id,
                amount_kobo,
                squad_transaction_ref,
                mandate_id,
                contribution_virtual_account_id,
                payment_channel,
                status,
                anomaly_score
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING
                id,
                member_id,
                cooperative_id,
                amount_kobo,
                squad_transaction_ref,
                mandate_id,
                contribution_virtual_account_id,
                payment_channel,
                status,
                anomaly_score,
                contributed_at
            """,
            [
                str(uuid.uuid4()),
                member_id,
                cooperative_id,
                amount_kobo,
                transaction_ref,
                mandate["id"] if mandate else None,
                virtual_account["id"] if virtual_account else None,
                payment_channel,
                status,
                anomaly_score,
            ],
        )

    _send_receipt(member_id, cooperative_id, amount_kobo, transaction_ref, status)
    return _serialize_contribution(contribution)


def list_webhook_events(limit: int = 50) -> list[dict]:
    ensure_contribution_schema()
    return fetch_all(
        """
        SELECT
            id,
            event_name,
            transaction_reference,
            signature_valid,
            processing_status,
            error_detail,
            created_at,
            processed_at
        FROM squad_webhook_events
        ORDER BY created_at DESC
        LIMIT %s
        """,
        [limit],
    )


def get_member_contributions(member_id: str) -> list[dict]:
    ensure_contribution_schema()
    rows = fetch_all(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            amount_kobo,
            squad_transaction_ref,
            mandate_id,
            contribution_virtual_account_id,
            payment_channel,
            status,
            anomaly_score,
            contributed_at
        FROM contributions
        WHERE member_id = %s
        ORDER BY contributed_at DESC
        """,
        [member_id],
    )
    return [_serialize_contribution(row) for row in rows]


def get_cooperative_contribution_audit(cooperative_id: str) -> dict:
    ensure_contribution_schema()
    cooperative = fetch_one(
        """
        SELECT id, name, registration_number, squad_virtual_account_number, squad_customer_id
        FROM cooperatives
        WHERE id = %s
        """,
        [cooperative_id],
    )
    if not cooperative:
        return {"error": "Cooperative not found."}

    totals = fetch_one(
        """
        SELECT
            COUNT(*) AS total_contributions,
            COALESCE(SUM(amount_kobo), 0) AS total_amount_kobo,
            COALESCE(AVG(amount_kobo), 0) AS average_amount_kobo,
            COUNT(*) FILTER (WHERE status = 'FLAGGED') AS flagged_count
        FROM contributions
        WHERE cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}
    recent = fetch_all(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            amount_kobo,
            squad_transaction_ref,
            mandate_id,
            contribution_virtual_account_id,
            payment_channel,
            status,
            anomaly_score,
            contributed_at
        FROM contributions
        WHERE cooperative_id = %s
        ORDER BY contributed_at DESC
        LIMIT 20
        """,
        [cooperative_id],
    )
    virtual_accounts = fetch_all(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            customer_identifier,
            virtual_account_number,
            account_name,
            bank_name,
            status,
            created_at,
            updated_at
        FROM contribution_virtual_accounts
        WHERE cooperative_id = %s
        ORDER BY created_at DESC
        LIMIT 20
        """,
        [cooperative_id],
    )
    mandates = fetch_all(
        """
        SELECT
            id,
            member_id,
            cooperative_id,
            squad_mandate_id,
            merchant_reference,
            amount_kobo,
            status,
            ready_to_debit,
            is_approved,
            created_at
        FROM direct_debit_mandates
        WHERE cooperative_id = %s
        ORDER BY created_at DESC
        LIMIT 20
        """,
        [cooperative_id],
    )

    return {
        "cooperative": cooperative,
        "summary": {
            "total_contributions": int(totals.get("total_contributions", 0) or 0),
            "total_amount_kobo": int(totals.get("total_amount_kobo", 0) or 0),
            "average_amount_kobo": int(float(totals.get("average_amount_kobo", 0) or 0)),
            "flagged_count": int(totals.get("flagged_count", 0) or 0),
            "contribution_virtual_accounts": len(virtual_accounts),
            "direct_debit_mandates": len(mandates),
        },
        "recent_contributions": [_serialize_contribution(row) for row in recent],
        "virtual_accounts": [_serialize_virtual_account(row) for row in virtual_accounts],
        "mandates": mandates,
    }
