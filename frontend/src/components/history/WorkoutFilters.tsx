import React from 'react';
import type { SplitFilter } from '@/lib/history-utils';
import { SPLIT_STYLES } from '@/lib/split-colors';

const FILTERS: SplitFilter[] = ['All', 'Push', 'Pull', 'Legs', 'Upper', 'Lower'];

interface WorkoutFiltersProps {
  activeFilter: SplitFilter;
  counts: Record<SplitFilter, number>;
  onChange: (filter: SplitFilter) => void;
}

export const WorkoutFilters: React.FC<WorkoutFiltersProps> = ({
  activeFilter,
  counts,
  onChange,
}) => {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          const styles = SPLIT_STYLES[filter];
          const count = counts[filter] ?? 0;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => onChange(filter)}
              className={`history-filter-chip btn-tap-scale border ${
                isActive ? styles.chipActive : styles.chip
              }`}
            >
              <span>{filter}</span>
              <span
                className={`history-filter-count ${isActive ? 'history-filter-count-active' : styles.badge}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
