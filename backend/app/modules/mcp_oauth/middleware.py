from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from ...mcp_bootstrap import ensure_mcp_on_path

ensure_mcp_on_path()

from repcount_mcp.context import McpRequestContext, mcp_request_context

from .auth import AuthenticatedMcpUser, verify_supabase_access_token
from .config import settings


class McpAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if not request.url.path.startswith("/mcp"):
            return await call_next(request)

        if request.method == "OPTIONS":
            return await call_next(request)

        if not settings.is_configured:
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.lower().startswith("bearer "):
            metadata_url = settings.protected_resource_metadata_url
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing bearer token"},
                headers={
                    "WWW-Authenticate": f'Bearer resource_metadata="{metadata_url}"',
                },
            )

        token = auth_header.split(" ", 1)[1].strip()
        user = await verify_supabase_access_token(token)
        if user is None:
            metadata_url = settings.protected_resource_metadata_url
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired bearer token"},
                headers={
                    "WWW-Authenticate": f'Bearer resource_metadata="{metadata_url}"',
                },
            )

        request.state.mcp_user = user
        token_context = mcp_request_context.set(
            McpRequestContext(user_id=user.id, access_token=user.access_token)
        )
        try:
            return await call_next(request)
        finally:
            mcp_request_context.reset(token_context)
