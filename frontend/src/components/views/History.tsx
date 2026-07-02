"use client";

import React, { useMemo, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useWorkoutStore } from '@/lib/workout-store';
import {
  filterSessions,
  getSplitFilterCounts,
  type SplitFilter,
} from '@/lib/history-utils';
import { HistoryHeader } from '@/components/history/HistoryHeader';
import { WorkoutSearch } from '@/components/history/WorkoutSearch';
import { WorkoutFilters } from '@/components/history/WorkoutFilters';
import { WorkoutCard } from '@/components/history/WorkoutCard';
import { tasteSpring } from '@/lib/motion';

interface HistoryProps {
  onViewDetails?: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onViewDetails }) => {
  const { sessions, syncStrava, refreshSessions } = useWorkoutStore();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [splitFilter, setSplitFilter] = useState<SplitFilter>('All');
  const reduceMotion = useReducedMotion();

  const filterCounts = useMemo(() => getSplitFilterCounts(sessions), [sessions]);
  const filteredSessions = useMemo(
    () => filterSessions(sessions, searchQuery, splitFilter),
    [sessions, searchQuery, splitFilter],
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncStrava();
      await refreshSessions();
      toast({
        title: 'Strava sync started',
        description: 'Fetching your latest activities.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: 'Could not reach Strava. Try again in a moment.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const goToQuickLog = () => {
    (window as { setActiveView?: (view: string) => void }).setActiveView?.('quick-log');
  };

  return (
    <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tasteSpring}
        className="space-y-6 pb-36 md:space-y-8 md:pb-12"
      >
        <HistoryHeader
          onSync={handleSync}
          isSyncing={isSyncing}
          onNewSession={goToQuickLog}
        />

        {sessions.length > 0 && (
          <>
            <WorkoutSearch value={searchQuery} onChange={setSearchQuery} />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Filter by split</p>
              <WorkoutFilters
                activeFilter={splitFilter}
                counts={filterCounts}
                onChange={setSplitFilter}
              />
            </div>
          </>
        )}

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue-bg">
              <Dumbbell className="h-8 w-8 text-accent-blue" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Your timeline starts here</h2>
            <p className="body-copy mt-2 max-w-sm text-base leading-relaxed">
              Log your first workout or sync Strava — every session builds your history.
            </p>
            <button type="button" onClick={goToQuickLog} className="btn-primary mt-6">
              Log first workout
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="history-empty-match">
            <p className="font-semibold text-foreground">No sessions match</p>
            <p className="body-copy mt-2 text-sm">Try a different search term or split filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'}
              {searchQuery || splitFilter !== 'All' ? ' matching your filters' : ''}
            </p>
            {filteredSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...tasteSpring, delay: Math.min(index * 0.04, 0.2) }}
              >
                <WorkoutCard
                  session={session}
                  allSessions={sessions}
                  onViewDetails={(id) => onViewDetails?.(id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
  );
};
