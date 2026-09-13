# Vibecode security checklist — 2026-09-06

**Product:** TrustYourSign / The Vault (`technotrue-bit/trustyoursign`)  
**Scope:** Security audit only — no feature work, no deploy, no public “live URL” claim.  
**Method:** Design-first probes (`rg`, migration review, auth/cookie review, `npm audit`). Reused existing scripts/docs (`scripts/check-auth-invariant.mjs`, auth skill wiring in `src/lib/auth/*`). Did **not** modify `public/signs/*.png` or plate pipeline. Did **not** commit `.env` secrets. Did **not** weaken auth.

---

## Blockers for a live URL

Honest list — **do not ship a public live URL** until these are resolved (or explicitly accepted as residual risk with compensating controls):

1. **Hardcoded owner password in source** — `OWNER_PASSWORD = "True"` in `src/lib/site.ts:7`. Email/password is **enabled** (`src/lib/auth/email-password.ts:10`). Login maps owner identifiers to `admin@thevault.app` (`src/routes/login.tsx:49–64`). Anyone who knows the public email/login aliases can authenticate as owner.
2. **Unauthenticated `primeOwner` resets/ensures that owner credential** — `src/lib/site.ts:42–45` has **no** auth middleware and **no** Vercel/preview gate. It calls `ensureOwnerAccount()`, which hashes and writes `OWNER_PASSWORD` into `"account"."password"` (`site.ts:9–33`). Called from login `beforeLoad` (`src/routes/login.tsx:10–12`) and `OwnerBind` (`src/components/OwnerBind.tsx:62`). On a deployed DB this keeps the weak owner password live.
3. **Committed preview OAuth client secret** — `PREVIEW_CLIENT_SECRET` in `src/lib/auth/preview.ts:20–21` (hex string; value redacted here). Present since `e3c7016`. Intended as preview-only fallback when `GROK_AUTH_CLIENT_SECRET` is unset (`server.ts:82`), but it is still a secret in the git tree/history.
4. **No Postgres row-level security** — `rg` over `migrations/` finds **zero** `ROW LEVEL SECURITY` / `CREATE POLICY` matches. Multi-tenant isolation is application-only (`user_id = ${context.userId}`). A leaked connection string or buggy query has no DB-level backstop.
5. **No login rate limiting / bot protection** — no `rateLimit` / captcha / Turnstile / hCaptcha hits under `src/` or `server/`. Email sign-in (`login.tsx`) and OAuth can be brute-forced / scripted without app-level throttling.

**Not claimed as clear:** dependency scan is clean today (`npm audit` → 0 vulnerabilities), but that alone does **not** clear items 1–5.

---

## Probe plan (executed)

| # | Item | How probed |
|---|------|------------|
| 1 | Hide API keys | `rg` for `XAI_API_KEY`, `sk-`, `AKIA`, `Bearer`, hardcoded passwords; confirm env-only usage |
| 2 | Purge secrets from Git | `git ls-files` for `.env*`; `git log -S` / `-G` for keys; `.gitignore` |
| 3 | Expose only public DB key | Search Neon/Supabase anon/`service_role`; confirm `DATABASE_URL` server-only |
| 4 | Enable RLS | `rg` migrations for `ROW LEVEL SECURITY` / `CREATE POLICY` |
| 5 | Encrypt sensitive data | `encryptOAuthTokens`; birth columns in `charts`; password hashing |
| 6 | Enforce server-side auth | Inventory `createServerFn` + `authMiddleware`; `requireUserId` fail-closed |
| 7 | Lock record access | Chart/ask/sky queries scoped by `context.userId`; owner asserts |
| 8 | Block field tampering | `.validator` / `normalizeChartWrite` / desk `parseDesk` |
| 9 | Secure session cookies | `__Host-`, `httpOnly`, `secure`, `sameSite` in auth server |
| 10 | Hash passwords | `better-auth/crypto` `hashPassword`; Better Auth email/password |
| 11 | Rate limit login | `rg` rateLimit/throttle |
| 12 | Bot protection | `rg` captcha/turnstile/recaptcha/hcaptcha |
| 13 | Parameterize queries | `src/lib/db.ts` tagged templates → `$1…`; sample call sites |
| 14 | Validate all input | Validators on server fns; gaps noted |
| 15 | Escape user content | React text nodes; `dangerouslySetInnerHTML` audit |
| 16 | Restrict file uploads | `rg` upload/multipart/write paths in app code |
| 17 | Trim API responses | `listCharts` shape; ask thread/note cleaners |
| 18 | Security headers | `rg` CSP/HSTS/X-Frame; `vercel.json` absence; middleware |
| 19 | Force HTTPS | Cookie `Secure`; Vercel TLS; app-level redirect search |
| 20 | Scan dependencies | `npm audit`; note lockfile / outdated |

---

## Checklist scores

| # | Item | Status | Evidence | Blocker for live URL? |
|---|------|--------|----------|------------------------|
| 1 | Hide API keys | **PARTIAL** | `XAI_API_KEY` read only from `process.env` in `src/lib/chart/ask.ts:52` and `desk.server.ts:86` — never hardcoded. **But** owner plaintext password at `src/lib/site.ts:7` and preview OAuth secret at `src/lib/auth/preview.ts:20–21`. No `VITE_` exposure of DB/API secrets found (`VITE_STUN_URLS` only in `src/lib/multiplayer/p2p.ts:85`). | **Yes** (owner password + committed preview secret) |
| 2 | Purge secrets from Git | **FAIL** | `.env` / `.env.*` gitignored (`.gitignore:6–7`). `git ls-files` → no tracked `.env`/credential files. **Still in tree/history:** `OWNER_PASSWORD` (`site.ts`, since `b0c7511`); `PREVIEW_CLIENT_SECRET` (`preview.ts`, since `e3c7016`). No private key / `AKIA` / `sk-` blobs found in history search. | **Yes** (secrets remain in git; rotation + history purge needed if ever treated as production secrets) |
| 3 | Expose only the public DB key | **PASS** | Architecture is server-side Neon/`pg` via `DATABASE_URL` (`src/lib/db.ts:8–19`, `88–99`). No Supabase `anon` / `service_role` client keys. Browser never receives a DB key. (Checklist wording assumes public anon key; here **no** client DB key is better.) | No |
| 4 | Enable row-level security | **FAIL** | `rg 'ROW LEVEL SECURITY\|CREATE POLICY' migrations/` → **0 matches**. Tables e.g. `charts` (`migrations/0002_charts.sql:2–15`) have `user_id` index only — no RLS. | **Yes** (defense-in-depth gap for multi-tenant PII) |
| 5 | Encrypt sensitive data | **PARTIAL** | OAuth tokens: `encryptOAuthTokens: true` (`src/lib/auth/server.ts:194`). Passwords hashed (item 10). **Birth PII / natal JSON stored plaintext** in `charts` (`migrations/0002_charts.sql`, `0005_birth_time.sql`, `0006_sky_natal.sql`; writes in `src/lib/charts.ts:176–209`). TLS in transit assumed on Vercel/Neon — not verified in-app. | Soft yes for privacy posture; hard if threat model requires at-rest PII encryption |
| 6 | Enforce server-side auth | **PARTIAL** | Standard path: `authMiddleware` → `assertSameSiteRequest` + `requireUserId` (`src/lib/auth/middleware.ts:28–46`; fail-closed when `DATABASE_URL` + auth off: `verify.server.ts:84–92`). Most chart/sky/research/ask fns use middleware. **Gaps:** `primeOwner` / `bindOwnerPreview` unauthenticated (`site.ts:42–72`); public compute helpers `computeSky` / `computeVisitorNatal` (`sky.ts:60–113`) intentional but abuseable; `emailAndPasswordEnabled = true` with weak owner seed. | **Yes** (`primeOwner` + weak owner) |
| 7 | Lock record access | **PARTIAL** | App-layer scoping: e.g. `listCharts` / `deleteChart` filter `user_id = ${context.userId}` (`charts.ts:226–227`, `253`); `saveChartTone` / `persistNatal` same (`sky.ts:141–157`). Owner desk: `assertOwner` (`desk.server.ts:66–75`) before `getAiDesk` / `saveAiDesk` / `grantSkyPass`. Research charts owner-gated (`research.ts:15–26`). **No RLS** backup (item 4). `grantSkyPass` accepts client `userId` but only after owner assert (`sky.ts:280–294`). | Soft yes (relies solely on app queries) |
| 8 | Block field tampering | **PARTIAL** | Strong: `normalizeChartWrite` bounds + consent (`charts.ts:120–160`); ask/sky question length caps; desk `parseDesk` clamps models/tokens (`desk.server.ts:37–50`). Weak: `persistNatal` validator returns raw input (`sky.ts:148–149`); `saveAiDesk` validator is identity (`sky.ts:269–270`) then re-parsed; client-supplied `userId` on `grantSkyPass` (owner-gated). Never trust client `userId` for auth — middleware uses session only. | Soft |
| 9 | Secure session cookies | **PASS** | Session cookie `__Host-grok-auth.session_token` (`server.ts:149`, `223–231`); `defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" }`; gate session emit uses `httpOnly: true`, `secure: true` (`gate-session.server.ts:71–75`). Marker cookie intentionally non-HttpOnly (`gate-session.server.ts:141–161`) — not the session token. Live-preview bearer in `sessionStorage`/`localStorage` (`OwnerBind.tsx:7–24`) is preview partition workaround, not the deployed cookie path. | No (for deployed cookie path) |
| 10 | Hash passwords | **PASS** | Better Auth email/password enabled; owner seed uses `hashPassword` from `better-auth/crypto` (`site.ts:11–12`, stored in `"account"."password"`). Schema column is hash storage (`migrations/0001_auth.sql:51`). **Hashing is correct; the plaintext seed password itself is the problem (item 1).** | No for algorithm; **Yes** for credential strength (see blockers) |
| 11 | Rate limit login | **FAIL** | `rg` for `rate.?limit|throttle` under `src/` `server/` → no matches. Login posts directly via `authClient.signIn.email` (`login.tsx:61–65`). | **Yes** |
| 12 | Add bot protection | **FAIL** | `rg` for `captcha|turnstile|recaptcha|hcaptcha|bot.?protect` → no matches. | **Yes** (esp. with public email/password) |
| 13 | Parameterize queries | **PASS** | `toSql` rebuilds `$1…$n` placeholders (`src/lib/db.ts:74–85`). Call sites use tagged templates, e.g. `charts.ts:253`, `sky.ts:120`. No string-concatenated SQL with user input found in app query paths. | No |
| 14 | Validate all input | **PARTIAL** | Many `.validator` hooks (charts, sky, ask, research). Gaps: `persistNatal` / `saveAiDesk` weak validators; `primeOwner` takes no input but has side effects; public birth compute validates ranges (`sky.ts` `birthInput`) but is unauthenticated. | Soft |
| 15 | Escape user content | **PASS** | UI renders user/AI text as React children (e.g. `AskPanel.tsx:425`, `Gloss.tsx:106–123`) — default escaping. Sole `dangerouslySetInnerHTML` is **static CSS** in `__root.tsx:48–52`, not user data. | No |
| 16 | Restrict file uploads | **N/A** | No user file-upload API found. `writeFileSync` only in build/QA scripts (`scripts/preview.mjs`, `browser-smoke.mjs`). Terms mention uploads (`terms.tsx:41`) as policy text only. | No |
| 17 | Trim API responses | **PARTIAL** | Ask payloads trimmed (`charts.ts:280–293`, slice/cap). `listCharts` returns full natal fields including `natal_json` (`charts.ts:222–229`) — appropriate for owner of row, but heavy; no accidental inclusion of other users’ rows observed. Desk/AI config only after owner assert. | Soft |
| 18 | Add security headers | **FAIL** | No `vercel.json` headers. No app middleware setting `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy` (`rg` over `src/` `server/` `vite.config.ts`). `server/middleware/grok-pwa.ts` only mutates PWA/OG HTML. **Note:** naive CSP would need to allow `https://grok.com` branding injector (AGENTS.md). | Soft yes (recommend headers in a follow-up; don’t break platform chrome) |
| 19 | Force HTTPS | **PARTIAL** | Cookies require `Secure` (`server.ts:225`). Deploy target is Vercel HTTPS. No in-repo HTTP→HTTPS redirect middleware. Local/dev HTTP loopback explicitly allowed (`server.ts:101–105`, `110–112`). Relies on platform TLS termination. | Soft (platform-dependent) |
| 20 | Scan dependencies | **PASS** | `npm audit` (2026-09-06): **0 vulnerabilities** (522 deps counted). Lockfile present (`package-lock.json`, lockfileVersion 3). `npm outdated` shows many packages “MISSING” in this sandbox install view / wanted bumps — lockfile is not freshly audited for currency, but advisory scan is clean. Re-run before every release. | No (today) |

---

## `npm audit` summary (proof)

```text
found 0 vulnerabilities
```

Metadata (from `npm audit --json`): info/low/moderate/high/critical all **0**; total packages **522** (prod 337 / dev 135 / optional 53).

---

## Key `rg` hits (redacted)

```text
src/lib/site.ts:7:const OWNER_PASSWORD = "True";
src/lib/auth/preview.ts:20:export const PREVIEW_CLIENT_SECRET =
src/lib/auth/preview.ts:21:  "<REDACTED 64-char hex>";
src/lib/chart/ask.ts:52:    const apiKey = process.env.XAI_API_KEY;
src/lib/chart/desk.server.ts:86:  const apiKey = process.env.XAI_API_KEY;
src/lib/auth/server.ts:194:    encryptOAuthTokens: true,
src/lib/auth/server.ts:225:    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
src/lib/db.ts:79-81:  # tagged-template → $1,$2,… parameterization
migrations/:  # ROW LEVEL SECURITY / CREATE POLICY → 0 matches
src|server:  # rateLimit|captcha|turnstile → 0 matches
src|server|vite:  # Content-Security-Policy|Strict-Transport-Security → 0 matches
.gitignore:6-7:  .env / .env.*
```

Git history (no secret values printed):

```text
git log -S 'OWNER_PASSWORD' → b0c7511 Replace TrustYourSign with the expand-mode Vault
git log -S 'PREVIEW_CLIENT_SECRET' → e3c7016 Export from Grok
git ls-files '*.env*' → (none)
```

---

## Optional hardening (not in this PR)

Document-first per audit brief. Safe one-liners considered and **deferred**:

| Candidate | Why deferred |
|-----------|----------------|
| Add CSP / HSTS via `vercel.json` | Easy to break Grok PWA injector (`https://grok.com/...`) and preview embeds; needs designed allowlist |
| Remove/gate `primeOwner` | Not one-line; must redesign owner bootstrap without weakening preview desk |
| Rotate `OWNER_PASSWORD` / preview secret | Requires env injection + broker rotation + history purge — separate change |

Follow-up PRs should tackle blockers 1–5 before any public live URL.

---

## Commands re-runnable

```bash
rg -n -i 'OWNER_PASSWORD|PREVIEW_CLIENT_SECRET|XAI_API_KEY|sk-|AKIA|BEGIN .*PRIVATE' src/ scripts/ migrations/
rg -n -i 'ROW LEVEL SECURITY|CREATE POLICY' migrations/
rg -n -i 'rate.?limit|captcha|turnstile|Content-Security-Policy|Strict-Transport' src/ server/ vite.config.ts
npm audit
git ls-files | rg -i '\.env|secret|credential|\.pem$'
```
