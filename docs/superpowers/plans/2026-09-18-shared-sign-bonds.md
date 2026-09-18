# Shared sign bonds — implementation plan (architecture #5)

> **For later.** Spec: [2026-09-18-shared-sign-bonds-design.md](../specs/2026-09-18-shared-sign-bonds-design.md).  
> Do not start until ChartSession (#1) and saved-chart hub (#4) are stable enough for additive tables.

## Locked split

| Surface | Audience | Phase |
| --- | --- | --- |
| Sun-sign bond (friend / lovers / family / wise) | All users | **P1** |
| Invite link + short code | All users | **P1** |
| Natal compare on a bond | Premium (`bones` \| `vault`) | **P2** |
| Live co-presence | Premium | **P3 — separate project** |

## Phase 0 — Content + contracts

1. Product-author (or provisional) symmetric sun×sun → `BondRole` table.
2. Add pure modules with tests only (no UI):
   - `src/lib/bond/roles.ts`
   - `src/lib/bond/sunMatrix.ts`
   - `src/lib/bond/copy.ts`
3. Document facade names: `createBondInvite`, `redeemBondInvite`, `revokeBond`, `getBond`.

**Done when:** unit tests lock role lookup for all 78 unordered pairs (12 + 66) or full 144 if directed.

## Phase 1 — Free invite + sun bond UI

1. Migration: `bond_invites`, `bond_redemptions`, `bonds` (+ RLS).
2. Server facades in `src/lib/bond.ts` → `bond.server.ts` (authMiddleware; no client `user_id`).
3. Host UX: “Share my sign” mint → copy link/code.
4. Guest route: `/bond/$token` (and code query) → redeem → Sign bond overlay/page.
5. Revoke + expiry.
6. Smoke: two browsers, mint → redeem → matching role; revoke blocks second redeem.

**Done when:** free path works without premium entitlement; natal columns unused or null.

## Phase 2 — Premium natal compare

1. Invite depth `natal` + consent copy; store snapshots on invite/redemption only.
2. Gate compare opener with `sky_pass.entitlement`.
3. `BondSession` (or equivalent) — do not overload solo `ChartSession`.
4. Inter-chart aspect helper reusing `aspects.ts` patterns.
5. Free users still see sun bond; compare CTA for premium only.

**Done when:** free redeem unchanged; premium with dual natal snapshots sees compare; free entitlement cannot.

## Phase 3 — Live co-presence (later premium project)

New design doc required. Candidates: server-mediated room vs revisit `src/lib/multiplayer/p2p.ts`.  
**Explicitly not part of P1/P2 shipping criteria.**

## Guardrails

- Do not wire `P2PRoom` for invites.
- Do not reorder `CONSTELLATIONS` / `SIGN_IDS`.
- Do not call this “friends-and-family” in UI or new docs.
- Do not use account `relation: "other"` rows as the share channel.
- Client/server seam: dynamic import `.server.ts` inside `createServerFn` only.

## Suggested first PR when building

Ship Phase 0 (matrix + tests) alone, then Phase 1 migrations + invite + bond UI.
