from shared.db import fetch_all, fetch_one


def _normalize(metric: float, divisor: float) -> float:
    return max(0.0, min(metric / divisor, 1.0))


def _build_features(cooperative_id: str) -> dict:
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
            COALESCE(AVG(amount_kobo), 0) AS avg_transaction_size,
            COALESCE(AVG(CASE WHEN status = 'FLAGGED' THEN 1 ELSE 0 END), 0) AS flagged_ratio,
            COALESCE(SUM(amount_kobo), 0) AS contribution_volume_90d
        FROM contributions
        WHERE cooperative_id = %s
          AND contributed_at >= NOW() - INTERVAL '90 days'
        """,
        [cooperative_id],
    ) or {}
    withdrawal_stats = fetch_one(
        """
        SELECT
            COUNT(*) AS total_withdrawals,
            COUNT(*) FILTER (
                WHERE amount_kobo > (
                    SELECT COALESCE(AVG(amount_kobo), 0) * 5
                    FROM contributions
                    WHERE cooperative_id = %s
                )
            ) AS num_large_withdrawals_30d,
            COALESCE(AVG(COALESCE(ai_risk_score, 0)), 0) AS avg_withdrawal_risk,
            COALESCE(SUM(CASE WHEN status = 'RELEASED' THEN amount_kobo ELSE 0 END), 0) AS withdrawal_volume_90d
        FROM withdrawal_requests
        WHERE cooperative_id = %s
          AND created_at >= NOW() - INTERVAL '90 days'
        """,
        [cooperative_id, cooperative_id],
    ) or {}
    member_verification = fetch_one(
        """
        SELECT
            COALESCE(AVG(CASE WHEN m.bvn_verified THEN 1 ELSE 0 END), 0) AS verification_rate
        FROM direct_debit_mandates d
        JOIN members m ON m.id = d.member_id
        WHERE d.cooperative_id = %s
        """,
        [cooperative_id],
    ) or {}

    total_contributions = int(contribution_stats.get("total_contributions", 0) or 0)
    unique_members = int(mandate_stats.get("unique_members", 0) or 0)
    contribution_regularity_score = min(100, int((total_contributions / max(unique_members, 1)) * 18))

    return {
        "contribution_regularity_score": contribution_regularity_score,
        "withdrawal_frequency": int(withdrawal_stats.get("total_withdrawals", 0) or 0),
        "member_churn_rate": round(1 - float(mandate_stats.get("active_ratio", 0) or 0), 3),
        "avg_transaction_size": float(contribution_stats.get("avg_transaction_size", 0) or 0),
        "num_large_withdrawals_30d": int(withdrawal_stats.get("num_large_withdrawals_30d", 0) or 0),
        "bvn_verification_rate": round(float(member_verification.get("verification_rate", 0) or 0), 3),
        "avg_withdrawal_risk": float(withdrawal_stats.get("avg_withdrawal_risk", 0) or 0),
        "flagged_ratio": float(contribution_stats.get("flagged_ratio", 0) or 0),
        "net_asset_trend_90d": float(contribution_stats.get("contribution_volume_90d", 0) or 0)
        - float(withdrawal_stats.get("withdrawal_volume_90d", 0) or 0),
    }


def score_cooperative(cooperative_id: str, features: dict | None = None) -> dict:
    feature_values = features or _build_features(cooperative_id)

    churn_risk = _normalize(float(feature_values.get("member_churn_rate", 0)), 0.5)
    flagged_risk = _normalize(float(feature_values.get("flagged_ratio", 0)), 0.25)
    withdrawal_risk = _normalize(float(feature_values.get("avg_withdrawal_risk", 0)), 1)
    large_withdrawal_risk = _normalize(float(feature_values.get("num_large_withdrawals_30d", 0)), 4)
    verification_benefit = 1 - _normalize(float(feature_values.get("bvn_verification_rate", 0)), 1)
    asset_pressure = 0.8 if float(feature_values.get("net_asset_trend_90d", 0)) < 0 else 0.15
    regularity_benefit = 1 - _normalize(float(feature_values.get("contribution_regularity_score", 0)), 100)

    raw_risk = (
        churn_risk * 0.18
        + flagged_risk * 0.22
        + withdrawal_risk * 0.2
        + large_withdrawal_risk * 0.12
        + verification_benefit * 0.14
        + asset_pressure * 0.08
        + regularity_benefit * 0.06
    )
    risk_score = max(1, min(round(raw_risk * 100), 99))
    health_score = 100 - risk_score

    contributions = [
        ("withdrawal_frequency", large_withdrawal_risk, "increases_risk"),
        ("member_churn_rate", churn_risk, "increases_risk"),
        ("bvn_verification_rate", verification_benefit, "decreases_risk"),
        ("flagged_contribution_rate", flagged_risk, "increases_risk"),
    ]
    top_features = [
        {"feature": name, "impact": round(impact, 3), "direction": direction}
        for name, impact, direction in sorted(contributions, key=lambda item: abs(item[1]), reverse=True)[:3]
    ]

    return {
        "cooperative_id": cooperative_id,
        "risk_score": risk_score,
        "health_score": health_score,
        "top_features": top_features,
        "feature_snapshot": feature_values,
        "model": "heuristic_xgboost_fallback",
    }


def score_all_cooperatives() -> dict[str, int]:
    cooperative_ids = fetch_all("SELECT id FROM cooperatives ORDER BY created_at ASC")
    return {row["id"]: score_cooperative(row["id"])["health_score"] for row in cooperative_ids}
