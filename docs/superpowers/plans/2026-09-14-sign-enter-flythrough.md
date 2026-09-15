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

1. **Plate → live-figure hand-off seam** (`p ≈ 0.25–0.4`): the two drawings are
   different sizes (the field's animal spans ~1.4× the painted figure's width,
   ~1.9× its height), so the crossfade can read as a small jump. Fix by matching
   the field's figure box to the painted figure's box (x 0.72, y 0.53, offset
   `(-0.29, +0.21)` in plate units) or by pushing the hand-off into a faster
   part of the rush.
2. **Frames 5–8 are still thin** — add a dust/star volume through the middle of
   the dive (the station cloud is a thin slab at the plate, so between the plate
   and the hub there is little to fly past).
3. **Post-land HUD pop**: the hub copy/CTA fades in over 350 ms as soon as
   `p = 1`. Consider a slightly longer, softer rise for the first beat inside.
   (Pre-existing behaviour, not introduced here.)
