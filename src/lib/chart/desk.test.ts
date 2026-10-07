import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { DEFAULT_DESK, parseDesk } from "./desk.ts";

describe("parseDesk", () => {
  it("keeps the settings the owner form shows and drops the rest", () => {
    const saved = parseDesk({
      kill: true,
      lightModel: "grok-4.5",
      lightEffort: "medium",
      lightTokens: 800,
      deepModel: "grok-4.6",
      deepEffort: "high",
      deepTokens: 1000,
      systemVault: "Use only the table.",
      systemWarm: "Speak softly.",
      junk: "x".repeat(50_000),
    });
    assert.equal("junk" in saved, false);
    assert.equal(saved.kill, true);
    assert.equal(saved.lightModel, "grok-4.5");
    assert.equal(saved.lightEffort, "medium");
    assert.equal(saved.lightTokens, 800);
    assert.equal(saved.deepTokens, 1000);
    assert.equal(saved.systemVault, "Use only the table.");
  });

  it("shortens a very long instruction and refuses a model name that is not ours", () => {
    const saved = parseDesk({
      lightModel: "other-model",
      deepModel: `grok-${"m".repeat(80)}`,
      lightTokens: 9_999_999,
      deepTokens: 1,
      systemVault: "V".repeat(20_000),
      systemWarm: "W".repeat(20_000),
    });
    assert.equal(saved.lightModel, DEFAULT_DESK.lightModel);
    assert.equal(saved.deepModel.length, 32);
    assert.ok(saved.deepModel.startsWith("grok-"));
    assert.equal(saved.lightTokens, 2000);
    assert.equal(saved.deepTokens, 400);
    assert.equal(saved.systemVault.length, 4000);
    assert.equal(saved.systemWarm.length, 4000);
  });

  it("falls back when the save is not a desk", () => {
    const saved = parseDesk(null);
    assert.equal(saved.lightModel, DEFAULT_DESK.lightModel);
    assert.equal(saved.kill, false);
  });
});

describe("desk save wiring", () => {
  it("checks the settings before they are stored", () => {
    const sky = readFileSync(fileURLToPath(new URL("./sky.ts", import.meta.url)), "utf8");
    const start = sky.indexOf("export const saveAiDesk");
    const end = sky.indexOf("export const grantSkyPass");
    assert.ok(start >= 0 && end > start);
    const slice = sky.slice(start, end);
    assert.match(slice, /\.validator\(\(input: unknown\): AiDesk => parseDesk\(input\)\)/);
    assert.equal(slice.includes("=> input"), false);
  });
});
