# ChartSession Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ChartSession` the single source of “a natal is open,” with one-job modules under `src/lib/chart/session/` and hook-only UI reads, without changing F&F product behavior.

**Architecture:** Package-by-concern under `src/lib/chart/session/` (types, factories, actions, selectors, store, hooks, compat, index). Strangler: pure domain first → Zustand wired to `session`/`claim`/`surface` with compat aliases → migrate callers file-by-file to hooks → delete compat. Galaxy travel stays outside session; BirthChat is `claim`, not a session.

**Tech Stack:** TypeScript, Zustand, React 19, Node test runner (`node --experimental-strip-types --test` / `npx tsx --test`), existing TanStack Start app.

## Global Constraints

- No intentional UX change: fly → BirthChat → Open natal → Sky land must behave as today.
- Do not reorder `CONSTELLATIONS` / change travel or ephemeris math.
- Do not implement architecture #2–#5 (room matrix, shell split, DB unify, multiplayer).
- Tropical zodiac order remains Aries-first; session `signId` is astrological, never a calendar slot.
- React reads natal identity only via `session/hooks` after a file migrates; `compat.ts` is temporary.
- Commit after each task. Keep `npm test` and `npm run typecheck` green at task boundaries that touch runtime code.

## File map

| File | Responsibility |
| --- | --- |
| Create `src/lib/chart/session/types.ts` | `BirthFacts`, `ClaimDraft`, `Surface`, `SessionKind`, `ChartSession` |
| Create `src/lib/chart/session/selectors.ts` | Pure reads (`isEntered`, `nativityOf`, kind checks, `closeTarget`) |
| Create `src/lib/chart/session/factories.ts` | `fromVisitor`, `fromResearch`, `fromShelf` |
| Create `src/lib/chart/session/actions.ts` | Pure `openSession`, `patchSession`, `applyClose`, mode/select/tour reducers |
| Create `src/lib/chart/session/selectors.test.ts` | Selector + closeTarget tests |
| Create `src/lib/chart/session/factories.test.ts` | Factory tests |
| Create `src/lib/chart/session/actions.test.ts` | Action/transition tests |
| Create `src/lib/chart/session/store.ts` | Zustand: `session`, `claim`, `surface` + side-effect helpers |
| Create `src/lib/chart/session/compat.ts` | Old-name derived API for unmigrated callers |
| Create `src/lib/chart/session/hooks.ts` | `useSession`, `useNativity`, `useClaim`, … |
| Create `src/lib/chart/session/index.ts` | Public barrel |
| Modify `src/lib/store.ts` | Thin façade re-exporting session store + compat during S1–S2 |
| Modify `src/lib/chart/nativity.ts` | Re-export `useNativity` from session hooks |
| Modify callers listed in Tasks 7–10 | Hook-only reads |
| Modify `package.json` `test` script | Include new `session/*.test.ts` files |
| Delete `src/lib/chart/session/compat.ts` | At S3 when grep is clean |

---

### Task 1: Session types + selectors (S0)

**Files:**
- Create: `src/lib/chart/session/types.ts`
- Create: `src/lib/chart/session/selectors.ts`
- Create: `src/lib/chart/session/selectors.test.ts`
- Modify: `package.json` (test script — add selectors test path)

**Interfaces:**
- Produces: `BirthFacts`, `ClaimDraft`, `Surface`, `SessionKind`, `ChartSession`, `isEntered`, `nativityOf`, `skyNatalOf`, `originOf`, `isResearch`, `isVisitor`, `isShelf`, `closeTarget`

- [ ] **Step 1: Write the failing test**

Create `src/lib/chart/session/selectors.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChartSession, ClaimDraft, Surface } from "./types.ts";
import {
  closeTarget,
  isEntered,
  isResearch,
  isShelf,
  isVisitor,
  nativityOf,
  originOf,
  skyNatalOf,
} from "./selectors.ts";

function baseSession(over: Partial<ChartSession> = {}): ChartSession {
  return {
    id: "s1",
    kind: "visitor",
    chartKey: "visitor",
    label: "Test",
    relation: "self",
    personName: null,
    signId: "leo",
    tone: "vault",
    birth: {
      year: 2004,
      month: 7,
      day: 26,
      hour: 18,
      minute: 21,
      place: "Port Huron",
    },
    nativity: null,
    skyNatal: null,
    origin: "galaxy",
    mode: "sky",
    selection: null,
    hovered: null,
    tourBeat: null,
    sheetFolded: false,
    savedId: undefined,
    ...over,
  };
}

describe("session selectors", () => {
  it("isEntered follows session nullity", () => {
    assert.equal(isEntered(null), false);
    assert.equal(isEntered(baseSession()), true);
  });

  it("reads nativity, skyNatal, origin", () => {
    const s = baseSession({
      nativity: { id: "visitor" } as ChartSession["nativity"],
      skyNatal: { depth: "three" } as ChartSession["skyNatal"],
      origin: "library",
    });
    assert.equal(nativityOf(s)?.id, "visitor");
    assert.equal(skyNatalOf(s)?.depth, "three");
    assert.equal(originOf(s), "library");
    assert.equal(nativityOf(null), null);
  });

  it("kind guards", () => {
    assert.equal(isVisitor(baseSession({ kind: "visitor" })), true);
    assert.equal(isResearch(baseSession({ kind: "research", chartKey: "joey" })), true);
    assert.equal(isShelf(baseSession({ kind: "shelf" })), true);
    assert.equal(isResearch(baseSession({ kind: "visitor" })), false);
  });

  it("closeTarget prefers session.origin, then claim clear, then surface", () => {
    const claim: ClaimDraft = { signId: "leo", birth: null };
    assert.deepEqual(
      closeTarget({ session: baseSession({ origin: "library" }), claim: null, surface: "galaxy" }),
      { surface: "library" as Surface, clearClaim: true },
    );
    assert.deepEqual(
      closeTarget({ session: null, claim, surface: "galaxy" }),
      { surface: "galaxy", clearClaim: true },
    );
    assert.deepEqual(
      closeTarget({ session: null, claim: null, surface: "library" }),
      { surface: "galaxy", clearClaim: false },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/chart/session/selectors.test.ts`  
Expected: FAIL (cannot find module `./types.ts` / `./selectors.ts`)

- [ ] **Step 3: Write types**

Create `src/lib/chart/session/types.ts`:

```ts
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, ChartId, Selection, SignId } from "@/lib/chart/types";

export type BirthFacts = {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  place: string | null;
};

export type Surface = "galaxy" | "library";

export type SessionKind = "visitor" | "research" | "shelf";

export type ClaimDraft = {
  signId: SignId;
  birth: BirthFacts | null;
};

export type ChartSession = {
  id: string;
  kind: SessionKind;
  /** Research: joey|saige. Visitor: always "visitor". Shelf: saved id or ephemeral id. */
  chartKey: ChartId | string;
  /** Set when a visitor/shelf session is tied to a persisted charts row. */
  savedId?: string;
  label: string;
  relation: "self" | "other";
  personName: string | null;
  signId: SignId;
  tone: "vault" | "warm";
  birth: BirthFacts;
  nativity: Nativity | null;
  skyNatal: SkyNatal | null;
  origin: Surface;
  mode: AppMode;
  selection: Selection;
  hovered: Selection;
  tourBeat: string | null;
  sheetFolded: boolean;
};
```

- [ ] **Step 4: Write selectors**

Create `src/lib/chart/session/selectors.ts`:

```ts
import type { ChartSession, ClaimDraft, Surface } from "./types";

export function isEntered(session: ChartSession | null): boolean {
  return session !== null;
}

export function nativityOf(session: ChartSession | null) {
  return session?.nativity ?? null;
}

export function skyNatalOf(session: ChartSession | null) {
  return session?.skyNatal ?? null;
}

export function originOf(session: ChartSession | null): Surface | null {
  return session?.origin ?? null;
}

export function isVisitor(session: ChartSession | null): boolean {
  return session?.kind === "visitor";
}

export function isResearch(session: ChartSession | null): boolean {
  return session?.kind === "research";
}

export function isShelf(session: ChartSession | null): boolean {
  return session?.kind === "shelf";
}

export type CloseTarget = {
  surface: Surface;
  clearClaim: boolean;
};

/** Mirrors today’s goBack priority without UI: session → claim → library-to-galaxy. */
export function closeTarget(state: {
  session: ChartSession | null;
  claim: ClaimDraft | null;
  surface: Surface;
}): CloseTarget {
  if (state.session) {
    return { surface: state.session.origin, clearClaim: true };
  }
  if (state.claim) {
    return { surface: state.surface, clearClaim: true };
  }
  if (state.surface === "library") {
    return { surface: "galaxy", clearClaim: false };
  }
  return { surface: "galaxy", clearClaim: false };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test src/lib/chart/session/selectors.test.ts`  
Expected: PASS (4 tests)

- [ ] **Step 6: Wire package.json test script**

In `package.json`, extend the `test` script’s `npx tsx --test` list to also include:

`src/lib/chart/session/selectors.test.ts`

(Keep existing paths; append the new file.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/chart/session/types.ts src/lib/chart/session/selectors.ts src/lib/chart/session/selectors.test.ts package.json
git commit -m "feat(session): add ChartSession types and selectors"
```

---

### Task 2: Factories (S0)

**Files:**
- Create: `src/lib/chart/session/factories.ts`
- Create: `src/lib/chart/session/factories.test.ts`
- Modify: `package.json` (append factories test)

**Interfaces:**
- Consumes: `ChartSession`, `BirthFacts` from `types.ts`
- Produces: `fromVisitor`, `fromResearch`, `fromShelf`, `newSessionId`

- [ ] **Step 1: Write the failing test**

Create `src/lib/chart/session/factories.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import { fromResearch, fromShelf, fromVisitor, newSessionId } from "./factories.ts";

const birth = {
  year: 2004,
  month: 7,
  day: 26,
  hour: 18,
  minute: 21,
  place: "Port Huron",
};

const sky = {
  depth: "vault",
  tone: "vault",
  when: "26 Jul 2004",
  place: "Port Huron",
  lat: 1,
  lon: 2,
  timeZone: "America/Detroit",
  bodies: [],
  writtenAt: null,
} as SkyNatal;

const nat = { id: "visitor", meta: { name: "Test" } } as Nativity;

describe("session factories", () => {
  it("fromVisitor builds kind visitor with required nativity", () => {
    const s = fromVisitor({
      nativity: nat,
      skyNatal: sky,
      birth,
      signId: "leo",
      origin: "galaxy",
      label: "My natal",
    });
    assert.equal(s.kind, "visitor");
    assert.equal(s.chartKey, "visitor");
    assert.equal(s.nativity?.id, "visitor");
    assert.equal(s.mode, "sky");
    assert.equal(s.origin, "galaxy");
    assert.equal(s.tourBeat, null);
    assert.ok(s.id.length > 0);
  });

  it("fromResearch starts Joey tour beat when provided", () => {
    const book = { id: "joey", meta: { name: "Joey" } } as Nativity;
    const s = fromResearch({
      chartKey: "joey",
      nativity: book,
      tourBeat: "body-wells",
      mode: "body",
      selection: { kind: "chakra", id: "heart" },
      origin: "library",
    });
    assert.equal(s.kind, "research");
    assert.equal(s.chartKey, "joey");
    assert.equal(s.skyNatal, null);
    assert.equal(s.tourBeat, "body-wells");
    assert.equal(s.mode, "body");
    assert.equal(s.signId, "aries");
  });

  it("fromShelf allows null nativity and defaults mode ask", () => {
    const s = fromShelf({
      id: "saved-1",
      signId: "virgo",
      birth: { ...birth, hour: null, minute: null, place: null },
      skyNatal: sky,
      nativity: null,
      tone: "warm",
      relation: "other",
      personName: "Sam",
      label: "Sam",
      origin: "library",
      fromSavedId: "saved-1",
    });
    assert.equal(s.kind, "shelf");
    assert.equal(s.nativity, null);
    assert.equal(s.mode, "ask");
    assert.equal(s.savedId, "saved-1");
    assert.equal(s.chartKey, "saved-1");
  });

  it("newSessionId returns a string", () => {
    assert.equal(typeof newSessionId(), "string");
    assert.ok(newSessionId().length > 4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/chart/session/factories.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write factories**

Create `src/lib/chart/session/factories.ts`:

```ts
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, ResearchChartId, Selection, SignId } from "@/lib/chart/types";
import type { BirthFacts, ChartSession, Surface } from "./types";

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function fromVisitor(input: {
  nativity: Nativity;
  skyNatal: SkyNatal | null;
  birth: BirthFacts;
  signId: SignId;
  origin: Surface;
  label?: string;
  relation?: "self" | "other";
  personName?: string | null;
  tone?: "vault" | "warm";
  savedId?: string;
  id?: string;
}): ChartSession {
  return {
    id: input.id ?? newSessionId(),
    kind: "visitor",
    chartKey: "visitor",
    savedId: input.savedId,
    label: input.label ?? input.nativity.meta.name ?? "Your natal",
    relation: input.relation ?? "self",
    personName: input.personName ?? null,
    signId: input.signId,
    tone: input.tone ?? input.skyNatal?.tone ?? "vault",
    birth: input.birth,
    nativity: input.nativity,
    skyNatal: input.skyNatal,
    origin: input.origin,
    mode: "sky",
    selection: null,
    hovered: null,
    tourBeat: null,
    sheetFolded: false,
  };
}

export function fromResearch(input: {
  chartKey: ResearchChartId;
  nativity: Nativity;
  origin?: Surface;
  tourBeat?: string | null;
  mode?: AppMode;
  selection?: Selection;
  id?: string;
}): ChartSession {
  const sun = input.nativity.planets.find((p) => p.id === "sun");
  const signId: SignId = sun
    ? (["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"] as const)[
        Math.min(11, Math.floor((((sun.lon % 360) + 360) % 360) / 30))
      ]!
    : "aries";
  return {
    id: input.id ?? `research-${input.chartKey}`,
    kind: "research",
    chartKey: input.chartKey,
    label: input.nativity.meta.name,
    relation: "self",
    personName: input.nativity.meta.name,
    signId,
    tone: "vault",
    birth: {
      year: 0,
      month: 1,
      day: 1,
      hour: null,
      minute: null,
      place: input.nativity.meta.place || null,
    },
    nativity: input.nativity,
    skyNatal: null,
    origin: input.origin ?? "library",
    mode: input.mode ?? "sky",
    selection: input.selection ?? null,
    hovered: null,
    tourBeat: input.tourBeat ?? null,
    sheetFolded: false,
  };
}

export function fromShelf(input: {
  id?: string;
  signId: SignId;
  birth: BirthFacts;
  skyNatal: SkyNatal | null;
  nativity?: Nativity | null;
  tone?: "vault" | "warm";
  relation?: "self" | "other";
  personName?: string | null;
  label: string;
  origin: Surface;
  fromSavedId?: string;
  mode?: AppMode;
}): ChartSession {
  const id = input.id ?? input.fromSavedId ?? newSessionId();
  return {
    id,
    kind: "shelf",
    chartKey: input.fromSavedId ?? id,
    savedId: input.fromSavedId,
    label: input.label,
    relation: input.relation ?? "self",
    personName: input.personName ?? null,
    signId: input.signId,
    tone: input.tone ?? input.skyNatal?.tone ?? "vault",
    birth: input.birth,
    nativity: input.nativity ?? null,
    skyNatal: input.skyNatal,
    origin: input.origin,
    mode: input.mode ?? "ask",
    selection: null,
    hovered: null,
    tourBeat: null,
    sheetFolded: false,
  };
}
```

Prefer importing `signFromLon` from `@/lib/chart/ephemeris` inside `fromResearch` instead of inlining the 12-sign table if the import stays lightweight; either is fine. `PlanetDef` has `lon` only (no `signId` field).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/chart/session/factories.test.ts`  
Expected: PASS

- [ ] **Step 5: Append test path in package.json**

Add `src/lib/chart/session/factories.test.ts` to the `npx tsx --test` list.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chart/session/factories.ts src/lib/chart/session/factories.test.ts package.json
git commit -m "feat(session): add ChartSession factories"
```

---

### Task 3: Pure actions (S0)

**Files:**
- Create: `src/lib/chart/session/actions.ts`
- Create: `src/lib/chart/session/actions.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ChartSession`, `ClaimDraft`, `Surface`, `closeTarget`
- Produces: `VaultDomainState`, `openSessionState`, `patchSessionState`, `applyCloseState`, `setModeState`, `setSelectionState`, `setHoverState`, `clearSelectionState`, `nextTourState`, `skipTourState`, `foldSheetState`, `openClaimState`, `setClaimBirthState`, `setSurfaceState`

- [ ] **Step 1: Write the failing test**

Create `src/lib/chart/session/actions.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCloseState,
  openClaimState,
  openSessionState,
  patchSessionState,
  setModeState,
  setSurfaceState,
  type VaultDomainState,
} from "./actions.ts";
import { fromVisitor } from "./factories.ts";
import type { Nativity } from "@/lib/chart/schema";

const empty: VaultDomainState = { session: null, claim: null, surface: "galaxy" };

const session = fromVisitor({
  nativity: { id: "visitor", meta: { name: "X" } } as Nativity,
  skyNatal: null,
  birth: { year: 2004, month: 7, day: 26, hour: null, minute: null, place: null },
  signId: "leo",
  origin: "galaxy",
});

describe("session actions", () => {
  it("openSessionState replaces session and clears claim", () => {
    const next = openSessionState(
      { ...empty, claim: { signId: "leo", birth: null } },
      session,
    );
    assert.equal(next.session?.id, session.id);
    assert.equal(next.claim, null);
  });

  it("patchSessionState merges into current session only", () => {
    const opened = openSessionState(empty, session);
    const next = patchSessionState(opened, { tone: "warm", sheetFolded: true });
    assert.equal(next.session?.tone, "warm");
    assert.equal(next.session?.sheetFolded, true);
    assert.equal(patchSessionState(empty, { tone: "warm" }).session, null);
  });

  it("applyCloseState uses closeTarget", () => {
    const opened = openSessionState(empty, { ...session, origin: "library" });
    const closed = applyCloseState(opened);
    assert.equal(closed.session, null);
    assert.equal(closed.surface, "library");
    assert.equal(closed.claim, null);
  });

  it("openClaimState and setSurfaceState", () => {
    const claimed = openClaimState(empty, "leo");
    assert.equal(claimed.claim?.signId, "leo");
    assert.equal(claimed.session, null);
    assert.equal(setSurfaceState(empty, "library").surface, "library");
  });

  it("setModeState clears selection except ask", () => {
    const withSel = {
      ...empty,
      session: { ...session, selection: { kind: "planet" as const, id: "sun" } },
    };
    const sky = setModeState(withSel, "sky");
    assert.equal(sky.session?.selection, null);
    const ask = setModeState(withSel, "ask");
    assert.equal(ask.session?.selection?.id, "sun");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/chart/session/actions.test.ts`  
Expected: FAIL

- [ ] **Step 3: Write actions**

Create `src/lib/chart/session/actions.ts`:

```ts
import type { AppMode, Selection, SignId } from "@/lib/chart/types";
import { closeTarget } from "./selectors";
import type { BirthFacts, ChartSession, ClaimDraft, Surface } from "./types";

export type VaultDomainState = {
  session: ChartSession | null;
  claim: ClaimDraft | null;
  surface: Surface;
};

export function openSessionState(
  state: VaultDomainState,
  session: ChartSession,
): VaultDomainState {
  return { session, claim: null, surface: session.origin };
}

export function patchSessionState(
  state: VaultDomainState,
  patch: Partial<ChartSession>,
): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, ...patch } };
}

export function applyCloseState(state: VaultDomainState): VaultDomainState {
  const target = closeTarget(state);
  return {
    session: null,
    claim: target.clearClaim ? null : state.claim,
    surface: target.surface,
  };
}

export function openClaimState(state: VaultDomainState, signId: SignId): VaultDomainState {
  return {
    session: null,
    claim: { signId, birth: null },
    surface: "galaxy",
  };
}

export function clearClaimState(state: VaultDomainState): VaultDomainState {
  return { ...state, claim: null };
}

export function setClaimBirthState(
  state: VaultDomainState,
  birth: BirthFacts,
): VaultDomainState {
  if (!state.claim) return state;
  return { ...state, claim: { ...state.claim, birth } };
}

export function setSurfaceState(state: VaultDomainState, surface: Surface): VaultDomainState {
  return {
    session: null,
    claim: null,
    surface,
  };
}

export function setModeState(state: VaultDomainState, mode: AppMode): VaultDomainState {
  if (!state.session) return state;
  if (mode === "ask") {
    return { ...state, session: { ...state.session, mode, hovered: null } };
  }
  return {
    ...state,
    session: { ...state.session, mode, selection: null, hovered: null },
  };
}

export function setSelectionState(
  state: VaultDomainState,
  selection: Selection,
): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, selection } };
}

export function setHoverState(state: VaultDomainState, hovered: Selection): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, hovered } };
}

export function clearSelectionState(state: VaultDomainState): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, selection: null } };
}

export function foldSheetState(state: VaultDomainState, folded: boolean): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, sheetFolded: folded } };
}

export function nextTourState(
  state: VaultDomainState,
  next: { id: string; mode: AppMode; selection: Selection } | null,
): VaultDomainState {
  if (!state.session) return state;
  if (!next) {
    return { ...state, session: { ...state.session, tourBeat: null } };
  }
  return {
    ...state,
    session: {
      ...state.session,
      tourBeat: next.id,
      mode: next.mode,
      selection: next.selection,
      hovered: null,
    },
  };
}

export function skipTourState(state: VaultDomainState): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, tourBeat: null } };
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/lib/chart/session/actions.test.ts`  
Expected: PASS

- [ ] **Step 5: Append path in package.json and commit**

```bash
git add src/lib/chart/session/actions.ts src/lib/chart/session/actions.test.ts package.json
git commit -m "feat(session): add pure ChartSession actions"
```

---

### Task 4: Barrel index (S0)

**Files:**
- Create: `src/lib/chart/session/index.ts`

**Interfaces:**
- Produces: public re-exports of types, factories, actions, selectors (no store/hooks/compat yet)

- [ ] **Step 1: Write index.ts**

```ts
export type {
  BirthFacts,
  ClaimDraft,
  ChartSession,
  SessionKind,
  Surface,
} from "./types";
export {
  isEntered,
  nativityOf,
  skyNatalOf,
  originOf,
  isVisitor,
  isResearch,
  isShelf,
  closeTarget,
} from "./selectors";
export type { CloseTarget } from "./selectors";
export { fromVisitor, fromResearch, fromShelf, newSessionId } from "./factories";
export {
  openSessionState,
  patchSessionState,
  applyCloseState,
  openClaimState,
  clearClaimState,
  setClaimBirthState,
  setSurfaceState,
  setModeState,
  setSelectionState,
  setHoverState,
  clearSelectionState,
  foldSheetState,
  nextTourState,
  skipTourState,
} from "./actions";
export type { VaultDomainState } from "./actions";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/chart/session/index.ts
git commit -m "feat(session): export ChartSession domain barrel"
```

---

### Task 5: Zustand store + compat façade (S1)

**Files:**
- Create: `src/lib/chart/session/store.ts`
- Create: `src/lib/chart/session/compat.ts`
- Modify: `src/lib/store.ts` (replace implementation with session-backed compat API matching today’s exports)
- Modify: `src/lib/chart/session/index.ts` (export store)

**Interfaces:**
- Consumes: all actions/factories/selectors; `seekSign` / `resetTravel` / `OPEN_T` from galaxy travel; `isDateInSign`; Joey tour helpers
- Produces: `useVaultSession` (or `useSessionStore`) with domain state; `useVault` compat object with same method names as today’s `src/lib/store.ts`

- [ ] **Step 1: Read current `src/lib/store.ts` end-to-end** and keep a checklist of every exported type and action name (`BirthDate`, `ShelfSketch`, `openVisitor`, `openChart`, `openShelf`, `goBack`, …). Compat must preserve those names.

- [ ] **Step 2: Implement `store.ts`**

Hold:

```ts
session: ChartSession | null
claim: ClaimDraft | null
surface: Surface
```

Expose methods that:
1. Build sessions via factories
2. Apply pure actions
3. Call galaxy side effects only in dedicated helpers:
   - `seekSignFor(signId)` on claim/shelf open
   - `resetTravel` + galaxy `born` reset when returning to galaxy (mirror `openGalaxy` today)

Tour: `openResearch` / Joey path should call `nextJoeyBeat()` then `fromResearch({ tourBeat, mode, selection })` exactly as `openChart` does today.

Birth validation: `setClaimBirth` must keep `isDateInSign(claim.signId, …)` guard from today’s `setBirth`.

- [ ] **Step 3: Implement `compat.ts`**

Map:

| Old | New |
| --- | --- |
| `entered` | `session !== null` |
| `gate` | `session?.origin ?? surface` (when entered, prefer origin; when not, surface) — match current `gate` semantics used by VaultApp (`galaxy`/`library`) |
| `chartId` | research → `chartKey`; visitor → `"visitor"`; shelf → `null` (today shelf clears chartId) |
| `research` | `session?.nativity ?? null` |
| `shelf` | if `kind==="shelf"`, project ShelfSketch shape; else null |
| `skyNatal` | `session?.skyNatal ?? null` |
| `chat` | `claim !== null && session === null` |
| `pickedSign` | `claim?.signId ?? session?.signId ?? null` |
| `birth` | `claim?.birth ?? session?.birth ?? null` |
| `mode` / selection / hovered / tourBeat / sheetFolded | from session or defaults (`mode:"sky"`, nulls, false) |

Old actions become wrappers calling store methods (`openVisitor` → `fromVisitor` + `openSessionState`, etc.).

- [ ] **Step 4: Replace `src/lib/store.ts`**

Keep exporting `useVault`, `BirthDate` (type alias to `BirthFacts`), `ShelfSketch` so existing imports compile. Implementation should import session store + compat projectors — no duplicated transition logic outside actions/factories.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 6: Unit tests still pass**

Run: `npm test`  
Expected: PASS (including session tests)

- [ ] **Step 7: Commit**

```bash
git add src/lib/chart/session/store.ts src/lib/chart/session/compat.ts src/lib/chart/session/index.ts src/lib/store.ts
git commit -m "feat(session): wire Zustand session store with compat façade"
```

---

### Task 6: Hooks (S1/S2 bridge)

**Files:**
- Create: `src/lib/chart/session/hooks.ts`
- Modify: `src/lib/chart/session/index.ts`
- Modify: `src/lib/chart/nativity.ts` (re-export `useNativity` from hooks; implement as `session?.nativity ?? null`)

**Interfaces:**
- Produces: `useSession`, `useNativity`, `useClaim`, `useSurface`, `useSessionMode`, `useSessionSelection`, `useSessionHovered`, `useIsEntered`, `useSessionKind`, `useSkyNatal`, `useTourBeat`, `useSheetFolded`, and action hooks or `useSessionActions()` returning `{ openVisitor, openResearch, openShelf, close, … }`

- [ ] **Step 1: Implement hooks.ts** using the session Zustand store selectors (narrow subscriptions — one field per hook where practical).

Example:

```ts
export function useSession() {
  return useSessionStore((s) => s.session);
}
export function useNativity() {
  return useSessionStore((s) => s.session?.nativity ?? null);
}
export function useClaim() {
  return useSessionStore((s) => s.claim);
}
export function useSurface() {
  return useSessionStore((s) => s.surface);
}
export function useIsEntered() {
  return useSessionStore((s) => s.session !== null);
}
```

- [ ] **Step 2: Point `src/lib/chart/nativity.ts` `useNativity` at the session hook** (re-export). Keep type re-exports.

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/chart/session/hooks.ts src/lib/chart/session/index.ts src/lib/chart/nativity.ts
git commit -m "feat(session): add selector hooks and re-export useNativity"
```

---

### Task 7: Migrate BirthChat (S2)

**Files:**
- Modify: `src/components/overlay/BirthChat.tsx`

**Interfaces:**
- Consumes: `useClaim`, claim/session actions (`setBirth`, `openVisitor`/`openSession` visitor, `openShelf`, `closeBirthChat`, `openLibrary`)

- [ ] **Step 1: Replace**

```ts
const picked = useVault((s) => s.pickedSign);
const birth = useVault((s) => s.birth);
```

with claim hooks (`useClaim()` → `signId` / `birth`). Keep button handlers calling store actions (prefer session action names if exported; compat names OK until Task 11).

- [ ] **Step 2: Ensure** `openVisitor(visitorBook, natal)` still works (compat or new API).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/BirthChat.tsx
git commit -m "refactor(session): migrate BirthChat to claim/session hooks"
```

---

### Task 8: Migrate VaultApp shell + chrome helpers (S2)

**Files:**
- Modify: `src/components/overlay/VaultApp.tsx`
- Modify: `src/components/overlay/StarBack.tsx`
- Modify: `src/components/overlay/TourGuide.tsx`
- Modify: `src/components/overlay/ChartSheet.tsx`

- [ ] **Step 1: VaultApp** — replace `entered` / `gate` / `chat` / `shelf` reads:

```ts
const session = useSession();
const claim = useClaim();
const surface = useSurface();
const entered = session !== null;
const chat = claim !== null && session === null;
const gate = session?.origin ?? surface;
const shelf = session?.kind === "shelf" ? session : null; // or useShelfSketch() helper from hooks/compat
```

Update mode dock to read `useSessionMode`, `chartKey` from session. Keep behavior identical (visitor rooms set, research modes, etc.).

- [ ] **Step 2: StarBack** — `goBack` / `closeSession` via actions hook.

- [ ] **Step 3: TourGuide** — `useTourBeat`, `chartKey`, `nextTour`, `skipTour`.

- [ ] **Step 4: ChartSheet** — `useSheetFolded` + `foldSheet`.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/components/overlay/VaultApp.tsx src/components/overlay/StarBack.tsx src/components/overlay/TourGuide.tsx src/components/overlay/ChartSheet.tsx
git commit -m "refactor(session): migrate VaultApp chrome to session hooks"
```

---

### Task 9: Migrate scene graph (S2)

**Files:**
- Modify: `src/components/scene/ChartCanvas.tsx`
- Modify: `src/components/scene/pick.ts`
- Modify: `src/components/scene/SkyWheel.tsx`
- Modify: `src/components/scene/Figures.tsx`
- Modify: `src/components/scene/GalaxyIntro.tsx`

- [ ] **Step 1: ChartCanvas** — `useIsEntered`, `useSessionMode`, `useSessionSelection`, `useNativity`; shelf gating via `useSession()` kind.

- [ ] **Step 2: pick.ts** — use session store `getState()`:

```ts
if (!useSessionStore.getState().session) return;
useSessionStore.getState().select(...)
```

(or keep `useVault.getState()` until Task 11 if compat still forwards `select`/`entered`).

- [ ] **Step 3: SkyWheel / Figures** — selection/hover hooks only.

- [ ] **Step 4: GalaxyIntro** — replace `s.shelf?.natal` / `s.entered` with session kind shelf fields / `useIsEntered`.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/components/scene/ChartCanvas.tsx src/components/scene/pick.ts src/components/scene/SkyWheel.tsx src/components/scene/Figures.tsx src/components/scene/GalaxyIntro.tsx
git commit -m "refactor(session): migrate scene components to session hooks"
```

---

### Task 10: Migrate panels (S2)

**Files:**
- Modify: `src/components/overlay/DetailPanel.tsx`
- Modify: `src/components/overlay/AskPanel.tsx`
- Modify: `src/components/overlay/FallbackSky.tsx`

- [ ] **Step 1: DetailPanel** — mode/selection/shelf/tone/natal via hooks; `setShelfTone`/`setShelfNatal` → `patchSession`.

- [ ] **Step 2: AskPanel** — `chartKey`, shelf vs visitor vs research from `useSession()`; `skyNatal` from `useSkyNatal()`.

- [ ] **Step 3: FallbackSky** — same hook migration for any vault identity reads.

- [ ] **Step 4: Grep gate**

Run:

```bash
rg "useVault\\(\\(s\\) => s\\.(research|shelf|entered|skyNatal|chartId|gate|chat)\\)" src/components src/lib/chart/nativity.ts || true
```

Expected: no matches in migrated UI (store/compat may still define those for internal use).

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/components/overlay/DetailPanel.tsx src/components/overlay/AskPanel.tsx src/components/overlay/FallbackSky.tsx
git commit -m "refactor(session): migrate panels to session hooks"
```

---

### Task 11: Remove compat (S3)

**Files:**
- Delete: `src/lib/chart/session/compat.ts`
- Modify: `src/lib/store.ts` — either delete and fix imports to `@/lib/chart/session`, or keep as thin re-export of hooks/actions only (no old field names)
- Modify: any remaining `useVault` imports to session hooks/store
- Modify: `src/lib/chart/session/index.ts` — stop exporting compat

- [ ] **Step 1: Grep for legacy names**

```bash
rg "\\b(openVisitor|openShelf|openChart|ShelfSketch|setShelfNatal|setShelfTone)\\b" src
rg "useVault" src
```

Migrate every hit to session API (`openSession` wrappers with clear names: `openVisitorSession`, `openResearchSession`, `openShelfSession` are fine permanent names if you prefer keeping verb clarity).

- [ ] **Step 2: Delete compat.ts** and remove old derived fields from the public store type.

- [ ] **Step 3: Run full verification**

```bash
npm test
npm run typecheck
```

Expected: PASS

- [ ] **Step 4: Optional smoke** (if dev server available): claim sign → cast → Open this natal → Sky visible; Escape returns to galaxy.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib/store.ts src/lib/chart/session src/components
git commit -m "refactor(session): remove compat façade; session is source of truth"
```

---

### Task 12: Acceptance checklist (S4)

**Files:**
- Modify: none required unless checklist gaps appear
- Verify: spec acceptance list in `docs/superpowers/specs/2026-09-04-chart-session-boundaries-design.md`

- [ ] **Step 1: Confirm files exist**

```bash
ls src/lib/chart/session/types.ts src/lib/chart/session/factories.ts src/lib/chart/session/actions.ts src/lib/chart/session/selectors.ts src/lib/chart/session/store.ts src/lib/chart/session/hooks.ts src/lib/chart/session/index.ts
test ! -f src/lib/chart/session/compat.ts && echo COMPAT_GONE
```

- [ ] **Step 2: Grep source-of-truth cleanliness**

```bash
rg "s\\.research|s\\.shelf|s\\.entered" src/components || true
```

Expected: empty (or only unrelated property names)

- [ ] **Step 3: Final test + typecheck**

```bash
npm test && npm run typecheck
```

- [ ] **Step 4: Commit any leftover script/doc fixes** (or note “no changes” in the PR)

```bash
git status
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
| --- | --- |
| Module map under `session/` | Tasks 1–6 |
| `session` / `claim` / `surface` | Task 5 |
| Factories visitor/research/shelf | Task 2 |
| Pure actions + closeTarget | Tasks 1, 3 |
| Hooks-only UI reads | Tasks 6–10 |
| Strangler compat then delete | Tasks 5, 11 |
| `useNativity` re-export | Task 6 |
| F&F behavior frozen | Global constraints + Task 12 |
| No #2–#5 scope creep | Global constraints |
| Tests for factories/actions/selectors | Tasks 1–3 |
| Acceptance checklist | Task 12 |

**`fromResearch` sun sign:** derived from sun planet `lon` via tropical 30° bins or `signFromLon` (PlanetDef has no `signId`).
