import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hostCookieSetOptions } from "./session-cookie-options.ts";
import { SESSION_TOKEN_COOKIE } from "./session-cookie-names.ts";
import {
  SESSION_EXPIRES_IN_SEC,
  STICKY_STORAGE_TTL_MS,
} from "./session-lifetime.ts";

describe("hostCookieSetOptions", () => {
  it("omits domain and keeps Max-Age for __Host- session cookies", () => {
    const opts = hostCookieSetOptions(SESSION_TOKEN_COOKIE, {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_EXPIRES_IN_SEC,
      domain: "evil.example",
    });
    assert.equal(opts.path, "/");
    assert.equal(opts.secure, true);
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.maxAge, SESSION_EXPIRES_IN_SEC);
    assert.equal("domain" in opts, false);
  });

  it("defaults sameSite to lax and path to /", () => {
    const opts = hostCookieSetOptions("__Host-x", { maxAge: 60 });
    assert.equal(opts.path, "/");
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.maxAge, 60);
  });
});

describe("session lifetime alignment", () => {
  it("sticky TTL matches durable session Max-Age", () => {
    assert.equal(STICKY_STORAGE_TTL_MS, SESSION_EXPIRES_IN_SEC * 1000);
    assert.equal(SESSION_EXPIRES_IN_SEC, 60 * 60 * 24 * 30);
  });
});
