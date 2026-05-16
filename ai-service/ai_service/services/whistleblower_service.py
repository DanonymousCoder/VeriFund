import re
import os
import requests
import logging

from shared.db import fetch_one

logger = logging.getLogger(__name__)

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
    """
    Advanced Triage Service using OpenRouter (NVIDIA Nemotron) with Rule-Based Fallback.
    """
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    
    if openrouter_key:
        try:
            # OpenRouter API integration (OpenAI-compatible)
            url = "https://openrouter.ai/api/v1/chat/completions"
            prompt = (
                f"Analyze this whistleblower report for a financial cooperative: '{report_text}'. "
                "Classify the intent (theft_allegation, identity_fraud, or general_complaint), "
                "provide a concise evidence summary, and decide if it should be escalated (true/false). "
                "Return ONLY a JSON object with keys: intent, evidence_summary, escalate."
            )
            
            headers = {
                "Authorization": f"Bearer {openrouter_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://verifund.app", # Required by OpenRouter
                "X-Title": "VeriFund AI Service"
            }
            
            payload = {
                "model": "nvidia/nemotron-3-super-120b-a12b:free",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1
            }
            
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                ai_data = resp.json()
                text_response = ai_data['choices'][0]['message']['content']
                # Clean up json markdown if present
                clean_json = re.search(r"\{.*\}", text_response, re.DOTALL).group()
                result = __import__('json').loads(clean_json)
                
                return {
                    "intent": result.get("intent", "suspicious_activity"),
                    "corroboration_score": 0.92, 
                    "evidence_summary": result.get("evidence_summary"),
                    "escalate": result.get("escalate", True),
                    "model": "nvidia/nemotron-3-super-120b-a12b (OpenRouter)",
                }
        except Exception as e:
            logger.error(f"OpenRouter API Error: {e}")

    # Professional Rule-Based Fallback
    lowered = report_text.lower()
    keyword_hits = sorted({keyword for keyword in KEYWORDS if keyword in lowered})
    amount_mentions = re.findall(r"\b\d[\d,]*\b", report_text)

    corroboration = 0.20 + min(len(keyword_hits) * 0.15, 0.40) + min(len(amount_mentions) * 0.1, 0.2)
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
        flagged = int(stats.get("flagged_contributions", 0) or 0)
        risky = int(stats.get("risky_withdrawals", 0) or 0)
        corroboration += min((flagged * 0.1) + (risky * 0.15), 0.35)
        if flagged or risky:
            evidence_bits.append(f"Historical anomalies detected ({flagged} flags, {risky} risky withdrawals).")

    corroboration_score = round(min(corroboration, 0.99), 2)
    
    if "stole" in lowered or "missing" in lowered: intent = "theft_allegation"
    elif "fake" in lowered: intent = "identity_fraud"
    else: intent = "suspicious_activity" if keyword_hits else "general_complaint"

    if keyword_hits: evidence_bits.append(f"Risk keywords identified: {', '.join(keyword_hits)}.")
    
    return {
        "intent": intent,
        "corroboration_score": corroboration_score,
        "evidence_summary": " ".join(evidence_bits) or "Report processed for administrative review.",
        "escalate": corroboration_score >= 0.5,
        "model": "verifund_triage_engine_v1",
    }
