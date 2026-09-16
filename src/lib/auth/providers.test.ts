import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GROK_PROVIDERS, servedProviderIds } from "./providers.ts";

/**
 * The sign-in page used to render "Continue with Google"/"Continue with X" from
 * the static provider table while the server only registers `/sign-in/oauth2`
 * when the broker client is configured. On a host without those credentials the
 * button was offered, cleared the visitor's session, and then 404'd.
 *
 * `servedProviderIds` is the server's answer to "what can you actually start?",
 * and the page renders from it — so these two cases are the whole contract:
 * nothing when the broker is absent, the real providers when it is present.
 */
describe("served sign-in providers", () => {
  it("offers nothing when the broker is not configured", () => {
    assert.deepEqual(servedProviderIds(false), []);
  });

  it("offers every broker provider when it is configured", () => {
    assert.deepEqual(
      servedProviderIds(true),
      GROK_PROVIDERS.map((provider) => provider.providerId),
    );
    // The list is what the page filters GROK_PROVIDERS by, so an id that is not
    // in the table would render nothing and an id that is missing would hide a
    // provider the server can serve.
    assert.ok(servedProviderIds(true).includes("grok-google"));
    assert.ok(servedProviderIds(true).includes("grok-x"));
  });

  it("returns a fresh array, so a caller cannot mutate the shared table", () => {
    const first = servedProviderIds(true);
    first.pop();
    assert.equal(servedProviderIds(true).length, GROK_PROVIDERS.length);
  });
});