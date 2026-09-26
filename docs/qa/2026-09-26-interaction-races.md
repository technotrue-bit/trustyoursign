# Interaction races — 2026-09-26

Pre-beta pass for button-mashing, double-tap, and browser Back on a phone-sized viewport. Unit tests do not drive the gesture layer, so this was done in a real browser against the dev server.

Flight regression video (shot on the plate-cut tree, before any further `GalaxyIntro.tsx` / `travel.ts` edit) lives on the first-load branch:

`docs/qa/flight-sequence-2026-09-26/` (`flight.mp4` plus `01-ask.jpg` … `09-after-back.jpg`).

This note does not change those two files. The fixes below are history and the birth sheet.

## Setup

- Dev server, storage cleared, iPhone user agent, touch
- Viewports: 390×844 and a spot check at 430×932
- No page errors and no console errors on these passes
- Software WebGL in this lab. A dark frame right after Skip is the enter veil (about 1.1s), not a failed context
- Back from inside was polled for 4 seconds. The leave animation is 1.55s, so a sample under that is still mid-exit

## What held

| Case | 390×844 | 430×932 |
| --- | --- | --- |
| Mash the Leo belt button 6 times | Lands on Leo. No error | — |
| Mash Enter this sign, then Skip | One inside URL, history length 3, phase inside. No stacked dives | Double-tap Enter also one inside URL |
| Mash Begin birth chart | One sheet. The button hides after the first click, so later clicks do not land | — |
| Mash Pause 8 times | Ends on Pause (even count). No error | — |
| Single tap Keep flying | Sheet closes. Still inside the galaxy | — |
| Browser Back from inside Leo, no sheet | URL drops `galaxy=true` immediately. Phase is `exiting` until about 1.7s, then `idle`, Back unmounts, belt returns | Same, idle by about 1.7s |
| Browser Back during the enter dive (phase `fading`, URL already `galaxy=true`) | Leave starts at once and phase is `idle` again within about 0.3s. Belt is back. Not stuck | — |
| Double-tap a belt sign | — | Taurus lands on `/?sign=taurus` |

Browser Back during the ask veil leaves the site. History length is 2 (the browser’s blank page, then the app). The app has not pushed an in-app entry yet, so Back is the browser leaving. Not a product bug.

`09-after-back.jpg` in the flight folder was taken at about 0.9s, while phase was still `exiting`. That matches the 1.55s leave. It is not evidence that Back sticks.

## What broke, and the fix

### Back while the birth sheet is open

Reproduced at 390×844 (Leo) and 430×932 (Taurus).

1. Enter the sign, open Begin birth chart.
2. Browser Back.
3. The URL becomes `/?sign=leo` (or taurus) and the galaxy exits.
4. After phase returns to `idle` (about 1.7s), the dialog is still open (`Leo.` / `Taurus.`), Back is still on screen, and Enter this sign is not.

The birth sheet is not a history entry. Back only pops the galaxy URL, and the sheet used to stay over the belt.

Fix: when history leaves an open galaxy and a guest claim is up, close that claim the same way Keep flying does (including the guest draft). A claim restored on the belt, with no galaxy explore in progress, is left alone. A signed-in session is left alone.

Rechecked after the fix. At 390×844, Back from the Leo sheet settles by about 1.7s on `/?sign=leo`, phase idle, dialog gone, belt back. At 430×932 the same pass settles on `/?sign=taurus` with the sheet gone.

### Double-tap Keep flying

A single tap closes the sheet. A second tap about 40ms later hits **Begin birth chart**, which appears in the same place the moment the sheet unmounts, and the sheet opens again. Click log: `KEEP FLYING`, then `BEGIN BIRTH CHART`.

Fix: `openClaim` ignores a reopen for 450ms after a real close. Programmatic opens are covered by the same guard; tests clear it between cases. A deliberate second open after that beat still works. The Begin birth chart button itself was not edited, so this stays clear of the accessibility pass on that file.

Rechecked: a 40ms double-tap on Keep flying leaves the sheet closed and the phase inside. A later single tap on Begin birth chart opens it again.

## How to recheck on a phone

1. Skip the ask, fly to a sign, Enter, Skip the dive.
2. Browser Back. Within about two seconds you should be on the belt for that sign, with no Back button left over.
3. Enter again, Begin birth chart, then browser Back. The sheet should leave with the galaxy, not sit on the belt after the exit.
4. Begin birth chart, tap Keep flying once. The sheet closes and you stay inside. A quick second tap should not reopen it.
