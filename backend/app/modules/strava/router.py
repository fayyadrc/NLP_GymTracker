from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from .service import sync_strava_data, upload_strength_workout

router = APIRouter()

class WorkoutSet(BaseModel):
    exercise_type: str
    repetitions: int
    weight: float
    duration: Optional[int] = None

class WorkoutUploadPayload(BaseModel):
    name: str
    start_time: str
    duration: int
    sets: List[WorkoutSet]

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

@router.post("/strava/upload")
async def trigger_strava_upload(workout: WorkoutUploadPayload):
    """
    Pushes a completed RepCount workout to Strava using the new JSON file spec
    for weight training activities, including individual set data.
    """
    try:
        result = upload_strength_workout(workout.dict())
        return {"status": "success", "data": result, "message": "Strength data pushed to Strava"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
