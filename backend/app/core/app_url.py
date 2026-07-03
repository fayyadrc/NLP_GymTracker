from __future__ import annotations

import os

from . import dotenv_loader  # noqa: F401

LOCAL_DEFAULT_APP_URL = "http://localhost:8002"


def is_production() -> bool:
    """True when running on Render or with an explicit production flag."""
    return os.getenv("RENDER") == "true" or os.getenv("ENVIRONMENT") == "production"


def get_public_app_url() -> str | None:
    """
    Public base URL for OAuth metadata and MCP resource discovery.

    Set PUBLIC_APP_URL in:
      - .env.local (local): http://localhost:8002
      - Render env vars (production): https://your-app.onrender.com
    """
    explicit = (os.getenv("PUBLIC_APP_URL") or "").strip().rstrip("/")
    if explicit:
        return explicit
    if is_production():
        return None
    return LOCAL_DEFAULT_APP_URL
