import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from rest_framework.response import Response
from rest_framework.views import APIView


def _candidate_db_paths() -> list[Path]:
    paths: list[Path] = []
    env_path = os.getenv("VERIFUND_QADB_PATH", "").strip()
    if env_path:
        paths.append(Path(env_path))

    repo_root = Path(__file__).resolve().parents[2]
    paths.append(repo_root / "tests" / "quickdb-runner" / "data" / "verifund-endpoint-runs.sqlite")
    paths.append(Path("/app/tests/quickdb-runner/data/verifund-endpoint-runs.sqlite"))
    paths.append(Path("/app/data/verifund-endpoint-runs.sqlite"))
    return paths


def _resolve_db_path() -> Path | None:
    for path in _candidate_db_paths():
        if path.exists():
            return path
    return None


def _load_quickdb_docs(db_path: Path) -> dict[str, Any]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "ID", "json" FROM "json"')
        docs: dict[str, Any] = {}
        for row in cursor.fetchall():
            key = row["ID"]
            raw_value = row["json"]
            try:
                docs[key] = json.loads(raw_value) if raw_value else None
            except json.JSONDecodeError:
                docs[key] = raw_value
        return docs
    finally:
        conn.close()


def _derive_run_meta(run: dict[str, Any]) -> dict[str, Any]:
    total = int(run.get("total") or 0)
    passed = int(run.get("passed") or 0)
    failed = int(run.get("failed") or max(total - passed, 0))
    pass_rate = run.get("passRate")
    if pass_rate is None:
        pass_rate = round((passed / total) * 100, 1) if total else 0
    return {
        **run,
        "total": total,
        "passed": passed,
        "failed": failed,
        "passRate": pass_rate,
    }


def _latest_failures(results_by_run: dict[str, Any] | None, run_id: str | None, limit: int = 8) -> list[dict[str, Any]]:
    if not results_by_run or not run_id:
        return []
    entries = results_by_run.get(run_id)
    if not isinstance(entries, list):
        return []
    failures = [item for item in entries if isinstance(item, dict) and not item.get("pass")]
    return failures[:limit]


class QAScoreboardView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        db_path = _resolve_db_path()
        if not db_path:
            return Response(
                {
                    "status": "empty",
                    "message": "No quick.db scoreboard file was found yet.",
                    "candidate_paths": [str(path) for path in _candidate_db_paths()],
                    "available": False,
                }
            )

        docs = _load_quickdb_docs(db_path)
        runs = docs.get("runs", {}) or {}
        if not isinstance(runs, dict):
            runs = {}
        run_index = docs.get("runIndex", []) or []
        if not isinstance(run_index, list):
            run_index = []
        results_by_run = docs.get("results", {}) or {}
        if not isinstance(results_by_run, dict):
            results_by_run = {}

        latest_run_id = docs.get("latestRun") or (run_index[-1] if run_index else None)
        latest_summary = docs.get("latestSummary") or (runs.get(latest_run_id) if latest_run_id else None)

        latest_summary = _derive_run_meta(latest_summary) if latest_summary else None

        recent_runs: list[dict[str, Any]] = []
        for run_id in run_index[-10:]:
            run = runs.get(run_id, {"runId": run_id})
            if isinstance(run, dict):
                recent_runs.append(_derive_run_meta(run))

        payload = {
            "status": "ok",
            "available": True,
            "source": str(db_path),
            "run_count": len(run_index),
            "latest_run_id": latest_run_id,
            "latest_summary": latest_summary,
            "latest_failures": _latest_failures(results_by_run, latest_run_id),
            "recent_runs": recent_runs,
        }
        return Response(payload)
