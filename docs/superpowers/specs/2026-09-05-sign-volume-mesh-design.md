# Procedural Sign Volume Mesh

## Problem

The Sagittarius mesh review (`/?mesh=sagittarius`) loads a thin extruded silhouette OBJ (~±0.27 depth vs ~4 height). Vault stations still use billboard PNG plates plus flat-ish particle sheets from `denseCloud`. Neither reads as a body you can orbit, nor as a volume you can fly *through*.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Feeling | Solid shell **and** interior star volume you can dive into |
| Scope | Recipe for all 12; Sagittarius proves it first |
| Body source | Procedural from existing sign PNGs (no authored sculpt meshes) |
| Approach | Closed silhouette shell + interior star cloud (not bas-relief-only, not SDF) |
| Shared path | Same components in mesh review and Vault Station |

## Non-goals

- Authored OBJs / sculpted per-sign meshes
- SDF / raymarch / voxel fields
- Temple travel path redesign beyond a short local dive at volume-ready stations
- Changing tropical sign order (`CONSTELLATIONS` / travel indices)
- Auth, DB, or new routes beyond the existing `?mesh=` review entry

## Architecture

One volume source feeds both layers:

```text
Sign PNG ──► SignVolume (alpha + depth)
                ├─► Closed shell mesh (front + back + rim)
                └─► Interior star cloud (±Z inside body)
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
     Mesh review (orbit+dive)   Vault Station (gated)
```

## Components

| Unit | Responsibility |
| --- | --- |
| `src/lib/galaxy/signVolume.ts` | Deeper depth field; `buildShellGeometry(id)`; `interiorCloud(id, count)` sampling ±Z inside the body. `sculptRelief` may stay unused or be retired once the shell ships. |
| `SignShell.tsx` (new under `src/components/scene/`) | Closed mesh + thin-gold `MeshPhysicalMaterial` (albedo from existing sign art). Props: `signId`, fit height/scale. |
| `SignStarVolume.tsx` (new under `src/components/scene/`) | Interior points; reuse station star shaders / morph hooks from the existing star render path where Station still needs them. |
| `MeshReviewCanvas.tsx` / `SagittariusMesh.tsx` | Replace live OBJ path with `SignShell` + `SignStarVolume` for Sagittarius; orbit + dive controls. |
| `GalaxyIntro.tsx` `Station` | Gate: hide billboard plate; mount shell + interior cloud at station pose scaled to today’s `PLATE_WIDE`. |
| Gate | `VOLUME_SIGN_IDS` (start: `sagittarius` only). Flipping an id enables the recipe with no one-off geometry. |

## Data flow

1. Load / prime sign PNG → `getSignVolume(id)` builds alpha + depth (cached).
2. Shell builder walks the depth grid → front verts `z = +depth`, back `z = -depth`, rim stitches the alpha outline → `BufferGeometry` + UVs for albedo.
3. Interior cloud: for each sample, pick `(x,y)` in silhouette, `z ~ uniform(-depth, +depth)` with edge falloff so density fills the body (not a flat spark sheet).
4. Review stage: camera orbits the shell; user can push forward into the cloud.
5. Vault: existing travel still hits stations; at volume-ready signs the hero frame targets the shell center; short local dive through the cloud when held, then ease back to the station frame.

## Controls & UX

- **Mesh review:** Keep orbit drag. Add dive (hold / scroll / forward) so thickness + interior stars read in ~10 seconds.
- **Vault:** Keep the fly-through path. At a volume-ready station, allow a short local dive, then snap/ease back so travel continues cleanly.

## Fallback

- Volume build failure or weak WebGL → keep today’s plate + capped cloud (`isSmallGpu` / existing small-GPU caps on point counts).
- Materials stay lights-only (no HDR environment dependency), matching the current mesh-review lighting approach.

## Success criteria

- Side-on, Sagittarius reads as a body with real thickness (not a cookie stamp).
- Diving the review stage, stars pass around / through the camera inside the form.
- Same `SignShell` + `SignStarVolume` used in review and Vault.
- Other eleven signs stay plates until gated; enabling a sign is a gate-list change.
- Tropical order and travel indices untouched.
- Mobile / small GPU: lower interior count; no blank station if volume fails.

## Rollout

1. Extend `signVolume` + shell / interior APIs.
2. Ship Sagittarius mesh review on the procedural shell (drop live OBJ path).
3. Gate Sagittarius Station onto the same components.
4. Document the gate list so the other eleven are one-line enablements after art QA.

## Out of scope for follow-ups (not this design)

- Authored sculpt meshes swapped into the shell slot
- Full free-fly Vault camera rewrite
- SDF / raymarched soft volumes
