# Bottleneck gauntlet — progress

```
GOAL: Remove every material runtime bottleneck that steals FPS, first load, or forge/AI wall-clock on Trust Your Sign
BAR: (1) Galaxy fly + plate gather: Chrome Performance mid-session ≤16.7ms avg frame / no >50ms long tasks on a mid phone profile
     (2) Initial client graph: three/R3F not required to parse VaultApp/galaxy store before ChartCanvas lazy load
     (3) Forge: remaining prose keys do not require 6 sequential ~12s xAI round-trips
CONSTRAINTS: Keep tropical Aries-first pipelines; keep birthchat-slide math; no architecture rewrite for its own sake
STOP WHEN: bars met on hot path · or same gap 3 rounds · or you stop the run
```

## Audit table

### Tier A — frame killers

| ID | Bottleneck | Status | Notes |
| --- | --- | --- | --- |
| A1 | `stepDisk` CPU gravity × ~4800 + full buffer upload | done | Cap `DISK_N` 2800/1600; skip chakra+volume when mix settled; dirty upload; freeze off-screen; birth `DISK_N_BIRTH` |
| A2 | Station additive overdraw 2600–4400 | done | `CLOUD_N` 2200/1400; cheap frag via `uCheap`; full cloud only aimed±1 (`CLOUD_N_FAR` else) |
| A3 | Celestial ~14k baseline points | done | `ARM_N` halved; near field cut; post-intro hide near + `ARM_N_LOD` |
| A4 | Stack nebula + disk + station at birth | done | Phase mutex: thin disk/station while nebula hot; nebula → idle/off after birth |
| A5 | `hydrateSignArt` every frame | done | Once until `hydrateSignArt` returns ready |
| A6 | Fog `clone()` + `updateProjectionMatrix` every frame | done | Reuse `_bg`; projection only on fov/aspect/far change |
| A7 | 12 Station useFrames + mid-flight `denseCloud` hitch | done | Aimed±1 full cloud; `denseCloudPooled` + `prebakeSignClouds` |

### Tier B — load / React

| ID | Bottleneck | Status | Notes |
| --- | --- | --- | --- |
| B1 | `three` leaks via temple → store | done | `temple-data.ts` (no three) + curve in `temple.ts`; store/travel/FallbackSky → data; `signArtMedia` splits PNG warm from three textures |
| B2 | Eager BirthChat / ChartForge / panels | done | `React.lazy` BirthChat/ChartForge/DetailPanel/AskPanel/TourGuide by phase/entered |
| B3 | Intro opacity via zustand | done | Continuous fades via `--intro-*` CSS vars; discrete `introAsking`/`introSkip`/`introDone` only |
| B4 | Chrome re-renders on hover | done | `useSceneHover` + `HoverHint`; DetailPanel sibling of Chrome (not under hover parent) |
| B5 | `filter: blur` / backdrop over canvas | done | Stage overlays use opacity/transform; solid elevated bg instead of backdrop-filter |

### Tier C — server / forge

| ID | Bottleneck | Status | Notes |
| --- | --- | --- | --- |
| C1 | 6 sequential xAI prose polls | done | Wave 3: `proseAdvanceBatch` ≤3 via `Promise.allSettled` |
| C2 | Forge `select *` every 1.6s | done | Wave 3: lean status cols; full blobs when ready |
| C3 | Uncached geocode | done | Wave 3: in-memory Map by normalized place |
| C4 | Dual Neon pools | done | Wave 3: shared `getNeonPool` |
| C5 | Desk `loadDesk` every AI call | done | Wave 3: process memo + invalidate on save |

## Wave log

| Wave | Round | VERDICT | EVIDENCE | LARGEST GAP |
| --- | --- | --- | --- | --- |
| 1 | build | PENDING critic | Tier A A1–A7 landed; birthchat-slide 19/19, vault-phase 3/3, forge 8/8, tsc clean. BAR(1) Chrome Performance not captured this wave. | Critic must measure mid-session frame time on fly + gather + BirthChat slide against ≤16.7ms / no >50ms long tasks |
| 2 | build | PASS (builder) BAR(2) | Import graph: `store.ts` + `VaultApp.tsx` static walk → 0 value imports of `three`/`@react-three` (`scripts/check-bar2-import-graph.mjs`). ChartCanvas remains `import()`. birthchat-slide 19/19, vault-phase 3/3, forge+geocode tests green, `tsc` clean. | Blind critic should re-run import graph; overlay thrash not measured in Chrome |
| 3 | build | PASS (builder) | C1–C5 in `bdd8a10`; forge advance batches keys; lean poll path | Live XAI wall-clock not measured |

## Remaining gaps

- **BAR(1)** — needs blind critic Chrome Performance on `/` fly + plate gather + BirthChat slide.
- Wave 4 integration smooth + reduced-motion sanity after B/C (not run this wave).
- Wave 2 critic: confirm no overlay thrash from remaining discrete intro flags / hover store.
