# Gate shells over one canvas (architecture #3)

Split overlay chrome into **four gate shells** while keeping a single always-mounted WebGL stage. Structure and mount policy only — no intentional UX change.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Goal | Cleaner edits: one shell file per gate; inactive chrome unmounts |
| Shells | Galaxy / Claim / Library / Natal |
| Stage | Always owned by parent `VaultApp` — never unmounts on gate change |
| Mount policy | Conditional render — exactly one overlay shell at a time |
| Product behavior | No intentional UX change |
| Package layout | Flat siblings under `src/components/overlay/` |

## Problem

`VaultApp.tsx` (~640 lines) still owns galaxy copy, BirthChat, library intro/shelf, and natal chrome in one module. Gate predicates are correct after ChartSession (#1), but inactive UI often stays in the mental (and sometimes React) surface area of one file. Agents editing BirthChat risk touching fly chrome and vice versa.

## Goal

1. Parent owns stage + exclusive shell switch + cross-gate effects (`?desk=`, global keys that span gates, `galaxyTravel.busy`).
2. Four overlay shells — only the active gate’s chrome is mounted.
3. Same F&F path: fly → claim → open natal → Escape; library desk; shelf open.
4. Natal dock continues to use `roomsFor` once architecture #2 is merged (no reintroduction of local allowlist Sets).

## Non-goals

- New routes or URL scheme redesign
- Changing room allowlists (#2) or ChartSession shape (#1)
- Persistence unify (#4) or multiplayer (#5)
- Visual redesign of galaxy / BirthChat / desk
- Remounting or forking the WebGL canvas per gate

## Architecture

### Module map

| Module | Owns | Must not own |
| --- | --- | --- |
| `VaultApp.tsx` | StageLock, Scene/Fallback + error boundary, StarBack predicate, exclusive shell switch, cross-gate keyboard / `?desk=`, `galaxyTravel.busy` | Gate-local copy/layout for fly/claim/library/natal |
| `GalaxyShell.tsx` | Fly overlay (`GalaxyCopy` moved here) | BirthChat, library, natal Chrome |
| `ClaimShell.tsx` | BirthChat mount | Galaxy title stack, library, natal |
| `LibraryShell.tsx` | Desk intro + saved shelf list | Natal Chrome, BirthChat |
| `NatalShell.tsx` | Chart Chrome + TourGuide | Galaxy fly CTA, BirthChat |

Shared atoms (auth chip, legal line) stay **shared components** imported by shells or parent — do not paste predicates.

### Exclusive switch

Derived (same meanings as today):

- `entered` ⇔ session open  
- `claiming` ⇔ claim draft open and not entered  
- `surface` / session origin for outside gate  

```text
if entered                 → <NatalShell />
else if claiming           → <ClaimShell />
else if surface === "library" → <LibraryShell />
else                       → <GalaxyShell />
```

### Mount policy

- Inactive shells: `{cond ? <Shell /> : null}` — **unmount**, do not `hidden`/opacity-only.
- Stage + StageLock + WebGL/Fallback: **always mounted** while `VaultApp` is mounted.
- StarBack: keep parent-level predicate (natal non-shelf / claim / library) so backdrop does not thrash with shell files.

### Natal + rooms (#2)

`NatalShell` / Chrome must call `roomsFor(session.kind)` for the dock (architecture #2). If implementing this pass before #2 merges, land #2 first or stack on the rooms branch — do not bring back `VISITOR_ROOMS` Sets.

## Migration phases

| Phase | Work | Done when |
| --- | --- | --- |
| **G0** | Extract shell files; parent imports them with **current** conditionals | Typecheck; visual parity |
| **G1** | Exclusive switch (exactly one shell) | BirthChat/Intro/Chrome unmount when inactive; stage stays up |
| **G2** | Confirm globals stay in parent; no duplicate key listeners in shells | Grep: one Escape/`?desk=` owner |
| **G3** | Smoke F&F + library + shelf | Checklist signed off |

**Per-PR rule:** Cut-paste existing UI; no drive-by refactors; no intentional UX change.

## Testing / acceptance

- Typecheck green; existing session unit tests still green  
- Manual: galaxy → This is my sign → BirthChat → open natal → Escape returns; library `?desk=`; shelf open uses NatalShell  
- Confirm with React tree / behavior: BirthChat not mounted on pure galaxy; Chrome not mounted on library list  

### Checklist

- [ ] Four shell files exist; `VaultApp` is stage + switch  
- [ ] Exactly one overlay shell mounted per gate  
- [ ] WebGL stage does not remount on gate change  
- [ ] No local room allowlist Sets reintroduced in Natal chrome  
- [ ] F&F + library + shelf smoke pass  

## Relationship to other items

| # | Item | Relation |
| --- | --- | --- |
| 1 | ChartSession | **Prerequisite** — switch reads session/claim/surface |
| 2 | Rooms matrix | Natal dock uses `roomsFor`; merge before or with this |
| 4 | Persistence | Unrelated |
| 5 | Shared reading | Premature |

## Update playbook

- New gate-local chrome → edit that shell file only  
- Stage / WebGL / StageLock → parent only  
- Cross-gate shortcut or `?desk=` → parent only  
- New room → `#2` `rooms.ts`, not a shell file  
