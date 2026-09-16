import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  genreSealedByTone,
  parseViewerTone,
  useViewerTone,
} from "./viewerTone.ts";

describe("viewer tone", () => {
  beforeEach(() => {
    useViewerTone.setState({ tone: "warm" });
  });

  it("parses stored values and defaults to warm", () => {
    assert.equal(parseViewerTone("warm"), "warm");
    assert.equal(parseViewerTone("vault"), "vault");
    assert.equal(parseViewerTone("nope"), "warm");
    assert.equal(parseViewerTone(null), "warm");
  });

  it("seals only horror under Warm", () => {
    assert.equal(genreSealedByTone("warm", "horror"), true);
    assert.equal(genreSealedByTone("warm", "spicy"), false);
    assert.equal(genreSealedByTone("vault", "horror"), false);
  });

  it("setTone switches Warm ↔ Full (vault)", () => {
    useViewerTone.getState().setTone("vault");
    assert.equal(useViewerTone.getState().tone, "vault");
    useViewerTone.getState().setTone("warm");
    assert.equal(useViewerTone.getState().tone, "warm");
  });
});
