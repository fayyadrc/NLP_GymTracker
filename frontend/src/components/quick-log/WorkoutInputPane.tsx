import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  getExerciseQueryAtCursor,
  searchExercises,
} from '@/lib/exercise-suggestions';
import { tasteSpring } from '@/lib/motion';

interface WorkoutInputPaneProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const WorkoutInputPane: React.FC<WorkoutInputPaneProps> = ({
  value,
  onChange,
  suggestions,
  onSubmit,
  isSubmitting = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const reduceMotion = useReducedMotion();

  const syncCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setCursorPosition(textarea.selectionStart ?? value.length);
  }, [value.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(420, textarea.scrollHeight)}px`;
  }, [value]);

  const queryContext = useMemo(
    () => getExerciseQueryAtCursor(value, cursorPosition),
    [value, cursorPosition],
  );

  const matchingSuggestions = useMemo(() => {
    if (!queryContext) return [];
    return searchExercises(queryContext.query, suggestions);
  }, [queryContext, suggestions]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [matchingSuggestions]);

  const applySuggestion = (exerciseName: string) => {
    if (!queryContext) return;
    const nextValue = `${value.slice(0, queryContext.replaceStart)}${exerciseName}${value.slice(queryContext.replaceEnd)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const nextCursor = queryContext.replaceStart + exerciseName.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
      setCursorPosition(nextCursor);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
      return;
    }

    if (matchingSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % matchingSuggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex(
          (prev) => (prev - 1 + matchingSuggestions.length) % matchingSuggestions.length,
        );
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) {
        event.preventDefault();
        applySuggestion(matchingSuggestions[activeSuggestionIndex]);
      }
    }
  };

  return (
    <section className="flex flex-col overflow-hidden">
      <div className="relative py-2 md:py-4">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setCursorPosition(event.target.selectionStart ?? event.target.value.length);
          }}
          onSelect={syncCursor}
          onKeyUp={syncCursor}
          onClick={syncCursor}
          onKeyDown={handleKeyDown}
          aria-label="Workout session notes"
          aria-autocomplete="list"
          aria-expanded={matchingSuggestions.length > 0}
          placeholder={`Bench Press 80kg x 8, 75 x 10

Incline DB Press 22.5kg x 6

Pull ups bodyweight x 12`}
          disabled={isSubmitting}
          className="min-h-[420px] w-full resize-none bg-transparent text-[1.0625rem] leading-[2] tracking-[-0.015em] text-foreground outline-none placeholder:text-muted-foreground/40 selection:bg-accent-signal-bg selection:text-foreground focus-visible:ring-0 md:min-h-[480px] md:text-[1.125rem]"
          spellCheck={false}
          autoFocus
        />

        <AnimatePresence>
          {matchingSuggestions.length > 0 && queryContext && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={tasteSpring}
              className="exercise-suggest-popover absolute left-7 right-7 top-24 z-20 md:left-10 md:right-10"
              role="listbox"
              aria-label="Exercise suggestions"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="data-value text-muted-foreground">
                  Pick an exercise for &ldquo;{queryContext.query}&rdquo;
                </p>
              </div>
              {matchingSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applySuggestion(suggestion);
                  }}
                  className={`exercise-suggest-item ${
                    index === activeSuggestionIndex
                      ? 'exercise-suggest-item-active'
                      : 'exercise-suggest-item-idle'
                  }`}
                >
                  <span>{suggestion}</span>
                  <span className="data-value opacity-50">
                    {index === activeSuggestionIndex ? '↵' : 'tab'}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export const appendExerciseToDraft = (value: string, exerciseName: string): string => {
  const trimmed = value.trimEnd();
  if (!trimmed) return `${exerciseName}\n\n`;
  const needsBreak = !trimmed.endsWith('\n');
  return needsBreak ? `${trimmed}\n\n${exerciseName}\n` : `${trimmed}${exerciseName}\n`;
};

export { getCurrentLineContext } from '@/lib/exercise-suggestions';
