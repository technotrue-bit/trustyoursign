# Sign Explorable Galaxies

## Problem

The main vault is one shared temple corridor with twelve stations. Constellation animal stars are 2D figure art for morph/outlines, not world travel targets. Selecting a sign opens claim immediately — there is no per-sign explorable space.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Layout source | **Animal figure** stars (`CONSTELLATIONS[i].animal`) — how the sign is formed |
| Travel points | Placed at animal-star positions (major joints / bright vertices as interactive points; full animal field as the galaxy spine) |
| Point purpose | Hub = birth chart; unlocked stars = insight / spicy / horror / warning |
| Entry trigger | Click the **selected** sign (title / station pick) |
| Entry beat | Everything but that sign’s stars & form fades out → slow dive into the sign-as-galaxy → plate/2D dissolves; stars expand into a volumetric galaxy formed from the animal figure |
| First star | Land on hub and open birth chart until the sign’s full chart + profile unlocks the rest |
| Corridor | Remains for browsing between signs; dive nests inside a station |
| Tropical order | Untouched (`CONSTELLATIONS` Aries-first; calendar strip mapping unchanged) |

## Non-goals

- Reordering `CONSTELLATIONS` / travel indices
- Auth / DB / new profile tables (reuse timed natal + saved self charts)
- Free 6DOF rewrite of the whole vault corridor
- Authored per-sign mesh assets (reuse volume recipe where gated)

## Architecture

```text
Corridor (temple t) ──click selected sign──► fade world
                                              │
                                              ▼
                                         dive + morph
                                    (plate → 0, galaxyForm → 1)
                                              │
                                              ▼
                                    Sign galaxy (local space)
                                    travel points @ animal stars
                                              │
                              hub claim / lore HUD / exit back
```

## Data

`src/lib/galaxy/signGalaxy.ts`

- Lift animal `StarPt` → local 3D (`x,y` from figure; `z` from depth falloff)
- Keep animal `lines` as travel lanes
- Pick interactive points from major animal stars; assign purposes from `TEMPLE_SIGNS` + chart modality/element

## State

Mutable `galaxyTravel` explore fields + zustand mirrors for HUD:

- `explorePhase`: idle | fading | diving | inside
- `exploreProgress`, `worldFade`, `plateFade`, `galaxyForm`
- `exploreSignIndex`, `pointIndex`

## UX

1. Fly/strip to a sign (unchanged).
2. Click sign name or station → enter (not immediate claim).
3. World chrome, other stations, distant field fade; current animal stars remain.
4. Camera eases in; plate/shell opacity → 0; stars bloom into galaxy.
5. Inside: seek points along form; HUD shows purpose; hub opens claim.
6. Back / Escape reverses to corridor.

## Success

- Clicking the selected sign never shows a lingering 2D plate during the dive.
- Galaxy silhouette reads as the animal figure.
- Travel points sit on animal stars and each shows a purpose.
- Strip calendar mapping and tropical indices unchanged.
- Reduced motion: shortened fade + snap form, still enterable.
