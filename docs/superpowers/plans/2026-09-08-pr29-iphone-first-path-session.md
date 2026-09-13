# PR #29 Implementation Plan — iPhone first-path + claim draft

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On mid-iPhone Safari, the first two minutes (fly → claim → BirthChat → Open natal → Sky) stay stable — no stage jump, no Safari zoom, no keyboard-shrunk WebGL, no cookie over the CTA — and “Open this natal” opens a visitor `ChartSession` from a `ClaimDraft`.

**Architecture:** Path-only stabilize on existing travel/slide/chrome. Extract pure helpers for StageLock freeze, overlay-hit phone query, and SignDisk/Station shared scale clamp so they can be unit-tested without R3F. ChartSession S0 lives under `src/lib/chart/session/` (types / factories / actions / selectors / tests). Store gets `claim` + `openSession(fromVisitor)` only. Galaxy travel does not import session types.

**Tech Stack:** TypeScript, React 19, TanStack Start, Three/R3F, Zustand, Node test runner (`npx tsx --test` / `npm test`).

## Global Constraints

- Specs:
  - `docs/superpowers/specs/2026-09-08-pr29-iphone-first-path-session-design.md` (this PR)
  - `docs/superpowers/specs/2026-09-03-iphone-first-path-stability-design.md`
  - `docs/superpowers/specs/2026-09-04-chart-session-boundaries-design.md` (S0 + claim only)
- Base = latest `main` (includes #25–#28). Rebase. Do not merge rooms / shell-gate / saved-chart / security-p0 branches.
- Stability over cinema. Keep `lerpToward` rate 2.2. No Framer Motion. No new shell.
- Do **not** hide the Grok “Created with Grok / Remix” pill.
- Do **not** persist charts (`upsertChart`, `savedId`, Ask keys).
- Do **not** reorder `CONSTELLATIONS` or change tropical / calendar mapping.
- Do **not** retune enter-dive progress windows from the seamless-dive spec.
- Silent 10s hold from #28 must **pause** while `claim !== null`.
- Phone breakpoint for path CSS = `max-width: 767px` to match `PHONE_MAX_WIDTH = 768`.
- Commit after each task. Keep `npm test` and `npm run typecheck` green at runtime-touching boundaries.

## File map

| File | Responsibility |
| --- | --- |
| Add `src/lib/chart/session/types.ts` | `ChartSession`, `ClaimDraft`, `SessionKind`, `BirthFacts`, `Surface` |
| Add `src/lib/chart/session/factories.ts` | `fromVisitor` (and stubs `fromResearch` / `fromShelf` if types need them) |
| Add `src/lib/chart/session/actions.ts` | Pure `openSession` / `closeSession` / `setClaim` / `clearClaim` |
| Add `src/lib/chart/session/selectors.ts` | `isClaiming`, `hasSession`, `isVisitorSession` |
| Add `src/lib/chart/session/index.ts` | Public barrel |
| Add `src/lib/chart/session/*.test.ts` | Pure unit tests |
| Modify vault Zustand store (existing `src/lib/store.ts` or successor) | `session`, `claim`, `surface`; `openVisitor` becomes `openSession(fromVisitor)` |
| Modify `src/components/StageLock.tsx` | Freeze `--app-h` while `.birth-chat` fields focused |
| Add `src/lib/ui/stageLockPolicy.ts` (+ test) | Pure “should freeze height” helper |
| Modify `src/styles.css` | `.path-field`, overlay-hit 767, cookie above thumb band |
| Modify `src/components/overlay/BirthChat.tsx` | `.path-field`, phone first-paint (2 temple lines), claim draft |
| Modify `src/components/overlay/VaultApp.tsx` | Chrome budget; Open natal → `openSession` |
| Modify `src/components/overlay/SignStrip.tsx` | Thumb-band spacing / safe-bottom |
| Modify `src/components/overlay/LegalFooter.tsx` | Cookie/legal above strip on galaxy |
| Modify lift math (`src/lib/galaxy/birthchat-slide.ts`, SignDisk in `GalaxyIntro.tsx`) | Shared lerped `scaleBoost` |
| Modify `src/components/scene/ChartCanvas.tsx` | Apple SceneGate 160ms → 48ms |
| Modify hold-timer owner (selection hold from #28) | Pause while `claim !== null` |

If a path in the table does not exist under that exact name, search the repo and edit the real file. Do not invent a second VaultApp.

---

### Task 1: ChartSession S0 (pure modules + tests)

**Files:**
- Add: `src/lib/chart/session/types.ts`
- Add: `src/lib/chart/session/factories.ts`
- Add: `src/lib/chart/session/actions.ts`
- Add: `src/lib/chart/session/selectors.ts`
- Add: `src/lib/chart/session/index.ts`
- Add: `src/lib/chart/session/session.test.ts`

**Interfaces:**
- `ClaimDraft = { signId: string; birth: BirthFacts | null }`
- `fromVisitor(...)` returns `ChartSession` with `kind: "visitor"`, `chartKey: "visitor"`, `origin: "galaxy"`
- `isClaiming(claim, session)` is true iff `claim !== null && session === null`

- [ ] **Step 1: Write failing tests** for factories, `setClaim` / `clearClaim`, `openSession(fromVisitor)`, and `isClaiming`.

- [ ] **Step 2: Run** `npx tsx --test src/lib/chart/session/session.test.ts` — expect FAIL (modules missing).

- [ ] **Step 3: Implement minimal modules.** No Zustand yet. No React.

- [ ] **Step 4: Re-run tests — PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/chart/session
git commit -m "feat(session): S0 ChartSession types, claim draft, fromVisitor"
```

---

### Task 2: StageLock keyboard freeze + 16px path fields

**Files:**
- Add: `src/lib/ui/stageLockPolicy.ts`
- Add: `src/lib/ui/stageLockPolicy.test.ts`
- Modify: `src/components/StageLock.tsx`
- Modify: `src/styles.css`
- Modify: `src/components/overlay/BirthChat.tsx`

**Interfaces:**
- `shouldFreezeAppHeight(opts: { pathFieldFocused: boolean }): boolean`
- When focused inside `.birth-chat` on `input, textarea, select`: do not write keyboard-shrunk `visualViewport.height` into `--app-h`. Keep width + offsetTop updates.
- `.path-field { font-size: 16px; min-height: 48px; }` on BirthChat controls.

- [ ] **Step 1: Unit-test** freeze vs resume (focused true/false).

- [ ] **Step 2: Wire StageLock** with capture `focusin` / `focusout` on `.birth-chat` fields. Snapshot height just before focus.

- [ ] **Step 3: Apply `.path-field`** to BirthChat inputs/selects/textareas. Audit fly→cast path for leftover `text-sm` on phone.

- [ ] **Step 4:** `npx tsx --test src/lib/ui/stageLockPolicy.test.ts` + `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui src/components/StageLock.tsx src/styles.css src/components/overlay/BirthChat.tsx
git commit -m "fix(path): freeze stage height while BirthChat keyboard is open"
```

---

### Task 3: Phone chrome budget (thumb band + cookie)

**Files:**
- Modify: `src/styles.css`
- Modify: `src/components/overlay/VaultApp.tsx` (GalaxyCopy / claim CTA)
- Modify: `src/components/overlay/SignStrip.tsx`
- Modify: `src/components/overlay/LegalFooter.tsx`

**Interfaces:**
- Path CSS phone query = `max-width: 767px` (replace 720 where it affects overlay-hit / BirthChat / strip).
- `--overlay-hit` cap `2.75rem` on real Safari; preview-host may keep larger inset.
- Cookie/legal on galaxy = one compact dismissible row **above** the strip band.
- Thumb band = strip + one-line hint + **This is my sign**, clear of `--safe-bottom`.
- Top row = title + Skip + Auth only.

- [ ] **Step 1: Unify 767 breakpoint** for overlay-hit and path chrome.

- [ ] **Step 2: Move cookie/legal above the strip** so first-visit CTA is tappable.

- [ ] **Step 3: Confirm safe-area** — CTA not under home indicator.

- [ ] **Step 4:** `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/components/overlay/VaultApp.tsx src/components/overlay/SignStrip.tsx src/components/overlay/LegalFooter.tsx
git commit -m "fix(path): one thumb band; cookie above claim CTA"
```

---

### Task 4: BirthChat first paint + shared plate lift scale

**Files:**
- Modify: `src/components/overlay/BirthChat.tsx`
- Modify: `src/lib/galaxy/birthchat-slide.ts` (or the file that owns lift scale)
- Modify: `src/components/scene/GalaxyIntro.tsx` (SignDisk clamp)

**Interfaces:**
- Phone first paint (`max-width: 767px`): essence + **2** temple lines above the date form; remaining copy + chakra note scroll below the form.
- Cast → rest → **Open this natal** remains the single full-width primary.
- SignDisk uses the same lerped `scaleBoost` as Station (no hard `1.4`).
- Keep `lerpToward` rate 2.2.

- [ ] **Step 1: Write a unit test** that Station clamp and SignDisk clamp share one helper (extract if needed).

- [ ] **Step 2: Trim BirthChat phone first paint** as specified.

- [ ] **Step 3:** focused tests + `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/BirthChat.tsx src/lib/galaxy src/components/scene/GalaxyIntro.tsx
git commit -m "fix(path): BirthChat phone first paint + shared lift scale"
```

---

### Task 5: SceneGate 48ms + header trim

**Files:**
- Modify: `src/components/scene/ChartCanvas.tsx` (`SceneGate`)
- Modify: `src/components/overlay/VaultApp.tsx` (`Chrome`) if a third header row exists on phone

**Interfaces:**
- On Apple / modest GPU, SceneGate timeout **160ms → 48ms**.
- Visitor phone header after land: title + Auth. Trust meta stays in the sheet.

- [ ] **Step 1: Change the timeout.** Do not rewrite SceneGate.

- [ ] **Step 2: Drop extra header row on visitor phone** if present.

- [ ] **Step 3:** `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/ChartCanvas.tsx src/components/overlay/VaultApp.tsx
git commit -m "fix(path): shorten Apple SceneGate black gap to 48ms"
```

---

### Task 6: Wire claim draft + openSession + pause hold

**Files:**
- Modify: vault Zustand store
- Modify: `src/components/overlay/BirthChat.tsx`
- Modify: `src/components/overlay/VaultApp.tsx` (Open this natal)
- Modify: selection-hold owner from #28 (search `hold` / `10` / `unselect`)

**Interfaces:**
- Opening BirthChat sets `claim = { signId, birth: null | facts }` and leaves `session === null`.
- “Open this natal” calls `openSession(fromVisitor(...))` then `claim = null`.
- Hold timer pauses while `claim !== null` (also while explore/intro as #28 already specified).
- Do not add `upsertChart` or `savedId`.

- [ ] **Step 1: Store fields** `session`, `claim`, `surface`. Keep compat aliases so existing callers still compile (`entered` ⇔ `session !== null` is fine for this PR).

- [ ] **Step 2: BirthChat writes claim.** Open natal opens visitor session.

- [ ] **Step 3: Pause #28 hold** while claiming.

- [ ] **Step 4:** session tests + `npm test` + `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/lib src/components/overlay
git commit -m "feat(session): claim draft opens visitor session; pause sign hold"
```

---

### Task 7: Full verify

- [ ] **Step 1:** `npm test` && `npm run typecheck`

- [ ] **Step 2: Manual path (dev, 390×844 and 430×932)**

  1. Cold open → intro/Skip — no stage jump.
  2. Fly / swipe → This is my sign tappable above home indicator; cookie not blocking CTA.
  3. BirthChat: date controls visible; focus month/day/year/place → no Safari zoom; sky does not shrink.
  4. Plate lift into well; no disk/plate drift.
  5. Open this natal → Sky without long black flash or overlapping chrome.
  6. Hold does not clear the sign under the sheet.
  7. Back / dismiss claim without cast → corridor + hold resume.

- [ ] **Step 3: PR body** uses title:

  `fix(path): iPhone first two minutes + claim is a session draft`

  Link both specs. List Out (saved charts, rooms, shells, P0). Tick the device plan.

---

## Spec coverage

| Requirement | Task |
| --- | --- |
| StageLock keyboard freeze | 2 |
| 16px path fields | 2 |
| Thumb band + cookie above CTA | 3 |
| Breakpoint 767 | 3–4 |
| BirthChat first paint | 4 |
| Shared lift scale | 4 |
| SceneGate 48ms | 5 |
| ChartSession S0 | 1 |
| claim → openSession(fromVisitor) | 6 |
| Hold pauses while claim | 6 |
| Device acceptance | 7 |
| No saved-chart / rooms / shells / P0 | Global |

## Order (do not reorder)

1. Session S0 (pure, safe)
2. StageLock + 16px (felt immediately)
3. Chrome budget
4. BirthChat paint + lift
5. SceneGate
6. Wire claim + hold
7. Verify
