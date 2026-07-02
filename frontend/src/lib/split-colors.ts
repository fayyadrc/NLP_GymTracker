import type { SplitFilter } from '@/lib/history-utils';

export type SplitName = Exclude<SplitFilter, 'All' | 'Cardio' | 'Workout'>;

export const SPLIT_STYLES: Record<
  SplitFilter,
  {
    chip: string;
    chipActive: string;
    stripe: string;
    badge: string;
  }
> = {
  All: {
    chip: 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-secondary hover:text-foreground',
    chipActive: 'border-foreground bg-foreground text-background shadow-sm',
    stripe: 'bg-foreground/70',
    badge: 'bg-secondary text-muted-foreground',
  },
  Push: {
    chip: 'border-accent-blue/25 bg-accent-blue-bg/40 text-accent-blue hover:border-accent-blue/40 hover:bg-accent-blue-bg',
    chipActive: 'border-accent-blue bg-accent-blue text-white shadow-sm shadow-accent-blue/20',
    stripe: 'bg-accent-blue',
    badge: 'bg-accent-blue-bg text-accent-blue',
  },
  Pull: {
    chip: 'border-accent-violet/25 bg-accent-violet-bg/40 text-accent-violet hover:border-accent-violet/40 hover:bg-accent-violet-bg',
    chipActive: 'border-accent-violet bg-accent-violet text-white shadow-sm shadow-accent-violet/20',
    stripe: 'bg-accent-violet',
    badge: 'bg-accent-violet-bg text-accent-violet',
  },
  Legs: {
    chip: 'border-accent-green/25 bg-accent-green-bg/40 text-accent-green hover:border-accent-green/40 hover:bg-accent-green-bg',
    chipActive: 'border-accent-green bg-accent-green text-white shadow-sm shadow-accent-green/20',
    stripe: 'bg-accent-green',
    badge: 'bg-accent-green-bg text-accent-green',
  },
  Upper: {
    chip: 'border-accent-orange/25 bg-accent-orange-bg/40 text-accent-orange hover:border-accent-orange/40 hover:bg-accent-orange-bg',
    chipActive: 'border-accent-orange bg-accent-orange text-white shadow-sm shadow-accent-orange/20',
    stripe: 'bg-accent-orange',
    badge: 'bg-accent-orange-bg text-accent-orange',
  },
  Lower: {
    chip: 'border-accent-signal/25 bg-accent-signal-bg/40 text-accent-signal hover:border-accent-signal/40 hover:bg-accent-signal-bg',
    chipActive: 'border-accent-signal bg-accent-signal text-white shadow-sm shadow-accent-signal/20',
    stripe: 'bg-accent-signal',
    badge: 'bg-accent-signal-bg text-accent-signal',
  },
  Cardio: {
    chip: 'border-border bg-card text-muted-foreground',
    chipActive: 'border-foreground bg-foreground text-background',
    stripe: 'bg-muted-foreground',
    badge: 'bg-secondary text-muted-foreground',
  },
  Workout: {
    chip: 'border-border bg-card text-muted-foreground',
    chipActive: 'border-foreground bg-foreground text-background',
    stripe: 'bg-muted-foreground',
    badge: 'bg-secondary text-muted-foreground',
  },
};

export function getSplitStripeClass(split: SplitFilter): string {
  return SPLIT_STYLES[split]?.stripe ?? SPLIT_STYLES.All.stripe;
}
