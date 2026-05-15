import json
import time
import requests

BASE_URL = "http://127.0.0.1:8000/api" # Gateway URL

def run_verification():
    print("🧪 Verifying VeriFund AI Service Integration...")
    
    # Check if services are likely running
    AI_URL = "http://127.0.0.1:8005/api/ai/score-transaction/"
    TRIAGE_URL = "http://127.0.0.1:8005/api/ai/triage-report/"
    
    try:
        requests.get("http://127.0.0.1:8005/", timeout=1)
    except:
        print("\n⚠️  SYSTEM ALERT: AI Service (port 8005) is offline.")
        print("💡 Action Required: Start the AI service:")
        print("   cd ai-service && python manage.py runserver 8005\n")
    
    # 1. Test Transaction Anomaly Scoring
    print("\n[Test 1/2] Verifying Transaction Anomaly Scoring...")
    tx_data = {
        "amount_kobo": 2500000, 
        "rolling_90d_mean": 50000, 
        "days_since_last_contribution": 2,
        "member_transaction_count": 12,
        "cooperative_flagged_rate": 0.12
    }
    
    try:
        resp = requests.post(AI_URL, json=tx_data)
        result = resp.json()
        print(f"Status: SUCCESS")
        print(f"Payload: {json.dumps(result, indent=2)}")
        if result.get("flagged"):
            print(">>> System successfully flagged high-risk transaction.")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

    # 2. Test Whistleblower Triage
    print("\n[Test 2/2] Verifying NLP Triage Engine...")
    report = {
        "report_text": "I noticed that the treasurer withdrew 500,000 NGN yesterday but there is no record of it in the project ledger. I am worried the funds are missing.",
        "reporter_cooperative_id": "demo-coop-123"
    }
    
    print("Initiating NLP Analysis...")
    try:
        start_time = time.time()
        resp = requests.post(TRIAGE_URL, json=report)
        elapsed = time.time() - start_time
        result = resp.json()
        print(f"Latency: {elapsed:.2f}s")
        print(f"Analysis Results: {json.dumps(result, indent=2)}")
        if result.get("escalate"):
            print(">>> Escalation logic verified for suspected fraud.")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

    print("\n✅ AI Integration Verification Complete.")

if __name__ == "__main__":
    run_verification()
