from __future__ import annotations

from functools import lru_cache

from mcp.server.fastmcp import FastMCP

from .config import settings
from .dispatcher import RepCountDispatcher
from .repository import get_repository


mcp = FastMCP(settings.server_name)


@lru_cache(maxsize=1)
def get_dispatcher() -> RepCountDispatcher:
    return RepCountDispatcher(get_repository())


@mcp.tool(
    name="repcount_action",
    description="Handles gym data queries and updates.",
)
def repcount_action(command: str, payload: dict | None = None) -> dict:
    """Single-entry tool for lean RepCount operations."""
    return get_dispatcher().dispatch(command=command, payload=payload or {})


def main() -> None:
    mcp.run(transport=settings.transport)
