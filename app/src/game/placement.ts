/**
 * Pure placement maths: put the board on a real table in front of a seated user
 * and turn real objects on that table into blocked cells. Engine-free and tested.
 */
export type V3 = [number, number, number];
export interface SurfaceBox {
  min: V3;
  max: V3;
  label?: string;
  horizontal?: boolean; // plane orientation if known
}
export interface BoardPose {
  x: number;
  y: number;
  z: number;
  yaw: number; // radians; board local -Z points away from the user
  surface: SurfaceBox | null;
}

export const FORWARD_DIST = 0.45; // m — comfortable seated reach (2-ft radius)
export const FALLBACK_DROP = 0.35; // m below eye height when no table is found

/** yaw so that the board's far edge (-Z) faces along the user's horizontal gaze. */
export const yawFromForward = (fx: number, fz: number) => Math.atan2(-fx, -fz);

const NON_OBSTACLE = new Set(['floor', 'ceiling', 'wall', 'global mesh', 'table', 'desk', 'door', 'window', 'wall art']);

export function chooseBoardPose(head: V3, forward: V3, surfaces: SurfaceBox[], boardSize: number): BoardPose {
  const len = Math.hypot(forward[0], forward[2]) || 1;
  const fx = forward[0] / len;
  const fz = forward[2] / len;
  const yaw = yawFromForward(fx, fz);
  const px = head[0] + fx * FORWARD_DIST;
  const pz = head[2] + fz * FORWARD_DIST;

  let best: { s: SurfaceBox; d: number } | null = null;
  for (const s of surfaces) {
    const thin = s.max[1] - s.min[1] < 0.06;
    const tableLike = s.horizontal || thin || s.label === 'table' || s.label === 'desk';
    if (!tableLike) continue;
    const top = s.max[1];
    if (top < head[1] - 0.85 || top > head[1] - 0.12) continue; // seated table band
    const dx = Math.max(s.min[0] - px, 0, px - s.max[0]);
    const dz = Math.max(s.min[2] - pz, 0, pz - s.max[2]);
    const d = Math.hypot(dx, dz);
    if (d > 0.35) continue;
    if (!best || d < best.d) best = { s, d };
  }
  if (!best) return { x: px, y: head[1] - FALLBACK_DROP, z: pz, yaw, surface: null };

  const s = best.s;
  const half = boardSize / 2;
  const clampAxis = (v: number, lo: number, hi: number) =>
    hi - lo < boardSize ? (lo + hi) / 2 : Math.min(Math.max(v, lo + half), hi - half);
  // Bias 25 % toward the surface centre: round/irregular tables are smaller than their bounding box.
  const cx = (s.min[0] + s.max[0]) / 2;
  const cz = (s.min[2] + s.max[2]) / 2;
  const bx = clampAxis(px, s.min[0], s.max[0]);
  const bz = clampAxis(pz, s.min[2], s.max[2]);
  return {
    x: bx + (cx - bx) * 0.25,
    y: s.max[1] + 0.004,
    z: bz + (cz - bz) * 0.25,
    yaw,
    surface: s,
  };
}

/** World-space centre of board cell (x, y); row 0 is the far edge. */
export function cellWorld(pose: BoardPose, w: number, h: number, cell: number, cx: number, cy: number): [number, number] {
  const lx = (cx - (w - 1) / 2) * cell;
  const lz = (cy - (h - 1) / 2) * cell;
  const c = Math.cos(pose.yaw);
  const s = Math.sin(pose.yaw);
  return [pose.x + lx * c + lz * s, pose.z - lx * s + lz * c];
}

/**
 * Cells covered by real objects standing on the board area. Caps at 30 % of the
 * board so a cluttered desk degrades to a normal puzzle instead of an empty one.
 */
export function blockedCells(pose: BoardPose, w: number, h: number, cell: number, objects: SurfaceBox[]): number[] {
  const out: number[] = [];
  const margin = cell * 0.25;
  for (let cy = 0; cy < h; cy++)
    for (let cx = 0; cx < w; cx++) {
      const [x, z] = cellWorld(pose, w, h, cell, cx, cy);
      const hit = objects.some(
        (o) =>
          o !== pose.surface &&
          !NON_OBSTACLE.has(o.label ?? '') &&
          o.max[1] > pose.y + 0.02 &&
          o.min[1] < pose.y + 0.3 &&
          o.max[1] - o.min[1] < 0.6 &&
          x > o.min[0] - margin &&
          x < o.max[0] + margin &&
          z > o.min[2] - margin &&
          z < o.max[2] + margin,
      );
      if (hit) out.push(cy * w + cx);
    }
  return out.length > w * h * 0.3 ? [] : out;
}

/** Full angular width (degrees) of an object of `size` metres at `dist` metres. */
export const angularSize = (size: number, dist: number) => (2 * Math.atan(size / 2 / dist) * 180) / Math.PI;
