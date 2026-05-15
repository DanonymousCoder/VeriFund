import csv
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path


COOPERATIVE_TYPES = ["THRIFT", "CREDIT", "MULTIPURPOSE"]
STATES = ["Lagos", "Abuja", "Kano", "Rivers", "Oyo", "Kaduna", "Enugu"]
TRANSACTION_TYPES = ["CONTRIBUTION", "WITHDRAWAL"]


def generate_cooperatives(n: int = 200) -> list[dict]:
    rows = []
    for index in range(n):
        monthly_contribution_kobo = random.randint(200_000, 5_000_000)
        member_count = random.randint(20, 500)
        founded_at = datetime.now(timezone.utc) - timedelta(days=random.randint(180, 3650))
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "name": f"VeriFund Cooperative {index + 1}",
                "type": random.choice(COOPERATIVE_TYPES),
                "state": random.choice(STATES),
                "member_count": member_count,
                "monthly_contribution_kobo": monthly_contribution_kobo,
                "founded_at": founded_at.date().isoformat(),
                "is_fraud": 1 if random.random() < 0.10 else 0,
            }
        )
    return rows


def generate_transactions(cooperatives: list[dict], months: int = 24) -> list[dict]:
    rows: list[dict] = []
    start_date = datetime.now(timezone.utc) - timedelta(days=30 * months)
    for cooperative in cooperatives:
        average_contribution = cooperative["monthly_contribution_kobo"]
        monthly_withdrawals = max(1, cooperative["member_count"] // 40)
        for month in range(months):
            month_start = start_date + timedelta(days=30 * month)
            for member_index in range(cooperative["member_count"]):
                if random.random() < 0.08:
                    continue
                amount = max(50_000, int(random.gauss(average_contribution, average_contribution * 0.12)))
                contributed_at = month_start + timedelta(days=random.randint(0, 26))
                rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "cooperative_id": cooperative["id"],
                        "member_key": f"{cooperative['id'][:8]}-{member_index + 1}",
                        "transaction_type": "CONTRIBUTION",
                        "amount_kobo": amount,
                        "occurred_at": contributed_at.isoformat(),
                        "label": 0,
                        "fraud_pattern": "",
                    }
                )

            for _ in range(monthly_withdrawals):
                amount = max(200_000, int(random.gauss(average_contribution * 2.4, average_contribution)))
                withdrawn_at = month_start + timedelta(days=random.randint(0, 27))
                rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "cooperative_id": cooperative["id"],
                        "member_key": "",
                        "transaction_type": "WITHDRAWAL",
                        "amount_kobo": amount,
                        "occurred_at": withdrawn_at.isoformat(),
                        "label": 0,
                        "fraud_pattern": "",
                    }
                )

        if cooperative["is_fraud"]:
            rows.extend(inject_fraud_patterns(cooperative, average_contribution, start_date + timedelta(days=30 * (months - 4))))
    return rows


def inject_fraud_patterns(cooperative: dict, average_contribution: int, window_start: datetime) -> list[dict]:
    fraud_rows = []
    for burst in range(3):
        fraud_rows.append(
            {
                "id": str(uuid.uuid4()),
                "cooperative_id": cooperative["id"],
                "member_key": "",
                "transaction_type": "WITHDRAWAL",
                "amount_kobo": average_contribution * random.randint(8, 15),
                "occurred_at": (window_start + timedelta(days=burst * 5)).isoformat(),
                "label": 1,
                "fraud_pattern": "burst_large_withdrawal",
            }
        )

    for ghost_index in range(10):
        fraud_rows.append(
            {
                "id": str(uuid.uuid4()),
                "cooperative_id": cooperative["id"],
                "member_key": f"ghost-{cooperative['id'][:6]}-{ghost_index}",
                "transaction_type": "CONTRIBUTION",
                "amount_kobo": average_contribution,
                "occurred_at": (window_start + timedelta(days=random.randint(0, 25))).isoformat(),
                "label": 1,
                "fraud_pattern": "ghost_member_contribution",
            }
        )

    for diversion_index in range(6):
        fraud_rows.append(
            {
                "id": str(uuid.uuid4()),
                "cooperative_id": cooperative["id"],
                "member_key": "",
                "transaction_type": "WITHDRAWAL",
                "amount_kobo": int(average_contribution * (1.5 + diversion_index * 0.25)),
                "occurred_at": (window_start + timedelta(days=diversion_index * 12)).isoformat(),
                "label": 1,
                "fraud_pattern": "gradual_fund_diversion",
            }
        )
    return fraud_rows


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    random.seed(42)
    data_dir = Path(__file__).resolve().parent
    cooperatives = generate_cooperatives()
    transactions = generate_transactions(cooperatives)

    write_csv(data_dir / "synthetic_cooperatives.csv", cooperatives)
    write_csv(data_dir / "synthetic_transactions.csv", transactions)

    fraud_count = sum(1 for row in transactions if row["label"] == 1)
    print(f"Generated {len(cooperatives)} cooperatives.")
    print(f"Generated {len(transactions)} transactions with {fraud_count} labelled fraud examples.")


if __name__ == "__main__":
    main()
