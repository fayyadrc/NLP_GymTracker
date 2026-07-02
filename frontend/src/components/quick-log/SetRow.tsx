import React from 'react';
import { X } from 'lucide-react';
import type { DraftSet } from '@/lib/workout-draft';

interface SetRowProps {
  set: DraftSet;
  index: number;
  onChange: (patch: Partial<DraftSet>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  index,
  onChange,
  onRemove,
  canRemove,
}) => {
  return (
    <div className="set-row">
      <span className="set-row-index tabular-nums">{index + 1}</span>
      <input
        type="number"
        inputMode="decimal"
        aria-label={`Set ${index + 1} weight`}
        value={set.weight || ''}
        placeholder="—"
        onChange={(e) => onChange({ weight: Number(e.target.value) || 0 })}
        className="set-row-input set-row-weight tabular-nums"
      />
      <span className="set-row-sep" aria-hidden>×</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label={`Set ${index + 1} reps`}
        value={set.reps || ''}
        placeholder="—"
        onChange={(e) => onChange({ reps: Number(e.target.value) || 0 })}
        className="set-row-input set-row-reps tabular-nums"
      />
      <span className="set-row-unit data-value">{set.unit === 'bodyweight' ? 'BW' : 'kg'}</span>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove set ${index + 1}`}
          className="set-row-remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
