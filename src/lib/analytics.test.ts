import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GA_MEASUREMENT_ID,
  trackChartCreated,
  trackChartSaved,
  trackEvent,
  trackShareClicked,
  trackSignViewed,
  trackSignup,
} from "./analytics";

describe("GA4 + Vercel analytics helpers", () => {
  it("exports the TrustYourSign GA4 Measurement ID", () => {
    assert.equal(GA_MEASUREMENT_ID, "G-KSC2J8LGVM");
  });

  it("is a no-op during SSR when window is undefined", () => {
    assert.doesNotThrow(() => {
      trackEvent("chart_created", { sign: "taurus", signed_in: false });
    });
  });

  it("forwards all 5 custom events to window.gtag when present", () => {
    const calls: Array<{ command: string; name: string; params: Record<string, unknown> }> = [];
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      gtag: (command: string, name: string, params: Record<string, unknown>) => {
        calls.push({ command, name, params });
      },
    };
    try {
      trackChartCreated("taurus", true);
      trackSignViewed("scorpio", "corridor");
      trackSignup("email", false);
      trackChartSaved("taurus");
      trackShareClicked("taurus", "copy");

      assert.deepEqual(calls, [
        { command: "event", name: "chart_created", params: { sign: "taurus", signed_in: true } },
        { command: "event", name: "sign_viewed", params: { sign: "scorpio", source: "corridor" } },
        { command: "event", name: "signup", params: { method: "email", invite: false } },
        { command: "event", name: "chart_saved", params: { sign: "taurus" } },
        { command: "event", name: "share_clicked", params: { sign: "taurus", channel: "copy" } },
      ]);
    } finally {
      if (prevWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = prevWindow;
      }
    }
  });
});
