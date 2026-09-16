import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROOM_CATALOG, canEnter, roomsFor } from "./rooms.ts";

describe("rooms matrix", () => {
  it("catalog is the seven rooms in dock order", () => {
    assert.deepEqual(
      ROOM_CATALOG.map((r) => r.id),
      ["sky", "body", "gates", "machine", "readings", "bones", "ask"],
    );
  });

  it("roomsFor matches today's allowlists", () => {
    assert.deepEqual(roomsFor("research").map((r) => r.id), ROOM_CATALOG.map((r) => r.id));
    assert.deepEqual(
      roomsFor("visitor").map((r) => r.id),
      ["sky", "body", "gates", "machine", "readings", "bones", "ask"],
    );
    assert.deepEqual(
      roomsFor("shelf").map((r) => r.id),
      ["sky", "ask"],
    );
  });

  it("canEnter is true only for allowlisted modes", () => {
    assert.equal(canEnter("visitor", "sky"), true);
    assert.equal(canEnter("visitor", "gates"), true);
    assert.equal(canEnter("visitor", "readings"), true);
    assert.equal(canEnter("shelf", "ask"), true);
    assert.equal(canEnter("shelf", "body"), false);
    assert.equal(canEnter("research", "machine"), true);
  });
});
