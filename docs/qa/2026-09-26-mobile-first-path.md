# Mobile first-path QA — 2026-09-26

Closed Beta v0.39, commit `b9261cf`. Interactive pass of the first-time visitor
path. Intro frames live in
[`docs/reviews/galaxy-intro-reference-2026-09-26/`](../reviews/galaxy-intro-reference-2026-09-26/NOTES.md)
and were taken **before** any GalaxyIntro or travel edits.

## Method

Chrome headless, iPhone Safari user agent, touch, `prefers-reduced-motion: no-preference`,
storage cleared (cold `templeIntroSeen`). Safe-area insets forced with
`Emulation.setSafeAreaInsetsOverride` to top 59px / bottom 34px (Dynamic Island
and home indicator). WebGL renderer in this environment is software
(`ANGLE / llvmpipe`), not a phone GPU. No iOS keyboard can be opened here.

| Pass | Viewport | Notes |
|---|---|---|
| A | 390×844 | Requested mid-tier size, full CSS height |
| B | 430×932 | Requested spot-check |
| C | Playwright “iPhone 13” 390×664 and “iPhone 14 Pro Max” 430×740 | Layout viewport with browser chrome already removed, **plus** the 34px home inset. Harsher than Safari, where the home indicator is usually outside that shorter viewport. Treated as a stress case, not as a literal Safari capture. |

Path driven: cold load → intro / Skip → drag the sky → belt swipe and Leo tap →
Enter this sign → Skip the dive → Begin birth chart → 15 April 1992 → Go deeper →
place “Austin, Texas”, 3:30 AM → Hold this natal → sky.

## What worked

- No uncaught page errors and no console errors on any pass.
- No horizontal overflow (`scrollWidth` matched the viewport).
- Intro Skip, sky drag (settled on Aries), belt swipe, Leo tap, Enter this sign,
  dive Skip, Begin birth chart, Continue, Go deeper, and Hold this natal all
  fired. Hold this natal cast a chart (Sun in Aries, Moon in Libra, Aquarius
  rising) and opened the sky. The sky guide’s first card was on screen.
- Top HUD (version, Pause, Sign in, Skip while the intro can skip) sits below
  the 59px top inset on 390×844. The full-bleed canvas starts at y=0 on purpose;
  the controls do not.
- “Skip to content” is parked above the viewport until focused. That is the
  skip-link pattern, not a dead control.
- The pure-black frame right after dive Skip is the enter veil (~1.1s). Waiting
  it out shows Leo’s home star. It is not a stuck WebGL context.
- WebGL came up (canvas present, no FallbackSky, no context-lost). The first
  ~4s on a **cold** software GL context were a blank document before the canvas
  existed. That delay is this machine’s shader compile, not evidence of a phone
  fallback bug.

## Findings

### 1. First load pulls all 12 plates and the Aries clip — perf, fixed in the follow-up

Measured on the **local production preview** of `b9261cf` (not the dev server,
not the live site), mobile viewport 390×844, no taps for 12s.

Lighthouse 12, mobile, simulated throttling, headless Chrome:

| Metric | Value |
|---|---|
| Performance score | 0.34 |
| First Contentful Paint | 4.9 s |
| Largest Contentful Paint | 6.4 s |
| Time to Interactive | 12.3 s |
| Total Blocking Time | 2,260 ms |
| Cumulative Layout Shift | 0 |
| Total transfer | 3,570 KiB |

Same build, unthrottled localhost (optimistic network, software GL): FCP 1.6 s,
LCP 8.3 s on the `h1`, DOMContentLoaded 274 ms.

Sign and sky bytes in that cold window: **2.96 MB** transferred.

- `/signs/aries.webp` starts immediately (preload link in the document).
- The other eleven WebPs start between ~1.4 s and ~2.8 s.
- `/signs/aries-life.mp4` is **1.13 MB** and starts ~2.5 s, while the camera is
  still on the opening station.
- Modest nebula wallpaper is 75 KB. The full-res PNGs in `public/signs/` (~4.6 MB
  on disk, largest Aquarius / Taurus / Capricorn) are **not requested**.
  `thin-gold-front.png` (~1 MB) is not on this path.

Cause, confirmed in source: every `Station` schedules `loadSignArt` at
`420 + index * 85` ms, so all twelve full-res WebPs fetch even though
`preloadSignArtNear` only wants the aimed sign and its neighbor. The Aries life
clip prefetches as soon as that station is aimed, which is during the intro.

### 2. BirthChat primary action can sit past a short viewport — small fix in this PR

On 390×844 with a 34px home inset, “Skip — sun only” overlaps the home-indicator
band by about 5px (`bottom` 815, inset starts at 810). The primary “Hold this
natal” stays in view. 430×932 does not clip it.

On the 390×664 stress viewport, “Keep flying” and “Hold this natal” layout below
the visible bottom, and focusing the place field left the sheet’s `scrollTop` at
0. The sheet can scroll (`overflow-y: auto`) but nothing moved the primary
button into that scrollport.

This PR only scrolls **inside** `.birth-chat` (the sky stage is not resized) when
a path field focuses or the step changes, and adds `0.75rem` under the sheet’s
existing safe-area padding so the last control can clear the home indicator.

Not fixed here, on purpose: `StageLock` freezes `--app-h` while a BirthChat
field is focused so the keyboard does not resize WebGL. A real iOS keyboard can
still cover the lower fields. That tradeoff is documented in `StageLock`. This
pass could not open an iOS keyboard.

### 3. Copy the path actually uses

The work-order label “Open this natal” is not on screen. Sun-only rest says
“Open your sky”. The deeper path never shows that button: “Hold this natal”
opens the sky itself.

### 4. Tickets, not changed here

- **Keyboard vs frozen stage.** Confirm on a physical iPhone that the place
  field and “Hold this natal” stay reachable with the keyboard up. Do not drop
  the StageLock freeze without that check — it exists to stop the galaxy
  resizing under the keyboard.
- **Software-GL blank start.** Re-time first canvas on a real phone. The ~4s
  blank here is llvmpipe.
- **Sky guide body.** On the short viewport the planet list continues below the
  fold under the guide card. The dock and the guide’s Next control were in the
  tree; this pass did not step every guide beat.
- **Cookie line.** It sits in the bottom stack above the belt until OK. It did
  not cover the belt buttons on 390×844. Dismiss is tab-session only, so every
  cold visit sees it again.

## How to re-check on a phone

Safari or Chrome, private window (so `templeIntroSeen` is empty):

1. Open the site. You should get the ask line, then the sky, with Skip at the top right.
2. Skip. Drag the sky up and down. The sign name should change. The belt should swipe in calendar order.
3. Tap a sign, then Enter this sign. Skip the dive if you want. Begin birth chart.
4. With the home indicator visible, the bottom button of each BirthChat step should be tappable, not under the indicator.
5. Focus the place field. The field should scroll inside the sheet. Watch whether the sky jumps when the keyboard opens.
6. Hold this natal with a real city. The sky should open with your Sun / Moon / Rising, and the guide card should not cover the only way forward.
