# Task 1 Report: Pure inside hard-gate helper + tests

## Status

**DONE**

## Summary

Added `insideHardGateHidesLeftovers(phase: ExplorePhase): boolean` to `src/lib/galaxy/signGalaxy.ts` — returns `true` only when `phase === "inside"`. Unit tests cover all five `ExplorePhase` values.

## TDD Steps

| Step | Action | Result |
| --- | --- | --- |
| 1 | Appended `insideHardGateHidesLeftovers` describe block to `signGalaxy.test.ts` | Tests written |
| 2 | `npx tsx --test src/lib/galaxy/signGalaxy.test.ts` | FAIL — export not found (expected) |
| 3 | Added helper next to enter-curve helpers in `signGalaxy.ts` | Implementation complete |
| 4 | Re-ran tests | PASS — 5 tests, 2 suites, 0 failures |
| 5 | Committed | `e66a043` |

## Files Changed

- `src/lib/galaxy/signGalaxy.ts` — new `insideHardGateHidesLeftovers` export
- `src/lib/galaxy/signGalaxy.test.ts` — new test suite with 5 phase assertions

## Test Output

```
▶ signGalaxy (4 tests) ✔
▶ insideHardGateHidesLeftovers (1 test) ✔
ℹ tests 5 | pass 5 | fail 0
```

## Constraints Verified

- `CONSTELLATIONS` order untouched
- Enter-curve helpers (`enterWorldFade`, `enterPlateFade`, etc.) unchanged
- Helper returns `true` only for `phase === "inside"`
- No scene component wiring (Task 2+)

## Commit

```
e66a043 feat(galaxy): inside hard-gate helper for land leftover hide
```

## Concerns

None.
