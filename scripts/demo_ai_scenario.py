import json
import time
import requests

BASE_URL = "http://127.0.0.1:8000/api" # Gateway URL

def run_demo():
    print("🚀 Starting VeriFund AI Demo Scenario...")
    
    # Check if services are likely running
    AI_URL = "http://127.0.0.1:8005/api/ai/score-transaction/"
    TRIAGE_URL = "http://127.0.0.1:8005/api/ai/triage-report/"
    
    try:
        requests.get("http://127.0.0.1:8005/", timeout=1)
    except:
        print("\n⚠️  WARNING: AI Service (port 8005) does not seem to be running.")
        print("💡 To run this demo, please start the AI service first:")
        print("   cd ai-service && python manage.py runserver 8005\n")
    
    # 1. Simulate a suspicious contribution
    print("\n[Scenario 1] Processing a suspicious contribution...")
    contribution_data = {
        "amount_kobo": 2500000, # 25,000 NGN
        "rolling_90d_mean": 50000, # Usually contributes small amounts
        "days_since_last_contribution": 2,
        "member_transaction_count": 12,
        "cooperative_flagged_rate": 0.12
    }
    
    # Note: In real life this would be called by the contribution service
    # We hit the ai-service directly for the demo if it's running on 8005
    AI_URL = "http://127.0.0.1:8005/api/ai/score-transaction/"
    
    try:
        resp = requests.post(AI_URL, json=contribution_data)
        result = resp.json()
        print(f"Result: {json.dumps(result, indent=2)}")
        if result.get("flagged"):
            print("⚠️ ALERT: Transaction FLAGGED for anomaly!")
    except Exception as e:
        print(f"❌ Error hitting AI service: {e}")

    # 2. Whistleblower Triage with "LLM"
    print("\n[Scenario 2] New whistleblower report received...")
    report = {
        "report_text": "I noticed that the treasurer withdrew 500,000 NGN yesterday but there is no record of it in the project ledger. I am worried the funds are missing.",
        "reporter_cooperative_id": "demo-coop-123"
    }
    
    TRIAGE_URL = "http://127.0.0.1:8005/api/ai/triage-report/"
    
    print("Calling Deep Analysis Triage (simulating LLM processing)...")
    try:
        start_time = time.time()
        resp = requests.post(TRIAGE_URL, json=report)
        elapsed = time.time() - start_time
        result = resp.json()
        print(f"Processed in {elapsed:.2f}s")
        print(f"Analysis: {json.dumps(result, indent=2)}")
        if result.get("escalate"):
            print("🚨 ESCALATION RECOMMENDED: High probability of fraud.")
    except Exception as e:
        print(f"❌ Error hitting AI service: {e}")

    print("\n✅ Demo Scenario Complete.")

if __name__ == "__main__":
    run_demo()
