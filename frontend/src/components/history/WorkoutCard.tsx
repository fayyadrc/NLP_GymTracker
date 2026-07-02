import React, { useMemo, useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { WorkoutSession } from '@/lib/types';
import {
  computeSessionProgress,
  formatSessionDate,
  formatVolumeKg,
  getSessionVolume,
  getUniqueExercises,
  getWorkoutTitle,
  inferWorkoutSplit,
  isPureStravaSession,
  shortenExerciseName,
  type SplitFilter,
} from '@/lib/history-utils';
import { getSplitStripeClass } from '@/lib/split-colors';
import { WorkoutExpanded } from './WorkoutExpanded';
import { ProgressDelta } from './ProgressDelta';
import { tasteSpring } from '@/lib/motion';

interface WorkoutCardProps {
  session: WorkoutSession;
  allSessions: WorkoutSession[];
  onViewDetails: (id: string) => void;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  session,
  allSessions,
  onViewDetails,
}) => {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  const title = getWorkoutTitle(session);
  const { primary, secondary } = formatSessionDate(session);
  const volume = getSessionVolume(session);
  const setCount = session.entries.length;
  const uniqueExercises = getUniqueExercises(session);
  const pureStrava = isPureStravaSession(session);
  const split = inferWorkoutSplit(session) as SplitFilter;
  const stripeClass = getSplitStripeClass(split);

  const progress = useMemo(
    () => computeSessionProgress(session, allSessions),
    [session, allSessions],
  );

  const previewExercises = uniqueExercises.slice(0, 4).map((e) => shortenExerciseName(e.exercise));
  const remainingCount = Math.max(0, uniqueExercises.length - 4);

  return (
    <article className="history-row group">
      <div className={`history-row-stripe ${stripeClass}`} aria-hidden />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="history-row-header"
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            {progress.hasPR && (
              <span className="history-pr-badge">
                <Trophy className="h-3 w-3" />
                PR
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {secondary} · {primary}
          </p>

          {!pureStrava && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="history-volume-pill tabular-nums">
                {volume > 0 ? formatVolumeKg(volume) : `${setCount} sets`}
              </span>
              {previewExercises.map((name) => (
                <span key={name} className="history-exercise-chip">
                  {name}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="history-exercise-chip history-exercise-chip-more">
                  +{remainingCount} more
                </span>
              )}
            </div>
          )}

          {pureStrava && session.stravaActivities?.[0] && (
            <p className="mt-2 text-sm text-muted-foreground">
              {session.stravaActivities[0].name || session.stravaActivities[0].type}
            </p>
          )}

          <p className="history-expand-hint mt-3 text-sm font-medium text-accent-blue">
            {expanded ? 'Hide sets' : `View ${setCount > 0 ? `${setCount} sets` : 'details'}`}
          </p>
        </div>

        <ChevronDown
          className={`history-row-chevron ml-3 h-5 w-5 shrink-0 text-muted-foreground ${
            expanded ? 'history-row-chevron-open' : ''
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={tasteSpring}
            className="overflow-hidden"
          >
            <div className="history-row-body">
              <ProgressDelta progress={progress} />
              <WorkoutExpanded session={session} />
              <button
                type="button"
                onClick={() => onViewDetails(session.id)}
                className="mt-4 text-sm font-semibold text-accent-blue transition-colors hover:text-accent-blue/80"
              >
                Open full session →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};
