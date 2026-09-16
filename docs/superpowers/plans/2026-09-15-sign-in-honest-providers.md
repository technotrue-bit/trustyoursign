# Sign-in surface: honest provider availability — plan (gauntlet cycle)

Orchestrator never writes production code. One core (the sign-in surface) — the login page, the
auth client's provider start, and the code/magic-link send path; all three share one interface, so
splitting them would guarantee drift.

## Phase 0 — freeze baselines (done, orchestrator)

- Measured on production: the Google tap trace (`sign-out` 200 → `sign-in/oauth2` **404** → no error
  shown), `sign-in/magic-link` **500**, `email-otp/send-verification-otp` **`{"success":true}`**,
  login HTML contains "Continue with Google" **and** "Continue with X", `/login` console clean.
- Spec + metric sheet: `docs/superpowers/specs/2026-09-15-sign-in-honest-providers-design.md`.

## Phase 1 — Build (builder subagent, round 1)

Owned files: `src/routes/login.tsx`, `src/lib/auth/client.ts`, `src/lib/auth/server.ts`,
`src/lib/auth/providers.ts`, `src/lib/auth/sign-in-link.ts`, `src/routes/api/auth/$.ts` (only if the
500 lives there), their tests, `package.json` (test list only).
Do-not-touch: `gate-session*.ts`, `isolation.server.ts`, `preview*.ts`, `popup.server.ts`,
`src/lib/galaxy/**`, `src/components/scene/**`, `scripts/qa/**`, `src/lib/chart/**`.

Self-check before reporting (never weaken a test):
1. `npm test` → only the pinned chart failure
2. `npm run typecheck` → clean
3. `npm run dev`, then against `127.0.0.1:8080`: login HTML must NOT offer Google/X when the broker
   is unconfigured (M1); a headless click on the sign-in surface must fire **no** `sign-out` (M3);
   `POST /api/auth/sign-in/magic-link` must not be 5xx (M4); the OTP send must still succeed (M5).
4. With the broker env present (or a test that forces the flag true), the buttons must still render
   and the flow still start (M2).

## Phase 2 — Critic (fresh subagent)

Context ONLY: spec + metric sheet + the artifact + the evidence (raw command output). Never the
builder's reasoning, history, or prior verdicts. Judges by re-running the probes itself, plus a scan
of the do-not-touch surfaces for collateral damage. PASS with an evidence table, or FAIL with
exactly ONE gap.

## Phase 3 — One-gap loop

FAIL → the single gap verbatim to a fresh builder of the same role. Hard cap 3 rounds; a third FAIL
escalates to Captain with the three gaps.

## Phase 4 — Integration gate (folded into the critic's contract, stated as a deviation)

`npm test` + `npm run typecheck` + `npm run build`; the gate/preview/popup auth paths untouched;
no new console errors anywhere in the flow; the diff confined to the owned list.

## Phase 5 — Verify & land (orchestrator)

Re-run every gate myself, commit with **explicit paths** (the worktree carries another agent's
uncommitted edits — never `git add -A`), push, open the PR, then verify on the deployed site:
login HTML (M1), click trace (M3), magic-link status (M4), OTP send (M5).

## Reproduction commands

```
npm run dev
curl -s http://127.0.0.1:8080/login | grep -c "Continue with Google"     # expect 0 after the fix
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'Content-Type: application/json' \
  -H 'Origin: http://127.0.0.1:8080' -d '{"email":"probe@example.com","callbackURL":"/account"}' \
  http://127.0.0.1:8080/api/auth/sign-in/magic-link                      # expect non-5xx
npm test ; npm run typecheck ; npm run build
```

Pitfalls from this repo: the dev server dies mid-session (check `curl` before trusting a probe); a
log redirected with `>` inside a background terminal call can vanish (use the session log);
`landed-probe.mjs`-style harnesses write their PNG before printing JSON, so a missing output
directory fails silently.