import { Board, Cell, trace } from './beam.js';

type Mirror = Extract<Cell, { kind: 'mirror' }>;

export const rotatableMirrors = (b: Board) =>
  b.cells.flatMap((c, i) => (c.kind === 'mirror' && !c.locked ? [i] : []));

/**
 * Exhaustive solver (boards have ≤ 12 rotatable mirrors → ≤ 4096 traces).
 * Returns the smallest set of mirror indices to flip, or null if unsolvable.
 */
export function solve(b: Board): number[] | null {
  const ms = rotatableMirrors(b);
  if (ms.length > 12) throw new Error('board too large for exhaustive solver');
  let best: number[] | null = null;
  const total = 1 << ms.length;
  for (let mask = 0; mask < total; mask++) {
    const flips = ms.filter((_, k) => mask & (1 << k));
    if (best && flips.length >= best.length) continue;
    const cells = b.cells.slice();
    for (const i of flips) {
      const c = cells[i] as Mirror;
      cells[i] = { ...c, slash: !c.slash };
    }
    if (trace({ ...b, cells }).solved) best = flips;
  }
  return best;
}

/** A single mirror the player should rotate next, or null if solved/unsolvable. */
export function hint(b: Board): number | null {
  if (trace(b).solved) return null;
  const s = solve(b);
  return s && s.length ? s[0] : null;
}
