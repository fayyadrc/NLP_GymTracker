from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse

from ...core import dotenv_loader  # noqa: F401
from ...core.app_url import get_public_app_url


@dataclass(frozen=True)
class McpOAuthSettings:
    @property
    def supabase_url(self) -> str | None:
        return os.getenv("SUPABASE_URL")

    @property
    def supabase_anon_key(self) -> str | None:
        return os.getenv("SUPABASE_ANON_KEY")

    @property
    def public_app_url(self) -> str | None:
        return get_public_app_url()

    @property
    def mcp_resource_url(self) -> str | None:
        if not self.public_app_url:
            return None
        return f"{self.public_app_url}/mcp"

    @property
    def protected_resource_metadata_url(self) -> str | None:
        if not self.public_app_url:
            return None
        return f"{self.public_app_url}/.well-known/oauth-protected-resource"

    @property
    def supabase_auth_issuer(self) -> str | None:
        if not self.supabase_url:
            return None
        parsed = urlparse(self.supabase_url)
        return f"{parsed.scheme}://{parsed.netloc}/auth/v1"

    @property
    def is_configured(self) -> bool:
        return bool(
            self.supabase_url
            and self.supabase_anon_key
            and self.public_app_url
            and self.mcp_resource_url
            and self.supabase_auth_issuer
        )


settings = McpOAuthSettings()
