import type { LucideIcon } from 'lucide-react';
import {
  PencilLine,
  Sparkles,
  BarChart2,
  HeartPulse,
} from 'lucide-react';

export type FeatureTabId =
  | 'quick-log'
  | 'ai-insights'
  | 'analytics'
  | 'data-health';

export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureTab {
  id: FeatureTabId;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClass: string;
  badgeClass: string;
}

export const LANDING_NAV_LINKS: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'Quick Log', href: '#quick-log' },
  { label: 'AI Insights', href: '#ai-insights' },
  { label: 'Analytics', href: '#analytics' },
  { label: 'Integrations', href: '#data-health' },
];

export const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'quick-log',
    label: 'Quick Log',
    title: 'Log workouts in seconds',
    description:
      'Type naturally — reps, sets, weights, and cardio notes are parsed instantly. No forms, no friction.',
    icon: PencilLine,
    accentClass: 'text-accent-orange',
    badgeClass: 'bg-accent-orange-bg text-accent-orange',
  },
  {
    id: 'ai-insights',
    label: 'AI Insights',
    title: 'Intelligent training feedback',
    description:
      'Track training strain, get next-session suggestions, and watch recovery metrics update in real time.',
    icon: Sparkles,
    accentClass: 'text-accent-violet',
    badgeClass: 'bg-accent-violet-bg text-accent-violet',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    title: 'Visual progress at a glance',
    description:
      'Volume trends, muscle-group breakdowns, and activity heatmaps show exactly how your training evolves.',
    icon: BarChart2,
    accentClass: 'text-accent-blue',
    badgeClass: 'bg-accent-blue-bg text-accent-blue',
  },
  {
    id: 'data-health',
    label: 'Data Health',
    title: 'Seamless Strava sync',
    description:
      'Gym logs and Strava activities flow into one pipeline. Spot anomalies and keep your data clean automatically.',
    icon: HeartPulse,
    accentClass: 'text-accent-green',
    badgeClass: 'bg-accent-green-bg text-accent-green',
  },
];

export const FOOTER_LINKS = [
  { label: 'Documentation', href: '#features' },
  { label: 'Support', href: 'mailto:support@repcount.app' },
  { label: 'Privacy', href: '#' },
];
