# BirthChat sign slide stays in view

When the visitor confirms a sign, the plate and star cloud still pop into BirthChat’s clear well. They must stay inside the camera frustum on every frame, including taps that happen before the fly-through arrives.

## Problem

`Station` in `src/components/scene/GalaxyIntro.tsx` slides the sign group in **world +X** using depth `Math.abs(cam.position.z - sit.z)` and `computeRightPanelTargetX` (`halfW * 0.5` → NDC **+0.5**). Then it scales the group to **×1.4**.

That combination fails in three ways:

1. **Tap while flying.** If BirthChat opens before the camera reaches the station, `|cam.z − sit.z|` is huge. The world-X offset is then far larger than the frustum and the stars leave the screen.
2. **Wrong axis on phones.** BirthChat’s clear space on a narrow viewport is **above** the bottom sheet (`items-end`, gradient from the bottom), not to the right. A world +X slide walks the plate off the side.
3. **Clip from scale.** ×1.4 plus an NDC +0.5 target pushes plate edges past the viewport on anything narrower than a wide desktop.

`SignDisk` also hides when `chat && pickedSign === sign.id` (`pickedMorph`), so the disk vanishes instead of traveling with the plate.

These stay true and are **not** part of the fix: `uGlyphBiasX` remains `0` (group motion only; no per-star X bias). The plate stays fully opaque (`computePlateOpacity` ignores `morphLevel`).

## Goal

Keep the “pop into BirthChat” feel. After the camera has arrived at the picked station, move the **billboarded** group in **camera right / camera up** so the plate sits in the overlay’s clear well, at a softer NDC than today, clamped so `plateHalf × scale` never leaves the viewport. While the camera is still flying, the offset target is zero.

## Architecture

Pure math stays in `src/lib/galaxy/birthchat-slide.ts`. `Station` and `SignDisk` call it from `useFrame`. No new scene graph nodes, no shader changes, no overlay layout rewrite.

### Units and constants

| Name | Value | Role |
| --- | --- | --- |
| `ARRIVED_T` | `0.02` | `|galaxyTravel.t − stationT(index)|` at or below this means “arrived.” Station spacing on `t` is about `1/11`; `0.02` is on-station, not mid-nave. |
| `DESIRED_NDC` | `0.35` | Desktop slide target on NDC **x** (right). Portrait lift target on NDC **y** (up). Replaces today’s implicit `0.5`. |
| `VIEW_MARGIN` | `0.92` | Max `|NDC|` allowed for the plate’s outer edge after offset + scale. |
| `PICKED_SCALE` | `1.4` | Default picked scale when that size fits at `DESIRED_NDC`. |
| `SOFT_SCALE` | `1.1` | Picked scale when `1.4` would clip at `DESIRED_NDC`. |
| `PHONE_MAX_WIDTH` | `768` | Same as Tailwind `md`. Width **below** this is the BirthChat **bottom sheet** (lift). Width **at or above** is the **left sheet** (slide right). |
| `PLATE_WIDE` | `16.5` | Existing temple plate width (world units). |

`PHONE_MAX_WIDTH` follows the overlay, not `camera.aspect`. A short landscape window that is still `< 768` px wide shows the bottom sheet; the 3D offset must lift, not slide right.

### View depth

Depth is the **camera-space** distance to `sit`, not a world-Z difference:

```
sitCam = sit applied into camera space (camera.worldToLocal / matrixWorldInverse)
depth  = abs(sitCam.z)
```

Frustum half-extents at that depth:

```
halfH = tan(fovRad / 2) * depth
halfW = halfH * aspect
```

`fov` is the perspective camera’s vertical FOV in degrees, same as today. `aspect` is `camera.aspect`.

### Arrival gate

If `picked` is false, target offset is `{ x: 0, y: 0 }` and target scale is `1`.

If `picked` is true and `|travel.t − stationT(index)| > ARRIVED_T`, target offset is `{ x: 0, y: 0 }`. Target **scale may still** ease toward the picked scale so the pop can start on-axis. The group does not translate until arrived.

If `picked` is true and arrived, compute offset as below.

Closing BirthChat (`picked` false) returns both offset and scale targets to rest; existing `lerpToward` eases them back.

### Layout mode

```
portraitSheet = viewportCssWidth < PHONE_MAX_WIDTH
```

Use `window.visualViewport.width` when present, else `window.innerWidth`. Do not use `camera.aspect < 1` for this branch.

- **Desktop / `md+` (`portraitSheet === false`):** desired NDC = `(+DESIRED_NDC, 0)` extra — slide along **camera right**. Camera up extra is `0`.
- **Phone sheet (`portraitSheet === true`):** desired NDC = `(0, +DESIRED_NDC)` extra — lift along **camera up**. Camera right extra is `0`.

`+Y` in camera space is up on screen (Three.js camera up after billboard).

### Scale

Plate half-extents in world units at a candidate scale `s`:

```
plateHalfX = (PLATE_WIDE / 2) * s
plateHalfY = (PLATE_WIDE / plateAspect / 2) * s
```

`plateAspect` is the sign art aspect, same source `Station` already uses (`vol.aspect`, else texture aspect, else `16/9`).

`1.4` **fits** at `DESIRED_NDC` when both are true:

```
abs(desiredNdcX) * halfW + plateHalfX(1.4) <= halfW * VIEW_MARGIN
abs(desiredNdcY) * halfH + plateHalfY(1.4) <= halfH * VIEW_MARGIN
```

If `picked` and `1.4` fits, target scale is `1.4`. If `picked` and it does not fit, target scale is `1.1`. If not `picked`, target scale is `1`. There is no third scale.

### Camera-space offset and clamp

Unclamped camera-space translation to the desired NDC, using the **chosen** target scale for the clamp only (the mesh scale is the lerped `scaleBoost`, as today):

```
rawX = desiredNdcX * halfW
rawY = desiredNdcY * halfH
```

Clamp so the plate box at the **current** (lerped) scale stays inside `VIEW_MARGIN`:

```
maxX = max(0, halfW * VIEW_MARGIN - plateHalfX(currentScale))
maxY = max(0, halfH * VIEW_MARGIN - plateHalfY(currentScale))
offsetX = clamp(rawX, -maxX, maxX)
offsetY = clamp(rawY, -maxY, maxY)
```

If `1.1` still cannot sit at `DESIRED_NDC` without clip, the clamp wins: the group sits closer to center rather than leaving the frustum. Do not shrink below `1.1` when picked.

### Apply after billboard

Order in `Station` `useFrame`:

1. Compute targets (arrival, layout, scale, offset).
2. `slideX` / `slideY` / `scaleBoost` via existing `lerpToward` (`dt` clamped, `rate` `2.2`).
3. `g.position.copy(sit)`.
4. `g.quaternion.copy(camera.quaternion)` (unchanged billboard).
5. `g.translateX(slideX)` then `g.translateY(slideY)` — **local** camera axes, not `sit.x + worldX`.
6. `g.scale.setScalar(scaleBoost)`.

Do not add world +X. Do not change `sit.z` for this slide.

### SignDisk

Remove `!pickedMorph` from the visibility predicate. While BirthChat is open for this sign **and** the station is arrived, add the **same** camera-space `offsetX` / `offsetY` after the existing chest placement (copy sit, apply chest, billboard if the disk already follows the camera, then `translateX` / `translateY`). If the disk is not billboarded today, still add the offset in the **same camera right/up basis** used by `Station` so both stay registered.

While not arrived, SignDisk keeps its current sit/chest placement (offset target zero), matching `Station`.

### What does not change

- `uGlyphBiasX` stays `0` in `Station` and in `src/lib/galaxy/starRender.ts`.
- `computePlateOpacity` stays as-is (opaque; `morphLevel` unused).
- BirthChat DOM (`src/components/overlay/BirthChat.tsx`) keeps left sheet on `md+` and bottom sheet below `md`.
- `CONSTELLATIONS`, `SIGN_IDS`, travel, ephemeris, and station order stay Aries-first.
- `FallbackSky` has no world-X slide. It already holds the picked constellation while `chat` is open. Leave that path alone.

## Data flow

```
openBirthChat(signId)
  → vault.chat = true, vault.pickedSign = signId
  → fly loop sets galaxyTravel.tTarget = stationT(index)

each Station / SignDisk frame
  → picked = chat && pickedSign === this sign
  → arrived = |galaxyTravel.t − stationT(index)| <= ARRIVED_T
  → depth = |sit in camera space|.z
  → portraitSheet = cssWidth < 768
  → target scale from fit test (1 / 1.1 / 1.4)
  → target offset {0,0} unless picked && arrived
  → else camera-space offset toward DESIRED_NDC, clamped
  → lerp → billboard → translateX/Y → scale
```

Inputs to the pure helpers: `picked`, `travelT`, `stationT`, `fov`, `sitCameraZ`, `aspect`, `cssWidth`, `plateWide`, `plateAspect`, `currentScale`. No React store inside the math module.

## Error and edge cases

**Tap while flying.** Offset target is `{0,0}` until `ARRIVED_T`. Stars stay on the approaching station. Scale may grow on-axis. When `t` crosses the epsilon, offset eases to the well. No special “catch-up” teleport.

**Desktop vs phone.** Width `>= 768`: slide on camera right to NDC x `+0.35`. Width `< 768`: lift on camera up to NDC y `+0.35`, x extra `0`. A 390×844 phone never uses the right-quarter slide.

**Resize / rotate.** Recompute layout mode, depth, and clamp every frame from live camera and CSS width. A rotate from portrait sheet to `md` landscape retargets from lift to right-slide through `lerpToward`.

**Narrow desktop.** If ×1.4 cannot sit at NDC `+0.35` inside `VIEW_MARGIN`, use ×1.1. If ×1.1 still cannot, clamp offset toward center. The plate may sit left of `+0.35` but remains on screen.

**Depth near zero.** If `depth` is below `1e-3`, treat targets as rest (`offset {0,0}`, do not divide by a degenerate frustum). This is a numerical guard, not a gameplay state.

**Unpick / close chat.** `picked` false → offset and scale targets return to rest. SignDisk visibility no longer depends on `pickedMorph`; it uses the existing gather / intro / veil tests only.

**Direct seek + chat.** The fly loop already pins `tTarget` to the picked station while chatting. Arrival is still measured against `galaxyTravel.t`, not `tTarget`.

**Fallback sky.** No slide math. If WebGL is down, the 2D hold-on-picked draw stays as it is.

**Reduced motion.** Morph swirl already damps via `prefersReducedMotion`. Offset/scale still use `lerpToward` at rate `2.2` (same as today). Do not skip the arrival gate under reduced motion.

## Testing

Extend `src/lib/galaxy/birthchat-slide.test.ts` (already in `npm test`). Keep `lerpToward` and `computePlateOpacity` cases. Replace `computeRightPanelTargetX` cases that lock `halfW * 0.5` and world-Z depth.

Required cases on the new helpers:

1. **Not picked** → offset `{0,0}`, scale `1`.
2. **Picked, not arrived** (`|t − dest| > 0.02`) → offset `{0,0}` even if depth is large (e.g. camera-space `|z| = 200`).
3. **Picked, arrived, desktop width** (`cssWidth = 1280`) → `x > 0`, `y === 0`; `|x|` matches `0.35 * halfW` before clamp (within `1e-9`) when 1.4 fits.
4. **Picked, arrived, phone width** (`cssWidth = 390`) → `x === 0`, `y > 0`; `|y|` matches `0.35 * halfH` before clamp when 1.1/1.4 fit.
5. **View depth** uses `abs(sitCameraZ)`, not a caller-supplied world `cam.z − sit.z`. A huge world-Z delta that is **not** passed as `sitCameraZ` cannot affect the result.
6. **Clamp** — at a depth and scale where `0.35 * halfW + plateHalfX > halfW * 0.92`, `|offset.x| + plateHalfX <= halfW * 0.92 + 1e-9`.
7. **Soft scale** — construct a frustum where 1.4 fails the fit test and 1.1 passes; target scale is `1.1`.
8. **Wide desktop** — typical `fov = 64`, `depth = 26`, `aspect = 16/9`, 16:9 plate; target scale is `1.4`.
9. **Opacity unchanged** — existing morphLevel cases still pass.

Run:

```
node --experimental-strip-types --test src/lib/galaxy/birthchat-slide.test.ts
```

## Files to change

| File | Change |
| --- | --- |
| `src/lib/galaxy/birthchat-slide.ts` | Replace `computeRightPanelTargetX` / `computeTargetScale` with arrival, view-depth, layout, scale-fit, and clamped camera-space offset helpers. Keep `lerpToward` and `computePlateOpacity`. |
| `src/lib/galaxy/birthchat-slide.test.ts` | Rewrite offset/scale describes; keep lerp and opacity. |
| `src/components/scene/GalaxyIntro.tsx` | `Station`: arrived gate, view depth, billboard-then-`translateX/Y`, `slideY` ref. `SignDisk`: drop `pickedMorph` hide; apply the same offset. |

Do not change `src/lib/galaxy/starRender.ts`, `BirthChat.tsx`, `FallbackSky.tsx`, `temple.ts` station data, or vault store shape.

## Verification checklist

Manual, after unit tests pass. Use the live WebGL sky, not FallbackSky.

1. From far along the nave, tap a sign before the camera arrives. Stars stay visible on the approaching plate. They do not jump off the right edge.
2. After arrival on a **wide desktop**, the plate eases into the transparent right well. It reads as a pop into BirthChat, not a clip. Horizontal center of the plate is near NDC **+0.35**, not **+0.5**.
3. On a **390-wide** viewport, the plate **lifts** into the sky above the sheet. It does not slide right.
4. On a mid-width window where ×1.4 would clip at +0.35, the plate is closer to ×1.1 and still fully on screen.
5. `SignDisk` remains visible during BirthChat and stays registered with the plate (same offset).
6. Plate art stays fully opaque through morph. Glyph stars form on the plate. No double-shift (shader bias still 0).
7. Close BirthChat: plate and disk ease back to sit, scale 1.
8. Rotate or resize while chat is open: offset retargets (right vs up) without leaving the viewport.

## Implementation order

1. Write failing tests for arrival, view depth, desktop vs phone axes, NDC 0.35, clamp, and soft scale.
2. Implement helpers until those tests pass. Keep opacity and lerp tests green.
3. Wire `Station` (billboard, then local X/Y, view depth, arrival).
4. Wire `SignDisk` (visible + same offset).
5. Run the verification checklist on desktop and 390-wide.

This is one implementation plan: three files, one animation path, no overlay or shader work.
