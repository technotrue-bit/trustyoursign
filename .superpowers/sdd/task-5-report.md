# Task 5 report — Zustand store + compat façade

## Implementation summary

- Added `src/lib/chart/session/store.ts` with the canonical Zustand domain state:
  `session`, `claim`, and `surface`.
- Routed transitions through the S0 factories and pure actions.
- Isolated galaxy mutations in `seekSignFor` and `resetGalaxyTravel`.
- Preserved Joey tour initialization/advancement, birth-sign validation, shelf
  tone/natal updates, close routing, and galaxy reset behavior.
- Added `src/lib/chart/session/compat.ts` to project every legacy field and wrap
  every legacy action.
- Replaced `src/lib/store.ts` with the compatibility façade while preserving
  `useVault`, `BirthDate`, and `ShelfSketch`.
- Exported the session store from the session barrel without adding hooks.

## Verification

- `npm run typecheck`: PASS
- `npx tsx --test src/lib/chart/session/*.test.ts`: PASS — 18/18 tests

## TDD notes

- Added the store/compat behavior suite before implementation.
- RED: the suite failed with the expected assertions because `store.ts` and
  `compat.ts` did not exist.
- GREEN: implemented the store and façade, then confirmed the new suite and all
  existing session tests pass.

## Self-review

- Confirmed all legacy fields and action names from `legacy-store.ts.ref` remain
  available.
- Confirmed shelf `chartId` projects to `null`, visitor to `"visitor"`, and
  research to `joey|saige`.
- Confirmed `gate` prefers `session.origin` and otherwise uses `surface`.
- Confirmed `CONSTELLATIONS` remains Aries-first and is never reordered.
- Confirmed travel side effects do not leak into factories, actions, or the
  compatibility projector.
- Confirmed no hooks or unrelated migration work was introduced.

## Commit SHA

- `3c148e3` — `feat(session): wire Zustand session store with compat façade`

## Concerns

None.

## Important review findings follow-up

- Added `openLibraryVisitor` as a dedicated store entry so legacy
  `openChart("visitor", research)` creates a visitor session with
  `origin: "library"`, `skyNatal: null`, and no tour beat.
- Kept `openVisitor` unchanged as the F&F galaxy entry.
- Added a compatibility regression asserting `gate === "library"` and
  `chartId === "visitor"`.
- Added `src/lib/chart/session/store-compat.test.ts` to the `npm test` session
  test phase.

### Follow-up verification

- `npx tsx --test src/lib/chart/session/store-compat.test.ts`: PASS — 6/6 tests.
- `npx tsx --test src/lib/chart/visitor-nativity.test.ts src/lib/chart/session/selectors.test.ts src/lib/chart/session/factories.test.ts src/lib/chart/session/actions.test.ts src/lib/chart/session/store-compat.test.ts`:
  PASS — 20/20 tests.
- `npm run typecheck`: PASS.
- `npm test`: FAIL in the pre-existing script-test phase — 178/195 passed and
  the chained session phase did not run. The unrelated failures include
  `scripts/write-atomic.test.mjs` requiring the absent
  `.grok/skills/og/references` fixture, as well as other absent template
  fixtures such as `.grok/skills/og/SKILL.md` and the default app-env data.

### Follow-up commit

- `94bd3b8` — `fix(session): preserve visitor library compatibility`
