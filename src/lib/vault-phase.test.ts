import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  busyFromPhase,
  chatFromPhase,
  phaseAfterCloseBirthChat,
  phaseAfterOpenBirthChat,
  phaseAfterOpenVisitor,
} from "./vault-phase.ts";

describe("vault-phase", () => {
  it("maps dock to chat alias", () => {
    assert.equal(chatFromPhase("dock"), true);
    assert.equal(chatFromPhase("galaxy"), false);
    assert.equal(chatFromPhase("forge"), false);
    assert.equal(chatFromPhase("entered"), false);
  });

  it("busy in dock, forge, or entered", () => {
    assert.equal(busyFromPhase("galaxy", false), false);
    assert.equal(busyFromPhase("dock", false), true);
    assert.equal(busyFromPhase("forge", false), true);
    assert.equal(busyFromPhase("galaxy", true), true);
  });

  it("transition helpers", () => {
    assert.equal(phaseAfterOpenBirthChat(), "dock");
    assert.equal(phaseAfterCloseBirthChat(), "galaxy");
    assert.equal(phaseAfterOpenVisitor(), "entered");
  });
});
