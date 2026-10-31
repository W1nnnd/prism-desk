import { describe, expect, it } from 'vitest';
import { Board, Cell, reflect, toggleMirror, trace } from '../src/game/beam';
import { generatePuzzle } from '../src/game/daily';
import { currentStreak, recordSolve } from '../src/game/progress';

const E = { kind: 'empty' } as Cell;

describe('beam core', () => {
  it('reflects correctly', () => {
    expect(reflect(1, true)).toBe(0); // E hits '/' -> N
    expect(reflect(1, false)).toBe(2); // E hits '\' -> S
    expect(reflect(0, true)).toBe(1);
    expect(reflect(3, false)).toBe(0);
  });

  it('lights a target via one mirror, and toggling breaks it', () => {
    // 3x3: emitter (0,2) east, mirror (2,2) '/', target (2,0)
    const cells: Cell[] = Array(9).fill(E);
    const b0: Board = { w: 3, h: 3, cells: cells.slice() };
    b0.cells[6] = { kind: 'emitter', dir: 1 };
    b0.cells[8] = { kind: 'mirror', slash: true };
    b0.cells[2] = { kind: 'target' };
    expect(trace(b0).solved).toBe(true);
    const b1 = toggleMirror(b0, 8);
    expect(trace(b1).solved).toBe(false);
    expect(trace(toggleMirror(b1, 8)).solved).toBe(true);
  });

  it('stops at walls and does not loop forever', () => {
    const b: Board = { w: 3, h: 1, cells: [{ kind: 'emitter', dir: 1 }, { kind: 'wall' }, { kind: 'target' }] };
    expect(trace(b).solved).toBe(false);
  });
});

describe('daily generator', () => {
  it('is deterministic per day and always solvable but starts unsolved', () => {
    for (let d = 1; d <= 60; d++) {
      const key = `2026-11-${String((d % 28) + 1).padStart(2, '0')}#${d}`;
      const a = generatePuzzle(key);
      const b = generatePuzzle(key);
      expect(a.board).toEqual(b.board);
      expect(trace(a.solution).solved).toBe(true);
      expect(trace(a.board).solved).toBe(false);
    }
  });
});

describe('progress', () => {
  it('counts streaks', () => {
    let p = { solvedDays: [] as string[] };
    p = recordSolve(p, '2026-11-01');
    p = recordSolve(p, '2026-11-02');
    p = recordSolve(p, '2026-11-02');
    expect(p.solvedDays).toHaveLength(2);
    expect(currentStreak(p, '2026-11-02')).toBe(2);
    expect(currentStreak(p, '2026-11-03')).toBe(2);
    expect(currentStreak(p, '2026-11-04')).toBe(0);
  });
});
