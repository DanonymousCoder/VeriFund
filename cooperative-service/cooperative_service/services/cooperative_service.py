import os
import re
import uuid

import httpx

from shared.db import atomic, fetch_one
from shared.squad.client import create_virtual_account


AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8005").rstrip("/")


def _serialize_cooperative(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "registration_number": row["registration_number"],
        "state": row["state"],
        "cooperative_type": row["cooperative_type"],
        "squad_virtual_account_number": row.get("squad_virtual_account_number"),
        "squad_customer_id": row.get("squad_customer_id"),
        "health_score": row["health_score"],
        "health_score_updated_at": row.get("health_score_updated_at"),
        "is_active": row["is_active"],
        "created_at": row.get("created_at"),
    }


def _build_customer_identifier(registration_number: str, state: str) -> str:
    slug = re.sub(r"[^A-Z0-9]", "", registration_number.upper())[:8]
    return f"COOP-{state[:3].upper()}-{slug or '000001'}"


def create_cooperative(data: dict) -> dict:
    existing = fetch_one(
        "SELECT id FROM cooperatives WHERE registration_number = %s",
        [data["registration_number"]],
    )
    if existing:
        return {"error": "A cooperative with this registration number already exists."}

    customer_identifier = _build_customer_identifier(data["registration_number"], data["state"])
    squad_result = create_virtual_account(
        customer_identifier=customer_identifier,
        bvn=data["treasurer_bvn"],
        first_name=data["name"],
        last_name="Cooperative",
        business_name=data["name"],
    )
    if not squad_result.get("success"):
        return {"error": squad_result.get("message", "Failed to create Squad virtual account.")}
    virtual_account_number = squad_result.get("data", {}).get("virtual_account_number")

    with atomic():
        cooperative_id = str(uuid.uuid4())
        cooperative = fetch_one(
            """
            INSERT INTO cooperatives (
                id,
                name,
                registration_number,
                state,
                cooperative_type,
                squad_virtual_account_number,
                squad_customer_id,
                health_score,
                health_score_updated_at,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
            RETURNING
                id,
                name,
                registration_number,
                state,
                cooperative_type,
                squad_virtual_account_number,
                squad_customer_id,
                health_score,
                health_score_updated_at,
                is_active,
                created_at
            """,
            [
                cooperative_id,
                data["name"],
                data["registration_number"],
                data["state"],
                data["cooperative_type"],
                virtual_account_number,
                customer_identifier,
                50,
                True,
            ],
        )

    return _serialize_cooperative(cooperative)


def get_cooperative(cooperative_id: str) -> dict | None:
    row = fetch_one(
        """
        SELECT
            id,
            name,
            registration_number,
            state,
            cooperative_type,
            squad_virtual_account_number,
            squad_customer_id,
            health_score,
            health_score_updated_at,
            is_active,
            created_at
        FROM cooperatives
        WHERE id = %s
        """,
        [cooperative_id],
    )
    if not row:
        return None
    return _serialize_cooperative(row)


def _build_local_breakdown(cooperative_id: str) -> dict:
    mandate_stats = fetch_one(
        """
        SELECT
            COUNT(*) AS total_mandates,
            COUNT(DISTINCT member_id) AS unique_members,
            COALESCE(AVG(CASE WHEN is_active THEN 1 ELSE 0 END), 0) AS active_ratio
        FROM direct_debit_mandates
        WHERE cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}
    contribution_stats = fetch_one(
        """
        SELECT
            COUNT(*) AS total_contributions,
            COALESCE(AVG(amount_kobo), 0) AS avg_amount,
            COALESCE(AVG(CASE WHEN status = 'FLAGGED' THEN 1 ELSE 0 END), 0) AS flagged_ratio
        FROM contributions
        WHERE cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}
    withdrawal_stats = fetch_one(
        """
        SELECT
            COUNT(*) AS total_withdrawals,
            COALESCE(AVG(CASE WHEN status = 'RELEASED' THEN 1 ELSE 0 END), 0) AS released_ratio,
            COALESCE(AVG(COALESCE(ai_risk_score, 0)), 0) AS avg_risk
        FROM withdrawal_requests
        WHERE cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}

    member_verification_rate = round(min(float(mandate_stats.get("active_ratio", 0)) * 100 + 25, 100))
    contribution_regularity = round(
        max(0, 100 - float(contribution_stats.get("flagged_ratio", 0)) * 70)
    )
    withdrawal_pattern = round(max(0, 100 - float(withdrawal_stats.get("avg_risk", 0)) * 100))
    transparency_index = round(
        min(
            100,
            35
            + min(int(contribution_stats.get("total_contributions", 0)), 30) * 2
            + float(withdrawal_stats.get("released_ratio", 0)) * 15,
        )
    )
    ai_risk_signal = round(float(withdrawal_stats.get("avg_risk", 0)) * 100)

    return {
        "member_verification_rate": member_verification_rate,
        "contribution_regularity": contribution_regularity,
        "withdrawal_pattern": withdrawal_pattern,
        "transparency_index": transparency_index,
        "ai_risk_signal": ai_risk_signal,
    }


def get_trust_score(cooperative_id: str) -> dict:
    cooperative = get_cooperative(cooperative_id)
    if not cooperative:
        return {"error": "Cooperative not found."}

    breakdown = _build_local_breakdown(cooperative_id)
    try:
        response = httpx.post(
            f"{AI_SERVICE_URL}/api/ai/score-cooperative/",
            json={"cooperative_id": cooperative_id, "breakdown": breakdown},
            timeout=10,
        )
        response.raise_for_status()
        ai_result = response.json()
        health_score = int(ai_result.get("health_score", cooperative["health_score"]))
        top_features = ai_result.get("top_features", [])
    except Exception:
        health_score = round(
            (
                breakdown["member_verification_rate"]
                + breakdown["contribution_regularity"]
                + breakdown["withdrawal_pattern"]
                + breakdown["transparency_index"]
                + (100 - breakdown["ai_risk_signal"])
            )
            / 5
        )
        top_features = []

    with atomic():
        fetch_one(
            """
            UPDATE cooperatives
            SET health_score = %s, health_score_updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            [health_score, cooperative_id],
        )

    badge = "VERIFIED" if health_score >= 80 else "UNDER_REVIEW" if health_score >= 50 else "HIGH_RISK"
    return {
        "cooperative_id": cooperative_id,
        "cooperative_name": cooperative["name"],
        "health_score": health_score,
        "breakdown": breakdown,
        "badge": badge,
        "top_features": top_features,
    }


def get_regulator_summary(cooperative_id: str) -> dict:
    cooperative = get_cooperative(cooperative_id)
    if not cooperative:
        return {"error": "Cooperative not found."}

    trust = get_trust_score(cooperative_id)
    contribution_summary = fetch_one(
        """
        SELECT
            COUNT(*) AS total_contributions,
            COALESCE(SUM(amount_kobo), 0) AS contribution_volume_kobo,
            COUNT(*) FILTER (WHERE status = 'FLAGGED') AS flagged_contributions
        FROM contributions
        WHERE cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}
    withdrawal_summary = fetch_one(
        """
        SELECT
            COUNT(*) AS total_withdrawals,
            COALESCE(SUM(amount_kobo), 0) AS withdrawal_volume_kobo,
            COUNT(*) FILTER (WHERE status = 'RELEASED') AS released_withdrawals,
            COUNT(*) FILTER (WHERE COALESCE(ai_risk_score, 0) > 0.7) AS high_risk_withdrawals
        FROM withdrawal_requests
        WHERE cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}
    signer_summary = fetch_one(
        """
        SELECT COUNT(*) AS total_signatures
        FROM withdrawal_signatures ws
        INNER JOIN withdrawal_requests wr ON wr.id = ws.withdrawal_request_id
        WHERE wr.cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}

    return {
        "cooperative": cooperative,
        "trust": trust,
        "controls": {
            "member_bvn_gate": True,
            "contribution_collection": "dedicated_virtual_accounts_plus_signed_webhooks",
            "withdrawal_control": "multi_signature_plus_ai_risk_screening",
        },
        "totals": {
            "total_contributions": int(contribution_summary.get("total_contributions", 0) or 0),
            "contribution_volume_kobo": int(contribution_summary.get("contribution_volume_kobo", 0) or 0),
            "flagged_contributions": int(contribution_summary.get("flagged_contributions", 0) or 0),
            "total_withdrawals": int(withdrawal_summary.get("total_withdrawals", 0) or 0),
            "withdrawal_volume_kobo": int(withdrawal_summary.get("withdrawal_volume_kobo", 0) or 0),
            "released_withdrawals": int(withdrawal_summary.get("released_withdrawals", 0) or 0),
            "high_risk_withdrawals": int(withdrawal_summary.get("high_risk_withdrawals", 0) or 0),
            "total_signatures": int(signer_summary.get("total_signatures", 0) or 0),
        },
    }
