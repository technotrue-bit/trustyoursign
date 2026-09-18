import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SESSION_WAKE_PATH,
  hardRecoverSession,
  softRecoverSession,
  wakeAuthServer,
} from "./session-recover.ts";

describe("session recover wakes the auth server", () => {
  it("probes get-session with credentials and no-store", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    await wakeAuthServer({
      timeoutMs: 100,
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return new Response("{}", { status: 200 });
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, SESSION_WAKE_PATH);
    assert.equal(calls[0]?.init?.method, "GET");
    assert.equal(calls[0]?.init?.credentials, "include");
    assert.equal(calls[0]?.init?.cache, "no-store");
  });

  it("swallows wake failures so recovery can continue", async () => {
    await wakeAuthServer({
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
  });

  it("soft recover wakes then refetches with cookie cache disabled", async () => {
    const steps: string[] = [];
    await softRecoverSession({
      fetchImpl: async () => {
        steps.push("wake");
        return new Response("null", { status: 200 });
      },
      refetch: async (params) => {
        steps.push(`refetch:${params?.query?.disableCookieCache === true}`);
      },
    });
    assert.deepEqual(steps, ["wake", "refetch:true"]);
  });

  it("hard recover wakes then reloads the page", async () => {
    const steps: string[] = [];
    await hardRecoverSession({
      fetchImpl: async () => {
        steps.push("wake");
        return new Response("null", { status: 200 });
      },
      reload: () => {
        steps.push("reload");
      },
    });
    assert.deepEqual(steps, ["wake", "reload"]);
  });
});
