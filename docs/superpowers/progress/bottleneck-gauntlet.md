# Bottleneck gauntlet — progress

GOAL: Remove material FPS / load / forge wall-clock bottlenecks  
BAR: (1) ≤16.7ms avg frame mid-session · (2) three not in early VaultApp graph · (3) forge advance batches prose keys

---

## Wave 3 — Tier C server (2026-09-05)

**VERDICT:** PASS (builder) — C1–C5 implemented; forge + geocode unit tests green.

### C# status

| ID | Status | Evidence |
| --- | --- | --- |
| C1 | done | `advanceForge` runs `proseAdvanceBatch` (≤`FORGE_PROSE_BATCH`=3) via `Promise.allSettled`; not one key per poll |
| C2 | done | Poll/`getForgeStatus`/`findActiveForge` use lean cols (no cast/nativity blobs); full blobs only when `status === 'ready'` |
| C3 | done | `geocodePlace` caches by `normalizeGeocodeQuery`; unit test proves one network hit |
| C4 | done | `getNeonPool(Pool)` on `globalThis.__neonPool__` shared by `db.ts` + `auth/server.ts` |
| C5 | done | `loadDesk` process memo on `globalThis`; `saveDesk` invalidates |

### Tests

- `node --experimental-strip-types --test src/lib/chart/forge.test.ts src/lib/chart/ephemeris-geocode.test.ts` → 10 pass

### LARGEST GAP (for critic)

- Live forge wall-clock with real XAI not measured in this wave (unit-only). Critic should confirm advance completes multiple keys and poll path has no `select *`.
- Desk memo has no isolated unit test (needs DB); invalidate-on-save is code-path only.
