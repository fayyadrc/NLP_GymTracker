
from typing import Dict, List, Any
from datetime import datetime, timedelta
from collections import defaultdict
from ...db.supabase import supabase
from .muscle_mapping import get_muscle_info, normalize_exercise_name

class AnalyticsService:
    @staticmethod
    def get_dashboard_stats() -> Dict[str, Any]:
        if not supabase:
            return {}

        # 1. Fetch all gym logs and strava activities
        try:
            gym_response = supabase.table("gym_logs").select("*").execute()
            gym_data = gym_response.data or []
        except Exception as e:
            print(f"Error fetching gym logs: {e}")
            gym_data = []

        try:
            strava_response = supabase.table("strava_activities").select("*").execute()
            strava_data = strava_response.data or []
        except Exception as e:
            print(f"Error fetching strava activities: {e}")
            strava_data = []

        # 2. Calculate Total Workouts (Unique dates with any activity)
        gym_dates = {log.get("date") for log in gym_data if log.get("date")}
        strava_dates = {activity.get("start_date", "").split("T")[0] for activity in strava_data if activity.get("start_date")}
        
        all_activity_dates = gym_dates | strava_dates
        total_workouts = len(all_activity_dates)

        # 3. Calculate Workouts This Week (Unique dates this week)
        now = datetime.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        week_activity_dates = set()
        for date_str in all_activity_dates:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                if dt >= start_of_week:
                    week_activity_dates.add(date_str)
            except:
                continue

        workouts_this_week = len(week_activity_dates)

        # 4. Volume per Muscle Group & Detailed Exercise Analytics
        exercise_stats = {}

        def calc_1rm(w: float, r: int) -> float:
            if r <= 0 or w <= 0:
                return 0.0
            if r == 1:
                return w
            return round(w * (1 + r / 30.0), 1)

        # Pass 1: Find the maximum e1RM achieved per exercise per session date
        max_e1rm_per_session = defaultdict(float)
        for log in gym_data:
            exercise_raw = log.get("exercise") or log.get("exercise_name")
            if not exercise_raw or exercise_raw.lower() == "unknown":
                continue
            exercise = normalize_exercise_name(exercise_raw)
            ex_key = exercise.lower()
            
            weight = float(log.get("weight") or 0)
            reps = int(log.get("reps") or 0)
            log_date = log.get("date")
            if log_date:
                norm_date = str(log_date).split("T")[0]
                e1rm = calc_1rm(weight, reps)
                session_key = (ex_key, norm_date)
                if e1rm > max_e1rm_per_session[session_key]:
                    max_e1rm_per_session[session_key] = e1rm

        # Pass 2: Count "Hard Sets" (>= 70% of session max e1RM) per muscle group
        hard_sets_by_muscle = defaultdict(int)

        for log in gym_data:
            exercise_raw = log.get("exercise") or log.get("exercise_name")
            if not exercise_raw or exercise_raw.lower() == "unknown":
                continue

            exercise = normalize_exercise_name(exercise_raw)
            muscle = get_muscle_info(exercise)["sub_group"]
            weight = float(log.get("weight") or 0)
            reps = int(log.get("reps") or 0)
            unit = log.get("weight_unit") or log.get("unit") or "kg"
            log_date = log.get("date")

            ex_name = exercise
            ex_key = ex_name.lower()
            
            if unit.lower() in ["plate", "plates"]:
                norm_unit = "plates"
            else:
                norm_unit = unit.lower()

            est_1rm = calc_1rm(weight, reps) if norm_unit == "kg" else 0.0

            # Determine if this set is a "Hard Set"
            is_hard_set = False
            if log_date:
                norm_date = str(log_date).split("T")[0]
                max_session_e1rm = max_e1rm_per_session[(ex_key, norm_date)]
                if max_session_e1rm > 0 and est_1rm >= 0.7 * max_session_e1rm:
                    is_hard_set = True

            if is_hard_set:
                hard_sets_by_muscle[muscle] += 1

            if ex_key not in exercise_stats:
                exercise_stats[ex_key] = {
                    "name": ex_name.title(),
                    "max_weight": weight,
                    "unit": norm_unit,
                    "total_sets": 0,
                    "total_reps": 0,
                    "total_volume": 0.0,
                    "total_hard_sets": 0,
                    "history_by_date": {}
                }

            stats = exercise_stats[ex_key]
            stats["total_sets"] += 1
            stats["total_reps"] += reps
            stats["total_volume"] += weight * reps
            if is_hard_set:
                stats["total_hard_sets"] += 1

            if weight > stats["max_weight"]:
                stats["max_weight"] = weight
                stats["unit"] = norm_unit

            if log_date:
                norm_date = str(log_date).split("T")[0]
                day_history = stats["history_by_date"].get(norm_date)
                
                volume = weight * reps
                
                if not day_history:
                    stats["history_by_date"][norm_date] = {
                        "date": norm_date,
                        "weight": weight,
                        "reps": reps,
                        "volume": volume,
                        "est_1rm": est_1rm
                    }
                else:
                    if weight > day_history["weight"] or (weight == day_history["weight"] and reps > day_history["reps"]):
                        day_history["weight"] = weight
                        day_history["reps"] = reps
                        day_history["est_1rm"] = max(day_history["est_1rm"], est_1rm)
                    day_history["volume"] += volume

        # Format volume data for chart (now representing Hard Sets count per muscle)
        volume_data = [
            {"muscle": m, "volume": v} 
            for m, v in sorted(hard_sets_by_muscle.items(), key=lambda x: x[1], reverse=True)
        ]

        # 5. Most / Least Trained
        if volume_data:
            most_trained = volume_data[0]["muscle"]
            non_other = [d for d in volume_data if d["muscle"] != "Other"]
            least_trained = non_other[-1]["muscle"] if non_other else volume_data[-1]["muscle"]
        else:
            most_trained = "N/A"
            least_trained = "N/A"

        # Finalize and group exercise statistics by primary muscle group
        exercises_by_muscle = defaultdict(list)
        for ex_key, stats in exercise_stats.items():
            sorted_history = sorted(stats["history_by_date"].values(), key=lambda x: x["date"])
            stats["history"] = sorted_history
            del stats["history_by_date"]
            
            muscle = get_muscle_info(stats["name"])["sub_group"]
            exercises_by_muscle[muscle].append(stats)

        formatted_exercises_by_muscle = {}
        for muscle, ex_list in exercises_by_muscle.items():
            formatted_exercises_by_muscle[muscle] = sorted(ex_list, key=lambda x: x["name"])

        return {
            "total_workouts": total_workouts,
            "workouts_this_week": workouts_this_week,
            "volume_per_muscle": volume_data,
            "most_trained": most_trained,
            "least_trained": least_trained,
            "gym_session_count": len(gym_dates),
            "strava_activity_count": len(strava_dates),
            "exercises_by_muscle": formatted_exercises_by_muscle
        }
