from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional in bare test environments
    def load_dotenv(*_args: object, **_kwargs: object) -> bool:
        return False


ROOT_DIR = Path(__file__).resolve().parents[2]
for env_path in (
    ROOT_DIR / "backend" / ".env",
    ROOT_DIR / ".env",
    ROOT_DIR / ".env.local",
    ROOT_DIR / "backend" / ".env.local",
):
    if env_path.exists():
        load_dotenv(env_path, override=True)


@dataclass(frozen=True)
class Settings:
    server_name: str = os.getenv("REPCOUNT_MCP_SERVER_NAME", "RepCount MCP")
    transport: str = os.getenv("REPCOUNT_MCP_TRANSPORT", "stdio")

    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_key: str | None = os.getenv("SUPABASE_KEY")
    supabase_anon_key: str | None = os.getenv("SUPABASE_ANON_KEY")
    gym_logs_collection: str = os.getenv("REPCOUNT_GYM_LOGS_COLLECTION", "gym_logs")
    strava_collection: str = os.getenv("REPCOUNT_STRAVA_COLLECTION", "strava_activities")

    @property
    def public_app_url(self) -> str | None:
        explicit = (os.getenv("PUBLIC_APP_URL") or "").strip().rstrip("/")
        if explicit:
            return explicit
        if os.getenv("RENDER") == "true" or os.getenv("ENVIRONMENT") == "production":
            return None
        return "http://localhost:8002"


settings = Settings()
