import React from 'react';
import type { DraftExercise } from '@/lib/workout-draft';
import { getLastSessionPreview } from '@/lib/workout-draft';
import { ExerciseBlock } from './ExerciseBlock';

interface ExerciseListProps {
  exercises: DraftExercise[];
  historyEntries: { exercise: string; weight: number; reps: number; weightUnit?: string }[];
  onChange: (exercises: DraftExercise[]) => void;
}

export const ExerciseList: React.FC<ExerciseListProps> = ({
  exercises,
  historyEntries,
  onChange,
}) => {
  if (exercises.length === 0) {
    return (
      <div className="exercise-list-empty">
        <p className="text-sm font-medium text-foreground">No exercises yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Search below or tap a recent exercise to start logging.
        </p>
      </div>
    );
  }

  const updateExercise = (index: number, exercise: DraftExercise) => {
    const next = [...exercises];
    next[index] = exercise;
    onChange(next);
  };

  const removeExercise = (index: number) => {
    onChange(exercises.filter((_, i) => i !== index));
  };

  return (
    <div className="exercise-list">
      {exercises.map((exercise, index) => (
        <ExerciseBlock
          key={exercise.id}
          exercise={exercise}
          lastSessionPreview={getLastSessionPreview(exercise.name, historyEntries)}
          onUpdate={(updated) => updateExercise(index, updated)}
          onRemove={() => removeExercise(index)}
        />
      ))}
    </div>
  );
};
