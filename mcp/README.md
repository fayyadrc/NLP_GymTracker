# RepCount MCP

Lean MCP server for RepCount workout queries and writes.

## Goals

- One public tool: `repcount_action`
- Compact responses for lower token overhead
- Server-side filtering and aggregation
- Direct `Supabase` integration

## Commands

- `log_workout`: parse and optionally write workout logs
- `get_latest`: fetch the latest compact session summary
- `get_stats`: return recent volume and frequency aggregates

## Local setup

1. Install dependencies:
   ```bash
   pip install -r mcp/requirements.txt
   ```
2. Set environment variables in the repo `.env`:
   ```bash
   SUPABASE_URL=...
   SUPABASE_KEY=...
   ```
3. Run the MCP server directly:
   ```bash
   python mcp/run_server.py
   ```

   Or use the existing backend app and visit the mounted endpoint at `/mcp`.

## Tool contract

Tool: `repcount_action`

Description: `Handles gym data queries and updates.`

Input shape:

```json
{
  "command": "get_latest",
  "payload": {
    "include_entries": false
  }
}
```

## Notes

- `log_workout` reuses the existing workout parser from `backend/app/modules/history/service.py`.
- `get_latest` and `get_stats` intentionally return summaries instead of broad history payloads.
- The existing FastAPI app mounts the MCP endpoint at `/mcp`, which is suitable for using the same Render service for Claude Mobile/Web.
- For Claude connector setup, see `mcp/CLAUDE_CONNECTOR.md`.
