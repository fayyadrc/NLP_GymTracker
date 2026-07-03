# RepCount Bot

This directory contains the Telegram bot integration for GymTrackerAI.

## Purpose

The bot is intentionally thin:

- receives Telegram messages
- forwards raw workout text to `backend` via `/api/log/quick`
- returns a compact summary back to the user

That keeps workout parsing and write logic centralized in the backend instead of duplicating business rules in the bot.

## Files

- `bot.py`: Telegram polling process and request/response handling
- `requirements.txt`: bot-only Python dependencies

## Setup

```bash
source .venv/bin/activate
pip install -r bot/requirements.txt
python bot/bot.py
```

## Required Environment

Set these in `backend/.env` or your shell environment:

```dotenv
TELEGRAM_TOKEN=...
BOT_API_KEY=...
FASTAPI_ENDPOINT=http://localhost:8002/api/log/quick
TELEGRAM_ALLOWED_CHAT_ID=123456789
```

## Relationship To The Rest Of The Repo

- `frontend/` is the browser app
- `backend/` is the source of truth for API and parsing
- `mcp/` is the machine-client integration
- `bot/` is the chat-client integration
