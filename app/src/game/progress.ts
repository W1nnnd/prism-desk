/** "Reason to come back": daily streak + a garden that grows one crystal per solve. */
export interface Progress {
  solvedDays: string[]; // YYYY-MM-DD, unique, sorted
}

export function recordSolve(p: Progress, day: string): Progress {
  if (p.solvedDays.includes(day)) return p;
  return { solvedDays: [...p.solvedDays, day].sort() };
}

export function currentStreak(p: Progress, today: string): number {
  const set = new Set(p.solvedDays);
  let streak = 0;
  const d = new Date(`${today}T00:00:00Z`);
  // A streak survives until the end of today even if today is not yet solved.
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

export const gardenSize = (p: Progress) => p.solvedDays.length;
