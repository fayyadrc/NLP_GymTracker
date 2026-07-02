import React, { useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';

interface AddExerciseBarProps {
  suggestions: string[];
  existingNames: string[];
  onAdd: (name: string) => void;
}

export const AddExerciseBar: React.FC<AddExerciseBarProps> = ({
  suggestions,
  existingNames,
  onAdd,
}) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const existingSet = useMemo(() => new Set(existingNames.map((n) => n.toLowerCase())), [existingNames]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions.filter((s) => !existingSet.has(s.toLowerCase())).slice(0, 6);
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && !existingSet.has(s.toLowerCase()))
      .slice(0, 6);
  }, [query, suggestions, existingSet]);

  const handleAdd = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || existingSet.has(trimmed.toLowerCase())) return;
    onAdd(trimmed);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) handleAdd(query);
  };

  return (
    <div className="add-exercise-bar">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Add exercise…"
          aria-label="Search and add exercise"
          className="add-exercise-input"
          autoComplete="off"
        />
        {query.trim() && (
          <button type="submit" className="add-exercise-submit" aria-label="Add exercise">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </form>

      {(focused || query) && matches.length > 0 && (
        <ul className="add-exercise-suggestions" role="listbox">
          {matches.map((name) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAdd(name);
                }}
                className="add-exercise-option"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
