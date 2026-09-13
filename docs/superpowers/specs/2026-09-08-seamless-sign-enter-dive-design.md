# Seamless Sign-Enter Dive

## Problem

Entering a sign galaxy (click → dive → first star) is meant to feel like one continuous cinematic motion (~4–5s). Today several seams break that:

- Plate/shell can still read as a 2D card while the galaxy is forming
- Camera / phase logic can feel stepped (`fading` then `diving`) rather than one pull
- Skip can look broken: content vanishes into empty black, then pops back when “done”
- HUD copy (“Entering the form…”) fights the sky during the morph

Claim / sign-in / lore unlock after landing are **out of scope** for this spec. This document only covers click → seamless dive → land on hub (and Skip within that stretch).

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Scope | Click selected sign → dive → land on first (hub) star |
| Duration | Medium cinematic **~4.5s** full enter; reduced motion **~0.7s** on the same curve |
| Architecture | **Single progress curve** (`exploreProgress` 0→1) with overlapping easing windows |
| Plate vs bloom | Plate dies **before** galaxy bloom peaks (hard tested guarantee) |
| Skip | Soft blackout: ease to black → hold (land under veil) → fade up on hub — never a broken empty flash |
| HUD during dive | Skip only (intro top-right slot); hub copy fades in **after** `p = 1` |
| Screen lock | Unchanged intent: during enter, only Skip (and Escape/Enter-as-skip) |
| Post-land | Existing hub gate (sign-in / birth chart / unlocked lore) starts only after land |
| Tropical order | Untouched |

## Non-goals

- Rewriting claim / BirthChat / auth shell transitions
- Reverse “exit galaxy” ceremony polish
- Free 6DOF corridor rewrite
- Reordering `CONSTELLATIONS` / calendar strip mapping
- New insight copy

## Motion clock

One clock: `exploreProgress` (`p`) from 0 → 1.

`fading` / `diving` may remain as **lock/HUD labels** only. Camera and materials must not step on those labels; they read overlapping windows on `p`:

| Channel | Window on `p` | Notes |
| --- | --- | --- |
| World fade (chrome, other stations, distant sky) | 0.00 → 0.22 | Nearly gone before dive deepens |
| Plate / shell opacity | 0.00 → 0.28 | **Plate ≤ 0.05 by `p = 0.30`** |
| Camera dive | 0.08 → 0.78 | One ease-in-out pull; no stepped FOV jumps |
| Galaxy bloom (`galaxyForm`) | 0.28 → 0.92 | **Starts only after plate is already dead** |
| Hub settle (look bias to first star) | 0.75 → 1.00 | Soft land |

### Hard guarantees (tests)

At `p = 0.30`:

- `plateFade < 0.05`
- `galaxyForm < 0.08`

So the card is gone before the bloom reads as the hero.

## Skip — soft blackout

Skip must feel intentional and calm (anti–motion-sickness), not like a broken blank page.

### Micro-state: `enterSkip`

`idle | out | hold | in`

1. **`out` (~0.35–0.5s):** Dampen / freeze dive motion. Fade a full-screen black veil up (sky + UI). Not a hard cut.
2. **`hold` (~0.15–0.25s):** Screen stays intentionally dark. Under the veil, jump to landed hub (`p = 1`, first star pose, claim-prompt ready). No camera thrashing.
3. **`in` (~0.4–0.55s):** Fade veil down. Hub star / galaxy already in place so content rises cleanly.

### Skip rules

- Black veil is deliberate (CSS/WebGL overlay), never an empty failed frame with nothing drawn.
- Normal (non-Skip) dive never uses the blackout path.
- Reduced motion: same three beats, shorter timings.
- Escape / Enter during enter animate call the same Skip path.

## HUD

| Phase | Visible chrome |
| --- | --- |
| `0 < p < 1` (normal dive) | Skip (+ auth slot if already in that corner); no centered “Entering…” |
| Skip `out` / `hold` / `in` | Veil owns the screen; Skip control may hide once `out` starts |
| `p = 1` inside | Hub copy / CTAs fade in (~0.35s); Back available |

## Architecture

```text
click enter
    │
    ▼
exploreProgress 0→1  (~4.5s)
  windows: world → plate die → dive → bloom → hub settle
    │
    ├─ Skip? ──► out (veil up) → hold (land under veil) → in (veil down)
    │
    ▼
p = 1  hub land
    │
    ▼
existing claim / auth / lore gate (unchanged)
```

### Primary files

| File | Role |
| --- | --- |
| `src/lib/galaxy/signGalaxy.ts` | Retune enter curve helpers; plate-before-bloom tests |
| `src/lib/galaxy/travel.ts` | Enter clock; `enterSkip` state machine; Skip API |
| `src/components/scene/GalaxyIntro.tsx` | Camera/FOV from continuous windows |
| `src/components/overlay/SignGalaxyHud.tsx` | Quiet dive HUD; skip veil; post-land fade-in |
| `src/components/overlay/GalaxyShell.tsx` | Keep intro Skip slot parity; no competing chrome mid-dive |

### Isolation

- **Curve helpers:** pure functions of `p` — unit-tested without Three.
- **Skip machine:** only mutates explore/skip fields; land uses existing `landInsideHub` (or equivalent).
- **HUD veil:** presentation only; does not own travel math.

## Error / edge handling

- Double Skip / spam: ignore while `enterSkip !== idle` after `out` begins.
- Enter interrupted by claim open: only allowed after land (`p = 1`); lock remains until then.
- WebGL stall mid-dive: veil path still safe; on Skip hold, prefer settled hub materials already primed.
- Reduced motion: shorten windows; keep plate-before-bloom inequality.

## Testing

1. Unit: plate-before-bloom at `p = 0.30`.
2. Unit: Skip state transitions `idle → out → hold → in → idle` with duration caps.
3. Unit: while Skip `hold`, explore is already at landed hub (`phase === inside`, `p === 1`).
4. Manual / browser: normal dive shows no card linger; Skip shows soft black then hub fade-up (no empty flash).

## Success criteria

- Click → first star reads as one ~4.5s motion.
- No readable 2D plate after early dive; bloom carries the form.
- Skip: soft black → calm hold → hub rises; never looks like a broken blank site.
- No centered dive copy over the morph.
- Hub claim/auth/lore behavior unchanged after land.
- Tropical order and strip mapping untouched.
