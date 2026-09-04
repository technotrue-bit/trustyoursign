# Task 11 report — Remove compat (S3)

## Implementation summary

- Deleted the legacy session compatibility projector and `useVault` façade.
- Migrated `BirthChat` and `VaultApp` to session hooks and
  `useSessionStore` actions.
- Replaced compatibility-projector tests with direct session-store tests.
- Updated the test command to run the direct store suite.
- No intentional UX changes.

## Verification

- `npm run typecheck`: PASS
- `npx tsx --test src/lib/chart/session/*.test.ts`: PASS — 18 tests, 4
  suites.
- Legacy façade/import grep: PASS — no matches.
- Removed-file check: PASS.

```text
$ rg "useVault|session/compat|from [\"'][^\"']*compat|projectVaultState|@/lib/store" src
<no matches>

$ test ! -e src/lib/chart/session/compat.ts && test ! -e src/lib/store.ts
PASS
```

## Commit SHA

- `e391e95ccd60d46c213c9082d78384aae656cc97` —
  `refactor(session): remove compatibility facade`

## Concerns

None.
