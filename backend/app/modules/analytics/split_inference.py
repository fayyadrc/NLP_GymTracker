"""Workout split inference from exercise muscle groups."""

from collections import defaultdict
from typing import Iterable, Literal

from .muscle_mapping import get_muscle_info

WorkoutSplit = Literal["Push", "Pull", "Legs", "Upper", "Lower", "Workout"]

_PUSH_MUSCLES = frozenset({"Chest", "Shoulders", "Triceps"})
_PULL_MUSCLES = frozenset({"Back", "Biceps"})
_LOWER_MUSCLES = frozenset({"Quads", "Hamstrings", "Glutes", "Calves", "Abs", "Obliques"})
_UPPER_MUSCLES = frozenset({"Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Traps"})


def _unique_exercise_muscle_counts(exercises: Iterable[str]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    seen: set[str] = set()
    for name in exercises:
        key = (name or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        sub = get_muscle_info(name)["sub_group"]
        counts[sub] += 1
    return counts


def _bucket_count(muscle_counts: dict[str, int], muscles: frozenset[str]) -> int:
    return sum(muscle_counts.get(m, 0) for m in muscles)


def infer_workout_split(exercises: Iterable[str]) -> WorkoutSplit:
    """
    Classify a workout from its unique exercises.

    Push  — majority chest, triceps, and shoulders (other groups do not disqualify).
    Pull  — majority back and biceps.
    Legs  — majority below-waist and core muscles.
    Upper — above-waist focus, or mixed push/pull with no clear PPL winner.
    Lower — below-waist + core when legs is not the PPL winner.
    """
    muscle_counts = _unique_exercise_muscle_counts(exercises)
    if not muscle_counts:
        return "Workout"

    push = _bucket_count(muscle_counts, _PUSH_MUSCLES)
    pull = _bucket_count(muscle_counts, _PULL_MUSCLES)
    legs = _bucket_count(muscle_counts, _LOWER_MUSCLES)
    upper = _bucket_count(muscle_counts, _UPPER_MUSCLES)
    lower = legs

    if legs >= push and legs >= pull and legs > 0:
        return "Legs"
    if push > pull and push >= legs and push > 0:
        return "Push"
    if pull > push and pull >= legs and pull > 0:
        return "Pull"
    if push == pull and push > 0:
        return "Upper"

    if upper > lower and upper > 0:
        return "Upper"
    if lower > upper and lower > 0:
        return "Lower"

    return "Workout"
