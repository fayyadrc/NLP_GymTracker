import muscleData from '@/lib/muscle-groups-data.json';

type SubMuscleGroup = keyof typeof muscleData.subMuscleGroups;

const SUB_MUSCLE_GROUPS = muscleData.subMuscleGroups as Record<SubMuscleGroup, string[]>;
const MAIN_GROUP_MAPPING = muscleData.mainGroupMapping as Record<string, string>;

const EQUIPMENT_PREFIXES = [
  'smith machine',
  'cable machine',
  'machine assisted',
  'resistance band',
  'smith',
  'machine',
  'cable',
  'barbell',
  'dumbbell',
  'dumbell',
  'seated',
  'standing',
  'incline',
  'decline',
  'single arm',
  'single wirst',
  'single wrist',
  'one arm',
  'assisted',
  'weighted',
  'rope',
  'v-bar',
  'v bar',
  'ez bar',
  'ez-bar',
] as const;

const TYPO_FIXES: Record<string, string> = {
  'pec dec': 'pec deck',
  'db press': 'dumbbell press',
  'db bench': 'dumbbell bench',
  'v handle': 'v-bar',
  flies: 'fly',
  flys: 'fly',
  curls: 'curl',
  rows: 'row',
  pulldowns: 'pulldown',
  extensions: 'extension',
  presses: 'press',
  raises: 'raise',
  shrugs: 'shrug',
};

const ALIAS_INDEX: Array<[string, SubMuscleGroup]> = Object.entries(SUB_MUSCLE_GROUPS)
  .flatMap(([group, aliases]) =>
    aliases.map((alias): [string, SubMuscleGroup] => [alias, group as SubMuscleGroup]),
  )
  .sort((a, b) => b[0].length - a[0].length);

function normalizeForMatch(name: string): string {
  let normalized = name.toLowerCase().trim().replace(/\([^)]*\)/g, '');
  for (const [typo, fix] of Object.entries(TYPO_FIXES)) {
    normalized = normalized.replace(new RegExp(`\\b${typo}\\b`, 'g'), fix);
  }
  return normalized.replace(/[^a-z0-9]/g, '');
}

function stripEquipmentPrefixes(name: string): string {
  let stripped = name.toLowerCase().trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of EQUIPMENT_PREFIXES) {
      if (stripped.startsWith(`${prefix} `)) {
        stripped = stripped.slice(prefix.length + 1).trim();
        changed = true;
        break;
      }
    }
  }
  return stripped;
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const rows = shorter.length + 1;
  const cols = longer.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  const distance = matrix[rows - 1][cols - 1];
  return 1 - distance / longer.length;
}

function applyHeuristics(name: string): SubMuscleGroup | 'Other' {
  const lower = name.toLowerCase();
  if (['chest', 'pec', 'bench'].some((x) => lower.includes(x))) {
    if (lower.includes('fly')) return 'Chest';
    if (lower.includes('press') && !lower.includes('close') && !lower.includes('tricep')) return 'Chest';
  }
  if (['back', 'row', 'lat', 'pull', 'chin'].some((x) => lower.includes(x))) return 'Back';
  if (['squat', 'leg', 'lunge', 'press', 'extension'].some((x) => lower.includes(x))) {
    if (lower.includes('leg') || lower.includes('squat')) {
      if (lower.includes('curl') || lower.includes('ham')) return 'Hamstrings';
      if (lower.includes('extension')) return 'Quads';
      return 'Quads';
    }
  }
  if (lower.includes('curl')) {
    if (lower.includes('tricep') || lower.includes('skull')) return 'Triceps';
    if (lower.includes('leg') || lower.includes('ham') || lower.includes('nordic')) return 'Hamstrings';
    return 'Biceps';
  }
  if (lower.includes('press')) {
    if (lower.includes('shoulder') || lower.includes('overhead') || lower.includes('military')) return 'Shoulders';
    if (lower.includes('tricep') || lower.includes('skull') || lower.includes('bench')) return 'Chest';
  }
  if (lower.includes('dip')) {
    if (lower.includes('tricep') || lower.includes('bench')) return 'Triceps';
    return 'Chest';
  }
  if (lower.includes('raise')) return 'Shoulders';
  if (lower.includes('shrug')) return 'Traps';
  if (lower.includes('thrust') || lower.includes('bridge')) return 'Glutes';
  if (lower.includes('calf') || lower.includes('toe')) return 'Calves';
  if (['crunch', 'sit-up', 'ab ', 'plank', 'leg raise'].some((x) => lower.includes(x))) return 'Abs';
  if (lower.includes('glute') || lower.includes('abduction') || lower.includes('kickback')) return 'Glutes';
  return 'Other';
}

export interface MuscleInfo {
  mainGroup: string;
  subGroup: string;
}

export function getMuscleInfo(exerciseName: string): MuscleInfo {
  if (!exerciseName?.trim()) {
    return { mainGroup: 'Other', subGroup: 'Other' };
  }

  const name = exerciseName.toLowerCase().trim();
  let subGroup: SubMuscleGroup | 'Other' = 'Other';

  for (const [group, exercises] of Object.entries(SUB_MUSCLE_GROUPS)) {
    if (exercises.includes(name)) {
      subGroup = group as SubMuscleGroup;
      break;
    }
  }

  if (subGroup === 'Other') {
    for (const [alias, group] of ALIAS_INDEX) {
      if (name.includes(alias)) {
        subGroup = group;
        break;
      }
    }
  }

  if (subGroup === 'Other') {
    const stripped = stripEquipmentPrefixes(name);
    const candidates = [name, stripped].filter(Boolean);
    const normalizedCandidates = candidates
      .map((candidate) => ({ candidate, norm: normalizeForMatch(candidate) }))
      .filter(({ norm }) => norm.length >= 5);

    for (const { candidate } of normalizedCandidates) {
      for (const [alias] of ALIAS_INDEX) {
        if (candidate === alias) {
          subGroup = ALIAS_INDEX.find(([a]) => a === alias)?.[1] ?? 'Other';
          break;
        }
      }
      if (subGroup !== 'Other') break;
    }

    if (subGroup === 'Other') {
      let bestAlias: string | null = null;
      let bestLen = 0;
      for (const { norm } of normalizedCandidates) {
        for (const [alias] of ALIAS_INDEX) {
          const normAlias = normalizeForMatch(alias);
          if (normAlias.length < 8) continue;
          if (norm.includes(normAlias) && normAlias.length > bestLen) {
            bestAlias = alias;
            bestLen = normAlias.length;
          }
        }
      }
      if (bestAlias) {
        subGroup = ALIAS_INDEX.find(([a]) => a === bestAlias)?.[1] ?? 'Other';
      }
    }

    if (subGroup === 'Other') {
      let bestRatio = 0.84;
      let fuzzyBest: SubMuscleGroup | 'Other' = 'Other';
      for (const { norm } of normalizedCandidates) {
        if (norm.length < 8) continue;
        for (const [alias, group] of ALIAS_INDEX) {
          const normAlias = normalizeForMatch(alias);
          if (normAlias.length < 8) continue;
          const ratio = levenshteinRatio(norm, normAlias);
          if (ratio > bestRatio) {
            bestRatio = ratio;
            fuzzyBest = group;
          }
        }
      }
      if (fuzzyBest !== 'Other') subGroup = fuzzyBest;
    }

    if (subGroup === 'Other') {
      subGroup = applyHeuristics(name);
    }
  }

  return {
    mainGroup: MAIN_GROUP_MAPPING[subGroup] ?? 'Other',
    subGroup,
  };
}
