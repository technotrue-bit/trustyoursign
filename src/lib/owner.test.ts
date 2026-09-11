import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSiteOwner,
  isSiteOwnerIdentity,
  isOwnerLogin,
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

describe("owner sign-in alias", () => {
  it("maps the short ADMIN login and nothing broader", () => {
    assert.equal(isOwnerLogin("ADMIN"), true);
    assert.equal(isOwnerLogin("admin"), true);
    assert.equal(isOwnerLogin(SITE_OWNER.email), true);
    assert.equal(isOwnerLogin("administrator"), false);
    assert.equal(isOwnerLogin("admin@example.com"), false);
  });
});
