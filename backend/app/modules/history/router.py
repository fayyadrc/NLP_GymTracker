import os
from fastapi import APIRouter, HTTPException, Request, Depends, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import List
from ...db.supabase import supabase
from .schemas import WorkoutSession, WorkoutEntry
from .service import HistoryService
from ..analytics.muscle_mapping import get_muscle_info, normalize_exercise_name

router = APIRouter()

# ---------------------------------------------------------------------------
# API Key authentication (used by the Telegram bot and any future bots/scripts)
# ---------------------------------------------------------------------------
_API_KEY_HEADER = APIKeyHeader(name="X-Bot-API-Key", auto_error=True)

def _require_api_key(api_key: str = Security(_API_KEY_HEADER)) -> str:
    """Validate the X-Bot-API-Key header against BOT_API_KEY env var."""
    expected = os.environ.get("BOT_API_KEY")
    if not expected or api_key != expected:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return api_key

class RawLogRequest(BaseModel):
    raw_text: str

def _insert_parsed_workout(parsed_data):
    records_to_insert = []

    for entry in parsed_data.entries:
        canonical_name = normalize_exercise_name(entry.exercise_name)
        entry.exercise_name = canonical_name
        records_to_insert.append({
            "date": entry.date,
            "exercise": canonical_name,
            "exercise_name": canonical_name,
            "exercise_group": get_muscle_info(canonical_name)["main_group"],
            "sub_muscle_group": get_muscle_info(canonical_name)["sub_group"],
            "weight": entry.weight if entry.weight is not None else 0.0,
            "weight_unit": entry.unit,
            "set_number": 1,
            "reps": entry.reps,
            "to_failure": entry.failure,
            "rir": entry.rir,
            "notes": entry.notes or ""
        })

    if records_to_insert:
        supabase.table("gym_logs").insert(records_to_insert).execute()

    return records_to_insert

@router.post("/log")
async def log_workout_web(log_data: RawLogRequest):
    """Web app logging endpoint (no API key required)."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")

    try:
        parsed_data = HistoryService.parse_raw_workout(log_data.raw_text)
    except Exception as e:
        print(f"Parsing error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse workout: {str(e)}")

    try:
        records_to_insert = _insert_parsed_workout(parsed_data)
        logged_dates = sorted({record["date"] for record in records_to_insert})
        return {
            "status": "success",
            "message": f"Successfully logged {len(records_to_insert)} sets.",
            "data": parsed_data,
            "logged_dates": logged_dates,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insertion error: {str(e)}")

@router.post("/log/parse")
async def parse_workout_preview(log_data: RawLogRequest):
    """Parse workout text without saving (used for live preview validation)."""
    try:
        parsed_data = HistoryService.parse_raw_workout(log_data.raw_text)
        logged_dates = sorted({entry.date for entry in parsed_data.entries})
        return {
            "status": "success",
            "data": parsed_data,
            "logged_dates": logged_dates,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse workout: {str(e)}")

@router.get("/history", response_model=List[WorkoutSession])
def get_workout_history():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")

    try:
        gym_response = supabase.table("gym_logs").select("*").execute()
        gym_data = gym_response.data
    except Exception as e:
        print(f"Error fetching gym logs (it may not exist yet): {e}")
        gym_data = []

    try:
        strava_response = supabase.table("strava_activities").select("*").execute()
        strava_data = strava_response.data
    except Exception as e:
        print(f"Error fetching strava activities: {e}")
        strava_data = []

    return HistoryService.process_workout_history(gym_data, strava_data)

@router.post("/log/quick")
async def quick_log_workout(
    request: Request,
    log_data: RawLogRequest,
    api_key: str = Depends(_require_api_key),
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")

    # Log raw body to debug 400 errors as suggested
    raw_body = await request.body()
    print("\n=== RAW REQUEST BODY ===")
    print(raw_body.decode('utf-8'))
    print("========================\n")

    # 1. Parse the text using the LLM Service (Groq/OpenRouter)
    try:
        parsed_data = HistoryService.parse_raw_workout(log_data.raw_text)
    except Exception as e:
        print(f"Parsing error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse workout: {str(e)}")

    try:
        records_to_insert = _insert_parsed_workout(parsed_data)
        logged_dates = sorted({record["date"] for record in records_to_insert})

        return {
            "status": "success", 
            "message": f"Successfully logged {len(records_to_insert)} sets.",
            "data": parsed_data,
            "logged_dates": logged_dates,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insertion error: {str(e)}")

@router.put("/history/log/{log_id}")
def update_workout_log(log_id: str, entry: WorkoutEntry):
    success = HistoryService.update_log(log_id, entry)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update workout log")
    return {"status": "success"}

@router.delete("/history/log/{log_id}")
def delete_workout_log(log_id: str):
    success = HistoryService.delete_log(log_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete workout log")
    return {"status": "success"}