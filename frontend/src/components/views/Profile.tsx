import React from 'react';
import { ChevronDown, User, Bell, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { ActivityCalendar, DayActivity, ActivityType } from '@/components/ui/ActivityCalendar';
import { MonthlySummary } from '@/components/history/MonthlySummary';
import { useWorkoutStore } from '@/lib/workout-store';
import { computeMonthlySummary } from '@/lib/history-utils';
import { WorkoutSession } from '@/lib/types';
import type { Theme } from '@/hooks/use-theme';

interface ProfileProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const Profile: React.FC<ProfileProps> = ({ theme, setTheme }) => {
  const { sessions } = useWorkoutStore();
  const monthlySummary = React.useMemo(() => computeMonthlySummary(sessions), [sessions]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Helper to determine the primary activity type for a session
  const getSessionActivityType = (session: WorkoutSession): ActivityType => {
    // Check Strava activities first for specific types
    if (session.stravaActivities && session.stravaActivities.length > 0) {
      const type = session.stravaActivities[0].type;
      switch (type) {
        case 'Run': return 'run';
        case 'Ride': return 'cycle';
        case 'Walk': return 'walk';
        case 'Swim': return 'swim';
        case 'Hike': return 'hike';
        case 'Yoga': return 'yoga';
        case 'Workout': return 'hiit';
        case 'Crossfit': return 'hiit';
        case 'WeightTraining': return 'strength';
        case 'Rowing': return 'cardio';
        default: break; 
      }
    }

    // Manual gym entries check
    if (session.entries.length > 0) return 'strength';
    
    return 'other';
  };

  // Helper to get the count for a session (number of distinct activities)
  const getSessionCount = (session: WorkoutSession): number => {
    const manualSessionCount = session.entries.length > 0 ? 1 : 0;
    const stravaActivityCount = session.stravaActivities?.length || 0;
    return manualSessionCount + stravaActivityCount;
  };

  // Aggregate sessions by date for the calendar
  const activities = React.useMemo(() => {
    const acc: Record<string, DayActivity> = {};
    
    // Priority for icons: Run > Cycle > Strength > Swim > Hike > Yoga > HIIT > Walk > Other
    const priority: Record<ActivityType, number> = { 
      'run': 10, 
      'cycle': 9, 
      'strength': 8, 
      'swim': 7,
      'hike': 6,
      'yoga': 5,
      'hiit': 4,
      'cardio': 3,
      'walk': 2,
      'other': 1 
    };

    sessions.forEach(session => {
      const date = session.date;
      const type = getSessionActivityType(session);
      const count = getSessionCount(session);

      if (!acc[date]) {
        acc[date] = { type, count };
      } else {
        acc[date].count += count;
        if (priority[type] > priority[acc[date].type]) {
          acc[date].type = type;
        }
      }
    });

    return acc;
  }, [sessions]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pt-2 pb-32 px-1"
    >
      <header className="flex items-center gap-5 px-1">
        <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center text-background font-black text-xl font-heading shadow-md border border-border select-none">
          FR
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight font-heading">
            @fayyadrc
          </h2>
          <span className="ios-badge bg-accent-blue-bg text-accent-blue mt-1 inline-block">
            Standard Plan
          </span>
        </div>
      </header>

      {/* Monthly Glance Section */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] font-mono">This Month</h3>
          <MonthlySummary summary={monthlySummary} />
        </div>
      )}

      {/* Activity Calendar Section */}
      <div className="space-y-4">
        <h3 className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] font-mono">Activity Tracker</h3>
        <ActivityCalendar activities={activities} />
      </div>

      {/* Settings List */}
      <div className="space-y-3">
        <h3 className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] font-mono mb-1">Preferences</h3>
        <div className="grid grid-cols-1 gap-2.5">
          <ProfileItem 
            icon={<Bell className="w-5 h-5 stroke-[2.2] text-accent-blue" />} 
            label="Data Health Scan" 
            onClick={() => (window as any).setActiveView?.('data-health')}
          />
          <ProfileItem 
            icon={theme === 'dark' ? <Sun className="w-5 h-5 stroke-[2.2] text-accent-orange" /> : <Moon className="w-5 h-5 stroke-[2.2] text-accent-violet" />} 
            label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} 
            onClick={toggleTheme}
          />
        </div>
      </div>
    </motion.div>
  );
};

const ProfileItem: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-card hover:bg-secondary/50 transition-all rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.01)] btn-tap-scale"
  >
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/80 text-foreground shrink-0">{icon}</div>
      <span className="text-[14px] font-semibold text-foreground tracking-tight">{label}</span>
    </div>
    <ChevronDown className="w-4 h-4 text-muted-foreground/75 -rotate-90 stroke-[2.5]" />
  </button>
);
