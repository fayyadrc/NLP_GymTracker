# Project Structure

## Top-Level Domains

This repository is organized around four product surfaces:

```text
GymTrackerAI/
├── frontend/   # React + TypeScript client
├── backend/    # FastAPI API, business logic, Supabase integration
├── mcp/        # RepCount MCP server and tests
├── bot/        # Telegram bot client for workout logging
├── dev.sh      # Local full-stack dev entrypoint
├── render.yaml # Render deployment config
└── README.md   # Project setup and architecture overview
```

## Where To Start

If you are new to the codebase, read in this order:

1. `README.md` for product context, setup, and architecture.
2. `backend/app/main.py` to understand how the web app, API, and MCP endpoint are composed.
3. `frontend/src/App.tsx` to see app entrypoints and high-level navigation.
4. `mcp/README.md` or `bot/README.md` if you are working on those integrations.

## Directory Guide

### `frontend/`

User-facing React app built with Vite.

- `src/components/views/`: page-level views like `QuickLog`, `History`, and `Analytics`
- `src/components/layout/`: app chrome and shared layout
- `src/components/history/`: workout history presentation
- `src/components/quick-log/`: natural-language logging UI
- `src/components/oauth/`: OAuth login and consent screens for MCP auth
- `src/components/ui/`: reusable UI primitives
- `src/lib/`: app state, API helpers, domain utilities, and shared types
- `src/hooks/`: React hooks

### `backend/`

FastAPI app plus domain services and operational scripts.

- `app/main.py`: API bootstrap, scheduler, SPA serving, and MCP mount
- `app/core/`: environment/config helpers
- `app/db/`: Supabase client setup
- `app/modules/history/`: workout logging, merge logic, and history endpoints
- `app/modules/analytics/`: analytics, recommendations, and split inference
- `app/modules/strava/`: Strava sync services and routes
- `app/modules/health/`: health check routes and keep-alive logic
- `app/modules/mcp_oauth/`: OAuth and request middleware used by MCP clients
- `dev_tools/`: one-off scripts and local diagnostics
- `data/`: seed/import artifacts and cached generated data

### `mcp/`

Standalone MCP server package that can run independently or be mounted by the backend.

- `repcount_mcp/server.py`: MCP server definition and transport wiring
- `repcount_mcp/dispatcher.py`: command dispatch and tool behavior
- `repcount_mcp/repository.py`: Supabase-backed data access
- `tests/`: focused MCP tests

### `bot/`

External Telegram bot client that forwards natural-language workout logs to the backend.

- `bot.py`: polling bot process and message handlers
- `requirements.txt`: bot-only dependencies
- `README.md`: setup and deployment notes

## Working Conventions

- Keep product code inside one of the four top-level domains rather than at repo root.
- Treat `backend/app/modules/` as the backend's feature boundary.
- Put reusable frontend domain logic in `frontend/src/lib/` and view-specific UI in `frontend/src/components/`.
- Keep integration-specific docs close to their integration (`mcp/README.md`, `bot/README.md`).
- Use root docs only for repo-wide setup and architecture.

## What Was Removed

The old `overview.md` file was replaced by this document so there is one canonical onboarding map instead of overlapping root-level docs.
