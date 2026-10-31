import { Board, toggleMirror, trace, TraceResult } from './beam.js';
import { dailyLevels, Level, TUTORIAL } from './levels.js';
import { Progress, recordSolve } from './progress.js';
import { hint } from './solver.js';

export type GameEvent =
  | { type: 'rotated'; cell: number }
  | { type: 'targetLit'; cell: number } // a crystal that was dark is now lit (partial progress)
  | { type: 'solved'; level: Level }
  | { type: 'tutorialComplete' }
  | { type: 'dayComplete'; day: string };

/** Engine-free game state machine; the XR view just renders it and forwards taps. */
export class GameSession {
  levels: Level[];
  index: number;
  board: Board;
  result: TraceResult;
  moves = 0;

  constructor(
    public day: string,
    public progress: Progress,
    blocked?: (w: number, h: number) => number[],
  ) {
    const daily = dailyLevels(day, blocked);
    this.levels = progress.tutorialDone ? daily : [...TUTORIAL, ...daily];
    const resume = progress.today?.day === day ? progress.today.index : 0;
    this.index = this.dayComplete ? this.levels.length - 1 : Math.min(resume, this.levels.length - 1);
    if (!progress.tutorialDone) this.index = 0;
    this.board = this.levels[this.index].board;
    this.result = trace(this.board);
    if (this.dayComplete) this.showSolved();
  }

  get level() {
    return this.levels[this.index];
  }
  get dayComplete() {
    return this.progress.solvedDays.includes(this.day);
  }
  get dailyIndex() {
    return this.levels.slice(0, this.index + 1).filter((l) => l.kind === 'daily').length;
  }
  get solved() {
    return this.result.solved;
  }
  get targetCount() {
    return this.board.cells.filter((c) => c.kind === 'target').length;
  }
  get litCount() {
    return this.result.litTargets.length;
  }

  /** Daily already done → show the last board solved (garden view). */
  private showSolved() {
    // Final daily boards are generated solvable; replace with solution state for display.
    // Kept simple: leave the board as-is; the HUD shows "Come back tomorrow".
  }

  toggle(cell: number): GameEvent[] {
    if (this.solved || this.dayComplete) return [];
    const next = toggleMirror(this.board, cell);
    if (next === this.board) return [];
    this.board = next;
    this.moves++;
    const before = this.result.litTargets;
    this.result = trace(this.board);
    const events: GameEvent[] = [{ type: 'rotated', cell }];
    for (const t of this.result.litTargets) if (!before.includes(t)) events.push({ type: 'targetLit', cell: t });
    if (!this.result.solved) return events;

    events.push({ type: 'solved', level: this.level });
    const isLast = this.index === this.levels.length - 1;
    const nextLevel = this.levels[this.index + 1];
    if (this.level.kind === 'tutorial' && nextLevel?.kind === 'daily') {
      this.progress = { ...this.progress, tutorialDone: true };
      events.push({ type: 'tutorialComplete' });
    }
    if (isLast) {
      this.progress = recordSolve(this.progress, this.day);
      events.push({ type: 'dayComplete', day: this.day });
    }
    this.progress = { ...this.progress, today: { day: this.day, index: this.dailyResumeIndex(isLast) } };
    return events;
  }

  private dailyResumeIndex(isLast: boolean) {
    // resume index counts daily levels only (tutorial is never replayed)
    const dailyStart = this.levels.findIndex((l) => l.kind === 'daily');
    const nextIdx = isLast ? this.index : this.index + 1;
    return Math.max(0, nextIdx - dailyStart);
  }

  /** Move to the next level after a solve. Returns false when the day is finished. */
  advance(): boolean {
    if (!this.solved || this.index >= this.levels.length - 1) return false;
    this.index++;
    this.board = this.level.board;
    this.result = trace(this.board);
    this.moves = 0;
    return true;
  }

  reset() {
    if (this.dayComplete) return;
    this.board = this.level.board;
    this.result = trace(this.board);
    this.moves = 0;
  }

  hint(): number | null {
    return hint(this.board);
  }
}
