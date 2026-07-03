# GymTrackerAI

GymTrackerAI is a fitness logging and analytics monorepo. It combines a React frontend, a FastAPI backend, an MCP server, and a Telegram bot so workouts can be logged and queried from multiple surfaces while sharing the same core data model.

## Codebase Map

The repository is intentionally organized into four top-level domains:

```text
GymTrackerAI/
├── frontend/   # React + TypeScript app
├── backend/    # FastAPI API and core business logic
├── mcp/        # MCP server package
├── bot/        # Telegram bot client
└── PROJECT_STRUCTURE.md
```

For a directory-by-directory onboarding guide, read `PROJECT_STRUCTURE.md`.

## Architecture

- `frontend/` is the browser client and PWA built with React, TypeScript, and Vite.
- `backend/` owns the API, scheduling, Strava sync, Supabase integration, analytics, and serves the built frontend in production.
- `mcp/` exposes RepCount functionality through an MCP server and is also mounted by the backend at `/mcp`.
- `bot/` is a thin Telegram client that forwards natural-language workout logs to the backend.

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- A Supabase project

### Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

### Environment

Create a root `.env` or `backend/.env` with the values your workflow needs:

```dotenv
SUPABASE_URL=...
SUPABASE_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_REFRESH_TOKEN=...
TELEGRAM_TOKEN=...
BOT_API_KEY=...
FASTAPI_ENDPOINT=http://localhost:8002/api/log/quick
```

Frontend-only variables are documented in `frontend/.env.example`.

## Running The App

Start the backend and frontend together:

```bash
./dev.sh
```

This starts:

- FastAPI on `http://localhost:8002`
- Vite on `http://localhost:5173`

## Service-Specific Notes

- Backend entrypoint: `backend/app/main.py`
- Frontend entrypoint: `frontend/src/App.tsx`
- MCP standalone runner: `python mcp/run_server.py`
- Bot runner: `python bot/bot.py`

See the colocated docs for deeper setup:

- `mcp/README.md`
- `bot/README.md`
- `PROJECT_STRUCTURE.md`
