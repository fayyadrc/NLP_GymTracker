import React from 'react';
import { Sparkles, Brain, Cpu, Wand2, TrendingUp, Activity } from 'lucide-react';

const INSIGHTS = [
  { label: 'Training Strain', value: 'Moderate', pct: 62, color: 'bg-accent-orange' },
  { label: 'Recovery Score', value: 'Good', pct: 78, color: 'bg-accent-green' },
  { label: 'Next Session', value: 'Pull Day', pct: null, color: 'bg-accent-violet' },
];

export const AIInsightsPreview: React.FC = () => (
  <div className="space-y-4 p-4 sm:p-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {INSIGHTS.map((item) => (
        <div key={item.label} className="bg-card rounded-[16px] border border-border p-4 space-y-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
            {item.label}
          </span>
          <p className="text-lg font-extrabold font-heading">{item.value}</p>
          {item.pct !== null && (
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>

    <div className="bg-card rounded-[20px] border border-border p-5 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent-violet-bg/40 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 bg-accent-violet-bg text-accent-violet rounded-[14px] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <span className="ios-badge bg-accent-violet-bg text-accent-violet text-[9px]">AI Recommendation</span>
          <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
            Based on your last 3 sessions, consider reducing bench volume by 10% and prioritizing horizontal pulls.
          </p>
        </div>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      {[
        { label: 'Deep Analysis', icon: Brain, color: 'bg-accent-blue-bg text-accent-blue' },
        { label: 'Fatigue Model', icon: Cpu, color: 'bg-accent-orange-bg text-accent-orange' },
        { label: 'Load Advice', icon: Wand2, color: 'bg-accent-green-bg text-accent-green' },
        { label: 'Trends', icon: TrendingUp, color: 'bg-accent-violet-bg text-accent-violet' },
        { label: 'Strain', icon: Activity, color: 'bg-accent-blue-bg text-accent-blue' },
      ].map(({ label, icon: Icon, color }) => (
        <span key={label} className={`ios-badge flex items-center gap-1 text-[9px] ${color}`}>
          <Icon className="w-3 h-3" />
          {label}
        </span>
      ))}
    </div>
  </div>
);
