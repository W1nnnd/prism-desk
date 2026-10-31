import { describe, expect, it } from 'vitest';
import { Board, Cell, reflect, toggleMirror, trace } from '../src/game/beam';
import { dayKey, generatePuzzle } from '../src/game/daily';
import { DAILY_SPECS, dailyLevels, TUTORIAL } from '../src/game/levels';
import { bestStreak, currentStreak, defaultProgress, KV, loadProgress, recordSolve, saveProgress, STORAGE_KEY } from '../src/game/progress';
import { hint, solve } from '../src/game/solver';

const E = { kind: 'empty' } as Cell;

describe('beam core', () => {
  it('reflects correctly', () => {
    expect(reflect(1, true)).toBe(0); // E hits '/' -> N
    expect(reflect(1, false)).toBe(2); // E hits '\' -> S
    expect(reflect(0, true)).toBe(1);
    expect(reflect(3, false)).toBe(0);
  });

  it('lights a target via one mirror, and toggling breaks it', () => {
    const b0: Board = { w: 3, h: 3, cells: Array(9).fill(E) };
    b0.cells[6] = { kind: 'emitter', dir: 1 };
    b0.cells[8] = { kind: 'mirror', slash: true };
    b0.cells[2] = { kind: 'target' };
    expect(trace(b0).solved).toBe(true);
    const b1 = toggleMirror(b0, 8);
    expect(trace(b1).solved).toBe(false);
    expect(trace(toggleMirror(b1, 8)).solved).toBe(true);
  });

  it('stops at walls and room objects', () => {
    const b: Board = { w: 3, h: 1, cells: [{ kind: 'emitter', dir: 1 }, { kind: 'wall', room: true }, { kind: 'target' }] };
    expect(trace(b).solved).toBe(false);
  });

  it('locked mirrors cannot be toggled', () => {
    const b: Board = { w: 1, h: 1, cells: [{ kind: 'mirror', slash: true, locked: true }] };
    expect(toggleMirror(b, 0)).toBe(b);
  });
});

describe('solver', () => {
  it('finds the minimal flips', () => {
    const b: Board = { w: 3, h: 3, cells: Array(9).fill(E) };
    b.cells[6] = { kind: 'emitter', dir: 1 };
    b.cells[8] = { kind: 'mirror', slash: false };
    b.cells[2] = { kind: 'target' };
    expect(solve(b)).toEqual([8]);
    expect(hint(b)).toBe(8);
    expect(hint(toggleMirror(b, 8))).toBeNull();
  });
});

describe('tutorial', () => {
  it('each step is unsolved, solvable, and teaches one more flip', () => {
    TUTORIAL.forEach((lvl, n) => {
      expect(trace(lvl.board).solved).toBe(false);
      expect(solve(lvl.board)?.length).toBe(n + 1);
    });
  });
});

describe('daily generator', () => {
  const days = Array.from({ length: 366 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 1 + i));
    return d.toISOString().slice(0, 10);
  });

  it('is deterministic per day', () => {
    for (const d of days.slice(0, 20)) expect(dailyLevels(d)).toEqual(dailyLevels(d));
    expect(dailyLevels(days[0])[0].board).not.toEqual(dailyLevels(days[1])[0].board);
  });

  it('every day for a year: solvable, starts unsolved, meets minFlips', () => {
    for (const d of days) {
      dailyLevels(d).forEach((lvl, n) => {
        const spec = DAILY_SPECS[n];
        expect(trace(lvl.board).solved).toBe(false);
        const s = solve(lvl.board);
        expect(s).not.toBeNull();
        expect(s!.length).toBeGreaterThanOrEqual(spec.minFlips);
        expect(lvl.board.cells.filter((c) => c.kind === 'emitter')).toHaveLength(1);
        expect(lvl.board.cells.filter((c) => c.kind === 'target')).toHaveLength(1);
      });
    }
  });

  it('routes around real-world blocked cells', () => {
    for (const d of days.slice(0, 60)) {
      const blocked = [8, 9, 14, 15]; // a mug + phone in the middle of a 6×6 board
      const p = generatePuzzle(d, { ...DAILY_SPECS[2], blocked });
      for (const i of blocked) expect(p.board.cells[i]).toEqual({ kind: 'wall', room: true });
      expect(trace(p.solution).solved).toBe(true);
      expect(solve(p.board)).not.toBeNull();
    }
  });

  it('falls back to a plain puzzle when the room blocks too much', () => {
    const levels = dailyLevels('2026-11-05', (w) => Array.from({ length: w }, (_, y) => y * w)); // whole emitter column
    levels.forEach((l) => expect(solve(l.board)).not.toBeNull());
  });

  it('dayKey uses the local calendar date', () => {
    expect(dayKey(new Date(2026, 10, 19, 3, 0))).toBe('2026-11-19');
  });
});

describe('progress', () => {
  it('counts streaks', () => {
    let p = defaultProgress();
    p = recordSolve(p, '2026-11-01');
    p = recordSolve(p, '2026-11-02');
    p = recordSolve(p, '2026-11-02');
    expect(p.solvedDays).toHaveLength(2);
    expect(currentStreak(p, '2026-11-02')).toBe(2);
    expect(currentStreak(p, '2026-11-03')).toBe(2);
    expect(currentStreak(p, '2026-11-04')).toBe(0);
    p = recordSolve(p, '2026-11-10');
    expect(bestStreak(p)).toBe(2);
  });

  it('round-trips storage and survives corrupt saves', () => {
    const mem = new Map<string, string>();
    const kv: KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
    const p = { ...recordSolve(defaultProgress(), '2026-11-01'), tutorialDone: true };
    p.settings.highContrast = true;
    saveProgress(kv, p);
    expect(loadProgress(kv)).toEqual(p);
    mem.set(STORAGE_KEY, '{not json');
    expect(loadProgress(kv)).toEqual(defaultProgress());
    mem.set(STORAGE_KEY, JSON.stringify({ solvedDays: ['x', '2026-11-02', '2026-11-02'] }));
    expect(loadProgress(kv).solvedDays).toEqual(['2026-11-02']);
    expect(loadProgress(undefined)).toEqual(defaultProgress());
  });
});
