from __future__ import annotations

import sys
import unittest
from pathlib import Path

MCP_DIR = Path(__file__).resolve().parents[1]
if str(MCP_DIR) not in sys.path:
    sys.path.append(str(MCP_DIR))

from repcount_mcp.dispatcher import RepCountDispatcher


class FakeRepository:
    def __init__(self) -> None:
        self.records: list[dict] = []

    def fetch_gym_logs(
        self,
        *,
        date_from: str | None = None,
        date_to: str | None = None,
        date_exact: str | None = None,
        exercise: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        rows = self.records[:]
        if date_exact:
            rows = [row for row in rows if row["date"] == date_exact]
        if exercise:
            rows = [
                row
                for row in rows
                if row.get("exercise") == exercise or row.get("exercise_name") == exercise
            ]
        rows.sort(key=lambda row: row["date"], reverse=True)
        if limit is not None:
            rows = rows[:limit]
        return rows

    def insert_gym_logs(self, records: list[dict]) -> int:
        self.records.extend(records)
        return len(records)


class DispatcherTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeRepository()
        self.dispatcher = RepCountDispatcher(self.repo)
        self.repo.records = [
            {
                "date": "2026-07-01",
                "exercise": "Bench Press",
                "exercise_name": "Bench Press",
                "weight": 60,
                "weight_unit": "kg",
                "reps": 8,
                "set_number": 1,
                "to_failure": False,
                "rir": 2,
                "notes": "",
            },
            {
                "date": "2026-07-01",
                "exercise": "Bench Press",
                "exercise_name": "Bench Press",
                "weight": 60,
                "weight_unit": "kg",
                "reps": 6,
                "set_number": 1,
                "to_failure": False,
                "rir": 1,
                "notes": "",
            },
            {
                "date": "2026-06-28",
                "exercise": "Lat Pulldown",
                "exercise_name": "Lat Pulldown",
                "weight": 50,
                "weight_unit": "kg",
                "reps": 10,
                "set_number": 1,
                "to_failure": False,
                "rir": 2,
                "notes": "",
            },
        ]

    def test_get_latest_returns_compact_summary(self) -> None:
        result = self.dispatcher.dispatch("get_latest", {"include_entries": False})
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["date"], "2026-07-01")
        self.assertEqual(result["set_count"], 2)
        self.assertNotIn("entries", result)

    def test_get_stats_aggregates_volume(self) -> None:
        result = self.dispatcher.dispatch("get_stats", {"days": 30})
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["set_count"], 3)
        self.assertEqual(result["total_volume_kg"], 1340.0)


if __name__ == "__main__":
    unittest.main()
