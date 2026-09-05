# Rooms Capability Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode today’s chart-room allowlists in one pure module and enforce them so dock, keyboard, and `setMode` cannot open a forbidden room — with no product change to which rooms appear.

**Architecture:** Add `src/lib/chart/session/rooms.ts` (`ROOM_CATALOG`, `roomsFor`, `canEnter`). Guard `setModeState` and tour mode changes with no-op on deny. Point `VaultApp` dock + digit keys at `roomsFor(session.kind)`. Depends on ChartSession (architecture #1).

**Tech Stack:** TypeScript, existing session Zustand store, Node test runner via `npx tsx --test`, TanStack Start app.

## Global Constraints

- **Prerequisite:** ChartSession (#1) merged or this work is branched atop `cursor/chart-session-impl-49d2` (session package must exist).
- **No intentional UX change** to which rooms each kind shows (visitor 4 / shelf 2 / research 7).
- **Forbidden mode → no-op** (do not clamp to `sky`).
- Do not reorder tropical `CONSTELLATIONS` / change travel or ephemeris math.
- Do not implement architecture #3–#5.
- Commit after each task; keep `npx tsx --test src/lib/chart/session/*.test.ts` and `npm run typecheck` green.

## File map

| File | Responsibility |
| --- | --- |
| Create `src/lib/chart/session/rooms.ts` | Catalog + `roomsFor` + `canEnter` |
| Create `src/lib/chart/session/rooms.test.ts` | Pure matrix tests |
| Modify `src/lib/chart/session/actions.ts` | `setModeState` + `nextTourState` honor `canEnter` |
| Modify `src/lib/chart/session/actions.test.ts` | Forbidden no-op cases |
| Modify `src/lib/chart/session/factories.ts` | Assert / coerce initial mode via `canEnter` |
| Modify `src/lib/chart/session/factories.test.ts` | Illegal initial mode does not stick |
| Modify `src/lib/chart/session/index.ts` | Export rooms API |
| Modify `src/components/overlay/VaultApp.tsx` | Dock + keys use `roomsFor`; delete `VISITOR_ROOMS` |
| Modify `package.json` | Add `rooms.test.ts` to test script |

**Spec:** `docs/superpowers/specs/2026-09-05-rooms-capability-matrix-design.md`

---

### Task 1: `rooms.ts` matrix (R0)

**Files:**
- Create: `src/lib/chart/session/rooms.ts`
- Create: `src/lib/chart/session/rooms.test.ts`
- Modify: `package.json` (append rooms test path)

**Interfaces:**
- Consumes: `AppMode` from `@/lib/chart/types`, `SessionKind` from `./types`
- Produces: `ROOM_CATALOG`, `RoomDef`, `roomsFor`, `canEnter`

- [ ] **Step 1: Write the failing test**

Create `src/lib/chart/session/rooms.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROOM_CATALOG, canEnter, roomsFor } from "./rooms.ts";

describe("rooms matrix", () => {
  it("catalog is the seven rooms in dock order", () => {
    assert.deepEqual(
      ROOM_CATALOG.map((r) => r.id),
      ["sky", "body", "gates", "machine", "readings", "bones", "ask"],
    );
  });

  it("roomsFor matches today's allowlists", () => {
    assert.deepEqual(roomsFor("research").map((r) => r.id), ROOM_CATALOG.map((r) => r.id));
    assert.deepEqual(
      roomsFor("visitor").map((r) => r.id),
      ["sky", "body", "bones", "ask"],
    );
    assert.deepEqual(
      roomsFor("shelf").map((r) => r.id),
      ["sky", "ask"],
    );
  });

  it("canEnter is true only for allowlisted modes", () => {
    assert.equal(canEnter("visitor", "sky"), true);
    assert.equal(canEnter("visitor", "gates"), false);
    assert.equal(canEnter("shelf", "ask"), true);
    assert.equal(canEnter("shelf", "body"), false);
    assert.equal(canEnter("research", "machine"), true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/chart/session/rooms.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write `rooms.ts`**

```ts
import type { AppMode } from "@/lib/chart/types";
import type { SessionKind } from "./types";

export type RoomDef = {
  id: AppMode;
  label: string;
};

/** Full dock order — icons stay in VaultApp, keyed by id. */
export const ROOM_CATALOG: readonly RoomDef[] = [
  { id: "sky", label: "Sky" },
  { id: "body", label: "Body" },
  { id: "gates", label: "Gates" },
  { id: "machine", label: "Machine" },
  { id: "readings", label: "Readings" },
  { id: "bones", label: "Bones" },
  { id: "ask", label: "Ask" },
] as const;

const ALLOWED: Record<SessionKind, readonly AppMode[]> = {
  research: ROOM_CATALOG.map((r) => r.id),
  visitor: ["sky", "body", "bones", "ask"],
  shelf: ["sky", "ask"],
};

export function roomsFor(kind: SessionKind): RoomDef[] {
  const allow = new Set(ALLOWED[kind]);
  return ROOM_CATALOG.filter((r) => allow.has(r.id));
}

export function canEnter(kind: SessionKind, mode: AppMode): boolean {
  return ALLOWED[kind].includes(mode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/chart/session/rooms.test.ts`  
Expected: PASS

- [ ] **Step 5: Append to `package.json` test script**

Add `src/lib/chart/session/rooms.test.ts` to the `npx tsx --test …` list next to the other session tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chart/session/rooms.ts src/lib/chart/session/rooms.test.ts package.json
git commit -m "feat(session): add rooms capability matrix"
```

---

### Task 2: Guard `setModeState` + tour (R1)

**Files:**
- Modify: `src/lib/chart/session/actions.ts`
- Modify: `src/lib/chart/session/actions.test.ts`

**Interfaces:**
- Consumes: `canEnter` from `./rooms`
- Produces: updated `setModeState`, `nextTourState` (no-op when mode illegal)

- [ ] **Step 1: Write failing tests** in `actions.test.ts`

```ts
it("setModeState no-ops forbidden modes for visitor", () => {
  const opened = openSessionState(empty, session); // visitor from fromVisitor
  const blocked = setModeState(opened, "gates");
  assert.equal(blocked.session?.mode, "sky");
  assert.equal(blocked, opened); // same reference OK, or deep-equal mode/selection
});

it("setModeState still applies allowed modes", () => {
  const opened = openSessionState(empty, session);
  const next = setModeState(opened, "bones");
  assert.equal(next.session?.mode, "bones");
});

it("nextTourState no-ops when beat mode is illegal for kind", () => {
  // Build a shelf session via fromShelf, then nextTourState with mode body
  // Expect mode unchanged
});
```

Use real helpers already in the file (`openSessionState` / `fromVisitor` / `fromShelf` — match names on the #1 branch: if the branch uses `openSessionState` vs `openSession`, follow the file).

- [ ] **Step 2: Run tests — expect FAIL** on no-op cases

Run: `npx tsx --test src/lib/chart/session/actions.test.ts`

- [ ] **Step 3: Patch `setModeState`**

```ts
import { canEnter } from "./rooms";

export function setModeState(state: VaultDomainState, mode: AppMode): VaultDomainState {
  if (!state.session) return state;
  if (!canEnter(state.session.kind, mode)) return state;
  if (mode === "ask") {
    return { ...state, session: { ...state.session, mode, hovered: null } };
  }
  return {
    ...state,
    session: { ...state.session, mode, selection: null, hovered: null },
  };
}
```

- [ ] **Step 4: Patch `nextTourState`**

When `next` is non-null, if `!canEnter(state.session.kind, next.mode)`, return `state` unchanged (do not advance beat either — full no-op). If product should still advance beat while skipping mode, that would be a product change; **spec says no-op** — leave state unchanged.

- [ ] **Step 5: Run tests — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/lib/chart/session/actions.ts src/lib/chart/session/actions.test.ts
git commit -m "feat(session): no-op forbidden setMode and tour mode"
```

---

### Task 3: Factory initial mode guard (R1)

**Files:**
- Modify: `src/lib/chart/session/factories.ts`
- Modify: `src/lib/chart/session/factories.test.ts`

**Interfaces:**
- Consumes: `canEnter`
- Produces: factories that never return a session with illegal `mode`

- [ ] **Step 1: Failing test**

```ts
it("fromVisitor coerces illegal mode to sky", () => {
  const s = fromVisitor({
    /* minimal valid input */,
    mode: "gates",
  });
  assert.equal(s.mode, "sky");
  assert.equal(canEnter(s.kind, s.mode), true);
});

it("fromShelf coerces illegal mode to ask", () => {
  const s = fromShelf({ /* … */, mode: "body" });
  assert.equal(s.mode, "ask");
});
```

Fallback rule (when input mode illegal): first room in `roomsFor(kind)` (visitor/research → `sky`, shelf → `ask`).

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement helper in factories**

```ts
import { canEnter, roomsFor } from "./rooms";

function safeMode(kind: SessionKind, mode: AppMode | undefined, fallback: AppMode): AppMode {
  const candidate = mode ?? fallback;
  if (canEnter(kind, candidate)) return candidate;
  return roomsFor(kind)[0]?.id ?? fallback;
}
```

Use in `fromVisitor` / `fromResearch` / `fromShelf` when assigning `mode`.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/chart/session/factories.ts src/lib/chart/session/factories.test.ts
git commit -m "feat(session): coerce factory initial mode via rooms matrix"
```

---

### Task 4: Export rooms from barrel (R0/R2 bridge)

**Files:**
- Modify: `src/lib/chart/session/index.ts`

**Interfaces:**
- Produces: public exports `ROOM_CATALOG`, `roomsFor`, `canEnter`, type `RoomDef`

- [ ] **Step 1: Add exports**

```ts
export { ROOM_CATALOG, roomsFor, canEnter } from "./rooms";
export type { RoomDef } from "./rooms";
```

- [ ] **Step 2: `npm run typecheck`** — PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/chart/session/index.ts
git commit -m "feat(session): export rooms matrix from barrel"
```

---

### Task 5: VaultApp dock + keyboard (R2)

**Files:**
- Modify: `src/components/overlay/VaultApp.tsx`

**Interfaces:**
- Consumes: `roomsFor`, `ROOM_CATALOG` (optional), `useSessionKind` / session kind from hooks
- Removes: `VISITOR_ROOMS`, inline shelf `filter` allowlists

- [ ] **Step 1: Replace room list construction**

Today (impl branch):

```ts
const VISITOR_ROOMS = new Set<AppMode>(["sky", "body", "bones", "ask"]);
const rooms = shelf
  ? MODES.filter((m) => m.id === "sky" || m.id === "ask")
  : chartKey === "visitor"
    ? MODES.filter((m) => VISITOR_ROOMS.has(m.id))
    : MODES;
```

Replace with:

```ts
import { roomsFor } from "@/lib/chart/session";
// kind from useSessionKind() — when session null, Chrome is not mounted
const kind = useSessionKind(); // or session.kind
const roomDefs = kind ? roomsFor(kind) : [];
const rooms = roomDefs.map((r) => {
  const meta = MODES.find((m) => m.id === r.id)!; // icons/labels from existing MODES
  return meta;
});
```

Keep `MODES` as the icon/label map for all seven, or build icons from a local `ICON_BY_MODE` record keyed by `AppMode` — do **not** reintroduce allowlist Sets.

- [ ] **Step 2: Fix keyboard 1–7**

Digit handler lives on the VaultApp root (same file as `MODES[n - 1]` today ~line 140). Change to:

```ts
const kind = useSessionStore.getState().session?.kind;
if (!kind) return;
const allowed = roomsFor(kind);
const mode = allowed[n - 1];
if (mode) useSessionStore.getState().setMode(mode.id);
```

So key `2` = second **allowed** room (matches dock). Do not index the full seven-entry `MODES` array.

- [ ] **Step 3: `npm run typecheck`** — PASS

- [ ] **Step 4: Grep**

```bash
rg "VISITOR_ROOMS" src/components || true
```

Expected: no matches

- [ ] **Step 5: Commit**

```bash
git add src/components/overlay/VaultApp.tsx
git commit -m "refactor(session): drive dock and keys from roomsFor"
```

---

### Task 6: Acceptance (R3)

**Files:** none required unless gaps appear

- [ ] **Step 1: Confirm module + exports**

```bash
test -f src/lib/chart/session/rooms.ts
rg "roomsFor|canEnter|ROOM_CATALOG" src/lib/chart/session/index.ts
test ! -f src/lib/chart/session/compat.ts  # still true from #1
```

- [ ] **Step 2: Grep overlay allowlists**

```bash
rg "VISITOR_ROOMS|new Set<AppMode>" src/components/overlay || true
```

Expected: empty (or only unrelated)

- [ ] **Step 3: Run session tests + typecheck**

```bash
npx tsx --test src/lib/chart/session/*.test.ts
npm run typecheck
```

Expected: PASS

- [ ] **Step 4: Manual smoke (if server available)**

- Visitor session: dock shows Sky, Body, Bones, Ask only; key `3` → Bones (not Gates)
- Shelf: Sky, Ask only
- Research Joey: all seven; tour still advances

- [ ] **Step 5: Commit only if fixes needed**; otherwise note clean tree in the PR

---

## Self-review (plan vs spec)

| Spec requirement | Task |
| --- | --- |
| `rooms.ts` catalog + `roomsFor` + `canEnter` | Task 1 |
| Today’s allowlists unchanged | Task 1 tests |
| `setMode` no-op | Task 2 |
| Tour belt-and-suspenders | Task 2 |
| Factory initial mode | Task 3 |
| Barrel export | Task 4 |
| Dock + keyboard from matrix | Task 5 |
| Remove overlay allowlists | Task 5–6 |
| Acceptance checklist | Task 6 |
| No #3–#5 / no product room redesign | Global constraints |

**Prerequisite note:** If #1 is not on `main`, cut the implementation branch from `cursor/chart-session-impl-49d2` (or merge #6 first).
