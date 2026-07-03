import os
import sys
from contextlib import asynccontextmanager, AsyncExitStack
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import mimetypes
from .core import dotenv_loader

# Ensure common web types are registered correctly
mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

from apscheduler.schedulers.background import BackgroundScheduler
from .modules.health.router import router as health_router
from .modules.health.service import keep_alive_ping
from .modules.history.router import router as history_router
from .modules.strava.router import router as strava_router
from .modules.strava.service import sync_strava_data
from .modules.analytics.router import router as analytics_router
from .modules.mcp_oauth.middleware import McpAuthMiddleware
from .modules.mcp_oauth.router import router as mcp_oauth_router

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MCP_DIR = os.path.join(BASE_DIR, "mcp")
if MCP_DIR not in sys.path:
    sys.path.append(MCP_DIR)

from repcount_mcp.server import get_streamable_http_app, mcp as repcount_mcp

mcp_http_app = get_streamable_http_app()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("⏳ Starting background scheduler...")
    scheduler = BackgroundScheduler()
    # Run every 12 hours
    scheduler.add_job(sync_strava_data, 'interval', hours=12)

    # Ping self every 14 minutes to keep Render instance awake
    scheduler.add_job(keep_alive_ping, 'interval', minutes=14)

    async with AsyncExitStack() as stack:
        await stack.enter_async_context(repcount_mcp.session_manager.run())
        scheduler.start()
        try:
            yield
        finally:
            print("🛑 Shutting down background scheduler...")
            scheduler.shutdown()

app = FastAPI(title="GymTracker API", lifespan=lifespan)

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from the frontend/dist directory
# This assumes the file is in backend/app/main.py and we want to reach frontend/dist
frontend_dist_path = os.path.join(BASE_DIR, "frontend", "dist")

print(f"📂 Serving frontend from: {frontend_dist_path}")
print(f"🏠 Project root: {BASE_DIR}")

# Include routers
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(history_router, prefix="/api", tags=["History"])
app.include_router(strava_router, prefix="/api", tags=["Strava"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(mcp_oauth_router)
app.add_middleware(McpAuthMiddleware)
app.mount("/mcp", mcp_http_app)

# Catch-all route to serve the frontend (SPA routing and static files)
@app.get("/{rest_of_path:path}")
async def serve_frontend(rest_of_path: str):
    # If the path looks like an API call but wasn't caught by the routers above, return 404
    if rest_of_path.startswith("api/") or rest_of_path.startswith(".well-known/") or rest_of_path.startswith("oauth/"):
        return JSONResponse(status_code=404, content={"detail": f"API endpoint '{rest_of_path}' not found"})
    
    # 1. Check if the requested path corresponds to a real file in the dist directory
    # (e.g., assets/index-xxx.js, vite.svg, favicon.ico)
    if rest_of_path:
        file_path = os.path.join(frontend_dist_path, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
    
    # 2. Fallback to index.html for SPA routing (e.g., /dashboard, /history)
    index_path = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    # 3. Fallback message if frontend isn't built yet
    return JSONResponse(
        status_code=404,
        content={
            "message": "GymTracker AI API is running, but the frontend has not been built yet or the requested file was not found.",
            "health_check": "/api/health",
            "mcp_endpoint": "/mcp",
            "docs": "/docs",
            "path_attempted": rest_of_path
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
