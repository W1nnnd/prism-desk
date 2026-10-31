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
