/** Persistence: daily streak, crystal garden, onboarding + accessibility settings. */
export interface Settings {
  highContrast: boolean;
  dwell: boolean; // hover/gaze 1 s selects — no pinch needed (one-hand / low-mobility)
  dockLeft: boolean; // dock on the left for left-handed one-hand use
}

export interface Progress {
  v: 1;
  solvedDays: string[]; // YYYY-MM-DD, unique, sorted — every complete day grows one crystal
  tutorialDone: boolean;
  today?: { day: string; index: number }; // resume point inside today's set
  settings: Settings;
}

export const defaultProgress = (): Progress => ({
  v: 1,
  solvedDays: [],
  tutorialDone: false,
  settings: { highContrast: false, dwell: false, dockLeft: false },
});

export function recordSolve(p: Progress, day: string): Progress {
  if (p.solvedDays.includes(day)) return p;
  return { ...p, solvedDays: [...p.solvedDays, day].sort() };
}

const shift = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function currentStreak(p: Pick<Progress, 'solvedDays'>, today: string): number {
  const set = new Set(p.solvedDays);
  let d = set.has(today) ? today : shift(today, -1); // streak survives until today ends
  let streak = 0;
  while (set.has(d)) {
    streak++;
    d = shift(d, -1);
  }
  return streak;
}

export function bestStreak(p: Pick<Progress, 'solvedDays'>): number {
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of p.solvedDays) {
    run = prev && shift(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export const gardenSize = (p: Pick<Progress, 'solvedDays'>) => p.solvedDays.length;

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export const STORAGE_KEY = 'prism-desk-v1';

export function loadProgress(store: KV | undefined): Progress {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw) as Partial<Progress>;
    const base = defaultProgress();
    return {
      ...base,
      ...p,
      v: 1,
      solvedDays: Array.isArray(p.solvedDays) ? [...new Set(p.solvedDays.filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)))].sort() : [],
      settings: { ...base.settings, ...(p.settings ?? {}) },
    };
  } catch {
    return defaultProgress(); // corrupt save never blocks play
  }
}

export function saveProgress(store: KV | undefined, p: Progress) {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — session-only progress */
  }
}
