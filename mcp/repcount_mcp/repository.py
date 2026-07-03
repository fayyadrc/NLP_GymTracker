from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Any

from .config import settings
from .context import mcp_request_context


class GymDataRepository(ABC):
    @abstractmethod
    def fetch_gym_logs(
        self,
        *,
        date_from: str | None = None,
        date_to: str | None = None,
        date_exact: str | None = None,
        exercise: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def insert_gym_logs(self, records: list[dict[str, Any]]) -> int:
        raise NotImplementedError


class SupabaseRepository(GymDataRepository):
    def __init__(self, url: str, key: str) -> None:
        self.url = url
        self.key = key

    def _client(self):
        from supabase import create_client

        request_context = mcp_request_context.get()
        client = create_client(self.url, self.key)
        if request_context is not None:
            client.postgrest.auth(request_context.access_token)
        return client

    def fetch_gym_logs(
        self,
        *,
        date_from: str | None = None,
        date_to: str | None = None,
        date_exact: str | None = None,
        exercise: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        query = self._client().table(settings.gym_logs_collection).select(
            "id,date,exercise,exercise_name,weight,weight_unit,reps,set_number,to_failure,rir,notes"
        )
        request_context = mcp_request_context.get()
        if request_context is not None:
            query = query.eq("user_id", request_context.user_id)
        if date_exact:
            query = query.eq("date", date_exact)
        else:
            if date_from:
                query = query.gte("date", date_from)
            if date_to:
                query = query.lte("date", date_to)
        if exercise:
            query = query.or_(f"exercise.eq.{exercise},exercise_name.eq.{exercise}")
        query = query.order("date", desc=True)
        if limit:
            query = query.limit(limit)
        response = query.execute()
        return response.data or []

    def insert_gym_logs(self, records: list[dict[str, Any]]) -> int:
        if not records:
            return 0
        request_context = mcp_request_context.get()
        if request_context is not None:
            records = [{**record, "user_id": request_context.user_id} for record in records]
        self._client().table(settings.gym_logs_collection).insert(records).execute()
        return len(records)


def get_repository() -> GymDataRepository:
    request_context = mcp_request_context.get()
    if request_context is not None:
        if not settings.supabase_url or not settings.supabase_anon_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY are required for authenticated MCP")
        return SupabaseRepository(settings.supabase_url, settings.supabase_anon_key)

    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are required for RepCount MCP")
    return SupabaseRepository(settings.supabase_url, settings.supabase_key)


def iso_days_ago(days: int) -> str:
    return date.fromordinal(date.today().toordinal() - days).isoformat()
