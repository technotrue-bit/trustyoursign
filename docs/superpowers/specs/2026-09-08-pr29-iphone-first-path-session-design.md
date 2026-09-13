# PR #29 — iPhone first-path + claim is a session draft

**For Build / Cursor:** implement from
`docs/superpowers/plans/2026-09-08-pr29-iphone-first-path-session.md`.
Do not invent rooms, shells, saved-chart persistence, volume mesh, or security P0.

## Visitor sentence

A friend on mid-iPhone Safari can fly → claim → BirthChat → Open this natal → Sky
without the stage jumping, the keyboard eating the sky, or chrome covering the thumb.

Claim is a `ClaimDraft`. “Open this natal” opens a `visitor` ChartSession. That is
the identity model — not a new product surface.

## Base

Current `main` after #25–#28 (gold Sign in, Sag plate restore, land cleanup,
silent 10s selection hold). Rebase onto latest `main`. Do not stack
`rooms-*`, `shell-gate-*`, `saved-chart-*`, or `security-p0-*`.

## Locked sources

| Doc | Role in #29 |
| --- | --- |
| `docs/superpowers/specs/2026-09-03-iphone-first-path-stability-design.md` | Path UX — implement all five fixes |
| `docs/superpowers/specs/2026-09-04-chart-session-boundaries-design.md` | S0 + claim wiring only (`claim` + `openSession(fromVisitor)`) |

## In

1. Path-only iPhone stability (StageLock keyboard freeze, 16px path fields,
   one thumb band, BirthChat first paint, SceneGate 48ms).
2. ChartSession S0 types/factories/actions/selectors + tests.
3. BirthChat sets `claim: { signId, birth }`. “Open this natal” calls
   `openSession(fromVisitor)` and clears `claim`.
4. Silent 10s hold from #28 **pauses** while `claim !== null`.

## Out (explicit)

- `upsertChart` / library reopen / Ask key migration (architecture #4 → later)
- Gate-shell split, rooms allowlists
- Volume mesh / SignShell live corridor
- Security P0 (OWNER_PASSWORD, RLS, rate-limit) — Turnstile already on main
- New animation library, Android-first pass, Bones/Ask density redesign
- Full ChartSession S2–S3 (delete every compat field) unless a file you already
  touch is cheap to hook

## Journey (device bar)

Mid iPhone Safari ~390×844. Also verify ~430×932.

```text
Cold open
  → intro / Skip          (stage must not jump)
  → fly / swipe signs     (rail + CTA above home indicator)
  → This is my sign       (cookie cannot cover it)
  → BirthChat sheet       (16px fields; sky frozen while keyboard is up)
  → plate lift into well  (Station + SignDisk same scale)
  → Open this natal       (one primary)
  → Sky land              (SceneGate ≤ 48ms; no stacked header)
```

Stability over cinema. Keep travel seek, BirthChat `lerpToward` rate 2.2,
existing CSS. Fix wrong motion only.

## Architecture (claim vs session)

```text
session: null
surface: galaxy
claim:   null                 → fly / hold / strip

claim:   { signId, birth }    → BirthChat sheet (keyboard freeze applies)
session: still null           → not a natal yet

Open this natal
  → openSession(fromVisitor)
  → claim = null
  → Sky land
```

- BirthChat active ⇔ `claim !== null && session === null`
- Galaxy travel does not import session types
- Persistence / `savedId` / `charts` rows are out of this PR
- Guest tab memory (`sessionStorage` for the draft) is optional, not required

## Chrome budget (phone)

| Slot | Owns | Must not |
| --- | --- | --- |
| Top row | Title + Skip + Auth | Second CTA |
| Mid | Sky only | Extra HUD |
| Thumb band | Strip + one-line hint + This is my sign | Cookie under the CTA |
| Cookie/legal | One compact dismissible row **above** the strip | Second stacked footer |

`--overlay-hit` phone query: `max-width: 767px` (not 720). Cap hit at `2.75rem`
on real Safari; larger inset only when preview-hosted.

## Acceptance

On mid-iPhone Safari, cold start:

1. Intro/Skip — no stage jump.
2. Fly/swipe — This is my sign clear of home indicator; cookie not on the CTA.
3. BirthChat — date fields visible; focus month/day/year/place → no zoom, sky does not shrink.
4. Claim — plate lifts into the well; no disk/plate drift.
5. Open this natal — Sky without a long black flash or stacked header.
6. Hold timer does not clear the sign under the sheet; resumes after dismiss if never cast.
7. `npm test` + `npm run typecheck` green. No new console errors.

## Brand

Warm black / parchment / `#c9a15b`. Lower-third copy + soft wash. Do not invent
a new chrome system. Do not hide the Grok “Created with Grok / Remix” pill.
