import React from 'react';

interface QuickChipsProps {
  suggestions: string[];
  onSelect: (exerciseName: string) => void;
}

export const QuickChips: React.FC<QuickChipsProps> = ({ suggestions, onSelect }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max flex-wrap gap-2.5">
        {suggestions.map((exercise) => (
          <button
            key={exercise}
            type="button"
            onClick={() => onSelect(exercise)}
            className="quick-chip"
          >
            {exercise}
          </button>
        ))}
      </div>
    </div>
  );
};
