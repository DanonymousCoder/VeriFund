import json
import os
import smtplib
import uuid
from email.message import EmailMessage

from shared.db import atomic, execute, fetch_all

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER or "noreply@verifund.app")
DEFAULT_NOTIFICATION_EMAIL = os.getenv("DEFAULT_NOTIFICATION_EMAIL", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}


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
    channel: str = "email",
    provider_response: dict | None = None,
    error_detail: str | None = None,
) -> dict:
    result = {
        "status": status,
        "recipient": recipient,
        "channel": channel,
        "provider_response": provider_response or {},
        "detail": error_detail,
    }
    try:
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
                    channel,
                    recipient,
                    message,
                    status,
                    json.dumps(provider_response or {}),
                    error_detail,
                ],
            )
    except Exception as exc:
        result["log_status"] = "skipped"
        result["log_detail"] = str(exc)
    return result


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and EMAIL_FROM)


def send_email(to_email: str, subject: str, message: str) -> dict:
    recipient = (to_email or DEFAULT_NOTIFICATION_EMAIL or "").strip()
    if not recipient:
        return _log_notification(
            recipient="",
            message=message,
            status="failed",
            error_detail="No recipient email configured.",
        )

    if not _smtp_configured():
        print(f"[EMAIL SANDBOX] To: {recipient} | Subject: {subject} | Message: {message}")
        return _log_notification(
            recipient=recipient,
            message=message,
            status="queued_local",
            provider_response={"subject": subject, "mode": "sandbox"},
        )

    email = EmailMessage()
    email["Subject"] = subject
    email["From"] = EMAIL_FROM
    email["To"] = recipient
    email.set_content(message)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(email)
        return _log_notification(
            recipient=recipient,
            message=message,
            status="sent",
            provider_response={"subject": subject, "smtp_host": SMTP_HOST},
        )
    except Exception as exc:
        return _log_notification(
            recipient=recipient,
            message=message,
            status="failed",
            error_detail=str(exc),
        )


def send_notification(
    *,
    email: str | None = None,
    phone_number: str | None = None,
    message: str,
    subject: str = "VeriFund Notification",
) -> dict:
    recipient = (email or "").strip()
    if not recipient:
        recipient = DEFAULT_NOTIFICATION_EMAIL.strip()
    if not recipient and phone_number:
        recipient = DEFAULT_NOTIFICATION_EMAIL.strip()
        if recipient:
            message = f"{message}\n\n(Requested phone: {phone_number})"
    return send_email(recipient, subject, message)


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


def send_contribution_receipt(email: str, amount_naira: float, cooperative_name: str, ref: str) -> dict:
    message = (
        f"Your contribution of N{amount_naira:,.0f} to {cooperative_name} "
        f"has been confirmed. Ref: {ref}. Thank you!"
    )
    return send_email(email, "VeriFund contribution receipt", message)


def send_fraud_alert(email: str, cooperative_name: str, detail: str) -> dict:
    message = f"Suspicious activity detected in {cooperative_name}. {detail} Contact your cooperative executives."
    return send_email(email, "VeriFund security alert", message)


def send_withdrawal_alert(email: str, amount_naira: float, cooperative_name: str) -> dict:
    message = (
        f"A withdrawal of N{amount_naira:,.0f} from {cooperative_name} "
        f"is pending your co-signature. Log in to approve."
    )
    return send_email(email, "VeriFund withdrawal approval needed", message)
