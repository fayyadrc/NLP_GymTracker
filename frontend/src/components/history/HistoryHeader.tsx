import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

interface HistoryHeaderProps {
  onSync: () => void;
  isSyncing: boolean;
  onNewSession: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  onSync,
  isSyncing,
  onNewSession,
}) => {
  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="display-title text-[1.75rem] md:text-[2rem]">History</h1>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          aria-label="Sync Strava"
          className="icon-btn"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={onNewSession}
          aria-label="New session"
          className="icon-btn icon-btn-primary"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
};
