# Flight sequence baseline — 2026-09-26

Regression record of the current corridor flight. Captured **before any further edit** to `src/components/scene/GalaxyIntro.tsx` or `src/lib/galaxy/travel.ts` for the interaction-race / first-load follow-up.

This is not a feeling. It is a 20 second recording plus the stills below, taken on the dev server while that tree was `cursor/mobile-first-load-cuts-ea98` at `ad98bee` (first-load plate cut already in, flight code otherwise unchanged).

Pre-cut stills from `b9261cf` stay in `docs/reviews/galaxy-intro-reference-2026-09-26/` on the mobile QA branch.

## How it was shot

- Viewport 390×844, iPhone Safari user agent, touch, storage cleared
- Real pointer: Skip, then a downward drag that settled on Gemini, then a second drag that settled on Leo, then Enter this sign, Skip on the dive, then browser Back
- Software WebGL in this lab (llvmpipe). A dark first moment after Skip is the enter veil, not a stuck sky

## What the frames are

| File | What is on screen |
| --- | --- |
| `flight.mp4` | The whole pass, about 20s, 390×844 |
| `01-ask.jpg` | Ask veil, before Skip |
| `02-belt.jpg` | After Skip. Belt at “what’s your sign?”, phase idle |
| `03-fly-mid.jpg` | Drag in progress |
| `04-fly-settled.jpg` | Settled on Gemini (`/?sign=gemini`, t ≈ 0.182, velocity 0) |
| `05-second-sign.jpg` | Second drag |
| `06-leo.jpg` | Settled on Leo (`/?sign=leo`, t ≈ 0.364) |
| `07-dive.jpg` | Enter dive |
| `08-inside.jpg` | Inside Leo (`/?sign=leo&galaxy=true`, phase inside) |
| `09-after-back.jpg` | About 0.9s after browser Back. Phase is still **exiting** (the leave runs 1.55s). A later poll on the same build reached phase idle with the belt back at about 1.7s. This frame is mid-exit, not a stuck Back button |

## Do not

- Reorder this sequence to match a calendar strip. Sky math stays Aries-first.
- Treat `09-after-back.jpg` as the settled result of Back. Wait out the exit before calling Back broken.
