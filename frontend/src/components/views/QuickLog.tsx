
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useWorkoutStore } from '@/lib/workout-store';
import type { WorkoutEntry } from '@/lib/types';
import { mergeExerciseSuggestions } from '@/lib/exercise-catalog';
import { parseQuickLogInput, deriveExerciseSuggestions } from '@/lib/quick-log-parser';
import { WorkoutInputPane, appendExerciseToDraft } from '@/components/quick-log/WorkoutInputPane';
import { ParsedPreview } from '@/components/quick-log/ParsedPreview';
import { QuickChips } from '@/components/quick-log/QuickChips';
import { StickySaveBar } from '@/components/quick-log/StickySaveBar';
import { tasteSpring } from '@/lib/motion';

interface APIParsedWorkoutEntry {
  date: string;
  exercise_name: string;
  weight: number | null;
  unit: string;
  reps: number;
  failure: boolean;
  rir: number | null;
  notes?: string;
}

interface APIParsedWorkoutLog {
  entries: APIParsedWorkoutEntry[];
}

const API_BASE_URL = '/api';
const STORAGE_KEY = 'gym_tracker_draft';

export const QuickLog: React.FC = () => {
  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || '';
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const { toast } = useToast();
  const { sessions, addSession, refreshSessions } = useWorkoutStore();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (input.trim()) {
      localStorage.setItem(STORAGE_KEY, input);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [input]);

  const allSuggestions = useMemo(() => mergeExerciseSuggestions(sessions), [sessions]);
  const recentChips = useMemo(
    () => deriveExerciseSuggestions(sessions).slice(0, 6).map((item) => item.name),
    [sessions],
  );
  const preview = useMemo(() => parseQuickLogInput(input), [input]);

  const handleChipSelect = (exerciseName: string) => {
    setInput((current) => appendExerciseToDraft(current, exerciseName));
  };

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setJustSaved(false);

    try {
      const response = await fetch(`${API_BASE_URL}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: input }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(async () => {
          const text = await response.text();
          return { detail: text || 'Unknown server error' };
        });
        throw new Error(errorData.detail || 'Failed to parse workout');
      }

      const jsonResponse = await response.json();
      const parsedData: APIParsedWorkoutLog = jsonResponse.data;

      const result: WorkoutEntry[] = parsedData.entries.map((entry) => ({
        exercise: entry.exercise_name,
        weight: entry.weight ?? 0,
        weightUnit: entry.unit || 'kg',
        sets: 1,
        reps: entry.reps,
        notes: `${entry.failure ? 'To failure. ' : ''}${entry.rir !== null ? `RIR ${entry.rir}. ` : ''}${entry.notes || ''}`.trim(),
      }));

      if (result.length === 0) throw new Error('No workout data could be extracted.');

      addSession(result, input);
      await refreshSessions();
      setInput('');
      localStorage.removeItem(STORAGE_KEY);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2400);

      toast({
        title: 'Workout logged',
        description: `${result.length} sets saved.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not log workout',
        description: error instanceof Error ? error.message : 'Check your notes and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = input.trim().length > 0;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tasteSpring}
      className="space-y-8 pb-36 md:space-y-10 md:pb-12"
    >
      {recentChips.length > 0 && (
        <div className="pt-4">
          <QuickChips suggestions={recentChips} onSelect={handleChipSelect} />
        </div>
      )}

      <WorkoutInputPane
        value={input}
        onChange={setInput}
        suggestions={allSuggestions}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {(preview.lines.length > 0 || input.trim().length > 0) && (
        <div className="space-y-4 pt-2">
          <ParsedPreview lines={preview.lines} isParsing={false} />
        </div>
      )}

      <StickySaveBar
        exerciseCount={preview.exerciseCount}
        setCount={preview.setCount}
        totalVolume={preview.totalVolume}
        usesMixedUnits={preview.usesMixedUnits}
        isSubmitting={isSubmitting}
        disabled={!hasContent}
        justSaved={justSaved}
        onSave={handleSubmit}
      />
    </motion.div>
  );
};
