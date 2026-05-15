import hashlib
import uuid

from django.contrib.auth.hashers import check_password, make_password

from shared.db import atomic, fetch_one
from shared.utils.jwt_utils import create_token


def hash_bvn(bvn: str) -> str:
    return hashlib.sha256(bvn.encode()).hexdigest()


def _serialize_member(row: dict) -> dict:
    return {
        "id": row["id"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "phone_number": row["phone_number"],
        "email": row.get("email"),
        "bvn_verified": row["bvn_verified"],
        "bvn_verified_at": row.get("bvn_verified_at"),
        "role": row["role"],
        "is_active": row["is_active"],
        "created_at": row["created_at"],
    }


def register_member(data: dict) -> dict:
    bvn_hash = hash_bvn(data["bvn"])
    existing = fetch_one(
        """
        SELECT id
        FROM members
        WHERE bvn_hash = %s OR phone_number = %s OR (%s IS NOT NULL AND email = %s)
        """,
        [bvn_hash, data["phone_number"], data.get("email"), data.get("email")],
    )
    if existing:
        return {"error": "A member with this identity or phone number already exists."}

    with atomic():
        member_id = str(uuid.uuid4())
        created = fetch_one(
            """
            INSERT INTO members (
                id,
                bvn_hash,
                first_name,
                last_name,
                phone_number,
                email,
                password_hash,
                bvn_verified,
                bvn_verified_at,
                role,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING
                id,
                first_name,
                last_name,
                phone_number,
                email,
                bvn_verified,
                bvn_verified_at,
                role,
                is_active,
                created_at
            """,
            [
                member_id,
                bvn_hash,
                data["first_name"],
                data["last_name"],
                data["phone_number"],
                data.get("email"),
                make_password(data["password"]),
                False,
                None,
                "MEMBER",
                True,
            ],
        )

    token = create_token({"member_id": created["id"], "role": created["role"]})
    return {"member": _serialize_member(created), "token": token}


def login_member(phone_number: str, password: str) -> dict:
    member = fetch_one(
        """
        SELECT id, phone_number, password_hash, role, is_active
        FROM members
        WHERE phone_number = %s
        """,
        [phone_number],
    )
    if not member or not check_password(password, member["password_hash"]):
        return {"error": "Invalid phone number or password."}
    if not member["is_active"]:
        return {"error": "This account has been deactivated."}

    token = create_token({"member_id": member["id"], "role": member["role"]})
    return {"token": token, "member_id": member["id"], "role": member["role"]}


def get_member_profile(member_id: str) -> dict | None:
    member = fetch_one(
        """
        SELECT
            id,
            first_name,
            last_name,
            phone_number,
            email,
            bvn_verified,
            bvn_verified_at,
            role,
            is_active,
            created_at
        FROM members
        WHERE id = %s
        """,
        [member_id],
    )
    if not member:
        return None
    return _serialize_member(member)


def update_member_profile(member_id: str, data: dict) -> dict:
    member = fetch_one("SELECT id FROM members WHERE id = %s", [member_id])
    if not member:
        return {"error": "Member not found."}

    current = fetch_one(
        """
        SELECT id, first_name, last_name, phone_number, email
        FROM members
        WHERE id = %s
        """,
        [member_id],
    )
    if not current:
        return {"error": "Member not found."}

    phone_number = data.get("phone_number", current["phone_number"])
    email = data["email"] if "email" in data else current.get("email")
    duplicate = fetch_one(
        """
        SELECT id
        FROM members
        WHERE id <> %s AND (phone_number = %s OR (%s IS NOT NULL AND email = %s))
        """,
        [member_id, phone_number, email, email],
    )
    if duplicate:
        return {"error": "Another member already uses this phone number or email."}

    updated = fetch_one(
        """
        UPDATE members
        SET
            first_name = %s,
            last_name = %s,
            phone_number = %s,
            email = %s
        WHERE id = %s
        RETURNING
            id,
            first_name,
            last_name,
            phone_number,
            email,
            bvn_verified,
            bvn_verified_at,
            role,
            is_active,
            created_at
        """,
        [
            data.get("first_name", current["first_name"]),
            data.get("last_name", current["last_name"]),
            phone_number,
            email,
            member_id,
        ],
    )
    return {"member": _serialize_member(updated)}
