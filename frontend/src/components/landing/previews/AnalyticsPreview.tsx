import React from 'react';
import { ActivityCalendar } from '@/components/ui/ActivityCalendar';
import type { DayActivity } from '@/components/ui/ActivityCalendar';

const MOCK_ACTIVITIES: Record<string, DayActivity> = {
  '2026-06-02': { type: 'strength', count: 1 },
  '2026-06-04': { type: 'run', count: 1 },
  '2026-06-06': { type: 'strength', count: 1 },
  '2026-06-09': { type: 'cycle', count: 1 },
  '2026-06-11': { type: 'strength', count: 1 },
  '2026-06-13': { type: 'strength', count: 1 },
  '2026-06-16': { type: 'run', count: 1 },
  '2026-06-18': { type: 'strength', count: 1 },
  '2026-06-20': { type: 'hiit', count: 1 },
  '2026-06-23': { type: 'strength', count: 1 },
  '2026-06-25': { type: 'strength', count: 1 },
  '2026-06-28': { type: 'run', count: 1 },
};

const MUSCLE_BARS = [
  { muscle: 'Chest', volume: 82, color: 'bg-accent-blue' },
  { muscle: 'Back', volume: 74, color: 'bg-accent-violet' },
  { muscle: 'Legs', volume: 91, color: 'bg-accent-green' },
  { muscle: 'Shoulders', volume: 58, color: 'bg-accent-orange' },
];

export const AnalyticsPreview: React.FC = () => (
  <div className="space-y-4 p-4 sm:p-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Workouts', value: '24' },
        { label: 'This Week', value: '4' },
        { label: 'Gym', value: '18' },
        { label: 'Strava', value: '6' },
      ].map((stat) => (
        <div key={stat.label} className="bg-card rounded-[14px] border border-border p-3 text-center">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono block">
            {stat.label}
          </span>
          <span className="text-xl font-extrabold font-mono mt-1 block">{stat.value}</span>
        </div>
      ))}
    </div>

    <div className="bg-card rounded-[20px] border border-border p-4 overflow-hidden">
      <ActivityCalendar initialMonth={new Date(2026, 5, 1)} activities={MOCK_ACTIVITIES} />
    </div>

    <div className="space-y-2">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] font-mono">
        Volume by Muscle
      </span>
      <div className="space-y-2">
        {MUSCLE_BARS.map((bar) => (
          <div key={bar.muscle} className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-muted-foreground w-16 shrink-0 font-mono">
              {bar.muscle}
            </span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.volume}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
