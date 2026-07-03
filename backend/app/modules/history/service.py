import os
import json
from typing import List, Optional
from collections import defaultdict
import uuid
import httpx
from .schemas import WorkoutSession, WorkoutEntry, StravaActivity, ParsedWorkoutLog
from .date_utils import normalize_parsed_dates
from ..analytics.muscle_mapping import get_muscle_info, normalize_exercise_name
from ..analytics.split_inference import infer_workout_split

from ...core import dotenv_loader
from datetime import date, timedelta

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

class HistoryService:
    @staticmethod
    def process_workout_history(gym_data: list, strava_data: list) -> List[WorkoutSession]:
        # group by date
        gym_by_date = defaultdict(list)
        for log in gym_data:
            # Normalize to YYYY-MM-DD
            d = log.get("date")
            if d:
                date_str = str(d).split('T')[0].strip()
                gym_by_date[date_str].append(log)

        strava_by_date = defaultdict(list)
        for activity in strava_data:
            # Normalize to YYYY-MM-DD
            d = activity.get("start_date")
            if d:
                date_str = str(d).split('T')[0].strip()
                strava_by_date[date_str].append(activity)

        all_dates = sorted(set(gym_by_date.keys()) | set(strava_by_date.keys()), reverse=True)

        sessions: List[WorkoutSession] = []

        for date_str in all_dates:
            logs = gym_by_date.get(date_str, [])
            activities = strava_by_date.get(date_str, [])

            # Process gym entries
            entries = []
            total_volume = 0.0
            total_reps = 0
            for log in logs:
                weight = float(log.get("weight", 0) or 0)
                sets = int(log.get("set_number", 1) or 1)
                reps = int(log.get("reps", 0) or 0)
                
                total_volume += weight * sets * reps
                total_reps += sets * reps
                
                # Build a descriptive note string for the UI
                rir_val = log.get("rir")
                failure_val = log.get("to_failure")
                base_notes = log.get("notes") or ""
                
                enhanced_notes = []
                if failure_val: enhanced_notes.append("To failure")
                if rir_val is not None: enhanced_notes.append(f"RIR {rir_val}")
                if base_notes: enhanced_notes.append(base_notes)
                
                entries.append(WorkoutEntry(
                    id=log.get("id"),
                    exercise=log.get("exercise", "Unknown"),
                    weight=weight,
                    weightUnit=log.get("weight_unit", "kg"),
                    sets=sets,
                    reps=reps,
                    notes=". ".join(enhanced_notes)
                ))

            # Process Strava activities
            strava_list = []
            activity_names = []
            total_duration_secs = 0
            weight_hr_sum = 0
            weight_hr_count = 0

            for act in activities:
                name = act.get("name", "Unknown")
                act_type = act.get("type", "Unknown")
                duration = int(act.get("duration_seconds", 0))
                avg_hr = act.get("avg_heartrate")
                max_hr = act.get("max_heartrate")
                distance = float(act.get("distance_meters", 0))

                activity_names.append(name)
                total_duration_secs += duration

                if act_type == "WeightTraining" and avg_hr:
                    weight_hr_sum += float(avg_hr)
                    weight_hr_count += 1

                strava_list.append(StravaActivity(
                    name=name,
                    type=act_type,
                    durationSeconds=duration,
                    avgHeartrate=float(avg_hr) if avg_hr else None,
                    maxHeartrate=float(max_hr) if max_hr else None,
                    distanceMeters=distance,
                    elevationGain=float(act.get("elevation_gain")) if act.get("elevation_gain") is not None else None,
                    avgSpeedMps=float(act.get("avg_speed_mps")) if act.get("avg_speed_mps") is not None else None,
                    maxSpeedMps=float(act.get("max_speed_mps")) if act.get("max_speed_mps") is not None else None,
                    avgCadence=float(act.get("avg_cadence")) if act.get("avg_cadence") is not None else None,
                    avgTemp=float(act.get("avg_temp")) if act.get("avg_temp") is not None else None,
                    calories=float(act.get("calories")) if act.get("calories") is not None else None
                ))

            avg_heart_rate = (weight_hr_sum / weight_hr_count) if weight_hr_count > 0 else None
            duration_mins = total_duration_secs / 60.0 if total_duration_secs > 0 else None

            exercise_names = [e.exercise for e in entries]
            inferred_split = None
            if exercise_names:
                inferred_split = infer_workout_split(exercise_names)
            elif strava_list and not entries:
                inferred_split = "Cardio"

            session = WorkoutSession(
                id=f"session-{date_str}",
                date=date_str,
                entries=entries,
                rawInput="Fetched from database",
                inferredSplit=inferred_split,
                totalVolumeKg=round(total_volume, 2),
                totalReps=total_reps,
                durationMins=round(duration_mins, 2) if duration_mins else None,
                avgHeartRate=round(avg_heart_rate, 1) if avg_heart_rate else None,
                activityNames=activity_names,
                stravaActivities=strava_list
            )
            sessions.append(session)

        return sessions

    @staticmethod
    def _validate_parsed_workout_json(response: str) -> ParsedWorkoutLog:
        """Drop incomplete LLM rows (e.g. missing reps) before schema validation."""
        payload = json.loads(response)
        entries = payload.get("entries", [])
        complete_entries = [
            entry for entry in entries
            if isinstance(entry.get("reps"), int) and entry.get("reps") > 0
        ]
        return ParsedWorkoutLog.model_validate({"entries": complete_entries})

    @staticmethod
    def parse_raw_workout(raw_text: str) -> ParsedWorkoutLog:
        """
        Takes raw string and uses Groq/OpenRouter to parse them into structured JSON
        """
        today = date.today()
        current_today = today.isoformat()
        current_yesterday = (today - timedelta(days=1)).isoformat()
        system_prompt = f"""
        You are a fitness workout data extraction agent.
        Your task is to convert raw, unstructured workout logs into structured data.

        ## CORE RULES
        1. Extract ALL exercises and their sets.
        2. Each set must be a separate record/row.
        3. Preserve the order of exercises and sets as written.

        ## FIELD EXTRACTION RULES
        ### Exercise Name
        - Normalize to consistent canonical names (Title Case).
        - Map abbreviations and typos: "pec dec" -> "Pec Deck", "DB" -> "Dumbbell", "RDL" stays "RDL".
        - Strip redundant equipment prefixes when the exercise is clear: "Machine Pec Dec" -> "Pec Deck".
        - Use singular form: "flies" -> "Fly", "curls" -> "Curl".
        - Prefer standard names: "reverse cable rear delt flies" -> "Rear Delt Fly", "lat pulldown" -> "Lat Pulldown".
        - Do NOT invent grip/equipment qualifiers unless the user explicitly wrote them.

        ### Weight
        - Extract numeric weight value.
        - If weight is explicitly given in "plates" (e.g., "8 plates"), set the weight to that number (e.g., 8) and set unit to "Plate". DO NOT calculate kg.
        - If a numeric weight is provided without an explicit unit:
            - If the weight is <= 10, assume the unit is "Plate".
            - If the weight is > 10, assume the unit is "kg".
        - If no weight mentioned, set weight = null.

        ### Reps
        - Extract number of repetitions (must be an integer).
        - Skip any set line that does not include a rep count (e.g. "80kgs for" with no number after "for").

        ### Effort / Intensity
        - "rir X" -> rir = X
        - "failure" -> failure = true

        ### Date Handling
        - Normalize to ISO format: YYYY-MM-DD.
        - Today's date is: {current_today}
        - Yesterday's date is: {current_yesterday}
        - If the user mentions a specific calendar date (e.g. "June 29", "29th of June", "on the 29th of june"), assign ALL sets from that workout block to that date.
        - If the log contains multiple date headers (e.g. "18th May" then later "14th May"), assign each block of exercises to the nearest date header above it.
        - Relative phrases like "yesterday" and "today" should resolve against today's date above.
        - Use today's date only when no date is mentioned anywhere in the workout text.

        Return structured JSON ONLY in this format:
        {{
            "entries": [
                {{
                    "date": "YYYY-MM-DD",
                    "exercise_name": "...",
                    "weight": number or null,
                    "unit": "kg",
                    "reps": number,
                    "failure": boolean,
                    "rir": number or null,
                    "notes": "..."
                }}
            ]
        }}
        """

        user_prompt = f"Parse this workout log:\n{raw_text}"

        parsed: ParsedWorkoutLog | None = None

        # 1. Try Groq
        if GROQ_API_KEY:
            try:
                print("Attempting to parse with Groq...")
                response = HistoryService._call_groq(system_prompt, user_prompt)
                parsed = HistoryService._validate_parsed_workout_json(response)
            except Exception as e:
                print(f"Groq parsing failed: {e}")

        # 2. Try OpenRouter Fallback
        if parsed is None and OPENROUTER_API_KEY:
            try:
                print("Attempting to parse with OpenRouter...")
                response = HistoryService._call_openrouter(system_prompt, user_prompt)
                parsed = HistoryService._validate_parsed_workout_json(response)
            except Exception as e:
                print(f"OpenRouter parsing failed: {e}")

        if parsed is None:
            raise Exception("Failed to parse workout using available LLM providers.")

        return normalize_parsed_dates(raw_text, parsed, today)

    @staticmethod
    def _call_groq(system_prompt: str, user_prompt: str) -> str:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=data, timeout=30.0)
            resp.raise_for_status()
            result = resp.json()
            return result["choices"][0]["message"]["content"]

    @staticmethod
    def _call_openrouter(system_prompt: str, user_prompt: str) -> str:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/fayyadrc/GymTrackerAI", # Required by OpenRouter
            "X-Title": "GymTrackerAI"
        }
        data = {
            "model": "meta-llama/llama-3.3-70b-instruct",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1
        }
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=data, timeout=30.0)
            resp.raise_for_status()
            result = resp.json()
            content = result["choices"][0]["message"]["content"]
            
            # Clean up potential markdown blocks from OpenRouter if it doesn't support json_mode perfectly
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return content

    @staticmethod
    def update_log(log_id: str, entry: WorkoutEntry) -> bool:
        from ...db.supabase import supabase
        if not supabase:
            return False
            
        canonical_name = normalize_exercise_name(entry.exercise)
        data = {
            "exercise": canonical_name,
            "exercise_name": canonical_name,
            "exercise_group": get_muscle_info(canonical_name)["main_group"],
            "sub_muscle_group": get_muscle_info(canonical_name)["sub_group"],
            "weight": entry.weight,
            "weight_unit": entry.weightUnit,
            "reps": entry.reps,
            "notes": entry.notes
        }
        
        try:
            supabase.table("gym_logs").update(data).eq("id", log_id).execute()
            return True
        except Exception as e:
            print(f"Error updating log: {e}")
            return False

    @staticmethod
    def delete_log(log_id: str) -> bool:
        from ...db.supabase import supabase
        if not supabase:
            return False
            
        try:
            supabase.table("gym_logs").delete().eq("id", log_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting log: {e}")
            return False
