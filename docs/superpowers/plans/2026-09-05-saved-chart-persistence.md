# Saved-Chart Persistence Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `charts` rows the single hub for user visitor/shelf persistence: one `upsertChart` write path, one `fromSavedChart` reopen path, Keep attaches `savedId`, signed-in Ask keys by `charts.id` (migrate local on sign-in). Research stays code-loaded.

**Architecture:** Strangler in `src/lib/charts.ts` + session factories/store. Add hub APIs beside today’s `saveChart` / patch helpers; migrate BirthChat, LibraryShell, account, AskPanel; then delete dead insert-only / `"visitor"` Ask paths.

**Tech Stack:** TypeScript, TanStack Start `createServerFn`, Zustand session store, Node test runner (`npx tsx --test`), existing Postgres `charts` / `chart_ask` tables.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-05-saved-chart-persistence-design.md`
- Research (Joey/Saige) never becomes a `charts` row; keep `fromResearch`
- No intentional UX redesign — only correct save / reopen / Ask identity
- Do not implement architecture #5 (shared reading)
- Do not change rooms matrix or gate-shell mount policy except call-site wiring
- Auth-scope every chart write; never trust client `user_id`
- Commit after each task; keep `npm run typecheck` and session/charts unit tests green

## File map

| File | Responsibility |
| --- | --- |
| Modify `src/lib/charts.ts` | Add `upsertChart` (insert/update → full `SavedChart`); keep `saveChart` as thin insert wrapper temporarily |
| Create `src/lib/charts-saved.ts` | Pure helpers: `hasTimedNatal`, `askStorageKey` rules (testable without DB) |
| Create `src/lib/charts-saved.test.ts` | Pure helper tests |
| Modify `src/lib/chart/session/factories.ts` | Add `fromSavedChart` |
| Modify `src/lib/chart/session/factories.test.ts` | `fromSavedChart` visitor vs shelf cases |
| Modify `src/lib/chart/session/store.ts` | `attachSavedId`, `openSavedChart` (async helper used by UI) |
| Modify `src/lib/chart/session/index.ts` | Export new APIs |
| Create `src/lib/chart/session/open-saved.ts` | Client helper: compute natal if needed → open via `fromSavedChart` |
| Create `src/lib/chart/session/open-saved.test.ts` | Pure branch tests with mocked compute (or factory-only if compute stays in UI) |
| Modify `src/components/overlay/BirthChat.tsx` | Keep → `upsertChart` + `attachSavedId` when session open |
| Modify `src/components/overlay/LibraryShell.tsx` | Open rows via `openSavedChart` |
| Modify `src/routes/account.tsx` | Open button → `openSavedChart` + navigate home |
| Modify `src/components/overlay/AskPanel.tsx` | Signed-in key = `savedId`; migrate local `"visitor"` / legacy keys |
| Modify `src/lib/field-notes.ts` | `migrateLocalAsk(fromKey, toKey)` helper |
| Modify `src/lib/chart/sky.ts` | Optional: route `persistNatal` / `saveChartTone` through upsert fields (or leave until P4) |
| Modify `package.json` | Append new test paths |

**Naming fidelity (current repo):** `SavedChart` fields are `label`, `relation` (`"self" \| "other"`), `signId`, `birthMonth` / `birthDay` / `birthYear`, `birthHour` / `birthMinute` / `birthPlace`, `natal`, `tone`. Session field is `savedId`. Shelf factory input uses `fromSavedId`.

---

### Task 1: Pure saved-chart helpers (P0)

**Files:**
- Create: `src/lib/charts-saved.ts`
- Create: `src/lib/charts-saved.test.ts`
- Modify: `package.json` (append test path)

**Interfaces:**
- Consumes: `SavedChart` from `@/lib/charts`
- Produces: `hasTimedNatal(chart)`, `isUuidChartId(id)`, `GUEST_ASK_KEY`

- [ ] **Step 1: Write the failing test**

Create `src/lib/charts-saved.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SavedChart } from "./charts.ts";
import { GUEST_ASK_KEY, hasTimedNatal, isUuidChartId } from "./charts-saved.ts";

const base: SavedChart = {
  id: "11111111-1111-1111-1111-111111111111",
  label: "Mine",
  relation: "self",
  personName: null,
  signId: "leo",
  birthMonth: 8,
  birthDay: 1,
  birthYear: 1990,
  birthHour: null,
  birthMinute: null,
  birthPlace: null,
  natal: null,
  tone: "vault",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("charts-saved helpers", () => {
  it("hasTimedNatal requires natal + hour + minute + place", () => {
    assert.equal(hasTimedNatal(base), false);
    assert.equal(
      hasTimedNatal({
        ...base,
        birthHour: 12,
        birthMinute: 0,
        birthPlace: "Detroit",
        natal: { tone: "vault" } as SavedChart["natal"],
      }),
      true,
    );
  });

  it("isUuidChartId accepts chart uuids only", () => {
    assert.equal(isUuidChartId(base.id), true);
    assert.equal(isUuidChartId("visitor"), false);
    assert.equal(isUuidChartId("joey"), false);
  });

  it("GUEST_ASK_KEY is the legacy local visitor key", () => {
    assert.equal(GUEST_ASK_KEY, "visitor");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx tsx --test src/lib/charts-saved.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement helpers**

Create `src/lib/charts-saved.ts`:

```ts
import type { SavedChart } from "./charts";

/** LocalStorage / guest Ask key used before a charts row exists. */
export const GUEST_ASK_KEY = "visitor";

export function hasTimedNatal(chart: SavedChart): boolean {
  return Boolean(
    chart.natal &&
      chart.birthHour != null &&
      chart.birthMinute != null &&
      chart.birthPlace,
  );
}

export function isUuidChartId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}
```

If `SavedChart["natal"]` typing rejects the cast in the test, import `SkyNatal` and use a minimal stub object that satisfies the type.

- [ ] **Step 4: Run test — expect PASS**

Run: `npx tsx --test src/lib/charts-saved.test.ts`  
Expected: PASS

- [ ] **Step 5: Wire package.json + commit**

Append `src/lib/charts-saved.test.ts` to the `npx tsx --test …` list in `package.json` `test` script.

```bash
git add src/lib/charts-saved.ts src/lib/charts-saved.test.ts package.json
git commit -m "feat: add pure saved-chart identity helpers"
```

---

### Task 2: `fromSavedChart` factory (P0)

**Files:**
- Modify: `src/lib/chart/session/factories.ts`
- Modify: `src/lib/chart/session/factories.test.ts`
- Modify: `src/lib/chart/session/index.ts`

**Interfaces:**
- Consumes: `SavedChart`, `hasTimedNatal`, existing `fromVisitor` / `fromShelf`, `Nativity` / `SkyNatal` optional overrides
- Produces: `fromSavedChart(input) → ChartSession` with `savedId` set

- [ ] **Step 1: Write the failing test**

Add to `factories.test.ts`:

```ts
import { fromSavedChart } from "./factories.ts";
import type { SavedChart } from "@/lib/charts.ts";

const savedShelf: SavedChart = {
  id: "22222222-2222-2222-2222-222222222222",
  label: "Shelf",
  relation: "self",
  personName: null,
  signId: "aries",
  birthMonth: 4,
  birthDay: 10,
  birthYear: 2000,
  birthHour: null,
  birthMinute: null,
  birthPlace: null,
  natal: null,
  tone: "vault",
  createdAt: "2026-01-01T00:00:00.000Z",
};

it("fromSavedChart opens shelf when timed natal is missing", () => {
  const s = fromSavedChart({ chart: savedShelf, origin: "library" });
  assert.equal(s.kind, "shelf");
  assert.equal(s.savedId, savedShelf.id);
  assert.equal(s.origin, "library");
});

it("fromSavedChart opens visitor when nativity + sky provided", () => {
  const s = fromSavedChart({
    chart: {
      ...savedShelf,
      birthHour: 8,
      birthMinute: 15,
      birthPlace: "Paris",
      natal: { tone: "warm" } as SavedChart["natal"],
    },
    origin: "library",
    nativity: book, // existing test nativity fixture in this file
    skyNatal: sky,  // existing sky fixture if present; else null + still visitor if hasTimedNatal && nativity
  });
  assert.equal(s.kind, "visitor");
  assert.equal(s.savedId, savedShelf.id);
});
```

Adjust fixtures to match names already in `factories.test.ts` (`book` / nativity helpers). If no sky fixture exists, pass `skyNatal: null` and still assert `kind === "visitor"` when `nativity` is provided and timed fields exist.

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx tsx --test src/lib/chart/session/factories.test.ts`  
Expected: FAIL (`fromSavedChart` not exported)

- [ ] **Step 3: Implement `fromSavedChart`**

In `factories.ts`:

```ts
import type { SavedChart } from "@/lib/charts";
import { hasTimedNatal } from "@/lib/charts-saved";

export function fromSavedChart(input: {
  chart: SavedChart;
  origin: Surface;
  nativity?: Nativity | null;
  skyNatal?: SkyNatal | null;
  mode?: AppMode;
}): ChartSession {
  const chart = input.chart;
  const birth = {
    year: chart.birthYear,
    month: chart.birthMonth,
    day: chart.birthDay,
    hour: chart.birthHour,
    minute: chart.birthMinute,
    place: chart.birthPlace,
  };
  const relation = chart.relation === "other" ? "other" : "self";
  const personName = chart.personName;

  if (hasTimedNatal(chart) && input.nativity) {
    return fromVisitor({
      nativity: input.nativity,
      skyNatal: input.skyNatal ?? (chart.natal as SkyNatal | null),
      birth,
      signId: chart.signId,
      origin: input.origin,
      label: chart.label,
      relation,
      personName,
      tone: chart.tone,
      savedId: chart.id,
      mode: input.mode,
    });
  }

  return fromShelf({
    signId: chart.signId,
    birth,
    skyNatal: (chart.natal as SkyNatal | null) ?? null,
    nativity: input.nativity ?? null,
    tone: chart.tone,
    relation,
    personName,
    label: chart.label,
    origin: input.origin,
    fromSavedId: chart.id,
    mode: input.mode,
  });
}
```

Export from `index.ts`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx tsx --test src/lib/chart/session/factories.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/chart/session/factories.ts src/lib/chart/session/factories.test.ts src/lib/chart/session/index.ts
git commit -m "feat: add fromSavedChart session factory"
```

---

### Task 3: `upsertChart` server hub (P0)

**Files:**
- Modify: `src/lib/charts.ts`
- Modify: `package.json` if any new test file is added (optional pure validator extract)

**Interfaces:**
- Consumes: existing `SavedChart`, `mapRow`, auth middleware
- Produces: `upsertChart` → `SavedChart`; `saveChart` becomes insert-only wrapper calling upsert without id (strangler)

- [ ] **Step 1: Add `upsertChart` beside `saveChart`**

In `src/lib/charts.ts`, add a POST server fn that accepts the same fields as today’s `saveChart` validator **plus optional `id?: string`**, and:

1. Validate like `saveChart` (reuse shared `normalizeChartWrite(input)` extracted from the current validator body).
2. If `id` present: `update charts set … where id = $id and user_id = $user` for provided fields; if zero rows, throw `"Chart not found"`.
3. If no `id`: insert as today (new uuid).
4. `select` the row and `return mapRow(row)` (full `SavedChart`, not `{ id }` only).

Sketch:

```ts
export const upsertChart = createServerFn({ method: "POST" })
  .validator((input: {
    id?: string;
    label: string;
    relation: "self" | "other";
    personName?: string;
    signId: SignId;
    birthMonth: number;
    birthDay: number;
    birthYear: number;
    consent: boolean;
    otherPermission?: boolean;
    birthHour?: number | null;
    birthMinute?: number | null;
    birthPlace?: string | null;
    natal?: SkyNatal | null;
    tone?: "vault" | "warm";
  }) => {
    const id = input.id?.trim() || undefined;
    if (id && !/^[0-9a-f-]{8,64}$/i.test(id)) throw new Error("Unknown chart");
    // …same field normalization as saveChart…
    return { id, /* normalized fields */ };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.id) {
      const updated = await sql<ChartRow>`
        update charts set
          label = ${data.label},
          relation = ${data.relation},
          person_name = ${data.personName},
          sign_id = ${data.signId},
          birth_month = ${data.birthMonth},
          birth_day = ${data.birthDay},
          birth_year = ${data.birthYear},
          birth_hour = ${data.birthHour},
          birth_minute = ${data.birthMinute},
          birth_place = ${data.birthPlace},
          natal_json = ${data.natal ? JSON.stringify(data.natal) : null}::jsonb,
          tone = ${data.tone}
        where id = ${data.id} and user_id = ${context.userId}
        returning id, label, relation, person_name, sign_id, birth_month, birth_day, birth_year,
                  birth_hour, birth_minute, birth_place, natal_json, tone, created_at
      `;
      const row = updated[0];
      if (!row) throw new Error("Chart not found");
      return mapRow(row);
    }
    const id = crypto.randomUUID();
    const inserted = await sql<ChartRow>`
      insert into charts (/* same columns as saveChart */)
      values (/* … */)
      returning id, label, relation, person_name, sign_id, birth_month, birth_day, birth_year,
                birth_hour, birth_minute, birth_place, natal_json, tone, created_at
    `;
    return mapRow(inserted[0]!);
  });
```

Match **exact** column names already used in `saveChart` (`natal_json` vs `natal_json` — copy from the existing insert in this file).

- [ ] **Step 2: Strangler-wrap `saveChart`**

Change `saveChart` handler to call the same insert path **or** delegate to shared internal insert used by `upsertChart`, still returning `{ id: row.id }` so existing callers compile unchanged.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/charts.ts
git commit -m "feat: add upsertChart persistence hub"
```

---

### Task 4: Store attach + `openSavedChart` helper (P0/P1 seam)

**Files:**
- Modify: `src/lib/chart/session/store.ts`
- Modify: `src/lib/chart/session/store.test.ts`
- Create: `src/lib/chart/session/open-saved.ts`
- Modify: `src/lib/chart/session/index.ts`
- Modify: `package.json` if new test file added

**Interfaces:**
- Consumes: `patchSessionState`, `fromSavedChart`, `computeVisitorNatal`, `hasTimedNatal`
- Produces: `attachSavedId(id: string)` on store; `openSavedChart(chart, origin)` async helper

- [ ] **Step 1: Failing store test for `attachSavedId`**

```ts
it("attachSavedId sets savedId on the open session", () => {
  useSessionStore.getState().openVisitor(nativity, sky);
  useSessionStore.getState().attachSavedId("33333333-3333-3333-3333-333333333333");
  assert.equal(useSessionStore.getState().session?.savedId, "33333333-3333-3333-3333-333333333333");
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx tsx --test src/lib/chart/session/store.test.ts`  
Expected: FAIL (`attachSavedId` missing)

- [ ] **Step 3: Implement store method**

```ts
attachSavedId: (savedId) =>
  set((state) => {
    if (!state.session) return state;
    if (state.session.kind === "research") return state;
    const patch =
      state.session.kind === "shelf"
        ? { savedId, chartKey: savedId }
        : { savedId };
    return patchSessionState(state, patch);
  }),
```

Add to `SessionStore` type.

- [ ] **Step 4: Implement `openSavedChart`**

Create `src/lib/chart/session/open-saved.ts`:

```ts
import { computeVisitorNatal } from "@/lib/chart/sky";
import type { SavedChart } from "@/lib/charts";
import { hasTimedNatal } from "@/lib/charts-saved";
import type { Surface } from "./types";
import { fromSavedChart } from "./factories";
import { useSessionStore } from "./store";
import { openSessionState } from "./actions";

export async function openSavedChart(
  chart: SavedChart,
  origin: Surface,
): Promise<void> {
  let nativity = null as Awaited<ReturnType<typeof computeVisitorNatal>>["nativity"] | null;
  let sky = null as Awaited<ReturnType<typeof computeVisitorNatal>>["sky"] | null;

  if (hasTimedNatal(chart)) {
    try {
      const out = await computeVisitorNatal({
        data: {
          year: chart.birthYear,
          month: chart.birthMonth,
          day: chart.birthDay,
          hour: chart.birthHour!,
          minute: chart.birthMinute!,
          place: chart.birthPlace!,
          tone: chart.tone,
          label: chart.label,
        },
      });
      nativity = out.nativity;
      sky = out.sky;
    } catch {
      /* fall through to shelf */
    }
  }

  const session = fromSavedChart({
    chart,
    origin,
    nativity,
    skyNatal: sky,
  });
  useSessionStore.setState((state) => openSessionState(state, session));
}
```

Align `computeVisitorNatal` input/output property names with the real function in `src/lib/chart/sky.ts` (use whatever it actually returns — `sky` vs `skyNatal`, etc.).

Export from barrel.

- [ ] **Step 5: Tests PASS + typecheck**

```bash
npx tsx --test src/lib/chart/session/store.test.ts src/lib/chart/session/factories.test.ts
npm run typecheck
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/chart/session/store.ts src/lib/chart/session/store.test.ts src/lib/chart/session/open-saved.ts src/lib/chart/session/index.ts package.json
git commit -m "feat: attachSavedId and openSavedChart helpers"
```

---

### Task 5: BirthChat Keep + Library open (P1)

**Files:**
- Modify: `src/components/overlay/BirthChat.tsx`
- Modify: `src/components/overlay/LibraryShell.tsx`

**Interfaces:**
- Consumes: `upsertChart`, `attachSavedId`, `openSavedChart`
- Produces: Keep links live session; library opens with `savedId`

- [ ] **Step 1: BirthChat Keep**

Replace `saveChart({ data: {…} })` with:

```ts
const row = await upsertChart({
  data: {
    // same fields as today…
  },
});
useSessionStore.getState().attachSavedId(row.id);
setSaved(true);
```

Import `upsertChart` from `@/lib/charts`. Only call `attachSavedId` when `useSessionStore.getState().session` is non-null (Keep may run before Open — still save the row).

- [ ] **Step 2: LibraryShell open**

Replace the timed `openVisitor` / `openShelf({ fromSavedId })` block with:

```ts
await openSavedChart(c, "library");
```

Remove local duplicate compute/open branching (helper owns it).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/BirthChat.tsx src/components/overlay/LibraryShell.tsx
git commit -m "feat: Keep and library open via saved-chart hub"
```

---

### Task 6: Account open via same factory (P2)

**Files:**
- Modify: `src/routes/account.tsx`

**Interfaces:**
- Consumes: `openSavedChart`
- Produces: Account chart rows can open into a vault session

- [ ] **Step 1: Add Open control on `ChartRow`**

Beside Remove:

```ts
import { useNavigate } from "@tanstack/react-router";
import { openSavedChart } from "@/lib/chart/session";

// inside ChartRow:
const navigate = useNavigate();

<button
  type="button"
  className="min-h-11 text-xs tracking-[0.16em] text-fg uppercase hover:text-accent"
  onClick={async () => {
    await openSavedChart(chart, "library");
    void navigate({ to: "/" });
  }}
>
  Open
</button>
```

Use existing button spacing classes from the row. Origin `"library"` matches Surface union (`"galaxy" | "library"`) — account is desk-like; do **not** invent a third surface.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/routes/account.tsx
git commit -m "feat: open saved charts from account via hub"
```

---

### Task 7: Ask keys + migrate (P3)

**Files:**
- Modify: `src/lib/field-notes.ts`
- Modify: `src/lib/field-notes.ts` tests if present, else create `src/lib/field-notes.test.ts`
- Modify: `src/components/overlay/AskPanel.tsx`
- Modify: `src/lib/charts.ts` (`asChartKey` / `loadAsk` / `saveAsk` — signed-in path prefers uuid)

**Interfaces:**
- Consumes: `GUEST_ASK_KEY`, `isUuidChartId`, session `savedId`
- Produces: signed-in Ask uses `charts.id`; migrate local guest thread once

- [ ] **Step 1: Migrate helper + test**

In `field-notes.ts`:

```ts
export function migrateLocalAsk(fromKey: string, toKey: string): void {
  if (!fromKey || !toKey || fromKey === toKey) return;
  const thread = loadThread(fromKey);
  const notes = loadNotes(fromKey);
  if (!thread.length && !notes.length) return;
  const existingT = loadThread(toKey);
  const existingN = loadNotes(toKey);
  if (existingT.length === 0 && thread.length) saveThread(toKey, thread);
  if (existingN.length === 0 && notes.length) saveNotes(toKey, notes);
  localStorage.removeItem(`vault-ask-thread-v1-${fromKey}`);
  localStorage.removeItem(`vault-field-notes-v1-${fromKey}`);
}
```

Use the **exact** localStorage key prefixes already in this file.

Test with a minimal in-memory mock or skip DOM by guarding — if jsdom-less, extract key builders:

```ts
export function threadKey(id: string) { return `vault-ask-thread-v1-${id}`; }
```

and unit-test migrate logic with injected storage, **or** document manual smoke if Node cannot touch `localStorage` (prefer injectable `Storage` param defaulting to `localStorage`).

- [ ] **Step 2: AskPanel chart id**

```ts
const savedId = session?.savedId ?? null;
const researchKey = research?.chartKey ?? null;
const chartId = savedId
  ?? (signedIn ? "" : (shelf?.id ?? chartKey ?? GUEST_ASK_KEY))
  ?? "";
// research sessions: allow joey/saige keys even when signed in (not charts rows)
const askId = researchKey ?? chartId;
```

Rules:
- Signed-in **user** chart → `savedId` only (no `"visitor"`).
- Research → existing research chartKey.
- Guest → local guest key / shelf id as today.

On sign-in effect when `savedId` appears:

```ts
migrateLocalAsk(GUEST_ASK_KEY, savedId);
```

Then `loadAsk({ data: savedId })` / `saveAsk` with uuid only.

- [ ] **Step 3: Tighten `asChartKey` for clarity**

Keep allowing `saige`/`joey` for research. UUID for saved charts. Do **not** remove uuid path. Optionally reject bare `"visitor"` in `saveAsk` when you can detect signed-in (middleware always signed-in for these fns — so **`saveAsk` should reject `visitor`**):

```ts
if (v === "visitor") throw new Error("Unknown chart");
```

Guest Ask never hits server.

- [ ] **Step 4: Tests + typecheck**

```bash
npx tsx --test src/lib/field-notes.test.ts src/lib/charts-saved.test.ts
npm run typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/field-notes.ts src/lib/field-notes.test.ts src/components/overlay/AskPanel.tsx src/lib/charts.ts package.json
git commit -m "feat: key signed-in Ask by charts.id with local migrate"
```

---

### Task 8: Remove dead paths (P4) + acceptance

**Files:**
- Modify: `src/lib/charts.ts` (callers of insert-only `saveChart` → `upsertChart` where appropriate)
- Modify: `src/lib/chart/sky.ts` only if `persistNatal` / `saveChartTone` can thin-wrap upsert without behavior change — otherwise leave and note follow-up
- Modify: BirthChat/account remaining `saveChart` imports → `upsertChart`
- Grep cleanup

**Interfaces:**
- Produces: no signed-in Ask writes under `"visitor"`; Keep/library/account on hub

- [ ] **Step 1: Grep gates**

```bash
rg -n "saveChart\(|\"visitor\"" src/components/overlay/BirthChat.tsx src/components/overlay/AskPanel.tsx src/routes/account.tsx src/lib/charts.ts
rg -n "openVisitor\(|fromSavedId" src/components/overlay/LibraryShell.tsx
```

Expected after cleanup:
- BirthChat/account use `upsertChart` (or `saveChart` wrapper only if still intentionally insert-only for Add Chart form — Add Chart may keep `saveChart` **or** switch to `upsertChart` without id; prefer upsert for one path)
- AskPanel has no signed-in `"visitor"` server writes
- LibraryShell uses `openSavedChart`

- [ ] **Step 2: Full unit gates**

```bash
npm run typecheck
npx tsx --test src/lib/charts-saved.test.ts src/lib/chart/session/*.test.ts src/lib/field-notes.test.ts src/components/overlay/resolveGate.test.ts
```

Expected: PASS

- [ ] **Step 3: Manual / browser smoke**

1. Sign in → claim → Keep → confirm session `savedId` (Ask binds).
2. Escape → library → open same row → same id / content.
3. Account → Open → lands in natal with `savedId`.
4. Guest Ask still local; sign-in migrates `"visitor"` local thread onto saved chart when present.
5. Research Joey/Saige open unchanged (no `charts` row).

- [ ] **Step 4: Commit**

```bash
git add -A
git status
git commit -m "refactor: finish saved-chart hub cutover"
```

---

## Self-review (plan vs spec)

| Spec item | Task |
| --- | --- |
| `upsertChart` hub | 3 |
| `fromSavedChart` | 2 |
| Keep attaches `savedId` | 4–5 |
| Library + account open | 5–6 |
| Ask keyed by `charts.id` + migrate | 7 |
| Research code-loaded | Global + Task 8 smoke |
| Strangler then delete dead paths | 3 wrapper + 8 |
| P0–P4 phases | Tasks 1–4 P0/P1 seam → 5 P1 → 6 P2 → 7 P3 → 8 P4 |

No TBDs. Names match repo (`savedId`, `SavedChart`, `upsertChart`, `openSavedChart`).
