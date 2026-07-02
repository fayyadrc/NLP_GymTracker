import type { WorkoutEntry, WorkoutSession } from '@/lib/types';

export interface ParsedPreviewLine {
  id: string;
  type: 'exercise' | 'set' | 'warning';
  text: string;
  exercise?: string;
}

export interface ParsedPreviewResult {
  entries: WorkoutEntry[];
  lines: ParsedPreviewLine[];
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  usesMixedUnits: boolean;
}

export interface ExerciseSuggestion {
  name: string;
  count: number;
  lastUsedAt: number;
}

const SET_FRAGMENT_PATTERN =
  /(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|plate|plates)?\s*(?:x|for)\s*(\d+)(?:\s*(?:reps?))?/gi;

const BODYWEIGHT_FRAGMENT_PATTERN =
  /(bw|bodyweight)\s*(?:x|for)\s*(\d+)(?:\s*(?:reps?))?/gi;

const WEIGHT_ONLY_PATTERN = /^\s*(?:[-*•]\s*)?(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|plate|plates)?\s*$/i;
const FILLER_PREFIX_PATTERN =
  /^(?:just finished|finished|did|i did|then did|then|and then|after that|moved on to|move[d]? on to|followed by|next up|next|went to)\s+/i;

interface ExtractedSet {
  weight: number;
  weightUnit: string;
  reps: number;
  start: number;
  end: number;
}

function normalizeUnit(unit?: string): string {
  if (!unit) return 'kg';
  const value = unit.toLowerCase();
  if (value === 'kgs') return 'kg';
  if (value === 'lbs') return 'lb';
  if (value === 'plate' || value === 'plates') return 'plates';
  return value;
}

function formatUnit(unit: string): string {
  if (unit === 'plates') return 'plates';
  return unit;
}

function prettifyExerciseName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bdb\b/gi, 'DB')
    .replace(/\bkgs\b/gi, 'kg')
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function cleanExerciseCandidate(value: string): string {
  return value
    .replace(FILLER_PREFIX_PATTERN, '')
    .replace(/\b(i\s+did|did)\b/gi, '')
    .replace(/[:,-]\s*$/g, '')
    .replace(/^[\s\-*•:]+|[\s\-*•:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyExerciseHeading(line: string): boolean {
  const normalized = line.trim().replace(/^[-*•]\s*/, '');
  if (!normalized) return false;
  if (SET_FRAGMENT_PATTERN.test(normalized) || BODYWEIGHT_FRAGMENT_PATTERN.test(normalized)) {
    SET_FRAGMENT_PATTERN.lastIndex = 0;
    BODYWEIGHT_FRAGMENT_PATTERN.lastIndex = 0;
    return false;
  }
  SET_FRAGMENT_PATTERN.lastIndex = 0;
  BODYWEIGHT_FRAGMENT_PATTERN.lastIndex = 0;
  if (/^\d/.test(normalized)) return false;
  return /[a-zA-Z]/.test(normalized);
}

function extractSetsFromText(text: string): ExtractedSet[] {
  const sets: ExtractedSet[] = [];
  const standard = Array.from(text.matchAll(SET_FRAGMENT_PATTERN));
  const bodyweight = Array.from(text.matchAll(BODYWEIGHT_FRAGMENT_PATTERN));

  standard.forEach((match) => {
    const start = match.index ?? 0;
    const full = match[0] ?? '';
    const weight = Number(match[1] || 0);
    const weightUnit = normalizeUnit(match[2] || (weight > 0 && weight <= 10 ? 'plates' : 'kg'));
    const reps = Number(match[3]);
    sets.push({ weight, weightUnit, reps, start, end: start + full.length });
  });

  bodyweight.forEach((match) => {
    const start = match.index ?? 0;
    const full = match[0] ?? '';
    const reps = Number(match[2]);
    sets.push({ weight: 0, weightUnit: 'bodyweight', reps, start, end: start + full.length });
  });

  return sets.sort((a, b) => a.start - b.start);
}

function extractExerciseFromPrefix(prefix: string): string {
  const cleaned = cleanExerciseCandidate(prefix);
  if (!cleaned) return '';
  if (!/[a-zA-Z]/.test(cleaned)) return '';
  if (WEIGHT_ONLY_PATTERN.test(cleaned)) return '';
  return prettifyExerciseName(cleaned);
}

function normalizeInputForParsing(input: string): string {
  return input
    .replace(/\r/g, '')
    .replace(/[•*]/g, '-')
    .replace(/\.\s+(?=[A-Z])/g, '\n')
    .replace(/\b(moved on to|followed by|next up|went to)\b/gi, '\n$1');
}

function pushExerciseLine(lines: ParsedPreviewLine[], seenExercises: Set<string>, exercise: string) {
  const key = exercise.toLowerCase();
  if (seenExercises.has(key)) return;
  seenExercises.add(key);
  lines.push({
    id: `exercise-${lines.length}-${key}`,
    type: 'exercise',
    text: `\u2713 ${exercise}`,
    exercise,
  });
}

export function parseQuickLogInput(input: string): ParsedPreviewResult {
  const rawLines = normalizeInputForParsing(input).split('\n');
  const entries: WorkoutEntry[] = [];
  const lines: ParsedPreviewLine[] = [];
  const seenExercises = new Set<string>();
  let currentExercise = '';
  let totalVolume = 0;
  let usesMixedUnits = false;

  rawLines.forEach((rawLine, index) => {
    const line = rawLine.trim().replace(/^[-*•]\s*/, '');
    if (!line) return;

    if (isLikelyExerciseHeading(line)) {
      currentExercise = prettifyExerciseName(line);
      pushExerciseLine(lines, seenExercises, currentExercise);
      return;
    }

    const extractedSets = extractSetsFromText(line);
    if (extractedSets.length > 0) {
      extractedSets.forEach((parsedSet, setIndex) => {
        const previousEnd = setIndex === 0 ? 0 : extractedSets[setIndex - 1].end;
        const prefix = line.slice(previousEnd, parsedSet.start);
        const inferredExercise = extractExerciseFromPrefix(prefix);
        if (inferredExercise) {
          currentExercise = inferredExercise;
        }

        if (!currentExercise && setIndex === 0) {
          const linePrefix = extractExerciseFromPrefix(line.slice(0, parsedSet.start));
          if (linePrefix) {
            currentExercise = linePrefix;
          }
        }

        if (!currentExercise) {
          lines.push({
            id: `warning-${index}-${setIndex}`,
            type: 'warning',
            text: 'Found a set, but could not tell which exercise it belongs to.',
          });
          return;
        }

        pushExerciseLine(lines, seenExercises, currentExercise);

        if (parsedSet.weightUnit !== 'kg' && parsedSet.weightUnit !== 'bodyweight') {
          usesMixedUnits = true;
        }

        totalVolume += parsedSet.weight * parsedSet.reps;
        entries.push({
          exercise: currentExercise,
          weight: parsedSet.weight,
          weightUnit: parsedSet.weightUnit,
          sets: 1,
          reps: parsedSet.reps,
        });
        lines.push({
          id: `set-${index}-${setIndex}`,
          type: 'set',
          text:
            parsedSet.weightUnit === 'bodyweight'
              ? `Set ${entries.filter((entry) => entry.exercise === currentExercise).length} - bodyweight x ${parsedSet.reps}`
              : `Set ${entries.filter((entry) => entry.exercise === currentExercise).length} - ${parsedSet.weight} ${formatUnit(parsedSet.weightUnit)} x ${parsedSet.reps}`,
          exercise: currentExercise,
        });
      });
      return;
    }

    if (WEIGHT_ONLY_PATTERN.test(line) && currentExercise) {
      lines.push({
        id: `warning-${index}`,
        type: 'warning',
        text: 'Could not parse this line. Add reps with "x" or "for".',
        exercise: currentExercise,
      });
      return;
    }

    lines.push({
      id: `warning-${index}`,
      type: 'warning',
      text: currentExercise ? 'Could not parse this line.' : 'Could not identify an exercise or set here.',
    });
  });

  const uniqueExercises = new Set(entries.map((entry) => entry.exercise.toLowerCase())).size;

  return {
    entries,
    lines,
    exerciseCount: uniqueExercises,
    setCount: entries.length,
    totalVolume,
    usesMixedUnits,
  };
}

export function deriveExerciseSuggestions(sessions: WorkoutSession[]): ExerciseSuggestion[] {
  const exerciseMap = new Map<string, ExerciseSuggestion>();

  sessions.forEach((session, sessionIndex) => {
    const lastUsedAt = new Date(session.date).getTime() || Date.now() - sessionIndex;
    session.entries.forEach((entry) => {
      const key = entry.exercise.trim().toLowerCase();
      if (!key) return;
      const existing = exerciseMap.get(key);
      if (!existing) {
        exerciseMap.set(key, {
          name: entry.exercise,
          count: 1,
          lastUsedAt,
        });
        return;
      }
      existing.count += 1;
      existing.lastUsedAt = Math.max(existing.lastUsedAt, lastUsedAt);
    });
  });

  return Array.from(exerciseMap.values()).sort((a, b) => {
    if (b.lastUsedAt !== a.lastUsedAt) return b.lastUsedAt - a.lastUsedAt;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
}

export function buildWorkoutDraftFromSession(session?: WorkoutSession | null): string {
  if (!session || session.entries.length === 0) return '';

  const lines: string[] = [];
  let currentExercise = '';

  session.entries.forEach((entry) => {
    if (entry.exercise !== currentExercise) {
      if (lines.length > 0) lines.push('');
      currentExercise = entry.exercise;
      lines.push(entry.exercise);
    }

    const unit = normalizeUnit(entry.weightUnit);
    if (unit === 'bodyweight') {
      lines.push(`bodyweight x ${entry.reps}`);
      return;
    }

    const showUnit = unit ? formatUnit(unit) : 'kg';
    lines.push(`${entry.weight}${entry.weight > 0 ? showUnit : ''} x ${entry.reps}`.trim());
  });

  return lines.join('\n');
}
