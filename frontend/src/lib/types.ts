// ─── AI Flow Output Types ───

export interface AISuggestion {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  reason: string;
}

export interface DataAnomaly {
  id: string;
  issue: string;
  detail: string;
  date?: string;
  severity: 'low' | 'high';
}

// ─── Workout Data Types ───

export interface WorkoutEntry {
  id?: string;
  exercise: string;
  weight: number;
  weightUnit?: string;
  sets: number;
  reps: number;
  notes?: string;
}

export interface StravaActivity {
  name: string;
  type: string;
  durationSeconds: number;
  avgHeartrate: number | null;
  maxHeartrate: number | null;
  distanceMeters: number;
  elevationGain?: number | null;
  avgSpeedMps?: number | null;
  maxSpeedMps?: number | null;
  avgCadence?: number | null;
  avgTemp?: number | null;
  calories?: number | null;
}

export type WorkoutSplit = 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Cardio' | 'Workout';

export interface WorkoutSession {
  id: string;
  date: string;          // ISO date string (YYYY-MM-DD)
  entries: WorkoutEntry[];
  rawInput: string;      // The original natural-language input
  inferredSplit?: WorkoutSplit;
  // Enriched fields from merged data
  totalVolumeKg?: number;
  totalReps?: number;
  durationMins?: number;
  avgHeartRate?: number;
  activityNames?: string[];
  stravaActivities?: StravaActivity[];
}

// ─── UI State Types ───

export type ViewState = 'quick-log' | 'next-session' | 'profile' | 'history' | 'data-health' | 'workout-details' | 'analytics' | 'ai-insights';