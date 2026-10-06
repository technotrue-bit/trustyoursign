# TrustYourSign — Architecture Map & Risk Register

**Repo:** GitHub `technotrue-bit/trustyoursign`
**Current main:** refreshed in #184; test locks through #188.
**2026-09-11 audit:** `05ac661` (merge of PR #36). That commit is history. The counts and the live host below are measured on current `main`, not copied from the audit.
**App:** Trust Your Sign ("The Vault") — a natal fly-through. Live: https://trustyoursign.com
**Scale:** `src/` is **53,756** lines across 327 tracked files (`git ls-files src`, then `wc -l`). `src/lib/galaxy/travel.ts` is **2,204** lines with **86** lines that begin with `export`. `src/components/scene/GalaxyIntro.tsx` is **1,737** lines.

`docs/superpowers/plans/` (plans dated 2026-09-04 through 2026-09-15) is history. The files stay in the tree. They are not current work orders.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | TanStack Start (SSR + server functions) + React 19 |
| Routing | TanStack Router, file-based (`src/routes/`) |
| 3D | three.js + @react-three/fiber + drei (22 modules touch three) |
| State | zustand (galaxy UI mirror + session store) |
| Auth | Better Auth — self-hosted at `/api/auth/*`, federating to the Grok auth broker |
| DB | Postgres via `pg` → Neon when `DATABASE_URL` set; else embedded **PGLite** (WASM) |
| Deploy | Vercel (nitro build → `.vercel/output`) |
| AI | xAI `grok-4.5` / `grok-4.6` chat completions, server-side only |

---

## 2. Layer map

```
src/routes/            thin shells: index, login, account, admin, privacy, terms, api/auth/$
        │
src/components/        presentation
  overlay/             UI shells (VaultApp, DetailPanel, AskPanel, BirthChat, LibraryShell…)
  scene/               three.js surfaces (GalaxyIntro, ChartCanvas, SignGalaxyField…)
        │
src/lib/               logic
  chart/session/       pure domain: types → actions/selectors/factories/rooms → store (zustand)
  chart/               astronomy + canon (ephemeris, houses, planets, aspects, canon, ask)
  galaxy/              flight + 3D maths (travel, constellations, signGalaxy, signVolume…)
  auth/                identity + middleware + gates
  app-data/            viewer-connector data bridge
  multiplayer/         p2p.ts (570 lines)
        │
        └── .server.ts  the Node-only edge (db, rls, site, owner, desk, auth/server)
```

**Import hubs** (most-imported modules — the real load-bearing walls):

`chart/types` (44) · `chart/schema` (17) · `galaxy/constellations` (15) · `galaxy/temple` (14) ·
`galaxy/travel` (13) · `utils` (12) · `chart/ephemeris` (12) · `owner` (11) · `auth/use-current-user` (11) ·
`gpu` (11) · `charts` (10) · `chart/session/store` (10) · `galaxy/store` (10)

---

## 3. The client/server seam — the pattern that matters most

This is where PR #36 ("galaxy went black") came from, so it's worth stating explicitly.

**Rule:** `*.server.ts` is Node-only and must never be statically imported from anything client-reachable.

**The "facade" pattern for every RPC surface:**

```ts
// src/lib/site.ts  — client-safe facade
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export const claimSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { claimSiteImpl } = await import("./site.server");  // ← dynamic, server-only
    return claimSiteImpl({ userId: context.userId });
  });
```

Same shape in `charts.ts`, `sky.ts`, `research.ts`, `ask.ts`, `field-notes.ts`, `site.ts`.
`authMiddleware` is dual (client bearer hook + server verify) and dynamic-imports
`isolation.server`, `verify.server`, `db-rls.server` **inside** its `.server` stage.

**Verified state of the boundary (independent check, post-#36):**

| Marker | Client bundle hits |
|---|---|
| `AsyncLocalStorage` | 0 |
| `__vite-browser-external` | 0 |
| `pglite` | 0 |
| `createRequire` | 0 |

PGLite correctly present **only** in `.vercel/output/functions/__server.func/_libs/`.

CI repeats this grep on `.vercel/output/static/assets` after `npm run build` and fails the run on any hit.

**When adding a feature:** put the implementation in a `.server.ts` file and reach it by
dynamic `import()` inside a `createServerFn` handler. A static import of a Node builtin
anywhere on the client graph = black screen, no error page.

---

## 4. Subsystems

### 4.1 Auth & identity (`src/lib/auth/`)

Tri-mode, driven by env:

| Mode | Trigger | Behavior |
|---|---|---|
| Deployed | `GROK_AUTH_*` + `BETTER_AUTH_URL` + `DATABASE_URL` | Real federated auth persisted in Neon |
| Live preview | nothing injected | Shared preview client; PGLite; bearer token (partitioned iframe cookies) |
| Off | `VITE_AUTH_ENABLED=false` | Dev user; **throws fail-closed if `DATABASE_URL` is set** |

- `verify.server.ts` resolves the user from request cookies via `auth.api.getSession` — never trusts a client-sent id.
- `gate-identity.server.ts` verifies Grok **gate** identity JWTs (EdDSA/Ed25519, 10-min max age, JWKS cached 5 min) from `x-grok-identity`.
- `gate-session.server.ts` materializes a Better Auth session from a gate identity, with a dual-path cookie emit (TanStack `setCookie` + Better Auth `responseHeaders`) and a stale-`session_data` cache invalidation.
- `isolation.server.ts` blocks scripted cross-site/sibling requests via `Sec-Fetch-Site` (the `*.grok.me` sibling-tenant threat).
- Rate limits: 5/min sign-in, 3/min sign-up.

### 4.2 Database & RLS

`db.server.ts` is the whole data layer:

- **Dual backend:** Neon `pg.Pool` (max 4) when `DATABASE_URL` is set, else PGLite (WASM) — same code path, swappable by env alone.
- **HMR-safe:** all init state is promise-memoized on `globalThis`, so a Vite reload can't open a second pool or double-run migrations.
- **Type parity:** pg vs PGLite disagree on `int8`/`date`/`interval` — OID parsers normalize both so preview and prod return identical JSON.
- **RLS enforcement:** when `AppRls.current()` is set, queries run inside `BEGIN` → `set_config('app.user_id'…, true)` → query → `COMMIT`.

`migrations/0007_rls.sql` forces RLS on `charts`, `legal_acceptances`, `chart_ask`, `sky_pass`
(policy: `bypass OR is_owner OR user_id = app.user_id`) and makes `site_state` world-readable /
owner-writable.

**Failure mode is fail-closed:** a query with no RLS context matches `user_id = null` → denied,
returning empty rather than leaking. Good design.

### 4.3 Chart domain + session

`src/lib/chart/session/` is a clean, testable core:

```
types.ts      ChartSession, SessionKind (visitor|research|shelf), ClaimDraft, BirthFacts, Surface
actions.ts    pure reducers — openSessionState, patchSessionState, seekSignFor, …
selectors.ts  derived reads — isEntered, nativityOf, closeTarget, …
factories.ts  fromVisitor / fromResearch / fromShelf / fromSavedChart
rooms.ts      ROOM_CATALOG (sky, body, gates, machine, readings, bones, ask) + canEnter(sessionKind, room)
store.ts      zustand wrapper; also drives galaxy travel (seekSign, exitSignGalaxy, resetTravel)
```

Room access is **capability-gated per session kind** — a visitor session can't enter research rooms.
This is the app's authorization model for *features* (distinct from RLS for *rows*).

### 4.4 Galaxy / scene (the biggest, most delicate subsystem)

`src/lib/galaxy/travel.ts` (2,204 lines, 86 `export` lines) is the flight engine and it is
**deliberately not React state**:

> `/** Shared mutable travel. Written every frame by the camera. Not React state. */`

- One module-level `galaxyTravel` object, mutated every frame; React reads it through
  `galaxy/store.ts` with epsilon guards (`Math.abs(prev.t - t) < 0.008`) to avoid render storms.
- Hand-tuned constants carry the feel: `ENTER_SEC 4.5`, `SPACING 50`, `AUTO_SIGN 7s`,
  `SELECTION_HOLD_MS 10_000`, `BIRTH_SECONDS 3.85`, `MAX_FLY 0.72`.
- Its own `rAF` + a wall-clock auto clock so the 7s walk keeps time while the canvas boots.
- `GalaxyIntro.tsx` is 1,737 lines — the largest component, and the one that owned the
  birth → open → fly sequences.

**Implication for future work:** correctness here depends on ordering and frame timing, not on
data flow. Changes to travel timing need a real rendered check, not just unit tests. Existing
guards: `signVolume.test.ts`, `layers.test.ts`, `selectionHold.test.ts`, `enterSkip.test.ts`,
`birthchat-slide.test.ts`, `signGalaxy.test.ts`, `exploreAccess.test.ts`.

### 4.5 AI

Two server-only entry points, both spending `XAI_API_KEY` (the app owner's quota):
`chart/ask.ts` (~12s light calls) and `chart/desk.server.ts` (`talkToSky`, light vs deep,
up to 55s, models/prompts editable at runtime through `site_state.ai_json`).
A `kill` switch exists in the desk config.

---

## 5. RISK REGISTER

### R1 — **Owner privileges were granted by matching a user-editable display name** · CRITICAL — **FIXED in [#37](https://github.com/technotrue-bit/trustyoursign/pull/37)**

**Evidence (what the 2026-09-11 audit saw, before #37):**
- Public sign-up was on.
- Sign-up sent a user-supplied display name.
- The owner check compacted name and email and did a substring test for the owner handles.
- The server-side gate used that same match against the user row. It did not consult `site_state.owner_user_id`.

That list is the audit's picture of the bug. It is not the live check.

**Current gate:** `isSiteOwnerIdentity` in `src/lib/owner.ts`. A display name is never consulted. `src/lib/owner.server.ts` says a display name is never sufficient.

**Impact:** anyone can sign up with display name `Devin Norris` (or any string containing the
compacted name/handle) and pass `assertSiteOwner` server-side. That unlocks:

| Server function | What it exposes |
|---|---|
| `getResearchChart` | Real natal data for `joey` and `saige` (`nativities/load.server.ts`) |
| `listResearchLibrary` | Names, dates, chart one-liners |
| `askTheChart` | Owner-gated AI call on the owner's xAI quota |
| `getAiDesk` / `saveAiDesk` | Read **and rewrite** the AI system prompts, models, token caps |
| `grantSkyPass` | Grant sky passes |

**Empirically verified** (ran the real predicate through `tsx`, temp file removed):

```
true   {"displayName":"Devin Norris","primaryEmail":"attacker@example.com"}
true   {"displayName":"xX ItsMeTrueG Xx","primaryEmail":"attacker@evil.io"}
true   {"displayName":"Devin Norris Fan","primaryEmail":"a@b.c"}
false  {"displayName":"Jane Doe","primaryEmail":"jane@example.com"}
```

**Reachability — this does not depend on open sign-up.** Any path that produces a session whose
`name` contains the compacted owner name or handle works:

1. **Federated sign-in** (Google / X via the broker) — the profile name comes from the upstream
   account, which the attacker controls. Turnstile does not apply to OAuth.
2. **Gate identity** on `*.grok.me` — `gateIdentityUserInfo()` sets `name` from the gate JWT.
3. **Email/password sign-up** — `emailAndPasswordEnabled = true`, `name` is user-supplied.
   Turnstile is **conditional**: `captcha({...})` is spread in only when **both**
   `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY` are set (`auth/server.ts`); otherwise it's
   a plain form with a client-side honeypot. Rate limit is 3 sign-ups/min — not a barrier.

So closing sign-up alone would **not** fix this. The authorization decision itself has to stop
depending on a display name.

**Note:** `claimSiteImpl` *does* check `site_state` and won't hand over an already-claimed site —
but the research/AI functions call `assertSiteOwner` directly, so that protection is bypassed.

**Fix (shipped in #37):** authorize by immutable identity only — `OWNER_EMAILS`
(verified only), `OWNER_ACCOUNTS` (`providerId:accountId` from the `account` table), the
recorded binding in `site_state.owner_user_id`, or the canonical `vault-owner-devin` row.
A recognised identity is recorded in `site_state.owner_user_id` so later requests are decided
by id alone; bootstrap now uses `coalesce` so it cannot clobber a binding. The name heuristic
survives only as an opt-in one-time bootstrap (`OWNER_NAME_CLAIM=1`), narrowed from substring
to whole-name/whole-token, and logged when it fires.

Reproduced and closed end-to-end: before the fix, an account signed up as
`attacker-e2e@example.com` with display name "Devin Norris" was served the owner desk **and** the
owner-only research charts; after it, the same session is refused ("This desk is taken.").

**Deploy requirement:** set `OWNER_EMAILS` (or `OWNER_ACCOUNTS`) in the host environment, or the
owner is not recognised.

---

### R2 — Preview/owner bootstrap is open when env is incomplete · MEDIUM — **CLOSED in [#148](https://github.com/technotrue-bit/trustyoursign/pull/148)**

`site.server.ts` used to treat a missing deploy env as "this is a preview." `previewDeskOpen()`
returned `true` unless `VERCEL` was set **or** (`GROK_AUTH_CLIENT_SECRET` **and** `DATABASE_URL`).
If a production deploy was missing either secret, `bindOwnerPreviewImpl()` would sign in as the
owner using `OWNER_PASSWORD` and return a live session token with no user interaction.

**Closed in #148.** Owner preview bind now requires an explicit `ALLOW_PREVIEW_OWNER_BIND=1`
and a preview or loopback host. A missing flag fails closed. Absent env is no longer treated
as permission to mint an owner session.

---

### R3 — `device` mutation surface: `deleteAllMyData` · LOW (verified correct)

`deleteAllMyData` is the `createServerFn` in `src/lib/charts.ts` (the 2026-09-11 audit cited this as `charts.ts:318`). It is scoped to `user_id = context.userId` across all four tables, behind `authMiddleware`. No bulk/destructive cross-tenant path found. No action needed.

---

### R4 — Shared mutable frame state · MEDIUM — **OPEN** (structural, not a bug)

`galaxyTravel` is still the single flight owner. It is mutated from multiple rAF loops and
gesture handlers, and the same module holds standalone `let` clocks (`autoClock`,
`enterSkipWatchdog`, …). `travel.ts` is 2,204 lines; **86** of those lines begin with `export`.
The file stays one file. That smaller public surface is not a timing guarantee.

Unit tests cannot see frame timing. Do not add a second way into a sign, and do not retune
ENTER / dwell / portal timing without a rendered before/after.

---

### R5 — Windows dev loop can't run the repo's own browser gate · LOW — **OPEN**

`scripts/browser-smoke.mjs` passes `["/workspace"]` into `checkedOutputPath`. `scripts/browser-guard.mjs` checks whatever directory list it is given. The `/workspace` prefix is that caller, so the smoke script can still exit 1 on Windows. The gate is the project's stated quality bar; on that machine it cannot run. The code is unchanged. The risk stays open.

---

### R6 — Test gate skipped the scripts suite · LOW — **CLOSED in [#147](https://github.com/technotrue-bit/trustyoursign/pull/147)**

The 2026-09-11 audit found `npm test` reporting **0 tests** on Windows, because a quoted glob
never expanded, so the scripts suite never ran in the default gate. The same audit also saw
branding tests still expecting the platform default title ("Hello World") while the project sets
"The Vault".

**Closed in #147.** CI runs the scripts suite and the app unit tests as one blocking step. The
glob is unquoted so the scripts stage actually runs. This is not an open class.

---

### R7 — Personal data was tracked in git · LOW — **CLOSED in [#151](https://github.com/technotrue-bit/trustyoursign/pull/151)**

`src/lib/chart/nativities/joey.ts` and `saige.ts` were real natal charts in git.
They are removed from the tracked tree. History was not rewritten. They load
from `research_nativity`, seeded from gitignored `seeds/private/`. See
`docs/security/research-nativities.md`.

---

## 6. Working on it

From the repo root. CI (`.github/workflows/ci.yml`) runs these four steps, in this order:

```bash
npm run typecheck
npm test
npm run build
```

Then it greps `.vercel/output/static/assets` for `AsyncLocalStorage`, `__vite-browser-external`, `pglite`, and `createRequire`. A hit fails the gate. That check is client assets only.

`npm run build` also runs migrations (`db:migrate` in `package.json`). A missing `DATABASE_URL` there is that migrate step. It is not a product bug.

App tests are listed by path in both `package.json` scripts `test` and `test:app`. The scripts glob stays unquoted (`scripts/**/*.test.mjs`). CI runs `npm test` and must not be switched to `npm run test:app`.

`npm run dev` is how you look at the site (`0.0.0.0:8080`). Do not call vite directly.

Still worth doing by hand, because CI does not:

- A real render, desktop and mobile. A 200 is not a render.
- For travel or 3D changes: a rendered before/after. Unit tests cannot see timing.

## 7. PRs

Opened from this audit:

- **#37 `fix(security): authorize the owner by immutable identity, not display name`** — fixes R1.

The September list that used to sit here as open is history. #34 and #32 closed unmerged. #31, #29, and #18 merged (2026-09-13).
