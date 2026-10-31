# Prism Desk (working title)

Hands-first, seated, mixed-reality daily light puzzle for Meta Quest / Meta VR Glasses, built with Meta's
Immersive Web SDK (WebXR). Entry candidate for the **Meta VR Start Developer Competition 2026**
(https://start-developer-competition-26.devpost.com/). Local only — not registered, published or submitted.

- `PLAN.md` — concept, judging-criteria mapping, architecture, milestones
- `SUBMISSION_CHECKLIST.md` — every requirement and who does it
- `app/` — the IWSDK project

## Run (no headset needed)
```bash
cd app
npm install
npm run dev:runtime      # https://localhost:8081 — IWER emulates a Quest 3 + living room
npm run check            # typecheck + unit tests + production build
npm run smoke            # (with dev server running) headless Chrome screenshot + error check
```
On a real Quest: open the hosted HTTPS URL in Quest Browser → Enter XR.
