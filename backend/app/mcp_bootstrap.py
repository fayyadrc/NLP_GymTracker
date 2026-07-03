"""Ensure the local MCP package is importable in dev and production."""

from __future__ import annotations

import os
import sys


def ensure_mcp_on_path() -> None:
    """Add the repo's `mcp/` directory to sys.path when not pip-installed."""
    repo_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    mcp_dir = os.path.join(repo_root, "mcp")
    if os.path.isdir(mcp_dir) and mcp_dir not in sys.path:
        sys.path.insert(0, mcp_dir)
