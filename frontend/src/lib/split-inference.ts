import type { WorkoutEntry } from '@/lib/types';
import { getMuscleInfo } from '@/lib/muscle-mapping';

export type WorkoutSplit = 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Cardio' | 'Workout';

const PUSH_MUSCLES = new Set(['Chest', 'Shoulders', 'Triceps']);
const PULL_MUSCLES = new Set(['Back', 'Biceps']);
const LOWER_MUSCLES = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Obliques']);
const UPPER_MUSCLES = new Set(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Traps']);

function uniqueExerciseMuscleCounts(exercises: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const seen = new Set<string>();

  for (const name of exercises) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const sub = getMuscleInfo(name).subGroup;
    counts.set(sub, (counts.get(sub) ?? 0) + 1);
  }

  return counts;
}

function bucketCount(muscleCounts: Map<string, number>, muscles: Set<string>): number {
  let total = 0;
  for (const muscle of muscles) {
    total += muscleCounts.get(muscle) ?? 0;
  }
  return total;
}

export function inferSplitFromExercises(exerciseNames: string[]): Exclude<WorkoutSplit, 'Cardio'> {
  const muscleCounts = uniqueExerciseMuscleCounts(exerciseNames);
  if (muscleCounts.size === 0) return 'Workout';

  const push = bucketCount(muscleCounts, PUSH_MUSCLES);
  const pull = bucketCount(muscleCounts, PULL_MUSCLES);
  const legs = bucketCount(muscleCounts, LOWER_MUSCLES);
  const upper = bucketCount(muscleCounts, UPPER_MUSCLES);
  const lower = legs;

  if (legs >= push && legs >= pull && legs > 0) return 'Legs';
  if (push > pull && push >= legs && push > 0) return 'Push';
  if (pull > push && pull >= legs && pull > 0) return 'Pull';
  if (push === pull && push > 0) return 'Upper';
  if (upper > lower && upper > 0) return 'Upper';
  if (lower > upper && lower > 0) return 'Lower';

  return 'Workout';
}

export function inferSplitFromEntries(entries: WorkoutEntry[]): WorkoutSplit {
  return inferSplitFromExercises(entries.map((entry) => entry.exercise));
}
