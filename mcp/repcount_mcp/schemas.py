from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


SupportedCommand = Literal["log_workout", "get_latest", "get_stats"]


class ActionEnvelope(BaseModel):
    command: SupportedCommand
    payload: dict[str, Any] = Field(default_factory=dict)


class LogWorkoutPayload(BaseModel):
    raw_text: str = Field(min_length=1, description="Natural-language workout log.")
    dry_run: bool = Field(default=False, description="Parse only. Do not write to the database.")


class GetLatestPayload(BaseModel):
    exercise: str | None = Field(default=None, description="Optional exercise name filter.")
    include_entries: bool = Field(default=False, description="Include compact set rows.")


class GetStatsPayload(BaseModel):
    days: int = Field(default=30, ge=1, le=365)
    exercise: str | None = Field(default=None, description="Optional exercise name filter.")

    @field_validator("exercise")
    @classmethod
    def normalize_exercise(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None
