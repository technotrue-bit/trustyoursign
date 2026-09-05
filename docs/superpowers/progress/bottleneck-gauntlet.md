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
| 4 | integrate | PASS (builder) | Integration: A4 phase mutex intact with B2 lazy overlays (mutex in `GalaxyIntro` SignDisk/BirthNebula/Station; overlays gated by phase only). Reduced-motion: `bootIntro` skip + `prefersReducedMotion` disk freeze + CSS `@media` still present. Forge resume: VaultApp mount still `import("./ChartForge").then(resumeForgeIfAny)`. birthchat-slide math untouched (19/19). Full verify: `npm test` 81 pass / 0 fail; `typecheck` clean; `build` clean. BAR(2) re-run: `threeValueImports: 0`, `threeDynamicOnly: 0`, 54 modules. BAR(1) not measured (no Chrome Performance mid-phone profile this wave — critic-pending). No integration bugs found; no code fixes. | **BAR(1)** Chrome Performance mid-session ≤16.7ms / no >50ms long tasks on mid-phone profile — still critic-pending |
| 4 | critic | **FAIL** BAR(1) | Blind critic. Method: Playwright Chromium + CDP `Emulation.setCPUThrottlingRate: 4`, viewport **390×844** DPR2, headless, `/` after Skip. Harness `scripts/measure-bar1-frames.mjs` (rAF pacing + `PerformanceObserver` longtask). Hot path (fly + plate gather + BirthChat slide): **avg 16.832ms** (limit 16.7), **1 long task 78ms** (BirthChat slide), max rAF **66.7ms**. Fly alone: avg 16.914ms, max 50ms, 0 longtasks. Plate gather: avg **16.666ms**, max 16.8ms, 0 longtasks. Settle baseline: avg 16.564ms clean. Artifact: `screenshots/bar1-frame-measure.json`. BAR(2) re-check: `node scripts/check-bar2-import-graph.mjs` → `threeValueImports: 0` (54 modules). BAR(3): `FORGE_PROSE_BATCH = 3` + `proseAdvanceBatch` + `Promise.allSettled` in `forge-api.ts` (no live XAI). | **BirthChat slide open** — 78ms main-thread long task when claiming sign / mounting dock (lazy BirthChat + slide); primary BAR(1) miss. Secondary: hot-path avg 16.832ms slightly over 16.7 |
| 4 | build (gap) | PENDING critic | Closed BirthChat claim long-task: defer React dock `set()` to `setTimeout(0)` while arming `galaxyTravel.dockSlide`/`dockSign` for immediate 3D slide; idle-warm BirthChat chunk; shell→body split; year options on focus; skip redundant `seekSign`; memo fly chrome; dynamic forge/sky/charts imports. Measure (`measure-bar1-frames.mjs`, 390×844 + 4× CPU): **0 long tasks** (was 78ms); birthchat-slide longTaskMax **0**; hot-path avg **16.882ms** still >16.7; max rAF 50ms. birthchat-slide + vault-phase tests green; `tsc` clean. | Residual: hot-path avg 16.882ms > 16.7 (fly spikes); not the prior 78ms dock long task |
| 4 | critic (re-judge) | **FAIL** BAR(1) | Fresh blind critic on `4228cb1`. Same harness/conditions: 390×844 DPR2, CDP CPU 4×, Skip → strip fly → plate gather → BirthChat claim (no forge). Hot path: avg **16.783ms** (limit 16.7), max rAF 50ms, **0 long tasks** / longTaskMax 0 (prior 78ms closed). Phases: settle 16.596; fly **16.873** (max 50, 2× >33.4); plate gather **16.666**; birthchat-slide 16.781 / 0 LT. Artifact: `screenshots/bar1-frame-measure.json`. BAR(2): `threeValueImports: 0` (54 modules). BAR(3): `FORGE_PROSE_BATCH = 3` + `proseAdvanceBatch` + `Promise.allSettled` in forge path. | **fly-sign-travel** avg 16.873ms (and ~50ms rAF spikes) — primary remaining BAR(1) miss; BirthChat long-task gap closed |
| 4 | build (fly gap) | PENDING critic | Closed fly-sign-travel cost: prebake morph attrs on image-ready; TempleRig uses aimed volume only (no mid-seek `getSignVolume` builds); mid-flight station cores off + thin plate path; SignDisk frozen/hidden during seek; celestial arms/field/haze/corners/dust off while seeking; skip direct-seek `t` publish churn; CLOUD_N 1100/1800. Measure (390×844 + 4× CPU, multi-run): fly avg **~16.71–16.75** (was **16.873**); fly max **~33ms** (was **50**); long tasks **0**; hot-path avg **~16.70–16.73** (borderline ≤16.7 — run-to-run variance from rare ~33ms rAF). birthchat-slide + vault-phase tests green; `tsc` clean. BirthChat dock deferral untouched. | Residual: hot-path avg still flirts with 16.7 under variance; occasional ~33ms rAF (not >50 longtask) |
| 4 | critic (re-judge fly) | **FAIL** BAR(1) | Fresh blind critic on `06241ed`. Same harness: 390×844 DPR2, CDP CPU 4×, Skip → strip fly → plate gather → BirthChat claim (no forge). **3 runs** (variance high): (1) hot **16.683** PASS / fly **16.707** / LT **0**; (2) hot **16.716** FAIL / fly **16.707** / birth **16.779** max rAF **33.4** / LT **0**; (3) hot **16.683** PASS / fly **16.707** / LT **0**. Median hot **16.683**; worst hot **16.716**. Long tasks **0** all runs (no >50ms). Fly improved vs prior critic **16.873** but stays **16.707**. Fail run driven by rare ~33ms rAF in birthchat-slide, not a longtask. Artifact: `screenshots/bar1-frame-measure.json` (= run2 FAIL) + `bar1-critic-run{1,2,3}.json`. BAR(2): `threeValueImports: 0` (54). BAR(3): `FORGE_PROSE_BATCH = 3` + `proseAdvanceBatch` + `Promise.allSettled`. | **Hot-path avg still not reliably ≤16.7** — worst **16.716** (birthchat ~33ms rAF); fly alone steady **16.707** |
| 4 | build (dock rAF gap) | PENDING critic | Closed rare birthchat-slide ~33ms rAF / hot-avg variance: SignDisk freeze + station cores off while dock open; FOV/well gated behind `dockCamReady` (no snap); full-seek midFly thin until seek ends; defer neighbor `primeSignArt` off seek-start; BirthChat shell thinner + body at 48ms; dockPaint 3 rAF. Prior claim deferral (`4228cb1`) + mid-flight thin (`06241ed`) kept. Measure 3× (390×844 + 4× CPU): hot **16.683 / 16.683 / 16.683** all PASS; birth **16.666** max **16.8**; LT **0**; fly **~16.707**. birthchat-slide + vault-phase tests green; `tsc` clean. | Critic re-judge for reliable ≤16.7 worst-of-3 |

## Critic round (blind re-judge)

**VERDICT: FAIL** BAR(1) — hot-path avg not reliably ≤16.7 under multi-run (worst **16.716**); long-task criterion met (**0** >50ms).

**EVIDENCE**
- HEAD `06241ed`; method: `node scripts/measure-bar1-frames.mjs`, viewport **390×844** DPR2, CDP CPU **4×**, Skip → fly → plate gather → BirthChat claim.
- Run1: hot **16.683** / fly **16.707** / max **33.3** / LT **0** → PASS
- Run2: hot **16.716** / fly **16.707** / birth **16.779** max **33.4** / LT **0** → FAIL
- Run3: hot **16.683** / fly **16.707** / max **33.3** / LT **0** → PASS
- Median hot **16.683**; worst **16.716**. Fly phase identical **16.707** all three (down from prior critic **16.873**).
- BAR(2) light: `threeValueImports: 0` (54 modules). BAR(3) light: batch=3 + `Promise.allSettled` present.

**LARGEST GAP:** Hot-path avg still exceeds **16.7** on noisy runs (**16.716** worst) when a ~33ms rAF lands (observed in birthchat-slide on fail run)—not a >50ms long task; fly alone holds at **16.707**.

## Remaining gaps

- **BAR(1)** — builder closed dock ~33ms gap under 3× measure (hot **16.683** all PASS); critic re-judge pending for reliable ≤16.7.
- Overlay thrash (Wave 2 residual) — not re-measured; secondary to BAR(1).
- Live XAI forge wall-clock (Wave 3 residual) — batching landed; end-to-end timing not measured.

## Close-out

Remediation waves 1–4 are complete (Tier A/B/C + integration). **BAR(2)** and **BAR(3)** hold under blind re-check. **BAR(1)** BirthChat long-task closed; fly-travel improved; dock rAF gap closed in builder measure (3/3 PASS at **16.683**) — **critic re-judge pending**.
