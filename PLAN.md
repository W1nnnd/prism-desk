# Prism Desk — Meta VR Start Developer Competition 2026 plan

**Competition:** Meta VR Start Developer Competition 2026 — https://start-developer-competition-26.devpost.com/
**Rules:** https://start-developer-competition-26.devpost.com/rules
**Deadline:** Nov 18, 2026 12:00 PM PT = **Nov 19, 2026 04:00 SGT** (internal target: Nov 17 23:59 SGT)
**Target:** Track = **Gaming**, Division = **New Experience** (Best New Gaming: $100k / runner-up $50k).
Special awards we deliberately design for: **Best Reason to Come Back**, **Best First Five Minutes**,
**Best Accessibility Forward Experience** ($25k each). Judge's Choice ($20k ×2) as a fallback.

## 1. Concept (one line)
*Prism Desk* — a daily, hands-first mixed-reality light puzzle that lives on **your real desk or tray table**:
pinch to rotate mirrors, bend a beam of light around real objects to wake a crystal; every solve grows a
persistent crystal garden anchored next to you.

## 2. Pain point / player moment
- VR sessions are long and setup-heavy; the "bus stop / airplane seat" moment has almost no good content.
- Puzzle fans have a daily ritual on phones (Wordle, NYT games) but nothing that uses **space and hands**.
- Prism Desk = a 2–5 minute daily ritual, seated, no controllers, works in a 2 ft radius.

## 3. Why it can win — mapped to the 4 equally weighted criteria (25% each)
| Criterion | How Prism Desk scores |
|---|---|
| Innovation & Creativity | Light bends around *your* room: detected planes/meshes (scene understanding) become walls the beam must route around → each room produces a slightly different board. Beam can bounce off a real wall plane for a "trick shot". Daily seeded puzzle = shared global puzzle like Wordle. |
| Experience Design | Seated, ~36 cm board, all UI inside a narrow central FoV cone (works on both Quest and Meta VR Glasses). 20-second wordless onboarding: first puzzle is 1 mirror, the hand ghost shows the pinch. Passthrough is purposeful (real table = game surface, real objects = obstacles). Pause/resume instant (state is one tiny JSON). |
| Technical Implementation | IWSDK (Meta's official WebXR SDK): hand tracking, pinch-ray + direct poke, gaze+pinch, plane detection, hit-test, persistent anchors, mesh detection. Pure, unit-tested puzzle core (deterministic generator guaranteed solvable). Budget: < 50k tris, 1 draw-call per beam pool → 72 fps target on Quest 3. |
| Polish & Presentation | Cohesive "glass and light" art direction, spatial audio chimes tuned to each bounce (a beam becomes a short melody), clean 2:30 trailer with real emulator/headset capture. |

Special-award hooks: daily streak + garden (Come Back); payoff in < 60 s (First Five Minutes);
one-hand mode, gaze+pinch mode, high-contrast/colour-blind palette, voice-free and text-free play (Accessibility).

## 4. Rule-critical constraints (from official rules)
- Hands-first: must be completable end-to-end without ever pairing a controller. ✅ by design.
- Original, not a wrapper: no third-party service in the core loop (no LLM required). ✅
- English only (UI/video/description). No logos/brands, no identifiable people other than entrants.
- IWSDK/WebXR entries submit a **hosted link** (GitHub Pages, Vercel, etc.) that stays live until winners (~Dec 11).
- Video < 3 min, public on YouTube/Vimeo, footage on Quest **or XR Simulator/emulator** (IWER is acceptable).
- Built entirely within the window (after Sep 24, 2026) → New Experience division. ✅ repo starts Oct 31.

## 5. Architecture
```
app/
  src/game/beam.ts      pure puzzle core: grid, mirrors, reflection, trace(), toggleMirror()
  src/game/daily.ts     deterministic daily generator (seeded by date) — always solvable, starts unsolved
  src/game/progress.ts  streak + garden progression (localStorage now; anchors later)
  src/prism.ts          IWSDK ECS system: renders board, beam pool, targets; hands-first input
  src/index.ts          World.create(...) + system registration
  iwsdk.config.json     XR mode=AR (passthrough), handTracking, anchors, planeDetection, meshDetection, hitTest
  tests/                vitest unit tests for the core
  scripts/smoke.mjs     headless Chrome + IWER emulator smoke test + screenshot
```
Runtime: IWSDK 1.1.0-rc.2 (three.js "super-three" 0.185, elics ECS, pmndrs uikit), Vite 7, TypeScript.
Dev/test without a headset: IWSDK dev plugin injects **IWER** (Immersive Web Emulation Runtime) emulating a
Quest 3 + synthetic environment (`sunlit_living_room`) incl. planes/meshes for scene-understanding testing.

## 6. Tech stack
TypeScript · IWSDK (`@iwsdk/core`) · three.js · Vite · Vitest · Playwright-core (smoke) · GitHub Pages/Vercel (host, *after user approval*).

## 7. Milestones (all SGT)
| Date | Milestone |
|---|---|
| Oct 31 | ✅ M0 skeleton · ✅ M1–M5 core (template removed, daily loop, poke/pinch/gaze/dwell input, table placement + room blockers, onboarding, garden/streak, high contrast, perf budget) — verified in IWER |
| Nov 2 | M1 clean scene (remove starter robot/plinths), hand pinch + poke verified in IWER, sounds, win FX |
| Nov 4 | M2 MR placement: hit-test/plane detection → place board on a real table; persistent anchor; fallback fixed pose |
| Nov 6 | M3 room-aware puzzles: detected meshes/planes become blockers; bounce off real wall plane |
| Nov 8 | M4 onboarding (wordless 3-step tutorial), daily streak + crystal garden, pause/resume |
| Nov 10 | M5 accessibility: one-hand mode, gaze+pinch, high-contrast palette, seated FoV audit; perf pass (60+ fps budget) |
| Nov 12 | M6 art/audio polish; 30-day puzzle bank QA (auto-tested solvable) |
| Nov 13 | **User decision point**: register + Start membership done? Approve public hosting + public repo |
| Nov 14 | Deploy to approved host; ideally user (or a friend) tests on a real Quest — fix device issues |
| Nov 15–16 | Record emulator footage (+ headset footage if available), edit < 3 min video, write Devpost text |
| Nov 17 | Final freeze; user uploads video publicly + submits on Devpost (buffer day) |
| Nov 19 04:00 | Hard deadline |

## 7b. Status (Oct 31)
Done: everything in M1–M5 except persistent spatial anchors for the garden, beam bouncing off real wall planes, and on-device perf validation.
Next: art/audio polish, garden anchors, trailer capture, Devpost copy, real-Quest test.

## 8. Risks
- **No physical headset**: judges score on Quest at ≥ 60 fps. Emulator can't prove device perf → keep geometry tiny,
  avoid post-processing; strongly recommend one real-device test (user/friend Quest, or Meta dev forum tester).
- **Eligibility**: user must be a Meta VR Start member + Meta account with Developer access before submitting.
- IWSDK is a 1.1.0 release candidate → pin versions in package-lock.
- `@meta-quest/metavr` (telemetry) has been removed from the project.
- Rules void entries "generated by a macro, bot, or other automated means" → the Devpost submission itself must be done by the user by hand.
