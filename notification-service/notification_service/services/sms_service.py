import json
import os
import uuid

from shared.db import atomic, execute, fetch_all

AT_USERNAME = os.getenv("AT_USERNAME", "sandbox")
AT_API_KEY = os.getenv("AT_API_KEY", "")


def ensure_notification_schema() -> None:
    execute(
        """
        CREATE TABLE IF NOT EXISTS notification_logs (
            id VARCHAR(36) PRIMARY KEY,
            channel VARCHAR(32) NOT NULL,
            recipient VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(32) NOT NULL,
            provider_response TEXT,
            error_detail TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def _log_notification(
    *,
    recipient: str,
    message: str,
    status: str,
    provider_response: dict | None = None,
    error_detail: str | None = None,
) -> dict:
    ensure_notification_schema()
    with atomic():
        execute(
            """
            INSERT INTO notification_logs (
                id,
                channel,
                recipient,
                message,
                status,
                provider_response,
                error_detail
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            [
                str(uuid.uuid4()),
                "sms",
                recipient,
                message,
                status,
                json.dumps(provider_response or {}),
                error_detail,
            ],
        )
    return {
        "status": status,
        "recipient": recipient,
        "provider_response": provider_response or {},
        "detail": error_detail,
    }


def send_sms(phone_number: str, message: str) -> dict:
    if AT_API_KEY:
        try:
            import africastalking

            africastalking.initialize(AT_USERNAME, AT_API_KEY)
            sms = africastalking.SMS
            response = sms.send(message, [phone_number])
            return _log_notification(
                recipient=phone_number,
                message=message,
                status="sent",
                provider_response=response,
            )
        except Exception as exc:
            return _log_notification(
                recipient=phone_number,
                message=message,
                status="failed",
                error_detail=str(exc),
            )

    print(f"[SMS SANDBOX] To: {phone_number} | Message: {message}")
    return _log_notification(recipient=phone_number, message=message, status="queued_local")


def list_notifications(recipient: str | None = None, status: str | None = None, limit: int = 50) -> list[dict]:
    ensure_notification_schema()
    query = """
        SELECT id, channel, recipient, message, status, provider_response, error_detail, created_at
        FROM notification_logs
        WHERE 1 = 1
    """
    params: list[object] = []
    if recipient:
        query += " AND recipient = %s"
        params.append(recipient)
    if status:
        query += " AND status = %s"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)
    return fetch_all(query, params)


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
