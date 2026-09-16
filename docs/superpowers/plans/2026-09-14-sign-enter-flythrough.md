# Sign-enter flythrough — implementation plan (Sagittarius pilot)

**Goal:** make click → dive → hub one continuous push that looks like `artifacts/ref-video` — figure holds the frame, camera accelerates through the form, lands inside the galaxy on a luminous core.

**Spec:** `docs/superpowers/specs/2026-09-14-sign-enter-flythrough-design.md`

**Tech:** TypeScript, Zustand (`useGalaxy`), React 19, three / R3F, `node --test`.

## Global constraints

- Post-land gate / claim / auth / lore: unchanged.
- Do not reorder `CONSTELLATIONS`, tropical indices or strip mapping.
- Skip = soft blackout, unchanged.
- Enter stays one `p` clock; no new phase labels.
- `npm test` and `npm run typecheck` green at the end.
- One pipeline for all 12 signs; Sagittarius is the verification sign.

## Task 1 — Enter curves

**Files:** `src/lib/galaxy/signGalaxy.ts`, `src/lib/galaxy/signGalaxy.test.ts`

Produce (exact signatures):

- `enterWorldFade(p)` — 1 → 0 over `0.00 → 0.20`
- `enterPlateFade(p)` — 1 → 0 over `0.06 → 0.40`
- `enterGalaxyForm(p)` — 0 → 1 over `0.06 → 0.64`
- `enterDive(p)` — 0 → 1 over `0.03 → 0.86`
- `enterRush(p)` — 0 → 1 over `0.30 → 1.00`, `smooth01(u)^1.35`
- `enterCoreReveal(p)` — 0 → 1 over `0.34 → 1.00`
- `enterHubSettle(p)` — 0 → 1 over `0.60 → 1.00`

Tests: window endpoints, guarantees (`plateFade(0.42) < 0.05`, `galaxyForm(0.42) > 0.75`), monotonicity across 0→1 in 0.01 steps, range `[0,1]`.

## Task 2 — Publish the new channels

**Files:** `src/lib/galaxy/travel.ts`

- `galaxyTravel.enterRush`, `galaxyTravel.coreReveal` (0 defaults).
- `applyEnterCurves` sets both; `resetExplore` clears both.
- No change to phases, skip machine, or `publishExplore`'s public shape.

## Task 3 — Round stars + core sprite (the look)

**Files:** `src/lib/galaxy/starSprite.ts` (new), `src/lib/galaxy/signCore.ts` (new), `src/lib/galaxy/signCore.test.ts` (new), `src/components/scene/SignGalaxyField.tsx`

- `starSprite.ts`: cached canvas radial-gradient sprite (soft core + glow); used as the `map` for the field's star/node `pointsMaterial`s so nodes read round.
- `signCore.ts`: `getSignCore(id)` → cached `CanvasTexture` — warm halo, spiral arms, granulation, tinted by the sign palette; `coreScale(reveal, inside)`, `coreOpacity(reveal, inside)` pure helpers.
- `SignGalaxyField`: line glow pass (second lineSegments at 1.012 scale, low opacity), star/node sprite maps, and a `<sprite>` core at the hub node driven by `coreReveal`/`inside`.

## Task 4 — The push (camera)

**Files:** `src/components/scene/GalaxyIntro.tsx`

- `exploreDive = dive * (1.15 + form * 1.9) + rush * RUSH_DEPTH` with `RUSH_DEPTH ≈ 2.6`.
- Keep the landing hub distance so the core sits framed ahead of the camera (verify with the dev probe; retune `RUSH_DEPTH` if the hub ends up behind the lens).
- Dev-only probe: `window.__tys = { cam, look, station, hub, dive, p }` under `import.meta.env.DEV` for QA measurement (no production cost).
- **Interior stays lit:** on land, keep the station cloud visible at a settled opacity instead of zeroing it; keep the plate/shell hidden as today.

## Task 5 — Verify

1. `npm test`, `npm run typecheck`.
2. `node scripts/qa/enter-capture.mjs 8 screenshots/enter-flythrough` →
   `python scripts/qa/frame_stats.py screenshots/enter-flythrough`.
3. Look at the frames (montage) and compare with `artifacts/ref-video/ref_*.png`.
4. Beat check: no `mean > 0.25` frame in the dive; land `centre lit % ≥ 25`,
   `centre bright % 8–20`; figure visibly larger at 60 % than at 10 %.
5. Skip check: `skipEnterGalaxy()` mid-dive → soft black → hub (screenshot).

## Status — done and verified (2026-09-14)

| Task | State | Notes |
| --- | --- | --- |
| 1 Enter curves | done | `enterRush` + `enterCoreReveal` added; form window tightened to `0.06 → 0.56` so the live figure owns the frame before the plate dies; window/monotonicity tests green |
| 2 Publish channels | done | `galaxyTravel.enterRush` / `coreReveal` set in `applyEnterCurves`, cleared in `resetExplore` |
| 3 Round stars + core | done | new `starSprite.ts`, `signCore.ts` (+ tests); field rebuilt with refs, halo line pass, hub core sprite |
| 4 The push | done | dive closes the **measured** camera→hub gap to `HUB_STANDOFF`; landed cloud stays lit; dev camera probe added |
| 5 Verify | done | see the spec's *Verified* table — no flash, land `ctr lit` 3.1 → 51.3, core centred, Aries + mobile checked, Skip intact |

### Extra work this needed (not in the original plan)

- **`src/lib/dev-qa.ts` + `window.__tysQa`** — the capture harness used to import
  modules from the page, which silently split into a second instance after any
  HMR update (the app never saw the harness's writes). The app now installs its
  own dev-only hooks; QA drives the live instance. Stripped in production.
- **Camera probe** (`window.__tys` under `import.meta.env.DEV`) — reports
  camera→hub distance and the hub's NDC so "is the core centred?" is a number,
  not a guess.
- **Landing look fix**: `_look.lerp(_chest, 0.35)` → `0.12` inside. The 35 % pull
  back toward the corridor was what pushed the core up and to the right.
- **QA tooling** under `scripts/qa/`: `enter-capture.mjs`, `landed-probe.mjs`,
  `skip-check.mjs`, `page-probe.mjs`, `frame_stats.py`.

### Still open (deliberately)

- The **middle beat is still sparser than the reference** (2–4 % lit vs 67 %):
  the reference's pushed-in frames are a dense rendered galaxy, ours are gold
  line-art on black by design. Matching that density means new galaxy/nebula art
  for the 12 signs, not a curve change.
- **12-sign sweep**: the pipeline is shared and data-driven (verified on
  Sagittarius + Aries), but the painted plate, palette and animal figure differ
  per sign — worth a per-sign capture pass before beta.

### Next polish pass (found while reviewing the finished frames)

1. ~~**Plate → live-figure hand-off seam**~~ — **fixed** (see Round 2 below).
2. ~~**Frames 5–8 are still thin**~~ — **fixed** (see Round 2 below).
3. **Post-land HUD pop**: the hub copy/CTA fades in over 350 ms as soon as
   `p = 1`. Consider a slightly longer, softer rise for the first beat inside.
   (Pre-existing behaviour, not introduced here.)

---

## Round 2 — the two art-side fixes + the 12-sign sweep

### 1. Hand-off seam: the live figure is laid on the painted one

`src/lib/galaxy/signAlign.ts` measures both drawings and returns the transform
that puts the live star-figure exactly over the painted plate, then blends back to
the galaxy frame as the figure grows into the form you fly through:

- painted box: scan the plate's alpha grid (`signVolume`), top row = `+y`;
- live box: min/max of the galaxy's animal stars;
- `fieldFrame(form, match)` — match at `form ≤ 0.10`, hand-over complete by
  `form = 0.70`, and **exactly** the old galaxy frame at `form = 1` (a unit test
  pins that, so the landing geometry cannot drift).

Measured per sign (all 12 resolve a match): the live figure is 17–21 galaxy units
wide against painted boxes of 9–14 plate units, so `x` shrinks 0.38–0.82× and `y`
0.46–1.00× before growing back to 1.05 at land.

### 2. The thin middle: flight dust

`src/lib/galaxy/flightDust.ts` adds a deterministic ring of ~900 faint dust
points around the flight axis (`z` 2 → 12.5 station-local, radius 1.7 → 12.5,
y squashed to 0.78), with a clear channel through the centre so the core still
reads. Its own shader gives per-point size/twinkle, a round `gl_PointCoord`
falloff, and opacity that rises with the live figure and eases back inside (0.34)
so close dust never becomes noise around the hub.

### 3. Sweep — all 12 signs, verification only (no per-sign art)

`node scripts/qa/sign-sweep.mjs` at 960×540: park on each sign, measure the
alignment, dive, capture a mid frame and a landed frame, read the probe.

| result | value |
| --- | --- |
| signs reaching `inside` | **12 / 12** |
| alignment resolved (match computed) | **12 / 12** |
| console/page errors across the sweep | **0** |
| camera→hub at land | 2.62 – 2.82 units (target 2.60) |
| landed centre-lit | 39.8 – 60.2 % (median ≈ 45) |
| landed centre-bright | 4.2 – 8.2 % |

Frames: `screenshots/sweep/sweep-mid.png`, `sweep-landed.png`.

### Findings from the sweep — 1 and 2 now fixed (Round 3)

**Fixed — landing look (shared, no per-sign art):**

1. **Libra's seam is gone.** Its figure is a balance whose post runs through the hub,
   so the landing framed a hard vertical line down the middle (column luma 147 vs ~73
   for neighbouring columns). The figure now *turns* at landing by a per-sign angle
   chosen to push the worst near-hub segment furthest from vertical (`landingRoll`),
   ramped in only after the painted-to-stars hand-off. Measured after: the brightest
   pixel per row drifts 441→518 instead of pinning at 475, and the line reads as
   constellation drawing rather than a seam.
   *Mechanism note:* the station is billboarded to the camera, so rolling the **camera**
   cancels itself out — the only thing that changes the frame is rolling the figure.
   A canvas-vs-DOM probe (`scripts/qa/line-source.mjs`) is what proved the line was in
   WebGL and that the camera roll had done nothing.
2. **Centring is now deterministic.** The landing used to converge toward the look
   target while the hero-frame lift fought the pull, leaving a per-sign residual
   (NDC y from −0.61 to +0.35). The camera now parks explicitly at the hub at a fixed
   standoff. Measured across all 12 signs: **NDC (0.000, 0.000)**, camera→hub
   2.63–2.74, 0 console errors.

**Still open:**

3. **On short viewports (960×540) the copy block sits over the hottest part of the
   core** — fine at 1280×720. A responsive nudge to the HUD block or the standoff
   would settle it; it is a layout call, not a geometry one.
4. **Scorpio's landing is the dimmest** (centre-lit 21 % vs 40–60 elsewhere) — its
   palette accent is dark red, so its core is inherently dimmer. A palette decision.
5. For Libra the optimiser's best achievable is ~11.6°: its post and a 23° diagonal
   trade off against each other, so the post is tilted rather than fully off-axis.
   Clearing it entirely needs a lateral shift of the figure's line layer only.

### QA tooling added this round

`scripts/qa/sign-sweep.mjs` (12-sign verification), `scripts/qa/montage.py`
(ffmpeg-free labelled grids — ffmpeg's glob demuxer is not in every Windows
build), plus `align()` / `preload()` on the dev QA hooks.

## Round 4 (all three flagged items)

- `landingShift()` in `signAlign.ts` + `figureGroup` in `SignGalaxyField.tsx`: the drawing
  slides off the hub's axis; nodes + core do not move. Direction chosen by margin search
  (see spec) — a fixed +x direction made Aquarius worse.
- `landingBiasNdc(viewHeight)` in `signAlign.ts`, used by `GalaxyIntro`: core framed higher
  the shorter the viewport (base 0.12, cap 0.30).
- `coreAccent()` in `signCore.ts`: dark accents lifted toward chest (Scorpio), bright ones
  nudged 12%.
- Tests: signAlign (seam clearance for all 12 signs, bias bounds) and signCore (lift + token
  shape). `npm test` 173 pass / 0 fail; `npm run typecheck` clean.
- Verified after: 12-sign sweep at 960x540 and 390x844 — landed NDC, centre-lit and the
  brightest-pixel-per-row seam probe; see the sweep output referenced from the PR.

### Round 4 — measured

| check | before | after |
|---|---|---|
| hub NDC y @960x540 | 0.000 | **+0.299** |
| hub NDC y @1280x720 | 0.000 | **+0.155** |
| hub NDC y @390x844 (phone) | 0.000 | **+0.113** |
| copy band (rows 62-100%) mean luma @540 | 36.6 | **12.0** |
| copy band mean luma @720 | 38.3 | **15.4** |
| scorpio landed centre-lit @720 | ~21% | **28.7%** |

The bias is exact: `hubNdcY` lands on `landingBiasNdc(height)` at every size tested
(0.30 / 0.156 / 0.12 targets). The seam clearance is proven in geometry by the unit
test; the pixel probe agrees in direction (Libra's median bright column 474 -> 436)
but is noisy, because stars outshine the line in the centre band.
