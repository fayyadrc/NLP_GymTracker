# Backend

The backend is a FastAPI application that owns the main business logic for GymTrackerAI.

## Key Responsibilities

- serve the API used by the frontend and bot
- mount the MCP server at `/mcp`
- parse natural-language workout logs
- merge gym and Strava history
- compute analytics and recommendations
- serve the built frontend in production

## Important Locations

- `app/main.py`: application bootstrap and route registration
- `app/modules/history/`: workout logging and history APIs
- `app/modules/analytics/`: analytics and recommendation logic
- `app/modules/strava/`: Strava integration
- `app/modules/mcp_oauth/`: OAuth flow and MCP auth middleware
- `app/modules/health/`: health checks and keep-alive
- `dev_tools/`: one-off scripts and local diagnostics
