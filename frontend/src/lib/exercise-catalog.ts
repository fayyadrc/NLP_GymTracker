import type { WorkoutSession } from '@/lib/types';
import { deriveExerciseSuggestions } from '@/lib/quick-log-parser';

/** Canonical exercise names aligned with backend muscle_mapping aliases. */
export const CANONICAL_EXERCISES: readonly string[] = [
  'Bench Press',
  'Incline Bench Press',
  'Decline Bench Press',
  'Close Grip Bench Press',
  'Dumbbell Bench Press',
  'Incline Dumbbell Press',
  'Dumbbell Fly',
  'Cable Fly',
  'Pec Deck',
  'Chest Dip',
  'Pull Up',
  'Chin Up',
  'Barbell Row',
  'Bent Over Row',
  'T-Bar Row',
  'Seated Cable Row',
  'Dumbbell Row',
  'Lat Pulldown',
  'Deadlift',
  'Romanian Deadlift',
  'Face Pull',
  'Barbell Squat',
  'Front Squat',
  'Goblet Squat',
  'Leg Press',
  'Leg Extension',
  'Bulgarian Split Squat',
  'Walking Lunge',
  'Leg Curl',
  'Hip Thrust',
  'Calf Raise',
  'Overhead Press',
  'Dumbbell Shoulder Press',
  'Lateral Raise',
  'Rear Delt Fly',
  'Barbell Curl',
  'Dumbbell Curl',
  'Hammer Curl',
  'Tricep Pushdown',
  'Skull Crusher',
  'Cable Crunch',
  'Hanging Leg Raise',
  'Plank',
];

export function mergeExerciseSuggestions(sessions: WorkoutSession[]): string[] {
  const history = deriveExerciseSuggestions(sessions).map((item) => item.name);
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const name of [...history, ...CANONICAL_EXERCISES]) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(name);
  }

  return merged;
}
