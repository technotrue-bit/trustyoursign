# iPhone first-path stability (F&F Phase D)

Stabilize the friends-and-family **first two minutes** on mid iPhone Safari: fly → claim sign → BirthChat → Open this natal → Sky land. Prefer **stability over cinema** — no zoom jumps, no sky shrinking under the keyboard, no chrome fighting the thumb.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Journey bar | First 2 minutes only (not Bones/Ask room density) |
| Device bar | Mid iPhone Safari first (~390×844) |
| Smoothness | Stability first; keep existing travel/slide systems |
| Approach | Path-only stabilize — no new mobile shell, no new animation library |

## Problem

The visitor natal path is wired for phones, but the invite demo still feels loose on iPhone:

1. **Safari input zoom** — any path control under 16px triggers page zoom and StageLock resize thrash.
2. **Keyboard shrinks the WebGL stage** — `StageLock` writes `visualViewport.height` into `--app-h` on every keyboard open; the sky jumps while BirthChat fields focus.
3. **Galaxy bottom chrome stack** — SignStrip + CTA + legal/cookie fight one thumb band above the home indicator.
4. **BirthChat first paint** — temple copy can bury date controls below the fold; plate lift can disagree between Station and SignDisk scale clamp.
5. **Breakpoint mismatch** — slide math uses 768; some CSS mobile rules use 720.
6. **Natal land** — Apple `SceneGate` black gap (~160ms) plus header/dock density can make “Open this natal” feel discontinuous.

Out of scope for this spec (follow-up): Bones two-axis scroll / card list, Ask room chrome density beyond shared 16px + keyboard policy, Android-first tuning, Framer Motion or new easing frameworks, research-desk mobile tour.

## Goal

A friend on mid iPhone Safari can, without coaching:

1. Skip/finish intro without the stage jumping.
2. Fly / swipe signs; thumb reaches **This is my sign** above the home indicator.
3. Complete BirthChat date → optional time/place without Safari zoom or the sky collapsing under the keyboard.
4. See the plate lift into the clear well with no disk/plate drift.
5. Tap **Open this natal** and land on Sky without a long black flash or overlapping chrome.

## Architecture

Five coordinated fixes on the existing path. No new shell.

```text
Intro / galaxy fly → Claim → BirthChat sheet → Cast → Open natal → Sky land
         │              │           │                              │
         ├─ chrome budget           ├─ 16px inputs                 ├─ shorter SceneGate
         ├─ StageLock (always)      ├─ StageLock keyboard freeze   └─ phone header/dock clear
         └─ overlay-hit trim        └─ lift scale sync + 768 CSS
```

### 1. StageLock keyboard policy

**File:** [`src/components/StageLock.tsx`](src/components/StageLock.tsx)

While a path text field or select is focused (BirthChat; shared helper usable later by Ask), **do not** write keyboard-shrunk `visualViewport.height` into `--app-h`. Continue updating width and `offsetTop` as today. The BirthChat sheet scrolls inside the fixed stage.

Implementation:

- Document-level `focusin` / `focusout` (capture) on `input, textarea, select` inside `.birth-chat`.
- When focused: freeze `--app-h` at the last non-keyboard height (capture `visualViewport.height` just before focus, or fall back to `window.innerHeight`).
- When focus leaves: resume normal `visualViewport` height sync.
- Dispatch `resize` only when width or unfrozen height actually changes (avoid thrash).

### 2. No iOS zoom on the path

**Files:** [`src/components/overlay/BirthChat.tsx`](src/components/overlay/BirthChat.tsx), [`src/styles.css`](src/styles.css)

- Add `.path-field` for BirthChat `input` / `select` / `textarea`: `font-size: 16px`, `min-height: 48px`.
- Audit fly→cast path; any remaining `text-sm` controls on that path become `.path-field` on phone.

### 3. Galaxy bottom chrome budget

**Files:** [`src/components/overlay/VaultApp.tsx`](src/components/overlay/VaultApp.tsx) (`GalaxyCopy`), [`src/components/overlay/SignStrip.tsx`](src/components/overlay/SignStrip.tsx), [`src/components/overlay/LegalFooter.tsx`](src/components/overlay/LegalFooter.tsx), [`src/styles.css`](src/styles.css)

- One thumb band: SignStrip + short hint + **This is my sign**, all clear of `--safe-bottom`.
- Legal/cookie on galaxy: render as a single compact dismissible row **above** the strip band (not stacked under the CTA). First visit must leave the CTA fully tappable.
- `--overlay-hit`: change the phone media query from `max-width: 720px` to `max-width: 767px` (align with 768). Cap `--overlay-hit` at `2.75rem` on real Safari; if `PreviewHostBridge` / preview query already marks the document as preview-hosted, keep the larger inset only in that case.
- Title / Skip / Auth: one top row; no second competing CTA in the first viewport.

### 4. BirthChat content + lift correctness

**Files:** [`src/components/overlay/BirthChat.tsx`](src/components/overlay/BirthChat.tsx), [`src/lib/galaxy/birthchat-slide.ts`](src/lib/galaxy/birthchat-slide.ts), [`src/components/scene/GalaxyIntro.tsx`](src/components/scene/GalaxyIntro.tsx), [`src/styles.css`](src/styles.css)

- Phone first paint (`max-width: 767px`): show essence + **2** temple lines above the date form; remaining lines stay in the scrollable sheet below. Chakra note moves below the form or into scroll.
- Sheet scrolls inside the stage; keyboard does not resize the canvas (see §1).
- **SignDisk** passes the same lerped `scaleBoost` into clamp math as **Station** (today SignDisk uses hard `1.4` while Station uses lerped scale — drift source).
- Unify phone breakpoint: CSS rules that affect BirthChat / strip / overlay-hit use **767px max** to match `PHONE_MAX_WIDTH = 768` and Tailwind `md`.
- Keep existing `lerpToward` rates (`rate: 2.2` for slide). Stability = no drift/teleport, not new easing curves.
- Cast → rest → **Open this natal** remains the single full-width primary action.

### 5. Open natal land

**Files:** [`src/components/scene/ChartCanvas.tsx`](src/components/scene/ChartCanvas.tsx) (`SceneGate`), [`src/components/overlay/VaultApp.tsx`](src/components/overlay/VaultApp.tsx) (`Chrome`)

- On Apple / modest GPU, cut `SceneGate` black-gap timeout from **160ms to 48ms** (same as desktop non-modest path).
- Visitor phone header: title + Auth; trust meta stays in the sheet, not a third header row.
- Dock (Sky · Body · Bones · Ask) already correct; ensure first Sky frame is not covered by overlapping absolute chrome.

### Error / fallback

WebGL lost → existing FallbackSky. Path copy and CTA remain usable. Plate lift into the well is best-effort on FallbackSky (documented limit; no new FallbackSky lift in this pass unless trivial).

## Animation policy

- Keep travel seek, BirthChat slide, and chrome CSS transitions already in the product.
- Do **not** add Framer Motion or new global easing systems.
- Fix wrong motion (keyboard resize, scale drift, long black gate) rather than adding more motion.
- `prefers-reduced-motion` may continue to reduce CSS chrome motion; R3F travel/slide stay as today unless a cheap gate already exists.

## Testing / acceptance

**Device bar:** mid iPhone Safari, ~390×844 (optional ~430).

**Must pass:**

1. Cold open → intro/skip → no stage jump.
2. Fly / swipe → **This is my sign** tappable above home indicator; cookie not blocking CTA.
3. BirthChat: date controls visible; focus month/day/year/place → no Safari zoom; sky does not shrink.
4. Claim → plate lift into clear well; no disk/plate drift.
5. Time+place → cast → **Open this natal** → Sky without long black flash or overlapping chrome.
6. No new uncaught console errors on this path.

**Automated:**

- Unit: SignDisk/Station shared scale clamp; StageLock height freeze while focused (extract pure helpers where needed).
- Playwright (or equivalent) 390×844 screenshots: claim → BirthChat → cast → Sky.

## Non-goals

- Bones mobile card redesign.
- Ask room density / guest Ask UX beyond shared keyboard + 16px.
- Android-first performance pass (nearSky budgets may get a light Apple trim only if it blocks the path).
- New animation framework.
- Changing tropical / calendar sign order rules.

## Primary files

| Area | Path |
| --- | --- |
| Stage lock | `src/components/StageLock.tsx` |
| Styles / overlay-hit / breakpoints | `src/styles.css` |
| Galaxy chrome | `src/components/overlay/VaultApp.tsx`, `SignStrip.tsx`, `LegalFooter.tsx` |
| BirthChat | `src/components/overlay/BirthChat.tsx` |
| Lift math | `src/lib/galaxy/birthchat-slide.ts`, `src/components/scene/GalaxyIntro.tsx` |
| Natal land | `src/components/scene/ChartCanvas.tsx` |
