/**
 * Prism Desk — renders the daily light-bending puzzle as a small seated
 * tabletop board and wires hands-first input (pinch-ray or direct poke).
 *
 * Milestone M2 replaces the fixed placement below with an anchor on the
 * user's real table (plane detection / hit-test) — see PLAN.md.
 */
import {
  BoxGeometry,
  Color,
  createSystem,
  CylinderGeometry,
  Entity,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  PokeInteractable,
  Pressed,
  RayInteractable,
} from '@iwsdk/core';
import { Board, toggleMirror, trace } from './game/beam.js';
import { dayKey, generatePuzzle } from './game/daily.js';
import { currentStreak, gardenSize, Progress, recordSolve } from './game/progress.js';

const CELL = 0.06; // metres — whole 6x6 board is 36 cm, fits an airplane tray
const BOARD_POS = { x: 0, y: 0.78, z: -0.45 }; // seated, slightly below eye line
const STORAGE_KEY = 'prism-desk-progress-v1';

const mat = (hex: number, emissive = 0) =>
  new MeshStandardMaterial({ color: hex, emissive: new Color(hex), emissiveIntensity: emissive, roughness: 0.4 });

export class PrismBoardSystem extends createSystem({
  pressed: { required: [RayInteractable, Pressed] },
}) {
  private board!: Board;
  private root!: Group;
  private rootEntity!: Entity;
  private beams: Mesh[] = [];
  private targetMeshes = new Map<number, Mesh>();
  private mirrorMeshes = new Map<number, Mesh>();
  private progress: Progress = { solvedDays: [] };
  private today = dayKey(new Date());
  private hud?: HTMLDivElement;
  private beamMat = mat(0xffe27a, 2.5);
  private targetOff = mat(0x3b4a6b, 0.2);
  private targetOn = mat(0x7affc9, 2.0);

  init(): void {
    this.progress = loadProgress();
    this.board = generatePuzzle(this.today).board;
    this.root = new Group();
    this.root.position.set(BOARD_POS.x, BOARD_POS.y, BOARD_POS.z);
    this.rootEntity = this.world.createTransformEntity(this.root);
    this.buildBoard();
    this.buildHud();
    this.refresh();

    this.queries.pressed.subscribe('qualify', (entity: Entity) => {
      const cellIndex = entity.object3D?.userData.cellIndex as number | undefined;
      if (cellIndex == null) return;
      this.board = toggleMirror(this.board, cellIndex);
      this.refresh();
    });
  }

  private cellPos(x: number, y: number) {
    const { w, h } = this.board;
    return { px: (x - (w - 1) / 2) * CELL, pz: (y - (h - 1) / 2) * CELL };
  }

  private buildBoard() {
    const { w, h, cells } = this.board;
    const base = new Mesh(new BoxGeometry(w * CELL + 0.02, 0.01, h * CELL + 0.02), mat(0x141a28));
    base.position.y = -0.006;
    this.root.add(base);

    cells.forEach((c, i) => {
      const { px, pz } = this.cellPos(i % w, Math.floor(i / w));
      if (c.kind === 'wall') {
        const m = new Mesh(new BoxGeometry(CELL * 0.9, CELL * 0.6, CELL * 0.9), mat(0x2a3142));
        m.position.set(px, CELL * 0.3, pz);
        this.root.add(m);
      } else if (c.kind === 'emitter') {
        const m = new Mesh(new CylinderGeometry(CELL * 0.3, CELL * 0.35, CELL * 0.5, 16), mat(0xffb347, 1.2));
        m.position.set(px, CELL * 0.25, pz);
        this.root.add(m);
      } else if (c.kind === 'target') {
        const m = new Mesh(new OctahedronGeometry(CELL * 0.32), this.targetOff);
        m.position.set(px, CELL * 0.4, pz);
        this.root.add(m);
        this.targetMeshes.set(i, m);
      } else if (c.kind === 'mirror') {
        // Interactable pad (bigger than the mirror for forgiving hand input).
        const pad = new Mesh(new BoxGeometry(CELL * 0.95, 0.012, CELL * 0.95), mat(0x22304a, 0.1));
        pad.position.set(px, 0.006, pz);
        pad.userData.cellIndex = i;
        const glass = new Mesh(new BoxGeometry(CELL * 0.9, CELL * 0.5, 0.006), mat(0x9fd8ff, 0.6));
        glass.position.y = CELL * 0.25;
        pad.add(glass);
        this.mirrorMeshes.set(i, glass);
        const e = this.world.createTransformEntity(pad, { parent: this.rootEntity });
        e.addComponent(RayInteractable);
        e.addComponent(PokeInteractable);
      }
    });
  }

  private refresh() {
    const { w } = this.board;
    // mirror orientation: '/' and '\' as ±45° around Y (board seen from above)
    this.mirrorMeshes.forEach((glass, i) => {
      const c = this.board.cells[i];
      if (c.kind === 'mirror') glass.rotation.y = c.slash ? Math.PI / 4 : -Math.PI / 4;
    });

    const result = trace(this.board);
    this.beams.forEach((b) => (b.visible = false));
    result.segments.forEach((s, k) => {
      let beam = this.beams[k];
      if (!beam) {
        beam = new Mesh(new BoxGeometry(1, 1, 1), this.beamMat);
        this.root.add(beam);
        this.beams.push(beam);
      }
      const a = this.cellPos(s.x0, s.y0);
      const b = this.cellPos(s.x1, s.y1);
      const len = Math.hypot(b.px - a.px, b.pz - a.pz);
      beam.visible = len > 0;
      beam.position.set((a.px + b.px) / 2, CELL * 0.25, (a.pz + b.pz) / 2);
      beam.scale.set(Math.abs(b.px - a.px) + 0.006, 0.006, Math.abs(b.pz - a.pz) + 0.006);
    });
    this.targetMeshes.forEach((m, i) => {
      m.material = result.litTargets.includes(i) ? this.targetOn : this.targetOff;
    });

    if (result.solved) {
      this.progress = recordSolve(this.progress, this.today);
      saveProgress(this.progress);
    }
    this.updateHud(result.solved, w);
  }

  private buildHud() {
    if (typeof document === 'undefined') return;
    this.hud = document.createElement('div');
    this.hud.style.cssText =
      'position:fixed;left:12px;bottom:12px;padding:8px 12px;border-radius:8px;' +
      'background:rgba(10,14,24,.75);color:#e8f1ff;font:14px system-ui;pointer-events:none;z-index:10';
    document.body.appendChild(this.hud);
  }

  private updateHud(solved: boolean, _w: number) {
    if (!this.hud) return;
    const streak = currentStreak(this.progress, this.today);
    this.hud.textContent =
      `Prism Desk · ${this.today} · ${solved ? 'SOLVED ✨' : 'pinch a mirror to rotate it'}` +
      ` · streak ${streak} · garden ${gardenSize(this.progress)}`;
  }
}

function loadProgress(): Progress {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Progress) : { solvedDays: [] };
  } catch {
    return { solvedDays: [] };
  }
}

function saveProgress(p: Progress) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode) — progress is session-only */
  }
}
