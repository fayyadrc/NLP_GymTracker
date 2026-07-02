from __future__ import annotations

import importlib.util
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Callable

from .repository import GymDataRepository, iso_days_ago
from .schemas import ActionEnvelope, GetLatestPayload, GetStatsPayload, LogWorkoutPayload


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

MUSCLE_MAPPING_PATH = BACKEND_DIR / "app" / "modules" / "analytics" / "muscle_mapping.py"
_muscle_mapping_spec = importlib.util.spec_from_file_location("repcount_muscle_mapping", MUSCLE_MAPPING_PATH)
if _muscle_mapping_spec is None or _muscle_mapping_spec.loader is None:
    raise RuntimeError(f"Unable to load muscle mapping module from {MUSCLE_MAPPING_PATH}")
_muscle_mapping = importlib.util.module_from_spec(_muscle_mapping_spec)
_muscle_mapping_spec.loader.exec_module(_muscle_mapping)
get_muscle_info = _muscle_mapping.get_muscle_info
normalize_exercise_name = _muscle_mapping.normalize_exercise_name


class RepCountDispatcher:
    def __init__(self, repository: GymDataRepository) -> None:
        self.repository = repository
        self._handlers: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
            "log_workout": self._handle_log_workout,
            "get_latest": self._handle_get_latest,
            "get_stats": self._handle_get_stats,
        }

    def dispatch(self, command: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        envelope = ActionEnvelope(command=command, payload=payload or {})
        handler = self._handlers[envelope.command]
        return handler(envelope.payload)

    def _handle_log_workout(self, payload: dict[str, Any]) -> dict[str, Any]:
        from app.modules.history.service import HistoryService

        parsed_payload = LogWorkoutPayload.model_validate(payload)
        parsed_log = HistoryService.parse_raw_workout(parsed_payload.raw_text)
        records = [self._parsed_entry_to_record(entry.model_dump()) for entry in parsed_log.entries]

        response = {
            "command": "log_workout",
            "logged_dates": sorted({record["date"] for record in records}),
            "set_count": len(records),
            "exercises": sorted({record["exercise"] for record in records}),
            "preview": [
                {
                    "date": record["date"],
                    "exercise": record["exercise"],
                    "weight": record["weight"],
                    "weight_unit": record["weight_unit"],
                    "reps": record["reps"],
                    "rir": record["rir"],
                    "to_failure": record["to_failure"],
                }
                for record in records[:8]
            ],
        }
        if parsed_payload.dry_run:
            response["status"] = "preview"
            return response

        inserted = self.repository.insert_gym_logs(records)
        response["status"] = "success"
        response["inserted"] = inserted
        return response

    def _handle_get_latest(self, payload: dict[str, Any]) -> dict[str, Any]:
        parsed_payload = GetLatestPayload.model_validate(payload)
        logs = self.repository.fetch_gym_logs(exercise=parsed_payload.exercise, limit=1)
        if not logs:
            return {"command": "get_latest", "status": "empty"}

        latest_date = str(logs[0]["date"]).split("T")[0]
        session_logs = self.repository.fetch_gym_logs(
            date_exact=latest_date,
            exercise=parsed_payload.exercise,
        )
        summary = self._summarize_session(session_logs, include_entries=parsed_payload.include_entries)
        summary["command"] = "get_latest"
        return summary

    def _handle_get_stats(self, payload: dict[str, Any]) -> dict[str, Any]:
        parsed_payload = GetStatsPayload.model_validate(payload)
        logs = self.repository.fetch_gym_logs(
            date_from=iso_days_ago(parsed_payload.days),
            exercise=parsed_payload.exercise,
        )
        if not logs:
            return {
                "command": "get_stats",
                "status": "empty",
                "days": parsed_payload.days,
                "exercise": parsed_payload.exercise,
            }

        volume_by_exercise: dict[str, float] = defaultdict(float)
        sets_by_date: Counter[str] = Counter()
        unique_exercises: set[str] = set()
        total_reps = 0
        total_volume = 0.0

        for log in logs:
            exercise = normalize_exercise_name(log.get("exercise") or log.get("exercise_name") or "Unknown")
            reps = int(log.get("reps") or 0)
            weight = float(log.get("weight") or 0)
            unit = (log.get("weight_unit") or "kg").lower()
            log_date = str(log.get("date") or "").split("T")[0]

            unique_exercises.add(exercise)
            sets_by_date[log_date] += 1
            total_reps += reps
            if unit not in ("plate", "plates"):
                volume = weight * reps
                total_volume += volume
                volume_by_exercise[exercise] += volume

        top_exercises = [
            {"exercise": name, "volume_kg": round(volume, 2), "muscle": get_muscle_info(name)["sub_group"]}
            for name, volume in sorted(volume_by_exercise.items(), key=lambda item: item[1], reverse=True)[:5]
        ]

        return {
            "command": "get_stats",
            "status": "success",
            "days": parsed_payload.days,
            "exercise": parsed_payload.exercise,
            "workout_days": len(sets_by_date),
            "set_count": len(logs),
            "total_reps": total_reps,
            "total_volume_kg": round(total_volume, 2),
            "unique_exercises": len(unique_exercises),
            "top_exercises": top_exercises,
            "latest_workout_date": max(sets_by_date) if sets_by_date else None,
        }

    def _parsed_entry_to_record(self, entry: dict[str, Any]) -> dict[str, Any]:
        exercise_name = normalize_exercise_name(entry["exercise_name"])
        muscle_info = get_muscle_info(exercise_name)
        return {
            "date": entry["date"],
            "exercise": exercise_name,
            "exercise_name": exercise_name,
            "exercise_group": muscle_info["main_group"],
            "sub_muscle_group": muscle_info["sub_group"],
            "weight": entry["weight"] if entry["weight"] is not None else 0.0,
            "weight_unit": entry["unit"],
            "set_number": 1,
            "reps": entry["reps"],
            "to_failure": entry["failure"],
            "rir": entry["rir"],
            "notes": entry.get("notes") or "",
        }

    def _summarize_session(
        self,
        logs: list[dict[str, Any]],
        *,
        include_entries: bool,
    ) -> dict[str, Any]:
        exercise_counts: Counter[str] = Counter()
        total_reps = 0
        total_volume = 0.0
        compact_entries: list[dict[str, Any]] = []

        for log in logs:
            exercise = normalize_exercise_name(log.get("exercise") or log.get("exercise_name") or "Unknown")
            reps = int(log.get("reps") or 0)
            weight = float(log.get("weight") or 0)
            unit = (log.get("weight_unit") or "kg").lower()

            exercise_counts[exercise] += 1
            total_reps += reps
            if unit not in ("plate", "plates"):
                total_volume += weight * reps

            if include_entries:
                compact_entries.append(
                    {
                        "exercise": exercise,
                        "weight": weight,
                        "weight_unit": log.get("weight_unit") or "kg",
                        "reps": reps,
                        "rir": log.get("rir"),
                        "to_failure": bool(log.get("to_failure")),
                    }
                )

        latest_date = str(logs[0]["date"]).split("T")[0]
        response = {
            "status": "success",
            "date": latest_date,
            "set_count": len(logs),
            "exercise_count": len(exercise_counts),
            "total_reps": total_reps,
            "total_volume_kg": round(total_volume, 2),
            "top_exercises": [
                {"exercise": name, "sets": count}
                for name, count in exercise_counts.most_common(5)
            ],
        }
        if include_entries:
            response["entries"] = compact_entries
        return response
