import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BEARER_KEY,
  clearBearerTokens,
  isLivePreviewHost,
  readBearerTokenForRequest,
  syncBearerStorageOnLoad,
  writePreviewBearerToken,
  writeSessionBearerToken,
} from "./bearer-storage.ts";

function memStore(): Storage {
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

describe("bearer-storage", () => {
  it("recognises only grok-sandbox preview hosts", () => {
    assert.equal(isLivePreviewHost("foo.grok-sandbox.com"), true);
    assert.equal(isLivePreviewHost("trustyoursign.com"), false);
    assert.equal(isLivePreviewHost("trustyoursign.vercel.app"), false);
    assert.equal(isLivePreviewHost("localhost"), false);
  });

  it("never returns a bearer for deployed hosts even when storage has one", () => {
    const session = memStore();
    const local = memStore();
    local.setItem(BEARER_KEY, "stale-token");
    session.setItem(BEARER_KEY, "stale-token");
    assert.equal(
      readBearerTokenForRequest({
        hostname: "trustyoursign.com",
        session,
        local,
      }),
      null,
    );
  });

  it("purges leftovers on deployed load so cookie auth cannot be shadowed", () => {
    const session = memStore();
    const local = memStore();
    local.setItem(BEARER_KEY, "stale-token");
    session.setItem(BEARER_KEY, "stale-token");
    const present = syncBearerStorageOnLoad({
      hostname: "trustyoursign.com",
      session,
      local,
    });
    assert.equal(present, false);
    assert.equal(session.getItem(BEARER_KEY), null);
    assert.equal(local.getItem(BEARER_KEY), null);
  });

  it("restores session←local only on preview hosts", () => {
    const session = memStore();
    const local = memStore();
    local.setItem(BEARER_KEY, "preview-token");
    const present = syncBearerStorageOnLoad({
      hostname: "abc.grok-sandbox.com",
      session,
      local,
    });
    assert.equal(present, true);
    assert.equal(session.getItem(BEARER_KEY), "preview-token");
    assert.equal(
      readBearerTokenForRequest({
        hostname: "abc.grok-sandbox.com",
        session,
        local,
      }),
      "preview-token",
    );
  });

  it("writePreviewBearerToken persists to both stores; clear drops both", () => {
    const session = memStore();
    const local = memStore();
    writePreviewBearerToken("fresh", { session, local });
    assert.equal(session.getItem(BEARER_KEY), "fresh");
    assert.equal(local.getItem(BEARER_KEY), "fresh");
    clearBearerTokens({ session, local });
    assert.equal(session.getItem(BEARER_KEY), null);
    assert.equal(local.getItem(BEARER_KEY), null);
  });

  it("writeSessionBearerToken(null) also clears durable local leftovers", () => {
    const session = memStore();
    const local = memStore();
    local.setItem(BEARER_KEY, "leftover");
    session.setItem(BEARER_KEY, "leftover");
    writeSessionBearerToken(null, { session, local });
    assert.equal(session.getItem(BEARER_KEY), null);
    assert.equal(local.getItem(BEARER_KEY), null);
  });
});
