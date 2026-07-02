"""
Continuous Recommendation Service
==================================
A deterministic, sports-science-grounded engine that converts raw gym_logs
into evidence-based next-session weight recommendations.

Pipeline (per exercise):
  1. Calc e1RM  — normalise weight×reps into a single strength metric
  2. EWMA       — smooth the e1RM time-series to get a stable baseline
  3. Fatigue    — compare latest e1RM to EWMA baseline (% drop)
  4. Increment  — category-aware absolute increment, scaled by fatigue
  5. Confidence — min(1.0, sessions / 12)
  6. Audit      — human-readable reasoning string in the output payload
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional
from ...db.supabase import supabase

# ─── Constants ──────────────────────────────────────────────────────────────

# EWMA smoothing factor (0 < α ≤ 1).
# Lower → slower to react (more stable), Higher → faster to react.
EWMA_ALPHA: float = 0.3

# Number of sessions needed for maximum confidence score.
CONFIDENCE_SESSIONS: int = 12

# Absolute load increments per exercise category (kg)
INCREMENT_LOWER_COMPOUND: float = 5.0
INCREMENT_UPPER_COMPOUND: float = 2.5
INCREMENT_ISOLATION: float = 1.0

# Fatigue thresholds (% drop from EWMA baseline, expressed as 0–1 fractions)
THRESHOLD_OVERREACHING: float = 0.15   # 15%
THRESHOLD_SEVERE_FATIGUE: float = 0.30  # 30%


# ─── Enums & Dataclasses ─────────────────────────────────────────────────────

class ExerciseCategory(str, Enum):
    LOWER_BODY_COMPOUND = "lower_body_compound"
    UPPER_BODY_COMPOUND = "upper_body_compound"
    ISOLATION = "isolation"


class FatigueState(str, Enum):
    NEW = "new"                     # No prior history — default weight
    CLEAR = "clear"                 # 0–14% drop — full increment
    OVERREACHING = "overreaching"   # 15–29% drop — 50% increment
    SEVERE_FATIGUE = "severe_fatigue"  # ≥30% drop — hold / deload


@dataclass
class RawSession:
    """A single gym_log row relevant to one exercise, chronologically ordered."""
    date: str        # YYYY-MM-DD
    weight: float    # kg
    reps: int
    e1rm: float = field(init=False)

    def __post_init__(self) -> None:
        self.e1rm = calc_e1rm(self.weight, self.reps)


@dataclass
class RecommendationResult:
    exercise: str
    recommended_weight: float
    unit: str
    confidence: float
    fatigue_state: str          # FatigueState value
    ewma_baseline: float        # EWMA-smoothed e1RM at latest session
    latest_e1rm: float          # e1RM of the most-recent session
    drop_pct: float             # fraction drop (e.g. 0.18 = 18%)
    audit_trail: str            # plain-English reasoning
    sessions_used: int
    category: str               # ExerciseCategory value


# ─── Core Maths ──────────────────────────────────────────────────────────────

def calc_e1rm(weight: float, reps: int) -> float:
    """
    Epley formula for estimated 1-Rep Max.
    Returns the raw weight when reps == 1 (no extrapolation needed).
    Returns 0 for invalid inputs.
    """
    if weight <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return round(weight, 2)
    return round(weight * (1.0 + reps / 30.0), 2)


def calc_ewma(values: List[float], alpha: float = EWMA_ALPHA) -> float:
    """
    Exponentially Weighted Moving Average over a chronological list of values.
    Returns the final smoothed value (the 'baseline' against which we compare
    the most-recent session).

    If values has only one element, EWMA == that element (trivially).
    """
    if not values:
        return 0.0
    ewma = values[0]
    for v in values[1:]:
        ewma = alpha * v + (1.0 - alpha) * ewma
    return round(ewma, 2)


# ─── Exercise Classification ──────────────────────────────────────────────────

# Muscles whose primary compound movements are lower-body.
_LOWER_BODY_MUSCLES = {"Quads", "Hamstrings", "Glutes", "Calves"}

# Muscles whose primary compound movements are upper-body.
_UPPER_BODY_MUSCLES = {"Chest", "Back", "Shoulders"}

# Muscles that are almost exclusively isolation work.
_ISOLATION_MUSCLES = {"Biceps", "Triceps", "Abs", "Forearms", "Traps", "Obliques"}

# Keywords that reliably indicate a *compound* movement regardless of muscle group.
_COMPOUND_KEYWORDS = {
    "squat", "deadlift", "press", "row", "pull-up", "pullup", "pull up",
    "chin-up", "chinup", "chin up", "hip thrust", "lunge", "step up",
    "rdl", "split squat"
}

# Keywords that reliably indicate *isolation* regardless of muscle group.
_ISOLATION_KEYWORDS = {
    "curl", "raise", "fly", "kickback", "extension", "crunch", "shrug",
    "pushdown", "pullover", "crossover", "leg raise", "face pull"
}


def classify_exercise(exercise_name: str, muscle_group: str) -> ExerciseCategory:
    """
    Determine whether an exercise is:
      - Lower Body Compound (→ +5 kg)
      - Upper Body Compound (→ +2.5 kg)
      - Isolation           (→ +1 kg)

    Strategy (priority order):
      1. Explicit isolation keyword in name → ISOLATION
      2. Muscle group is isolation-only     → ISOLATION
      3. Explicit compound keyword in name + lower-body muscle → LOWER_BODY_COMPOUND
      4. Explicit compound keyword in name + upper-body muscle → UPPER_BODY_COMPOUND
      5. Muscle-group default:
            lower-body → LOWER_BODY_COMPOUND
            upper-body → UPPER_BODY_COMPOUND
            else       → ISOLATION
    """
    name_lower = exercise_name.lower()

    # 1. Isolation keyword takes top priority
    if any(kw in name_lower for kw in _ISOLATION_KEYWORDS):
        # But some compound movements contain ambiguous words (e.g. "leg press").
        # Protect those by checking compound keywords too.
        has_compound = any(kw in name_lower for kw in _COMPOUND_KEYWORDS)
        if not has_compound:
            return ExerciseCategory.ISOLATION

    # 2. Isolation-only muscle group
    if muscle_group in _ISOLATION_MUSCLES:
        return ExerciseCategory.ISOLATION

    # 3 & 4. Compound keyword + muscle group
    has_compound = any(kw in name_lower for kw in _COMPOUND_KEYWORDS)
    if has_compound:
        if muscle_group in _LOWER_BODY_MUSCLES:
            return ExerciseCategory.LOWER_BODY_COMPOUND
        return ExerciseCategory.UPPER_BODY_COMPOUND

    # 5. Muscle-group default
    if muscle_group in _LOWER_BODY_MUSCLES:
        return ExerciseCategory.LOWER_BODY_COMPOUND
    if muscle_group in _UPPER_BODY_MUSCLES:
        return ExerciseCategory.UPPER_BODY_COMPOUND
    return ExerciseCategory.ISOLATION


def get_absolute_increment(category: ExerciseCategory) -> float:
    """Return the full (un-penalised) load increment for the given category."""
    mapping = {
        ExerciseCategory.LOWER_BODY_COMPOUND: INCREMENT_LOWER_COMPOUND,
        ExerciseCategory.UPPER_BODY_COMPOUND: INCREMENT_UPPER_COMPOUND,
        ExerciseCategory.ISOLATION: INCREMENT_ISOLATION,
    }
    return mapping[category]


# ─── Fatigue Penalty ─────────────────────────────────────────────────────────

def apply_fatigue_penalty(
    full_increment: float,
    drop_pct: float,
    threshold_overreaching: float = THRESHOLD_OVERREACHING,
    threshold_severe_fatigue: float = THRESHOLD_SEVERE_FATIGUE,
) -> tuple[float, FatigueState, str]:
    """
    Scale the load increment based on how far the latest e1RM has dropped
    from the EWMA baseline.

    Returns:
        (scaled_increment, fatigue_state, audit_note)
    """
    if drop_pct < threshold_overreaching:
        # Clear to progress
        return (
            full_increment,
            FatigueState.CLEAR,
            f"Performance within normal range ({drop_pct * 100:.1f}% below baseline, threshold: {threshold_overreaching * 100:.1f}%). "
            f"Full +{full_increment}kg increment applied.",
        )
    elif drop_pct < threshold_severe_fatigue:
        # Functional overreaching
        scaled = round(full_increment * 0.5, 2)
        return (
            scaled,
            FatigueState.OVERREACHING,
            f"Functional overreaching detected ({drop_pct * 100:.1f}% below EWMA baseline, threshold: {threshold_overreaching * 100:.1f}%). "
            f"Increment halved to +{scaled}kg to allow continued adaptation without burnout.",
        )
    else:
        # Severe fatigue
        return (
            0.0,
            FatigueState.SEVERE_FATIGUE,
            f"Severe fatigue signal ({drop_pct * 100:.1f}% below EWMA baseline, threshold: {threshold_severe_fatigue * 100:.1f}%). "
            f"Progression halted. Hold current weight or consider a structured deload week.",
        )


# ─── Confidence Score ─────────────────────────────────────────────────────────

def calc_confidence(sessions: int) -> float:
    """
    Probabilistic confidence in the recommendation.
    Formula: min(1.0, sessions / CONFIDENCE_SESSIONS)
    Reaches 100% at 12 sessions.
    """
    return round(min(1.0, sessions / CONFIDENCE_SESSIONS), 4)


# ─── External Recovery Integration ───────────────────────────────────────────

def get_cardio_fatigue_multiplier() -> tuple[float, float]:
    """
    Calculate the day's cardiovascular load from Strava activities in the last 3 days
    and return (cardio_load, multiplier) where the multiplier adjusts fatigue thresholds.
    """
    cardio_load = 0.0
    multiplier = 1.0
    
    if not supabase:
        return cardio_load, multiplier

    try:
        # Fetch Strava activities logged in the last 3 days (relative to current UTC time)
        three_days_ago = (datetime.utcnow() - timedelta(days=3)).isoformat()
        response = supabase.table("strava_activities").select(
            "duration_seconds, avg_heartrate, calories"
        ).gte("start_date", three_days_ago).execute()
        
        activities = response.data or []
        for act in activities:
            duration = float(act.get("duration_seconds") or 0)
            avg_hr = float(act.get("avg_heartrate") or 0)
            calories = float(act.get("calories") or 0)
            
            # Estimate activity load
            if avg_hr > 0:
                # Heart-rate informed TRIMP proxy
                act_load = (duration / 60.0) * (avg_hr / 100.0)
            elif calories > 0:
                act_load = calories / 10.0
            else:
                act_load = duration / 60.0
                
            cardio_load += act_load
            
        # A cumulative load of 150+ in 3 days triggers threshold adjustment.
        # Decreases fatigue thresholds by up to 33% (from multiplier 1.0 down to 0.67).
        multiplier = max(0.67, 1.0 - (cardio_load / 450.0))
        
    except Exception as e:
        print(f"[recommendation_service] Strava load query error: {e}")
        
    return round(cardio_load, 2), round(multiplier, 2)


# ─── Main Recommendation Generator ───────────────────────────────────────────

def generate_recommendation(
    exercise_name: str,
    muscle_group: str,
    history: List[dict],
    default_weight: float = 0.0,
    unit: str = "kg",
) -> RecommendationResult:
    """
    Generate a single exercise recommendation from its full gym_logs history.

    Args:
        exercise_name: Display name of the exercise.
        muscle_group:  Primary muscle group (from muscle_mapping.get_muscle_group).
        history:       List of dicts, each with at minimum:
                         {"date": str, "weight": float, "reps": int}
                       Must be chronologically sorted (oldest first).
        default_weight: Fallback weight if no history.
        unit:          Weight unit (almost always "kg").

    Returns:
        A fully populated RecommendationResult.
    """
    category = classify_exercise(exercise_name, muscle_group)
    full_increment = get_absolute_increment(category)

    # ── No history → calibrating state ──────────────────────────────────────
    if not history:
        audit = (
            f"No prior {exercise_name} sessions found. "
            f"Starting weight set to default ({default_weight}{unit}). "
            f"Log at least one session to enable personalised progressive overload."
        )
        return RecommendationResult(
            exercise=exercise_name,
            recommended_weight=default_weight,
            unit=unit,
            confidence=0.0,
            fatigue_state=FatigueState.NEW.value,
            ewma_baseline=0.0,
            latest_e1rm=0.0,
            drop_pct=0.0,
            audit_trail=audit,
            sessions_used=0,
            category=category.value,
        )

    # ── Filter to kg-unit sessions only (can't do e1RM on plates) ───────────
    valid = []
    for s in history:
        weight_val = float(s.get("weight") or 0)
        reps_val = int(s.get("reps") or 0)
        if weight_val > 0 and reps_val > 0:
            valid.append(s)

    if not valid:
        audit = (
            f"{len(history)} session(s) found but none have usable weight/reps data. "
            f"Using default starting weight ({default_weight}{unit})."
        )
        return RecommendationResult(
            exercise=exercise_name,
            recommended_weight=default_weight,
            unit=unit,
            confidence=0.0,
            fatigue_state=FatigueState.NEW.value,
            ewma_baseline=0.0,
            latest_e1rm=0.0,
            drop_pct=0.0,
            audit_trail=audit,
            sessions_used=0,
            category=category.value,
        )

    # ── Session Date Aggregation to extract "Top Set" (yielding highest e1RM) ──
    # Prevents "last set bias" from cooldown/back-off sets
    sessions_by_date = {}
    for s in valid:
        date_str = str(s.get("date") or "").split("T")[0]
        weight_val = float(s["weight"])
        reps_val = int(s["reps"])
        e1rm_val = calc_e1rm(weight_val, reps_val)
        
        if date_str not in sessions_by_date or e1rm_val > sessions_by_date[date_str]["e1rm"]:
            sessions_by_date[date_str] = {
                "date": date_str,
                "weight": weight_val,
                "reps": reps_val,
                "e1rm": e1rm_val
            }
            
    sorted_sessions = sorted(sessions_by_date.values(), key=lambda x: x["date"])

    # ── Build e1RM time-series (refactored to avoid list comprehensions for debuggability) ──
    e1rm_series = []
    for session in sorted_sessions:
        e1rm_series.append(session["e1rm"])

    latest_weight = float(sorted_sessions[-1]["weight"])
    latest_reps = int(sorted_sessions[-1]["reps"])
    latest_e1rm = e1rm_series[-1]
    sessions_used = len(sorted_sessions)

    # ── EWMA baseline (excluding the latest session) ─────────────────────────
    ewma_baseline = calc_ewma(e1rm_series, alpha=EWMA_ALPHA)

    # ── Performance drop ─────────────────────────────────────────────────────
    if ewma_baseline > 0:
        drop_pct = max(0.0, (ewma_baseline - latest_e1rm) / ewma_baseline)
    else:
        drop_pct = 0.0

    # ── Integrate External Recovery Metrics (Strava cardio load) ─────────────
    cardio_load, cardio_multiplier = get_cardio_fatigue_multiplier()
    adj_threshold_overreaching = THRESHOLD_OVERREACHING * cardio_multiplier
    adj_threshold_severe_fatigue = THRESHOLD_SEVERE_FATIGUE * cardio_multiplier

    # ── Fatigue penalty ──────────────────────────────────────────────────────
    scaled_increment, fatigue_state, fatigue_note = apply_fatigue_penalty(
        full_increment, drop_pct, adj_threshold_overreaching, adj_threshold_severe_fatigue
    )

    # ── Final recommended weight ─────────────────────────────────────────────
    recommended_weight = round(latest_weight + scaled_increment, 2)

    # ── Confidence ───────────────────────────────────────────────────────────
    confidence = calc_confidence(sessions_used)

    # ── Audit trail ──────────────────────────────────────────────────────────
    category_label = {
        ExerciseCategory.LOWER_BODY_COMPOUND: "Lower Body Compound",
        ExerciseCategory.UPPER_BODY_COMPOUND: "Upper Body Compound",
        ExerciseCategory.ISOLATION: "Isolation",
    }[category]

    audit_parts = [
        f"Category: {category_label} → base increment {full_increment}kg.",
        f"Last session: {latest_weight}kg × {latest_reps} reps (Top Set e1RM ≈ {latest_e1rm}kg).",
        f"EWMA baseline: {ewma_baseline}kg (α={EWMA_ALPHA}, across {sessions_used} session{'s' if sessions_used != 1 else ''}).",
    ]
    
    if cardio_load > 0:
        audit_parts.append(
            f"Cardio load: {cardio_load} (fatigue multiplier: {cardio_multiplier:.2f}). "
            f"Thresholds: overreaching {adj_threshold_overreaching * 100:.1f}%, severe fatigue {adj_threshold_severe_fatigue * 100:.1f}%."
        )
        
    audit_parts.append(fatigue_note)
    audit_parts.append(
        f"Recommended next session: {recommended_weight}kg (confidence: {int(confidence * 100)}%)."
    )
    audit_trail = " ".join(audit_parts)

    return RecommendationResult(
        exercise=exercise_name,
        recommended_weight=recommended_weight,
        unit=unit,
        confidence=confidence,
        fatigue_state=fatigue_state.value,
        ewma_baseline=ewma_baseline,
        latest_e1rm=latest_e1rm,
        drop_pct=round(drop_pct, 4),
        audit_trail=audit_trail,
        sessions_used=sessions_used,
        category=category.value,
    )
