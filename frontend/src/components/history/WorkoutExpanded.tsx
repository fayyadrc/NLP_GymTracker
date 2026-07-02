import React from 'react';
import type { WorkoutSession } from '@/lib/types';
import {
  formatDuration,
  getSessionCalories,
  getSessionDurationMins,
  getUniqueExercises,
  isPureStravaSession,
} from '@/lib/history-utils';

interface WorkoutExpandedProps {
  session: WorkoutSession;
  compact?: boolean;
}

export const WorkoutExpanded: React.FC<WorkoutExpandedProps> = ({
  session,
  compact = false,
}) => {
  const uniqueExercises = getUniqueExercises(session);
  const calories = getSessionCalories(session);
  const duration = getSessionDurationMins(session);
  const pureStrava = isPureStravaSession(session);

  const metrics: string[] = [];
  if (duration > 0) metrics.push(formatDuration(duration));
  if (calories > 0) metrics.push(`${Math.round(calories)} kcal`);
  if (session.totalReps) metrics.push(`${session.totalReps} reps`);

  if (compact) {
    return (
      <div className="space-y-2">
        {metrics.length > 0 && (
          <p className="text-sm tabular-nums text-muted-foreground">{metrics.join(' · ')}</p>
        )}
        {pureStrava && session.stravaActivities && (
          <p className="text-sm text-muted-foreground">
            {session.stravaActivities.map((a) => a.name).join(', ')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      {metrics.length > 0 && (
        <p className="text-sm tabular-nums text-muted-foreground">{metrics.join(' · ')}</p>
      )}

      {!pureStrava && uniqueExercises.length > 0 && (
        <ul className="space-y-2">
          {session.entries.map((entry, index) => (
            <li
              key={`${entry.exercise}-${index}`}
              className="flex items-baseline justify-between gap-4 text-sm"
            >
              <span className="font-medium text-foreground">{entry.exercise}</span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {entry.weight > 0 ? `${entry.weight}${entry.weightUnit || 'kg'} × ` : ''}
                {entry.reps}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pureStrava && session.stravaActivities && (
        <p className="text-sm text-muted-foreground">
          {session.stravaActivities.map((a) => a.name).join(', ')}
        </p>
      )}
    </div>
  );
};
