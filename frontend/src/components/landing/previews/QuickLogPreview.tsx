import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { tasteSpring } from '@/lib/motion';

const RAW_TEXT = 'Bench 80kg x8, 75 x10\nIncline DB 28kg x10';

const PARSED_LINES = [
  { id: '1', exercise: 'Bench Press', detail: '80kg × 8 · 75kg × 10' },
  { id: '2', exercise: 'Incline DB Press', detail: '28kg × 10' },
];

export const QuickLogPreview: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [typedLength, setTypedLength] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'parsing' | 'done'>('typing');

  useEffect(() => {
    if (reduceMotion) {
      setTypedLength(RAW_TEXT.length);
      setVisibleLines(PARSED_LINES.length);
      setPhase('done');
      return;
    }

    let cancelled = false;

    const runCycle = () => {
      setTypedLength(0);
      setVisibleLines(0);
      setPhase('typing');

      let charIndex = 0;
      const typeTimer = window.setInterval(() => {
        if (cancelled) return;
        charIndex += 1;
        setTypedLength(charIndex);
        if (charIndex >= RAW_TEXT.length) {
          window.clearInterval(typeTimer);
          setPhase('parsing');
          window.setTimeout(() => {
            if (cancelled) return;
            setPhase('done');
            let lineIndex = 0;
            const parseTimer = window.setInterval(() => {
              if (cancelled) return;
              lineIndex += 1;
              setVisibleLines(lineIndex);
              if (lineIndex >= PARSED_LINES.length) {
                window.clearInterval(parseTimer);
                window.setTimeout(() => {
                  if (!cancelled) runCycle();
                }, 2800);
              }
            }, 450);
          }, 400);
        }
      }, 35);
    };

    runCycle();
    return () => {
      cancelled = true;
    };
  }, [reduceMotion]);

  return (
    <div className="space-y-5 p-6 sm:p-8">
      <div className="taste-inset p-4">
        <p className="font-mono text-[0.8125rem] leading-relaxed text-muted-foreground">
          {RAW_TEXT.slice(0, typedLength)}
          {phase === 'typing' && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="ml-px inline-block h-4 w-0.5 translate-y-0.5 bg-accent-signal"
            />
          )}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="data-value text-muted-foreground">Live parse</span>
          <span
            className={`ios-badge border ${
              phase === 'parsing'
                ? 'border-border bg-secondary text-muted-foreground skeleton-shimmer'
                : visibleLines > 0
                  ? 'border-accent-signal/25 bg-accent-signal-bg text-accent-signal'
                  : 'border-border bg-secondary text-muted-foreground'
            }`}
          >
            {phase === 'parsing' ? 'reading' : visibleLines > 0 ? `${visibleLines} exercises` : 'waiting'}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {PARSED_LINES.slice(0, visibleLines).map((line, index) => (
            <motion.div
              key={line.id}
              initial={reduceMotion ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...tasteSpring, delay: index * 0.05 }}
              className="parse-line-exercise flex items-center justify-between rounded-xl border border-accent-signal/20 bg-accent-signal-bg/40 px-4 py-3 parse-pulse"
            >
              <span className="text-sm font-semibold tracking-tight">{line.exercise}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{line.detail}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
