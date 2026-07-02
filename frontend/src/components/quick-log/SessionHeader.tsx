import React from 'react';
import { SPLIT_STYLES, type SplitName } from '@/lib/split-colors';

const PRESETS: SplitName[] = ['Push', 'Pull', 'Legs', 'Upper', 'Lower'];

interface SessionHeaderProps {
  sessionName: string;
  onSessionNameChange: (value: string) => void;
  onPresetSelect: (preset: string) => void;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  sessionName,
  onSessionNameChange,
  onPresetSelect,
}) => {
  const activePreset = PRESETS.find((preset) =>
    sessionName.toLowerCase().includes(preset.toLowerCase()),
  );

  return (
    <section className="space-y-3">
      <input
        id="session-name"
        aria-label="Session name"
        value={sessionName}
        onChange={(event) => onSessionNameChange(event.target.value)}
        className="w-full bg-transparent text-xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/25 rounded-md"
        placeholder="New Workout"
      />

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const isActive = activePreset === preset;
          const styles = SPLIT_STYLES[preset];
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onPresetSelect(preset)}
              className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                isActive ? styles.chipActive : styles.chip
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>
    </section>
  );
};
