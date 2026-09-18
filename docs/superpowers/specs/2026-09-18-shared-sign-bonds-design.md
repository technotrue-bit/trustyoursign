# Shared sign bonds (architecture #5)

Turn Trust Your Sign from a solo vault into a **cooperative** surface: share your sun sign (and later your natal) with another person on the same site, then see **how those signs meet** — friend, lovers, family, wise — without turning the product into a horoscope-column matcher.

## Decisions (locked)

| Choice | Value |
| --- | --- |
| Product name | **Sign bond** (UI); architecture slot stays **#5 / shared reading** |
| Free for all | Sun-sign bond layer + **invite link / code** |
| Premium | Full natal compare (synastry-style), gated by `sky_pass.entitlement` |
| Later premium project | Live co-presence (shared reading room) — **out of scope for v1–v2** |
| Share primitive | Server-issued **invite token** (not WebRTC / `src/lib/multiplayer/p2p.ts`) |
| Bond taxonomy | Four roles: **friend · lovers · family · wise** |
| Sign math | Tropical `SignId` / Aries-first indices — never reorder `CONSTELLATIONS` |
| Consent | Sharer opts in; recipient accepts; either party can revoke; no silent PII leak |
| Depends on | Architecture #1 (ChartSession) + #4 (stable `charts.id` / upsert hub) |

## Problem

Today the app is single-player:

- At most one open `ChartSession`
- `charts` rows are owner-only under RLS — no cross-user read
- Account “Someone else” stores **your** copy of another person’s birth data — not an invite
- `src/lib/multiplayer/` is dead WebRTC scaffolding (pre-beta: unreferenced)
- No sign-pair content; aspect/lexicon language is **intra-chart** only
- Specs name #5 only as a deferred non-goal (“shared reading rooms”)

Users who want to compare with a friend have nowhere to go without pasting birth data into someone else’s vault.

## Goal

1. Any user who has claimed (or saved) a sun sign can **mint a bond invite** (link + short code).
2. Another user on the site accepts that invite and sees a **Sign bond** view: both suns + one primary role (friend / lovers / family / wise) + short cooperative copy.
3. Premium users can open a **natal compare** on the same bond when both parties have shared enough timed natal data.
4. Live co-presence remains a **later** premium project; invite flow must not depend on both people being online at once.

## Non-goals (this design)

- Implementing live rooms / P2P / signaling (`p2p.ts` stays unused until a separate premium live-room spec)
- Replacing ChartSession’s single-open invariant for ordinary solo reading
- Reordering `CONSTELLATIONS` / `SIGN_IDS` for UI
- Billing checkout UI (gate on existing `sky_pass.entitlement`; paid billing may still be “not billed yet”)
- Using the phrase “friends-and-family” for this feature (that name is reserved for the solo iPhone visitor path)

## Product tiers

```text
All users (free)
  └─ Share sun SignId via invite link/code
  └─ Accept invite → Sign bond view (four roles)

Premium (sky_pass entitlement bones | vault)
  └─ Same free surface, plus natal compare on the bond
  └─ [Later project] Live co-presence / shared reading room
```

**Premium check:** reuse `sky_pass.entitlement` (`free` vs `bones` | `vault`), same pattern as deep-sky cuts in `src/lib/chart/sky.ts`. Do not invent a parallel subscription table for v1.

**Who needs premium for natal compare:** the user who **opens** the compare view. The peer’s shared natal payload is only readable if both sides consented to that depth on the invite.

## Bond taxonomy (free layer)

Exactly four roles. A pair of suns yields **one primary role** (deterministic table) plus optional secondary flavor text later.

| Role | Intent (product language) |
| --- | --- |
| **friend** | Easy company, allies, low-friction play |
| **lovers** | Chemistry, pull, romantic / eros charge |
| **family** | Kinship, care, long-haul belonging |
| **wise** | Counsel, craft, mutual sharpening |

Rules:

- Content is **cooperative**, not ranked “compatibility %.”
- Copy may borrow lexicon tone (conversation, wires) but must not claim predictive fate.
- Same-sign pairs are valid (often **wise** or **family** — decide in the matrix, don’t special-case in UI).
- Matrix is **symmetric** for v1: `bond(A,B) === bond(B,A)`. Directed asymmetry is a later content pass if needed.

### Matrix ownership

| Module (proposed) | Owns |
| --- | --- |
| `src/lib/bond/roles.ts` | `BondRole` union + labels |
| `src/lib/bond/sunMatrix.ts` | Pure `bondRole(a: SignId, b: SignId): BondRole` + unit tests |
| `src/lib/bond/copy.ts` | Short blurbs keyed by role (± optional element/modality flavor) |

Derivation seed (implementation detail, not product promise): element + modality from `sign-canon.ts` can bias role selection so the 12×12 table is authored once and tested, not hand-waved in components.

## Invite flow (free — all users)

### Actors

- **Host:** has a sun `SignId` (from claim draft, shelf session, or saved chart).
- **Guest:** signed-in or guest who can claim/accept on the same origin.

### Lifecycle

```mermaid
sequenceDiagram
  participant Host
  participant Server
  participant Guest

  Host->>Server: createBondInvite(sunSignId, depth)
  Server-->>Host: token, code, url
  Host->>Guest: share link or code out of band
  Guest->>Server: redeemBondInvite(token|code)
  Server-->>Guest: bond payload (both suns, role, copy)
  Guest->>Guest: open Sign bond surface
  Note over Host,Guest: Either party may revoke; token expires
```

### Depth on invite

| Depth | Free | Premium compare |
| --- | --- | --- |
| `sun` | Default — only `SignId` (+ display name optional) | N/A |
| `natal` | Host may **offer** natal share; guest redeem still shows sun bond for everyone | Premium opener may load peer natal snapshot for compare |

Natal payloads on a bond are **server-held snapshots** scoped to the bond id, not a grant to read the peer’s entire `charts` library.

### Data (proposed)

```text
bond_invites
  id, token_hash, short_code
  host_user_id (nullable for ephemeral guest host — prefer signed-in host in v1)
  host_sign_id
  depth: sun | natal
  natal_snapshot_json (nullable, only if depth=natal + consent)
  expires_at, revoked_at, created_at

bond_redemptions
  id, invite_id
  guest_user_id (nullable guest session key if allowed)
  guest_sign_id
  guest_natal_snapshot_json (nullable)
  created_at

bonds (materialized pair after redeem)
  id, invite_id
  host_sign_id, guest_sign_id
  primary_role
  status: active | revoked
```

RLS / server fns: only host, guest, or site owner; never world-readable natal JSON. Facades stay `createServerFn` + dynamic `.server` import (architecture map seam).

### Routes / UX (sketch)

- Host: “Share my sign” from claim success, shelf, or account — mint invite, show copyable link + code.
- Guest: `/bond/:token` or `/bond?code=` — redeem, show both signs + role.
- No detached promo badges on hero media; bond UI is its own surface (library / overlay room), not a sticker on the galaxy hero.

### Auth stance

- **v1 preference:** host signed in (stable revoke + entitlement). Guest may redeem while signed in; guest-as-ephemeral allowed only if invite stores no natal.
- Do not reuse account “Someone else” rows as the share channel.

## Natal compare (premium)

When `sky_pass.entitlement` is `bones` or `vault` **and** the bond has natal depth from both sides:

1. Open a **pair session** concept that does **not** break solo `ChartSession` — either a sibling store (`BondSession`) or a read-only compare mode keyed by `bonds.id`.
2. Compute inter-chart aspects (extend `aspects.ts` patterns across two nativities) and present cooperative copy (not a score dump).
3. Free users who land on a natal-capable bond still see the **sun bond**; CTA explains premium unlock without blocking the free surface.

Out of scope for first premium ship: composite charts, relocation, live cursors.

## Live co-presence (later — premium project)

Separate spec when #5 invite + sun bond + natal compare are stable:

- Shared reading room (both online)
- Presence, maybe pointer/selection sync
- Evaluate then whether to revive / replace `p2p.ts` vs server-mediated rooms

**Do not** block invite/bond on WebRTC. Async share is the cooperative default.

## Prerequisites

| Prerequisite | Why |
| --- | --- |
| ChartSession (#1) clean | Solo open natal stays one object; bond is additive |
| Saved-chart hub (#4) | Stable `charts.id` if later linking bonds to saved rows |
| Entitlement readable client-safe | Gate compare CTA without leaking peer PII |

## Risks

| Risk | Mitigation |
| --- | --- |
| PII leak via share links | Token hash at rest; short TTL; revoke; natal only on explicit depth |
| Compatibility-column tone | Four roles + cooperative copy; no % scores |
| Single-session invariant | Bond surface separate from `ChartSession` |
| Dead P2P temptation | Invite tokens first; live room later spec |
| “Friends-and-family” naming clash | Always say **Sign bond** / **bond invite** in docs and UI |
| Matrix authorship disputes | Pure function + golden tests; content editable in one module |

## Success criteria (when implemented)

1. Two users can complete host mint → guest redeem → both see the same primary role for the same sun pair.
2. Free path never requires paid entitlement or simultaneous online presence.
3. Natal compare refuses cleanly when entitlement is `free` or natal depth missing.
4. Revoke invalidates further redeem and hides natal snapshots from the peer.
5. `CONSTELLATIONS` / ephemeris order untouched; calendar UI still uses `CALENDAR_SIGN_INDICES` only where needed.

## Open content task (before coding the matrix)

Author the 12×12 (or folded symmetric) **primary role** table in `sunMatrix.ts` with product review — engineering ships the pure API and empty/stub table only after that pass, or ships a documented provisional table marked provisional in copy.
