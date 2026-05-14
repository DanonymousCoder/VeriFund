import hashlib
import hmac
import os
import uuid
from typing import Any

import httpx

from shared.env import env_bool


SQUAD_BASE_URL = os.getenv("SQUAD_BASE_URL", "https://sandbox-api-d.squadco.com").rstrip("/")
SQUAD_SECRET_KEY = os.getenv("SQUAD_SECRET_KEY", "")
SQUAD_PUBLIC_KEY = os.getenv("SQUAD_PUBLIC_KEY", "")
SQUAD_WEBHOOK_SECRET = os.getenv("SQUAD_WEBHOOK_SECRET", SQUAD_SECRET_KEY)
SQUAD_TIMEOUT = float(os.getenv("SQUAD_REQUEST_TIMEOUT", "15"))
SQUAD_MOCK_MODE = env_bool("SQUAD_MOCK_MODE", default=False)
SQUAD_BVN_VERIFY_PATH = os.getenv("SQUAD_BVN_VERIFY_PATH", "/merchant/api/v1/merchant/verify-bvn")
SQUAD_DIRECT_DEBIT_PATH = os.getenv("SQUAD_DIRECT_DEBIT_PATH", "")
SQUAD_SETTLEMENT_ACCOUNT = os.getenv("SQUAD_SETTLEMENT_ACCOUNT", "")
SQUAD_SETTLEMENT_MOBILE = os.getenv("SQUAD_SETTLEMENT_MOBILE", "")
SQUAD_SETTLEMENT_EMAIL = os.getenv("SQUAD_SETTLEMENT_EMAIL", "")
SQUAD_SETTLEMENT_ADDRESS = os.getenv("SQUAD_SETTLEMENT_ADDRESS", "")
SQUAD_SETTLEMENT_DOB = os.getenv("SQUAD_SETTLEMENT_DOB", "")
SQUAD_SETTLEMENT_GENDER = os.getenv("SQUAD_SETTLEMENT_GENDER", "")


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        headers["Authorization"] = f"Bearer {SQUAD_SECRET_KEY}"
    return headers


def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{SQUAD_BASE_URL}{path}"
    try:
        response = httpx.request(
            method=method,
            url=url,
            json=payload,
            headers=_headers(),
            timeout=SQUAD_TIMEOUT,
        )
        raw = response.json() if response.content else {}
        success = response.status_code < 400 and bool(raw.get("success", True))
        return {
            "success": success,
            "status_code": response.status_code,
            "data": raw.get("data", raw),
            "message": raw.get("message", response.text),
            "raw": raw,
        }
    except Exception as exc:
        return {"success": False, "status_code": 0, "message": str(exc), "data": {}, "raw": {}}


def verify_bvn(bvn: str, first_name: str, last_name: str) -> dict[str, Any]:
    payload = {"bvn": bvn, "first_name": first_name, "last_name": last_name}
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        return _request("POST", SQUAD_BVN_VERIFY_PATH, payload)

    if len(bvn) == 11 and bvn.isdigit():
        return {"success": True, "data": payload, "message": "Sandbox BVN verification succeeded."}
    return {"success": False, "message": "BVN verification failed."}


def create_virtual_account(
    customer_identifier: str,
    bvn: str,
    first_name: str,
    last_name: str,
    *,
    business_name: str | None = None,
    phone_number: str | None = None,
    beneficiary_account: str | None = None,
    email: str | None = None,
    address: str | None = None,
    date_of_birth: str | None = None,
    gender: str | None = None,
) -> dict[str, Any]:
    use_business_account = bool(business_name)
    if use_business_account:
        payload = {
            "customer_identifier": customer_identifier,
            "business_name": business_name,
            "bvn": bvn,
            "mobile_num": phone_number or SQUAD_SETTLEMENT_MOBILE,
            "beneficiary_account": beneficiary_account or SQUAD_SETTLEMENT_ACCOUNT,
        }
        path = "/virtual-account/business"
        missing = [
            field for field, value in payload.items() if field in {"mobile_num", "beneficiary_account"} and not value
        ]
    else:
        payload = {
            "customer_identifier": customer_identifier,
            "bvn": bvn,
            "first_name": first_name,
            "last_name": last_name,
            "mobile_num": phone_number or SQUAD_SETTLEMENT_MOBILE,
            "email": email or SQUAD_SETTLEMENT_EMAIL,
            "address": address or SQUAD_SETTLEMENT_ADDRESS,
            "dob": date_of_birth or SQUAD_SETTLEMENT_DOB,
            "gender": gender or SQUAD_SETTLEMENT_GENDER,
            "beneficiary_account": beneficiary_account or SQUAD_SETTLEMENT_ACCOUNT,
        }
        path = "/virtual-account"
        missing = [
            field
            for field, value in payload.items()
            if field in {"mobile_num", "email", "address", "dob", "gender", "beneficiary_account"} and not value
        ]

    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE and missing:
        return {
            "success": False,
            "message": (
                f"Missing Squad virtual account field(s): {', '.join(missing)}. "
                "Squad virtual accounts require a profiled GTBank settlement account/beneficiary account."
            ),
            "data": {},
        }

    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        result = _request("POST", path, payload)
        if result.get("success"):
            data = result.get("data", {})
            result["data"]["virtual_account_number"] = (
                data.get("account_number")
                or data.get("virtual_account_number")
                or data.get("va_number")
            )
        return result

    synthetic_suffix = "".join(ch for ch in customer_identifier if ch.isdigit())[-7:] or "0000000"
    return {
        "success": True,
        "data": {
            "virtual_account_number": f"200{synthetic_suffix:0>7}"[:10],
            "customer_identifier": customer_identifier,
            "bank": "GTBank",
        },
        "message": "Sandbox virtual account generated.",
    }


def create_direct_debit_mandate(
    *,
    amount_kobo: int,
    account_number: str,
    bank_code: str,
    description: str,
    start_date: str,
    end_date: str,
    customer_email: str,
    transaction_reference: str,
    bvn: str,
    first_name: str,
    last_name: str,
    address: str,
    phone_number: str,
    mandate_type: str = "emandate",
) -> dict[str, Any]:
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE and SQUAD_DIRECT_DEBIT_PATH:
        payload = {
            "mandate_type": mandate_type,
            "amount": str(int(amount_kobo)),
            "account_number": account_number,
            "bank_code": bank_code,
            "description": description,
            "start_date": start_date,
            "end_date": end_date,
            "customer_email": customer_email,
            "transaction_reference": transaction_reference,
            "customerInformation": {
                "identity": {
                    "type": "bvn",
                    "number": bvn,
                },
                "firstName": first_name,
                "lastName": last_name,
                "address": address,
                "phone": phone_number,
            },
        }
        result = _request("POST", SQUAD_DIRECT_DEBIT_PATH, payload)
        return result

    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE and not SQUAD_DIRECT_DEBIT_PATH:
        return {
            "success": False,
            "message": "Direct debit endpoint is not defined. Confirm the exact Squad direct debit route from your account docs before enabling this live.",
            "data": {},
        }

    return {
        "success": True,
        "data": {
            "mandate_id": f"mandate-{uuid.uuid4().hex[:10]}",
            "amount": int(amount_kobo),
            "frequency": "variable",
            "status": "active",
            "reference": transaction_reference,
            "ready_to_debit": False,
        },
        "message": "Sandbox mandate created.",
    }


def get_mandate_by_reference(reference: str) -> dict[str, Any]:
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        return _request("GET", f"/transaction/mandate/get-mandates/{reference}")
    return {
        "success": True,
        "data": [
            {
                "merchant_reference": reference,
                "mandate_id": f"mandate-{reference[:10]}",
                "ready_to_debit": True,
                "is_approved": True,
                "status": "approved",
            }
        ],
        "message": "Sandbox mandate lookup succeeded.",
    }


def debit_mandate(
    *,
    amount_kobo: int,
    mandate_id: str,
    transaction_reference: str,
    narration: str,
    customer_email: str,
    pass_charge: bool = False,
) -> dict[str, Any]:
    payload = {
        "amount": int(amount_kobo),
        "mandate_id": mandate_id,
        "transaction_reference": transaction_reference,
        "narration": narration,
        "pass_charge": pass_charge,
        "customer_email": customer_email,
    }
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE and SQUAD_DIRECT_DEBIT_PATH:
        return _request("POST", "/transaction/mandate/debit", payload)
    return {
        "success": True,
        "data": {
            "transaction_ref": transaction_reference,
            "mandate_id": mandate_id,
            "status": "pending",
            "amount": int(amount_kobo),
        },
        "message": "Sandbox mandate debit queued.",
    }


def simulate_virtual_account_payment(
    *,
    amount_kobo: int,
    virtual_account_number: str,
    customer_identifier: str,
) -> dict[str, Any]:
    payload = {
        "amount": str(int(amount_kobo)),
        "virtual_account_number": virtual_account_number,
        "customer_identifier": customer_identifier,
    }
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        return _request("POST", "/virtual-account/simulate/payment", payload)
    return {
        "success": True,
        "data": {
            "transaction_reference": f"SIM-{uuid.uuid4().hex[:10]}",
            "virtual_account_number": virtual_account_number,
            "amount": int(amount_kobo),
            "customer_identifier": customer_identifier,
        },
        "message": "Sandbox virtual account payment simulated.",
    }


def lookup_account_name(bank_code: str, account_number: str) -> dict[str, Any]:
    payload = {"bank_code": bank_code, "account_number": account_number}
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        return _request("POST", "/payout/account/lookup", payload)
    return {
        "success": True,
        "data": {"account_name": "Sandbox Recipient"},
        "message": "Sandbox account lookup succeeded.",
    }


def requery_transfer(transaction_reference: str) -> dict[str, Any]:
    payload = {"transaction_reference": transaction_reference}
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        return _request("POST", "/payout/requery", payload)
    return {
        "success": True,
        "data": {"transaction_reference": transaction_reference, "status": "pending"},
        "message": "Sandbox transfer requery succeeded.",
    }


def initiate_transfer(
    amount_kobo: int,
    bank_code: str,
    account_number: str,
    remark: str,
    idempotency_key: str,
    account_name: str | None = None,
) -> dict[str, Any]:
    resolved_account_name = account_name
    if not resolved_account_name:
        lookup_result = lookup_account_name(bank_code=bank_code, account_number=account_number)
        if not lookup_result.get("success"):
            return lookup_result
        resolved_account_name = lookup_result.get("data", {}).get("account_name")

    payload = {
        "transaction_reference": idempotency_key,
        "amount": str(int(amount_kobo)),
        "bank_code": bank_code,
        "account_number": account_number,
        "account_name": resolved_account_name,
        "currency_id": "NGN",
        "remark": remark,
    }
    if SQUAD_SECRET_KEY and not SQUAD_MOCK_MODE:
        result = _request("POST", "/payout/transfer", payload)
        if result.get("status_code") == 424:
            return requery_transfer(idempotency_key)
        if result.get("success"):
            data = result.get("data", {})
            result["data"]["transaction_ref"] = (
                data.get("transaction_reference")
                or data.get("transaction_ref")
                or idempotency_key
            )
            return result
        return result

    return {
        "success": True,
        "data": {
            "transaction_ref": f"TRF-{idempotency_key[:12]}",
            "amount": int(amount_kobo),
            "status": "pending",
        },
        "message": "Sandbox transfer queued.",
    }


def _full_payload_signature(payload: bytes) -> str:
    return hmac.new(SQUAD_WEBHOOK_SECRET.encode(), payload, hashlib.sha512).hexdigest()


def _field_based_signature(webhook_data: dict) -> str | None:
    data = webhook_data.get("Body") or webhook_data.get("data") or webhook_data
    transaction_ref = (
        data.get("txn_ref")
        or data.get("transaction_ref")
        or webhook_data.get("TransactionRef")
    )
    va_number = data.get("va_number") or data.get("virtual_account_number")
    currency = data.get("currency")
    principal = data.get("principal_amount") or data.get("principal") or data.get("amount")
    settled = data.get("settled_amount") or data.get("settled") or data.get("amount")
    customer_id = data.get("customer_id") or data.get("customer_identifier")
    values = [transaction_ref, va_number, currency, principal, settled, customer_id]
    if any(value in (None, "") for value in values):
        return None
    payload = "|".join(str(value) for value in values)
    return hmac.new(SQUAD_WEBHOOK_SECRET.encode(), payload.encode(), hashlib.sha512).hexdigest()


def verify_webhook_signature(payload: bytes, signature: str, webhook_data: dict | None = None) -> bool:
    if not signature:
        return env_bool("ALLOW_UNVERIFIED_WEBHOOKS", default=True)
    if not SQUAD_WEBHOOK_SECRET:
        return env_bool("ALLOW_UNVERIFIED_WEBHOOKS", default=True)

    normalized_signature = signature.strip().lower()
    if hmac.compare_digest(_full_payload_signature(payload), normalized_signature):
        return True
    if webhook_data:
        field_signature = _field_based_signature(webhook_data)
        if field_signature and hmac.compare_digest(field_signature, normalized_signature):
            return True
    return False
