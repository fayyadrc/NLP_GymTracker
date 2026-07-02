import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface StickySaveBarProps {
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  usesMixedUnits: boolean;
  isSubmitting: boolean;
  disabled: boolean;
  justSaved: boolean;
  onSave: () => void;
}

export const StickySaveBar: React.FC<StickySaveBarProps> = ({
  exerciseCount,
  setCount,
  isSubmitting,
  disabled,
  justSaved,
  onSave,
}) => {
  return (
    <div className="sticky-save-bar">
      <div className="sticky-save-inner">
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">{exerciseCount}</span> ex ·{' '}
          <span className="font-semibold text-foreground">{setCount}</span> sets
        </p>

        <div className="flex items-center gap-2">
          {justSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || isSubmitting}
            className="sticky-save-btn"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
