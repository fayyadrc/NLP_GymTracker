import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const SYNC_SOURCES = [
  { name: 'Gym Logs', status: 'synced', count: 142 },
  { name: 'Strava', status: 'synced', count: 38 },
  { name: 'Apple Health', status: 'pending', count: 0 },
];

const ANOMALIES = [
  { issue: 'Unrealistic Weight', detail: 'Lateral Raise: 120kg — did you mean 12kg?', severity: 'high' as const },
  { issue: 'Duplicate Session', detail: 'Two identical bench sessions on Jun 12', severity: 'low' as const },
];

export const DataHealthPreview: React.FC = () => (
  <div className="space-y-4 p-4 sm:p-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {SYNC_SOURCES.map((source) => (
        <div key={source.name} className="bg-card rounded-[16px] border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold font-heading">{source.name}</span>
            {source.status === 'synced' ? (
              <CheckCircle2 className="w-4 h-4 text-accent-green" />
            ) : (
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
          <p className="text-xl font-extrabold font-mono">{source.count}</p>
          <span className={`ios-badge text-[9px] ${source.status === 'synced' ? 'bg-accent-green-bg text-accent-green' : 'bg-secondary text-muted-foreground'}`}>
            {source.status === 'synced' ? 'Synced' : 'Connecting'}
          </span>
        </div>
      ))}
    </div>

    <div className="bg-card rounded-[20px] border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-accent-orange" />
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] font-mono text-muted-foreground">
          Data Anomalies
        </span>
      </div>
      <div className="divide-y divide-border">
        {ANOMALIES.map((anomaly) => (
          <div key={anomaly.issue} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">{anomaly.issue}</p>
              <p className="text-[12px] text-muted-foreground truncate">{anomaly.detail}</p>
            </div>
            <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'} className="shrink-0 text-[10px]">
              {anomaly.severity}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  </div>
);
