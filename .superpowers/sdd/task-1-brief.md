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
