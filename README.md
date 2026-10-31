# Prism Desk

**A daily, hands-first mixed-reality light puzzle that lives on your real desk.**
Pinch (or poke, or just look) to rotate mirrors, bend a beam of light to wake the crystal, and grow a
crystal garden one day at a time. Built for Meta Quest / Meta VR devices with Meta's Immersive Web SDK (WebXR).

- **Play:** https://w1nnnd.github.io/prism-desk/ — open in Meta Quest Browser → *Enter XR* (desktop browsers get a 3D preview with mouse input).
- Entry candidate for the Meta VR Start Developer Competition 2026 (Gaming · New Experience).

## How it plays
- **Seated, ~2 ft radius.** The board (30 cm) is placed on a real table found by plane detection, ~45 cm in front of you; with no table it floats at seated-table height. Quest *recenter* re-places it.
- **Your desk shapes the puzzle.** Real objects detected on the table (scene-understanding meshes) become blocked cells, and the daily puzzle is regenerated around them — still guaranteed solvable.
- **Daily loop.** Three date-seeded puzzles per day (same for everyone), a streak, and a persistent crystal garden that grows around the board (every 7th crystal is bigger).
- **First five minutes.** Two wordless-first tutorial boards (a glowing ring shows the mirror to pinch), payoff in under 30 seconds; idle for 25 s and a hint ring appears.
- **The light leaves the board.** A missed beam keeps going and lands as a glowing spot on your real wall (raycast against detected planes/meshes only when the beam changes).
- **It remembers your desk.** A persistent WebXR spatial anchor brings the board and garden back to the same spot across sessions/reloads; falls back to automatic table placement if anchors are unavailable.
- **Hands-first input.** Direct poke with a fingertip, pinch-ray from either hand, or gaze + pinch on devices with eye tracking. No controller needed at any point.
- **Accessibility.** DWELL mode (hover with gaze/ray for 1 s — no pinch at all), one-hand play with SWAP SIDE dock placement, HIGH CONTRAST palette (colour-blind-safe yellow/green/magenta), thicker beam in contrast mode, text-light UI.

## Tech
TypeScript · IWSDK 1.1 (three.js, ECS, WebXR hand tracking, plane/mesh detection, hit-test, anchors, gaze) · Vite · Vitest.
- `app/src/game/` — engine-free, unit-tested core: beam tracer, exhaustive solver, daily generator, session state machine, placement maths, progress storage.
- `app/src/prism.ts` — XR view/input system. Budget ≈ 30–56 draw calls, < 20k triangles, zero per-frame allocation, all geometry procedural (no asset downloads).

## Develop (no headset needed)
```bash
cd app
npm ci
npm run dev:runtime   # https://localhost:8081 with the IWER Quest 3 emulator + synthetic living room
npm run check         # typecheck + 23 unit tests + production build
```
IWER automation helpers used for verification live in `app/scripts/iwer/` (require `npx iwsdk dev up --allow-browser-automation`).
Screenshots from the emulator: `docs/screenshots/`. Devpost form draft: `docs/DEVPOST_SUBMISSION.md`.

Trailer pipeline (emulator footage + offline TTS): `demo/record_trailer.sh` (IWER storyboard capture, needs the dev server with `--allow-browser-automation`) then `demo/build_trailer.py` (ffmpeg edit, Piper narration, captions → `demo/prism_desk_trailer.mp4` + `.srt`).

See `PLAN.md` and `SUBMISSION_CHECKLIST.md`. Licence: MIT (see `LICENSE`, `CREDITS.md`).
