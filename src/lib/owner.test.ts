import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  isSiteOwner,
  isSiteOwnerIdentity,
  isOwnerLogin,
  linkedMailboxProof,
  looksLikeOwnerByName,
  ownerEmailAllowList,
  OWNER_USER_ID,
  parseOwnerAccounts,
  parseOwnerEmails,
  SITE_OWNER,
} from "./owner.ts";

/**
 * Owner authorization is decided by IMMUTABLE identity only.
 *
 * Regression under test: owner access used to be granted by a substring match
 * on the user's display name, and a display name is attacker-controlled on
 * every sign-in path. These tests pin the boundary — a name can no longer
 * authorize anything, whatever it says.
 */

const ATTACKER_NAMES = [
  "Devin Norris",
  "Devin Norris Fan",
  "xX ItsMeTrueG Xx",
  "Not Devin Norris",
  "devinnorris",
  "ItsMeTrueG",
];

describe("owner identity — immutable identifiers only", () => {
  it("accepts the canonical owner row", () => {
    assert.equal(isSiteOwnerIdentity({ userId: OWNER_USER_ID }), true);
  });

  it("accepts an already-recorded binding", () => {
    assert.equal(
      isSiteOwnerIdentity({ userId: "google-1180", boundOwnerId: "google-1180" }),
      true,
    );
  });

  it("rejects a binding that belongs to someone else", () => {
    assert.equal(
      isSiteOwnerIdentity({ userId: "attacker-1", boundOwnerId: "google-1180" }),
      false,
    );
  });

  it("accepts an allowlisted provider account", () => {
    const ownerAccounts = ["google:1180999", "x:42"];
    assert.equal(
      isSiteOwnerIdentity({
        userId: "u42",
        ownerAccounts,
        accounts: [{ providerId: "x", accountId: "42" }],
      }),
      true,
    );
    assert.equal(
      isSiteOwnerIdentity({
        userId: "u42",
        ownerAccounts,
        accounts: [{ providerId: "google", accountId: "9999999" }],
      }),
      false,
    );
  });

  it("accepts an allowlisted email ONLY when verified", () => {
    const ownerEmails = ["devin@gmail.com"];
    assert.equal(
      isSiteOwnerIdentity({
        userId: "u1",
        ownerEmails,
        email: "Devin@Gmail.com",
        emailVerified: true,
      }),
      true,
    );
    // Unverified (e.g. an X account's synthetic address) must never qualify.
    assert.equal(
      isSiteOwnerIdentity({
        userId: "u1",
        ownerEmails,
        email: "devin@gmail.com",
        emailVerified: false,
      }),
      false,
    );
    // A linked X account does not prove the mailbox.
    assert.equal(
      isSiteOwnerIdentity({
        userId: "u1",
        ownerEmails,
        email: "devin@gmail.com",
        emailVerified: false,
        accounts: [{ providerId: "grok-x", accountId: "99" }],
      }),
      false,
    );
  });

  it("accepts an allowlisted email when Google or the gate proved the mailbox", () => {
    const ownerEmails = [SITE_OWNER.email];
    assert.equal(
      isSiteOwnerIdentity({
        userId: "google-row",
        ownerEmails,
        email: SITE_OWNER.email,
        emailVerified: false,
        accounts: [{ providerId: "grok-google", accountId: "1180" }],
      }),
      true,
    );
    assert.equal(
      isSiteOwnerIdentity({
        userId: "gate-row",
        ownerEmails,
        email: SITE_OWNER.email,
        emailVerified: false,
        accounts: [{ providerId: "grok-gate", accountId: "gate-1" }],
      }),
      true,
    );
    // The provider proof does not extend to some other address.
    assert.equal(
      isSiteOwnerIdentity({
        userId: "google-row",
        ownerEmails,
        email: "someone-else@example.com",
        emailVerified: false,
        accounts: [{ providerId: "grok-google", accountId: "1180" }],
      }),
      false,
    );
    // A local password signup is not mailbox proof.
    assert.equal(
      isSiteOwnerIdentity({
        userId: "cred-row",
        ownerEmails,
        email: SITE_OWNER.email,
        emailVerified: false,
        accounts: [{ providerId: "credential", accountId: "cred-row" }],
      }),
      false,
    );
    assert.equal(linkedMailboxProof([{ providerId: "grok-x" }]), false);
    assert.equal(linkedMailboxProof([{ providerId: "grok-google" }]), true);
  });

  it("rejects empty / unknown identities", () => {
    assert.equal(isSiteOwnerIdentity({ userId: "" }), false);
    assert.equal(isSiteOwnerIdentity({ userId: null }), false);
    assert.equal(isSiteOwnerIdentity({ userId: "random-visitor" }), false);
  });

  it("REGRESSION: no display name can authorize, however close it reads", () => {
    for (const name of ATTACKER_NAMES) {
      // A name is not even an input to the decision — passing one changes nothing.
      const spoofed = {
        userId: "attacker-1",
        email: "attacker@example.com",
        emailVerified: true,
        displayName: name,
        name,
      } as unknown as Parameters<typeof isSiteOwnerIdentity>[0];
      assert.equal(isSiteOwnerIdentity(spoofed), false, `name authorized: ${name}`);
    }
  });

  it("REGRESSION: the client display check ignores the display name too", () => {
    for (const name of ATTACKER_NAMES) {
      assert.equal(
        isSiteOwner({
          id: "attacker-1",
          displayName: name,
          primaryEmail: "attacker@example.com",
        }),
        false,
        `client chrome granted for: ${name}`,
      );
    }
    // The owner still reads as owner by identity.
    assert.equal(
      isSiteOwner({ id: OWNER_USER_ID, displayName: null, primaryEmail: null }),
      true,
    );
    assert.equal(
      isSiteOwner({
        id: "google-1180",
        displayName: "anything",
        primaryEmail: SITE_OWNER.email,
      }),
      true,
    );
  });
});

describe("owner allow-list parsing", () => {
  it("splits on commas and whitespace, lowercases, drops empties", () => {
    assert.deepEqual(parseOwnerEmails(" A@B.com ,  c@d.com\n"), ["a@b.com", "c@d.com"]);
    assert.deepEqual(parseOwnerEmails(undefined), []);
    assert.deepEqual(parseOwnerEmails("   "), []);
  });

  it("always includes the canonical owner address", () => {
    assert.deepEqual(ownerEmailAllowList(undefined), [SITE_OWNER.email]);
    assert.deepEqual(ownerEmailAllowList("devin@gmail.com"), [
      SITE_OWNER.email,
      "devin@gmail.com",
    ]);
    // No duplicate when the canonical address is passed explicitly.
    assert.deepEqual(ownerEmailAllowList(SITE_OWNER.email), [SITE_OWNER.email]);
  });

  it("keeps only well-formed provider:account pairs", () => {
    assert.deepEqual(parseOwnerAccounts("google:123, x:42"), ["google:123", "x:42"]);
    assert.deepEqual(parseOwnerAccounts("garbage, :nope, also:"), []);
    assert.deepEqual(parseOwnerAccounts(undefined), []);
  });
});

describe("legacy name heuristic is narrow (opt-in bootstrap only)", () => {
  it("still recognises the owner's own name and handle", () => {
    assert.equal(looksLikeOwnerByName({ displayName: "Devin Norris" }), true);
    assert.equal(looksLikeOwnerByName({ displayName: "Devin-Norris" }), true);
    assert.equal(looksLikeOwnerByName({ displayName: "ItsMeTrueG" }), true);
  });

  it("no longer matches a name that merely contains the owner's", () => {
    assert.equal(looksLikeOwnerByName({ displayName: "Devin Norris Fan" }), false);
    assert.equal(looksLikeOwnerByName({ displayName: "Not Devin Norris" }), false);
    assert.equal(looksLikeOwnerByName({ displayName: "Joey Devin Norris" }), false);
    assert.equal(looksLikeOwnerByName({ displayName: "Jane Doe" }), false);
    assert.equal(looksLikeOwnerByName(null), false);
  });
});

describe("research desk", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

  it("writes the owner binding with the row-level bypass", () => {
    const text = readFileSync(join(root, "src/lib/owner.server.ts"), "utf8");
    const start = text.indexOf("async function bindOwner");
    const end = text.indexOf("function isUnbound");
    assert.ok(start >= 0 && end > start);
    assert.match(text.slice(start, end), /AppRls\.bypass/);
  });

  it("lists research charts by their own names, without a combined heading", () => {
    const admin = readFileSync(join(root, "src/routes/admin.tsx"), "utf8");
    assert.equal(admin.includes("Saige and Joey"), false);
    assert.match(admin, /Research charts/);
    assert.match(admin, /No research charts are on this desk yet/);
    assert.match(admin, /The third/);
    assert.match(admin, /claimed !== true/);
    assert.match(admin, /Checking/);
    assert.match(admin, /Bound to this sign-in/);
    assert.match(admin, /Not bound to this sign-in/);
    assert.equal(admin.includes('"Waiting"'), false);
  });

  it("proves the operator secret only for an allowlisted address, and never by name", () => {
    const server = readFileSync(join(root, "src/lib/owner.server.ts"), "utf8");
    const start = server.indexOf("async function credentialMatchesOwnerSecret");
    const end = server.indexOf("function refusalReason");
    assert.ok(start >= 0 && end > start);
    const body = server.slice(start, end);
    assert.match(body, /emails\.includes\(address\)/);
    const allowCheck = body.indexOf("emails.includes(address)");
    const verify = body.indexOf("verifyPassword");
    assert.ok(allowCheck >= 0 && verify > allowCheck);
    assert.equal(body.includes("looksLikeOwnerByName"), false);
    assert.equal(server.includes("linkedMailboxProof"), true);
    const signIn = readFileSync(join(root, "src/lib/auth/owner-sign-in.server.ts"), "utf8");
    assert.match(signIn, /OWNER_USER_ID/);
    assert.match(signIn, /ownerPasswordMatches/);
    assert.equal(signIn.includes("looksLikeOwnerByName"), false);
    assert.equal(signIn.includes("displayName"), false);
  });
});

describe("owner sign-in alias", () => {
  it("maps the short ADMIN login and nothing broader", () => {
    assert.equal(isOwnerLogin("ADMIN"), true);
    assert.equal(isOwnerLogin("admin"), true);
    assert.equal(isOwnerLogin(SITE_OWNER.email), true);
    assert.equal(isOwnerLogin("administrator"), false);
    assert.equal(isOwnerLogin("admin@example.com"), false);
  });
});
