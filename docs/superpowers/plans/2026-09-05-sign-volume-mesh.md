# Procedural Sign Volume Mesh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thin Sagittarius OBJ / flat Vault plates with a procedural closed gold shell plus an interior star volume you can fly through — Sagittarius first, gated recipe for all twelve.

**Architecture:** Extend `signVolume.ts` so each sign PNG yields a deeper depth field, a closed shell `BufferGeometry` (front + back + rim), and an `interiorCloud` sampled through ±Z. Shared R3F components `SignShell` and `SignStarVolume` mount in mesh review and in `GalaxyIntro` `Station` when `VOLUME_SIGN_IDS` includes the sign. Ungated signs keep today’s billboard plate + `denseCloud`.

**Tech Stack:** React 19, Three.js / R3F / Drei, existing `signArt` PNGs, Node test runner (`node --experimental-strip-types --test` / `npx tsx --test`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-05-sign-volume-mesh-design.md`
- Do **not** reorder tropical signs / travel indices / `CONSTELLATIONS`
- Do **not** add authored sculpt OBJs or SDF/raymarch
- Lights-only materials (no HDR `Environment`)
- Start gate: `VOLUME_SIGN_IDS = new Set<SignId>(["sagittarius"])`
- Fallback: plate + `denseCloud` when volume build fails or GPU is small
- Keep `/?mesh=sagittarius` entry; update copy to describe procedural volume + dive
- Commit after each task; keep `npm run typecheck` and `npm test` green

## File map

| File | Responsibility |
| --- | --- |
| Modify `src/lib/galaxy/signVolume.ts` | Deeper depth; export `buildShellGeometry`, `interiorCloud`, `VOLUME_SIGN_IDS`, `hasVolumeSign` |
| Create `src/lib/galaxy/signVolume.test.ts` | Pure tests for shell + interior sampling (synthetic volume fixture) |
| Create `src/components/scene/SignShell.tsx` | Closed gold mesh from `buildShellGeometry` + sign albedo |
| Create `src/components/scene/SignStarVolume.tsx` | Interior points from `interiorCloud` |
| Modify `src/components/scene/MeshReviewCanvas.tsx` | Mount shell + star volume; dive controls |
| Modify `src/components/scene/SagittariusMesh.tsx` | Thin wrapper → `SignShell` for `"sagittarius"` **or** delete usages and inline in review (prefer deprecate OBJ path) |
| Modify `src/components/overlay/MeshReviewShell.tsx` | Copy: procedural volume + dive hints |
| Modify `src/components/scene/GalaxyIntro.tsx` | Gate Station: hide plate; mount `SignShell` + `SignStarVolume` |
| Modify `package.json` | Append `signVolume.test.ts` to `test` script |

---

### Task 1: Volume APIs — deeper depth, shell geometry, interior cloud

**Files:**
- Modify: `src/lib/galaxy/signVolume.ts`
- Create: `src/lib/galaxy/signVolume.test.ts`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Consumes: existing `SignVolume`, `getSignVolume`, `signArtImage`, `isSmallGpu`
- Produces:
  - `VOLUME_SIGN_IDS: ReadonlySet<SignId>`
  - `hasVolumeSign(id: SignId): boolean`
  - `buildShellGeometry(id: SignId): BufferGeometry | null`
  - `interiorCloud(id: SignId, count: number): VolumeStar[]`
  - Depth field in `build()` scaled so max |z| is clearly thicker than today’s ~0–1 front-only sheet (target: half-thickness ≈ **0.22–0.35** in unit plate space so a `PLATE_WIDE`-scaled station reads as a body side-on)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/galaxy/signVolume.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BufferAttribute, BufferGeometry } from "three";
import type { SignId } from "@/lib/chart/types";

// Test through exported helpers. For geometry math without DOM image decode,
// export a test-only builder OR test via injected fixture — prefer exporting
// `buildShellGeometryFromVolume(vol: SignVolume): BufferGeometry` and
// `interiorCloudFromVolume(vol: SignVolume, count: number): VolumeStar[]`
// as the pure cores, with `buildShellGeometry` / `interiorCloud` as thin wrappers.

import {
  VOLUME_SIGN_IDS,
  hasVolumeSign,
  buildShellGeometryFromVolume,
  interiorCloudFromVolume,
  type SignVolume,
  type VolumeStar,
} from "./signVolume.ts";

function fixtureVolume(): SignVolume {
  const cols = 8;
  const rows = 6;
  const alpha = new Float32Array(cols * rows);
  const depth = new Float32Array(cols * rows);
  // Filled rectangle inset by 1 cell
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      alpha[i] = 1;
      // thicker in center
      const nx = x / (cols - 1) - 0.5;
      const ny = y / (rows - 1) - 0.5;
      depth[i] = 0.28 - Math.hypot(nx, ny) * 0.15;
    }
  }
  return {
    id: "sagittarius" as SignId,
    aspect: 16 / 9,
    cols,
    rows,
    depth,
    alpha,
    stars: [{ x: 0, y: 0, z: 0.2, mag: 1 }],
  };
}

describe("VOLUME_SIGN_IDS", () => {
  it("gates sagittarius only at start", () => {
    assert.equal(hasVolumeSign("sagittarius"), true);
    assert.equal(hasVolumeSign("aries"), false);
    assert.equal(VOLUME_SIGN_IDS.size, 1);
  });
});

describe("buildShellGeometryFromVolume", () => {
  it("returns a closed mesh with front and back z signs", () => {
    const geo = buildShellGeometryFromVolume(fixtureVolume());
    assert.ok(geo);
    const pos = geo.getAttribute("position") as BufferAttribute;
    assert.ok(pos.count > 20);
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    assert.ok(maxZ > 0.08, `expected front thickness, got maxZ=${maxZ}`);
    assert.ok(minZ < -0.08, `expected back thickness, got minZ=${minZ}`);
    // Index buffer present (rim + caps)
    assert.ok(geo.getIndex() && geo.getIndex()!.count >= 36);
    geo.dispose();
  });
});

describe("interiorCloudFromVolume", () => {
  it("samples stars through ±Z inside the body", () => {
    const cloud = interiorCloudFromVolume(fixtureVolume(), 200);
    assert.equal(cloud.length, 200);
    let neg = 0;
    let pos = 0;
    for (const s of cloud) {
      if (s.z < -0.02) neg++;
      if (s.z > 0.02) pos++;
      assert.ok(Math.abs(s.x) <= 0.55);
      assert.ok(Math.abs(s.y) <= 0.55);
    }
    assert.ok(neg > 20, `expected interior negative z, got ${neg}`);
    assert.ok(pos > 20, `expected interior positive z, got ${pos}`);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run:

```bash
npx tsx --test src/lib/galaxy/signVolume.test.ts
```

Expected: FAIL (missing exports / `VOLUME_SIGN_IDS` undefined).

- [ ] **Step 3: Implement volume APIs**

In `src/lib/galaxy/signVolume.ts`:

1. Add gate:

```ts
export const VOLUME_SIGN_IDS: ReadonlySet<SignId> = new Set(["sagittarius"]);
export function hasVolumeSign(id: SignId) {
  return VOLUME_SIGN_IDS.has(id);
}
```

2. In `build()`, increase depth amplitude so center depth is ~`0.28–0.35` (not a paper stamp). Keep alpha/dist logic; multiply the final `z` by a `DEPTH_SCALE` (~1.6–2.0 vs today) and store that in `depth[]`. Keep `stars` for `denseCloud` compatibility (front-biased is OK for ungated path).

3. Add pure builders (sketch — implement fully, compute normals, UVs):

```ts
const ALPHA_CUT = 0.06;

export function buildShellGeometryFromVolume(vol: SignVolume): BufferGeometry {
  const { cols, rows, aspect, alpha, depth } = vol;
  // Vertex grid in unit plate space: x ∈ [-0.5,0.5]*aspect? — match Station:
  // plate uses scale (PLATE_WIDE, PLATE_WIDE/aspect) on a unit plane, so
  // local x ∈ [-0.5, 0.5], y ∈ [-0.5, 0.5] before scale.
  // Build:
  //  - front verts: (x, y, +depth)
  //  - back verts:  (x, y, -depth)
  //  - only include cells with alpha > ALPHA_CUT (or include all and degenerate)
  //  - rim: walk boundary edges where alpha crosses cut; stitch front→back
  // Prefer a full grid with discarded transparent tris (simpler, robust):
  // for each cell quad, if any corner alpha > cut, emit front quad + back quad;
  // for each boundary edge (alpha in / out), emit rim quad.
  const geo = new BufferGeometry();
  // ... fill position, uv, index ...
  geo.computeVertexNormals();
  return geo;
}

export function buildShellGeometry(id: SignId): BufferGeometry | null {
  const vol = getSignVolume(id);
  if (!vol) return null;
  return buildShellGeometryFromVolume(vol);
}

export function interiorCloudFromVolume(vol: SignVolume, count: number): VolumeStar[] {
  const n = Math.max(1, Math.floor(count));
  const out: VolumeStar[] = new Array(n);
  // Rejection sample cells with alpha > ALPHA_CUT; z = (hash*2-1) * depth[i]
  // with slight xy jitter. Mag from luma/depth.
  // ...
  return out;
}

export function interiorCloud(id: SignId, count: number): VolumeStar[] {
  const vol = getSignVolume(id);
  if (!vol) return [];
  return interiorCloudFromVolume(vol, count);
}
```

**Rim / topology notes (must follow):**
- Front and back must not share a single z=0 plane.
- UVs: front uses standard 0–1 from grid; back mirrors U (`1-u`) so albedo reads; rim can stretch edge UVs.
- Dispose-friendly: no leaked typed arrays beyond the geometry attributes.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx tsx --test src/lib/galaxy/signVolume.test.ts
```

Expected: all three describes PASS.

- [ ] **Step 5: Register test in `package.json`**

Append `src/lib/galaxy/signVolume.test.ts` to the `npx tsx --test ...` list in `scripts.test`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/galaxy/signVolume.ts src/lib/galaxy/signVolume.test.ts package.json
git commit -m "feat(galaxy): procedural shell geometry and interior cloud APIs"
```

---

### Task 2: `SignShell` component

**Files:**
- Create: `src/components/scene/SignShell.tsx`

**Interfaces:**
- Consumes: `buildShellGeometry`, `SIGN_ART` / `TextureLoader`, gold material look from current `SagittariusMesh`
- Produces: `<SignShell signId fitHeight? />`

- [ ] **Step 1: Implement `SignShell`**

```tsx
import { useLayoutEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import type { SignId } from "@/lib/chart/types";
import { SIGN_ART } from "@/lib/galaxy/signArt";
import { buildShellGeometry, getSignVolume } from "@/lib/galaxy/signVolume";

const GOLD = new Color("#c9a45c");
const OBSIDIAN = new Color("#0a0908");

type Props = {
  signId: SignId;
  /** World height of the tallest axis after fit (mesh review). */
  fitHeight?: number;
  /** When set (Vault), scale like the plate: width = PLATE_WIDE. */
  plateWide?: number;
};

export function SignShell({ signId, fitHeight = 3.4, plateWide }: Props) {
  const root = useRef<Group>(null);
  const albedo = useLoader(TextureLoader, SIGN_ART[signId]);
  const geo = useMemo(() => buildShellGeometry(signId), [signId]);

  const material = useMemo(() => {
    albedo.colorSpace = SRGBColorSpace;
    albedo.anisotropy = 8;
    albedo.needsUpdate = true;
    return new MeshPhysicalMaterial({
      map: albedo,
      color: new Color("#f2e6d2"),
      metalness: 0.72,
      roughness: 0.22,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      reflectivity: 0.85,
      emissive: GOLD.clone().multiplyScalar(0.35),
      emissiveMap: albedo,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.94,
      side: DoubleSide,
      envMapIntensity: 1.15,
      attenuationColor: OBSIDIAN,
    });
  }, [albedo]);

  useLayoutEffect(() => {
    if (!root.current || !geo) return;
    const box = new Box3().setFromBufferAttribute(geo.getAttribute("position") as any);
    // Prefer setFromObject after mesh mounts:
  }, [geo, fitHeight, plateWide, signId]);

  // Fit: if plateWide, scale x by plateWide, y by plateWide/aspect (match Station plate).
  // Else fit tallest axis to fitHeight (review stage).
  const aspect = getSignVolume(signId)?.aspect ?? 16 / 9;
  const scale: [number, number, number] = plateWide
    ? [plateWide, plateWide / aspect, plateWide]
    : /* compute fit from geo bbox → fitHeight */ [1, 1, 1];

  if (!geo) return null;
  return (
    <group ref={root} scale={scale}>
      <mesh geometry={geo} material={material} frustumCulled={false} />
    </group>
  );
}
```

Flesh out fit math properly (copy bbox fit pattern from `SagittariusMesh.tsx`). Z scale should match X so thickness stays proportional when `plateWide` is set (`scale.z = plateWide`).

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS (or only pre-existing unrelated errors — fix any you introduced).

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/SignShell.tsx
git commit -m "feat(galaxy): add SignShell procedural gold volume mesh"
```

---

### Task 3: `SignStarVolume` component

**Files:**
- Create: `src/components/scene/SignStarVolume.tsx`

**Interfaces:**
- Consumes: `interiorCloud`, `makeSparkMaterial` / `fillStationCloud` from `starRender.ts` **or** a simpler additive `Points` material for review
- Produces: `<SignStarVolume signId count? plateWide? />`

- [ ] **Step 1: Implement interior points**

For mesh review, a dedicated simple points material is enough (no morph). For Station later, prefer feeding `interiorCloud` into the existing station cloud fill so morph still works.

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, Points, AdditiveBlending } from "three";
import type { SignId } from "@/lib/chart/types";
import { interiorCloud } from "@/lib/galaxy/signVolume";
import { isSmallGpu } from "@/lib/gpu";
import { getSignVolume } from "@/lib/galaxy/signVolume";

type Props = {
  signId: SignId;
  count?: number;
  plateWide?: number;
};

export function SignStarVolume({ signId, count, plateWide }: Props) {
  const small = isSmallGpu();
  const n = count ?? (small ? 1200 : 2800);
  const pts = useMemo(() => interiorCloud(signId, n), [signId, n]);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(pts.length * 3);
    const mag = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      mag[i] = p.mag;
    }
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aMag", new BufferAttribute(mag, 1));
    return g;
  }, [pts]);

  const aspect = getSignVolume(signId)?.aspect ?? 16 / 9;
  const scale: [number, number, number] = plateWide
    ? [plateWide, plateWide / aspect, plateWide]
    : [1, 1, 1];

  // Use Points + additive sprite-like material (reuse makeSparkMaterial if uniforms allow static cloud)
  return (
    <points geometry={geo} scale={scale} frustumCulled={false}>
      {/* material: small additive points, gold/white tint */}
    </points>
  );
}
```

Ensure review and station can share this component. If Station needs morph, add an optional `mode="station"` later in Task 5 that calls `fillStationCloud` with `interiorCloud` instead of `denseCloud`.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/SignStarVolume.tsx
git commit -m "feat(galaxy): add SignStarVolume interior fly-through cloud"
```

---

### Task 4: Mesh review — swap OBJ for shell + dive controls

**Files:**
- Modify: `src/components/scene/MeshReviewCanvas.tsx`
- Modify: `src/components/scene/SagittariusMesh.tsx` (re-export shell or replace body)
- Modify: `src/components/overlay/MeshReviewShell.tsx` (copy)

**Interfaces:**
- Consumes: `SignShell`, `SignStarVolume`
- Produces: review stage where orbit + dive prove thickness

- [ ] **Step 1: Replace review mesh**

In `MeshReviewCanvas.tsx`, inside `<Suspense>`:

```tsx
<SignShell signId="sagittarius" fitHeight={3.55} />
<SignStarVolume signId="sagittarius" />
```

Remove `<SagittariusMesh ... />` (or make `SagittariusMesh` a deprecated alias that renders `SignShell` only — prefer direct components).

- [ ] **Step 2: Add dive controls**

Keep `OrbitControls`. Add a small `DiveRig` component in the same file:

```tsx
function DiveRig() {
  const keys = useRef({ fwd: false });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") keys.current.fwd = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") keys.current.fwd = false;
    };
    const wheel = (e: WheelEvent) => {
      // accumulate dive along view forward when wheel inward
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("wheel", wheel, { passive: true });
    return () => { /* remove */ };
  }, []);
  useFrame((state, dt) => {
    if (!keys.current.fwd) return;
    const cam = state.camera;
    const dir = new Vector3();
    cam.getWorldDirection(dir);
    cam.position.addScaledVector(dir, dt * 1.8);
    // Keep OrbitControls target in sync if needed
  });
  return null;
}
```

Clamp so the camera cannot leave a ~6-unit radius from origin (stay near the mesh).

- [ ] **Step 3: Update chrome copy**

In `MeshReviewShell.tsx`, replace the extruded-OBJ blurb with something like:

> Procedural gold shell from the Sagittarius plate art, filled with stars. Drag to orbit, W/scroll to dive through — judge real volume before enabling the other eleven.

Footer hint: `Drag · W / scroll dive · auto-orbit`

- [ ] **Step 4: Manual verify**

```bash
npm run dev
# open /?mesh=sagittarius
```

Check: side-on thickness; dive through stars; no OBJLoader errors in console.

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/MeshReviewCanvas.tsx src/components/scene/SagittariusMesh.tsx src/components/overlay/MeshReviewShell.tsx
git commit -m "feat(galaxy): procedural Sagittarius mesh review with dive"
```

---

### Task 5: Gate Sagittarius Station in the Vault

**Files:**
- Modify: `src/components/scene/GalaxyIntro.tsx`
- Optionally keep `src/lib/galaxy/signVolume.ts` gate as source of truth

**Interfaces:**
- Consumes: `hasVolumeSign`, `SignShell`, `SignStarVolume`, `PLATE_WIDE`
- Produces: Sagittarius station uses shell+interior cloud; other signs unchanged

- [ ] **Step 1: Branch Station render**

Inside `Station`:

```tsx
const useVolume = hasVolumeSign(sign.id);
```

When `useVolume`:
- Do **not** show the billboard `<mesh ref={art} … planeGeometry>` (keep `visible={false}` always, or skip opacity path).
- Mount:

```tsx
{useVolume ? (
  <>
    <SignShell signId={sign.id} plateWide={PLATE_WIDE} />
    <SignStarVolume signId={sign.id} plateWide={PLATE_WIDE} count={CLOUD_N} />
  </>
) : null}
```

- For star morph path: when `useVolume`, seed `fillStationCloud` / `fillMorphCloud` with `interiorCloud(sign.id, n)` instead of `denseCloud(sign.id, n)`. If dual clouds fight visually, prefer **either** `SignStarVolume` **or** the existing points mesh — not both at full brightness. Recommended: keep the existing `<points>` morph pipeline, feed it `interiorCloud`, and skip a second `SignStarVolume` in Station; still mount `SignShell` for the gold body. Mesh review keeps both shell + `SignStarVolume`.

**Locked choice for Station:** `SignShell` + existing points mesh filled from `interiorCloud` (no duplicate points component).

- [ ] **Step 2: Local dive when held**

When `held && useVolume`, allow a short camera push along view forward (reuse travel camera refs already in `GalaxyIntro`) up to ~0.35 of `PLATE_WIDE`, then ease back when `held` clears. Do **not** rewrite temple path math — only a local offset while held.

If this proves invasive, ship Station shell+interior cloud without dive in this task and leave dive to review-only (spec allows short local dive — implement a minimal offset). Prefer minimal: `camera.position.lerp` toward shell center by a small factor while held.

- [ ] **Step 3: Regression check**

- Aries (ungated): still plate + `denseCloud`
- Sagittarius: shell visible, no plate card, stars have ±Z
- Travel indices / order unchanged

```bash
npm run typecheck
npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/GalaxyIntro.tsx
git commit -m "feat(galaxy): gate Sagittarius station onto procedural volume shell"
```

---

### Task 6: Cleanup + enablement docs

**Files:**
- Modify: `src/components/scene/SagittariusMesh.tsx` (stub or remove OBJ loader if unused)
- Modify: `docs/superpowers/specs/2026-09-05-sign-volume-mesh-design.md` (add “Enablement” note if needed)
- Leave `public/models/sagittarius/*` in repo for now (do not delete assets this pass — unused is OK)

- [ ] **Step 1: Ensure no live OBJLoader path remains**

```bash
rg -n "OBJLoader|SAGITTARIUS_OBJ|SagittariusMesh\\.obj" src/
```

Expected: no references from live review/station code (comments/docs OK).

- [ ] **Step 2: Document enablement**

At bottom of the design spec, add:

```md
## Enablement

Add a `SignId` to `VOLUME_SIGN_IDS` in `src/lib/galaxy/signVolume.ts` after art QA.
No per-sign geometry files required.
```

- [ ] **Step 3: Final verification**

```bash
npm run typecheck
npm test
npm run build
```

Manual: `/?mesh=sagittarius` orbit+dive; Vault fly to Sagittarius; spot-check Aries still plate.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/SagittariusMesh.tsx docs/superpowers/specs/2026-09-05-sign-volume-mesh-design.md
git commit -m "chore(galaxy): drop live OBJ path; document volume sign enablement"
```

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Closed shell from PNG depth | Task 1–2 |
| Interior ±Z star cloud | Task 1, 3, 5 |
| Mesh review orbit + dive | Task 4 |
| Vault Station gated Sagittarius | Task 5 |
| Same components / recipe for 12 | Tasks 1–5 + `VOLUME_SIGN_IDS` |
| Fallback plate + caps | Task 5 (`hasVolumeSign` false path) |
| No tropical reorder / no SDF / no authored sculpt | Global constraints |
| Lights-only materials | Task 2 |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-05-sign-volume-mesh.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks  
**2. Inline Execution** — run tasks in this session with executing-plans checkpoints  

Which approach?
