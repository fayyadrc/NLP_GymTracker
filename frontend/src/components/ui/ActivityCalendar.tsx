import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Footprints, 
  Bike, 
  Dumbbell, 
  Zap, 
  ChevronLeft, 
  ChevronRight,
  Waves,
  Mountain,
  Flower2,
  Flame,
  Heart
} from 'lucide-react';

export type ActivityType = 
  | 'run' 
  | 'cycle' 
  | 'strength' 
  | 'walk' 
  | 'swim' 
  | 'hike' 
  | 'yoga' 
  | 'hiit' 
  | 'cardio'
  | 'other';

export interface DayActivity {
  type: ActivityType;
  count: number;
}

interface ActivityCalendarProps {
  initialMonth?: Date;
  activities?: Record<string, DayActivity>;
}

export const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ 
  initialMonth = new Date(),
  activities = {}
}) => {
  const [viewDate, setViewDate] = useState(initialMonth);
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  const changeMonth = (offset: number) => {
    const nextDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(nextDate);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset === -1) startOffset = 6; 
  
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const calendarDays: { day: number; month: 'prev' | 'current' | 'next'; dateKey?: string }[] = [];
  
  for (let i = startOffset - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthLastDay - i, month: 'prev' });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ day: i, month: 'current', dateKey });
  }
  
  const totalCells = calendarDays.length > 35 ? 42 : 35;
  const remainingCells = totalCells - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({ day: i, month: 'next' });
  }

  const renderIcon = (type: ActivityType, className?: string) => {
    const iconProps = { className: className || "w-5 h-5 md:w-7 md:h-7" };
    switch (type) {
      case 'run': return <Footprints {...iconProps} />;
      case 'cycle': return <Bike {...iconProps} />;
      case 'strength': return <Dumbbell {...iconProps} />;
      case 'walk': return <Footprints {...iconProps} className={cn(iconProps.className, "opacity-70")} />;
      case 'swim': return <Waves {...iconProps} />;
      case 'hike': return <Mountain {...iconProps} />;
      case 'yoga': return <Flower2 {...iconProps} />;
      case 'hiit': return <Flame {...iconProps} />;
      case 'cardio': return <Heart {...iconProps} />;
      default: return <Zap {...iconProps} />;
    }
  };

  const getActivityColors = (type: ActivityType) => {
    switch (type) {
      case 'strength': 
        return 'bg-accent-blue text-white border-accent-blue shadow-sm';
      default: 
        return 'bg-accent-green text-white border-accent-green shadow-sm';
    }
  };

  return (
    <div className="bg-card rounded-[28px] p-4 md:p-6 shadow-sm border border-border w-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 px-1">
        <div>
          <h4 className="text-[18px] md:text-[20px] font-extrabold text-foreground tracking-tight font-heading">
            {monthName} <span className="text-muted-foreground font-medium ml-1 font-sans">{year}</span>
          </h4>
        </div>
        <div className="flex gap-2">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-all duration-200 active:scale-90 border border-border/50 btn-tap-scale">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-all duration-200 active:scale-90 border border-border/50 btn-tap-scale">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {daysOfWeek.map((day, i) => (
          <div key={i} className="text-center text-[10px] md:text-[11px] font-extrabold text-muted-foreground/80 uppercase tracking-widest font-mono py-1">
            {day}
          </div>
        ))}
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="col-span-7 grid grid-cols-7 gap-1 md:gap-2"
          >
            {calendarDays.map((cell, i) => {
              const activity = cell.dateKey ? activities[cell.dateKey] : null;
              const isCurrent = cell.month === 'current';
              
              return (
                <div key={i} className="flex items-center justify-center aspect-square p-0.5">
                  {isCurrent ? (
                    activity ? (
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "w-full h-full rounded-[14px] md:rounded-[18px] flex flex-col items-center justify-center relative cursor-pointer border shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all",
                          getActivityColors(activity.type)
                        )}
                      >
                        <span className="text-xs md:text-[14px] font-extrabold font-mono mt-0.5 leading-none">{cell.day}</span>
                        <div className="mt-1">
                          {renderIcon(activity.type, "w-3 h-3 md:w-4 md:h-4 stroke-[2.2]")}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-full bg-card hover:bg-secondary/40 border border-border/80 rounded-[14px] md:rounded-[18px] flex items-center justify-center text-xs md:text-[14px] font-bold text-foreground/80 transition-colors font-mono">
                        {cell.day}
                      </div>
                    )
                  ) : (
                    <span className="text-[11px] md:text-xs font-semibold text-muted-foreground/20 font-mono select-none">
                      {cell.day}
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
