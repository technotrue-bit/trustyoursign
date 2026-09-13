import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSignId, SIGN_CANON, SIGN_IDS, isSignId, signIndexOf, signName } from "./sign-canon.ts";

describe("sign-canon", () => {
  it("SIGN_IDS is Aries-first tropical order of length 12", () => {
    assert.equal(SIGN_IDS.length, 12);
    assert.equal(SIGN_IDS[0], "aries");
    assert.equal(SIGN_IDS[11], "pisces");
    assert.equal(signIndexOf("aries"), 0);
    assert.equal(signIndexOf("leo"), 4);
  });

  it("SIGN_CANON covers every SIGN_IDS entry", () => {
    for (const id of SIGN_IDS) {
      assert.equal(SIGN_CANON[id].id, id);
      assert.ok(SIGN_CANON[id].name.length > 0);
      assert.equal(signName(id), SIGN_CANON[id].name);
    }
  });

  it("parseSignId accepts canon ids and rejects unknowns", () => {
    assert.equal(parseSignId("leo"), "leo");
    assert.equal(isSignId("leo"), true);
    assert.equal(isSignId("not-a-sign"), false);
    assert.throws(() => parseSignId("not-a-sign"), /Unknown sign/);
  });
});
