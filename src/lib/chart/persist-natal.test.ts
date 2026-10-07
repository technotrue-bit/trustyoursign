import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePersistedNatal } from "./persist-natal.ts";

function body(id: "sun" | "moon" | "asc", signId: "aries" | "cancer" | "libra") {
  return {
    id,
    name: "Anything the browser sends",
    lon: id === "sun" ? 10 : id === "moon" ? 100 : 200,
    signId,
    signName: "Not a real label",
    degInSign: 12.5,
    house: id === "sun" ? 1 : id === "moon" ? 4 : 7,
    note: `${id} note`,
    headline: `${id} headline`,
    why: `${id} why`,
    body: [`${id} paragraph`],
  };
}

function natal(extra: Record<string, unknown> = {}) {
  return {
    depth: "vault",
    tone: "warm",
    when: "March 21 · 3:04",
    place: "Austin",
    lat: 30.27,
    lon: -97.74,
    timeZone: "America/Chicago",
    bodies: [body("moon", "cancer"), body("asc", "libra"), body("sun", "aries")],
    writtenAt: "2026-10-07T01:00:00.000Z",
    ...extra,
  };
}

describe("normalizePersistedNatal", () => {
  it("keeps a real chart and drops fields the sky does not store", () => {
    const saved = normalizePersistedNatal(natal({ junk: true, essay: "x".repeat(50_000) }));
    assert.equal("junk" in saved, false);
    assert.equal("essay" in saved, false);
    assert.equal(saved.depth, "vault");
    assert.equal(saved.tone, "warm");
    assert.equal(saved.place, "Austin");
    assert.deepEqual(
      saved.bodies.map((b) => b.id),
      ["sun", "moon", "asc"],
    );
    assert.equal(saved.bodies[0]?.name, "Sun");
    assert.equal(saved.bodies[0]?.signName, "Aries");
    assert.equal(saved.bodies[2]?.name, "Rising");
  });

  it("shortens a headline instead of storing the whole paste", () => {
    const huge = natal();
    huge.bodies[2] = { ...huge.bodies[2]!, headline: "H".repeat(5000) };
    const saved = normalizePersistedNatal(huge);
    assert.equal(saved.bodies[0]?.headline.length, 240);
  });

  it("keeps only four short paragraphs", () => {
    const huge = natal();
    huge.bodies[2] = {
      ...huge.bodies[2]!,
      body: Array.from({ length: 40 }, () => "P".repeat(2000)),
    };
    const saved = normalizePersistedNatal(huge);
    assert.equal(saved.bodies[0]?.body.length, 4);
    assert.equal(saved.bodies[0]?.body[0]?.length, 600);
  });

  it("refuses a blob that is not a chart", () => {
    assert.throws(() => normalizePersistedNatal({ junk: true }), /cannot be stored/);
    assert.throws(() => normalizePersistedNatal(natal({ bodies: [body("sun", "aries")] })), /cannot be stored/);
    assert.throws(() => normalizePersistedNatal(natal({ lat: 999 })), /cannot be stored/);
  });
});
