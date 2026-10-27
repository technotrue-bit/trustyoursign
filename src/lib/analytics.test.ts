import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GA_MEASUREMENT_ID,
  gaBootstrapScript,
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

  it("starts GA with no cookies and loads it only after the page is idle", () => {
    const appended: Array<{ src: string; async: boolean }> = [];
    const listeners: Record<string, () => void> = {};
    let idle: (() => void) | null = null;
    const win: Record<string, unknown> = {
      addEventListener: (type: string, fn: () => void) => {
        listeners[type] = fn;
      },
      requestIdleCallback: (fn: () => void) => {
        idle = fn;
      },
      document: {
        readyState: "loading",
        createElement: () => ({ src: "", async: false }),
        head: { appendChild: (el: { src: string; async: boolean }) => appended.push(el) },
      },
    };
    new Function("window", "document", gaBootstrapScript(GA_MEASUREMENT_ID))(win, win.document);

    const layer = win.dataLayer as unknown[][];
    assert.deepEqual(Array.from(layer[0]!), [
      "consent",
      "default",
      {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
    assert.deepEqual(Array.from(layer.at(-1)!), ["config", GA_MEASUREMENT_ID]);
    assert.equal(appended.length, 0, "gtag.js waits for load");

    listeners.load!();
    assert.equal(appended.length, 0, "gtag.js waits for idle after load");
    idle!();
    assert.equal(appended.length, 1);
    assert.equal(appended[0]!.src, `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
    assert.equal(appended[0]!.async, true);
  });
});
