# Sign Galaxy Land Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After land (`explorePhase === "inside"`), force-hide corridor leftovers so the sky reads as animal-star field + soft haze, keep hub copy in the lower third and readable, and strip temporary debug ingest logs.

**Architecture:** Add a pure `insideHardGateHidesLeftovers(phase)` helper (testable without R3F). Scene layers (`SignDisk`, `CornerGalaxies`, Station gather cloud / plate / shell) consult it when deciding visibility. Enter dive curves stay unchanged. HUD lower-third + wash already drafted in `SignGalaxyHud` / `styles.css` — confirm and keep. Soft ambient fog/haze may remain; warm additive particle smears must not.

**Tech Stack:** TypeScript, React 19, Three/R3F, Zustand explore mirrors via `galaxyTravel` / `useGalaxy`, Node test runner (`npx tsx --test` / `npm test`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-08-sign-galaxy-land-cleanup-design.md`
- Hard-off leftovers **only** when `explorePhase === "inside"`; dive (`fading`/`diving`) keeps existing fade curves
- Exit lifts the hard-gate (`exiting` / `idle` restore corridor layers under existing logic)
- Landed sky = `SignGalaxyField` + soft ambient haze — **not** SignDisk / corners / station gather / plate residue
- HUD = lower third + soft dark wash (kicker → title → body above dots/CTA)
- Do **not** retune enter progress windows from the seamless-dive spec
- Do **not** reorder `CONSTELLATIONS` / tropical indices / calendar strip mapping
- Do **not** rewrite claim/auth/BirthChat flows or Skip soft-blackout
- Remove temporary `127.0.0.1:7819/ingest` debug instrumentation when wiring is done
- Commit after each task; keep `npm test` and `npm run typecheck` green at runtime-touching task boundaries

## File map

| File | Responsibility |
| --- | --- |
| Modify `src/lib/galaxy/signGalaxy.ts` | Export pure `insideHardGateHidesLeftovers(phase: ExplorePhase): boolean` |
| Modify `src/lib/galaxy/signGalaxy.test.ts` | Unit tests for the hard-gate helper |
| Modify `src/components/scene/GalaxyIntro.tsx` | SignDisk + Station cloud/plate/shell honor hard-gate; strip agent debug logs |
| Modify `src/components/scene/CornerGalaxies.tsx` | Hide when hard-gate active; strip agent debug logs |
| Modify `src/components/scene/SignGalaxyField.tsx` | Keep field visible at land; strip agent debug logs |
| Modify `src/components/overlay/SignGalaxyHud.tsx` | Confirm lower-third layout (already present) |
| Modify `src/styles.css` | Confirm `sign-galaxy-copy*` wash/readability (already present) |

---

### Task 1: Pure inside hard-gate helper + tests

**Files:**
- Modify: `src/lib/galaxy/signGalaxy.ts`
- Modify: `src/lib/galaxy/signGalaxy.test.ts`

**Interfaces:**
- Consumes: existing `ExplorePhase` type in `signGalaxy.ts`
- Produces: `insideHardGateHidesLeftovers(phase: ExplorePhase): boolean` — `true` only when `phase === "inside"`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/galaxy/signGalaxy.test.ts`:

```ts
import { insideHardGateHidesLeftovers } from "./signGalaxy.ts";

describe("insideHardGateHidesLeftovers", () => {
  it("hides leftovers only when inside", () => {
    assert.equal(insideHardGateHidesLeftovers("idle"), false);
    assert.equal(insideHardGateHidesLeftovers("fading"), false);
    assert.equal(insideHardGateHidesLeftovers("diving"), false);
    assert.equal(insideHardGateHidesLeftovers("inside"), true);
    assert.equal(insideHardGateHidesLeftovers("exiting"), false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/galaxy/signGalaxy.test.ts`

Expected: FAIL — `insideHardGateHidesLeftovers` is not exported / not defined.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/galaxy/signGalaxy.ts`, next to other enter helpers:

```ts
/** Corridor leftovers (disk, corners, station cloud, plate) hard-off after land. */
export function insideHardGateHidesLeftovers(phase: ExplorePhase): boolean {
  return phase === "inside";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/lib/galaxy/signGalaxy.test.ts`

Expected: PASS (including existing enter-curve tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/galaxy/signGalaxy.ts src/lib/galaxy/signGalaxy.test.ts
git commit -m "feat(galaxy): inside hard-gate helper for land leftover hide"
```

---

### Task 2: Wire SignDisk + CornerGalaxies hard-gate

**Files:**
- Modify: `src/components/scene/GalaxyIntro.tsx` (`SignDisk` `useFrame`)
- Modify: `src/components/scene/CornerGalaxies.tsx`

**Interfaces:**
- Consumes: `insideHardGateHidesLeftovers` from `@/lib/galaxy/signGalaxy`; `galaxyTravel.explorePhase`
- Produces: SignDisk and CornerGalaxies never visible when phase is `inside`

- [ ] **Step 1: Hard-gate SignDisk**

In `SignDisk` `useFrame`, after computing `show` from gather/intro/veil/worldFade, force off when landed:

```ts
import { insideHardGateHidesLeftovers } from "@/lib/galaxy/signGalaxy";
// ...
const show =
  gather > 0.32 &&
  intro > 0.4 &&
  veil < 0.45 &&
  world > 0.08 &&
  !insideHardGateHidesLeftovers(galaxyTravel.explorePhase);
g.visible = show;
```

Remove the `#region agent log` / `fetch(...7819/ingest...)` block in `SignDisk` entirely.

- [ ] **Step 2: Hard-gate CornerGalaxies**

In `CornerGalaxies` `useFrame`, after computing `vis` from intro/worldFade:

```ts
import { insideHardGateHidesLeftovers } from "@/lib/galaxy/signGalaxy";
// ...
const gateOff = insideHardGateHidesLeftovers(galaxyTravel.explorePhase);
const vis =
  (introPlaying() ? introChrome() : 1) *
  (exploringSign() ? galaxyTravel.worldFade : 1) *
  (gateOff ? 0 : 1);
// existing fade[0..3] = vis; mesh.visible = vis > 0.02
```

Remove the CornerGalaxies `#region agent log` block.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/GalaxyIntro.tsx src/components/scene/CornerGalaxies.tsx
git commit -m "fix(galaxy): hide SignDisk and corner galaxies when inside"
```

---

### Task 3: Wire Station gather cloud + plate/shell hard-gate

**Files:**
- Modify: `src/components/scene/GalaxyIntro.tsx` (Station / plate / shell path inside the per-sign station `useFrame`)

**Interfaces:**
- Consumes: `insideHardGateHidesLeftovers(galaxyTravel.explorePhase)`
- Produces: When exploring this sign and inside, station `points` (gather cloud) and plate/shell are forced off; `SignGalaxyField` child stays mounted and driven by its own form logic

- [ ] **Step 1: Force-hide station leftover visuals at land**

Where Station already tracks `exploringHere` and updates `mesh` (cores/gather), `art`, and `shellWrap`:

```ts
const landedHere =
  exploringHere && insideHardGateHidesLeftovers(galaxyTravel.explorePhase);

if (landedHere) {
  mesh.visible = false;
  if (art.current) art.current.visible = false;
  if (shellWrap.current) shellWrap.current.visible = false;
  // skip formBoost / cloud opacity writes that would re-show the smear
  return; // after SignGalaxyField remains a sibling — do not unmount the group
}
```

Place this **after** group positioning / art hydrate so exit can resume cleanly, but **before** assigning gather `uOpacity` / `formBoost` that keep the warm cloud lit.

If an early `return` would skip unrelated work the station still needs while inside (e.g. click mesh), prefer setting visibilities to false and zeroing `u.uOpacity.value = 0` / `u.uFade.value = 0` instead of returning mid-frame — keep the station group alive for `SignGalaxyField`.

Minimal safe pattern without early-return:

```ts
if (landedHere) {
  mesh.visible = false;
  if (art.current) {
    art.current.visible = false;
    (art.current.material as MeshBasicMaterial).opacity = 0;
  }
  if (shellWrap.current) shellWrap.current.visible = false;
} else {
  // existing mesh / art / shell visibility logic
}
```

And when `landedHere`, do **not** apply `formBoost` opacity to the gather material:

```ts
if (landedHere) {
  u.uOpacity.value = 0;
  u.uFade.value = 0;
} else {
  // existing formBoost / explore opacity path
}
```

- [ ] **Step 2: Remove Station agent debug log**

Delete the `#region agent log` fetch block in the Station `useFrame`.

- [ ] **Step 3: Run focused tests + typecheck**

Run:

```bash
npx tsx --test src/lib/galaxy/signGalaxy.test.ts src/lib/galaxy/enterSkip.test.ts
npm run typecheck
```

Expected: all PASS / clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/GalaxyIntro.tsx
git commit -m "fix(galaxy): hard-gate station cloud and plate when inside"
```

---

### Task 4: Confirm HUD lower-third + strip field debug logs

**Files:**
- Modify: `src/components/overlay/SignGalaxyHud.tsx` (only if layout drifted)
- Modify: `src/styles.css` (only if wash missing)
- Modify: `src/components/scene/SignGalaxyField.tsx` (remove debug logs only)

**Interfaces:**
- Consumes: existing `sign-galaxy-lower` / `sign-galaxy-copy*` classes
- Produces: Landed HUD matches spec §3; no debug ingest left in field

- [ ] **Step 1: Verify HUD structure**

Confirm `SignGalaxyHud` landed chrome is:

1. Top row: Back + sign name (+ AuthSlot)
2. `flex-1` spacer
3. `sign-galaxy-lower` with `sign-galaxy-copy` (kicker / title / body) then dots + CTA

If anything recent reverted to centered mid-screen copy, restore the lower-third structure from the draft (spacer + `sign-galaxy-lower` + soft settle classes).

- [ ] **Step 2: Verify CSS wash**

Confirm `src/styles.css` still defines `.sign-galaxy-copy`, `::before` radial wash, and `.sign-galaxy-copy-kicker|title|body` text-shadows. If missing, restore:

```css
.sign-galaxy-copy {
  position: relative;
  isolation: isolate;
  padding: 0.85rem 1rem 1rem;
}
.sign-galaxy-copy::before {
  content: "";
  pointer-events: none;
  position: absolute;
  z-index: -1;
  inset: -0.5rem -1.25rem -0.75rem;
  border-radius: 1.25rem;
  background: radial-gradient(
    ellipse 78% 70% at 50% 55%,
    rgba(8, 7, 6, 0.72) 0%,
    rgba(8, 7, 6, 0.42) 48%,
    rgba(8, 7, 6, 0) 78%
  );
}
```

(Keep existing kicker/title/body shadow rules if already present.)

- [ ] **Step 3: Strip SignGalaxyField debug logs**

Remove the `#region agent log` / `fetch(...7819/ingest...)` block from `SignGalaxyField.tsx` `useFrame`. Do **not** change field visibility/opacity math (field stays the landed hero).

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/SignGalaxyHud.tsx src/styles.css src/components/scene/SignGalaxyField.tsx
git commit -m "fix(galaxy): lock land HUD lower-third and remove debug ingest"
```

(If HUD/CSS were already correct and only field logs changed, commit that file alone with the same message intent.)

---

### Task 5: Full verify

**Files:**
- None required (verification only)

- [ ] **Step 1: Run full unit suite + typecheck**

Run:

```bash
npm test
npm run typecheck
```

Expected: green.

- [ ] **Step 2: Manual land checklist (dev server)**

With `npm run dev` at `http://127.0.0.1:8080/`:

1. Enter Aries → wait for land / First star HUD.
2. Confirm: no warm yellow elongated smear beside the horn.
3. Confirm: animal field stars + soft haze only; no disk / corner mini-galaxies / gather cloud / plate.
4. Confirm: copy in lower third, readable.
5. Exit Back → corridor leftovers return.
6. Repeat enter on one other sign (e.g. Leo or Taurus).
7. Optional: Skip mid-dive still soft-blackouts and lands clean.

- [ ] **Step 3: Final commit only if verify found tiny follow-ups**

Otherwise done — no empty commit.

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Inside hard-gate approach | Task 1–3 |
| SignDisk off when inside | Task 2 |
| CornerGalaxies off when inside | Task 2 |
| Station gather / plate / shell off when inside | Task 3 |
| SignGalaxyField stays on | Task 3–4 (no hide) |
| Soft haze allowed | Task 3/5 (do not zero scene fog) |
| Dive curves unchanged until land | Global + Tasks 2–3 only gate on `inside` |
| Exit lifts gate | Helper returns false for `exiting`/`idle` |
| HUD lower third + wash | Task 4 |
| Remove debug instrumentation | Tasks 2–4 |
| Tropical order untouched | Global — no constellation edits |
| Reduced motion same hard-gate | Helper is phase-only |
| Success visual checks | Task 5 |

## Placeholder / consistency check

- Helper name `insideHardGateHidesLeftovers` used consistently across tasks.
- No TBD / “implement later” steps.
- Relies on existing `ExplorePhase` including `"exiting"` (already in codebase).
