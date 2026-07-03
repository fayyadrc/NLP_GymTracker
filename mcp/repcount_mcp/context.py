from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass


@dataclass(frozen=True)
class McpRequestContext:
    user_id: str
    access_token: str


mcp_request_context: ContextVar[McpRequestContext | None] = ContextVar(
    "mcp_request_context",
    default=None,
)
