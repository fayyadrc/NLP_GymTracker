import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { DraftExercise } from '@/lib/workout-draft';
import { createEmptySet, formatSetPreview } from '@/lib/workout-draft';
import { SetRow } from './SetRow';

interface ExerciseBlockProps {
  exercise: DraftExercise;
  lastSessionPreview?: string | null;
  onUpdate: (exercise: DraftExercise) => void;
  onRemove: () => void;
}

export const ExerciseBlock: React.FC<ExerciseBlockProps> = ({
  exercise,
  lastSessionPreview,
  onUpdate,
  onRemove,
}) => {
  const preview = exercise.sets
    .filter((s) => s.weight > 0 || s.reps > 0)
    .map(formatSetPreview)
    .join(' | ');

  const toggleExpanded = () => {
    onUpdate({ ...exercise, expanded: !exercise.expanded });
  };

  const updateSet = (setId: string, patch: Partial<DraftExercise['sets'][0]>) => {
    onUpdate({
      ...exercise,
      sets: exercise.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    });
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    const newSet = {
      ...createEmptySet(last?.unit || 'kg'),
      weight: last?.weight || 0,
      reps: last?.reps || 0,
    };
    onUpdate({
      ...exercise,
      expanded: true,
      sets: [...exercise.sets, newSet],
    });
  };

  const removeSet = (setId: string) => {
    const nextSets = exercise.sets.filter((s) => s.id !== setId);
    onUpdate({
      ...exercise,
      sets: nextSets.length > 0 ? nextSets : [createEmptySet()],
    });
  };

  return (
    <section className="exercise-block">
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={exercise.expanded}
        className="exercise-block-header"
      >
        <div className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-[0.9375rem] font-semibold tracking-tight text-foreground">
            {exercise.name}
          </h3>
          {!exercise.expanded && preview && (
            <p className="mt-0.5 truncate text-sm tabular-nums text-muted-foreground">{preview}</p>
          )}
          {!exercise.expanded && !preview && lastSessionPreview && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{lastSessionPreview}</p>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${
            exercise.expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {exercise.expanded && (
        <div className="exercise-block-body">
          {lastSessionPreview && (
            <p className="mb-2 text-xs text-muted-foreground/70">{lastSessionPreview}</p>
          )}
          <div className="space-y-1">
            {exercise.sets.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                index={index}
                onChange={(patch) => updateSet(set.id, patch)}
                onRemove={() => removeSet(set.id)}
                canRemove={exercise.sets.length > 1}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={addSet} className="add-set-btn">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add set
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="ml-auto text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
