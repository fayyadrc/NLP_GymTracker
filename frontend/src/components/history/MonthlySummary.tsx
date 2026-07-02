import React from 'react';
import { Activity, Dumbbell, TrendingUp } from 'lucide-react';
import type { MonthlySummaryData } from '@/lib/history-utils';
import { formatDuration } from '@/lib/history-utils';

interface MonthlySummaryProps {
  summary: MonthlySummaryData;
}

function formatVolumeTrend(pct: number | null): { text: string; positive: boolean | null } {
  if (pct === null) return { text: 'No prior month to compare', positive: null };
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct}% vs last month`,
    positive: pct > 0 ? true : pct < 0 ? false : null,
  };
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ summary }) => {
  const volumeTrend = formatVolumeTrend(summary.volumeTrendPct);

  const stats = [
    {
      key: 'workouts',
      label: 'Workouts',
      value: String(summary.workoutCount),
      unit: 'sessions',
      context: `in ${summary.monthLabel}`,
      icon: Dumbbell,
      accent: 'summary-stat-card--blue',
    },
    {
      key: 'volume',
      label: 'Total volume',
      value:
        summary.totalVolumeKg > 0
          ? summary.totalVolumeKg >= 1000
            ? `${(summary.totalVolumeKg / 1000).toFixed(1)}k`
            : String(summary.totalVolumeKg)
          : '0',
      unit: summary.totalVolumeKg >= 1000 ? 'kg moved' : 'kg moved',
      context: volumeTrend.text,
      trendPositive: volumeTrend.positive,
      icon: TrendingUp,
      accent: 'summary-stat-card--green',
    },
    {
      key: 'cardio',
      label: 'Cardio time',
      value: summary.totalDurationMins > 0 ? formatDuration(summary.totalDurationMins) : '—',
      unit: summary.stravaActivityCount > 0 ? `${summary.stravaActivityCount} activities` : 'no Strava yet',
      context: summary.stravaActivityCount > 0 ? 'from Strava sync' : 'sync to track cardio',
      icon: Activity,
      accent: 'summary-stat-card--orange',
    },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article 
            key={stat.key} 
            className="flex flex-col items-center justify-center p-3 bg-card border border-border rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
          >
            <Icon className="h-4 w-4 mb-2 text-muted-foreground" strokeWidth={2.5} />
            <p className="font-mono text-xl font-bold text-foreground leading-none mb-1 tracking-tight">
              {stat.value}
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.05em] text-center">
              {stat.label}
            </p>
          </article>
        );
      })}
    </div>
  );
};
