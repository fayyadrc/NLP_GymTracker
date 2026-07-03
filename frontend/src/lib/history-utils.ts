import type { WorkoutSession, WorkoutEntry, WorkoutSplit } from '@/lib/types';
import { buildWorkoutDraftFromSession } from '@/lib/quick-log-parser';
import { inferSplitFromEntries } from '@/lib/split-inference';
import { getCustomSessionTitle } from '@/lib/session-titles';

export type { WorkoutSplit } from '@/lib/types';

export interface SessionProgress {
  volumeDeltaPct: number | null;
  durationDeltaMins: number | null;
  hasPR: boolean;
}

export interface MonthlySummaryData {
  monthLabel: string;
  workoutCount: number;
  stravaActivityCount: number;
  totalDurationMins: number;
  totalVolumeKg: number;
  volumeTrendPct: number | null;
}

export function getSessionVolume(session: WorkoutSession): number {
  if (session.totalVolumeKg != null) return session.totalVolumeKg;
  return session.entries.reduce((sum, e) => sum + e.weight * e.sets * e.reps, 0);
}

export function getUniqueExercises(session: WorkoutSession): WorkoutEntry[] {
  const seen = new Set<string>();
  return session.entries.filter((entry) => {
    const key = entry.exercise.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getSessionDurationMins(session: WorkoutSession): number {
  if (session.durationMins && session.durationMins > 0) return session.durationMins;
  if (session.stravaActivities?.length) {
    return session.stravaActivities.reduce((sum, act) => sum + act.durationSeconds / 60, 0);
  }
  return 0;
}

export function getStravaActivityCount(session: WorkoutSession): number {
  return session.stravaActivities?.length || 0;
}

export function getStravaDurationMins(session: WorkoutSession): number {
  return session.stravaActivities?.reduce((sum, act) => sum + act.durationSeconds / 60, 0) || 0;
}

export function getSessionCalories(session: WorkoutSession): number {
  return session.stravaActivities?.reduce((sum, act) => sum + (act.calories || 0), 0) || 0;
}

export function isPureStravaSession(session: WorkoutSession): boolean {
  return session.entries.length === 0 && Boolean(session.stravaActivities?.length);
}

export function shortenExerciseName(name: string): string {
  if (name.length <= 16) return name;
  return name
    .replace(/\bDumbbell\b/gi, 'DB')
    .replace(/\bMachine\b/gi, 'Mach')
    .replace(/\bTricep\b/gi, 'Tri')
    .replace(/\bPushdown\b/gi, 'Push')
    .trim();
}

export function inferWorkoutSplit(session: WorkoutSession): WorkoutSplit {
  if (isPureStravaSession(session)) return 'Cardio';
  if (session.inferredSplit) return session.inferredSplit;
  if (session.entries.length === 0) return 'Workout';
  return inferSplitFromEntries(session.entries);
}

export function getAutoWorkoutTitle(session: WorkoutSession): string {
  if (isPureStravaSession(session)) {
    const primary = session.stravaActivities?.[0];
    return primary?.name || primary?.type || 'Cardio Session';
  }

  const split = inferWorkoutSplit(session);
  if (split !== 'Workout' && split !== 'Cardio') return `${split} Day`;

  const unique = getUniqueExercises(session);
  if (unique.length === 1) return unique[0].exercise;
  if (unique.length >= 2) {
    return `${shortenExerciseName(unique[0].exercise)} + ${unique.length - 1} more`;
  }

  return 'Workout';
}

export function getWorkoutTitle(session: WorkoutSession): string {
  const customTitle = getCustomSessionTitle(session.id);
  if (customTitle) return customTitle;
  return getAutoWorkoutTitle(session);
}

export function formatDuration(mins: number): string {
  const rounded = Math.round(mins);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatSessionDate(session: WorkoutSession): { primary: string; secondary: string } {
  const dateObj = new Date(session.date + 'T00:00:00');
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    primary: dateFormatted,
    secondary: dayName,
  };
}

function maxWeightByExercise(entries: WorkoutEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  entries.forEach((entry) => {
    const key = entry.exercise.toLowerCase();
    map.set(key, Math.max(map.get(key) || 0, entry.weight));
  });
  return map;
}

export function findPreviousSimilarSession(
  session: WorkoutSession,
  allSessions: WorkoutSession[],
): WorkoutSession | null {
  if (session.entries.length === 0) return null;

  const split = inferWorkoutSplit(session);
  const exerciseKeys = new Set(session.entries.map((e) => e.exercise.toLowerCase()));

  const prior = allSessions
    .filter((s) => s.date < session.date && s.entries.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const candidate of prior) {
    if (inferWorkoutSplit(candidate) === split) return candidate;

    const overlap = candidate.entries.filter((e) => exerciseKeys.has(e.exercise.toLowerCase())).length;
    const threshold = Math.max(1, Math.ceil(exerciseKeys.size * 0.4));
    if (overlap >= threshold) return candidate;
  }

  return null;
}

export function sessionHasPR(session: WorkoutSession, allSessions: WorkoutSession[]): boolean {
  if (session.entries.length === 0) return false;

  const currentMax = maxWeightByExercise(session.entries);
  const priorSessions = allSessions.filter((s) => s.date < session.date);

  for (const [exercise, weight] of currentMax.entries()) {
    if (weight <= 0) continue;
    let priorBest = 0;
    priorSessions.forEach((prior) => {
      prior.entries.forEach((entry) => {
        if (entry.exercise.toLowerCase() === exercise) {
          priorBest = Math.max(priorBest, entry.weight);
        }
      });
    });
    if (weight > priorBest) return true;
  }

  return false;
}

export function computeSessionProgress(
  session: WorkoutSession,
  allSessions: WorkoutSession[],
): SessionProgress {
  const previous = findPreviousSimilarSession(session, allSessions);
  const volume = getSessionVolume(session);
  const duration = getSessionDurationMins(session);

  let volumeDeltaPct: number | null = null;
  let durationDeltaMins: number | null = null;

  if (previous) {
    const prevVolume = getSessionVolume(previous);
    if (prevVolume > 0) {
      volumeDeltaPct = Math.round(((volume - prevVolume) / prevVolume) * 100);
    }

    const prevDuration = getSessionDurationMins(previous);
    if (prevDuration > 0 && duration > 0) {
      durationDeltaMins = Math.round(duration - prevDuration);
    }
  }

  return {
    volumeDeltaPct,
    durationDeltaMins,
    hasPR: sessionHasPR(session, allSessions),
  };
}

function monthVolume(sessions: WorkoutSession[]): number {
  return sessions
    .filter((s) => s.entries.length > 0)
    .reduce((sum, session) => sum + getSessionVolume(session), 0);
}

export function computeMonthlySummary(
  sessions: WorkoutSession[],
  referenceDate = new Date(),
): MonthlySummaryData {
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();

  const monthSessions = sessions.filter((session) => {
    const date = new Date(session.date + 'T00:00:00');
    return date.getMonth() === month && date.getFullYear() === year;
  });

  const gymSessions = monthSessions.filter((session) => session.entries.length > 0);
  const totalVolumeKg = monthVolume(gymSessions);

  const prevDate = new Date(referenceDate);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.getMonth();
  const prevYear = prevDate.getFullYear();
  const prevMonthSessions = sessions.filter((session) => {
    const date = new Date(session.date + 'T00:00:00');
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear && session.entries.length > 0;
  });
  const prevVolume = monthVolume(prevMonthSessions);
  let volumeTrendPct: number | null = null;
  if (prevVolume > 0 && totalVolumeKg > 0) {
    volumeTrendPct = Math.round(((totalVolumeKg - prevVolume) / prevVolume) * 100);
  }

  return {
    monthLabel: referenceDate.toLocaleDateString('en-US', { month: 'long' }),
    workoutCount: gymSessions.length,
    stravaActivityCount: monthSessions.reduce(
      (sum, session) => sum + getStravaActivityCount(session),
      0,
    ),
    totalDurationMins: monthSessions.reduce(
      (sum, session) => sum + getStravaDurationMins(session),
      0,
    ),
    totalVolumeKg,
    volumeTrendPct,
  };
}

export type SplitFilter = 'All' | WorkoutSplit;

export function getSplitFilterCounts(sessions: WorkoutSession[]): Record<SplitFilter, number> {
  const filters: SplitFilter[] = ['All', 'Push', 'Pull', 'Legs', 'Upper', 'Lower'];
  return filters.reduce(
    (acc, filter) => {
      acc[filter] =
        filter === 'All'
          ? sessions.length
          : sessions.filter((session) => inferWorkoutSplit(session) === filter).length;
      return acc;
    },
    {} as Record<SplitFilter, number>,
  );
}

export function formatVolumeKg(kg: number): string {
  if (kg <= 0) return '0 kg';
  return `${kg.toLocaleString()} kg`;
}

export function filterSessions(
  sessions: WorkoutSession[],
  searchQuery: string,
  splitFilter: SplitFilter,
): WorkoutSession[] {
  const query = searchQuery.trim().toLowerCase();

  return sessions.filter((session) => {
    if (splitFilter !== 'All' && inferWorkoutSplit(session) !== splitFilter) {
      return false;
    }

    if (!query) return true;

    const exercises = session.entries.map((e) => e.exercise.toLowerCase()).join(' ');
    const exerciseMatch = session.entries.some((e) => e.exercise.toLowerCase().includes(query));
    if (exerciseMatch) return true;

    const title = getWorkoutTitle(session).toLowerCase();
    const date = session.date.toLowerCase();
    const raw = (session.rawInput || '').toLowerCase();
    const activities = (session.stravaActivities || []).map((a) => `${a.name} ${a.type}`.toLowerCase()).join(' ');

    return (
      exercises.includes(query) ||
      title.includes(query) ||
      date.includes(query) ||
      raw.includes(query) ||
      activities.includes(query)
    );
  });
}

export function getReuseDraft(session: WorkoutSession): string {
  if (session.rawInput && session.rawInput !== 'Fetched from database') {
    return session.rawInput;
  }
  return buildWorkoutDraftFromSession(session);
}

export function reuseWorkout(session: WorkoutSession): void {
  const draft = getReuseDraft(session);
  if (!draft.trim()) return;
  localStorage.setItem('gym_tracker_draft', draft);
  (window as { setActiveView?: (view: string) => void }).setActiveView?.('quick-log');
}
