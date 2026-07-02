# RepCount MCP Rules

Use the single tool `repcount_action` for all RepCount database access.

## Commands

### `log_workout`
- Purpose: Parse natural-language workout text into database-ready records.
- Required payload:
```json
{
  "raw_text": "bench 60 x 8, 60 x 6",
  "dry_run": false
}
```
- Use `dry_run: true` when the user wants a preview before writing.

### `get_latest`
- Purpose: Return the most recent workout session summary.
- Optional payload:
```json
{
  "exercise": "Bench Press",
  "include_entries": false
}
```
- Prefer `include_entries: false` unless the user explicitly needs set-level detail.

### `get_stats`
- Purpose: Return compact training aggregates without large record dumps.
- Optional payload:
```json
{
  "days": 30,
  "exercise": "Bench Press"
}
```
- Keep `days` narrow unless the user asks for a longer trend.

## Response Discipline

- Ask for summaries, not full database dumps.
- Prefer filtered queries over open-ended history requests.
- Return only the fields needed for the current question.
