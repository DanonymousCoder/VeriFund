import re

from shared.db import fetch_one


KEYWORDS = {
    "withdrew",
    "withdrawal",
    "missing",
    "transferred",
    "disappeared",
    "ghost",
    "fake",
    "loan",
    "alert",
}


def triage_report(report_text: str, reporter_cooperative_id: str) -> dict:
    lowered = report_text.lower()
    keyword_hits = sorted({keyword for keyword in KEYWORDS if keyword in lowered})
    amount_mentions = re.findall(r"\b\d[\d,]*\b", report_text)

    corroboration = 0.15 + min(len(keyword_hits) * 0.09, 0.36) + min(len(amount_mentions) * 0.05, 0.1)
    evidence_bits = []

    if reporter_cooperative_id:
        stats = fetch_one(
            """
            SELECT
                COUNT(*) FILTER (WHERE status = 'FLAGGED') AS flagged_contributions,
                COUNT(*) FILTER (WHERE COALESCE(ai_risk_score, 0) > 0.7) AS risky_withdrawals
            FROM (
                SELECT status, anomaly_score AS ai_risk_score, cooperative_id
                FROM contributions
                UNION ALL
                SELECT status, ai_risk_score, cooperative_id
                FROM withdrawal_requests
            ) events
            WHERE cooperative_id = %s
            """,
            [reporter_cooperative_id],
        ) or {}
        flagged_contributions = int(stats.get("flagged_contributions", 0) or 0)
        risky_withdrawals = int(stats.get("risky_withdrawals", 0) or 0)
        corroboration += min((flagged_contributions * 0.04) + (risky_withdrawals * 0.07), 0.3)
        evidence_bits.append(
            f"{flagged_contributions} flagged contributions and {risky_withdrawals} risky withdrawals already exist for this cooperative."
        )

    corroboration_score = round(min(corroboration, 0.98), 2)
    if keyword_hits:
        evidence_bits.append(f"Matched suspicious terms: {', '.join(keyword_hits[:5])}.")
    if amount_mentions:
        evidence_bits.append(f"Referenced amounts: {', '.join(amount_mentions[:3])}.")

    return {
        "intent": "suspected_fraud" if keyword_hits else "complaint",
        "corroboration_score": corroboration_score,
        "evidence_summary": " ".join(evidence_bits) or "Report captured for manual review.",
        "escalate": corroboration_score >= 0.6,
        "model": "rule_based_triage",
    }
