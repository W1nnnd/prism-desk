/**
 * Prism Desk — pure, engine-free puzzle core.
 * Grid coordinates: x → right, y → away from the player (row 0 = far edge).
 */
export type Dir = 0 | 1 | 2 | 3; // 0=N(y-1) 1=E(x+1) 2=S(y+1) 3=W(x-1)
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export type Cell =
  | { kind: 'empty' }
  | { kind: 'wall' }
  | { kind: 'emitter'; dir: Dir }
  | { kind: 'target' }
  | { kind: 'mirror'; slash: boolean; locked?: boolean }; // slash: '/', else '\'

export interface Board {
  w: number;
  h: number;
  cells: Cell[]; // row-major, index = y * w + x
}

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TraceResult {
  segments: Segment[];
  litTargets: number[]; // cell indices
  solved: boolean;
}

export const idx = (b: Board, x: number, y: number) => y * b.w + x;
export const inBounds = (b: Board, x: number, y: number) =>
  x >= 0 && y >= 0 && x < b.w && y < b.h;

/** '/' : N<->E, S<->W.   '\' : N<->W, S<->E. */
export function reflect(dir: Dir, slash: boolean): Dir {
  if (slash) return ([1, 0, 3, 2] as Dir[])[dir];
  return ([3, 2, 1, 0] as Dir[])[dir];
}

export function trace(b: Board): TraceResult {
  const segments: Segment[] = [];
  const lit = new Set<number>();
  const seen = new Set<string>();
  const targets = b.cells.flatMap((c, i) => (c.kind === 'target' ? [i] : []));

  b.cells.forEach((c, i) => {
    if (c.kind !== 'emitter') return;
    let x = i % b.w;
    let y = Math.floor(i / b.w);
    let dir = c.dir;
    let sx = x;
    let sy = y;
    for (let guard = 0; guard < b.w * b.h * 4 + 4; guard++) {
      const key = `${x},${y},${dir}`;
      if (seen.has(key)) break; // loop
      seen.add(key);
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      if (!inBounds(b, nx, ny)) {
        segments.push({ x0: sx, y0: sy, x1: x + DX[dir] * 0.5, y1: y + DY[dir] * 0.5 });
        break;
      }
      const cell = b.cells[idx(b, nx, ny)];
      x = nx;
      y = ny;
      if (cell.kind === 'wall' || cell.kind === 'emitter') {
        segments.push({ x0: sx, y0: sy, x1: x - DX[dir] * 0.5, y1: y - DY[dir] * 0.5 });
        break;
      }
      if (cell.kind === 'target') {
        lit.add(idx(b, x, y));
        segments.push({ x0: sx, y0: sy, x1: x, y1: y });
        break;
      }
      if (cell.kind === 'mirror') {
        segments.push({ x0: sx, y0: sy, x1: x, y1: y });
        sx = x;
        sy = y;
        dir = reflect(dir, cell.slash);
      }
    }
  });

  const litTargets = [...lit];
  return {
    segments,
    litTargets,
    solved: targets.length > 0 && targets.every((t) => lit.has(t)),
  };
}

/** Player action: rotate a (non-locked) mirror. Returns a new board. */
export function toggleMirror(b: Board, i: number): Board {
  const c = b.cells[i];
  if (!c || c.kind !== 'mirror' || c.locked) return b;
  const cells = b.cells.slice();
  cells[i] = { ...c, slash: !c.slash };
  return { ...b, cells };
}
