import os
import uuid

import httpx

from shared.db import atomic, fetch_all, fetch_one
from shared.squad.client import initiate_transfer


AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8005").rstrip("/")
MIN_WITHDRAWAL_SIGNERS = int(os.getenv("MIN_WITHDRAWAL_SIGNERS", "3"))
AI_RISK_BLOCK_THRESHOLD = float(os.getenv("AI_RISK_BLOCK_THRESHOLD", "0.85"))


def _serialize_signature(row: dict) -> dict:
    return {
        "id": row["id"],
        "signed_by": row["signed_by"],
        "role": row["role"],
        "signed_at": row["signed_at"],
    }


def _serialize_withdrawal(row: dict, signatures: list[dict] | None = None) -> dict:
    return {
        "id": row["id"],
        "cooperative_id": row["cooperative_id"],
        "requested_by": row["requested_by"],
        "amount_kobo": int(row["amount_kobo"]),
        "destination_account": row["destination_account"],
        "destination_bank_code": row["destination_bank_code"],
        "purpose": row["purpose"],
        "ai_risk_score": float(row["ai_risk_score"]) if row.get("ai_risk_score") is not None else None,
        "status": row["status"],
        "squad_transfer_ref": row.get("squad_transfer_ref"),
        "created_at": row.get("created_at"),
        "signatures": signatures or [],
    }


def _fetch_signatures(withdrawal_id: str) -> list[dict]:
    rows = fetch_all(
        """
        SELECT id, signed_by, role, signed_at
        FROM withdrawal_signatures
        WHERE withdrawal_request_id = %s
        ORDER BY signed_at ASC
        """,
        [withdrawal_id],
    )
    return [_serialize_signature(row) for row in rows]


def _get_ai_risk(data: dict) -> float:
    try:
        response = httpx.post(
            f"{AI_SERVICE_URL}/api/ai/score-cooperative/",
            json={"cooperative_id": data["cooperative_id"], "withdrawal_context": data},
            timeout=10,
        )
        response.raise_for_status()
        return round(float(response.json().get("risk_score", 50)) / 100, 3)
    except Exception:
        amount = int(data["amount_kobo"])
        return round(min(amount / 100_000_000, 1.0), 3)


def request_withdrawal(member_id: str, role: str | None, data: dict) -> dict:
    if role not in {"TREASURER", "ADMIN"}:
        return {"error": "Only a treasurer or admin can initiate a withdrawal."}

    cooperative = fetch_one("SELECT id, name FROM cooperatives WHERE id = %s", [data["cooperative_id"]])
    if not cooperative:
        return {"error": "Cooperative not found."}

    ai_risk_score = _get_ai_risk(data)
    with atomic():
        withdrawal_id = str(uuid.uuid4())
        withdrawal = fetch_one(
            """
            INSERT INTO withdrawal_requests (
                id,
                cooperative_id,
                requested_by,
                amount_kobo,
                destination_account,
                destination_bank_code,
                purpose,
                ai_risk_score,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING
                id,
                cooperative_id,
                requested_by,
                amount_kobo,
                destination_account,
                destination_bank_code,
                purpose,
                ai_risk_score,
                status,
                squad_transfer_ref,
                created_at
            """,
            [
                withdrawal_id,
                data["cooperative_id"],
                member_id,
                data["amount_kobo"],
                data["destination_account"],
                data["destination_bank_code"],
                data["purpose"],
                ai_risk_score,
                "PARTIALLY_SIGNED",
            ],
        )
        fetch_one(
            """
            INSERT INTO withdrawal_signatures (id, withdrawal_request_id, signed_by, role)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            [str(uuid.uuid4()), withdrawal["id"], member_id, "TREASURER"],
        )

    signatures = _fetch_signatures(withdrawal["id"])
    return _serialize_withdrawal(withdrawal, signatures=signatures)


def sign_withdrawal(withdrawal_id: str, member_id: str, role: str, actor_role: str | None = None) -> dict:
    if actor_role and actor_role not in {role, "ADMIN"}:
        return {"error": "Authenticated role does not match the requested signer role."}
    if role == "TREASURER":
        return {"error": "Treasurer signature is captured at request time."}

    withdrawal = fetch_one(
        """
        SELECT
            id,
            cooperative_id,
            requested_by,
            amount_kobo,
            destination_account,
            destination_bank_code,
            purpose,
            ai_risk_score,
            status,
            squad_transfer_ref,
            created_at
        FROM withdrawal_requests
        WHERE id = %s
        """,
        [withdrawal_id],
    )
    if not withdrawal:
        return {"error": "Withdrawal request not found."}
    if withdrawal["status"] == "RELEASED":
        return {"error": "This withdrawal has already been released."}

    existing = fetch_one(
        """
        SELECT id
        FROM withdrawal_signatures
        WHERE withdrawal_request_id = %s AND (signed_by = %s OR role = %s)
        """,
        [withdrawal_id, member_id, role],
    )
    if existing:
        return {"error": "This signer or role has already been recorded for the withdrawal."}

    with atomic():
        fetch_one(
            """
            INSERT INTO withdrawal_signatures (id, withdrawal_request_id, signed_by, role)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            [str(uuid.uuid4()), withdrawal_id, member_id, role],
        )

    signatures = _fetch_signatures(withdrawal_id)
    if len(signatures) >= MIN_WITHDRAWAL_SIGNERS:
        with atomic():
            fetch_one(
                "UPDATE withdrawal_requests SET status = 'APPROVED' WHERE id = %s RETURNING id",
                [withdrawal_id],
            )
        return release_withdrawal(withdrawal_id)

    with atomic():
        fetch_one(
            "UPDATE withdrawal_requests SET status = 'PARTIALLY_SIGNED' WHERE id = %s RETURNING id",
            [withdrawal_id],
        )
    return {
        "withdrawal_id": withdrawal_id,
        "signatures_collected": len(signatures),
        "signatures_required": MIN_WITHDRAWAL_SIGNERS,
        "status": "PARTIALLY_SIGNED",
        "signatures": signatures,
    }


def release_withdrawal(withdrawal_id: str) -> dict:
    withdrawal = fetch_one(
        """
        SELECT
            id,
            cooperative_id,
            requested_by,
            amount_kobo,
            destination_account,
            destination_bank_code,
            purpose,
            ai_risk_score,
            status,
            squad_transfer_ref,
            created_at
        FROM withdrawal_requests
        WHERE id = %s
        """,
        [withdrawal_id],
    )
    if not withdrawal:
        return {"error": "Withdrawal request not found."}

    signatures = _fetch_signatures(withdrawal_id)
    if len(signatures) < MIN_WITHDRAWAL_SIGNERS:
        return {"error": "Withdrawal cannot be released before all required signatures are collected."}
    if float(withdrawal.get("ai_risk_score") or 0) > AI_RISK_BLOCK_THRESHOLD:
        return {"error": "AI risk score too high. Transfer blocked pending review."}

    squad_result = initiate_transfer(
        amount_kobo=int(withdrawal["amount_kobo"]),
        bank_code=withdrawal["destination_bank_code"],
        account_number=withdrawal["destination_account"],
        remark=withdrawal["purpose"],
        idempotency_key=withdrawal_id,
    )

    new_status = "RELEASED" if squad_result.get("success") else "APPROVED"
    squad_ref = squad_result.get("data", {}).get("transaction_ref")
    with atomic():
        updated = fetch_one(
            """
            UPDATE withdrawal_requests
            SET status = %s, squad_transfer_ref = %s
            WHERE id = %s
            RETURNING
                id,
                cooperative_id,
                requested_by,
                amount_kobo,
                destination_account,
                destination_bank_code,
                purpose,
                ai_risk_score,
                status,
                squad_transfer_ref,
                created_at
            """,
            [new_status, squad_ref, withdrawal_id],
        )

    return _serialize_withdrawal(updated, signatures=signatures)


def list_pending_withdrawals(cooperative_id: str | None) -> list[dict]:
    query = """
        SELECT
            id,
            cooperative_id,
            requested_by,
            amount_kobo,
            destination_account,
            destination_bank_code,
            purpose,
            ai_risk_score,
            status,
            squad_transfer_ref,
            created_at
        FROM withdrawal_requests
        WHERE status IN ('PENDING', 'PARTIALLY_SIGNED', 'APPROVED')
    """
    params: list[str] = []
    if cooperative_id:
        query += " AND cooperative_id = %s"
        params.append(cooperative_id)
    query += " ORDER BY created_at DESC"

    rows = fetch_all(query, params)
    results = []
    for row in rows:
        results.append(_serialize_withdrawal(row, signatures=_fetch_signatures(row["id"])))
    return results
