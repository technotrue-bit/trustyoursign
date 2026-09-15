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
