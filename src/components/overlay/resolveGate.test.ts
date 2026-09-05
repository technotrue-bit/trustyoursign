import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveGate } from "./resolveGate.ts";

describe("resolveGate", () => {
  it("prefers natal when entered", () => {
    assert.equal(
      resolveGate({ entered: true, claiming: true, surface: "library" }),
      "natal",
    );
  });

  it("uses claim when claiming and not entered", () => {
    assert.equal(
      resolveGate({ entered: false, claiming: true, surface: "galaxy" }),
      "claim",
    );
  });

  it("uses library when surface is library", () => {
    assert.equal(
      resolveGate({ entered: false, claiming: false, surface: "library" }),
      "library",
    );
  });

  it("defaults to galaxy", () => {
    assert.equal(
      resolveGate({ entered: false, claiming: false, surface: "galaxy" }),
      "galaxy",
    );
  });
});
