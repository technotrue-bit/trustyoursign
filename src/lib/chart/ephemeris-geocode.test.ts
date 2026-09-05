import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  clearGeocodeCache,
  geocodePlace,
  normalizeGeocodeQuery,
} from "./ephemeris.ts";

describe("geocodePlace cache", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearGeocodeCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearGeocodeCache();
  });

  it("normalizes place keys", () => {
    assert.equal(normalizeGeocodeQuery("  Austin   TX  "), "austin tx");
  });

  it("hits the network once for the same normalized place", async () => {
    let calls = 0;
    globalThis.fetch = mock.fn(async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              name: "Austin",
              latitude: 30.27,
              longitude: -97.74,
              admin1: "Texas",
              country: "United States",
              timezone: "America/Chicago",
            },
          ],
        }),
      } as Response;
    }) as typeof fetch;

    const a = await geocodePlace("Austin TX");
    const b = await geocodePlace("  austin   tx ");
    assert.equal(calls, 1);
    assert.equal(a.name, b.name);
    assert.equal(a.lat, 30.27);
  });
});
