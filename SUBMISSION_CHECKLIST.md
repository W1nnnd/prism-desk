# Submission checklist — Meta VR Start Developer Competition 2026

Deadline: **Nov 19, 2026 04:00 SGT** (Nov 18 12:00 PM PT). Internal freeze: Nov 17.
Source: https://start-developer-competition-26.devpost.com/ and /rules

Legend: 🤖 = assistant (box) · 👤 = user only · ✅ done

## Eligibility & accounts (👤 only — assistant must not register or sign up)
- [ ] 👤 Decide whether to enter.
- [ ] 👤 18+ and resident of an eligible country (excluded: Brazil, Quebec, sanctioned regions). Singapore is not excluded.
- [ ] 👤 Meta account with **Developer Access** enabled (Meta VR Developer Dashboard).
- [ ] 👤 Apply to / join the **Meta VR Start program** (≈5 min form) — required *before* submitting.
- [ ] 👤 Devpost account → click **Join Hackathon** on the contest page.
- [ ] 👤 Confirm the project has no Meta funding (rules §4.11) and no conflicting employment/contract.

## Build (🤖)
- [x] 🤖 IWSDK (WebXR) project scaffolded, puzzle core + unit tests, `npm run check` passes.
- [x] 🤖 Hands-first end-to-end (no controller ever needed) — verified in IWER hand mode (poke, pinch-ray, dwell).
- [x] 🤖 Seated / 2-ft radius; essential UI in narrow FoV (~30° board); fast cold start; pause/resume on blur.
- [x] 🤖 Purposeful passthrough + scene understanding (table placement, real objects → blockers, missed beam spills onto real walls) + persistent spatial anchor for board & garden (verified restore in IWER).
- [x] 🤖 English-only UI; no brands/logos; no identifiable people; licences in CREDITS.md.
- [x] 🤖 Perf budget: ~50 draw calls / < 20k tris in XR (emulator stats). [ ] 👤 confirm fps on a real Quest.
- [ ] 👤 (Strongly recommended) Real Meta Quest test of the hosted link — headset needed; or ask a friend/Start mentor.

## Hosting (needs 👤 approval before 🤖 does it — public action)
- [x] 👤 Approved (Oct 31): public repo W1nnnd/prism-desk + GitHub Pages.
- [x] 🤖 Deploy; HTTPS link (https://w1nnnd.github.io/prism-desk/, Actions → Pages; real-Quest check still 👤) works in Quest Browser; stays live until ~Dec 11 (winner announcement). No changes after deadline.

## Demo video (< 3:00)
- [x] 🤖 Script + storyboard; capture footage from IWER emulator (`demo/record_trailer.sh`) (allowed: "XR Simulator or another equivalent emulator").
- [ ] 👤 Optional headset capture (Quest casting/recording) — needs a physical headset.
- [x] 🤖 Edit video → `demo/prism_desk_trailer.mp4` (1:33, 1280×720, burned-in English captions + `demo/prism_desk_trailer.srt`, offline Piper TTS narration). Not committed to git.
- [x] 🤖 Public YouTube upload verified Nov 6: https://www.youtube.com/watch?v=ABOWM-r3Eow (风风 / @风风-t3m, published Nov 3).

## Devpost submission form (🤖 drafts, 👤 submits by hand)
- [x] 🤖 Name, 140-char tagline. → `docs/DEVPOST_SUBMISSION.md`
- [x] 🤖 Track: Gaming · Division: New Experience.
- [x] 🤖 Description ≤ ~500 words: inspiration, how built, future plans, **target launch date**.
- [x] 🤖 Hand-interaction description + "what excites you about VR" (optional field).
- [x] 🤖 Screenshots / gallery images (6 × `docs/screenshots/devpost_*.jpg`).
- [x] 🤖 Testing instructions for judges (English).
- [ ] 👤 Team member names/emails/roles (if any).
- [ ] 👤 Paste hosted link + YouTube link, review, click **Submit** (must be a human — rules void bot/automated entries).
- [ ] 👤 Keep a copy of the entry (rules recommend retaining records).

## After submission
- [ ] 🤖 Monitor hosted link uptime until ~Dec 11 (no code changes after deadline).
- [ ] 👤 If shortlisted: winner documents, ID, bank details (user only).
