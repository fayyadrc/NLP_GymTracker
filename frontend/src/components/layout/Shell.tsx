"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import {
  PencilLine,
  History,
  User,
  BarChart2,
} from 'lucide-react';
import { ViewState } from '@/lib/types';
import { FloatingNavBar } from './FloatingNavBar';

interface ShellProps {
  children: React.ReactNode;
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  anomalyCount: number;
}

const NAV_ITEMS = [
  { id: 'quick-log', icon: PencilLine, label: 'Log' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics' },
  { id: 'profile', icon: User, label: 'Profile' },
] as const;

export const Shell: React.FC<ShellProps> = ({
  children,
  activeView,
  setActiveView,
  anomalyCount
}) => {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden selection:bg-accent-signal/15 md:flex-row">
      <aside className="hidden shrink-0 flex-col border-r border-border bg-card md:flex md:w-[4.5rem] lg:w-56">
        <div className="hidden border-b border-border/60 px-6 py-7 lg:block">
          <h1 className="text-xl font-semibold tracking-tight">RepCount</h1>
          <p className="data-value mt-1.5 text-muted-foreground">Gym intelligence</p>
        </div>

        <div className="py-5 lg:hidden" />

        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ViewState)}
                className={cn(
                  'btn-tap-scale flex w-full items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200',
                  isActive
                    ? 'bg-foreground text-background font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className={cn('h-[1.125rem] w-[1.125rem] shrink-0', isActive ? 'stroke-[2.5]' : 'stroke-2')} />
                <span className="hidden text-[0.875rem] tracking-tight lg:block">{item.label}</span>
                {item.id === 'profile' && anomalyCount > 0 && (
                  <span
                    className={cn(
                      'ml-auto hidden h-2 w-2 shrink-0 rounded-full lg:block',
                      isActive ? 'bg-background' : 'bg-destructive',
                    )}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="safe-bottom mx-auto w-full max-w-3xl px-5 py-4 pb-36 md:max-w-4xl md:px-12 md:py-8 md:pb-16">
          {children}
        </div>
      </main>

      <FloatingNavBar
        activeView={activeView}
        setActiveView={setActiveView}
        anomalyCount={anomalyCount}
      />
    </div>
  );
};
