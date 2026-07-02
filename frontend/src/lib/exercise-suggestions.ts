const SET_FRAGMENT =
  /(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|plate|plates)?\s*(?:x|for)\s*(\d+)/i;

export interface ExerciseQueryContext {
  query: string;
  replaceStart: number;
  replaceEnd: number;
}

export function getCurrentLineContext(value: string, cursorPosition: number) {
  const before = value.slice(0, cursorPosition);
  const after = value.slice(cursorPosition);
  const lineStart = before.lastIndexOf('\n') + 1;
  const lineEndRelative = after.indexOf('\n');
  const lineEnd = lineEndRelative === -1 ? value.length : cursorPosition + lineEndRelative;
  const currentLine = value.slice(lineStart, lineEnd);
  return { lineStart, lineEnd, currentLine };
}

export function getExerciseQueryAtCursor(
  value: string,
  cursorPosition: number,
): ExerciseQueryContext | null {
  const { lineStart, lineEnd, currentLine } = getCurrentLineContext(value, cursorPosition);
  const cursorInLine = cursorPosition - lineStart;
  const setMatch = SET_FRAGMENT.exec(currentLine);

  if (setMatch?.index != null) {
    const prefix = currentLine.slice(0, setMatch.index).trim();
    if (prefix.length >= 2 && cursorInLine <= setMatch.index + setMatch[0].length) {
      return {
        query: prefix,
        replaceStart: lineStart,
        replaceEnd: lineStart + setMatch.index,
      };
    }
  }

  const trimmed = currentLine.trim();
  if (!trimmed || /^\d/.test(trimmed) || SET_FRAGMENT.test(trimmed)) {
    return null;
  }

  const leadingWhitespace = currentLine.length - currentLine.trimStart().length;
  const queryStart = lineStart + leadingWhitespace;
  const queryEnd = lineEnd;

  return {
    query: trimmed,
    replaceStart: queryStart,
    replaceEnd: queryEnd,
  };
}

export function searchExercises(query: string, pool: string[], limit = 6): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];

  const scored = pool
    .map((name) => {
      const lower = name.toLowerCase();
      if (lower === normalizedQuery) return null;

      let score = 0;
      if (lower.startsWith(normalizedQuery)) {
        score = 120 - lower.length;
      } else if (lower.split(/\s+/).some((word) => word.startsWith(normalizedQuery))) {
        score = 90 - lower.length;
      } else if (lower.includes(normalizedQuery)) {
        score = 60 - lower.indexOf(normalizedQuery);
      }

      return score > 0 ? { name, score } : null;
    })
    .filter((item): item is { name: string; score: number } => item != null)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((item) => item.name);

  return scored;
}
