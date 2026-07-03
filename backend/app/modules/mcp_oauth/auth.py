from __future__ import annotations

from dataclasses import dataclass

import httpx

from .config import settings


@dataclass(frozen=True)
class AuthenticatedMcpUser:
    id: str
    email: str | None
    access_token: str


async def verify_supabase_access_token(token: str) -> AuthenticatedMcpUser | None:
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )

    if response.status_code != 200:
        return None

    payload = response.json()
    user = payload.get("user") or payload
    user_id = user.get("id")
    if not user_id:
        return None

    return AuthenticatedMcpUser(
        id=user_id,
        email=user.get("email"),
        access_token=token,
    )
