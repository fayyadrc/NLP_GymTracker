import React from 'react';
import { Dumbbell, Layers, Weight } from 'lucide-react';

interface PerformanceStripProps {
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  usesMixedUnits: boolean;
}

export const PerformanceStrip: React.FC<PerformanceStripProps> = ({
  exerciseCount,
  setCount,
  totalVolume,
  usesMixedUnits,
}) => {
  const volumeLabel = usesMixedUnits
    ? totalVolume.toLocaleString()
    : `${totalVolume.toLocaleString()} kg`;

  const items = [
    { icon: Dumbbell, label: 'Ex', value: exerciseCount },
    { icon: Layers, label: 'Sets', value: setCount },
    { icon: Weight, label: usesMixedUnits ? 'Load' : 'Vol', value: volumeLabel },
  ];

  return (
    <div className="perf-strip" role="status" aria-label="Workout summary">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.label}>
            {index > 0 && <span className="perf-strip-divider" aria-hidden />}
            <div className="perf-strip-item">
              <Icon className="h-3.5 w-3.5 shrink-0 text-accent-signal opacity-90" strokeWidth={2.25} />
              <span className="perf-strip-value tabular-nums">{item.value}</span>
              <span className="perf-strip-label">{item.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
