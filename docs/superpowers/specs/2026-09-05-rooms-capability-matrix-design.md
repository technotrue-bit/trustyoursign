# Rooms capability matrix (architecture #2)

Make **room allowlists** a single pure matrix next to ChartSession, and enforce them at the store so dock, keyboard, and deep links cannot open a forbidden room. Product room sets stay as they are today; only the source of truth and enforcement move.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Goal | One matrix for agent/human edits; hard enforcement |
| Product rooms | Unchanged — encode today’s visitor / research / shelf rules |
| Forbidden attempt | **No-op** — keep current allowed mode; do not clamp |
| Package layout | `src/lib/chart/session/rooms.ts` (Approach 1: pure matrix + guard in actions) |
| Depends on | Architecture #1 — branches on `session.kind` |

## Problem

Which rooms a chart may enter is scattered:

- `VISITOR_ROOMS` and shelf filters live in `VaultApp` chrome
- Research gets the full `MODES` list by omission
- `setMode` / keyboard `1–7` are not gated, so a caller can enter a room the dock does not show

That fights ChartSession: kind is centralized, but capabilities are not.

## Goal

1. One module answers “which rooms may this session enter?”
2. Dock and keyboard read that module — no local allowlist sets in overlay
3. `setMode` (and open defaults) no-op when the mode is illegal for `session.kind`
4. No intentional change to which rooms appear for visitor, research, or shelf

## Non-goals

- Changing allowlists (product redesign of rooms per kind)
- Shell split by gate (architecture #3)
- Persistence / saved-chart unify (architecture #4)
- Multiplayer rooms (architecture #5)
- Rewriting tour beat content
- Galaxy travel or BirthChat claim (no session yet)

## Architecture

### Module map

**Add:** `src/lib/chart/session/rooms.ts`

| Export | One job |
| --- | --- |
| `ROOM_CATALOG` | Ordered seven rooms: `id`, `label`, icon key (or label-only if icons stay in UI) |
| `roomsFor(kind)` | Allowlist for `visitor` \| `research` \| `shelf` |
| `canEnter(kind, mode)` | Boolean |
| (optional) `isRoomId` | Type guard |

**Change:** `actions.ts` → `setModeState` calls `canEnter`; if false, return state unchanged (preserve `mode` and selection).

**Change:** factories / open paths → initial `mode` must satisfy `canEnter` for that kind (today: visitor/research → `sky`, shelf → `ask`).

**Change:** `VaultApp` dock + keyboard → iterate `roomsFor(session.kind)` (or catalog entries filtered by it). Remove `VISITOR_ROOMS` and inline shelf filters.

**Export** from `session/index.ts`.

### Matrix contents (encode today)

**Catalog order (unchanged):**  
`sky` → `body` → `gates` → `machine` → `readings` → `bones` → `ask`

| `session.kind` | Allowed |
| --- | --- |
| `research` | all seven |
| `visitor` | `sky`, `body`, `bones`, `ask` |
| `shelf` | `sky`, `ask` |

### Enforcement

| Entry point | Behavior |
| --- | --- |
| `setMode` / `setModeState` | No-op if `!session` or `!canEnter(kind, mode)` |
| Keyboard | Prefer indices over **allowed** list so key `2` = second dock room (matches visible chrome). Store still no-ops if something sends a raw forbidden id |
| Open factories | Reject / replace illegal initial mode before session lands |
| Tour `nextTourState` | Research-only; if beat mode illegal, no-op mode change (belt-and-suspenders) |

**Not in scope:** claim/BirthChat, galaxy fly when `session === null`.

### Invariants

1. Dock visible set ≡ `roomsFor(session.kind)` (same order as catalog filtered by allowlist).
2. Successful `setMode` only to allowed modes for current kind.
3. Forbidden `setMode` does not clear selection or change mode (true no-op).
4. Allowed `setMode` keeps existing selection rules (clear selection except when entering `ask`).
5. No component owns a private copy of kind→rooms.

### Lifecycle (unchanged product paths)

```text
open visitor  → mode sky   (allowed)
open research → mode sky   (allowed; Joey tour may set beat mode)
open shelf    → mode ask   (allowed)
setMode(x)    → if canEnter then apply else no-op
```

## Migration phases

| Phase | Work | Done when |
| --- | --- | --- |
| **R0** | `rooms.ts` + pure tests | Tests green; UI unchanged |
| **R1** | Guard `setModeState` + open initial mode | Unit tests prove forbidden no-op |
| **R2** | Dock + keyboard use `roomsFor`; delete overlay allowlists | Grep clean in components |
| **R3** | Tour guard; smoke visitor / shelf / research docks | Checklist signed off |

**Per-PR rule:** Same rooms visible per kind as before this work.

## Testing

- Unit: `roomsFor` for each kind; `canEnter` true/false; `setModeState` no-op vs apply; open factory initial mode
- Manual/smoke: visitor dock has four rooms; shelf two; research seven; pressing a removed binding cannot land gates/machine/readings on visitor

## Acceptance checklist

- [ ] `src/lib/chart/session/rooms.ts` exists with catalog + `roomsFor` + `canEnter`
- [ ] `setModeState` no-ops forbidden modes
- [ ] Overlay has no local `VISITOR_ROOMS` / shelf room sets
- [ ] Keyboard uses allowed list (or equivalent UX-preserving mapping)
- [ ] Exported from session barrel
- [ ] Visitor / shelf / research dock counts unchanged vs pre-change baseline
- [ ] Session unit tests green; typecheck green

## Relationship to other architecture items

| # | Item | Relation |
| --- | --- | --- |
| 1 | ChartSession | **Prerequisite** — matrix keys off `session.kind` |
| 3 | Shell split | Shells consume `roomsFor`; do not redefine it |
| 4 | Persistence | Unrelated |
| 5 | Shared reading | Premature until matrix + session stay clean |

## Update playbook

- New room → `ROOM_CATALOG` + allowlist branch(es) in `rooms.ts` only  
- New session kind → one `roomsFor` branch  
- Dock chrome only → component file; no matrix edit  
