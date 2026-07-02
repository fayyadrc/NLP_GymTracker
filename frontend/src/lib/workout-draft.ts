import { parseQuickLogInput } from '@/lib/quick-log-parser';
import type { WorkoutEntry } from '@/lib/types';

export interface DraftSet {
  id: string;
  weight: number;
  reps: number;
  unit: string;
}

export interface DraftExercise {
  id: string;
  name: string;
  sets: DraftSet[];
  expanded: boolean;
}

export interface DraftStats {
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  usesMixedUnits: boolean;
}

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

export function createEmptySet(unit = 'kg'): DraftSet {
  return { id: nextId('set'), weight: 0, reps: 0, unit };
}

export function createExercise(name: string, sets: DraftSet[] = []): DraftExercise {
  return {
    id: nextId('ex'),
    name,
    sets: sets.length > 0 ? sets : [createEmptySet()],
    expanded: true,
  };
}

export function formatSetPreview(set: DraftSet): string {
  if (set.unit === 'bodyweight') return `BW×${set.reps || '—'}`;
  const w = set.weight > 0 ? set.weight : '—';
  const r = set.reps > 0 ? set.reps : '—';
  return `${w}×${r}`;
}

export function formatSetLine(set: DraftSet): string {
  if (set.unit === 'bodyweight') return `bodyweight x ${set.reps}`;
  const unit = set.unit === 'kg' ? 'kg' : set.unit;
  return `${set.weight}${unit} x ${set.reps}`;
}

export function exercisesToRawText(exercises: DraftExercise[]): string {
  const blocks: string[] = [];
  exercises.forEach((exercise) => {
    if (!exercise.name.trim()) return;
    const lines = [exercise.name.trim()];
    exercise.sets.forEach((set) => {
      if (set.reps > 0 || set.weight > 0) {
        lines.push(formatSetLine(set));
      }
    });
    if (lines.length > 1) blocks.push(lines.join('\n'));
  });
  return blocks.join('\n\n');
}

export function entriesToExercises(entries: WorkoutEntry[]): DraftExercise[] {
  const exercises: DraftExercise[] = [];
  let current: DraftExercise | null = null;

  entries.forEach((entry) => {
    if (!current || current.name !== entry.exercise) {
      current = createExercise(entry.exercise, []);
      current.sets = [];
      exercises.push(current);
    }
    current.sets.push({
      id: nextId('set'),
      weight: entry.weight,
      reps: entry.reps,
      unit: entry.weightUnit || 'kg',
    });
  });

  return exercises.map((exercise) => ({
    ...exercise,
    expanded: exercise.sets.length <= 3,
  }));
}

export function parseRawTextToExercises(raw: string): DraftExercise[] {
  if (!raw.trim()) return [];
  const { entries } = parseQuickLogInput(raw);
  if (entries.length === 0) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const heading = lines.find((line) => !/^\d/.test(line) && /[a-zA-Z]/.test(line));
    if (heading) return [createExercise(heading)];
    return [];
  }
  return entriesToExercises(entries);
}

export function computeDraftStats(exercises: DraftExercise[]): DraftStats {
  const raw = exercisesToRawText(exercises);
  const parsed = parseQuickLogInput(raw);
  return {
    exerciseCount: parsed.exerciseCount,
    setCount: parsed.setCount,
    totalVolume: parsed.totalVolume,
    usesMixedUnits: parsed.usesMixedUnits,
  };
}

export function getLastSessionPreview(
  exerciseName: string,
  history: { exercise: string; weight: number; reps: number; weightUnit?: string }[],
): string | null {
  const matches = history.filter((e) => e.exercise.toLowerCase() === exerciseName.toLowerCase());
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  if (last.weightUnit === 'bodyweight') return `last: BW×${last.reps}`;
  return `last: ${last.weight}×${last.reps}`;
}
