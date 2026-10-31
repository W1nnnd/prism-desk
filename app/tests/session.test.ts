import { describe, expect, it } from 'vitest';
import { defaultProgress } from '../src/game/progress';
import { GameSession } from '../src/game/session';

/** Plays the current level to completion using the solver's hints. */
function playLevel(s: GameSession) {
  const events = [];
  for (let guard = 0; guard < 20 && !s.solved; guard++) {
    const c = s.hint();
    if (c === null) throw new Error('unsolvable');
    events.push(...s.toggle(c));
  }
  return events;
}

describe('game session (first five minutes → daily loop)', () => {
  it('first run: tutorial ×2 then 3 dailies, then day complete with a garden crystal', () => {
    const s = new GameSession('2026-11-01', defaultProgress());
    expect(s.levels.map((l) => l.kind)).toEqual(['tutorial', 'tutorial', 'daily', 'daily', 'daily']);
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(...playLevel(s));
      if (i < 4) expect(s.advance()).toBe(true);
    }
    expect(all.filter((e) => e.type === 'solved')).toHaveLength(5);
    expect(all.some((e) => e.type === 'tutorialComplete')).toBe(true);
    expect(all.at(-1)).toEqual({ type: 'dayComplete', day: '2026-11-01' });
    expect(s.progress.solvedDays).toEqual(['2026-11-01']);
    expect(s.progress.tutorialDone).toBe(true);
    expect(s.advance()).toBe(false);
    expect(s.toggle(0)).toEqual([]); // locked after completion
  });

  it('returning player skips the tutorial and resumes mid-day', () => {
    const p = { ...defaultProgress(), tutorialDone: true, today: { day: '2026-11-02', index: 1 } };
    const s = new GameSession('2026-11-02', p);
    expect(s.levels).toHaveLength(3);
    expect(s.index).toBe(1);
    playLevel(s);
    expect(s.progress.today).toEqual({ day: '2026-11-02', index: 2 });
  });

  it('yesterday\'s resume point does not leak into today', () => {
    const p = { ...defaultProgress(), tutorialDone: true, today: { day: '2026-11-01', index: 2 } };
    expect(new GameSession('2026-11-02', p).index).toBe(0);
  });

  it('reset restores the start board', () => {
    const s = new GameSession('2026-11-03', { ...defaultProgress(), tutorialDone: true });
    const start = s.board;
    s.toggle(s.hint()!);
    s.reset();
    expect(s.board).toBe(start);
    expect(s.moves).toBe(0);
  });
});

describe('feedback events (polish)', () => {
  it('emits targetLit only when a dark crystal becomes lit, before solved', () => {
    const s = new GameSession('2026-11-05', { ...defaultProgress(), tutorialDone: true });
    const events = playLevel(s);
    const lit = events.filter((e) => e.type === 'targetLit');
    expect(lit.length).toBeGreaterThanOrEqual(1);
    expect(s.litCount).toBe(s.targetCount);
    // every newly lit crystal is a real target cell, reported once per lighting
    for (const e of lit) expect(s.board.cells[(e as { cell: number }).cell].kind).toBe('target');
    const solvedAt = events.findIndex((e) => e.type === 'solved');
    expect(events.findIndex((e) => e.type === 'targetLit')).toBeLessThan(solvedAt);
  });

  it('targetLit matches the change in lit crystals (toggle a mirror off and back)', () => {
    const s = new GameSession('2026-11-06', { ...defaultProgress(), tutorialDone: true });
    const start = [...s.result.litTargets];
    const mirror = s.board.cells.findIndex((c) => c.kind === 'mirror' && !c.locked);
    const first = s.toggle(mirror);
    if (s.solved) return; // (not the case for this seed, guarded anyway)
    const mid = [...s.result.litTargets];
    expect(first.filter((e) => e.type === 'targetLit').map((e) => (e as { cell: number }).cell)).toEqual(mid.filter((t) => !start.includes(t)));
    const second = s.toggle(mirror);
    expect(second.filter((e) => e.type === 'targetLit').map((e) => (e as { cell: number }).cell).sort()).toEqual(start.filter((t) => !mid.includes(t)).sort());
  });
});
