import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Pencil, Trophy, X, Check } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { WorkoutSession } from '@/lib/types';
import {
  computeSessionProgress,
  formatSessionDate,
  formatVolumeKg,
  getSessionVolume,
  getUniqueExercises,
  getAutoWorkoutTitle,
  inferWorkoutSplit,
  isPureStravaSession,
  shortenExerciseName,
  type SplitFilter,
} from '@/lib/history-utils';
import { getSplitStripeClass } from '@/lib/split-colors';
import { clearCustomSessionTitle, getCustomSessionTitle, setCustomSessionTitle } from '@/lib/session-titles';
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [customTitle, setCustomTitle] = useState<string | null>(() => getCustomSessionTitle(session.id));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setCustomTitle(getCustomSessionTitle(session.id));
  }, [session.id]);

  const autoTitle = useMemo(() => getAutoWorkoutTitle(session), [session]);
  const title = customTitle ?? autoTitle;
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

  const startTitleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    setTitleDraft(title);
    setIsEditingTitle(true);
  };

  const cancelTitleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditingTitle(false);
    setTitleDraft('');
  };

  const saveTitleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      clearCustomSessionTitle(session.id);
      setCustomTitle(null);
    } else {
      setCustomSessionTitle(session.id, trimmed);
      setCustomTitle(trimmed);
    }
    setIsEditingTitle(false);
  };

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
            {isEditingTitle ? (
              <div
                className="flex min-w-0 flex-1 items-center gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveTitleEdit(event as unknown as React.MouseEvent);
                    if (event.key === 'Escape') cancelTitleEdit(event as unknown as React.MouseEvent);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-base font-semibold tracking-tight text-foreground"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={saveTitleEdit}
                  className="rounded-md p-1 text-accent-green hover:bg-accent-green-bg"
                  aria-label="Save title"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelTitleEdit}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
                <button
                  type="button"
                  onClick={startTitleEdit}
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                  aria-label="Edit session title"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </>
            )}
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
