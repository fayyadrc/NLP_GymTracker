from functools import lru_cache

from mcp.server.fastmcp import FastMCP

from .config import settings
from .dispatcher import RepCountDispatcher
from .repository import get_repository


mcp = FastMCP(settings.server_name)
mcp.settings.streamable_http_path = "/"
mcp.settings.stateless_http = True
mcp.settings.json_response = True


def get_streamable_http_app():
    """ASGI app for mounting at /mcp on the FastAPI backend."""
    return mcp.streamable_http_app()


@lru_cache(maxsize=1)
def get_dispatcher() -> RepCountDispatcher:
    return RepCountDispatcher(get_repository())


@mcp.tool(
    name="repcount_action",
    description="Handles gym data queries and updates.",
)
def repcount_action(command: str, payload: dict = None) -> dict:
    """Single-entry tool for lean RepCount operations."""
    return get_dispatcher().dispatch(command=command, payload=payload or {})


def main() -> None:
    mcp.run(transport=settings.transport)
