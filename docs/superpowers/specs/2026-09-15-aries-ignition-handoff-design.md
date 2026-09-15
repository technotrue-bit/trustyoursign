# Aries ignition hand-off — design

**Sign:** Aries (index 0, the first zodiac sign). **Scope:** the entry transition only.

## Goal

Entering Aries should read as the reference video does: the seed galaxy inside the figure
**ignites**, the blast **consumes the figure from within**, and the galaxy that forms from it
is what the camera then flies into. Today the same moment is a crossfade with a dark hole in it.

## The reference, measured

15.04s, 1280x720, 24fps (`artifacts/ref-f6d5ea0a/source.mp4`, frames at 2fps, contactsheets
`grid_01.png` / `grid_02.png`). Luma statistics per frame:

| t | beat | lit% | centre-lit% | centre-bright% |
|---|---|---|---|---|
| 0.0–0.75s | starry ram, dim spiral **inside its torso** | 9–11 | 20–25 | 0.5–1.2 |
| ~1.0s | **ignition** | 28.2 | 62.0 | 10.9 |
| 1.5–2.0s | **peak burst** consumes the figure | 59.2–78.8 | 95.7–**99.97** | 29.7–**31.6** |
| 2.5–4.0s | figure gone, galaxy forming from debris | 85.8 → 70.7 | 100 → 97.8 | 21 → 11.1 |
| 4.0–9.5s | formed spiral, rays fading | 47–59 | 85–94 | 8–14 |
| 10–15s | continuous push onto a glowing core | rises to 80.7 | 100 | 24 → 73.3 |

Two structural facts to preserve: the ignition is **inside-out** (light starts in the body and
consumes outward), and the burst is a **pulse** — it peaks and decays into the formed galaxy,
it does not plateau.

## The incumbent (measured 2026-09-15, Aries @960x540, `screenshots/aries-base`)

| t | phase | lit% | centre-lit% | centre-bright% |
|---|---|---|---|---|
| pre-enter | parked on the sign | 6.63 | 12.20 | 1.44 |
| 0.35s | figure up | 4.59 | 12.48 | 0.53 |
| 0.60s | plate fading | 3.55 | 9.56 | 0.12 |
| 0.90s | hand-off begins | 2.02 | 4.69 | 0.12 |
| **1.20s** | **dark hole** | **1.63** | **2.63** | **0.63** |
| 1.60s | | 1.89 | 3.04 | 0.95 |
| 2.00s | | 2.12 | 3.84 | 1.08 |
| 2.40s | galaxy forming | 3.17 | 6.83 | 1.34 |
| 2.80s | | 6.69 | 16.68 | 2.36 |
| 3.20s | | 15.02 | 39.57 | 5.24 |
| 4.00s | landed | 24.82 | 35.67 | 4.18 |
| 5.20s | settled | 24.52 | 34.07 | 2.70 |

The entry loses its light exactly where the reference is brightest. Nothing here is a matter of
taste: the middle of the shot is 2.6% centre-lit against a 99.97% reference peak.

## Metric sheet (this cycle's gate — baselines above are the incumbent)

| id | metric | incumbent | required |
|---|---|---|---|
| M1 | centre-lit% at the burst peak (max over t≈1.0–2.4s) | 3.84 | **>= 70** |
| M2 | centre-bright% at the burst peak | 1.08 | **>= 15** |
| M3 | lit% at the burst peak | 2.12 | **>= 20** |
| M4 | figure lights up *before* it is consumed: lit% at t≈0.9s | 2.02 | **>= 8** |
| M5 | pulse, not plateau: centre-bright% at the landing (t≈4.0s) returns to | 4.18 | **<= 12** |
| M6 | no landing regression: hubNdcY @960x540 (12 signs) | 0.281–0.299 | unchanged ±0.02 |
| M7 | no landing regression: copied-band mean luma @540 | 12.0 | <= 14 |
| M8 | suite + types | 173 pass / 0 fail, clean | unchanged or better |
| M9 | console errors during entry | 0 | 0 |
| M10 | determinism: same sign twice = same burst; Aries != Taurus | n/a | both hold |
| M11 | **figure presence while the burst ramps** — plate opacity at the burst's ramp-up (p 0.19–0.30) | **0.55 → 0.21** (`enterPlateFade` finishes at p 0.40, ahead of the burst) | **>= 0.85 held until the burst peak**, then consumed *by the dissolve* |

## Round 1 result — PASS on M1–M10, FAIL on M11

Measured by a fresh critic (round-1 artifact, `screenshots/critic-aries`), independently
reproduced by the orchestrator (`screenshots/aries-verify`):

| id | required | critic measured | orchestrator measured |
|---|---|---|---|
| M1 | centre-lit% >= 70 at peak | 99.35 (2.0s) | 100.0 |
| M2 | centre-bright% >= 15 | 38.47 | 42.5 |
| M3 | lit% >= 20 | 62.48 | 67.6 |
| M4 | lit% >= 8 at 0.9s | 15.55 | 13.0 |
| M5 | centre-bright% <= 12 at landing | 3.17 | 3.31 |
| M6 | hubNdcY 0.281–0.299 @540 | 0.293–0.298 (5 signs, x=0.000) | 0.295 (sign 0) |
| M7 | copy band <= 14 | 12.37/pass under identical bands | — |
| M8 | suite + types | 192/191/1 (pinned chart failure only), typecheck clean | same, one `not ok` total |
| M9 | console errors | 0 (capture + 5 landings + 2 guard probes) | 0 |
| M10 | determinism | 12/12 distinct, repeat identical, no `Math.random` | 128/128 channel values match across runs |
| **M11** | **plate >= 0.85 until the burst peak, consumed by the dissolve** | **not visible to this critic (metric added after dispatch)** | **FAIL: 0.55 @p0.22, 0.21 @p0.30, burst peaks p>=0.36** |

Guards verified by running, not reading: reduced-motion A/B (burst peaks 0.22 vs 1.0 at the same
progress, impulse halved, flash skipped) and a forced small-GPU context (SwiftShader) that still
holds the metrics. The round-1 caveat "the flash never appears because the capture browser is
SwiftShader" is **false as measured** — the capture context is an Intel UHD 770
(`isSmallGpu()` false), so the flash was exercised; not fatal, but it was wrong.

Carried into round 2 as cleanup (not gaps): dead exports `burstSpinAt` / `clearSignBurstCache`,
and a seed derivation that differs between the unit-tested function and the shader that actually
runs (`seed * 1e-4` vs `(seed % 977) * 0.01`).

## Mechanics (all procedural — no per-sign art, no new assets)

1. **Ignition rays + shock front** — a new pass in the procedural core painter
   (`src/lib/galaxy/signCore.ts` canvas generator), so all 12 signs get distinct bursts from
   palette + seed. Rays are thin, high-contrast, radial; the front is a soft additive ring.
2. **Dissolve** — the painted plate erodes outward from the hub. The hub position and the
   plate's alpha grid are already measured at runtime by `signAlign.ts`, so the mask is
   data-driven and works for any sign. **The plate's death must be *caused* by this dissolve**:
   a time-based fade that finishes before the burst peaks leaves nothing to consume, which is
   the failure M11 pins down (verified visually at 1.2s: "no readable painted figure… a stock
   radial flare with leftover hard-edged wireframe").
3. **Debris** — the existing flight-dust ring (`flightDust.ts`) gains an ignition impulse
   (a time-varying radial offset), reusing the shipped points system rather than adding one.
4. **Flash** — a short additive radial quad at the hub: ramp in ~120ms, out ~500ms.
   Gated behind the existing `isSmallGpu()` flag.
5. **Hand-off** — the figure's lines/stars brighten then hand over on the existing channels;
   the burst is a new sibling pulse on the same clock, centred on the current crossfade.

## Owned files

`src/lib/galaxy/signBurst.ts` (new) · `signBurst.test.ts` (new) · `signCore.ts` ·
`signGalaxy.ts` (+ test) · `travel.ts` · `flightDust.ts` · `src/components/scene/SignGalaxyField.tsx` ·
`src/components/scene/GalaxyIntro.tsx` · `package.json` (test script list)

## Do-not-touch (sibling surfaces owned by earlier rounds)

Landing pose + `landingBiasNdc` · `landingShift` / `landingRoll` geometry · HUD copy layout ·
the other 11 signs' palettes and plates · `scripts/qa/*` harnesses except additive capture flags.

## Guards

- **Perf:** no per-frame allocation in the burst path; particle ceiling tied to the existing
  `SMALL` gate; the flash is skipped on small GPUs.
- **Motion:** `prefers-reduced-motion` degrades the burst to a slow brighten + dissolve.
- **Determinism:** every random value comes from the sign's seeded RNG (as `signCore` does).
- **Honesty:** every metric above is measured from captured frames with `scripts/qa/frame_stats.py`,
  never estimated by eye.

## Out of scope

Audio (the app has none today; a burst with sound is its own spec), the map/attract state,
exit/reverse burst, and any change to the other 11 signs' art.

## Round 2 result — PASS on M1–M11 + integration gate

Measured by a second fresh critic (own captures in `screenshots/critic2`), then re-verified by the
orchestrator against the served app (`screenshots/phase5`):

| gate | required | critic | orchestrator |
|---|---|---|---|
| M1 centre-lit% at peak | >= 70 | 97.58 @1.6s | 98.17 @2.0s |
| M2 centre-bright% | >= 15 | 34.98 | 35.46 |
| M3 lit% | >= 20 | 58.75 | 59.09 |
| M4 lit% @0.9s | >= 8 | 17.66 | — (75.08 centre-lit @1.2s) |
| M5 centre-bright% at landing | <= 12 | 3.11 | 3.10 |
| M6 hubNdcY @540, signs 0/1/6/7/8 | 0.281–0.299 | 0.296–0.299, x = 0.000 | 0.296–0.299, x = 0 |
| M7 copy band | <= 14 | 12.6 (incumbent 15.3) | — |
| M8 suite + types | unchanged or better | 194/193/1 + typecheck clean | same |
| M9 console errors | 0 | 0 | 0 |
| M10 determinism | both hold | 12/12 distinct, repeat identical | — |
| M11 plate >= 0.85 until the burst peak, consumed by the dissolve | met | **1.0000 across p 0.18–0.51; burst peak p=0.274 with plate 1.0000; fade first moves p=0.607 while dissolve is already 1.0000** | same ladder confirmed |
| build | completes | exit 0 | — |
| guards | reduced motion + small GPU | burst 1.0 -> 0.352 @p=0.3, impulse x0.5, flash gated; rays 43 -> 21 | — |
| additivity | landing pose untouched | diff touches only the 11 owned files | signAlign.ts not in diff |

Cleanup verified independently by the critic, including re-deriving the shader's noise span from the
GLSL string itself: max |difference| vs the unit-tested function = **0** over 25 samples, `uSeed`
comes from the shared `dissolveSeedPhase()`, and no `977` literal remains. The test now vouches for
the code the shader runs.

Non-metric observation, recorded as a fact: at peak our burst is a compact starburst with thin rays
while most of the frame stays dark; the reference's peak is a frame-filling blast at 75–90% lit. Not
a gate (see the rejected-metric note in the plan — angular irregularity tracks saturation).
