const STORAGE_KEY = 'gym_tracker_session_titles';

type TitleMap = Record<string, string>;

function readTitles(): TitleMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TitleMap) : {};
  } catch {
    return {};
  }
}

function writeTitles(titles: TitleMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
}

export function getCustomSessionTitle(sessionId: string): string | null {
  const title = readTitles()[sessionId];
  return title?.trim() || null;
}

export function setCustomSessionTitle(sessionId: string, title: string): void {
  const titles = readTitles();
  const trimmed = title.trim();
  if (!trimmed) {
    delete titles[sessionId];
  } else {
    titles[sessionId] = trimmed;
  }
  writeTitles(titles);
}

export function clearCustomSessionTitle(sessionId: string): void {
  const titles = readTitles();
  delete titles[sessionId];
  writeTitles(titles);
}
