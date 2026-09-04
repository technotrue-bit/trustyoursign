import { describe, expect, it } from "vitest";
import {
  busyFromPhase,
  chatFromPhase,
  phaseAfterCloseBirthChat,
  phaseAfterOpenBirthChat,
  phaseAfterOpenVisitor,
} from "./vault-phase";

describe("vault-phase", () => {
  it("maps dock to chat alias", () => {
    expect(chatFromPhase("dock")).toBe(true);
    expect(chatFromPhase("galaxy")).toBe(false);
    expect(chatFromPhase("forge")).toBe(false);
    expect(chatFromPhase("entered")).toBe(false);
  });

  it("busy in dock, forge, or entered", () => {
    expect(busyFromPhase("galaxy", false)).toBe(false);
    expect(busyFromPhase("dock", false)).toBe(true);
    expect(busyFromPhase("forge", false)).toBe(true);
    expect(busyFromPhase("galaxy", true)).toBe(true);
  });

  it("transition helpers", () => {
    expect(phaseAfterOpenBirthChat()).toBe("dock");
    expect(phaseAfterCloseBirthChat()).toBe("galaxy");
    expect(phaseAfterOpenVisitor()).toBe("entered");
  });
});
