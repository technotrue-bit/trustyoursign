# Aries ignition hand-off — plan (gauntlet cycle)

Orchestrator never writes production code. One core (the ignition hand-off) — every file below
shares the enter-clock interface, so splitting into parallel cores would guarantee interface drift.

## Phase 0 — freeze map + baselines (done, orchestrator)

- Spec + metric sheet: `docs/superpowers/specs/2026-09-15-aries-ignition-handoff-design.md`.
- Incumbent measured with REAL runs: `screenshots/aries-base` (Aries entry capture) +
  `python scripts/qa/frame_stats.py` → the table in the spec. Suite: 173 pass / 0 fail.
- Reference measured: `artifacts/ref-f6d5ea0a/` (frames + `grid_01/02.png`).

## Phase 1 — Build (builder subagent, round 1)

Owned files: `src/lib/galaxy/signBurst.ts` (new) + test, `signCore.ts`, `signGalaxy.ts` + test,
`travel.ts`, `flightDust.ts`, `src/components/scene/SignGalaxyField.tsx`,
`src/components/scene/GalaxyIntro.tsx`, `package.json` (test list).
Do-not-touch: landing pose/bias, `landingShift`/`landingRoll`, HUD copy, other 11 signs' art,
`scripts/qa/*`.

Builder must self-check before reporting (and may not weaken a test to pass):
1. `npm test` → all pass
2. `npm run typecheck` → clean
3. `node scripts/qa/enter-capture.mjs 0 screenshots/aries-v1` → frames
4. `python scripts/qa/frame_stats.py screenshots/aries-v1/*.png` → M1–M5 numbers

Returns: artifact (files changed) + raw evidence (commands and output). No reasoning narrative.

## Phase 2 — Critic (fresh subagent, round N)

Context ONLY: spec + metric sheet + reference contactsheets + the artifact + the evidence.
Never: builder session, reasoning, prior verdicts, round number. Judges against the incumbent
and scans sibling surfaces for regression (landing pose, HUD, other signs).
Returns PASS with an evidence table, or FAIL with **exactly one** gap (the largest) + the metric it fails.

## Phase 3 — One-gap loop

FAIL → relay that gap **verbatim** to a fresh builder subagent of the same role, which receives
only its own artifact + the gap. Hard cap: **3 rounds**. 3rd FAIL → escalate to Captain with the
three gaps and a recommendation.

## Phase 4 — Whole-app gauntlet (fresh integration critic)

Gate commands (run, not trusted):
- `npm test` (full suite, tail reported)
- `npm run typecheck`
- `npm run build`
- 12 landings: `QA_W=960 QA_H=540 node scripts/qa/landed-probe.mjs <0..11> <png>` → hub NDC + no errors
- Aries entry capture + stats vs the incumbent table
- sibling scan: HUD copy band luma, other signs' landings, no new console errors

FAIL → one gap → back to the builder (rounds continue under the same cap). PASS → Phase 5.

## Phase 5 — Verify & land (orchestrator)

- Orchestrator re-runs the gate commands itself (never a subagent self-report).
- Commit with **explicit paths** (never `git add -A`; shared worktree), push to the PR branch.
- Update the metric sheet with measured deltas; the next cycle judges against the new incumbent.

## Reproduction commands

```
npm run dev                                   # :8080 — restart if refused (it has died mid-session)
node scripts/qa/enter-capture.mjs 0 screenshots/aries-vN
python scripts/qa/frame_stats.py screenshots/aries-vN/*.png
QA_W=960 QA_H=540 node scripts/qa/landed-probe.mjs <0..11> screenshots/r6-s<i>.png
npm test ; npm run typecheck ; npm run build
```

Pitfalls inherited from this repo: the sweep binary (`sign-sweep.mjs`) dies after ~4 signs — use
per-sign `landed-probe.mjs`; a log written with `>` inside a background terminal call can vanish —
capture through the session log; verify the dev server answers 200 before trusting any probe.

## Round 2 result (M11 fixed)

The plate now holds full opacity until the burst peak and dies by the dissolve mask:
measured from `screenshots/aries-v4*/states.json` — `plateFade` = 1.000 at p 0.19/0.22/0.26/0.30/0.36,
burst reaches 1.000 at p 0.274 while the plate is still 1.000, and at p 0.615 the dissolve is 1.000
while the fade has only reached 0.943 (mask first, fade second). Round 1 was 0.708 / 0.55 / 0.357 /
0.21 / 0.052 at the same p values.

M1-M5 re-measured equal-or-better at matched progress (centre-bright 42.86 vs 42.50, lit 68.62 vs
67.57 at p ~0.62); the gate run's raw 2.0s shot reads lower only because it sampled p 0.655 instead
of 0.627. Landing spot-check on Libra (a sign round 2 never probed): hubNdcY 0.296, x = 0.
Suite 194/193/1 (the pinned chart failure), typecheck clean.

Cleanups resolved: `burstSpinAt` is now referenced by the sprite rotation; `clearSignBurstCache` is
consumed by `resetCaches()`; the plate shader consumes the exported GLSL/uniform builder from
`signBurst.ts` so the shader and the unit-tested function share one seed derivation.

**Rejected metric, recorded so nobody re-proposes it:** angular irregularity (std/mean over 72
angular bins in an annulus) does NOT measure "organic vs stock radial flare" — the reference's peak
scores LOWER (0.119-0.206) than ours (0.305-0.344) purely because it is saturated (mean luma 137 vs
61-97); uniform white reduces angular variance. It tracks exposure, not structure. Ray smoothness
therefore stays a non-gating polish note, and both vision passes' "hard-edged wireframe" remark is a
misread of the constellation's own line art, which is intentional.
