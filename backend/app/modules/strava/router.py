from fastapi import APIRouter, HTTPException
from .service import sync_strava_data

router = APIRouter()

@router.post("/strava/sync")
async def trigger_strava_sync():
    """
    Manually triggers a Strava data sync.
    Runs synchronously so the frontend can refresh data immediately after completion.
    """
    try:
        sync_strava_data()
        return {"status": "success", "message": "Strava sync completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
