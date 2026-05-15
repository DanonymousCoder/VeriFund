from collections import defaultdict

from shared.db import fetch_all, fetch_one


def analyze_graph(cooperative_id: str) -> dict:
    cooperative = fetch_one(
        """
        SELECT id, name, state, cooperative_type, health_score
        FROM cooperatives
        WHERE id = %s
        """,
        [cooperative_id],
    )
    if not cooperative:
        return {"error": "Cooperative not found."}

    member_rows = fetch_all(
        """
        SELECT DISTINCT member_id
        FROM (
            SELECT member_id FROM contributions WHERE cooperative_id = %s
            UNION
            SELECT member_id FROM direct_debit_mandates WHERE cooperative_id = %s
            UNION
            SELECT requested_by AS member_id FROM withdrawal_requests WHERE cooperative_id = %s
            UNION
            SELECT ws.signed_by AS member_id
            FROM withdrawal_signatures ws
            INNER JOIN withdrawal_requests wr ON wr.id = ws.withdrawal_request_id
            WHERE wr.cooperative_id = %s
        ) members
        """,
        [cooperative_id, cooperative_id, cooperative_id, cooperative_id],
    )
    member_ids = [row["member_id"] for row in member_rows]

    member_profiles = {}
    if member_ids:
        member_profiles = {
            row["id"]: row
            for row in fetch_all(
                """
                SELECT id, first_name, last_name, role, is_active
                FROM members
                WHERE id = ANY(%s)
                """,
                [member_ids],
            )
        }

    nodes = [
        {
            "id": f"coop:{cooperative['id']}",
            "label": cooperative["name"],
            "type": "cooperative",
            "risk_level": "medium" if int(cooperative.get("health_score") or 50) < 80 else "low",
            "meta": cooperative,
        }
    ]
    edges = []
    adjacency: dict[str, set[str]] = defaultdict(set)

    for member_id in member_ids:
        profile = member_profiles.get(member_id, {})
        label = f"{profile.get('first_name', 'Member')} {profile.get('last_name', member_id[:6])}".strip()
        member_node_id = f"member:{member_id}"
        nodes.append(
            {
                "id": member_node_id,
                "label": label,
                "type": "member",
                "risk_level": "low",
                "meta": {
                    "member_id": member_id,
                    "role": profile.get("role", "MEMBER"),
                    "is_active": profile.get("is_active", True),
                },
            }
        )
        edges.append(
            {
                "source": member_node_id,
                "target": f"coop:{cooperative_id}",
                "relation": "member_of",
            }
        )
        adjacency[member_node_id].add(f"coop:{cooperative_id}")
        adjacency[f"coop:{cooperative_id}"].add(member_node_id)

    signature_rows = fetch_all(
        """
        SELECT ws.withdrawal_request_id, ws.signed_by, ws.role
        FROM withdrawal_signatures ws
        INNER JOIN withdrawal_requests wr ON wr.id = ws.withdrawal_request_id
        WHERE wr.cooperative_id = %s
        ORDER BY ws.withdrawal_request_id, ws.signed_at
        """,
        [cooperative_id],
    )
    grouped_signatures: dict[str, list[dict]] = defaultdict(list)
    for row in signature_rows:
        grouped_signatures[row["withdrawal_request_id"]].append(row)

    for withdrawal_id, signers in grouped_signatures.items():
        signer_ids = [f"member:{row['signed_by']}" for row in signers]
        for idx, signer_node_id in enumerate(signer_ids):
            for peer_node_id in signer_ids[idx + 1 :]:
                edges.append(
                    {
                        "source": signer_node_id,
                        "target": peer_node_id,
                        "relation": "co_signed_withdrawal_with",
                        "withdrawal_request_id": withdrawal_id,
                    }
                )
                adjacency[signer_node_id].add(peer_node_id)
                adjacency[peer_node_id].add(signer_node_id)

    flagged_contributions = fetch_all(
        """
        SELECT id, member_id, amount_kobo, anomaly_score, squad_transaction_ref
        FROM contributions
        WHERE cooperative_id = %s AND status = 'FLAGGED'
        ORDER BY contributed_at DESC
        LIMIT 20
        """,
        [cooperative_id],
    )
    risky_withdrawals = fetch_all(
        """
        SELECT id, requested_by, amount_kobo, ai_risk_score, purpose
        FROM withdrawal_requests
        WHERE cooperative_id = %s AND COALESCE(ai_risk_score, 0) > 0.7
        ORDER BY created_at DESC
        LIMIT 20
        """,
        [cooperative_id],
    )

    suspicious_clusters = []
    for row in flagged_contributions:
        suspicious_clusters.append(
            {
                "cluster_type": "flagged_contribution",
                "node_ids": [f"member:{row['member_id']}", f"coop:{cooperative_id}"],
                "score": float(row.get("anomaly_score") or 0),
                "reason": f"Flagged contribution ref {row['squad_transaction_ref']} amount {int(row['amount_kobo'])} kobo.",
            }
        )
    for row in risky_withdrawals:
        suspicious_clusters.append(
            {
                "cluster_type": "risky_withdrawal",
                "node_ids": [f"member:{row['requested_by']}", f"coop:{cooperative_id}"],
                "score": float(row.get("ai_risk_score") or 0),
                "reason": f"High-risk withdrawal {row['id']} for {int(row['amount_kobo'])} kobo.",
            }
        )

    return {
        "cooperative_id": cooperative_id,
        "summary": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "member_count": len(member_ids),
            "flagged_contribution_count": len(flagged_contributions),
            "risky_withdrawal_count": len(risky_withdrawals),
        },
        "nodes": nodes,
        "edges": edges,
        "suspicious_clusters": suspicious_clusters,
        "model": "graph_rules_fallback",
    }
