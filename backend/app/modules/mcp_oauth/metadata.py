from __future__ import annotations

from .config import settings


def build_protected_resource_metadata() -> dict[str, object]:
    if not settings.is_configured:
        raise RuntimeError("MCP OAuth is not configured")

    return {
        "resource": settings.mcp_resource_url,
        "authorization_servers": [settings.supabase_auth_issuer],
        "scopes_supported": ["openid", "email", "profile"],
        "bearer_methods_supported": ["header"],
    }
