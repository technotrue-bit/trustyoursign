# Seamless Sign-Enter Dive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make click → dive → first (hub) star one continuous ~4.5s motion with plate-before-bloom guarantees, a soft-blackout Skip, and a quiet dive HUD — without changing post-land claim/auth/lore.

**Architecture:** One clock `exploreProgress` (`p` 0→1) drives pure curve helpers in `signGalaxy.ts`. `travel.ts` advances `p`, owns `enterSkip` (`idle|out|hold|in`) + veil opacity, and lands via existing `landInsideHub`. `GalaxyIntro` reads continuous dive/form windows (no phase-stepped camera). `SignGalaxyHud` shows Skip-only during dive, a deliberate black veil on Skip, and fades hub chrome in after `p = 1`.

**Tech Stack:** TypeScript, Zustand (`useGalaxy`), React 19, Three/R3F (`GalaxyIntro`), Node test runner (`npx tsx --test` / existing `npm test` paths).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-08-seamless-sign-enter-dive-design.md`
- Full enter **~4.5s**; reduced motion **~0.7s** on the **same** curve family
- At `p = 0.30`: `plateFade < 0.05` and `galaxyForm < 0.08`
- Skip = soft blackout (`out` → `hold` land under veil → `in`); never snap-to-empty
- Normal dive never uses the blackout path
- Dive HUD: Skip only (auth slot may stay in the intro top-right corner); no “Entering the form…”
- Hub claim/auth/lore behavior unchanged after land
- Do **not** reorder `CONSTELLATIONS` / tropical indices / calendar strip mapping
- Do **not** rewrite exit ceremony, claim/auth shells, or free 6DOF corridor
- Commit after each task; keep `npm test` and `npm run typecheck` green at task boundaries that touch runtime code

## File map

| File | Responsibility |
| --- | --- |
| Modify `src/lib/galaxy/signGalaxy.ts` | Retune `enterWorldFade` / `enterPlateFade` / `enterGalaxyForm` / `enterDive`; add `enterHubSettle` |
| Modify `src/lib/galaxy/signGalaxy.test.ts` | Hard plate-before-bloom + window unit tests |
| Modify `src/lib/galaxy/travel.ts` | `ENTER_SEC = 4.5`; reduced enter ~0.7s; `enterSkip` machine; publish veil; freeze `p` during Skip `out` |
| Create `src/lib/galaxy/enterSkip.test.ts` | Skip transitions + land-under-hold + spam ignore |
| Modify `src/lib/galaxy/store.ts` | Explore UI: `skipPhase`, `skipVeil` (for HUD) |
| Modify `src/components/scene/GalaxyIntro.tsx` | Continuous dive/FOV/look from curves + `enterHubSettle`; less laggy dive lerp while entering |
| Modify `src/components/overlay/SignGalaxyHud.tsx` | Quiet dive; Skip veil; hub fade-in after inside |
| Modify `src/components/overlay/GalaxyShell.tsx` | No competing chrome mid-dive (verify Skip slot parity only) |
| Modify `package.json` | Append `enterSkip.test.ts` to `test` script |

---

### Task 1: Retune enter curves + plate-before-bloom tests

**Files:**
- Modify: `src/lib/galaxy/signGalaxy.ts` (ease helpers at end of file)
- Modify: `src/lib/galaxy/signGalaxy.test.ts`

**Interfaces:**
- Consumes: local `smooth01`
- Produces (exact signatures):
  - `enterWorldFade(progress: number): number` — window `0.00 → 0.22` (opacity of world chrome; 1 at start)
  - `enterPlateFade(progress: number): number` — window `0.00 → 0.28` (plate opacity; **&lt; 0.05 by p=0.30**)
  - `enterGalaxyForm(progress: number): number` — window `0.28 → 0.92` (**&lt; 0.08 by p=0.30**)
  - `enterDive(progress: number): number` — window `0.08 → 0.78`
  - `enterHubSettle(progress: number): number` — window `0.75 → 1.00` (0→1 look bias to hub)

- [ ] **Step 1: Write the failing tests**

Replace the existing `"enter fades plate before galaxy fully forms"` block in `src/lib/galaxy/signGalaxy.test.ts` with:

```ts
import {
  buildSignGalaxy,
  enterDive,
  enterGalaxyForm,
  enterHubSettle,
  enterPlateFade,
  enterWorldFade,
  getSignGalaxy,
  pickMajorStarIndices,
} from "./signGalaxy";

  it("enter windows: plate dead before bloom; dive and hub settle ranges", () => {
    assert.ok(Math.abs(enterWorldFade(0) - 1) < 0.02);
    assert.ok(enterWorldFade(0.22) < 0.05);
    assert.ok(Math.abs(enterPlateFade(0) - 1) < 0.02);
    // Hard guarantee at p = 0.30
    assert.ok(enterPlateFade(0.3) < 0.05);
    assert.ok(enterGalaxyForm(0.3) < 0.08);
    assert.ok(enterGalaxyForm(0.28) < 0.02);
    assert.ok(Math.abs(enterGalaxyForm(1) - 1) < 0.02);
    assert.ok(enterDive(0.08) < 0.02);
    assert.ok(enterDive(0.78) > 0.98);
    assert.ok(enterHubSettle(0.75) < 0.02);
    assert.ok(Math.abs(enterHubSettle(1) - 1) < 0.02);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/galaxy/signGalaxy.test.ts`

Expected: FAIL — either `enterHubSettle` not exported, and/or `enterPlateFade(0.3) < 0.05` / `enterGalaxyForm(0.3) < 0.08` assertions fail on current windows (form still starts at `0.18`).

- [ ] **Step 3: Write minimal implementation**

In `src/lib/galaxy/signGalaxy.ts`, replace the ease helpers with:

```ts
/** Ease helpers for the enter choreography (single p clock; overlapping windows). */
export function enterWorldFade(progress: number) {
  return 1 - smooth01(Math.min(1, progress / 0.22));
}

export function enterPlateFade(progress: number) {
  // Spec: plate opacity 0.00 → 0.28; dead before bloom.
  return 1 - smooth01(Math.min(1, progress / 0.28));
}

export function enterGalaxyForm(progress: number) {
  // Spec: bloom 0.28 → 0.92 — starts only after plate is already dead.
  return smooth01(Math.max(0, Math.min(1, (progress - 0.28) / (0.92 - 0.28))));
}

export function enterDive(progress: number) {
  return smooth01(Math.max(0, Math.min(1, (progress - 0.08) / (0.78 - 0.08))));
}

export function enterHubSettle(progress: number) {
  return smooth01(Math.max(0, Math.min(1, (progress - 0.75) / (1 - 0.75))));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/galaxy/signGalaxy.test.ts`

Expected: PASS (all `signGalaxy` tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/galaxy/signGalaxy.ts src/lib/galaxy/signGalaxy.test.ts
git commit -m "feat(galaxy): retune enter curves for plate-before-bloom"
```

---

### Task 2: EnterSkip state machine + land under veil

**Files:**
- Modify: `src/lib/galaxy/travel.ts`
- Modify: `src/lib/galaxy/store.ts`
- Create: `src/lib/galaxy/enterSkip.test.ts`
- Modify: `package.json` (`test` script — append `src/lib/galaxy/enterSkip.test.ts`)

**Interfaces:**
- Consumes: `enterAnimating`, `landInsideHub` (keep private), `applyEnterCurves`, `prefersReducedMotion`, `publishExplore`
- Produces:
  - `export type EnterSkipPhase = "idle" | "out" | "hold" | "in"`
  - `galaxyTravel.enterSkip: EnterSkipPhase` (default `"idle"`)
  - `galaxyTravel.skipVeil: number` (0..1)
  - `galaxyTravel.enterSkipElapsed: number` (seconds in current skip phase)
  - Explore UI fields: `skipPhase: EnterSkipPhase`, `skipVeil: number` on `ExploreUi` / `IDLE_EXPLORE` / `publishExplore` / store equality check
  - `skipEnterGalaxy(): boolean` — starts `out` if entering and idle; **ignores** spam when `enterSkip !== "idle"`
  - `stepExplore(dt)` — while `enterSkip !== "idle"`, advances skip machine (does **not** advance `p` during `out`); on first frame of `hold`, calls `landInsideHub()` then keeps veil at 1; `in` fades veil down then clears skip to idle
  - Durations (full motion): `out` **0.42s**, `hold` **0.2s**, `in` **0.48s**; reduced: `out` **0.18s**, `hold` **0.1s**, `in` **0.22s**
  - `ENTER_SEC = 4.5`; reduced enter rate **0.7** (replace current `0.55`)
  - `enterAnimating()` true while phase is `fading`/`diving` **or** `enterSkip !== "idle"`
  - `resetExplore` clears skip fields to idle/0

- [ ] **Step 1: Write the failing tests**

Create `src/lib/galaxy/enterSkip.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  enterSignGalaxy,
  skipEnterGalaxy,
  stepExplore,
  galaxyTravel,
  resetExplore,
  resetTravel,
} from "./travel.ts";

describe("enterSkip soft blackout", () => {
  beforeEach(() => {
    resetTravel(false);
    galaxyTravel.birth = 1;
    resetExplore(true);
  });

  it("skipEnterGalaxy starts out and ignores spam", () => {
    assert.equal(enterSignGalaxy(0), true);
    assert.equal(galaxyTravel.explorePhase, "fading");
    assert.equal(skipEnterGalaxy(), true);
    assert.equal(galaxyTravel.enterSkip, "out");
    assert.equal(skipEnterGalaxy(), false);
    assert.equal(galaxyTravel.enterSkip, "out");
  });

  it("out → hold lands under veil at p=1 inside; then in → idle", () => {
    assert.equal(enterSignGalaxy(0), true);
    assert.equal(skipEnterGalaxy(), true);
    // Drain out
    stepExplore(0.5);
    assert.equal(galaxyTravel.enterSkip, "hold");
    assert.equal(galaxyTravel.explorePhase, "inside");
    assert.equal(galaxyTravel.exploreProgress, 1);
    assert.ok(galaxyTravel.skipVeil > 0.95);
    // Drain hold
    stepExplore(0.25);
    assert.equal(galaxyTravel.enterSkip, "in");
    // Drain in
    stepExplore(0.6);
    assert.equal(galaxyTravel.enterSkip, "idle");
    assert.ok(galaxyTravel.skipVeil < 0.05);
    assert.equal(galaxyTravel.explorePhase, "inside");
  });

  it("normal stepExplore does not raise skipVeil", () => {
    assert.equal(enterSignGalaxy(0), true);
    stepExplore(0.2);
    assert.equal(galaxyTravel.enterSkip, "idle");
    assert.ok(galaxyTravel.skipVeil < 0.01);
  });
});
```

Note: if `enterSignGalaxy` fails because intro is “playing”, stub by ensuring `intro` is done — call whatever the file already uses in other tests, or set `galaxyTravel.birth = 1` and temporarily mock `introPlaying` if needed. Prefer calling `skipIntro()` / ensuring intro store is done before enter. If the module gates on `introPlaying()`, import and force intro complete the same way production Skip does after birth.

If `enterSignGalaxy` still returns false in tests, add a tiny test-only escape **only if required**: export `forceExploreEnterForTest(index: number)` that sets phase/`applyEnterCurves(0)` without intro checks — document it in the test file and do not call from UI.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/galaxy/enterSkip.test.ts`

Expected: FAIL — `enterSkip` / property missing or `skipEnterGalaxy` still snaps via immediate `landInsideHub`.

- [ ] **Step 3: Write minimal implementation**

In `travel.ts` (sketch — match names above exactly):

```ts
export type EnterSkipPhase = "idle" | "out" | "hold" | "in";

const ENTER_SEC = 4.5;
const SKIP_OUT = 0.42;
const SKIP_HOLD = 0.2;
const SKIP_IN = 0.48;
const SKIP_OUT_RM = 0.18;
const SKIP_HOLD_RM = 0.1;
const SKIP_IN_RM = 0.22;

// on galaxyTravel:
// enterSkip: "idle" as EnterSkipPhase,
// enterSkipElapsed: 0,
// skipVeil: 0,

function skipDurations() {
  return prefersReducedMotion()
    ? { out: SKIP_OUT_RM, hold: SKIP_HOLD_RM, in: SKIP_IN_RM }
    : { out: SKIP_OUT, hold: SKIP_HOLD, in: SKIP_IN };
}

function clearEnterSkip() {
  galaxyTravel.enterSkip = "idle";
  galaxyTravel.enterSkipElapsed = 0;
  galaxyTravel.skipVeil = 0;
}

export function enterAnimating() {
  if (galaxyTravel.enterSkip !== "idle") return true;
  const p = galaxyTravel.explorePhase;
  return p === "fading" || p === "diving";
}

export function skipEnterGalaxy() {
  if (galaxyTravel.enterSkip !== "idle") return false;
  if (!(galaxyTravel.explorePhase === "fading" || galaxyTravel.explorePhase === "diving")) {
    return false;
  }
  galaxyTravel.enterSkip = "out";
  galaxyTravel.enterSkipElapsed = 0;
  noteControl();
  publishExplore();
  return true;
}

function stepEnterSkip(dt: number) {
  const d = skipDurations();
  galaxyTravel.enterSkipElapsed += dt;
  const phase = galaxyTravel.enterSkip;
  if (phase === "out") {
    const u = Math.min(1, galaxyTravel.enterSkipElapsed / d.out);
    galaxyTravel.skipVeil = smooth01(u);
    if (u >= 1) {
      galaxyTravel.enterSkip = "hold";
      galaxyTravel.enterSkipElapsed = 0;
      galaxyTravel.skipVeil = 1;
      landInsideHub();
    }
    publishExplore();
    return;
  }
  if (phase === "hold") {
    galaxyTravel.skipVeil = 1;
    if (galaxyTravel.enterSkipElapsed >= d.hold) {
      galaxyTravel.enterSkip = "in";
      galaxyTravel.enterSkipElapsed = 0;
    }
    publishExplore();
    return;
  }
  if (phase === "in") {
    const u = Math.min(1, galaxyTravel.enterSkipElapsed / d.in);
    galaxyTravel.skipVeil = 1 - smooth01(u);
    if (u >= 1) clearEnterSkip();
    publishExplore();
  }
}

export function stepExplore(dt: number) {
  if (galaxyTravel.enterSkip !== "idle") {
    stepEnterSkip(dt);
    return;
  }
  // ... existing exiting / inside / enter advance ...
  const rate = prefersReducedMotion() ? 0.7 : ENTER_SEC;
  // ...
}
```

Update `publishExplore` / `ExploreUi` / `IDLE_EXPLORE` / `resetExplore` / store shallow-equal to include `skipPhase` + `skipVeil`.

Append `src/lib/galaxy/enterSkip.test.ts` to the `npx tsx --test …` list in `package.json`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx tsx --test src/lib/galaxy/enterSkip.test.ts src/lib/galaxy/signGalaxy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/galaxy/travel.ts src/lib/galaxy/store.ts src/lib/galaxy/enterSkip.test.ts package.json
git commit -m "feat(galaxy): soft-blackout Skip via enterSkip state machine"
```

---

### Task 3: Continuous camera dive + hub settle in GalaxyIntro

**Files:**
- Modify: `src/components/scene/GalaxyIntro.tsx` (camera block ~947–1006 and any dive lerp)

**Interfaces:**
- Consumes: `galaxyTravel.diveBlend`, `galaxyTravel.galaxyForm`, `galaxyTravel.explorePhase`, `enterHubSettle` from `signGalaxy.ts`
- Produces: camera Z pull and FOV driven continuously from curve values while exploring; hub look bias scaled by `enterHubSettle(p)` during enter and full bias when `inside`

- [ ] **Step 1: Write the failing characterization (manual assert via code comment + typecheck)**

No new unit test for Three camera (no WebGL in node). Add an import of `enterHubSettle` and use it in the explore look block so typecheck fails until wired:

Ensure `GalaxyIntro.tsx` imports:

```ts
import { enterHubSettle, getSignGalaxy /* existing */ } from "@/lib/galaxy/signGalaxy";
```

- [ ] **Step 2: Confirm current lag path (read-only check)**

Confirm the enter dive still uses `lerpToward` on `diveAmount` with `rate: exploring ? 1.35 : 2.2`. That lag is the stepped feel — Task 3 removes it for explore enter.

- [ ] **Step 3: Minimal camera wiring**

In the explore dive section:

1. While `exploring` and enter animating (`fading`/`diving`) **or** `inside`, set dive pull more directly from the curve:

```ts
const exploreDive =
  exploring && galaxyTravel.exploreSignIndex != null
    ? galaxyTravel.diveBlend * (2.4 + galaxyTravel.galaxyForm * 4.8)
    : 0;
const diveTarget = Math.max(volumeDive, exploreDive);
// During sign-enter (not BirthChat volume-only), track the curve tightly:
const diveRate =
  exploring && galaxyTravel.exploreSignIndex != null
    ? galaxyTravel.explorePhase === "inside"
      ? 3.2
      : 6.5
    : 2.2;
diveAmount.current = lerpToward({
  current: diveAmount.current,
  target: diveTarget,
  dt: d,
  rate: diveRate,
});
```

2. Hub settle look bias (inside the `exploring && exploreSignIndex` look block):

```ts
const settle =
  galaxyTravel.explorePhase === "inside"
    ? 1
    : enterHubSettle(galaxyTravel.exploreProgress);
if (settle > 0.001) {
  _cam.x += (_look.x - _cam.x) * (0.045 * settle);
  _cam.y += (_look.y - _cam.y) * (0.035 * settle);
  _look.lerp(_chest, 0.55 * settle);
}
```

Remove the old `if (explorePhase === "inside") { … }` block that only applied bias after land, replacing it with the settle-scaled version above.

3. Keep FOV formula `frame.fov / (0.88 + galaxyTravel.galaxyForm * 0.35)` — form window already delayed to 0.28 so FOV won’t jump while plate is still readable.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

Expected: PASS (no unused import; `enterHubSettle` used).

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/GalaxyIntro.tsx
git commit -m "feat(galaxy): continuous enter camera from dive and hub-settle curves"
```

---

### Task 4: Quiet dive HUD + Skip veil + hub fade-in

**Files:**
- Modify: `src/components/overlay/SignGalaxyHud.tsx`
- Modify: `src/components/overlay/GalaxyShell.tsx` (only if mid-dive chrome still competes — verify `worldFade` already dims corridor chrome)

**Interfaces:**
- Consumes: `explore.phase`, `explore.skipPhase`, `explore.skipVeil` from `useGalaxy`
- Produces: Skip button only while entering and `skipPhase === "idle"`; full-screen black veil `opacity: skipVeil` with `pointer-events-none` (lock layer still owns input); no centered “Entering the form…”; hub copy/CTAs visible only when `inside`, with `opacity` transition ~350ms

- [ ] **Step 1: Failing UI contract (document as assertions in a tiny pure helper optional)**

Prefer keeping logic in the component. If you want a unit hook, skip it — visual contract is verified in Task 5.

- [ ] **Step 2: Implement HUD**

In `SignGalaxyHud.tsx`:

1. Read `skipPhase` / `skipVeil` from `explore` (after Task 2 fields exist).
2. `entering` stays `fading || diving` **or** treat lock as `enterAnimating` equivalent: `entering || skipPhase !== "idle"`.
3. Remove the centered `<p>Entering the form…</p>` branch entirely. While not `inside`, the center column renders `null` (or empty).
4. Skip button: show only when `(phase === "fading" || phase === "diving") && skipPhase === "idle"`. Keep `AuthSlot` beside it in the intro top-right slot.
5. Add veil:

```tsx
{explore.skipVeil > 0.001 ? (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 z-[70] bg-black"
    style={{ opacity: explore.skipVeil }}
  />
) : null}
```

6. Hub chrome (`Back`, title, star copy, point dots, claim CTAs): wrap in a container with:

```tsx
className={cn(
  "transition-opacity duration-[350ms]",
  inside ? "opacity-100" : "opacity-0",
)}
```

Ensure `pointer-events-none` when not inside so invisible hub buttons cannot steal taps during dive.

7. Screen lock overlay remains for the whole enter (including skip phases).

- [ ] **Step 3: GalaxyShell check**

Open `GalaxyShell.tsx`. Confirm corridor chrome already multiplies by `explore.worldFade`. Do **not** add a second Skip. If any mid-dive label still shows at full opacity, multiply that node by `worldFade` only — no new copy.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/overlay/SignGalaxyHud.tsx src/components/overlay/GalaxyShell.tsx
git commit -m "feat(galaxy): quiet dive HUD with soft Skip veil and hub fade-in"
```

---

### Task 5: Verification — unit suite + browser enter/Skip

**Files:**
- None required (verification only). Fix regressions in the files already touched if smoke fails.

- [ ] **Step 1: Run automated tests**

```bash
npm test
npm run typecheck
```

Expected: PASS (including `signGalaxy` + `enterSkip`).

- [ ] **Step 2: Dev preview enter path**

Ensure app is up via `sh /workspace/startup.sh`. Manually (or `agent-browser` per `.grok/references/browser-qa.md`):

1. Select a sign and enter.
2. Confirm ~4.5s continuous dive: plate gone early; bloom after; no “Entering the form…”.
3. Hit Skip mid-dive: soft black → brief hold → hub fades up (galaxy already there). Not an empty flash.
4. Spam Skip: only one blackout.
5. After land, hub claim/auth/lore CTAs behave as before.

- [ ] **Step 3: Commit any QA fixes**

```bash
git add -A
git commit -m "fix(galaxy): polish seamless enter dive after QA"
```

(Only if fixes were needed; otherwise skip this commit.)

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Single `p` clock + overlapping windows | 1 |
| Plate ≤0.05 / form &lt;0.08 at p=0.30 | 1 |
| ~4.5s / ~0.7s reduced | 2 |
| Skip soft blackout out/hold/in | 2 |
| Land under veil on hold (`inside`, p=1) | 2 |
| Ignore Skip spam | 2 |
| Continuous camera (no phase-step feel) | 3 |
| Hub settle 0.75→1 | 1 + 3 |
| Quiet HUD / no “Entering…” | 4 |
| Veil presentation only | 4 |
| Post-land gate unchanged | 2 (landInsideHub) + 4 (fade-in only) |
| Tropical order untouched | Global — no constellation edits |

## Placeholder scan

No TBD / “implement later” / “similar to Task N” steps. All signatures and durations are concrete.

## Type consistency

- `EnterSkipPhase` / `enterSkip` / `skipPhase` / `skipVeil` named consistently across travel, store, HUD.
- Curve helpers: `enterWorldFade`, `enterPlateFade`, `enterGalaxyForm`, `enterDive`, `enterHubSettle`.
- Land helper remains `landInsideHub` (private); Skip calls it only at hold start.
