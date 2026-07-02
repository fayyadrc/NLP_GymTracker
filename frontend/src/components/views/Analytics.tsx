import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Calendar,
  Dumbbell,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Search,
  X,
  BarChart2,
  Trophy,
  Flame,
  History,
  Sparkles,
  Plus
} from 'lucide-react';

interface ExerciseHistoryPoint {
  date: string;
  weight: number;
  reps: number;
  volume: number;
  est_1rm: number;
}

interface ExerciseStats {
  name: string;
  max_weight: number;
  unit: string;
  total_sets: number;
  total_reps: number;
  total_volume: number;
  history: ExerciseHistoryPoint[];
}

type ExercisesByMuscle = Record<string, ExerciseStats[]>;

interface AnalyticsData {
  total_workouts: number;
  workouts_this_week: number;
  volume_per_muscle: { muscle: string; volume: number }[];
  most_trained: string;
  least_trained: string;
  gym_session_count: number;
  strava_activity_count: number;
  exercises_by_muscle?: ExercisesByMuscle;
}

const COLORS = [
  'hsl(var(--accent-blue))',
  'hsl(var(--accent-orange))',
  'hsl(var(--accent-violet))',
  'hsl(var(--accent-green))',
];

interface RecommendedExercise {
  name: string;
  defaultWeight: number;
  unit: string;
  reps: number;
  targetSets: number;
  type: 'Compound' | 'Isolation';
  muscle: string;
  occurrence_count?: number;
}

interface RecommendationResult {
  exercise: string;
  recommended_weight: number;
  unit: string;
  confidence: number;          // 0.0 – 1.0
  fatigue_state: 'new' | 'clear' | 'overreaching' | 'severe_fatigue';
  ewma_baseline: number;
  latest_e1rm: number;
  drop_pct: number;
  audit_trail: string;
  sessions_used: number;
  category: string;
}

const SPLIT_CONFIG: Record<'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower', RecommendedExercise[]> = {
  Push: [
    { name: "Bench Press", defaultWeight: 40, unit: "kg", reps: 8, targetSets: 4, type: "Compound", muscle: "Chest" },
    { name: "Incline Dumbbell Press", defaultWeight: 16, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Chest" },
    { name: "Dumbbell Shoulder Press", defaultWeight: 14, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Shoulders" },
    { name: "Lateral Raise", defaultWeight: 8, unit: "kg", reps: 12, targetSets: 4, type: "Isolation", muscle: "Shoulders" },
    { name: "Tricep Rope Pushdown", defaultWeight: 15, unit: "kg", reps: 12, targetSets: 3, type: "Isolation", muscle: "Triceps" },
  ],
  Pull: [
    { name: "Pullup", defaultWeight: 0, unit: "kg", reps: 8, targetSets: 3, type: "Compound", muscle: "Back" },
    { name: "Barbell Row", defaultWeight: 40, unit: "kg", reps: 10, targetSets: 4, type: "Compound", muscle: "Back" },
    { name: "Lat Pulldown", defaultWeight: 45, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Back" },
    { name: "Bicep Curl", defaultWeight: 12, unit: "kg", reps: 12, targetSets: 3, type: "Isolation", muscle: "Biceps" },
    { name: "Hammer Curl", defaultWeight: 12, unit: "kg", reps: 12, targetSets: 3, type: "Isolation", muscle: "Biceps" },
    { name: "Face Pull", defaultWeight: 17.5, unit: "kg", reps: 15, targetSets: 4, type: "Isolation", muscle: "Shoulders" },
  ],
  Legs: [
    { name: "Barbell Squat", defaultWeight: 60, unit: "kg", reps: 8, targetSets: 4, type: "Compound", muscle: "Quads" },
    { name: "Romanian Deadlift", defaultWeight: 50, unit: "kg", reps: 10, targetSets: 4, type: "Compound", muscle: "Hamstrings" },
    { name: "Leg Press", defaultWeight: 100, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Quads" },
    { name: "Leg Curl", defaultWeight: 30, unit: "kg", reps: 12, targetSets: 3, type: "Isolation", muscle: "Hamstrings" },
    { name: "Calf Raise", defaultWeight: 40, unit: "kg", reps: 15, targetSets: 4, type: "Isolation", muscle: "Calves" },
    { name: "Hip Thrust", defaultWeight: 80, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Glutes" },
  ],
  Upper: [
    { name: "Bench Press", defaultWeight: 40, unit: "kg", reps: 8, targetSets: 4, type: "Compound", muscle: "Chest" },
    { name: "Pullup", defaultWeight: 0, unit: "kg", reps: 8, targetSets: 3, type: "Compound", muscle: "Back" },
    { name: "Dumbbell Shoulder Press", defaultWeight: 14, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Shoulders" },
    { name: "Barbell Row", defaultWeight: 40, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Back" },
    { name: "Tricep Rope Pushdown", defaultWeight: 15, unit: "kg", reps: 12, targetSets: 3, type: "Isolation", muscle: "Triceps" },
    { name: "Bicep Curl", defaultWeight: 12, unit: "kg", reps: 12, targetSets: 3, type: "Isolation", muscle: "Biceps" },
  ],
  Lower: [
    { name: "Barbell Squat", defaultWeight: 60, unit: "kg", reps: 8, targetSets: 4, type: "Compound", muscle: "Quads" },
    { name: "Romanian Deadlift", defaultWeight: 50, unit: "kg", reps: 10, targetSets: 4, type: "Compound", muscle: "Hamstrings" },
    { name: "Bulgarian Split Squat", defaultWeight: 12, unit: "kg", reps: 10, targetSets: 3, type: "Compound", muscle: "Quads" },
    { name: "Calf Raise", defaultWeight: 40, unit: "kg", reps: 15, targetSets: 4, type: "Isolation", muscle: "Calves" },
    { name: "Hanging Leg Raise", defaultWeight: 0, unit: "kg", reps: 12, targetSets: 3, type: "Isolation", muscle: "Abs" },
  ]
};

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exercise Filter States
  const [selectedExercise, setSelectedExercise] = useState<ExerciseStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Recommended Workout States & Dashboard Tabs
  const [dashboardTab, setDashboardTab] = useState<'insight' | 'trends'>('insight');
  const [activeSplit, setActiveSplit] = useState<'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower'>('Push');

  // Progressive Disclosure: Track expanded state for exercise recommendations by name
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});

  // Visualization simplification: show e1RM by default
  const [showEst1RM, setShowEst1RM] = useState(true);

  // Backend recommendation results, keyed by normalised exercise name
  const [recommendations, setRecommendations] = useState<Record<string, RecommendationResult>>({});
  const [recLoading, setRecLoading] = useState(false);

  // Dynamic splits discovered from actual DB data (replaces hardcoded SPLIT_CONFIG)
  const [dynamicSplits, setDynamicSplits] = useState<Record<string, RecommendedExercise[]> | null>(null);

  // Lookup helper for historical exercise stats
  const findExerciseStats = (name: string): ExerciseStats | null => {
    if (!data?.exercises_by_muscle) return null;
    const searchName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (const muscleGroup of Object.values(data.exercises_by_muscle)) {
      for (const stats of muscleGroup) {
        const statsName = stats.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (statsName === searchName || statsName.includes(searchName) || searchName.includes(statsName)) {
          return stats;
        }
      }
    }
    return null;
  };

  // Generate smart recommendations (backend-first, client-side fallback)
  const getExerciseRecommendation = (ex: RecommendedExercise) => {
    // 1️⃣  Prefer the backend RecommendationResult if available
    const normalKey = ex.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const backendRec = Object.entries(recommendations).find(([k]) =>
      k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalKey
    )?.[1];

    if (backendRec) {
      const isNew = backendRec.fatigue_state === 'new';
      const weight = backendRec.recommended_weight;
      return {
        weight,
        unit: backendRec.unit,
        reps: ex.reps,
        isNew,
        fatigue_state: backendRec.fatigue_state,
        confidence: backendRec.confidence,
        sessions_used: backendRec.sessions_used,
        reason: backendRec.audit_trail,
        fromBackend: true,
      };
    }

    // 2️⃣  Client-side fallback: use exercise history max_weight if available
    const stats = findExerciseStats(ex.name);
    if (!stats) {
      return {
        weight: ex.defaultWeight,
        unit: ex.unit,
        reps: ex.reps,
        isNew: true,
        fatigue_state: 'new' as const,
        confidence: 0,
        sessions_used: 0,
        reason: `Starting weight calibrated for ${ex.name}. Start comfortable and adjust as needed.`,
        fromBackend: false,
      };
    }

    const isCompound = ex.type === 'Compound';
    const increment = isCompound ? 2.5 : 1.25;
    const recommendedWeight = stats.max_weight + increment;

    return {
      weight: recommendedWeight,
      unit: stats.unit,
      reps: ex.reps,
      isNew: false,
      fatigue_state: 'clear' as const,
      confidence: 0,
      sessions_used: 0,
      reason: `Based on your all-time best of ${stats.max_weight}${stats.unit}. Added +${increment}${stats.unit} for progressive overload.`,
      fromBackend: false,
    };
  };

  // Natural language formatter to link to QuickLog view
  const handleLogWorkout = (splitName: string, exercises: RecommendedExercise[]) => {
    const rawTextLines = [`${splitName} Workout - Recommended Split` ];
    
    exercises.forEach(ex => {
      const rec = getExerciseRecommendation(ex);
      if (rec.weight > 0) {
        rawTextLines.push(`${ex.name}: ${ex.targetSets} sets of ${rec.reps} reps at ${rec.weight}${rec.unit}`);
      } else {
        rawTextLines.push(`${ex.name}: ${ex.targetSets} sets of ${rec.reps} bodyweight reps`);
      }
    });

    const rawText = rawTextLines.join('\n');
    localStorage.setItem('gym_tracker_draft', rawText);
    (window as any).setActiveView?.('quick-log');
  };

  // Heuristic to predict today's split based on PPL cycle of last logged workout
  const predictTodaySplit = (analyticsData: AnalyticsData): 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' => {
    if (!analyticsData?.exercises_by_muscle) return 'Push';

    const PUSH_MUSCLES = new Set(["Chest", "Shoulders", "Triceps"]);
    const PULL_MUSCLES = new Set(["Back", "Biceps", "Traps", "Forearms"]);
    const LEGS_MUSCLES = new Set(["Quads", "Hamstrings", "Glutes", "Calves", "Abs", "Obliques"]);

    const workoutsByDate: Record<string, Record<string, number>> = {};

    Object.entries(analyticsData.exercises_by_muscle).forEach(([muscle, exercises]) => {
      let split: 'Push' | 'Pull' | 'Legs' = 'Push';
      if (PUSH_MUSCLES.has(muscle)) split = 'Push';
      else if (PULL_MUSCLES.has(muscle)) split = 'Pull';
      else if (LEGS_MUSCLES.has(muscle)) split = 'Legs';

      exercises.forEach(ex => {
        ex.history?.forEach(pt => {
          const date = pt.date;
          if (!workoutsByDate[date]) {
            workoutsByDate[date] = { Push: 0, Pull: 0, Legs: 0 };
          }
          workoutsByDate[date][split] = (workoutsByDate[date][split] || 0) + 1;
        });
      });
    });

    const sortedDates = Object.keys(workoutsByDate).sort();
    if (sortedDates.length === 0) return 'Push';

    const lastDate = sortedDates[sortedDates.length - 1];
    const lastDateSplits = workoutsByDate[lastDate];

    let lastSplit: 'Push' | 'Pull' | 'Legs' = 'Push';
    let maxCount = 0;
    Object.entries(lastDateSplits).forEach(([splitName, count]) => {
      if (count > maxCount) {
        maxCount = count;
        lastSplit = splitName as any;
      }
    });

    if (lastSplit === 'Push') return 'Pull';
    if (lastSplit === 'Pull') return 'Legs';
    return 'Push';
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchRecommendations = async () => {
      try {
        setRecLoading(true);
        const res = await fetch('/api/recommendations/dynamic');
        if (!res.ok) throw new Error('Failed to fetch dynamic recommendations');
        const result = await res.json();

        // Use dynamic splits from DB data if available
        if (result.splits && Object.values(result.splits).some((s: any) => s.length > 0)) {
          setDynamicSplits(result.splits);
        }

        // Store recommendations keyed by exercise name
        if (result.recommendations) {
          setRecommendations(result.recommendations);
        }
      } catch (err) {
        console.warn('Dynamic recommendations unavailable, falling back to defaults:', err);
        // Fallback: use hardcoded splits with the original endpoint
        try {
          const allExercises = Array.from(
            new Set(
              Object.values(SPLIT_CONFIG).flatMap(split => split.map(ex => ex.name))
            )
          );
          const qs = encodeURIComponent(allExercises.join(','));
          const fallbackRes = await fetch(`/api/recommendations?exercises=${qs}`);
          if (fallbackRes.ok) {
            const recs: RecommendationResult[] = await fallbackRes.json();
            const map: Record<string, RecommendationResult> = {};
            recs.forEach(r => { map[r.exercise] = r; });
            setRecommendations(map);
          }
        } catch { /* silently fall back to client-side heuristics */ }
      } finally {
        setRecLoading(false);
      }
    };

    fetchAnalytics();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    if (data) {
      const predicted = predictTodaySplit(data);
      setActiveSplit(predicted);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        <p className="text-muted-foreground font-semibold font-heading text-sm">Analyzing your progress...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 px-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <div>
          <h3 className="text-xl font-bold text-foreground font-heading">Analytics Unavailable</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
            {error || 'We couldn\'t load your analytics data at this time.'}
          </p>
        </div>
      </div>
    );
  }

  // Compute current exercises for the active split (prefer dynamic DB data over hardcoded)
  const currentSplitExercises: RecommendedExercise[] = dynamicSplits?.[activeSplit] ?? SPLIT_CONFIG[activeSplit] ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pt-2 pb-36 md:pb-12"
    >
      <header className="flex items-end justify-between gap-4 px-1">
        <div className="space-y-1.5">
          <h1 className="display-title text-[1.75rem] md:text-[2.25rem]">
            <span className="gradient-text">Analytics</span>
          </h1>
          <p className="body-copy text-sm">Progress, load, and what to train next.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => (window as any).setActiveView?.('ai-insights')}
            className="btn-tap-scale flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            title="AI Insights"
          >
            Insights
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Exercise Filter Dropdown */}
      {data.exercises_by_muscle && Object.keys(data.exercises_by_muscle).length > 0 && (
        <div className="relative z-50 px-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest font-heading">
              Filter by Exercise
            </span>
            {selectedExercise && (
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-[10.5px] font-bold text-accent-blue hover:text-accent-blue/80 flex items-center gap-0.5 transition-colors font-heading"
              >
                Clear Filter
              </button>
            )}
          </div>

          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full mt-2 flex items-center justify-between px-5 py-4 ios-card bg-card border border-border hover:border-border/80 transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent-blue-bg text-accent-blue shrink-0">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Active Selection</p>
                <p className="text-sm font-black text-foreground font-heading mt-0.5">
                  {selectedExercise ? selectedExercise.name : "All Exercises"}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-250 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/5"
                  onClick={() => setIsDropdownOpen(false)}
                />

                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.99 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-2 p-3 bg-card border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-md z-50 max-h-[380px] overflow-y-auto space-y-3"
                >
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-secondary text-foreground text-xs font-semibold rounded-xl border border-transparent focus:border-accent-blue/30 focus:outline-none transition-all"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Exercises Options */}
                  <div className="space-y-4 overflow-y-auto max-h-[260px] pr-1">
                    {(!searchQuery || "all exercises general dashboard".includes(searchQuery.toLowerCase())) && (
                      <button
                        onClick={() => {
                          setSelectedExercise(null);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-xs font-bold font-heading ${selectedExercise === null
                          ? 'bg-accent-blue-bg text-accent-blue'
                          : 'hover:bg-secondary text-foreground'
                          }`}
                      >
                        <span>General</span>
                      </button>
                    )}

                    {Object.entries(data.exercises_by_muscle || {}).map(([muscle, exercises]) => {
                      const filtered = exercises.filter(ex =>
                        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      if (filtered.length === 0) return null;

                      return (
                        <div key={muscle} className="space-y-1.5">
                          <div className="px-2 py-0.5 text-[9px] font-extrabold text-muted-foreground/60 uppercase tracking-widest font-heading border-b border-border/40">
                            {muscle}
                          </div>
                          <div className="space-y-1">
                            {filtered.map((ex) => (
                              <button
                                key={ex.name}
                                onClick={() => {
                                  setSelectedExercise(ex);
                                  setIsDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${selectedExercise?.name === ex.name
                                  ? 'bg-accent-blue-bg text-accent-blue'
                                  : 'hover:bg-secondary text-foreground'
                                  }`}
                              >
                                <span className="text-xs font-bold font-heading truncate max-w-[190px]">
                                  {ex.name}
                                </span>
                                <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-card/60 rounded-md border border-border/30 text-muted-foreground/90 shrink-0">
                                  Max: {ex.max_weight} {ex.unit}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Dynamic Views Rendering */}
      {selectedExercise ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<Trophy className="w-4 h-4" />}
              label="All-Time Best"
              value={selectedExercise.max_weight}
              subtext={`Lifting unit: ${selectedExercise.unit}`}
              accent="orange"
            />
            <StatCard
              icon={<Flame className="w-4 h-4" />}
              label="Total Sets"
              value={selectedExercise.total_sets}
              subtext={`${selectedExercise.total_reps} reps logged`}
              accent="violet"
            />
          </div>

          {/* Volume Insights */}
          <div className="ios-card bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent-green-bg text-accent-green shrink-0">
                <Dumbbell className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest font-heading">Total Load Moved</span>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-1">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Exercise Volume</p>
                <p className="text-2xl font-black text-foreground font-heading tracking-tight leading-tight">
                  {selectedExercise.total_volume.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">{selectedExercise.unit}</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Avg Reps / Set</p>
                <p className="text-2xl font-black text-foreground font-heading tracking-tight leading-tight">
                  {selectedExercise.total_sets > 0 ? (selectedExercise.total_reps / selectedExercise.total_sets).toFixed(1) : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Strength Progression Chart */}
          <div className="ios-card bg-card p-6 border border-border space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-accent-blue-bg text-accent-blue shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest font-heading">Strength Progression</span>
              </div>
              {selectedExercise.unit === "kg" ? (
                <div className="flex bg-secondary p-0.5 rounded-lg border border-border">
                  <button
                    onClick={() => setShowEst1RM(true)}
                    className={`px-2 py-1 text-[9px] font-bold font-heading rounded-md transition-all ${
                      showEst1RM
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Est. 1RM
                  </button>
                  <button
                    onClick={() => setShowEst1RM(false)}
                    className={`px-2 py-1 text-[9px] font-bold font-heading rounded-md transition-all ${
                      !showEst1RM
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Max Weight
                  </button>
                </div>
              ) : (
                <span className="ios-badge bg-secondary text-muted-foreground font-mono uppercase text-[9px] font-bold">
                  Chronological • {selectedExercise.unit}
                </span>
              )}
            </div>

            <div className="h-[250px] w-full pr-2">
              {selectedExercise.history && selectedExercise.history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedExercise.history} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-heading)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(str) => {
                        try {
                          const dateObj = new Date(str);
                          return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        } catch {
                          return str;
                        }
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                        fontSize: '12px'
                      }}
                      labelFormatter={(str) => `Date: ${new Date(str).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}`}
                    />
                    {selectedExercise.unit === "kg" && showEst1RM ? (
                      <Line
                        type="monotone"
                        dataKey="est_1rm"
                        stroke="hsl(var(--accent-violet))"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: 'hsl(var(--accent-violet))', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--accent-violet))', strokeWidth: 2, fill: 'hsl(var(--accent-violet))' }}
                        name="Est. 1RM"
                      />
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="hsl(var(--accent-blue))"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: 'hsl(var(--accent-blue))', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--accent-blue))', strokeWidth: 2, fill: 'hsl(var(--accent-blue))' }}
                        name="Max Weight"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
                  No history data available for this exercise.
                </div>
              )}
            </div>

            {selectedExercise.unit === "kg" && (
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold justify-center pt-2 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <span className={`w-3 h-0.5 inline-block rounded-full ${showEst1RM ? 'bg-accent-violet' : 'bg-accent-blue'}`} />
                  <span>{showEst1RM ? 'Estimated 1-Rep Max (e1RM)' : 'Max Weight'}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedExercise(null)}
            className="w-full py-4 text-xs font-bold font-heading text-accent-blue bg-accent-blue-bg border border-accent-blue/20 rounded-2xl hover:bg-accent-blue-bg/85 transition-all text-center flex items-center justify-center gap-1.5"
          >
            Show General Analytics Overview
          </button>
        </motion.div>
      ) : (
        /* Dashboard View (Today's Insight vs Macro Trends) */
        <div className="space-y-6">
          {/* Tab Selector */}
          <div className="px-1">
            <div className="flex bg-secondary/50 p-1 rounded-2xl border border-border">
              <button
                onClick={() => setDashboardTab('insight')}
                className={`flex-1 py-2.5 text-xs font-black font-heading rounded-xl transition-all ${
                  dashboardTab === 'insight'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Today's Insight
              </button>
              <button
                onClick={() => setDashboardTab('trends')}
                className={`flex-1 py-2.5 text-xs font-black font-heading rounded-xl transition-all ${
                  dashboardTab === 'trends'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Macro Trends
              </button>
            </div>
          </div>

          {dashboardTab === 'insight' ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header info */}
              <div className="space-y-1.5 px-1 font-heading">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-accent-blue fill-accent-blue/10" />
                    <h3 className="text-lg font-black tracking-tight text-foreground">
                      Today's Split: {activeSplit}
                    </h3>
                  </div>
                  <select
                    value={activeSplit}
                    onChange={(e) => setActiveSplit(e.target.value as any)}
                    className="text-xs font-bold text-accent-blue bg-transparent border-none outline-none cursor-pointer focus:ring-0 focus:outline-none"
                  >
                    <option value="Push">Push Split</option>
                    <option value="Pull">Pull Split</option>
                    <option value="Legs">Legs Split</option>
                    <option value="Upper">Upper Split</option>
                    <option value="Lower">Lower Split</option>
                  </select>
                </div>
                <p className="text-muted-foreground text-xs font-semibold leading-relaxed">
                  Based on your history, today is predicted to be a <span className="text-accent-blue">{activeSplit}</span> day.
                </p>
              </div>

              {/* Exercises in current split */}
              <div className="space-y-6 px-1">
                {currentSplitExercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 px-6">
                    <div className="p-4 rounded-2xl bg-secondary/60">
                      <Dumbbell className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground font-heading">No {activeSplit} exercises logged yet</p>
                    <p className="text-xs text-muted-foreground/60 max-w-[260px] leading-relaxed">Log a workout containing {activeSplit.toLowerCase()} exercises and they’ll appear here with personalised recommendations.</p>
                  </div>
                ) : currentSplitExercises.map((ex, index) => {
                  const rec = getExerciseRecommendation(ex);

                  const fatigueBadge: Record<string, { label: string; cls: string }> = {
                    new:            { label: 'Calibrating',   cls: 'bg-accent-orange-bg text-accent-orange' },
                    clear:          { label: 'Overload Ready', cls: 'bg-accent-green-bg text-accent-green' },
                    overreaching:   { label: 'Scaled Load',   cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
                    severe_fatigue: { label: 'Deload',        cls: 'bg-red-500/10 text-red-500' },
                  };
                  const badge = fatigueBadge[rec.fatigue_state] ?? fatigueBadge['clear'];

                  const confidencePct = Math.round((rec.confidence ?? 0) * 100);
                  const sessionsUsed = rec.sessions_used ?? 0;
                  const isExpanded = !!expandedAnalysis[ex.name];

                  return (
                    <motion.div
                      key={ex.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card border border-border rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-300 group flex flex-col btn-tap-scale"
                    >
                      {/* Main panel */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                        {/* Category/Type Indicators */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="ios-badge bg-secondary text-muted-foreground uppercase text-[9px] py-0.5 tracking-wider">
                              {ex.muscle}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                              {ex.type}
                            </span>
                            {ex.occurrence_count != null && (
                              <span className="text-[9px] font-bold text-muted-foreground/40 font-mono">
                                {ex.occurrence_count} sets
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setExpandedAnalysis(prev => ({
                                  ...prev,
                                  [ex.name]: !prev[ex.name]
                                }));
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-heading border transition-all ${
                                isExpanded
                                  ? 'bg-accent-blue text-white border-accent-blue'
                                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                              }`}
                            >
                              <Sparkles className="w-3 h-3 shrink-0" />
                              AI Analysis
                            </button>
                            <span className={`ios-badge uppercase text-[9.5px] font-black ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Title & Large Metric Display */}
                        <div className="space-y-4">
                          <h4 className="text-2xl font-black text-foreground font-heading tracking-tight leading-tight group-hover:text-accent-blue transition-colors">
                            {ex.name}
                          </h4>

                          {/* Numeric target blocks */}
                          <div className="flex items-end gap-8 pt-1">
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase font-black text-muted-foreground/60 tracking-widest font-mono">Target Weight</span>
                              <p className="text-3xl font-black text-foreground font-mono mt-0.5 leading-none tracking-tight">
                                {rec.weight > 0 ? (
                                  <>
                                    {rec.weight}{' '}
                                    <span className="text-[11px] font-bold text-muted-foreground font-sans uppercase">kg</span>
                                  </>
                                ) : (
                                  <span className="text-xl font-bold text-muted-foreground font-sans">Bodyweight</span>
                                )}
                              </p>
                            </div>

                            <div className="h-10 w-px bg-border/80" />

                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase font-black text-muted-foreground/60 tracking-widest font-mono">Target Reps</span>
                              <p className="text-3xl font-black text-foreground font-mono mt-0.5 leading-none tracking-tight">
                                {rec.reps}{' '}
                                <span className="text-[11px] font-bold text-muted-foreground font-sans uppercase">reps</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="p-6 bg-secondary/25 border-t border-border/50 space-y-4">
                          {rec.fromBackend && (
                            <div className="flex items-center justify-between py-1 font-mono text-[10px]">
                              <span className="text-muted-foreground/60 uppercase font-black tracking-widest">
                                Engine Confidence
                              </span>
                              <span className="text-foreground font-black">
                                {confidencePct}% ({sessionsUsed}/{12} sessions)
                              </span>
                            </div>
                          )}

                          <div className="relative overflow-hidden pt-2 border-t border-border/40">
                            <div className="flex items-center gap-1.5 mb-2 select-none">
                              <Sparkles className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                              <span className="text-[9px] uppercase font-black text-accent-blue tracking-widest font-mono">
                                {rec.fromBackend ? 'Audit Trail' : 'AI Suggestion'}
                              </span>
                            </div>

                            {recLoading && !rec.fromBackend ? (
                              <div className="flex items-center gap-2 text-muted-foreground/60">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-[11px] font-semibold">Analysing sessions…</span>
                              </div>
                            ) : (
                              <p className="text-[12px] font-semibold leading-relaxed text-muted-foreground/90 italic relative z-10">
                                &ldquo;{rec.reason}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {currentSplitExercises.length > 0 && (
                <div className="pt-4 px-1">
                  <button
                    onClick={() => handleLogWorkout(activeSplit, currentSplitExercises)}
                    className="w-full py-4.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-extrabold tracking-tight rounded-2xl shadow-lg shadow-accent-blue/10 hover:shadow-accent-blue/20 transition-all duration-300 text-sm tracking-wide text-center flex items-center justify-center gap-2 btn-tap-scale"
                  >
                    <Plus className="w-4 h-4 stroke-[3.5] text-white" />
                    Log {activeSplit} Workout
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Overview Cards */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Active Days"
                  value={data.total_workouts}
                  subtext={`${data.gym_session_count} Gym • ${data.strava_activity_count} Strava`}
                  accent="blue"
                />
                <StatCard
                  icon={<Calendar className="w-4 h-4" />}
                  label="This Week"
                  value={data.workouts_this_week}
                  subtext="Activities"
                  accent="violet"
                />
              </div>

              {/* Focus Insights */}
              <div className="ios-card bg-card border border-border p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-accent-orange-bg text-accent-orange shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest font-heading">Focus Distribution</span>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-1">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Most Trained</p>
                    <p className="text-2xl font-black text-foreground font-heading tracking-tight leading-tight">{data.most_trained}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Least Trained</p>
                    <p className="text-2xl font-black text-foreground font-heading tracking-tight leading-tight">{data.least_trained}</p>
                  </div>
                </div>
              </div>

              {/* Volume Chart */}
              <div className="ios-card bg-card p-6 border border-border space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-accent-green-bg text-accent-green shrink-0">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest font-heading">Volume by Muscle Group</span>
                  </div>
                  <span className="ios-badge bg-secondary text-muted-foreground font-mono">HARD SETS • ALL TIME</span>
                </div>

                <div className="h-[250px] w-full pr-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.volume_per_muscle} layout="vertical" margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="muscle"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-heading)' }}
                        width={80}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--secondary) / 0.4)', radius: 6 }}
                        contentStyle={{
                          borderRadius: '16px',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--card))',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '12px'
                        }}
                        labelStyle={{ fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))' }}
                        itemStyle={{ fontWeight: '600', color: 'hsl(var(--accent-blue))' }}
                      />
                      <Bar
                        dataKey="volume"
                        fill="hsl(var(--foreground))"
                        radius={[0, 6, 6, 0]}
                        barSize={18}
                      >
                        {data.volume_per_muscle.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext: string;
  accent?: 'blue' | 'orange' | 'violet' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtext, accent = 'blue' }) => {
  const accentColors = {
    blue: 'bg-accent-blue-bg text-accent-blue',
    orange: 'bg-accent-orange-bg text-accent-orange',
    violet: 'bg-accent-violet-bg text-accent-violet',
    green: 'bg-accent-green-bg text-accent-green',
  };

  return (
    <div className="ios-card bg-card border border-border p-5 space-y-3 btn-tap-scale">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-xl shrink-0 ${accentColors[accent]}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-heading">{label}</span>
      </div>
      <div>
        <div className="text-3xl font-black text-foreground font-mono tracking-tight">{value}</div>
        <p className="text-[10.5px] font-semibold text-muted-foreground/80 mt-1 leading-relaxed">{subtext}</p>
      </div>
    </div>
  );
};
