# Owner access — operator runbook

How to get into the owner desk, and what to do when you can't. The reference
description of the authorization model lives in the README ("Owner
authorization"); this file is the *operational* side: deploy order, the log
lines, and the recovery levers.

---

## Where to sign in

**`https://trustyoursigns.grok.me`** — not the `vercel.app` URL.

Better Auth validates the request `Origin` against `trustedOrigins`, which is
derived from `BETTER_AUTH_URL`. When that is set, the list is only
`[BETTER_AUTH_URL, localhost:8080, 127.0.0.1:8080]`, so **every credentialed
POST to the `vercel.app` host is refused with `INVALID_ORIGIN` before the
credentials are even read** — no email/password combination can work there.
You can tell the two apart without an account:

| Response | Meaning |
|---|---|
| `INVALID_ORIGIN` | wrong host — use `grok.me` |
| `INVALID_EMAIL_OR_PASSWORD` | origin fine; the credentials were actually checked |

To make the `vercel.app` host usable as well, add its origins to
`trustedOrigins` in `src/lib/auth/server.ts` while leaving `BETTER_AUTH_URL` as
the canonical origin (so OAuth redirects don't move).

## Signing in

`OWNER_PASSWORD` plus **either** of:

- the owner address in `SITE_OWNER.email` (`src/lib/owner.ts`, currently
  `technotrue@icloud.com`), or
- the identifier `ADMIN` — an alias for the same account.

Both resolve to the canonical `vault-owner-devin` row, which is authorized
unconditionally. **No allow list is needed for this path.** Use the *Sign in*
tab, never *Create account*: the owner row already exists, so signing up would
just fail on the duplicate email.

`OWNER_EMAILS` / `OWNER_ACCOUNTS` are for *federated* sign-in (Google/X), not
for the password path above. Email/password sign-up leaves `emailVerified`
false, and an unverified allowlisted address does **not** open the desk —
sign-up is open, so a matching address alone would let someone register it
first. An email code to that address does verify it. A linked Google or gate
account on that address counts as mailbox proof even if the stored flag was
left false. X does not. A display name never does.

If another account already holds the owner address, signing in with the owner
password still opens the canonical owner row. Signing in with some other
password on the squatting account stays unbound.

---

## Deploy checklist

1. **Is the owner address already held by another account?**
   ```sql
   select "id", "email", "createdAt" from "user"
   where lower("email") = lower('<SITE_OWNER.email>');
   ```
   Empty, or `vault-owner-devin` → clear. Any other id → see *Recovery* below.
   Do **not** test this with "Create account" on the live site: if the address
   is free, that creates a normal account holding it and blocks the rename.

2. **`OWNER_PASSWORD` set for Production *and* Preview.** Preview does not
   inherit it. The value must not be the legacy `True` — that is rejected as
   compromised and treated as unset.

3. **Deploy**, then read the function logs (§ below).

4. **Sign in** at the `grok.me` URL with the owner address (or `ADMIN`) and that
   password.

## Log lines, and what they mean

| Log | Meaning | Action |
|---|---|---|
| `[owner] OWNER_PASSWORD changed — rotated the owner credential hash` | Expected on the first boot after changing the env var. The env is the source of truth. | none |
| `[owner] could not move the owner account to <email> — is that address held by another account?` | The rename was rejected. Owner sign-in *by that email* won't work; sign-in by identity still does. | sign in with the previous owner address, then fix the collision |
| `[owner] OWNER_PASSWORD is the compromised legacy value "True" — ignoring it` | The env var is set to `True`, so it is treated as unset. In production that means no owner credential at all. | set a real password and redeploy |
| `[owner] bootstrap FAILED — owner sign-in will not work until this is fixed` | The owner account could not be seeded at all (usually the collapsed case of the row above, or the database is unreachable). | fix the cause, redeploy |

The credential is **rotated whenever `OWNER_PASSWORD` changes**, so rotating the
password is just an env edit + redeploy — the old value stops working. (This
used to be write-once, which is how a deployment could keep honouring a
password nobody could see.)

## Recovery

- **Stale password / lockout** — set `OWNER_PASSWORD` to what you want, redeploy.
  Rotation makes it the working password.
- **Address squatted by another account** — sign in with the owner password
  on the owner address (or `ADMIN`). That session is the canonical owner row,
  even though the rename could not move the address. A different password on
  the squatting account stays "Not bound". You can still free the address
  later. The owner row is never hijacked by the collision. `OWNER_NAME_CLAIM`
  is not required for this.
- **Last resort** — `OWNER_NAME_CLAIM=1` re-enables a narrow name-based
  bootstrap: whole compacted name, or the owner handle as a standalone token,
  one time only while nothing is bound, and it logs
  `[owner] legacy name claim accepted` when it fires. Use it to get in, then set
  an allow list and remove it. It is off by default and deliberately logged
  because a display name is not a credential.
- **Roll back a bad deploy** — Vercel → Deployments → the previous one → Promote.

## What the code enforces (so you don't have to re-derive it)

Owner access is decided by immutable identity only: the canonical row, the
recorded binding in `site_state.owner_user_id`, `OWNER_ACCOUNTS`
(`providerId:accountId` from the `account` table, user-immutable), an
allowlisted email that is verified or proved by Google/gate, or the operator
secret (`OWNER_PASSWORD`) on an allowlisted address. A display name is never
consulted — that was a privilege-escalation hole, fixed in #37, where any
account calling itself "Devin Norris" could reach the owner desk and the
owner-only research charts.
