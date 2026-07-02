import React from 'react';
import { ArrowDown, ArrowUp, Trophy } from 'lucide-react';
import type { SessionProgress } from '@/lib/history-utils';

interface ProgressDeltaProps {
  progress: SessionProgress;
}

export const ProgressDelta: React.FC<ProgressDeltaProps> = ({ progress }) => {
  const hasSignals =
    progress.volumeDeltaPct != null ||
    progress.durationDeltaMins != null ||
    progress.hasPR;

  if (!hasSignals) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {progress.volumeDeltaPct != null && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold font-heading ${
            progress.volumeDeltaPct >= 0
              ? 'bg-accent-green-bg text-accent-green'
              : 'bg-accent-orange-bg text-accent-orange'
          }`}
        >
          {progress.volumeDeltaPct >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          Volume {progress.volumeDeltaPct >= 0 ? '+' : ''}
          {progress.volumeDeltaPct}%
        </span>
      )}

      {progress.durationDeltaMins != null && progress.durationDeltaMins !== 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          Duration {progress.durationDeltaMins > 0 ? '+' : ''}
          {progress.durationDeltaMins}m
        </span>
      )}

      {progress.hasPR && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-violet-bg px-2.5 py-1 text-xs font-bold font-heading text-accent-violet">
          <Trophy className="h-3.5 w-3.5" />
          New PR
        </span>
      )}
    </div>
  );
};
