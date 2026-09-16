import assert from "node:assert/strict";
<<<<<<< HEAD
import test from "node:test";
import {
  ariesConstellationLineCount,
  ariesConstellationLineReveal,
  ariesConstellationReveal,
} from "./intro.ts";

test("Aries constellation reveal is hidden before the silhouette gathers", () => {
  assert.equal(ariesConstellationReveal(0), 0);
  assert.equal(ariesConstellationReveal(0.16), 0);
});

test("Aries constellation reveal eases into a complete line drawing", () => {
  assert.ok(ariesConstellationReveal(0.5) > 0);
  assert.ok(ariesConstellationReveal(0.5) < 1);
  assert.equal(ariesConstellationReveal(1), 1);
});

test("stages the early Aries lines before the late legs", () => {
  const total = 24;
  assert.ok(ariesConstellationLineReveal(0.45, 0, total) > 0);
  assert.equal(ariesConstellationLineReveal(0.45, total - 1, total), 0);
  assert.ok(ariesConstellationLineCount(0.62, total) > 0);
  assert.ok(ariesConstellationLineCount(0.62, total) < total);
  assert.equal(ariesConstellationLineCount(1, total), total);
});

test("reduced motion lands immediately on the finished constellation", () => {
  assert.equal(ariesConstellationReveal(0, true), 1);
  assert.equal(ariesConstellationReveal(0.2, true), 1);
  assert.equal(ariesConstellationLineCount(0, 24, true), 24);
  assert.equal(ariesConstellationLineReveal(0, 23, 24, true), 1);
=======
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  INTRO_KEY,
  bootIntro,
  resetIntroForTests,
  templeIntro,
} from "./intro.ts";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

function installBrowserShims() {
  const local = memoryStorage();
  const session = memoryStorage();
  const g = globalThis as typeof globalThis & {
    window: Window & typeof globalThis;
    localStorage: Storage;
    sessionStorage: Storage;
  };
  g.localStorage = local;
  g.sessionStorage = session;
  g.window = g as unknown as Window & typeof globalThis;
  Object.defineProperty(g.window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
  return { local, session };
}

describe("bootIntro returning visitors", () => {
  let local: Storage;
  let session: Storage;

  beforeEach(() => {
    resetIntroForTests();
    ({ local, session } = installBrowserShims());
  });

  afterEach(() => {
    resetIntroForTests();
    local.clear();
    session.clear();
  });

  it("first visit keeps the ask veil and full duration", () => {
    bootIntro();
    assert.equal(templeIntro.done, false);
    assert.equal(templeIntro.asking, true);
    assert.equal(templeIntro.seen, false);
    assert.equal(templeIntro.duration > 1, true);
  });

  it("skips fully when localStorage marks intro seen", () => {
    local.setItem(INTRO_KEY, "1");
    bootIntro();
    assert.equal(templeIntro.done, true);
    assert.equal(templeIntro.asking, false);
    assert.equal(templeIntro.seen, true);
  });

  it("skips fully when only sessionStorage marks intro seen", () => {
    session.setItem(INTRO_KEY, "1");
    bootIntro();
    assert.equal(templeIntro.done, true);
    assert.equal(templeIntro.asking, false);
    // Completing also dual-writes so future visits survive a new tab.
    assert.equal(local.getItem(INTRO_KEY), "1");
  });

  it("is idempotent once booted", () => {
    bootIntro();
    assert.equal(templeIntro.asking, true);
    templeIntro.asking = false;
    bootIntro();
    assert.equal(templeIntro.asking, false);
  });
>>>>>>> 0c78d1b (Skip temple intro for returning visitors via durable storage)
});
