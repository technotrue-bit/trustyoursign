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
