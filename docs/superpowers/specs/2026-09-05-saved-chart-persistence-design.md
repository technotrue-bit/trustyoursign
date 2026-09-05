# Saved-chart persistence hub (architecture #4)

Unify user-chart persistence around **`charts` rows** as the single hub. Session factories map rows ↔ open sessions; Ask/notes hang off `charts.id` when signed in. Research stays code-loaded.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Scope | Visitor + shelf on `charts`; research stays code-loaded (not a row) |
| Approach | Strangler hub — add upsert + `fromSavedChart`, migrate callers, delete dead paths |
| Ask (signed-in) | Key only by `charts.id`; migrate local threads on sign-in; drop orphans |
| Ask (guest) | localStorage only |
| Writes | One **`upsertChart`** (insert or update by id) |
| Open / Keep | Shared **`fromSavedChart`**; Keep upserts then patches live session `savedId` |
| Account + library | Both open via the same factory |

## Problem

User charts today split across insert-only `saveChart`, patch helpers (`persistNatal` / tone), session `savedId` that often stays unset, and Ask keys like `"visitor"` with no FK to `charts.id`. BirthChat “Keep” does not attach the returned id to the live session; library timed opens can reopen as a fresh visitor without the row. Signed-in Ask dual-writes localStorage + server under unstable keys.

## Goal

1. Every reopenable **user** chart is a `charts` row; open visitor/shelf sessions carry `savedId` when saved.
2. One upsert write path and one reopen factory used by BirthChat Keep, library, and account.
3. Signed-in Ask/field-notes key only by `charts.id`, with a one-time local → server migrate on sign-in.
4. Research (Joey/Saige) unchanged: still `fromResearch`, never a `charts` row.

## Non-goals

- Folding research into Postgres
- Shared reading / multiplayer (#5)
- Visual redesign of account or library
- Changing ChartSession kind model beyond threading `savedId`
- Changing rooms matrix (#2) or gate shells (#3)

## Architecture

### Module map

| Module | Owns | Must not own |
| --- | --- | --- |
| `src/lib/charts.ts` (hub) | `SavedChart`, `listCharts`, **`upsertChart`**, `deleteChart`, row ↔ DTO helpers | Session Zustand store, room allowlists, research file load |
| Session factories | **`fromSavedChart(row)`** → visitor or shelf session with `savedId`; Keep patches `savedId` on live session | SQL / Ask storage |
| Ask / field-notes | Signed-in: storage keyed by `charts.id`; guest: localStorage; migrate-on-sign-in | Inventing signed-in keys like `"visitor"` |
| LibraryShell + account | Both **open** via `fromSavedChart`; Keep/upsert call shared write path | Duplicate save payloads or local allowlists |
| Research | Code-loaded `fromResearch` only | `charts` rows |

### Identity

- Canonical id: `charts.id` (UUID).
- Session `savedId`: that UUID, or `null` for unsaved visitor / any research session.
- Hub kinds: **visitor** (timed natal) and **shelf** (sun-sign). Research is out of band.

### Write contract — `upsertChart`

- No id → insert for current user; return full row.
- With id → update provided fields (label, relation, birth, natal, tone, …); must belong to current user.
- Auth-scoped; never trust client `user_id`.
- Replaces call-site use of insert-only `saveChart` + ad-hoc natal/tone patches once callers migrate (strangler: old helpers may wrap upsert briefly).

### Read / open contract — `fromSavedChart`

- Input: `SavedChart` row (+ caller `origin`: library | account | galaxy).
- If row has usable natal (same rules as today’s library timed open) → visitor session with `savedId`.
- Else → shelf session with `savedId`.
- BirthChat **Keep**: `upsertChart` → patch live session `savedId` without remounting/resetting the chart.

### Ask / notes

| Actor | Key | Store |
| --- | --- | --- |
| Guest | ephemeral local key | localStorage only |
| Signed-in | `charts.id` | Server (`chart_ask` or successor) keyed by chart id |
| On sign-in | Migrate local threads that map to a saved chart; drop unmatched local threads for that browser | One-shot |

Signed-in code must not write Ask under `"visitor"` / research string keys.

## Migration phases

| Phase | Work | Done when |
| --- | --- | --- |
| **P0** | `upsertChart` + `fromSavedChart` + unit tests; keep old insert path temporarily | Typecheck; hub/factory tests green |
| **P1** | BirthChat Keep → upsert + set `savedId`; library opens via `fromSavedChart` | Reopen preserves id; Ask can bind |
| **P2** | Account open uses same factory; delete unchanged | Account opens into a session |
| **P3** | Ask signed-in keys = `charts.id`; migrate local on sign-in; stop signed-in string keys | Grep clean for signed-in `"visitor"` Ask keys |
| **P4** | Remove dead insert-only / dual paths nothing calls | Smoke: Keep → reopen → Ask survives |

**Per-PR rule:** Prefer vertical slices (P0→P1…) over drive-by refactors; no intentional UX change beyond correct save/reopen/Ask identity.

## Testing / acceptance

- Typecheck green; chart hub + session factory tests green
- Keep then reopen from library **and** account → same `savedId`, content intact
- Signed-in Ask survives reload keyed by chart id
- Guest Ask remains local-only
- Research open path unchanged (no `charts` row)
- Grep: no signed-in Ask writes under `"visitor"` after P3

### Checklist

- [ ] `upsertChart` + `fromSavedChart` exist and are tested
- [ ] Keep attaches `savedId` to the live session
- [ ] Library + account both open via `fromSavedChart`
- [ ] Signed-in Ask keyed by `charts.id` (+ migrate)
- [ ] Research still code-loaded
- [ ] Dead insert-only / string-key paths removed or unreachable

## Relationship to other items

| # | Item | Relation |
| --- | --- | --- |
| 1 | ChartSession | Prerequisite — `savedId` on session; factories own row mapping |
| 2 | Rooms matrix | Unrelated (dock still `roomsFor`) |
| 3 | Gate shells | Library/Natal/Claim call sites live in shells; hub stays in `lib/` |
| 5 | Shared reading | Premature — needs stable chart ids first |

## Update playbook

- New user-chart field to persist → `upsertChart` + `SavedChart` type, not a one-off patch API
- New open entry point → call `fromSavedChart`, do not hand-build visitor/shelf without `savedId`
- New Ask feature (signed-in) → key by `charts.id` only
- Research content → research module, never `charts` insert
