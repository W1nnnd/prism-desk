# Prism Desk: Devpost submission draft

> Draft for the **Meta VR Start Developer Competition 2026** form. The entrant (风风) must register, confirm Meta VR Start membership and submit this manually. Nothing here has been submitted.

## Project name
**Prism Desk**

## Tagline (≤ 140 characters)
> Bend light across your real desk: three fresh hand-tracked mixed reality puzzles every day, made for seated, one-handed play.

## Track / Division
- **Track:** Gaming
- **Division:** New Experience (all code written after Sep 24, 2026; first commit Oct 31, 2026)

## Links
- **Play (hosted WebXR, HTTPS):** https://w1nnnd.github.io/prism-desk/
- **Source code (MIT):** https://github.com/W1nnnd/prism-desk
- **Demo video (< 3 min):** *upload `demo/prism_desk_trailer.mp4` to YouTube or Vimeo as Public or Unlisted-public, attach `demo/prism_desk_trailer.srt` as English captions, then paste the link here.*

## Description (~500 words)

**Inspiration.** Most mixed reality games ask you to clear a room and stand up. But most of the time people spend near their Quest, they're sitting at a desk or a table. We wanted a game you can play in two minutes with a coffee in your other hand. It should turn the table you already have into something magical and give you a reason to come back tomorrow. Daily word puzzles showed how a small, shared challenge each day becomes a habit. Prism Desk brings that ritual into mixed reality with light, mirrors and your real room.

**What it is.** Each day brings three new light-routing puzzles. A small board appears on your real table, about two feet in front of you. Turn the mirrors so the beam lights every crystal. Puzzles are generated from the date, so everyone plays the same set. A solver checks each one before you see it; we tested a full year of days. Finish the day and a crystal grows in your garden beside the board, and your streak goes up. If the beam misses, the light doesn't stop at the edge of the board: it spills into your room and lands on your real wall. Real objects detected near the board block cells, so your room shapes the puzzle.

**Hands first.** You never need a controller:
- Touch a mirror with your fingertip, or pinch from a distance with the hand ray.
- Gaze and pinch works on headsets with eye tracking.
- *Dwell mode* selects a mirror when you hold your aim, so no pinch is needed.
- A one-hand dock can swap to either side.
- *High contrast* mode helps players with low vision.

Onboarding is two short steps, not a wall of text: "Pinch the glowing mirror", then a pinch-ray lesson.

**How we built it.** Prism Desk uses Meta's **Immersive Web SDK** (IWSDK 1.1, three.js, ECS) as an `immersive-ar` passthrough session in Meta Quest Browser:
- **Board placement:** plane and mesh detection find a table in the seated reach band.
- **Persistent spatial anchors:** they bring the board and garden back to the same desk across sessions, with automatic placement as the fallback.
- **Spill effect:** a raycast against detected surfaces runs only when the beam changes, never every frame.
- **Puzzle logic:** the core (beam tracing, seeded generator, solver, streaks) is engine-free TypeScript with 23 Vitest tests.
- **Performance:** all geometry is instanced and generated in code, with no third-party assets: about 50 draw calls and under 20k triangles.
- **Testing:** we scripted every interaction (poke, pinch-ray, dwell, anchors, placement) in the IWER Quest 3 emulator.
- **Hosting:** GitHub Pages, built by CI.

**Challenges.** WebXR anchors must be created inside the XR frame callback, so placement is scheduled for the next frame. Fitting the board into a narrow seated field of view took several passes on distance and tilt.

**What's next.**
- Weekly "spectrum" puzzles with coloured beams and splitters.
- Shared daily scores with friends.
- Bonus levels that use your real walls as mirrors.
- Spatial audio and haptics polish.
- A packaged Quest app built from the same code.

**Target launch date.** The web version is live and playable now. Target for the public v1.0 launch, with weekly puzzles and score sharing: **December 15, 2026**. A Meta Horizon Store build is targeted for **Q1 2027**.

## Hand interaction (how to play with hands)
- **Poke:** touch a glowing mirror tile with your index fingertip to rotate it 90°.
- **Pinch-ray:** point an open hand at a mirror (a ray appears), then pinch thumb and index to rotate it. Either hand works.
- **Gaze + pinch:** on headsets with eye tracking, look at a mirror and pinch.
- **Dwell (no pinch):** press **DWELL** on the dock, then hold the ray on a mirror for about 1 second.
- **Dock buttons:** poke or pinch **HINT** (ring on the next mirror), **RESET**, **CONTRAST** (high contrast palette), **DWELL**, and **SWAP SIDE** (moves the dock to the other hand's side).
- **Recenter:** use the Quest system recenter gesture and the board re-places on the nearest table.

## Testing instructions for judges
1. Put on a Meta Quest 3 or 3S (recommended; needs Space Setup / room scan for table detection). Sit at a desk or table, with hand tracking enabled (controllers set down).
2. Open **Meta Quest Browser** and go to **https://w1nnnd.github.io/prism-desk/**
3. Press **Enter XR** and allow the requested permissions (spatial data / room setup) when prompted. Passthrough starts and the board appears on the table in front of you, within reach. If no table is detected, it appears at a comfortable seated height.
4. Follow the two-step tutorial: touch the mirror with the glowing ring, then pinch a mirror from a distance.
5. Play today's three puzzles. When the beam misses, look where the light lands on your wall. After puzzle 3 a crystal grows in your garden and your streak goes up.
6. Try **CONTRAST**, **DWELL** and **SWAP SIDE** on the dock. Exit and re-enter (or reload): the board returns to the same spot on your desk via a persistent anchor.
7. No headset? The same URL opens a desktop preview in any browser: click mirrors; keys H / R / C / D / S = hint, reset, contrast, dwell, swap.

Notes: progress is stored locally on the device (no account, no network calls beyond loading the page). Puzzles change at local midnight.

## Screenshots (upload these 6, in order)
| # | File | Caption |
|---|------|---------|
| 1 | `docs/screenshots/devpost_1_touch_first_mirror.jpg` | First minute: touch the glowing mirror. |
| 2 | `docs/screenshots/devpost_2_pinch_ray.jpg` | Pinch-ray from a distance. |
| 3 | `docs/screenshots/devpost_3_daily_puzzle_2of3.jpg` | Today's puzzle 2 of 3, on the real table. |
| 4 | `docs/screenshots/devpost_4_beam_spills_to_wall.jpg` | A missed beam spills onto the real wall. |
| 5 | `docs/screenshots/devpost_5_high_contrast.jpg` | High contrast mode and the one-hand dock. |
| 6 | `docs/screenshots/devpost_6_garden_demo_save_22.jpg` | Crystal garden after 22 days (demo save, desktop preview). |

All footage and screenshots come from the Meta Quest 3 emulator (IWER) with its synthetic living-room environment. They contain no people and no third-party logos.

## Built with
`webxr` · `immersive-web-sdk` · `three.js` · `typescript` · `vite` · `vitest` · `github-pages` · `piper-tts` (trailer narration)
