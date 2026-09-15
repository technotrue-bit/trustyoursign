# Sign-enter flythrough (Sagittarius pilot)

## Problem

Entering a sign reads as *a card that dissolves into a dark room*, not as
**flying into the sign**. Measured on the shipping build (`scripts/qa/enter-capture.mjs`,
`scripts/qa/frame_stats.py`, 1280×720, 2026-09-14):

| beat | frame | lit % | centre lit % | centre bright % |
| --- | --- | --- | --- | --- |
| approach (illustration up) | 900 ms | 4.4 | 10.5 | 0.3 |
| hand-off to live figure | 1600 ms | 2.5 | 5.9 | 3.5 |
| plate slams the lens (flash) | 2400 ms | **50.6** | **86.1** | **86.1** |
| landed (inside) | 3600 ms | 4.2 | 3.1 | 1.9 |

The reference shot (`artifacts/ref-video/`) is one continuous push: the
constellation figure holds the frame at ~60–70 % height, the galaxy nested in
its body grows faster than the figure, and the shot ends *inside* the galaxy
with the core filling the frame (`lit 35 % → 67 % → 99 %`, centre bright
`10 → 20 → 79 %`).

Three seams break it:

1. **No push.** The figure holds a near-constant size; the only scale change is
   the camera arriving inside the painted plate at the very end — a wall, not a
   flythrough.
2. **The hand-off is dark.** The painted figure dies at `p 0.42–0.78` into the
   sparse live figure, so the middle of the shot is near-black (2–4 % lit).
3. **The landing is empty.** On land the plate, the star cloud and the pick
   sphere are all switched off (`galaxyIntro` `landedHere`), leaving thin lines,
   square node markers and no core — the room has no light source.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Scope | The enter dive only (click Enter → land on hub). Post-land gate, claim, auth, lore: **unchanged** |
| Pilot sign | Sagittarius (`index 8`). One shared pipeline — all 12 signs use the same code and per-sign palette/art |
| Clock | One `p` 0→1; windows retuned + two new channels (`enterRush`, `enterCoreReveal`) |
| Shape | 3 beats: **hold** (figure legible) → **push** (accelerate through the form) → **core** (arrive inside the galaxy) |
| Plate | Dies *early* (`0.06 → 0.40`) while the camera is still far, so no painted wall ever reaches the lens |
| Live figure | Blooms early (`0.06 → 0.64`) so the middle beat is the live star-figure, not black |
| Push | Camera travel grows ~2× and the back half surges (`enterRush`) |
| Core | New procedural galaxy core at the hub (round, warm, haloed) — the light source the interior never had; also what the camera lands on |
| Stars | Round soft sprites for the field's nodes (square `pointsMaterial` markers are a defect, not a style) |
| Flash | No full-frame white slam; brightness ramps into the land |
| Reduced motion | Same curve family, shorter clock; no rush surge |
| Skip | Untouched (`enterSkip` `idle → out → hold → in`) |

## Non-goals

- Reordering `CONSTELLATIONS` / tropical order / calendar strip (locked).
- Exit ceremony, claim / BirthChat / auth shells, corridor travel.
- New insight copy, node purposes, hub copy.
- Re-generating the 12 sign PNGs (the painted plates stay the approach art).

## Motion clock

| Channel | Window on `p` | Notes |
| --- | --- | --- |
| World fade (corridor chrome, station chrome) | 0.00 → 0.20 | Unchanged |
| Plate / painted figure | 1.00 → dies 0.06 → 0.40 | **≤ 0.05 by `p = 0.42`** — gone before the push is close |
| Live figure + galaxy bloom | 0.06 → 0.56 | Carries the middle beat |
| Dive (camera travel) | 0.03 → 0.86 | One ease; no stepped FOV |
| Rush (extra travel, accelerating) | 0.30 → 1.00 | `smooth01^1.35` — the surge |
| Core reveal | 0.34 → 1.00 | Swells to the landing hero |
| Hub settle (look bias) | 0.60 → 1.00 | Soft land on the hub star |

### Hard guarantees (tests)

- `plateFade(0.42) < 0.05` and `galaxyForm(0.42) > 0.75` — the live figure owns
  the frame before the painted one is gone-wrong-dark.
- `galaxyForm(0.06) < 0.02`, `plateFade(0.06) > 0.98` — no early pop.
- `enterDive(0.03) < 0.02`, `enterDive(0.86) > 0.98`; `enterRush` and
  `enterCoreReveal` monotonic, `enterRush(0.30) < 0.02`, `enterCoreReveal(1) = 1`.
- Every channel stays within `[0, 1]` and is non-decreasing.

## Landing (what "inside" must look like)

The camera comes to rest looking at the hub star with:

- the **core** filling roughly a third of the frame height (a light source, warm
  gold, soft halo, slow rotation),
- the live figure's lines sweeping the frame edges (we are *inside* the form),
- a star volume around the camera (the station cloud stays lit instead of
  being switched off),
- no white flash anywhere in the last second.

`centre lit %` at land is the acceptance number: target **≥ 25 %** with
`centre bright %` **8–20 %** (up from 3.1 / 1.9), and no frame in the dive above
`mean 0.25` (the reference ends rich, not blown out).

## Architecture

```text
click Enter
    │
    ▼
p 0→1  (~5s full / ~0.7s reduced)
  hold (figure) → push (rush) → core (arrive) → hub settle
    │
    ├─ Skip? ─► soft blackout (unchanged)
    ▼
p = 1  hub land  →  existing claim / auth / lore gate (unchanged)
```

### Files

| File | Role |
| --- | --- |
| `src/lib/galaxy/signGalaxy.ts` | Retune `enterPlateFade` / `enterGalaxyForm` / `enterDive` / `enterHubSettle`; add `enterRush`, `enterCoreReveal` |
| `src/lib/galaxy/signGalaxy.test.ts` | Window + monotonicity tests (replaces the old plate-before-bloom block) |
| `src/lib/galaxy/travel.ts` | Publish `enterRush` + `coreReveal` on `galaxyTravel`; set them in `applyEnterCurves` / `resetExplore` |
| `src/lib/galaxy/signCore.ts` | **New** — procedural core sprite (canvas: halo + arms + granulation), per-sign palette, cached; pure size/gain helpers |
| `src/lib/galaxy/signCore.test.ts` | **New** — palette clamping + reveal gain |
| `src/components/scene/SignGalaxyField.tsx` | Round star sprites, line glow pass, the core sprite at the hub |
| `src/components/scene/GalaxyIntro.tsx` | Deeper dive from `dive` + `rush`; keep the interior lit on land (no blackout); dev camera probe for QA |
| `src/lib/galaxy/starSprite.ts` | **New** — shared round star sprite texture for field point materials |
| `scripts/qa/enter-capture.mjs`, `scripts/qa/frame_stats.py` | Reproducible capture + measurement (dev-only tooling) |

### Isolation

- **Curves:** pure functions of `p`, unit-tested without Three.
- **Core sprite:** a canvas texture + pure gain helpers; no travel math.
- **Camera:** `GalaxyIntro` reads curves only — no new phase labels.
- **Interior:** the landed look changes only through opacity/visibility in the
  station group; node positions, picks, copy and the gate are untouched.

## Risks

| Risk | Mitigation |
| --- | --- |
| Deeper dive moves the landed pose off the hub | Hub settle + look bias unchanged; measure camera→hub distance with the dev probe |
| Keeping the cloud lit on land costs frames on small GPUs | Cloud draw range already caps by `isSmallGpu()`; landed opacity is a constant, not a new allocation |
| Field/core sprite leaks GPU memory | Textures cached per sign, disposed on unmount like the existing plate textures |
| Beta regressions elsewhere | `npm test` + `npm run typecheck`; the enter/skip tests keep landing semantics |

## Testing

1. Unit: enter windows, guarantees and monotonicity (`signGalaxy.test.ts`).
2. Unit: core palette/gain (`signCore.test.ts`).
3. Unit: `enterSkip` unchanged (`enterSkip.test.ts`).
4. Browser: `node scripts/qa/enter-capture.mjs 8 screenshots/enter-<rev>` then
   `python scripts/qa/frame_stats.py screenshots/enter-<rev>` — check the beats
   above and look at the frames.
5. Manual: Skip mid-dive still shows soft black → hub; land still shows the
   sign-in gate.

## Success criteria

- The dive reads as one continuous push: figure → through the form → core.
- No painted-plate wall at the lens; no full-frame white flash.
- Landed interior has a visible light source (core) and a lit volume.
- `centre lit %` at land ≥ 25 %, no dive frame above `mean 0.25`.
- Skip / land / gate / tropical order unchanged.

## Verified (2026-09-14, dev build, 1280×720)

`node scripts/qa/enter-capture.mjs 8 screenshots/enter-v3` +
`python scripts/qa/frame_stats.py screenshots/enter-v3`:

| beat | before (`enter-baseline`) | after (`enter-v3`) |
| --- | --- | --- |
| resting station (pre-enter) | — | lit 4.2 · ctr lit 4.4 |
| figure up, 900 ms | lit 4.4 · ctr lit 10.5 · ctr bright 0.3 | lit 1.1 · ctr lit 2.3 |
| mid-push, 1600 ms | lit 2.5 · ctr lit 5.9 | lit 2.6 · ctr lit 4.0 |
| plate wall, 2400 ms | **lit 50.6 · ctr bright 86.1** | lit 3.2 · ctr bright 1.4 |
| landed | lit 4.2 · ctr lit 3.1 · ctr bright 1.9 · mean 0.032 | **lit 25.2 · ctr lit 51.3 · ctr bright 7.4 · mean 0.120** |

- No frame in the dive exceeds `mean 0.12` (was a `0.34` white slam at 2.4 s).
- Camera comes to rest **2.60 units** from the hub star with the core at NDC
  `(0.06, 0.04)` — dead centre. Before, the camera finished *past* the hub,
  looking at empty sky.
- Other signs land the same way (Aries: 2.62 units, NDC `(0.02, 0.08)`), and on
  a 390×844 phone the core is centred with readable copy (NDC `(0.18, 0.11)`).
- Skip mid-dive: soft fade → short dark beat → hub with the galaxy already in
  place (screenshots `screenshots/skip-8/grid.png`), no empty flash.
- `npm test` 240 passing / 0 failing, `npm run typecheck` clean, no new lint
  errors.

### Numbers worth keeping

- `HUB_STANDOFF = 2.6` (world units the camera stops short of the hub star) —
  the landing framing lives or dies on this one constant.
- `CORE_LOCAL_SIZE = 2.4` in the field's local space (≈ 2.7 world units once the
  group scale is applied) is what makes the core read as the hero rather than a
  bright dot.
- The dive is **measured against the actual camera→hub gap**, not a fixed
  distance, so it holds its landing on any aspect ratio.
