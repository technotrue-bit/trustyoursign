# ChartSession boundaries (architecture #1)

Make **ChartSession** the single unit of “a natal is open,” with small one-job modules and selector/hook-only UI reads. Behavior of the friends-and-family path stays frozen; structure moves via a strangler.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Goal | Cleaner agent/human edits — small files, one job each |
| Scope | Full boundary pass: session types + split store + selector-only reads |
| Migration | Strangler — add modules/compat first; migrate callers file-by-file; delete old fields last |
| Package layout | By concern under `src/lib/chart/session/` |
| Product behavior | No intentional UX change in this pass |

## Problem

“Being in a chart” is spread across `useVault` flags:

- `entered`, `gate`, `chartId`, `research`, `shelf`, `skyNatal`, `birth`, `pickedSign`, `tourBeat`

Three openers (`openVisitor`, `openChart`, `openShelf`) each invent a different bundle. Call sites re-derive identity (`entered && !shelf`, `chartId === "visitor"`, …). That makes updates risky and files hard to edit in isolation.

## Goal

1. One object answers “whose natal is open?” → `session`.
2. Galaxy travel and BirthChat claim stay **outside** that object.
3. Domain code lives in small modules (types / factories / actions / selectors / store / hooks).
4. After migration, React reads session **only** through hooks; no raw store field probing for natal identity.
5. F&F path unchanged: fly → claim → cast → Open natal → Sky land.

## Non-goals

- Room capability matrix (architecture #2)
- Splitting `VaultApp` shells (architecture #3)
- Unifying DB persistence for notes/threads (architecture #4)
- Multiplayer / shared sessions (architecture #5)
- Reordering `CONSTELLATIONS` / changing travel or ephemeris math
- New product rooms or UX chrome

## Architecture

### Module map

Root: `src/lib/chart/session/`

| Module | One job | Must not own |
| --- | --- | --- |
| `types.ts` | `ChartSession`, `ClaimDraft`, `SessionKind`, `BirthFacts`, `Surface` | Store, React, travel |
| `factories.ts` | Pure builders: visitor / research / shelf → `ChartSession` | Side effects, network, `seekSign` |
| `actions.ts` | Pure transitions: open / patch / close / mode / select / tour → next state | DOM, galaxy, HTTP |
| `selectors.ts` | Pure reads: entered, nativity, origin, kind checks | Mutations |
| `store.ts` | Zustand: `session`, `claim`, `surface`; calls factories/actions; explicit galaxy side-effect helpers on open/close | UI, Ask |
| `hooks.ts` | `useSession`, `useNativity`, `useClaim`, `useSurface`, `useSessionMode`, … — **only** UI read path | Business rules (use selectors) |
| `index.ts` | Public exports for the package | Implementation details of compat |
| `compat.ts` | Temporary old-name views (`entered`, `research`, `shelf`, …) for unmigrated callers | New features; delete at end of strangler |

`src/lib/chart/nativity.ts`’s `useNativity()` becomes a re-export of the session hook (or is deleted once callers import from `session/hooks`). Tour beat helpers stay in `src/lib/chart/tour.ts`; session `actions.ts` calls them, it does not copy tour tables.

**Outside this pass (unchanged ownership):**

- `src/lib/galaxy/*` — travel/intro only; may be *called* from session store helpers; travel math does not import session types
- `visitor-nativity.ts`, `ephemeris.ts`, research loaders — producers; factories wrap outputs
- Overlay/scene components — migrate to hooks; no new session logic inline

### Top-level state

```text
session: ChartSession | null
claim:   ClaimDraft | null     // BirthChat only
surface: "galaxy" | "library"  // meaningful when session === null
```

Derived: `entered ⇔ session !== null`.  
BirthChat active ⇔ `claim !== null && session === null`. Claim is never a session; do not add a fourth top-level mode enum in this pass.

Public barrel: `index.ts` re-exports types, factories, actions, selectors, store, and hooks for app imports. `compat.ts` is imported only by the legacy store façade during S1–S2, not by new UI.

### ChartSession shape

Shared fields:

- Identity: `id`, `kind`, `chartKey`, `label`, `relation`, `personName`, `signId`, `tone`
- Facts: `birth` (`BirthFacts`)
- Books: `nativity` (`Nativity | null`), `skyNatal` (`SkyNatal | null`)
- Navigation: `origin` (`"galaxy" | "library"`)
- Cursors: `mode`, `selection`, `hovered`, `tourBeat`, `sheetFolded`

Kinds:

| Kind | Rules |
| --- | --- |
| `visitor` | `chartKey: "visitor"`; optional `savedId` when persisted; `nativity` required once opened from cast |
| `research` | `chartKey: "joey" \| "saige"`; `nativity` required; `skyNatal` usually null |
| `shelf` | May have `nativity: null` with `skyNatal` only (sun-shelf / incomplete); `id` aligns with saved row when known |

`ClaimDraft`: `{ signId, birth: BirthFacts | null }` — pre-session only.

### Invariants

1. At most one `session`.
2. `session === null` ⇔ natal rooms off.
3. Store field is `nativity`, not `research`.
4. Branch on `kind` / `origin`, not flag combos.
5. `tourBeat` non-null only for allowed research walkthroughs (Joey today).
6. Galaxy store does not import session types into travel math.
7. After a file migrates: React reads only via `hooks.ts`. `compat.ts` is temporary.

### Lifecycle

```text
null session
  ├─ surface galaxy → claim (BirthChat) → cast → openSession(visitor)
  ├─ surface library → load research → openSession(research)
  └─ open saved sketch → openSession(shelf)
       └─ enrich cast → patchSession (same id)

open session
  ├─ setMode / select / tour (cursors only)
  ├─ patchSession (tone, skyNatal, nativity, savedId)
  └─ closeSession → null + return to session.origin surface
```

Replace today’s openers:

| Today | Session API |
| --- | --- |
| `openVisitor` | `openSession` + `fromVisitor` factory |
| `openChart` | `openSession` + `fromResearch` factory |
| `openShelf` | `openSession` + `fromShelf` factory |
| `goBack` branches | `closeSession()` using `session.origin` / claim / surface |
| `setShelfNatal` / `setShelfTone` | `patchSession` |

### Call-site rules

| Allowed | Forbidden (after a file migrates) |
| --- | --- |
| Session hooks | `useVault(s => s.research \| s.shelf \| s.entered \| s.skyNatal)` |
| `openSession` / `closeSession` / `patchSession` | Ad-hoc multi-field `set({ chartId, research, shelf, … })` in components |
| Galaxy `seekSign` only in session store side-effect helpers | Panels inventing session fields + calling travel |

### Update playbook

- New open path → `factories.ts` + `actions.ts`
- New derived boolean → `selectors.ts` + one hook
- UI chrome only → component file; no store shape change
- Future persistence (#4) → `SavedChart` ↔ session mapping in factories only

## Strangler phases

| Phase | Work | Done when |
| --- | --- | --- |
| **S0** | Add `session/` types, factories, actions, selectors + pure tests | Tests green; UI unchanged |
| **S1** | Wire Zustand to real `session` / `claim` / `surface`; `compat.ts` mirrors old names | Existing callers work |
| **S2** | Migrate consumers one file at a time to hooks (`BirthChat` → `VaultApp` → `ChartCanvas` → panels → Ask/tour) | Grep for raw identity fields shrinks |
| **S3** | Delete `compat.ts` and old source-of-truth fields; thin or remove legacy `src/lib/store.ts` | No parallel flag model |
| **S4** | Note: room allowlists deferred to architecture #2 | Checklist signed off |

**Per-PR rule:** F&F path and research/shelf open/close behavior unchanged.

## Testing

- Unit (no React): factories, actions, selectors — including `closeTarget` / origin for goBack
- After S1 and each major S2 batch: smoke F&F path (claim → open natal → Sky)
- No requirement to expand browser coverage beyond existing smoke for structure-only PRs unless a regression appears

## Acceptance checklist

- [ ] `src/lib/chart/session/` exists with the module map above
- [ ] App state is `session` / `claim` / `surface` (compat only during strangler)
- [ ] One opener path: `openSession` (+ factories)
- [ ] Migrated UI uses hooks only for natal identity
- [ ] `compat.ts` removed at S3
- [ ] Grep clean of `s.research` / `s.shelf` / `s.entered` as source of truth
- [ ] F&F + research + shelf open/close verified unchanged

## Relationship to later architecture items

| # | Item | Depends on this |
| --- | --- | --- |
| 2 | Rooms as capability matrix | Branches on `session.kind` |
| 3 | Shell split by gate | Shells read `session` / `claim` / `surface` |
| 4 | Persist around saved charts | Factories map rows ↔ session |
| 5 | Shared reading rooms | Premature until session is clean |
