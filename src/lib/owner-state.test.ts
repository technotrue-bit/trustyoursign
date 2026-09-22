import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  classifyOwnerFetchError,
  forgetOwnerVerdict,
  peekOwnerVerdict,
  refreshOwnerVerdict,
  resolveOwnerVerdict,
  setOwnerProbeForTests,
} from "./owner-state.ts";

let restore: (() => void) | null = null;

afterEach(() => {
  restore?.();
  restore = null;
});

describe("resolveOwnerVerdict", () => {
  it("asks the server once per user id and caches the answer", async () => {
    let calls = 0;
    restore = setOwnerProbeForTests(async () => {
      calls++;
      return { owner: true };
    });
    assert.equal(peekOwnerVerdict("u1"), null);
    const [a, b] = await Promise.all([resolveOwnerVerdict("u1"), resolveOwnerVerdict("u1")]);
    assert.equal(a, true);
    assert.equal(b, true);
    assert.equal(calls, 1, "concurrent callers share one probe");
    assert.equal(await resolveOwnerVerdict("u1"), true);
    assert.equal(calls, 1, "a settled verdict never re-probes");
    assert.equal(peekOwnerVerdict("u1"), true);
  });

  it("caches a server no as false", async () => {
    restore = setOwnerProbeForTests(async () => ({ owner: false }));
    assert.equal(await resolveOwnerVerdict("u2"), false);
    assert.equal(peekOwnerVerdict("u2"), false);
  });

  it("does not cache a failed probe, so the next call retries", async () => {
    let calls = 0;
    restore = setOwnerProbeForTests(async () => {
      calls++;
      if (calls === 1) throw new Error("cold");
      return { owner: true };
    });
    assert.equal(await resolveOwnerVerdict("u3"), null);
    assert.equal(peekOwnerVerdict("u3"), null);
    assert.equal(await resolveOwnerVerdict("u3"), true);
    assert.equal(calls, 2);
  });

  it("is false for no user without touching the server", async () => {
    let calls = 0;
    restore = setOwnerProbeForTests(async () => {
      calls++;
      return { owner: true };
    });
    assert.equal(await resolveOwnerVerdict(null), false);
    assert.equal(await resolveOwnerVerdict(undefined), false);
    assert.equal(peekOwnerVerdict(""), false);
    assert.equal(calls, 0);
  });

  it("refresh re-asks the server and flips a stale yes to no", async () => {
    let owner = true;
    let calls = 0;
    restore = setOwnerProbeForTests(async () => {
      calls++;
      return { owner };
    });
    assert.equal(await resolveOwnerVerdict("u5"), true);
    owner = false;
    assert.equal(peekOwnerVerdict("u5"), true, "stale until refreshed");
    assert.equal(await refreshOwnerVerdict("u5"), false);
    assert.equal(peekOwnerVerdict("u5"), false);
    assert.equal(calls, 2);
  });

  it("refresh keeps the old verdict when the probe fails", async () => {
    let fail = false;
    restore = setOwnerProbeForTests(async () => {
      if (fail) throw new Error("cold");
      return { owner: true };
    });
    await resolveOwnerVerdict("u6");
    fail = true;
    assert.equal(await refreshOwnerVerdict("u6"), true);
    assert.equal(peekOwnerVerdict("u6"), true);
  });

  it("forgets a verdict on demand (sign-out)", async () => {
    let calls = 0;
    restore = setOwnerProbeForTests(async () => {
      calls++;
      return { owner: true };
    });
    await resolveOwnerVerdict("u4");
    forgetOwnerVerdict("u4");
    assert.equal(peekOwnerVerdict("u4"), null);
    await resolveOwnerVerdict("u4");
    assert.equal(calls, 2);
  });
});

describe("classifyOwnerFetchError", () => {
  it("reads the middleware's Unauthorized as a lapsed session", () => {
    assert.equal(classifyOwnerFetchError(new Error("Unauthorized")), "signed_out");
    assert.equal(classifyOwnerFetchError(new Error("HTTP 401")), "signed_out");
  });

  it("reads the owner gate's Not found as not-the-owner", () => {
    assert.equal(classifyOwnerFetchError(new Error("Not found")), "not_owner");
  });

  it("treats anything else as unreachable", () => {
    assert.equal(classifyOwnerFetchError(new Error("Failed to fetch")), "unreachable");
    assert.equal(classifyOwnerFetchError(undefined), "unreachable");
  });
});
