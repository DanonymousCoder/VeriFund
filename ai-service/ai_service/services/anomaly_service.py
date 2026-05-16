import requests
import logging

logger = logging.getLogger(__name__)

def score_transaction(transaction: dict) -> dict:
    amount = int(transaction.get("amount_kobo", 0) or 0)
    rolling_mean = float(transaction.get("rolling_90d_mean", 0) or 0)
    days_since_last = int(transaction.get("days_since_last_contribution", 30) or 30)
    member_transaction_count = int(transaction.get("member_transaction_count", 0) or 0)
    cooperative_flagged_rate = float(transaction.get("cooperative_flagged_rate", 0) or 0)

    amount_risk = 0.15 if rolling_mean <= 0 else min(amount / max(rolling_mean * 3.5, 1), 1.0)
    gap_risk = min(days_since_last / 45, 1.0)
    maturity_discount = 0.05 if member_transaction_count >= 6 else 0.0
    collective_risk = min(cooperative_flagged_rate * 1.5, 0.25)

    anomaly_score = round(
        max(0.0, min(1.0, amount_risk * 0.65 + gap_risk * 0.2 + collective_risk - maturity_discount)),
        3,
    )
    flagged = anomaly_score > 0.7

    # Real-time exchange rate for international risk context
    usd_value = 0
    try:
        # Fetching current NGN/USD rate
        rate_resp = requests.get("https://api.exchangerate-api.com/v4/latest/NGN", timeout=2)
        if rate_resp.status_code == 200:
            rate = rate_resp.json().get("rates", {}).get("USD", 0)
            usd_value = round((amount / 100) * rate, 2)
    except Exception as e:
        logger.warning(f"External exchange rate sync failed: {e}")

    if flagged:
        reason = f"Contribution of ~${usd_value} USD deviates materially from the member's recent pattern."
    elif amount_risk > 0.55:
        reason = f"Contribution of ~${usd_value} USD is larger than the recent cooperative baseline but still within tolerance."
    else:
        reason = f"Transaction (~${usd_value} USD) fits the recent contribution pattern."

    return {
        "anomaly_score": anomaly_score,
        "flagged": flagged,
        "reason": reason,
        "model": "verifund_anomaly_v2",
        "external_context": {
            "usd_equivalent": usd_value,
            "api_provider": "ExchangeRate-API"
        }
    }
