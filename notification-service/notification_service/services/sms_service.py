import os

AT_USERNAME = os.getenv("AT_USERNAME", "sandbox")
AT_API_KEY = os.getenv("AT_API_KEY", "")


def send_sms(phone_number: str, message: str) -> dict:
    if AT_API_KEY:
        try:
            import africastalking

            africastalking.initialize(AT_USERNAME, AT_API_KEY)
            sms = africastalking.SMS
            response = sms.send(message, [phone_number])
            return {"status": "sent", "recipient": phone_number, "provider_response": response}
        except Exception as exc:
            return {"status": "failed", "recipient": phone_number, "detail": str(exc)}

    print(f"[SMS SANDBOX] To: {phone_number} | Message: {message}")
    return {"status": "queued_local", "recipient": phone_number}


def send_contribution_receipt(phone_number: str, amount_naira: float, cooperative_name: str, ref: str) -> dict:
    message = (
        f"VeriFund: Your contribution of N{amount_naira:,.0f} to {cooperative_name} "
        f"has been confirmed. Ref: {ref}. Thank you!"
    )
    return send_sms(phone_number, message)


def send_fraud_alert(phone_number: str, cooperative_name: str, detail: str) -> dict:
    message = f"VeriFund ALERT: Suspicious activity detected in {cooperative_name}. {detail} Contact your cooperative executives."
    return send_sms(phone_number, message)


def send_withdrawal_alert(phone_number: str, amount_naira: float, cooperative_name: str) -> dict:
    message = f"VeriFund: A withdrawal of N{amount_naira:,.0f} from {cooperative_name} is pending your co-signature. Log in to approve."
    return send_sms(phone_number, message)
