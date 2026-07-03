from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse

from .config import settings
from .metadata import build_protected_resource_metadata
from .oauth_pages import render_oauth_consent_page, render_oauth_login_page

router = APIRouter(tags=["MCP OAuth"])


@router.get("/oauth/login", response_class=HTMLResponse)
async def oauth_login_page(redirect: str = Query(default="/oauth/consent")) -> HTMLResponse:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="OAuth pages are not configured")
    return HTMLResponse(render_oauth_login_page(redirect=redirect))


@router.get("/oauth/consent", response_class=HTMLResponse)
async def oauth_consent_page() -> HTMLResponse:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="OAuth pages are not configured")
    return HTMLResponse(render_oauth_consent_page())


@router.get("/.well-known/oauth-protected-resource")
async def oauth_protected_resource_metadata() -> JSONResponse:
    if not settings.is_configured:
        raise HTTPException(status_code=503, detail="MCP OAuth is not configured")
    return JSONResponse(build_protected_resource_metadata())


@router.get("/.well-known/oauth-protected-resource/mcp")
async def oauth_protected_resource_metadata_with_path() -> JSONResponse:
    return await oauth_protected_resource_metadata()
