/**
 * Prism Desk — XR view + input for the daily light puzzle.
 *
 * Draw-call budget (per eye): tiles 1 · walls 1 · room markers 1 · beam 1 · garden 1
 * · emitter 1 · target ≤2 · mirrors ≤2×6 · dock 2×5 · HUD 1 · rings 2  ≈ 35, < 15k triangles.
 * No per-frame allocation in update(); all geometry is shared and procedural.
 */
import {
  Box3,
  BoxGeometry,
  Color,
  createSystem,
  CylinderGeometry,
  Entity,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PokeInteractable,
  Pressed,
  Hovered,
  Quaternion,
  RayInteractable,
  RingGeometry,
  Vector3,
  VisibilityState,
  XRMesh,
  XRPlane,
} from '@iwsdk/core';
import { Board } from './game/beam.js';
import { dayKey, hashString } from './game/daily.js';
import { blockedCells, BoardPose, chooseBoardPose, SurfaceBox } from './game/placement.js';
import { currentStreak, gardenSize, loadProgress, Progress, saveProgress } from './game/progress.js';
import { GameEvent, GameSession } from './game/session.js';
import { Synth } from './view/audio.js';
import { Label } from './view/labels.js';
import { HIGH_CONTRAST, NORMAL, Palette } from './view/palette.js';

export const CELL = 0.05; // m — 6×6 board = 30 cm: fits an airplane tray, ~30° of FoV at seated reach
const DESKTOP_POSE: BoardPose = { x: 0, y: 0.78, z: -0.45, yaw: 0, surface: null };
const SOLVE_PAUSE = 1.5; // s between a solve and the next board
const IDLE_HINT = 25; // s without progress before the hint ring appears
const DWELL_TIME = 1.0; // s hover/gaze to select in dwell mode
const MAX_BEAM = 40;
const MAX_GARDEN = 60;

type Action = 'hint' | 'reset' | 'contrast' | 'dwell' | 'side';
interface Tag {
  cell?: number;
  action?: Action;
}

const BOX = new BoxGeometry(1, 1, 1);
const TILE = new BoxGeometry(CELL * 0.94, 0.004, CELL * 0.94);
const WALL = new BoxGeometry(CELL * 0.86, CELL * 0.7, CELL * 0.86);
const ROOM = new BoxGeometry(CELL * 0.92, 0.006, CELL * 0.92);
const PAD = new BoxGeometry(CELL * 0.96, 0.01, CELL * 0.96);
const GLASS = new BoxGeometry(CELL * 0.86, CELL * 0.55, 0.005);
const EMITTER = new CylinderGeometry(CELL * 0.28, CELL * 0.34, CELL * 0.55, 12);
const CRYSTAL = new OctahedronGeometry(CELL * 0.3, 0);
const RING = new RingGeometry(CELL * 0.42, CELL * 0.5, 24);
const BUTTON = new BoxGeometry(0.046, 0.01, 0.032);

export class PrismGameSystem extends createSystem({
  pressed: { required: [Pressed] },
  hovered: { required: [Hovered] },
  planes: { required: [XRPlane] },
  meshes: { required: [XRMesh] },
}) {
  private session!: GameSession;
  private progress!: Progress;
  private day = dayKey(new Date());
  private palette: Palette = NORMAL;
  private mats!: Record<keyof Omit<Palette, 'text' | 'textBg'>, MeshStandardMaterial>;
  private gardenMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: new Color(0x1a1a1a) });

  private root = new Group();
  private rootEntity!: Entity;
  private levelGroup = new Group();
  private levelEntities: Entity[] = [];
  private levelGroupEntity!: Entity;
  private dockEntity!: Entity;
  private mirrorGlass = new Map<number, Mesh>();
  private targets = new Map<number, Mesh>();
  private beam!: InstancedMesh;
  private garden!: InstancedMesh;
  private hintRing!: Mesh;
  private dwellRing!: Mesh;
  private hud!: Label;
  private dock = new Group();
  private buttons = new Map<Action, { pad: Mesh; label: Label }>();
  private domHud?: HTMLDivElement;
  private synth = new Synth();

  private pose: BoardPose = DESKTOP_POSE;
  private immersive = false;
  private placeAt = -1; // time to (re)attempt table placement
  private placeTries = 0;
  private roomCells = 0;
  private now = 0;
  private solvedAt = -1;
  private lastMoveAt = 0;
  private hintUntil = -1;
  private hintCell: number | null = null;
  private dwellEntity: Entity | null = null;
  private dwellStart = 0;
  private dwellLock: Entity | null = null;
  private growStart = -1;
  private blurred = false;

  // temps (no per-frame allocation)
  private m4 = new Matrix4();
  private v = new Vector3();
  private v2 = new Vector3();
  private q = new Quaternion();
  private s = new Vector3();
  private box = new Box3();

  init(): void {
    this.progress = loadProgress(globalThis.localStorage);
    this.palette = this.progress.settings.highContrast ? HIGH_CONTRAST : NORMAL;
    this.mats = this.makeMats();
    this.session = new GameSession(this.day, this.progress);

    this.rootEntity = this.world.createTransformEntity(this.root);
    this.levelGroupEntity = this.world.createTransformEntity(this.levelGroup, { parent: this.rootEntity });
    this.dockEntity = this.world.createTransformEntity(this.dock, { parent: this.rootEntity });
    this.applyPose(DESKTOP_POSE);

    this.beam = new InstancedMesh(BOX, this.mats.beam, MAX_BEAM);
    this.beam.count = 0;
    this.beam.frustumCulled = false;
    this.root.add(this.beam);

    this.garden = new InstancedMesh(CRYSTAL, this.gardenMat, MAX_GARDEN);
    this.garden.frustumCulled = false;
    this.root.add(this.garden);

    this.hintRing = new Mesh(RING, this.mats.hint);
    this.hintRing.rotation.x = -Math.PI / 2;
    this.dwellRing = new Mesh(RING, this.mats.uiActive);
    this.dwellRing.rotation.x = -Math.PI / 2;
    this.root.add(this.hintRing, this.dwellRing);

    this.hud = new Label(0.28, 0.065, 768);
    this.hud.mesh.rotation.x = -0.55; // tilt toward a seated viewer looking down
    this.root.add(this.hud.mesh);

    this.buildDock();
    this.buildLevel();
    this.buildGarden();
    this.buildDomHud();
    this.refresh();

    this.queries.pressed.subscribe('qualify', (e: Entity) => this.activate(e));
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe((state) => {
        const wasImmersive = this.immersive;
        this.immersive = state !== VisibilityState.NonImmersive;
        this.blurred = state === VisibilityState.VisibleBlurred;
        if (this.immersive && !wasImmersive) {
          this.placeTries = 0;
          this.placeAt = this.now + 0.3; // let the head pose settle one frame
          // Quest "recenter" (hold Meta button / long-pinch) fires a reference-space reset → re-place the board.
          const ref = this.world.renderer.xr.getReferenceSpace();
          ref?.addEventListener('reset', () => {
            this.placeTries = 0;
            this.placeAt = this.now + 0.1;
          });
        }
        if (!this.immersive && wasImmersive) this.applyPose(DESKTOP_POSE);
      }),
    );
    const unlock = () => this.synth.unlock();
    globalThis.addEventListener?.('pointerdown', unlock);
    globalThis.addEventListener?.('keydown', this.onKey);
    this.cleanupFuncs.push(() => {
      globalThis.removeEventListener?.('pointerdown', unlock);
      globalThis.removeEventListener?.('keydown', this.onKey);
    });
    // Debug/test hook for the headless smoke test (read-only snapshot + tap).
    (globalThis as Record<string, unknown>).__prism = {
      state: () => ({
        day: this.day,
        level: this.session.level.id,
        index: this.session.index,
        solved: this.session.solved,
        dayComplete: this.session.dayComplete,
        streak: currentStreak(this.progress, this.day),
        garden: gardenSize(this.progress),
        roomCells: this.roomCells,
        pose: { ...this.pose, surface: this.pose.surface ? this.pose.surface.label ?? 'surface' : null },
        settings: this.progress.settings,
        hint: this.session.hint(),
        surfaces: this.surfaces().map((b) => ({
          label: b.label,
          horizontal: b.horizontal,
          top: +b.max[1].toFixed(3),
          c: [+((b.max[0] + b.min[0]) / 2).toFixed(2), +((b.max[2] + b.min[2]) / 2).toFixed(2)],
          size: [+(b.max[0] - b.min[0]).toFixed(2), +(b.max[2] - b.min[2]).toFixed(2)],
        })),
        renderer: { calls: this.world.renderer.info.render.calls, triangles: this.world.renderer.info.render.triangles },
      }),
      tap: (cell: number) => this.handle(this.session.toggle(cell)),
      action: (a: Action) => this.doAction(a),
      place: () => this.placeInXR(),
      /** World position of a board cell (for driving emulated hands in tests). */
      cellWorld: (cell: number) => {
        const v = this.cellLocal(cell, new Vector3(), 0.012);
        return this.root.localToWorld(v).toArray();
      },
      /** Apply one hint move (used by the automated playthrough). */
      step: () => {
        const c = this.session.hint();
        if (c !== null) this.handle(this.session.toggle(c));
        return c;
      },
    };
  }

  // ---------- materials / palette ----------
  private makeMats() {
    const m = (emissive: number, extra: Partial<MeshStandardMaterial> = {}) =>
      Object.assign(new MeshStandardMaterial({ roughness: 0.45, metalness: 0.05, emissiveIntensity: emissive }), extra);
    const mats = {
      base: m(0),
      tile: m(0.05),
      wall: m(0.05),
      room: m(0.7, { transparent: true, opacity: 0.55, depthWrite: false } as Partial<MeshStandardMaterial>),
      emitter: m(1.0),
      beam: m(2.4),
      mirror: m(0.45, { roughness: 0.1, metalness: 0.3 } as Partial<MeshStandardMaterial>),
      pad: m(0.12),
      targetOff: m(0.25),
      targetOn: m(1.8),
      hint: m(1.6, { transparent: true, opacity: 0.9 } as Partial<MeshStandardMaterial>),
      ui: m(0.15),
      uiActive: m(0.8),
    };
    this.paint(mats);
    return mats;
  }

  private paint(mats = this.mats) {
    for (const k of Object.keys(mats) as (keyof typeof mats)[]) {
      const hex = this.palette[k] as number;
      mats[k].color.setHex(hex);
      mats[k].emissive.setHex(hex);
    }
  }

  // ---------- layout ----------
  private applyPose(p: BoardPose) {
    this.pose = p;
    this.root.position.set(p.x, p.y, p.z);
    this.root.rotation.set(0, p.yaw, 0);
  }

  private get half() {
    return (Math.max(this.session.board.w, this.session.board.h) * CELL) / 2;
  }

  private cellLocal(i: number, out: Vector3, y = 0) {
    const { w, h } = this.session.board;
    return out.set(((i % w) - (w - 1) / 2) * CELL, y, (Math.floor(i / w) - (h - 1) / 2) * CELL);
  }

  private clearLevel() {
    for (const e of this.levelEntities) {
      e.object3D?.removeFromParent();
      e.destroy();
    }
    this.levelEntities = [];
    for (const c of [...this.levelGroup.children]) {
      c.removeFromParent();
      if (c instanceof InstancedMesh) c.dispose();
    }
    this.mirrorGlass.clear();
    this.targets.clear();
  }

  private instanced(geo: BoxGeometry, mat: MeshStandardMaterial, cells: number[], y: number) {
    if (!cells.length) return;
    const im = new InstancedMesh(geo, mat, cells.length);
    cells.forEach((i, k) => {
      this.cellLocal(i, this.v, y);
      this.m4.makeTranslation(this.v.x, this.v.y, this.v.z);
      im.setMatrixAt(k, this.m4);
    });
    this.levelGroup.add(im);
  }

  private buildLevel() {
    this.clearLevel();
    const b: Board = this.session.board;
    const all = b.cells.map((_, i) => i);
    const base = new Mesh(BOX, this.mats.base);
    base.scale.set(b.w * CELL + 0.016, 0.008, b.h * CELL + 0.016);
    base.position.y = -0.004;
    this.levelGroup.add(base);
    this.instanced(TILE, this.mats.tile, all, 0.002);
    this.instanced(WALL, this.mats.wall, all.filter((i) => b.cells[i].kind === 'wall' && !(b.cells[i] as { room?: boolean }).room), CELL * 0.35);
    this.instanced(ROOM, this.mats.room, all.filter((i) => (b.cells[i] as { room?: boolean }).room), 0.006);

    b.cells.forEach((c, i) => {
      if (c.kind === 'emitter') {
        const m = new Mesh(EMITTER, this.mats.emitter);
        this.cellLocal(i, m.position, CELL * 0.28);
        this.levelGroup.add(m);
      } else if (c.kind === 'target') {
        const m = new Mesh(CRYSTAL, this.mats.targetOff);
        this.cellLocal(i, m.position, CELL * 0.45);
        m.scale.set(1, 1.6, 1);
        this.levelGroup.add(m);
        this.targets.set(i, m);
      } else if (c.kind === 'mirror') {
        const pad = new Mesh(PAD, this.mats.pad);
        this.cellLocal(i, pad.position, 0.006);
        pad.userData = { cell: i } satisfies Tag;
        const glass = new Mesh(GLASS, this.mats.mirror);
        glass.position.y = CELL * 0.3;
        glass.rotation.y = c.slash ? Math.PI / 4 : -Math.PI / 4;
        pad.add(glass);
        const e = this.world.createTransformEntity(pad, { parent: this.levelGroupEntity });
        e.addComponent(RayInteractable);
        e.addComponent(PokeInteractable);
        this.levelEntities.push(e);
        this.mirrorGlass.set(i, glass);
      }
    });

    const half = this.half;
    this.hud.mesh.position.set(0, 0.075, -half - 0.035);
    this.layoutDock();
    this.lastMoveAt = this.now;
    this.hintUntil = -1;
    this.solvedAt = -1;
  }

  private buildDock() {
    const defs: [Action, string][] = [
      ['hint', 'HINT'],
      ['reset', 'RESET'],
      ['contrast', 'CONTRAST'],
      ['dwell', 'DWELL'],
      ['side', 'SWAP SIDE'],
    ];
    defs.forEach(([action, text], k) => {
      const pad = new Mesh(BUTTON, this.mats.ui);
      pad.position.set(0, 0.005, (k - (defs.length - 1) / 2) * 0.042);
      pad.userData = { action } satisfies Tag;
      const label = new Label(0.044, 0.03, 256);
      label.mesh.rotation.x = -Math.PI / 2;
      label.mesh.position.y = 0.0062;
      pad.add(label.mesh);
      const e = this.world.createTransformEntity(pad, { parent: this.dockEntity });
      e.addComponent(RayInteractable);
      e.addComponent(PokeInteractable);
      this.buttons.set(action, { pad, label });
      label.set([text], this.palette.text, this.palette.textBg);
    });
  }

  private layoutDock() {
    const side = this.progress.settings.dockLeft ? -1 : 1;
    this.dock.position.set(side * (this.half + 0.045), 0, 0.02);
  }

  private buildGarden() {
    const n = Math.min(gardenSize(this.progress), MAX_GARDEN);
    const days = this.progress.solvedDays.slice(-n);
    const c = new Color();
    days.forEach((d, k) => {
      this.gardenMatrix(k, n, 1);
      this.garden.setMatrixAt(k, this.m4);
      c.setHSL((hashString(d) % 360) / 360, 0.75, 0.62);
      this.garden.setColorAt(k, c);
    });
    this.garden.count = n;
    this.garden.instanceMatrix.needsUpdate = true;
    if (this.garden.instanceColor) this.garden.instanceColor.needsUpdate = true;
  }

  /** Crystals grow in rings behind the board; every 7th (a full week) is larger. */
  private gardenMatrix(k: number, _n: number, grow: number) {
    const ring = Math.floor(k / 12);
    const slot = k % 12;
    const ang = -1.25 + (slot / 11) * 2.5 + (ring % 2) * 0.1;
    const r = this.half + 0.07 + ring * 0.035;
    const big = (k + 1) % 7 === 0 ? 1.6 : 1;
    const sc = big * grow * (0.8 + ((k * 37) % 10) / 25);
    this.v.set(Math.sin(ang) * r, CELL * 0.3 * sc * 1.8, -Math.cos(ang) * r);
    this.q.identity();
    this.s.set(sc * 0.7, sc * 1.8, sc * 0.7);
    this.m4.compose(this.v, this.q, this.s);
  }

  private buildDomHud() {
    if (typeof document === 'undefined') return;
    this.domHud = document.createElement('div');
    this.domHud.id = 'prism-hud';
    this.domHud.style.cssText =
      'position:fixed;left:12px;bottom:12px;padding:8px 12px;border-radius:8px;max-width:60vw;' +
      'background:rgba(10,14,24,.8);color:#e8f1ff;font:14px system-ui;pointer-events:none;z-index:10';
    document.body.appendChild(this.domHud);
  }

  // ---------- state → visuals ----------
  private refresh() {
    const r = this.session.result;
    const b = this.session.board;
    // beam
    let k = 0;
    for (const sg of r.segments) {
      if (k >= MAX_BEAM) break;
      const { w, h } = b;
      const ax = (sg.x0 - (w - 1) / 2) * CELL;
      const az = (sg.y0 - (h - 1) / 2) * CELL;
      const bx = (sg.x1 - (w - 1) / 2) * CELL;
      const bz = (sg.y1 - (h - 1) / 2) * CELL;
      const t = this.progress.settings.highContrast ? 0.009 : 0.006;
      this.v.set((ax + bx) / 2, CELL * 0.3, (az + bz) / 2);
      this.s.set(Math.abs(bx - ax) + t, t, Math.abs(bz - az) + t);
      this.q.identity();
      this.m4.compose(this.v, this.q, this.s);
      this.beam.setMatrixAt(k++, this.m4);
    }
    this.beam.count = k;
    this.beam.instanceMatrix.needsUpdate = true;
    // targets
    this.targets.forEach((m, i) => (m.material = r.litTargets.includes(i) ? this.mats.targetOn : this.mats.targetOff));
    // toggles
    const set = this.progress.settings;
    const active: Partial<Record<Action, boolean>> = { contrast: set.highContrast, dwell: set.dwell };
    this.buttons.forEach(({ pad, label }, a) => {
      pad.material = active[a] ? this.mats.uiActive : this.mats.ui;
      const txt = { hint: 'HINT', reset: 'RESET', contrast: 'CONTRAST', dwell: 'DWELL', side: 'SWAP SIDE' }[a];
      label.set([txt], active[a] && set.highContrast ? '#000000' : this.palette.text, active[a] ? 'rgba(0,0,0,0)' : this.palette.textBg);
    });
    this.updateHud();
  }

  private hudLines(): string[] {
    const s = this.session;
    const streak = currentStreak(this.progress, this.day);
    const garden = gardenSize(this.progress);
    if (s.dayComplete && s.solved)
      return ['Day complete!', `Streak ${streak} · Garden ${garden} · New puzzles tomorrow`];
    if (s.dayComplete) return ['Today is done', `Streak ${streak} · Garden ${garden} · Come back tomorrow`];
    if (s.solved) return ['Solved!', s.level.kind === 'tutorial' ? 'Nice — next one' : `Streak ${streak} · Garden ${garden}`];
    if (s.level.kind === 'tutorial')
      return [s.level.prompt, s.index === 0 ? 'Each pinch turns a mirror' : 'Light every crystal to finish'];
    const room = this.roomCells > 0 ? ' · Shaped by your desk' : '';
    return [s.level.prompt, `Streak ${streak} · Garden ${garden}${room}`];
  }

  private updateHud() {
    const lines = this.hudLines();
    this.hud.set(lines, this.palette.text, this.palette.textBg, this.progress.settings.highContrast ? '#ffffff' : undefined);
    if (this.domHud) this.domHud.textContent = `Prism Desk · ${this.day} · ${lines.join(' · ')}`;
  }

  // ---------- input ----------
  private activate(e: Entity) {
    const tag = e.object3D?.userData as Tag | undefined;
    if (!tag) return;
    this.synth.unlock();
    if (tag.cell != null) this.handle(this.session.toggle(tag.cell));
    else if (tag.action) this.doAction(tag.action);
  }

  private onKey = (ev: KeyboardEvent) => {
    const map: Record<string, Action> = { h: 'hint', r: 'reset', c: 'contrast', d: 'dwell', s: 'side' };
    const a = map[ev.key.toLowerCase()];
    if (a) this.doAction(a);
  };

  private doAction(a: Action) {
    this.synth.ui();
    const set = this.progress.settings;
    if (a === 'hint') {
      this.hintCell = this.session.hint();
      this.hintUntil = this.now + 5;
    } else if (a === 'reset') {
      this.session.reset();
      this.buildLevel();
    } else if (a === 'contrast') {
      set.highContrast = !set.highContrast;
      this.palette = set.highContrast ? HIGH_CONTRAST : NORMAL;
      this.paint();
    } else if (a === 'dwell') {
      set.dwell = !set.dwell;
    } else if (a === 'side') {
      set.dockLeft = !set.dockLeft;
      this.layoutDock();
    }
    this.session.progress = this.progress;
    saveProgress(globalThis.localStorage, this.progress);
    this.refresh();
  }

  private handle(events: GameEvent[]) {
    for (const ev of events) {
      if (ev.type === 'rotated') {
        this.synth.tick();
        this.lastMoveAt = this.now;
        this.hintUntil = -1;
      } else if (ev.type === 'solved') {
        this.solvedAt = this.now;
        this.synth.solve(this.session.result.segments.length);
      } else if (ev.type === 'dayComplete') {
        this.synth.day();
        this.growStart = this.now;
      }
    }
    if (events.length) {
      this.progress = this.session.progress;
      saveProgress(globalThis.localStorage, this.progress);
      if (events.some((e) => e.type === 'dayComplete')) this.buildGarden();
      this.refresh();
    }
  }

  // ---------- mixed reality placement ----------
  private surfaces(): SurfaceBox[] {
    const out: SurfaceBox[] = [];
    const push = (obj: Object3D | undefined, label: string, horizontal?: boolean) => {
      if (!obj) return;
      obj.updateWorldMatrix(true, true);
      this.box.setFromObject(obj);
      if (this.box.isEmpty()) return;
      out.push({ min: this.box.min.toArray(), max: this.box.max.toArray(), label, horizontal });
    };
    for (const e of this.queries.planes.entities) {
      const p = e.getValue(XRPlane, '_plane') as { orientation?: string; semanticLabel?: string } | undefined;
      push(e.object3D, p?.semanticLabel ?? '', p?.orientation === 'horizontal');
    }
    for (const e of this.queries.meshes.entities) {
      push(e.object3D, String(e.getValue(XRMesh, 'semanticLabel') ?? ''));
    }
    return out;
  }

  private placeInXR() {
    const head = this.player.head;
    head.getWorldPosition(this.v);
    head.getWorldQuaternion(this.q);
    this.v2.set(0, 0, -1).applyQuaternion(this.q);
    const surfaces = this.surfaces();
    const size = Math.max(this.session.board.w, this.session.board.h) * CELL + 0.1;
    const pose = chooseBoardPose(this.v.toArray(), this.v2.toArray(), surfaces, size);
    this.applyPose(pose);

    // Real objects on the table become blockers — only before the player has moved on today's board.
    const s = this.session;
    if (pose.surface && !s.dayComplete && s.level.kind === 'daily' && s.moves === 0) {
      const objects = surfaces;
      const blocked = (w: number, h: number) => blockedCells(pose, w, h, CELL, objects);
      const cur = blocked(s.board.w, s.board.h);
      if (cur.length) {
        this.session = new GameSession(this.day, this.progress, blocked);
        this.roomCells = cur.length;
        this.buildLevel();
        this.refresh();
      }
    }
    // Planes/meshes can arrive a moment after session start: retry while nothing was found.
    if (!pose.surface && this.placeTries < 3) this.placeAt = this.now + 1.5;
    else this.placeAt = -1;
    this.placeTries++;
    this.updateHud();
  }

  // ---------- frame ----------
  update(delta: number, time: number): void {
    this.now = time;
    if (this.placeAt > 0 && time >= this.placeAt && this.immersive) this.placeInXR();
    if (this.blurred) return; // paused (system UI / headset off): nothing animates

    // mirror rotation easing
    this.mirrorGlass.forEach((g, i) => {
      const c = this.session.board.cells[i];
      if (c.kind !== 'mirror') return;
      const target = c.slash ? Math.PI / 4 : -Math.PI / 4;
      g.rotation.y += (target - g.rotation.y) * Math.min(1, delta * 14);
    });

    // solved: pulse crystal, then advance
    if (this.solvedAt >= 0) {
      const t = time - this.solvedAt;
      const pulse = 1 + 0.25 * Math.sin(t * 10) * Math.exp(-t * 2);
      this.targets.forEach((m) => m.scale.set(pulse, 1.6 * pulse, pulse));
      if (t > SOLVE_PAUSE && !this.session.dayComplete && this.session.advance()) {
        this.buildLevel();
        this.refresh();
      }
    } else {
      const spin = time * 0.8;
      this.targets.forEach((m) => (m.rotation.y = spin));
    }

    // hint ring: always on the first tutorial board, on demand, or after idling
    const s = this.session;
    const showHint =
      !s.solved && !s.dayComplete && (s.level.id === 'tutorial-1' || time < this.hintUntil || time - this.lastMoveAt > IDLE_HINT);
    if (showHint && (this.hintCell === null || time >= this.hintUntil)) this.hintCell = s.hint();
    this.hintRing.visible = showHint && this.hintCell !== null;
    if (this.hintRing.visible) {
      this.cellLocal(this.hintCell!, this.hintRing.position, 0.013);
      const p = 1 + 0.12 * Math.sin(time * 5);
      this.hintRing.scale.set(p, p, p);
    }

    // dwell select (hands-free / one-hand): hover with gaze or ray for DWELL_TIME
    this.dwellRing.visible = false;
    if (this.progress.settings.dwell) {
      let hovered: Entity | null = null;
      for (const e of this.queries.hovered.entities) {
        if (e.object3D?.userData && ('cell' in e.object3D.userData || 'action' in e.object3D.userData)) {
          hovered = e;
          break;
        }
      }
      if (hovered !== this.dwellEntity) {
        this.dwellEntity = hovered;
        this.dwellStart = time;
        if (hovered !== this.dwellLock) this.dwellLock = null;
      }
      if (hovered && hovered !== this.dwellLock) {
        const p = Math.min(1, (time - this.dwellStart) / DWELL_TIME);
        hovered.object3D!.getWorldPosition(this.v);
        this.root.worldToLocal(this.v);
        this.dwellRing.position.set(this.v.x, this.v.y + 0.012, this.v.z);
        this.dwellRing.scale.setScalar(0.3 + 0.7 * p);
        this.dwellRing.visible = true;
        if (p >= 1) {
          this.dwellLock = hovered; // must look away before the same pad fires again
          this.activate(hovered);
        }
      }
    }

    // newest garden crystal grows in
    if (this.growStart >= 0) {
      const g = Math.min(1, (time - this.growStart) / 1.4);
      const n = this.garden.count;
      if (n > 0) {
        this.gardenMatrix(n - 1, n, 0.05 + 0.95 * (1 - Math.pow(1 - g, 3)));
        this.garden.setMatrixAt(n - 1, this.m4);
        this.garden.instanceMatrix.needsUpdate = true;
      }
      if (g >= 1) this.growStart = -1;
    }
  }
}
