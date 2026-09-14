# TrustYourSign — pre-beta review

**Date:** 2026-09-14 · **Commit reviewed:** `99ef3d0` (plus the sign-in-link and deployment-origin fixes merged the same day)

**Scope:** the whole application — the code, its live HTTP/API behaviour, and readiness for closed beta.

## How this was produced

| Part | Method |
|---|---|
| 1 · Code review | A read-only sweep of the repository by a review subagent, covering auth and session handling, SQL, the code/link sign-in flow, the 3D sky modules, client robustness, config assumptions and loose ends. Every finding cites file:line. |
| 2 · Live testing | Adversarial probes against the production deployment: signed-out guards, forged and missing `Origin`, malformed and oversized input, rapid-fire requests, rate limits, 404s, response headers, and a secret scan of the shipped bundles. |
| 3 · Readiness | A judgement against closed-beta criteria, with blockers stated plainly. |

**Verification status.** Items marked *verified* were re-read directly by the reviewing agent (the owner-token guard, the `/account` fetch loop, the scope of *Delete my data*, and the silent-write sites); the rest carry the sweep's quoted evidence and line numbers but were not independently reproduced. Items that need a live probe to settle are flagged as such inside Part 1.

**Not covered.** Interactive browser testing — mashing buttons, tapping during load, double-tapping a code, back-button mid-flow, the mobile viewport — was not completed in this pass (blocked on a browser-debugging permission), so it remains an open gap in coverage rather than a clean bill of health.

---

## Part 1 — Code review (ranked findings)

## TrustYourSign — ranked bug & loose-end review

Read-only analysis of `C:\Users\Devin\Projects\trustyoursign` (HEAD `99ef3d0`). Every item cites file:line; "verify" steps are read-only or browser observations (no writes were performed).

---

### 1. Critical — An unauthenticated server function mints and returns a live **owner session token** to any visitor

**Evidence.** `src/lib/site.ts:4-7`

```ts
export const bindOwnerPreview = createServerFn({ method: "POST" }).handler(async () => {
  const { bindOwnerPreviewImpl } = await import("./site.server");
  return bindOwnerPreviewImpl();
});
```
— no `.middleware([authMiddleware])`, no same-site assert. The impl signs in as the owner with the server-side password and returns the raw session token:

`src/lib/site.server.ts:127-157`
```ts
function previewDeskOpen() {
  if (process.env.VERCEL) return false;
  if (process.env.GROK_AUTH_CLIENT_SECRET && process.env.DATABASE_URL) return false;
  return true;                                     // ← open by default
}
…
const result = await auth.api.signInEmail({ body: { email: SITE_OWNER.email, password, rememberMe: true } });
const token = row?.token ?? row?.session?.token ?? null;
return { token, owner: Boolean(token) };
```
It is called **on every page load for every signed-out visitor** — `src/routes/__root.tsx:62` renders `OwnerBind`, and `src/components/OwnerBind.tsx:60-71` does

```ts
void (async () => { … const next = await bindOwnerPreview().catch(() => ({ token: null })); if (!next.token) return;
  writeStore(next.token); … await claimSite().catch(() => {}); })();
```
`writeStore` (`OwnerBind.tsx:18-25`) persists the token to **sessionStorage *and* localStorage**, `src/lib/auth/client.ts:22-28` attaches it as `Authorization: Bearer …` to every better-auth call, and `src/lib/auth/middleware.ts:29-35` forwards it to every server function — so the browser is the owner for every authenticated surface (`/admin` data, `getAiDesk`, `grantSkyPass`, owner research charts).

**Why it matters.** On any host where `VERCEL` is unset and the `GROK_AUTH_CLIENT_SECRET` + `DATABASE_URL` pair isn't both present (the Grok-platform host, any self-host, a preview alias), a total stranger's browser silently becomes Devin Norris and can read/write the owner desk; the token survives a browser restart (localStorage). It is also documented as a known gap: `docs/security/vibecode-checklist-2026-09-06.md:59` — "**Gaps:** `primeOwner` / `bindOwnerPreview` unauthenticated (`site.ts:42–72`)". The token was only previously a credential *write*; it now returns a session.

**Verify.** On a non-Vercel deploy signed out, open DevTools → Network, load `/`, and look for the `bindOwnerPreview` server-function response containing `{"token":"…","owner":true}`; or read `localStorage["grok-auth.bearer-token"]`. Server-only check: `grep -n "previewDeskOpen" -A5 src/lib/site.server.ts`.

**Classification.** bug + risk-hygiene (dev convenience reachable in production).

---

### 2. Critical — The sign-in screen says "code sent" even when the provider rejected the message (failure swallowed inside the dependency)

**Evidence.** Delivery throws on failure — `src/lib/email/send.server.ts:121-126`:

```ts
if (!res.ok) {
  const detail = (await res.text().catch(() => "")).slice(0, 300);
  throw new Error(`Email provider rejected the message (${res.status}): ${detail}`);
}
```
That throw is handed to the emailOTP plugin (`src/lib/auth/server.ts:380-391`), and better-auth swallows it — `node_modules/better-auth/dist/context/create-context.mjs:214-223`:

```js
async runInBackgroundOrAwait(promise) { try { … else await promise; } catch (e) { logger.error("Failed to run background task:", e); } }
```
`…/plugins/email-otp/routes.mjs:107-110` then returns regardless:

```js
await ctx.context.runInBackgroundOrAwait(opts.sendVerificationOTP({ email, otp, type: ctx.body.type }, ctx));
return ctx.json({ success: true });
```
So `login.tsx:122-131` sees no error and asserts success:

```ts
const { error: err } = await authClient.emailOtp.sendVerificationOtp({ … });
if (err) throw new Error(err.message ?? "Could not send the code");
setCodeSentTo(email.trim()); setOtpStage("sent");   // UI: "6 digits, sent to <address>"
```
The availability probe is equally optimistic — `src/lib/auth/email-otp.ts:24-28` / `send.server.ts:66-80` return `true` whenever `RESEND_API_KEY` **and** `EMAIL_FROM` are non-empty, with the doc-comment "**True when the host can actually deliver mail**", while `EMAIL_FROM=onboarding@resend.dev` (known deployment config) makes Resend refuse every recipient except the owner.

**Why it matters.** A visitor types their email, is told the code is on its way, gets nothing, has no error, and concludes the site is broken — with zero server-side signal beyond a log line. The UI cannot distinguish "sent" from "provider said 403".

**Verify.** Sign in as any non-owner address on the deployment and press *Email me a code*: the panel advances to the code step while the email never arrives; the function logs show the swallowed `Failed to run background task: … Email provider rejected the message (403)`. Local: `grep -n "runInBackgroundOrAwait" -A8 node_modules/better-auth/dist/context/create-context.mjs`.

**Classification.** bug (silent failure).

---

### 3. High — `/account` and the library re-request `listCharts` in an unbounded render loop

**Evidence.** `src/routes/account.tsx:41-52`

```ts
const load = () => { listCharts().then(setCharts).catch(() => setCharts([])); };
useEffect(() => { if (!user) return; load(); void acceptLegal()…; if (isSiteOwner(user)) void claimSite()…; }, [user]);
```
`user` is a **fresh object on every render** — `src/lib/auth/use-current-user.ts:72-85` returns `{ id: user.id, displayName: …, … }` with no memoisation — and `load()` stores a freshly parsed array, so the state update re-renders, which re-creates `user`, which re-runs the effect: a fetch-per-frame loop that also re-runs `acceptLegal()` and `claimSite()`. Same pattern in `src/components/overlay/LibraryShell.tsx:101-111` (`listCharts().then(setRows)` with `}, [user]);`).

**Why it matters.** A visitor sitting on their profile page hammers the serverless function and Neon continuously (battery, data, invocation cost; on a free tier this can effectively self-DoS). It is invisible without DevTools.

**Verify.** Signed in, open `/account` with the Network panel filtered to `_serverFn` and watch `listCharts` requests continue to appear indefinitely (the same on `/?desk=library`). Code check: `grep -rn "}, \[user\]);" src` → `account.tsx:52`, `LibraryShell.tsx:111`.

**Classification.** bug.

---

### 4. High — Owner writes are governed by `app.is_owner`, which is only true for the canonical row — a Google/X-recognised owner cannot save the AI desk (silently) or grant a pass (loudly)

**Evidence.** The middleware computes owner-ness from one id — `src/lib/auth/middleware.ts:48-52`:

```ts
return AppRls.forUser(userId, () => next({ context: { userId } }), { isOwner: userId === OWNER_USER_ID });
```
but the owner is *also* recognized by allow-list (`src/lib/owner.server.ts:99-112`, "verified email" / `OWNER_ACCOUNTS`), and the RLS policies for the write path require owner/bypass — `migrations/0007_rls.sql`:

```sql
create policy site_state_write on site_state for all
  using (app_rls_bypass() or app_rls_is_owner()) with check (app_rls_bypass() or app_rls_is_owner());
```
Consequences for a federated owner (`userId !== "vault-owner-devin"`, `isOwner=false`):
* `bindOwner` — `owner.server.ts:62-69` — the `update site_state … where owner_user_id is null or = 'vault-owner-devin'` is filtered out → **0 rows, no error**: the binding is never recorded even though the code logs/assumes it is (`owner-access.md:53-59` claims "Once an identity is recognised it is recorded").
* `saveDesk` — `src/lib/chart/desk.server.ts:69-75` — `update site_state set ai_json=…` also updates 0 rows, yet `saveAiDesk` returns `next` and `src/routes/admin.tsx:204-206` renders **"Desk saved."**
* `grantSkyPass` — `src/lib/chart/sky.ts:366-370` — `insert into sky_pass (user_id = the *target* id) …` fails its `WITH CHECK` → a raised RLS error for the same caller.

**Why it matters.** The documented owner path in `README.md` ("Recognising other identities (federated sign-in)") produces an owner whose admin controls either lie or 500 — the AI desk silently reverts on reload and the "Grant a pass" button errors.

**Verify.** Read-only: `select app_rls_is_owner()` has no value outside a request, so verify by signing in as the Google identity and saving the desk, then reloading `/admin` — the values revert. Code: `grep -rn "isOwner" src/lib/auth/middleware.ts src/lib/owner.server.ts` and the policy text above.

**Classification.** bug (silent write failure). *Unverified live.*

---

### 5. High — "Delete my data" deletes the data but not the account, while the policy promises account closure/erasure

**Evidence.** `src/lib/charts.ts:318-328`

```ts
await sql`delete from charts where user_id = ${context.userId}`;
await sql`delete from chart_ask where user_id = ${context.userId}`;
await sql`delete from sky_pass where user_id = ${context.userId}`;
await sql`delete from legal_acceptances where user_id = ${context.userId}`;
```
No better-auth `user` / `session` / `account` row is touched (the `deleteAllMyData` control is the only delete-all in the UI — `account.tsx:152-170`, labelled "Delete my data" with `window.confirm`). The policy claims more: `src/routes/privacy.tsx:71-73` — "We keep account, chart, and Ask conversation data **until you delete it or close the account**. You may access, correct, export, or **erase your data**"; `privacy.tsx:57-59` — "If you believe we have, write to … and we will delete the data."

**Why it matters.** A visitor who exercises the delete control believes their account is gone; their email, name and password hash remain, the session keeps working, and they cannot re-register with the same address. That is both a product lie and a GDPR erasure gap.

**Verify.** Signed in, note your user id, press *Delete my data*, then (owner-side, read-only) `select id, email from "user" where id = '<id>'` — the row survives; `select count(*) from charts where user_id='<id>'` = 0.

**Classification.** loose end (half-wired privacy control) + compliance risk.

---

### 6. High — A live Neon connection string sits in the repo working tree and is **not** git-ignored

**Evidence.** Repo root contains `.tys-dburl` (147 bytes; shape `postgresql://neondb_owner:…@…`, value not reproduced here) plus QA scratch scripts that read `DATABASE_URL`:

```
$ git status --short
?? .tys-500.cjs  ?? .tys-dburl  ?? .tys-qa.cjs  ?? .tys-qa2.cjs  ?? .tys-qa3.cjs  ?? .tys-race.cjs  ?? .tys-race2.cjs  ?? .superpowers/
$ git check-ignore -q .tys-dburl && echo IGNORED || echo NOT-IGNORED
.tys-dburl NOT-IGNORED      (.tys-qa.cjs / .tys-race2.cjs / .tys-500.cjs / .superpowers: also NOT-IGNORED)
```
`.gitignore` has no pattern matching these (only `node_modules/`, `.vercel/`, `.env`, `.env.*`, `*.log`, `.project_id`, …).

**Why it matters.** One `git add -A && git commit` publishes the production database password to the repository (and its history); the scratch files are also shipped in any future `git archive`/clone.

**Verify.** `git check-ignore -q .tys-dburl; echo $?` (1 = not ignored) and `git status --short`.

**Classification.** risk-hygiene.

---

### 7. High — Chart tone / natal persistence report success when no row was written

**Evidence.** `src/lib/chart/sky.ts:185-196` — no `returning`, so a zero-row update is indistinguishable from a hit, and the handler returns the new tone regardless:

```ts
await sql`update charts set tone = ${data.tone}, … where id = ${data.chartId} and user_id = ${context.userId}`;
return { tone: data.tone };
```
Callers pass a **session-local id** as the row id — `src/components/overlay/DetailPanel.tsx:122,132`:

```ts
setTone("warm");
if (user && shelf.id) void saveChartTone({ data: { chartId: shelf.savedId ?? shelf.id, tone: "warm" } }).catch(() => {});
```
`shelf.id` is a `shelf-…` key for unsaved charts (see `src/lib/charts-saved.ts:11`, `^shelf-\d{6,}$`), which can never match a `charts.id` (uuid). `persistNatal` is the same shape — `sky.ts:199-217` returns `{ id: data.chartId }` with no `returning`, and `{ id: null }` when no chartId was supplied (a silent no-op called from `DetailPanel.tsx:151`).

**Why it matters.** A visitor toggles Vault/Warm or runs a deep cut, sees the panel change, and nothing was stored — the preference resets on the next visit with no error. Contrast `persistChart`, which does check (`charts.ts:191-192` `if (!row) throw new Error("Chart not found")`).

**Verify.** Signed in with an *unsaved* shelf chart open, toggle Warm, then reload the page and reopen the same natal — the tone has reverted; the DB row is unchanged (`select id, tone from charts where id = '<savedId>'`).

**Classification.** bug (silent no-op success).

---

### 8. High — Terms acceptance is auto-recorded for anyone who visits `/account`, and the write failure is swallowed

**Evidence.** `src/routes/account.tsx:50`

```ts
void acceptLegal().catch(() => undefined);
```
`acceptLegal` (`src/lib/charts.ts:330-341`) inserts into `legal_acceptances` with the current `TERMS_VERSION`/`PRIVACY_VERSION`. There is no acceptance control on `/account` (the checkboxes exist only on the login form — `login.tsx:468-499`), and Google/X sign-in never shows them at all (`login.tsx:188-197` posts straight to `signIn(providerId, { callbackURL: "/account" })`).

**Why it matters.** The only "record of consent" the site keeps is written on every profile visit for visitors who never agreed — legally worthless, and actively misleading if it is ever relied on. The failure path (`catch(() => undefined)`) means a DB hiccup silently leaves no record while the admin page still shows "Terms 2026-09-02" as if acceptance tracking worked.

**Verify.** Signed in as any visitor, open `/account`, then read `select * from legal_acceptances where user_id = '<id>'` — a row exists you never consented to in-app.

**Classification.** bug + risk-hygiene.

---

### 9. Medium — Ask failures are converted into a fake "answer from the bones", and the error slot is never populated

**Evidence.** `src/components/overlay/AskPanel.tsx:56` declares `const [error, setError] = useState<string | null>(null)`; the only writes anywhere in the file are `setError(null)` (lines 141, 180, 252, 278). Every failure path fabricates content — lines 253-278:

```ts
} catch {
  const text = nat ? answerFromBones(nat, q, about?.focus) : skyN ? answerFromSky(skyN, …) : …;
  const done: ThreadTurn[] = [...nextThread, { role: "vault", text }];
  setThread(done); persist(done, notesRef.current); setError(null);   // ← "no error"
```
The server side cooperates: `src/lib/chart/sky.ts:329` returns `{ ok: true as const, … }` unconditionally, and `desk.server.ts:114-121` maps every upstream failure (non-200, empty content, timeout) to the same generic string.

**Why it matters.** An expired session, a rate limit, or an xAI outage is indistinguishable from a normal reading; the visitor pays for a "machine" answer that is a canned fallback, and support has nothing to look at. The `role="alert"` paragraph at `AskPanel.tsx:378` is dead UI.

**Verify.** Signed in, open Ask, revoke the session cookie (or block `api.x.ai` in DevTools), ask a question — an answer still appears, no error is shown, and no red text ever renders.

**Classification.** loose end (dead error state) + silent failure.

---

### 10. Medium — Unguarded async click handlers silently do nothing on failure

**Evidence.** `src/routes/account.tsx:204-223`:

```tsx
onClick={async () => { await openSavedChart(chart, "library"); void navigate({ to: "/" }); }}   // "Open"
onClick={async () => { await deleteChart({ data: chart.id }); onGone(); }}                       // "Remove"
```
`src/components/overlay/LibraryShell.tsx:142-144`: `onClick={async () => { await openSavedChart(c, "library"); }}`. None has a `try/catch`, a busy flag, or a `disabled` state; `openSavedChart` can throw (it only guards the compute call — `src/lib/chart/session/open-saved.ts:39-71`) and `deleteChart` rejects with `UnauthorizedError` once the session has gone.

**Why it matters.** On a phone waking from the app switcher (the codebase's own documented failure mode) a failed delete leaves the row on screen with no message and an unhandled promise rejection in the console; "Open" appears dead. Compare the correctly guarded siblings: `BirthChat.tsx:467-496` and `DetailPanel.tsx:144-157`.

**Verify.** Open `/account`, DevTools → block the `_serverFn` requests, press *Remove* — nothing changes, no message; the console shows an unhandled rejection.

**Classification.** bug (client robustness).

---

### 11. Medium — The login page advertises sign-in methods the server may not be able to serve, and only the mail path is probed

**Evidence.** Buttons render from a build-time flag — `src/routes/login.tsx:287-310` gated by `authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false"` (`src/lib/auth/client.ts:38`), while the server decides availability from runtime env — `src/lib/auth/server.ts:113-117`:

```ts
const grokClientSecret = env("GROK_AUTH_CLIENT_SECRET") ?? PreviewOAuthSecret.read();
export const authConfigured = !authDisabled && Boolean(grokClientId && grokClientSecret);
```
There is a server probe for mail (`emailOtpAvailable`, `email-otp.ts:25-28`) but **none** for federated sign-in. With `VITE_AUTH_ENABLED` unset/"true" and no broker secret, `authConfigured` is false, yet "Continue with Google"/"Continue with X" still render and `social()` (`login.tsx:188-197`) can only fail.

**Why it matters.** A visitor on a mis-provisioned host sees a full sign-in UI, clicks, and gets a generic failure — the app's own comment elsewhere says "never a button that cannot finish" (`login.tsx:311-314`), which is exactly what this is.

**Verify.** In a build with `GROK_AUTH_CLIENT_SECRET`/`GROK_PREVIEW_CLIENT_SECRET` unset, load `/login` and click Google: the POST to `/api/auth/sign-in/oauth2` returns an error though the button was offered.

**Classification.** loose end (asymmetric availability probing).

---

### 12. Medium — The code-email link relay holds a single slot, so concurrent code sends produce duplicate emails and sometimes no link

**Evidence.** `src/lib/auth/sign-in-link.ts:30-55` — one `pending` entry for the whole process:

```ts
absorb(email, claim) { pending = { email: key(email), claim }; },
offer(email, url) { if (!pending || pending.email !== key(email) || !url) return false; … }
```
`createSignInLink` (`server.ts:243-263`) absorbs before minting, and the magic-link plugin falls back to a standalone email when `offer` returns false (`server.ts:367-372`). If visitor A absorbs, then visitor B absorbs before A's link is minted, A's `offer` misses → A receives the code email **and** a second "Your Vault sign-in link" email, while a third concurrent sender can end up with a code email that carries no link.

**Why it matters.** Confusing duplicate mail from a sign-in flow undermines trust ("did someone try to log in as me?"), and the niest feature the email advertises intermittently disappears. Delivery is never mis-routed (the key check is per-address), so this is correctness-of-experience, not a leak.

**Verify.** Two browsers, same instance: request a code for A and immediately for B; A's inbox receives two messages.

**Classification.** bug (minor, race-dependent). *Unverified live.*

---

### 13. Medium — An internal "mesh review" stage is reachable by any visitor and is linked from the public UI

**Evidence.** `src/components/overlay/GalaxyShell.tsx:123-132` renders, for every visitor who reaches Sagittarius:

```tsx
{sign.id === "sagittarius" ? (<p className="mt-3">
  <a href="/?mesh=sagittarius" …>Review 3D mesh</a>
```
and `MeshReviewShell.tsx:14-56` is a raw dev harness whose own copy reads "judge real volume **before enabling the other eleven**", reachable by URL (`resolveGate`/`VaultApp.tsx:162` bypasses the app shell for `?mesh=`).

**Why it matters.** A public visitor can wander into an unfinished internal tool and see that 11 of 12 signs are not finished; it also bypasses the intro/session machinery entirely (`VaultApp.tsx:162` returns before any session gate).

**Verify.** Visit `https://<host>/?mesh=sagittarius` (or `?mesh=1`) signed out. Code: `grep -rn "mesh=sagittarius" src`.

**Classification.** loose end (dev surface shipped in production).

---

### 14. Medium — Chart creation is duplicate-prone, and the `/account` form can never produce a timed natal

**Evidence.** `src/components/overlay/BirthChat.tsx:471-490` always inserts a **new** row (no `id`), so pressing "Keep this chart" twice (or from two tabs) creates identical rows; `src/routes/account.tsx:229-278`'s `AddChart` submits only `birthMonth/birthDay/birthYear` (`account.tsx:256-267`) — no hour, minute or place — while the natal room requires them (`charts.ts:254-255` `hasCoords = birth_hour != null && birth_minute != null && birth_place`; `charts.ts:140-146` only stores the time when both are present). The list is then rendered with no grouping (`account.tsx:64-65,119-144`).

**Why it matters.** A visitor's vault fills with identical "My chart" rows they must delete one by one (`account.tsx:217-220`), and every chart added in the account form is permanently a sun-sign shelf — the UI never says so.

**Verify.** Add "My chart" twice in `/account`; both rows appear. Then look for any time/place input in that form — there is none.

**Classification.** loose end (half-wired feature) + bug (duplicates).

---

### 15. Medium — `persistNatal` / `sitWithTheSky` write unvalidated payloads straight into `jsonb`; `birthInput` accepts a future year

**Evidence.** `src/lib/chart/sky.ts:200` — `.validator((input: { chartId?: string; natal: SkyNatal }) => input)` passes the client object through untouched, then `sky.ts:211` writes `${JSON.stringify(natal)}::jsonb`; `sitWithTheSky` (`sky.ts:242`) likewise forwards `input.natal`, and its prompt interpolates `data.natal.place`/`.when` verbatim (`sky.ts:260-262`). `birthInput` (`sky.ts:57`) validates only a lower bound:

```ts
if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1926) throw new Error("That date cannot be read.");
```
whereas the sibling `normalizeChartWrite` (`charts.ts:135`) rejects `year > new Date().getFullYear()`.

**Why it matters.** An authenticated visitor can store an arbitrarily large/shaped blob in their own row (quota/parse risks on read — `charts.ts:85` casts it to `SkyNatal` and the UI maps `.bodies`), and a future birth date computes a "chart" that the save path then refuses — an inconsistency a visitor experiences as "the sky worked but saving says the date cannot be stored".

**Verify.** Signed in, call `persistNatal` from the console with `natal: {junk:true}` and re-load the chart — the row carries the junk. For the date: enter a birth year in the future in the sky flow, then try to save it.

**Classification.** bug + risk-hygiene (input validation).

---

### 16. Medium/Low — Federated sign-in can leave the login form permanently disabled with no message

**Evidence.** `src/components/overlay/client.tsx:146-152`:

```ts
const { data, error } = await authClient.signIn.oauth2({ providerId, callbackURL, errorCallbackURL });
if (error) throw new Error(error.message ?? "Sign-in failed");
if (data?.url) window.location.href = data.url;      // ← neither error nor url: function just resolves
```
Caller `src/routes/login.tsx:188-197` only re-enables on throw:

```ts
const social = async (id: string) => { setError(null); setBusy(true); try { await signIn(id, …); } catch (e) { setError(…); setBusy(false); } };
```
So the resolve-without-redirect branch leaves `busy === true` forever: every provider button, the code button and the submit button are `disabled`, with nothing on screen explaining it.

**Verify.** Stub the oauth2 response (DevTools request blocking / proxy) so it returns `{data:{}}`; the page locks up. Code: read `client.ts:146-152`.

**Classification.** bug (client robustness / stale state).

---

### 17. Low — Two template subsystems ship in the tree completely unreferenced (dead code)

**Evidence.** `grep -rn "app-data\|callTool\|ConnectorType\|multiplayer\|p2p" src/ scripts/` (excluding the modules themselves) → **no results**. That is 10 files under `src/lib/app-data/**` (connector gateway: `callTool`, failure memo, `GROK_CONNECTOR_ACCESS_TOKEN` env read at `app-data/client.server.ts:68-71`) and `src/lib/multiplayer/{index,p2p}.ts` (WebRTC scaffolding reading `VITE_STUN_URLS`, `p2p.ts:85`) — none of it reachable from any route.

**Why it matters.** Dead server code is still attack surface and maintenance load (it was audited in `docs/security/vibecode-checklist-2026-09-06.md:59` as a gap); it also inflates the "is this app finished?" question for any new contributor.

**Verify.** `grep -rn "callTool\|from \"@/lib/multiplayer" src | grep -v "^src/lib/app-data\|^src/lib/multiplayer"` → empty.

**Classification.** loose end (dead code).

---

### 18. Low — The `?create=1` deep link is wired but nothing links to it

**Evidence.** `src/routes/login.tsx:28-35` parses `create` and `login.tsx:52-53` seeds the tab (`useState<"in"|"up">(create ? "up" : "in")`), but every in-app entry point links to bare `/login` — `AccountMenu.tsx:52`, `LibraryShell.tsx:115`, `BirthChat.tsx:504`, `SignGalaxyHud.tsx:168`, `privacy.tsx:92`, `terms.tsx:70`. Nothing produces `?create=1`, and because the value is read only for the initial state, a client-side navigation that adds the param would not switch tabs.

**Why it matters.** The feature exists (commit `0fafaa7` "restore the ?create=1 deep link") but no visitor can reach it; the intended flow — "send a friend straight to Create account" — cannot be tested or used without hand-editing the URL.

**Verify.** `grep -rn "create=1" src` → only the parser. Visit `/login?create=1` manually: it does open the Create tab.

**Classification.** loose end (half-wired).

---

### 19. Low — The debounced Ask save is dropped when the panel closes

**Evidence.** `src/components/overlay/AskPanel.tsx:110-127`:

```ts
saveAskTimer.current = setTimeout(() => { void saveAsk({ data: { chartKey: askId, thread: nextThread, notes: nextNotes } })… }, 400);
…
useEffect(() => { return () => { if (saveAskTimer.current) clearTimeout(saveAskTimer.current); }; }, []);
```
The cleanup cancels without flushing, so a question asked within 400 ms of closing the panel (or of mode-switching away) never reaches `chart_ask`; it survives only in the local copy until the next load reconciles (`AskPanel.tsx:145-160` uploads local-only content, so it can recover — but only if the local copy is present on the same device).

**Why it matters.** "Signed in, it lives on this chart in your account" (`AskPanel.tsx:420-422`) is untrue for the last turn in that window; on a second device the tail of the conversation is missing.

**Verify.** Signed in, ask a question, immediately hit Escape, reload `/account` → open the chart → compare with `select thread_json from chart_ask where user_id='<id>' and chart_key='<key>'`.

**Classification.** bug (minor data loss).

---

### 20. Low — The AI-desk cache is per-instance, so a saved desk can stay stale

**Evidence.** `src/lib/chart/desk.server.ts:53-58,69-75`:

```ts
const DESK_TTL_MS = 30_000;
let deskCache: { desk: AiDesk; expiresAt: number } | null = null;
…
export async function saveDesk(desk: AiDesk) { clearDeskCache(); … }
```
`clearDeskCache()` only affects the instance that handled the save; on Vercel the other warm instances keep serving the previous prompt/model/token budget for up to 30 s.

**Why it matters.** The owner presses "Rest the machine" (`kill: true`) or lowers tokens, gets "Desk saved.", and visitor requests routed to another instance keep the old behaviour — cost and content diverge for half a minute with no indication.

**Verify.** Code read (above); live: two rapid requests across instances after a save. **Classification.** bug (low impact).

---

### 21. Low — Schema/loose ends: superseded and never-updated columns

**Evidence.** `migrations/0006_sky_natal.sql` adds `charts.last_deep_at` and `charts.entitlement`, but the code reads/writes those only on `sky_pass` (`sky.ts:161-172`, `sky.ts:247-270`, `sky.ts:366-370`) — the `charts` copies are never used. `charts.consent_at` is written with `now()` at insert (`charts.ts:197-213`) and never refreshed, so re-saving a chart cannot re-record consent even though `normalizeChartWrite` demands it (`charts.ts:126`). `updated_at` is set by hand in three places (`charts.ts:193`, `sky.ts:193`, `sky.ts:211`) with no trigger, and the `charts` upsert path never touches it (`charts.ts:173-190`).

**Why it matters.** Nobody can tell from the schema what is authoritative; a future change that "fixes" `charts.entitlement` would silently do nothing.

**Verify.** `grep -rn "last_deep_at\|entitlement" src | grep -v sky_pass` and `cat migrations/0006_sky_natal.sql`. **Classification.** loose end (dead schema).

---

### 22. Low — The owner runbook contradicts the current baseURL logic about which host is trusted

**Evidence.** `docs/security/owner-access.md:12-28` states that on the production URL "**every credentialed POST to the `vercel.app` host is refused with `INVALID_ORIGIN`** … no email/password combination can work there", based on `trustedOrigins = [BETTER_AUTH_URL, localhost…]`. Since the baseURL fix, the origin is derived from the platform when the variable is missing — `src/lib/auth/server.ts:135-142,169-180`:

```ts
const explicitBaseURL = env("BETTER_AUTH_URL") ?? platformOrigin();   // VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL
const trustedOrigins: string[] = [ …(explicitBaseURL ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS] : [ …previewAllowedHosts … ]) ];
```
So which host accepts credentialed POSTs (and which host mailed links point at) now depends on whether `BETTER_AUTH_URL` is still set to the `grok.me` URL — the runbook may send the operator to the wrong host or hide a real misconfiguration.

**Why it matters.** An operator following the doc can misdiagnose a working/working-nowhere login, and a stale `BETTER_AUTH_URL` silently pins every mailed link to the other domain.

**Verify.** Read `docs/security/owner-access.md:12-28` against `src/lib/auth/server.ts:135-180`; then compare the `redirect_uri`/link host in a real sign-in email with the host you are browsing. **Classification.** loose end (stale doc).

---

### 23. Low — The one per-frame allocation in the 3D code

**Evidence.** `src/components/scene/MeshReviewCanvas.tsx:74-92` — inside `useFrame`:

```ts
const dir = new Vector3();
camera.getWorldDirection(dir);
const nextPos = camera.position.clone().addScaledVector(dir, amount);
```

The rest of the sky/galaxy modules are disciplined (module-scope scratch vectors in `ChartCanvas.tsx:33-34`, `CelestialSky.tsx:64-106`; `useMemo` + explicit `dispose()` in `CelestialSky.tsx:42-62`, `GalaxyIntro.tsx:387-393,432-439`, `SignGalaxyField.tsx:40-45`; rAF loops cancelled in `VaultApp.tsx:78-82`, `FallbackSky.tsx:721-727`, `travel.ts:1183-1194`).

**Why it matters.** Only reaches the dev mesh-review stage (see #13); it is a per-frame garbage-churn habit that should not be copied.

**Verify.** `grep -n "new Vector3" src/components/scene/*.tsx`. **Classification.** risk-hygiene.

---

### 24. Low — `grantSkyPass` accepts any string as a user id, and the admin form validates nothing

**Evidence.** `src/lib/chart/sky.ts:356-359`:

```ts
.validator((input: { userId: string; entitlement: string }) => ({ userId: input.userId.trim().slice(0, 80), entitlement: … }))
```
paired with `src/routes/admin.tsx:304-309` (`placeholder="user id"`) and no existence check anywhere before the insert (`sky.ts:366-370`). Owner-only, so the blast radius is one operator's typo (an entitlement row for a non-existent id), but the success message "Pass granted." is unconditional.

**Verify.** As owner, grant to `nope` → "Pass granted." and a row appears: `select * from sky_pass where user_id='nope'`. **Classification.** loose end (missing guard/feedback).

---

### Surfaces I checked and found clean

* **SQL parameterisation.** Every app query goes through the tagged template in `src/lib/db.server.ts:104-117` (`toSql` rewrites to `$1…$n`); the only `.query()` call sites with text+params outside `db.server` are the Kysely PGlite dialect (`src/lib/auth/pglite-dialect.ts:112,131`), which passes `compiledQuery.parameters`. No string interpolation into SQL anywhere (`grep 'sql`[^`]*\${\s*"' src` → no hits).
* **Cross-visitor write scoping.** Every chart/ask write is bound to the verified id: `charts.ts:187,230,285,314,323-326`, `charts.ts:397-402` (`on conflict (user_id, chart_key)`), `sky.ts:194,212,248`, and the DB enforces it with `force row level security` policies on `charts`, `chart_ask`, `legal_acceptances`, `sky_pass`, `site_state` (`migrations/0007_rls.sql`). No query trusts a client-supplied owner id.
* **Middleware coverage.** All per-visitor server functions carry `authMiddleware` (`charts.ts:222,276,297,310,319,331,362,389`; `ask.ts:46`; `research.ts:14,23`; `sky.ts:157,180,201,243,296,333,346,360`; `site.ts:10`), and owner-only handlers re-assert server-side (`sky.ts:336,349,363`; `research.ts:17,26`; `desk.server.ts:78`). The three without it touch no per-user data: `computeVisitorNatal` (pure compute + public open-meteo geocode, `sky.ts:113`), `emailOtpAvailable` (config probe), `bindOwnerPreview` (issue #1).
* **Owner authorization logic.** `isSiteOwnerIdentity` (`owner.ts:91-117`) uses immutable ids only; the display-name path is opt-in (`OWNER_NAME_CLAIM=1`), one-time, and logged (`owner.server.ts:114-127`); `/admin` and `/account` never trust the client's `isSiteOwner` for data (every admin function re-asserts).
* **Session guards.** `/account`, `/admin`, `AccountMenu`, `OwnerBind` all distinguish "no session" from "read failed" (`session-guard.ts:22-27`) and offer a retry; the "signed-in visitor carried off /login" path now exists (`login.tsx:253-273`).
* **OTP/link state machine.** Digit normalisation, completeness gate, resend cooldown, address-change invalidation, single-flight `pending` guard (`login.tsx:140-186`, `395-404`; `otp-code.ts:17-24`), and the code/link relay's per-address keying (`sign-in-link.ts:28-54`) are coherent; the only defect is the cross-talk in #12.
* **3D resource hygiene.** Explicit `dispose()` for every texture/geometry/material built with `useMemo` in the scene components; context-loss is handled and buried (`ChartCanvas.tsx:257-280`, `gpu.ts:119-133`); rAF/timers cancelled on unmount; no unbounded `for`/`while` loops found in `src/lib/galaxy/**` (24 files reviewed at the loop/`useFrame` level).

### Not verified / could not reach

* **No live or DB execution** (read-only constraint): items #4 (RLS-vs-owner), #5 (account rows surviving delete), #7 (zero-row updates), #12 (relay cross-talk), #19 (dropped save) are code-derived and marked where the runtime effect needs a probe.
* **RLS enforcement itself** depends on the connecting Neon role's privileges (`BYPASSRLS`/superuser would defeat `force row level security`); not checkable offline. App-layer `where user_id = …` scoping is present regardless.
* **Deployed env** (`OWNER_PASSWORD` set? `GROK_AUTH_CLIENT_SECRET` present on the Grok host? `VITE_AUTH_ENABLED` value? `BETTER_AUTH_URL` still grok.me?) — unknown, which is what decides whether #1 is live-exploitable and whether #11 is reachable.
* `?create=1` end-to-end and the "signed-in visitor carried off /login" behaviour were left to the concurrent browser agent (per brief).
* `src/lib/chart/session/**`, `src/lib/galaxy/{travel,intro,constellations}.ts` and the 12 sign-art PNGs were surveyed for the specific defect classes (loops, disposal, identity) rather than line-by-line.

---

## Part 2 — Live testing against production (2026-09-14)

### What holds up

| Check | Result |
|---|---|
| Signed-out `/account`, `/admin` | `200` shell only — no personal data in the served HTML |
| Invalid session cookie on guarded pages and `get-session` | `200`, no crash, no data, no 500 |
| Credentialed POST with a forged `Origin` | `403 INVALID_ORIGIN` |
| Malformed input (bad address, wrong types, empty body) | `400` with specific, useful messages |
| Rate limits | 3 code sends/min and 5 verifies/min per IP, `429` with a clear message |
| Unknown routes and GET on POST-only endpoints | `404` |
| Secrets in the shipped client bundles | None found (18 files scanned; the `BETTER_AUTH_SECRET` hit is better-auth's env-*name* accessor, not a value) |
| Session durability across serverless instances | 6/6 requests signed in with only the durable cookie |
| Sign-in link end to end | Tap → `302` to `/account`, session issued, token single-use |
| HSTS | `max-age=63072000; includeSubDomains; preload` |

### What it gets wrong

| # | Finding | Evidence | Severity |
|---|---|---|---|
| L1 | **Under a burst the API hangs instead of erroring.** After rapid requests the same IP received `429`s, then ~25-second non-responses, then recovered (`200` in 257–316 ms). A visitor who taps too fast sees an endless spinner with no message. | burst probes: `429,429,429,429,429,429` → later single sends timing out at 25 s → later `200` | High |
| L2 | **No `Content-Security-Policy`, `X-Frame-Options` or `Referrer-Policy`** on any response; only HSTS is set. The sign-in page and the owner desk can be framed. | header dump of `/login` | Medium |
| L3 | **`robots.txt` and `sitemap.xml` are 404** — nothing tells crawlers to stay out while the product is still private. | `GET /robots.txt → 404`, `GET /sitemap.xml → 404` | Medium (beta hygiene) |
| L4 | Requests with **no `Origin` header are accepted** (forged origins are correctly rejected). | `send-code (no origin) → 200` vs `(forged) → 403` | Low |
| L5 | **Mail delivery failure is reported as success** — see Part 1 item 2; confirmed live: a code request to a non-owner address answers `{"success":true}` while the provider refuses delivery. | production probes | Critical (with Part 1 item 2) |

---

## Part 3 — Is it ready for closed beta?

**No — not yet.** The code is in better shape than the symptoms suggested (parameterised SQL throughout, complete middleware coverage on data paths, forced RLS, disciplined 3D resource handling), but four things stand between this and a beta you can hand to people.

### Blockers

1. **Mail only reaches the owner.** `EMAIL_FROM=onboarding@resend.dev` keeps Resend in sandbox: every recipient except the owner is refused, the code path still says "sent", and the link path returns `500`. Until a domain is verified and `EMAIL_FROM` moves onto it, **no tester can sign in** and the most visible failure in the product is the one nobody can work around.
2. **`/account` fetches in a loop** (Part 1 item 3). Every visitor parked on their profile page hammers the serverless function and the database continuously — a cost, battery and stability problem that scales with the number of testers.
3. **An unauthenticated function can mint an owner session** (Part 1 item 1). Inert on Vercel because it keys off a platform env var; a live owner-bypass on any other host. Platform-provided environment variables are the wrong thing for a security decision to depend on.

### Before inviting anyone

- A `robots.txt` that disallows everything while the beta is private.
- A way to **close an account** (Part 1 item 5) — the privacy policy implies erasure and testers will ask.
- Surface delivery failures in the UI instead of asserting success (Part 1 item 2 / L5).
- Decide what "signed out but owner-recognised" should mean, since federated owners currently get silent no-op writes (Part 1 item 4).
- Complete the interactive pass: button mashing, tapping during load, double-tap races, mobile viewport, back-button mid-flow.

### Exit criteria for calling the beta ready

1. A code and a link both arrive at an address that is not the owner's, verified from the inbox.
2. `/account` issues exactly one `listCharts` request per page view (Network panel).
3. No request can mint an owner session on any deployment; the guard is an explicit setting, not a platform variable.
4. A tester can delete their account and re-register with the same address.
5. Adversarial interaction pass completed with no unhandled rejections or stuck spinners.
