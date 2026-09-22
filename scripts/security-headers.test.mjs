/**
 * P1-18 — security header contract tests.
 * Asserts the shared module, vercel.json parity, and Response wrapping.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADER_NAMES,
  SECURITY_HEADERS,
  applySecurityHeaders,
  withSecurityHeaders,
} from "./security-headers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("security headers (P1-18)", () => {
  it("exports the Ultron-required header names", () => {
    for (const name of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "Referrer-Policy",
      "Permissions-Policy",
      "X-Content-Type-Options",
    ]) {
      assert.ok(SECURITY_HEADER_NAMES.includes(name), name);
      assert.equal(typeof SECURITY_HEADERS[name], "string");
      assert.ok(SECURITY_HEADERS[name].length > 0, name);
    }
  });

  it("CSP allows Grok injector, Turnstile, fonts, OG, and preview embeds", () => {
    const csp = CONTENT_SECURITY_POLICY;
    assert.match(csp, /script-src[^;]*https:\/\/grok\.com/);
    assert.match(csp, /script-src[^;]*https:\/\/challenges\.cloudflare\.com/);
    assert.match(csp, /script-src[^;]*https:\/\/vercel\.live/);
    assert.match(csp, /style-src[^;]*'unsafe-inline'/);
    assert.match(csp, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
    assert.match(csp, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
    assert.match(csp, /img-src[^;]*https:/);
    assert.match(csp, /connect-src[^;]*https:\/\/og\.grok\.me/);
    assert.match(csp, /frame-src[^;]*https:\/\/challenges\.cloudflare\.com/);
    assert.match(csp, /frame-ancestors[^;]*https:\/\/grok\.com/);
    assert.match(csp, /frame-ancestors[^;]*https:\/\/\*\.grok\.com/);
    // TanStack $tsr stream-barrier + auth popup completion need inline scripts.
    assert.match(csp, /script-src[^;]*'unsafe-inline'/);
    assert.equal(csp.includes("X-Frame-Options"), false);
  });

  it("vercel.json mirrors SECURITY_HEADERS exactly", () => {
    const raw = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    const edge = raw.headers?.[0]?.headers;
    assert.ok(Array.isArray(edge));
    const fromVercel = Object.fromEntries(edge.map((h) => [h.key, h.value]));
    assert.deepEqual(fromVercel, { ...SECURITY_HEADERS });
  });

  it("withSecurityHeaders stamps a document-like Response", () => {
    const res = withSecurityHeaders(
      new Response("<!doctype html><title>t</title>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    assert.ok(res instanceof Response);
    for (const name of SECURITY_HEADER_NAMES) {
      assert.equal(res.headers.get(name), SECURITY_HEADERS[name]);
    }
  });

  it("applySecurityHeaders writes onto a Headers bag", () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  });
});
