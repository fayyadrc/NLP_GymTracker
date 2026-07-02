"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  PencilLine,
  History as HistoryIcon,
  User,
  BarChart2,
} from 'lucide-react';
import { ViewState } from '@/lib/types';

interface FloatingNavBarProps {
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  anomalyCount: number;
}

const NAV_ITEMS = [
  { id: 'quick-log', icon: PencilLine, label: 'Log', primary: true },
  { id: 'history', icon: HistoryIcon, label: 'History', primary: false },
  { id: 'analytics', icon: BarChart2, label: 'Stats', primary: false },
  { id: 'profile', icon: User, label: 'Profile', primary: false },
] as const;

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  activeView,
  setActiveView,
  anomalyCount,
}) => {
  const [tappedId, setTappedId] = useState<string | null>(null);

  const handleTap = (id: string) => {
    setTappedId(id);
    setActiveView(id as ViewState);
    window.setTimeout(() => setTappedId(null), 200);
  };

  return (
    <nav className="pointer-events-none fixed bottom-5 left-0 right-0 z-50 flex justify-center md:hidden">
      <div className="glass-nav pointer-events-auto flex h-[3.75rem] w-auto min-w-[20rem] items-center justify-around rounded-[2rem] px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeView === item.id ||
            (item.id === 'history' && activeView === 'workout-details');
          const isTapped = tappedId === item.id;
          const isLog = item.primary;

          return (
            <button
              key={item.id}
              onClick={() => handleTap(item.id)}
              className={cn(
                'btn-tap-scale relative flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-all duration-200 min-w-[4rem]',
                isActive ? 'text-accent-signal' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center rounded-2xl transition-all duration-200 h-8 w-8',
                  isTapped && 'scale-90',
                )}
              >
                <Icon
                  className="h-[1.25rem] w-[1.25rem]"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </span>
              <span
                className={cn(
                  'text-[0.625rem] font-medium tracking-wide',
                  isActive && 'font-semibold',
                )}
              >
                {item.label}
              </span>

              {item.id === 'profile' && anomalyCount > 0 && (
                <span className="absolute right-3 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
