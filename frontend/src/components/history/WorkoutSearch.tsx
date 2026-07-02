import React from 'react';
import { Search, X } from 'lucide-react';

interface WorkoutSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const WorkoutSearch: React.FC<WorkoutSearchProps> = ({ value, onChange }) => {
  return (
    <div className="history-search">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-blue"
        strokeWidth={2.25}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by exercise, date, or session name…"
        aria-label="Search workout history"
        className="history-search-input"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="history-search-clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
