# GalaxyIntro / travel reference — 2026-09-26

Captured **before** any intro-asset or travel-code edits on this work order.
Source commit: `b9261cf` (main, Closed Beta v0.39).

These frames are the behavior to keep. Later plate, wallpaper, or fly-through
changes should be checked against them.

## How they were taken

Local dev server, desktop Chrome (headless) with WebGL. The GPU in this
environment is software (`llvmpipe`), so the sky is the real scene graph but
the first frames compile slower than a phone. iPhone user agent, touch, dark
scheme, motion allowed.

| Frame | Viewport | What it is |
|---|---|---|
| `01-ask-veil-lifting.jpg` | ~430×740 (Playwright iPhone 14 Pro Max layout viewport) | Opening line, “The Universe Asks You…”, veil still mostly closed. Skip is not the hero. |
| `02-title-emerging.jpg` | same | Veil lifting. Title “what’s your sign?” starts to read over the sky. |
| `03-intro-sky.jpg` | same | Sky visible: dark ground, nebula, no belt yet. |
| `04-belt-chrome-430.jpg` | same | Intro chrome in: version kicker, Pause, Skip, Sign in, title, cookie line, horizontal sign belt (Capricorn first on the calendar strip). |
| `05-844-mid-intro.jpg` | **390×844**, safe area top 59 / bottom 34 | Mid-intro on the requested phone size. |
| `06-844-late-intro.jpg` | 390×844 + safe area | Late intro, same session. |
| `07-844-belt.jpg` | 390×844 + safe area | After Skip (or after the intro finished). Title, “Pick your sign & Begin to explore”, cookie notice, sign belt. |
| `08-fly-aries-plate.jpg` | 390×664 device layout | After a vertical drag on the sky. Camera settles on **Aries**. Plate art is the wide gold painting in the corridor, name and date under the title. |
| `09-leo-selected.jpg` | 390×664 | Belt tap on Leo. Name swap, “Enter this sign” is the claim into the galaxy (not BirthChat). |
| `10-inside-leo.jpg` | 390×844 + safe area | After Enter, then Skip on the dive (the black veil lasts about a second: 0.42s out, 0.2s hold, 0.48s in). Inside Leo: Back, sign name, Sign in, home-star copy, “Begin birth chart”. |
| `11-birthchat.jpg` | 390×844 | BirthChat sheet. Copy at this commit is “When did you arrive?” — not a separate “claim” screen. |
| `12-birthchat-deeper.jpg` | 390×844 | Clock and place step. Primary action is “Hold this natal”. |
| `13-sky-natal.jpg` | 390×664 | Sky after a successful deeper cast. “Hold this natal” opens the natal directly (`openSession`). The sun-only rest step’s button is “Open your sky”, not “Open this natal”. |
| `14-932-belt.jpg` / `15-932-birthchat.jpg` | **430×932** + safe area | Same belt and BirthChat on the larger phone. |

## Expected motion and chrome

- Cold visit with `templeIntroSeen` unset: black room, the line “The Universe Asks You…”, then the sky gathers (Aries birth / assemble, about 6.8s after the ask hold). Skip appears once the ask has run ~0.4s, top-right, same slot as Pause.
- A tap on the sky during the intro skips it (`applyFlyDelta` / pointerdown). Skip and that tap both mark the intro seen.
- After the intro: italic title “what’s your sign?”, subline “Pick your sign & Begin to explore”, calendar-order belt (Capricorn → Sagittarius). Astrological index 0 is still Aries in the sky.
- Fly: finger down moves forward, finger up moves back. A settled station shows its plate painting, month, name, and essence. “Enter this sign” dives into that sign’s galaxy.
- Plate art on screen is the WebP (`/signs/<id>.webp`), drawn into a canvas texture (512×288 on a small / phone GPU, 1024×576 otherwise). The PNGs in `public/signs/` are not what the corridor requests.
- Life clips exist for Aries, Leo, and Aquarius only. Aries’ clip is allowed to start fetching about a second after the camera is aimed at Aries, which is the opening station — so it competes with first load. See the QA note for the measured bytes.
- Cookie line sits in the bottom stack above the belt until dismissed for the tab (`vaultCookieNotice`).

## What not to “optimize” without looking again

- Do not replace these plates with a different crop and assume the corridor still frames the figure. The hub UV is measured from the painting.
- Do not drop the ask veil, the Skip slot, or the belt order (calendar strip, Aries-first math).
- The inside-galaxy frame is after the skip veil has lifted. A shot taken during that ~1s black hold is the veil, not a stuck sky.
