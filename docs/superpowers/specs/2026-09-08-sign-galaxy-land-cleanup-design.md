# Sign Galaxy Land Cleanup

## Problem

After diving into a sign galaxy, land (`explorePhase === "inside"`) still shows corridor leftovers — notably a warm yellow particle smear beside the animal form (e.g. Aries horn). Hub copy (“First star” / Galaxy threshold) was hard to read when centered over dense stars. Enter dive curves themselves are largely fine; the gap is **post-land sky hygiene** plus a locked lower-third HUD.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Scope | Broader land cleanup: smear + leftover corridor layers + HUD readability |
| Landed sky | Animal-star galaxy field **plus** soft ambient haze; no corridor junk |
| HUD layout | Lower third: kicker + title + body above star dots / claim CTA, with soft dark wash |
| Leftover hard-off | Only when `explorePhase === "inside"`; dive still uses existing fade curves |
| Approach | **Inside hard-gate** — force-hide leftovers at land regardless of residual fade |
| Tropical order | Untouched |

## Non-goals

- Rewriting seamless enter dive curves / Skip soft-blackout
- Claim / auth / BirthChat flow changes
- New insight or hub copy strings
- Free 6DOF camera rewrite
- Reordering `CONSTELLATIONS` / calendar strip mapping
- Intentional long-lived animal silhouette residue (explicitly rejected)

## Architecture

```text
Enter (fading/diving)     existing worldFade / plateFade / galaxyForm curves
        │
        ▼
Land (inside) ──► hard-gate: force-hide leftovers
        │              keep SignGalaxyField + soft haze
        │              HUD lower-third + wash
        ▼
Exit ──► hard-gate lifts; corridor layers restore as today
```

### Inside hard-gate

When `explorePhase === "inside"` (for the active explore sign’s station):

| Layer | Behavior |
| --- | --- |
| SignDisk | `visible = false` (ignore residual `worldFade` / gather) |
| CornerGalaxies | `visible = false` |
| Station gather / dense cloud points | `visible = false` (or opacity 0) |
| Plate art / SignShell | Force hide if anything remains (`plateFade` should already be ~0) |
| SignGalaxyField | Remains on (stars, travel nodes, faint lines) |
| Soft ambient haze | Allowed — quiet haze/fog only, not a warm additive particle smear |

Enter phases (`fading` / `diving`) keep today’s dissolve curves. The hard-gate lifts when leaving `inside` (exit back to corridor).

### HUD (landed)

- Top: Back + sign name (+ AuthSlot when needed) — unchanged intent.
- Mid: empty spacer so the sky stays open.
- Lower third: tone kicker → title → body, then travel-point dots + claim CTA.
- Soft dark radial wash + text-shadow behind copy (e.g. `sign-galaxy-copy` treatment).
- Soft settle when entering `inside` (opacity / slight translate) — not centered over the form.

## Files (expected touchpoints)

- `src/components/scene/GalaxyIntro.tsx` — SignDisk / Station cloud / plate hard-gate at `inside`
- `src/components/scene/CornerGalaxies.tsx` — hide when exploring `inside`
- `src/components/scene/SignGalaxyField.tsx` — remain the landed field hero; no accidental hide
- `src/components/overlay/SignGalaxyHud.tsx` + `src/styles.css` — confirm lower-third + wash
- Remove temporary debug ingest instrumentation added while identifying the smear
- Optional small helper / test: `inside ⇒ leftovers off` if logic is extracted

## Success

- Landed Aries (and at least one other sign): no warm elongated particle smear beside the form.
- Sky reads as animal field + soft haze only; disk / corners / station cloud / plate gone.
- Hub copy sits in the lower third and stays readable over stars.
- Enter dive still continuous; Skip soft-blackout unchanged.
- Exit restores corridor layers.
- Reduced motion: same hard-gate at land; shortened enter still lands clean.
- Tropical order unchanged.

## Relationship to prior specs

- Builds on [Sign Explorable Galaxies](2026-09-06-sign-explorable-galaxies-design.md) and [Seamless Sign-Enter Dive](2026-09-08-seamless-sign-enter-dive-design.md).
- Does **not** change enter progress windows; only adds a post-land visibility hard-gate and locks HUD placement/readability.
