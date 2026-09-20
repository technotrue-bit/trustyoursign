# TrustYourSign — Architecture Map & Risk Register

**Repo:** `C:\Users\Devin\Projects\trustyoursign` · GitHub `technotrue-bit/trustyoursign` (private)
**Branch at time of audit:** `main` @ `05ac661` (PR #36 merged)
**App:** "The Vault" — a natal fly-through. Live: https://trustyoursign.com/
**Scale:** 260 tracked files · ~33,756 LOC (ts/tsx/mjs/js/sql/css) · 166 modules in `src/`

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

`src/lib/galaxy/travel.ts` (1,055 lines, 63 exports) is the flight engine and it is
**deliberately not React state**:

> `/** Shared mutable travel. Written every frame by the camera. Not React state. */`

- One module-level `galaxyTravel` object, mutated every frame; React reads it through
  `galaxy/store.ts` with epsilon guards (`Math.abs(prev.t - t) < 0.008`) to avoid render storms.
- Hand-tuned constants carry the feel: `ENTER_SEC 4.5`, `SPACING 50`, `AUTO_SIGN 7s`,
  `SELECTION_HOLD_MS 10_000`, `BIRTH_SECONDS 3.85`, `MAX_FLY 1.12`.
- Its own `rAF` + a wall-clock auto clock so the 7s walk keeps time while the canvas boots.
- `GalaxyIntro.tsx` is 1,121 lines — the largest component, and the one that owned the
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

**Evidence:**
- `src/lib/auth/email-password.ts:10` → `export const emailAndPasswordEnabled = true;` (public sign-up is ON)
- `src/routes/login.tsx:63` → sign-up sends `name: name.trim() || email.trim()` — **name is user-supplied**
- `src/lib/owner.ts:33-42` → `isSiteOwner()` compacts name+email and does a **substring** test:
  `c.includes("devinnorris") || c.includes("itsmetrueg")`
- `src/lib/owner.server.ts:12` → `assertSiteOwner()` — the **server-side** gate — uses that same match
  against the `user` row. It does **not** consult `site_state.owner_user_id`.

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

### R2 — Preview/owner bootstrap is open when env is incomplete · MEDIUM

`site.server.ts:72-76` → `previewDeskOpen()` returns `true` unless `VERCEL` is set **or**
(`GROK_AUTH_CLIENT_SECRET` **and** `DATABASE_URL`). If a production deploy is missing either
secret, `bindOwnerPreviewImpl()` would sign in as the owner using `OWNER_PASSWORD` and return a
live session token with no user interaction. Mitigated by `VERCEL` being set on Vercel — but it
is a single env var standing between an anonymous caller and an owner session.

**Fix direction:** require an explicit positive opt-in flag (e.g. `ALLOW_PREVIEW_OWNER_BIND=1`)
instead of inferring "preview" from absent env.

---

### R3 — `device` mutation surface: `deleteAllMyData` · LOW (verified correct)

`charts.ts:318` — scoped to `user_id = context.userId` across all four tables, behind
`authMiddleware`. No bulk/destructive cross-tenant path found. No action needed.

---

### R4 — Shared mutable frame state · MEDIUM (structural, not a bug)

`galaxyTravel` is mutated from multiple rAF loops and gesture handlers, and the same module
holds standalone `let` clocks (`autoClock`, `enterSkipWatchdog`, …). Regressions here show up as
feel/timing bugs that typecheck and unit tests cannot catch. Treat every travel-timing change as
needing a rendered before/after check.

---

### R5 — Windows dev loop can't run the repo's own browser gate · LOW

`scripts/browser-guard.mjs:37` hardcodes a POSIX `/workspace` prefix, so
`node scripts/browser-smoke.mjs <url> <out>` always exits 1 on Windows
(`screenshot path must be under /workspace, got C:\workspace\...`). The gate script is the
project's stated quality bar; on this machine it silently can't run.

**Fix direction:** allow a list of roots, or accept an env-provided root.

---

### R6 — 14 test failures in `scripts/*.test.mjs` · LOW (pre-existing)

`node --test 'scripts/**/*.test.mjs'` reports 195 tests / **14 fail**. Proven pre-existing:
identical failures on `origin/main` in a throwaway worktree. Cause is template-vs-project
branding — tests assert the platform default (`og:title` = "Hello World") while the project sets
"The Vault". Also note `npm test`'s first stage reports **0 tests** on Windows because the quoted
glob doesn't expand, so those 195 tests never run in the default gate.

**Fix direction:** update the branding assertions to the project's own values; un-quote/expand the
glob so the stage actually runs.

---

### R7 — Personal data is tracked in git · LOW (contained)

`src/lib/chart/nativities/joey.ts` (717 lines) and `saige.ts` are real natal charts, committed.
Repo is **private**, so this is contained — but it becomes a disclosure the moment the repo goes
public or a fork/snapshot leaves the org. R1 turns it into a live API exposure.

---

## 6. Working on it

```bash
cd C:/Users/Devin/Projects/trustyoursign
npm run dev          # 0.0.0.0:8080  (never call vite directly — env wrapper matters)
npm run typecheck    # pass, clean
npm run build        # nitro → .vercel/output, then db:migrate
npm test             # 70 + 76 tests pass; NOTE stage 1 silently runs 0 on Windows
```

Post-change verification that actually catches this app's failure modes:

1. `npm run typecheck` and `npm run build`
2. Client-bundle boundary check — grep `.vercel/output/static/assets` for
   `AsyncLocalStorage`, `__vite-browser-external`, `pglite`, `createRequire` → must be **0**
3. Real render, desktop **and** mobile — a 200 is not a render
4. For travel/3D changes: a rendered before/after, since unit tests can't see timing

## 7. PRs

Opened from this audit:

- **#37 `fix(security): authorize the owner by immutable identity, not display name`** — fixes R1.

Open at the time of the audit:

#34 station-stars-scroll · #32 galaxy-locked-look · #31 login-publication ·
#29 iphone-first-path-session · #18 security-vibecode-checklist
