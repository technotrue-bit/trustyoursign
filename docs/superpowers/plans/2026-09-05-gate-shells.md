# Gate Shells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `VaultApp` overlay chrome into four exclusive gate shells (Galaxy / Claim / Library / Natal) while keeping one always-mounted WebGL stage — cut-paste only, no intentional UX change.

**Architecture:** Parent `VaultApp` owns Scene/`FallbackSky`, `StarBack` predicate, exclusive shell switch, cross-gate keyboard / `?desk=`, and `galaxyTravel.busy`. Four flat siblings under `src/components/overlay/` mount one at a time via `resolveGate`. Natal dock uses `roomsFor` from architecture #2. `StageLock` stays in `src/routes/__root.tsx` (already — do not move it).

**Tech Stack:** React 19, TypeScript, existing session Zustand hooks, Node test runner (`npx tsx --test`), TanStack Start.

## Global Constraints

- **Prerequisite:** Architecture #2 rooms matrix must be on the working branch before Task 4 (`roomsFor` / no `VISITOR_ROOMS`). Prefer merge PR #9 into `main`, else stack this work on `cursor/rooms-matrix-impl-49d2` and rebase after #9 merges.
- **No intentional UX change:** fly → BirthChat → open natal → Escape; library `?desk=`; shelf open.
- Cut-paste existing UI — no drive-by refactors, visual redesign, or route changes.
- Do not reorder `CONSTELLATIONS` / change travel or ephemeris math.
- Do not implement architecture #4–#5.
- Inactive shells **unmount** (`cond ? <Shell /> : null`), never `hidden`/opacity-only.
- WebGL `Scene` / `FallbackSky` stay mounted across gate changes (same React subtree under `VaultApp`).
- Commit after each task; keep session tests + `npm run typecheck` green.

**Spec:** `docs/superpowers/specs/2026-09-05-gate-shells-design.md` (design PR #10)

## File map

| File | Responsibility |
| --- | --- |
| Create `src/components/overlay/resolveGate.ts` | Pure exclusive-gate resolver |
| Create `src/components/overlay/resolveGate.test.ts` | Resolver unit tests |
| Create `src/components/overlay/GalaxyShell.tsx` | Fly overlay (former `GalaxyCopy`) |
| Create `src/components/overlay/ClaimShell.tsx` | BirthChat mount |
| Create `src/components/overlay/LibraryShell.tsx` | Desk intro + `SavedShelf` |
| Create `src/components/overlay/NatalShell.tsx` | Chart `Chrome` + `TourGuide`; dock via `roomsFor` |
| Modify `src/components/overlay/VaultApp.tsx` | Stage + StarBack + switch + cross-gate effects only |
| Modify `package.json` | Append `resolveGate.test.ts` to `test` script |

Do **not** move `StageLock` (owned by `src/routes/__root.tsx`). Do **not** move `StarBack` into shells.

**Name fidelity:** When moving code, keep current symbol names from `VaultApp.tsx` (`GalaxyCopy`, `Intro`, `SavedShelf`, `Chrome`, `chartRole`, `MODES`, hooks like `useIsEntered` / `useSessionKind`). Only rename the exported shell components as specified.

---

### Task 1: `resolveGate` (G0 helper)

**Files:**
- Create: `src/components/overlay/resolveGate.ts`
- Create: `src/components/overlay/resolveGate.test.ts`
- Modify: `package.json` (`test` script — append resolveGate test path)

**Interfaces:**
- Consumes: `Surface` from `@/lib/chart/session`
- Produces: `GateId`, `resolveGate({ entered, claiming, surface })`

- [ ] **Step 1: Write the failing test**

Create `src/components/overlay/resolveGate.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveGate } from "./resolveGate.ts";

describe("resolveGate", () => {
  it("prefers natal when entered", () => {
    assert.equal(
      resolveGate({ entered: true, claiming: true, surface: "library" }),
      "natal",
    );
  });

  it("uses claim when claiming and not entered", () => {
    assert.equal(
      resolveGate({ entered: false, claiming: true, surface: "galaxy" }),
      "claim",
    );
  });

  it("uses library when surface is library", () => {
    assert.equal(
      resolveGate({ entered: false, claiming: false, surface: "library" }),
      "library",
    );
  });

  it("defaults to galaxy", () => {
    assert.equal(
      resolveGate({ entered: false, claiming: false, surface: "galaxy" }),
      "galaxy",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/overlay/resolveGate.test.ts`  
Expected: FAIL (cannot find module `./resolveGate.ts`)

- [ ] **Step 3: Write minimal implementation**

Create `src/components/overlay/resolveGate.ts`:

```ts
import type { Surface } from "@/lib/chart/session";

export type GateId = "galaxy" | "claim" | "library" | "natal";

export function resolveGate(input: {
  entered: boolean;
  claiming: boolean;
  surface: Surface;
}): GateId {
  if (input.entered) return "natal";
  if (input.claiming) return "claim";
  if (input.surface === "library") return "library";
  return "galaxy";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/components/overlay/resolveGate.test.ts`  
Expected: PASS (4 tests)

- [ ] **Step 5: Wire test script + commit**

In `package.json`, append `src/components/overlay/resolveGate.test.ts` to the existing `npx tsx --test …` list in the `test` script (same line as the session tests).

```bash
git add src/components/overlay/resolveGate.ts src/components/overlay/resolveGate.test.ts package.json
git commit -m "feat: add resolveGate for exclusive shell switch"
```

---

### Task 2: GalaxyShell + ClaimShell (G0 extract)

**Files:**
- Create: `src/components/overlay/GalaxyShell.tsx`
- Create: `src/components/overlay/ClaimShell.tsx`
- Modify: `src/components/overlay/VaultApp.tsx`

**Interfaces:**
- Consumes: everything `GalaxyCopy` currently uses; `BirthChat`
- Produces: `export function GalaxyShell()`, `export function ClaimShell()`

- [ ] **Step 1: Create `GalaxyShell.tsx`**

1. Cut the entire `function GalaxyCopy() { … }` from `VaultApp.tsx`.
2. Paste into `GalaxyShell.tsx` as `export function GalaxyShell()`.
3. Copy **only** the imports that body references. Today that set includes:

```tsx
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy, currentConstellation } from "@/lib/galaxy/store";
import { noteControl } from "@/lib/galaxy/travel";
import { skipIntro } from "@/lib/galaxy/intro";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/chart/session";
import { Gloss, GlossRoot, GlossStage } from "./Gloss";
import { SignStrip } from "./SignStrip";
import { AuthSlot } from "./AuthSlot";
import { LegalFooter } from "./LegalFooter";

export function GalaxyShell() {
  // verbatim former GalaxyCopy body — no markup/class edits
}
```

If the body references additional symbols, import those too. Do not invent new paths.

- [ ] **Step 2: Create `ClaimShell.tsx`**

```tsx
import { BirthChat } from "./BirthChat";

export function ClaimShell() {
  return <BirthChat />;
}
```

- [ ] **Step 3: Wire into `VaultApp` without changing exclusivity yet**

```tsx
import { GalaxyShell } from "./GalaxyShell";
import { ClaimShell } from "./ClaimShell";
```

Replace:

```tsx
{!entered && gate === "galaxy" && !chat ? <GalaxyCopy /> : null}
{!entered && gate === "galaxy" && chat ? <BirthChat /> : null}
```

with:

```tsx
{!entered && gate === "galaxy" && !chat ? <GalaxyShell /> : null}
{!entered && gate === "galaxy" && chat ? <ClaimShell /> : null}
```

Delete local `GalaxyCopy`. Remove unused `BirthChat` import if nothing else in the file uses it. Leave `Intro` / `Chrome` / `TourGuide` / `SavedShelf` in `VaultApp`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/overlay/GalaxyShell.tsx src/components/overlay/ClaimShell.tsx src/components/overlay/VaultApp.tsx
git commit -m "refactor: extract GalaxyShell and ClaimShell"
```

---

### Task 3: LibraryShell (G0 extract)

**Files:**
- Create: `src/components/overlay/LibraryShell.tsx`
- Modify: `src/components/overlay/VaultApp.tsx`

**Interfaces:**
- Consumes: `Intro` + `SavedShelf` currently in `VaultApp`
- Produces: `export function LibraryShell()`

- [ ] **Step 1: Create `LibraryShell.tsx`**

Move `function Intro` and `function SavedShelf` from `VaultApp.tsx` into `LibraryShell.tsx`. Export:

```tsx
export function LibraryShell() {
  return <Intro />;
}
```

Keep `Intro` / `SavedShelf` file-local. Paste JSX unchanged. Import only what those functions need from current `VaultApp` imports, including:

- `useCurrentUser` from `@/lib/auth/use-current-user`
- `listCharts`, `SavedChart` from `@/lib/charts`
- `getResearchChart`, `listResearchLibrary` from `@/lib/chart/research`
- `computeVisitorNatal` from `@/lib/chart/sky`
- `useSessionStore` from `@/lib/chart/session`
- `isResearchChartId`, `ChartId` from `@/lib/chart/types`
- `SITE_OWNER`, `isSiteOwner` from `@/lib/owner`
- `Link` from `@tanstack/react-router`
- `Gloss`, `GlossRoot` from `./Gloss`

- [ ] **Step 2: Wire `VaultApp`**

Replace:

```tsx
{!entered && gate === "library" ? <Intro /> : null}
```

with:

```tsx
{!entered && gate === "library" ? <LibraryShell /> : null}
```

Delete local `Intro` / `SavedShelf`. Drop imports only they needed. Keep `getResearchChart` if the `?desk=` effect still uses it.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/LibraryShell.tsx src/components/overlay/VaultApp.tsx
git commit -m "refactor: extract LibraryShell"
```

---

### Task 4: NatalShell + `roomsFor` (G0 extract + #2)

**Files:**
- Create: `src/components/overlay/NatalShell.tsx`
- Modify: `src/components/overlay/VaultApp.tsx`

**Interfaces:**
- Consumes: `roomsFor` from `@/lib/chart/session`, lucide icons, former `Chrome` + `TourGuide` mount
- Produces: `export function NatalShell()`

**Prerequisite check (do before coding):**

```bash
test -f src/lib/chart/session/rooms.ts && rg "export function roomsFor" src/lib/chart/session/rooms.ts
```

Expected: file exists. If missing, stop — merge/stack architecture #2 first (`cursor/rooms-matrix-impl-49d2` / PR #9).

- [ ] **Step 1: Create `NatalShell.tsx`**

Move `function Chrome` and `function chartRole` from `VaultApp.tsx`. Move the `MODES` array (icons stay here). Mount `TourGuide` here.

Dock rooms via `roomsFor` — **delete `VISITOR_ROOMS`**; do not reintroduce local allowlists.

Replace Chrome’s room list computation with the architecture #2 pattern (same as rooms-matrix PR):

```tsx
import { roomsFor } from "@/lib/chart/session";
// …other hooks Chrome already uses: useSessionKind, useSessionChartKey,
// useSessionMode, useSessionStore, useSessionHovered, useShelfSession,
// useTourBeat, useNativity, beatById, cn, AskPanel, DetailPanel, AuthSlot

const roomDefs = sessionKind ? roomsFor(sessionKind) : [];
const rooms = roomDefs.map((room) => MODES.find((mode) => mode.id === room.id)!);
```

Export:

```tsx
export function NatalShell() {
  return (
    <>
      <Chrome />
      <TourGuide />
    </>
  );
}
```

Paste remaining `Chrome` JSX unchanged.

- [ ] **Step 2: Wire `VaultApp`**

Replace:

```tsx
{entered ? <Chrome /> : null}
{entered ? <TourGuide /> : null}
```

with:

```tsx
{entered ? <NatalShell /> : null}
```

Delete local `Chrome`, `chartRole`, `MODES`, `VISITOR_ROOMS`, and lucide imports that only Chrome needed. Remove `TourGuide` import from `VaultApp`.

Update the digit-key branch in the parent keydown handler to use `roomsFor` (architecture #2):

```tsx
import { roomsFor, useSessionStore /* … */ } from "@/lib/chart/session";

// inside onKey:
const n = Number(e.key);
if (n >= 1 && n <= 7) {
  const kind = st.session?.kind;
  if (!kind) return;
  const mode = roomsFor(kind)[n - 1];
  if (mode) st.setMode(mode.id);
}
```

- [ ] **Step 3: Typecheck + session/rooms tests**

Run:

```bash
npm run typecheck
npx tsx --test src/lib/chart/session/*.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/NatalShell.tsx src/components/overlay/VaultApp.tsx
git commit -m "refactor: extract NatalShell using roomsFor dock"
```

---

### Task 5: Exclusive switch in VaultApp (G1 + G2)

**Files:**
- Modify: `src/components/overlay/VaultApp.tsx`

**Interfaces:**
- Consumes: `resolveGate`, four shells, session hooks
- Produces: thin parent — stage + StarBack + one shell

- [ ] **Step 1: Switch on `resolveGate`**

Keep Scene-load / Escape / Enter / `?desk=` / busy effects. Replace overlay mounts with:

```tsx
import { resolveGate } from "./resolveGate";
import { GalaxyShell } from "./GalaxyShell";
import { ClaimShell } from "./ClaimShell";
import { LibraryShell } from "./LibraryShell";
import { NatalShell } from "./NatalShell";
import { StarBack } from "./StarBack";

export function VaultApp() {
  const claim = useClaim();
  const surface = useSurface();
  const entered = useIsEntered();
  const sessionKind = useSessionKind();
  const claiming = claim !== null && !entered;
  const shelf = sessionKind === "shelf";
  const gate = resolveGate({ entered, claiming, surface });

  // existing Scene / keydown / boot / busy / ?desk= effects stay here

  return (
    <main
      className="vault-stage relative overflow-hidden bg-bg text-fg"
      style={{ background: "#0c0b0a", color: "#efe8dc" }}
    >
      {Scene && !sceneFailed ? (
        <SceneErrorBoundary fallback={<FallbackSky />}>
          <Scene />
        </SceneErrorBoundary>
      ) : (
        <FallbackSky />
      )}
      {(gate === "natal" && !shelf) || gate === "claim" || gate === "library" ? (
        <StarBack />
      ) : null}
      {gate === "galaxy" ? <GalaxyShell /> : null}
      {gate === "claim" ? <ClaimShell /> : null}
      {gate === "library" ? <LibraryShell /> : null}
      {gate === "natal" ? <NatalShell /> : null}
    </main>
  );
}
```

**StarBack parity:** Today’s predicate is `(entered && !shelf) || chat || gate === "library"` where old `gate` was `sessionOrigin ?? surface`. After exclusive resolve, use `(gate === "natal" && !shelf) || gate === "claim" || gate === "library"`.

Busy effect:

```tsx
useEffect(() => {
  galaxyTravel.busy = Boolean(claiming || entered);
}, [claiming, entered]);
```

Remove obsolete locals (`sessionOrigin`-based gate, unused `chat` if fully replaced by `claiming`).

- [ ] **Step 2: G2 grep — single Escape / `?desk=` owner**

Run:

```bash
rg -n 'addEventListener\("keydown"|get\("desk"\)' src/components/overlay/
```

Expected: keydown + `?desk=` only in `VaultApp.tsx` (not in shell files).

- [ ] **Step 3: Typecheck + unit tests**

Run:

```bash
npm run typecheck
npx tsx --test src/components/overlay/resolveGate.test.ts src/lib/chart/session/*.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/VaultApp.tsx
git commit -m "refactor: exclusive gate shell switch in VaultApp"
```

---

### Task 6: Acceptance (G3)

**Files:**
- None expected (checklist in PR). Fix only if smoke finds regressions.

- [ ] **Step 1: Confirm file layout**

```bash
ls src/components/overlay/{Galaxy,Claim,Library,Natal}Shell.tsx src/components/overlay/resolveGate.ts
rg -n "function (GalaxyCopy|Intro|SavedShelf|Chrome)\b" src/components/overlay/VaultApp.tsx || true
rg -n "VISITOR_ROOMS" src/components/overlay/
```

Expected: four shells + resolveGate exist; VaultApp has no local GalaxyCopy/Intro/SavedShelf/Chrome; no `VISITOR_ROOMS`.

- [ ] **Step 2: Build gates**

Run:

```bash
npm run typecheck
npm test
```

Expected: PASS

- [ ] **Step 3: Manual / browser smoke**

Against the live preview:

1. Galaxy fly → “This is my sign” → BirthChat mounts (ClaimShell); GalaxyShell unmounts.
2. Complete claim → open natal → NatalShell + Chrome dock; Escape returns toward galaxy/library per origin.
3. `?desk=library` → LibraryShell; research open → NatalShell.
4. Shelf chart open → NatalShell with sky/ask only (`roomsFor("shelf")`).
5. Confirm WebGL does not flash remount when entering claim / natal (no full canvas reload).

Optional React-tree check: on pure galaxy, BirthChat / Chrome absent from DOM.

- [ ] **Step 4: Final commit if fixes landed**

```bash
git status
# if fixes:
git add -A && git commit -m "fix: gate shell smoke parity"
```

---

## Self-review (plan vs spec)

| Spec item | Task |
| --- | --- |
| Four shell files under `overlay/` | 2–4 |
| Parent owns stage + switch + cross-gate effects | 5 |
| Exclusive unmount switch | 1 + 5 |
| StarBack parent predicate | 5 |
| `roomsFor` / no `VISITOR_ROOMS` | 4 (+ #2 prerequisite) |
| G0–G3 migration | 2–3 G0 extract → 5 G1/G2 → 6 G3 |
| No UX / no Stage remount | Global + Task 6 |
| StageLock | Left in `__root` (clarified vs loose “parent” wording in design) |
