from pydantic import BaseModel
from typing import List, Optional

class WorkoutEntry(BaseModel):
    id: Optional[str] = None
    exercise: str
    weight: float
    weightUnit: str = "kg"
    sets: int
    reps: int
    notes: str = ""

class StravaActivity(BaseModel):
    name: str
    type: str
    durationSeconds: int
    avgHeartrate: Optional[float] = None
    maxHeartrate: Optional[float] = None
    distanceMeters: float = 0.0
    elevationGain: Optional[float] = None
    avgSpeedMps: Optional[float] = None
    maxSpeedMps: Optional[float] = None
    avgCadence: Optional[float] = None
    avgTemp: Optional[float] = None
    calories: Optional[float] = None

class WorkoutSession(BaseModel):
    id: str
    date: str
    entries: List[WorkoutEntry]
    rawInput: str = ""
    inferredSplit: Optional[str] = None
    totalVolumeKg: float = 0.0
    totalReps: int = 0
    durationMins: Optional[float] = None
    avgHeartRate: Optional[float] = None
    activityNames: List[str] = []
    stravaActivities: List[StravaActivity] = []

class ParsedWorkoutEntry(BaseModel):
    id: Optional[str] = None
    date: str
    exercise_name: str
    weight: Optional[float] = None
    unit: str = "kg"
    reps: int
    failure: bool = False
    rir: Optional[int] = None
    notes: Optional[str] = None

class ParsedWorkoutLog(BaseModel):
    entries: List[ParsedWorkoutEntry]
