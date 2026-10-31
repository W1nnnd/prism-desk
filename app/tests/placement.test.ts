import { describe, expect, it } from 'vitest';
import { angularSize, blockedCells, chooseBoardPose, FALLBACK_DROP, SurfaceBox } from '../src/game/placement';

const head: [number, number, number] = [0, 1.2, 0]; // seated eye height
const fwd: [number, number, number] = [0, -0.4, -1];
const table: SurfaceBox = { min: [-0.6, 0.72, -0.9], max: [0.6, 0.74, -0.2], label: 'table', horizontal: true };

describe('placement', () => {
  it('puts the board on a seated-height table in front of the user', () => {
    const p = chooseBoardPose(head, fwd, [table], 0.4);
    expect(p.surface).toBe(table);
    expect(p.y).toBeCloseTo(0.744, 3);
    expect(p.z).toBeGreaterThan(-0.56); // biased toward table centre (-0.55)
    expect(p.z).toBeLessThan(-0.44);
    expect(p.yaw).toBeCloseTo(0, 5);
  });

  it('falls back to a floating board when no table is found (emulator / bare room)', () => {
    const floor: SurfaceBox = { min: [-3, -0.01, -3], max: [3, 0, 3], label: 'floor', horizontal: true };
    const p = chooseBoardPose(head, fwd, [floor], 0.4);
    expect(p.surface).toBeNull();
    expect(p.y).toBeCloseTo(1.2 - FALLBACK_DROP);
  });

  it('turns a mug on the table into blocked cells, ignoring the table itself', () => {
    const p = chooseBoardPose(head, fwd, [table], 0.4);
    // a 6 cm mug standing just right of / behind the board centre
    const mug: SurfaceBox = { min: [p.x - 0.03, 0.74, p.z - 0.06], max: [p.x + 0.03, 0.85, p.z], label: 'other' };
    const cells = blockedCells(p, 6, 6, 0.05, [table, mug]);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(6);
    expect(cells).toContain(2 * 6 + 2);
  });

  it('ignores clutter that would cover > 30% of the board', () => {
    const p = chooseBoardPose(head, fwd, [table], 0.4);
    const laptop: SurfaceBox = { min: [-0.3, 0.74, -0.7], max: [0.3, 0.76, -0.2], label: 'other' };
    expect(blockedCells(p, 6, 6, 0.05, [laptop])).toEqual([]);
  });

  it('respects yaw when the user faces sideways', () => {
    const p = chooseBoardPose(head, [1, 0, 0], [], 0.4);
    expect(p.x).toBeCloseTo(0.45);
    expect(p.yaw).toBeCloseTo(-Math.PI / 2);
  });

  it('keeps the board inside a narrow field of view (glasses-friendly)', () => {
    const dist = Math.hypot(0.45, FALLBACK_DROP);
    expect(angularSize(0.3, dist)).toBeLessThan(32); // 6×6 × 5 cm board
    expect(angularSize(0.3 + 2 * 0.07, dist)).toBeLessThan(45); // incl. side dock
  });
});
