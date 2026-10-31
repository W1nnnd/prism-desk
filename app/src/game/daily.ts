import { Board, Cell, Dir, DX, DY, idx, inBounds, reflect, trace } from './beam.js';
import { solve } from './solver.js';

/** Deterministic PRNG so every player gets the same puzzle on the same day. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Local calendar day (the puzzle flips at the player's midnight). */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface PuzzleSpec {
  w: number;
  h: number;
  turns: number; // mirrors on the solution path
  decoys: number; // extra rotatable mirrors off the path
  walls: number; // virtual blockers
  minFlips: number; // minimum rotations needed from the start state
  blocked?: number[]; // cells occupied by real-world objects (from scene understanding)
}

export interface Puzzle {
  board: Board;
  solution: Board;
  minFlips: number;
}

type Mirror = Extract<Cell, { kind: 'mirror' }>;

/**
 * Builds a solvable puzzle by walking a beam path with `turns` mirrors,
 * then scrambling mirrors so the start state needs ≥ minFlips rotations.
 * Real-world blocked cells become `room` walls the path must route around.
 */
export function generatePuzzle(seedKey: string, spec: PuzzleSpec): Puzzle {
  const { w, h, turns } = spec;
  const blocked = new Set((spec.blocked ?? []).filter((i) => i >= 0 && i < w * h));
  const rnd = mulberry32(hashString(`${seedKey}|${w}x${h}|${turns}|${[...blocked].sort((a, b) => a - b).join(',')}`));
  const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

  for (let attempt = 0; attempt < 3000; attempt++) {
    const cells: Cell[] = Array.from({ length: w * h }, (_, i) =>
      blocked.has(i) ? ({ kind: 'wall', room: true } as Cell) : ({ kind: 'empty' } as Cell),
    );
    const b: Board = { w, h, cells };
    const starts = Array.from({ length: h }, (_, y) => y).filter((y) => !blocked.has(idx(b, 0, y)));
    if (!starts.length) break;
    let x = 0;
    let y = pick(starts);
    let dir: Dir = 1;
    cells[idx(b, x, y)] = { kind: 'emitter', dir };
    const used = new Set<number>([idx(b, x, y)]);
    const mirrors: number[] = [];
    let ok = true;

    for (let t = 0; t <= turns && ok; t++) {
      const len = 1 + Math.floor(rnd() * 3);
      for (let s = 0; s < len; s++) {
        const nx = x + DX[dir];
        const ny = y + DY[dir];
        if (!inBounds(b, nx, ny) || used.has(idx(b, nx, ny)) || blocked.has(idx(b, nx, ny))) {
          ok = false;
          break;
        }
        x = nx;
        y = ny;
        used.add(idx(b, x, y));
      }
      if (!ok) break;
      if (t === turns) {
        cells[idx(b, x, y)] = { kind: 'target' };
      } else {
        const slash = rnd() < 0.5;
        cells[idx(b, x, y)] = { kind: 'mirror', slash };
        mirrors.push(idx(b, x, y));
        dir = reflect(dir, slash);
      }
    }
    if (!ok) continue;
    if (!trace({ w, h, cells }).solved) continue;

    const free = () => cells.map((c, i) => (c.kind === 'empty' && !used.has(i) ? i : -1)).filter((i) => i >= 0);
    for (let k = 0; k < spec.decoys; k++) {
      const f = free();
      if (f.length) cells[pick(f)] = { kind: 'mirror', slash: rnd() < 0.5 };
    }
    for (let k = 0; k < spec.walls; k++) {
      const f = free();
      if (f.length) cells[pick(f)] = { kind: 'wall' };
    }
    const solution: Board = { w, h, cells: cells.slice() };
    if (!trace(solution).solved) continue;

    const board: Board = { w, h, cells: cells.slice() };
    for (const m of mirrors) {
      if (rnd() < 0.7) {
        const c = board.cells[m] as Mirror;
        board.cells[m] = { ...c, slash: !c.slash };
      }
    }
    const sol = solve(board);
    if (!sol || sol.length < Math.max(1, spec.minFlips)) continue;
    return { board, solution, minFlips: sol.length };
  }
  throw new Error(`could not generate puzzle for ${seedKey}`);
}
