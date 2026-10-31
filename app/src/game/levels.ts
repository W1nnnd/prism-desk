import { Board, Cell } from './beam.js';
import { generatePuzzle, PuzzleSpec } from './daily.js';

export interface Level {
  id: string;
  kind: 'tutorial' | 'daily';
  board: Board;
  prompt: string; // short English line shown on the HUD
}

/** Three puzzles a day, ~1–4 minutes total: the "one bus stop" session. */
export const DAILY_SPECS: PuzzleSpec[] = [
  { w: 5, h: 5, turns: 1, decoys: 1, walls: 1, minFlips: 1 },
  { w: 6, h: 6, turns: 2, decoys: 1, walls: 2, minFlips: 1 },
  { w: 6, h: 6, turns: 3, decoys: 2, walls: 2, minFlips: 2 },
];

const parse = (rows: string[]): Board => {
  // . empty  # wall  > emitter(E)  * target  / \ mirror   (rows: far → near)
  const h = rows.length;
  const w = rows[0].length;
  const cells: Cell[] = [];
  for (const r of rows)
    for (const ch of r) {
      if (ch === '#') cells.push({ kind: 'wall' });
      else if (ch === '>') cells.push({ kind: 'emitter', dir: 1 });
      else if (ch === '*') cells.push({ kind: 'target' });
      else if (ch === '/') cells.push({ kind: 'mirror', slash: true });
      else if (ch === '\\') cells.push({ kind: 'mirror', slash: false });
      else cells.push({ kind: 'empty' });
    }
  return { w, h, cells };
};

/** Wordless-first onboarding: each step teaches one idea in < 30 s. */
export const TUTORIAL: Level[] = [
  {
    id: 'tutorial-1',
    kind: 'tutorial',
    // one mirror, wrong way round: pinch it once
    board: parse(['..*', '...', '>.\\']),
    prompt: 'Pinch the glowing mirror',
  },
  {
    id: 'tutorial-2',
    kind: 'tutorial',
    // two mirrors: bend the light twice
    board: parse(['....', '..\\*', '....', '>.\\.']),
    prompt: 'Bend the light to the crystal',
  },
];

export function dailyLevels(day: string, blocked: (w: number, h: number) => number[] = () => []): Level[] {
  return DAILY_SPECS.map((spec, n) => {
    const seed = `${day}#${n}`;
    let board: Board;
    try {
      board = generatePuzzle(seed, { ...spec, blocked: blocked(spec.w, spec.h) }).board;
    } catch {
      board = generatePuzzle(seed, spec).board; // room too cluttered → plain puzzle
    }
    return { id: seed, kind: 'daily' as const, board, prompt: `Daily ${n + 1}/${DAILY_SPECS.length}` };
  });
}
