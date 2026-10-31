/**
 * Tiny procedural sound design (WebAudio, no asset files): every mirror the beam
 * passes adds a note, so solving a puzzle plays a short pentatonic phrase.
 */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

export class Synth {
  private ctx: AudioContext | null = null;
  muted = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (AC) this.ctx = new AC();
  }

  private tone(semi: number, at: number, dur = 0.35, gain = 0.08, type: OscillatorType = 'sine') {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = 523.25 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  tick() {
    this.tone(-12, 0, 0.08, 0.05, 'triangle');
  }
  ui() {
    this.tone(7, 0, 0.1, 0.04, 'triangle');
  }
  solve(bounces: number) {
    for (let i = 0; i <= Math.min(bounces + 1, PENTA.length - 1); i++) this.tone(PENTA[i], i * 0.09, 0.5);
  }
  day() {
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone(s, i * 0.12, 1.2, 0.07));
  }
}
