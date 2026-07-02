import React from 'react';

interface WorkoutStatsProps {
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  usesMixedUnits: boolean;
}

export const WorkoutStats: React.FC<WorkoutStatsProps> = ({
  exerciseCount,
  setCount,
  totalVolume,
  usesMixedUnits,
}) => {
  const stats = [
    { label: 'Exercises', value: exerciseCount },
    { label: 'Sets', value: setCount },
    {
      label: usesMixedUnits ? 'Load' : 'Volume',
      value: usesMixedUnits ? totalVolume.toLocaleString() : `${totalVolume.toLocaleString()} kg`,
    },
  ];

  return (
    <aside className="taste-card taste-card-pad">
      <div className="grid grid-cols-3 gap-4 divide-x divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 first:pl-0 last:pr-0 text-center md:text-left">
            <p className="data-value text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </aside>
  );
};
