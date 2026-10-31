import { Board, Cell, Dir, DX, DY, idx, inBounds, reflect, trace } from './beam.js';

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

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export interface Puzzle {
  board: Board;
  solution: Board;
  turns: number;
}

/**
 * Builds a solvable puzzle by walking a beam path with `turns` mirrors,
 * then scrambling the mirrors so the start state is unsolved.
 */
export function generatePuzzle(seedKey: string, w = 6, h = 6, turns = 3): Puzzle {
  const rnd = mulberry32(hashString(seedKey));
  const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

  for (let attempt = 0; attempt < 500; attempt++) {
    const cells: Cell[] = Array.from({ length: w * h }, () => ({ kind: 'empty' }) as Cell);
    const b: Board = { w, h, cells };
    let x = 0;
    let y = 1 + Math.floor(rnd() * (h - 2));
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
        if (!inBounds(b, nx, ny) || used.has(idx(b, nx, ny))) { ok = false; break; }
        x = nx; y = ny; used.add(idx(b, x, y));
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
    const solution: Board = { w, h, cells: cells.slice() };
    if (!trace(solution).solved) continue;

    // Decoys: one extra rotatable mirror and two walls off the path.
    const free = cells.map((_, i) => i).filter((i) => !used.has(i));
    const decoy = pick(free);
    cells[decoy] = { kind: 'mirror', slash: rnd() < 0.5 };
    for (let k = 0; k < 2; k++) {
      const f = free.filter((i) => cells[i].kind === 'empty');
      cells[pick(f)] = { kind: 'wall' };
    }

    // Scramble: flip at least one solution mirror.
    const board: Board = { w, h, cells: cells.slice() };
    for (const m of mirrors) {
      const c = board.cells[m] as Extract<Cell, { kind: 'mirror' }>;
      if (rnd() < 0.6) board.cells[m] = { ...c, slash: !c.slash };
    }
    if (trace(board).solved) {
      const m = mirrors[0];
      const c = board.cells[m] as Extract<Cell, { kind: 'mirror' }>;
      board.cells[m] = { ...c, slash: !c.slash };
    }
    if (trace(board).solved) continue;
    const fullSolution: Board = { w, h, cells: cells.slice() };
    return { board, solution: fullSolution, turns };
  }
  throw new Error('could not generate puzzle');
}
