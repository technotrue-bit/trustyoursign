import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { deterministicMoonEffect, resolveMoonBrief } from "./moon-brief.ts";
import type { MoonDayBrief } from "./moon-day.ts";

const sample: MoonDayBrief = {
  dateKey: "2026-09-19",
  phaseName: "Waxing Gibbous",
  illumination: 0.58,
  moonSignId: "capricorn",
  moonSignName: "Capricorn",
};

describe("deterministicMoonEffect", () => {
  it("names phase, moon sign, and explored sign", () => {
    const text = deterministicMoonEffect(sample, "virgo");
    assert.match(text, /Waxing Gibbous/);
    assert.match(text, /Capricorn/);
    assert.match(text, /Virgo/);
    assert.match(text, /58%/);
  });

  it("stays short", () => {
    const text = deterministicMoonEffect(sample, "aries");
    assert.ok(text.length > 80 && text.length <= 900);
  });
});

describe("resolveMoonBrief", () => {
  it("does not call the paid writer when nobody is signed in", async () => {
    let called = false;
    const result = await resolveMoonBrief({
      moon: sample,
      signId: "virgo",
      enrich: true,
      signedIn: false,
      speak: async () => {
        called = true;
        return "This rewrite must not be asked for.";
      },
    });
    assert.equal(called, false);
    assert.equal(result.from, "bones");
    assert.match(result.effect, /Virgo/);
  });

  it("calls the stand-in writer only after a sign-in", async () => {
    let called = false;
    const spoken = "Waxing Gibbous. The Moon is in Capricorn, and Virgo feels the tide.";
    const result = await resolveMoonBrief({
      moon: sample,
      signId: "virgo",
      enrich: true,
      signedIn: true,
      speak: async () => {
        called = true;
        return spoken;
      },
    });
    assert.equal(called, true);
    assert.equal(result.from, "machine");
    assert.equal(result.effect, spoken);
  });

  it("keeps the local line when the signed-in writer has nothing to say", async () => {
    const result = await resolveMoonBrief({
      moon: sample,
      signId: "aries",
      enrich: true,
      signedIn: true,
      speak: async () => null,
    });
    assert.equal(result.from, "bones");
    assert.match(result.effect, /Aries/);
  });
});

describe("moon brief wiring", () => {
  const brief = readFileSync(fileURLToPath(new URL("./moon-brief.ts", import.meta.url)), "utf8");
  const card = readFileSync(
    fileURLToPath(new URL("../../components/overlay/MoonSignBriefCard.tsx", import.meta.url)),
    "utf8",
  );

  function exportSlice(source: string, name: string): string {
    const start = source.indexOf(`export const ${name}`);
    assert.ok(start >= 0, `missing export ${name}`);
    const next = source.indexOf("\nexport const ", start + 10);
    return next === -1 ? source.slice(start) : source.slice(start, next);
  }

  it("the open moon line never reaches the paid writer", () => {
    const open = exportSlice(brief, "getMoonSignBrief");
    assert.equal(open.includes("enrichWithXai"), false);
    assert.match(open, /enrich:\s*false/);
    assert.match(open, /signedIn:\s*false/);
  });

  it("the rewrite uses the same sign-in check as the other paid sky calls", () => {
    const paid = exportSlice(brief, "enrichMoonSignBrief");
    assert.match(paid, /\.middleware\(\[authMiddleware\]\)/);
    assert.match(paid, /speak:\s*enrichWithXai/);
  });

  it("the moon card does not ask for a rewrite until someone is signed in", () => {
    assert.equal(card.includes("enrich: true"), false);
    assert.match(card, /enrichMoonSignBrief/);
    assert.match(card, /if \(busy \|\| !signedIn\) return/);
  });
});
