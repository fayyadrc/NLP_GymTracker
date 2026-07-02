import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ParsedPreviewLine } from '@/lib/quick-log-parser';
import { tasteSpring } from '@/lib/motion';

interface ParsedPreviewProps {
  lines: ParsedPreviewLine[];
  isParsing: boolean;
  highlightNew?: boolean;
}

export const ParsedPreview: React.FC<ParsedPreviewProps> = ({
  lines,
  isParsing,
  highlightNew = true,
}) => {
  const reduceMotion = useReducedMotion();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [newLineIds, setNewLineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!highlightNew) return;
    const fresh = new Set<string>();
    lines.forEach((line) => {
      if (!seenIdsRef.current.has(line.id)) {
        fresh.add(line.id);
        seenIdsRef.current.add(line.id);
      }
    });
    if (fresh.size > 0) {
      setNewLineIds(fresh);
      const timer = window.setTimeout(() => setNewLineIds(new Set()), 500);
      return () => window.clearTimeout(timer);
    }
  }, [lines, highlightNew]);

  const exerciseCount = lines.filter((line) => line.type === 'exercise').length;
  const setCount = lines.filter((line) => line.type === 'set').length;

  return (
    <section className="taste-card flex flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-7 py-5 md:px-10 md:py-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Live parse</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Sets appear here as your notes become readable.
          </p>
        </div>
        <span
          className={`ios-badge shrink-0 border ${
            isParsing
              ? 'border-border bg-secondary text-muted-foreground skeleton-shimmer'
              : lines.length > 0
                ? 'border-accent-signal/25 bg-accent-signal-bg text-accent-signal'
                : 'border-border bg-secondary text-muted-foreground'
          }`}
        >
          {isParsing ? 'reading' : lines.length > 0 ? `${setCount} sets` : 'waiting'}
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto p-7 md:p-10">
        <AnimatePresence initial={false} mode="popLayout">
          {lines.length === 0 ? (
            <motion.div
              key="empty"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-border px-8 py-10 text-center"
            >
              <p className="text-base font-semibold text-foreground">Nothing parsed yet</p>
              <p className="body-copy mt-2 max-w-sm text-sm leading-relaxed">
                Keep typing — exercises and sets show up once the structure is clear.
              </p>
            </motion.div>
          ) : (
            lines.map((line, index) => {
              const isWarning = line.type === 'warning';
              const isExercise = line.type === 'exercise';
              const isNew = newLineIds.has(line.id);

              return (
                <motion.div
                  key={line.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ ...tasteSpring, delay: index * 0.03 }}
                  className={`flex items-start gap-4 rounded-2xl border px-5 py-4 ${
                    isExercise
                      ? 'parse-line-exercise border-accent-signal/20 bg-accent-signal-bg/40'
                      : isWarning
                        ? 'border-destructive/20 bg-destructive/5'
                        : 'parse-line-set border-border bg-card/80'
                  } ${isNew && !reduceMotion ? 'parse-pulse' : ''}`}
                >
                  {isWarning ? (
                    <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <CheckCircle2
                      className={`mt-1 h-4 w-4 shrink-0 ${isExercise ? 'text-accent-signal' : 'text-muted-foreground'}`}
                    />
                  )}
                  <span
                    className={`text-[0.9375rem] leading-relaxed md:text-base ${
                      isExercise ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {line.text.replace(/^\u2713\s*/, '')}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {exerciseCount > 0 && (
        <div className="border-t border-border px-7 py-4 md:px-10 md:py-5">
          <p className="text-sm tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{exerciseCount}</span> exercises ·{' '}
            <span className="font-semibold text-foreground">{setCount}</span> sets captured
          </p>
        </div>
      )}
    </section>
  );
};
