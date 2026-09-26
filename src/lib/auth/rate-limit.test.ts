import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { authRateLimit } from "./rate-limit.ts";

describe("auth rate limit storage", () => {
  it("uses the shared database, not process memory", () => {
    assert.equal(authRateLimit.enabled, true);
    assert.equal(authRateLimit.storage, "database");
  });

  it("keeps the OTP send cap tighter than verify", () => {
    const send = authRateLimit.customRules["/email-otp/send-verification-otp"];
    const verify = authRateLimit.customRules["/sign-in/email-otp"];
    assert.equal(send.window, 60);
    assert.equal(send.max, 3);
    assert.ok(verify.max > send.max);
  });

  it("migration creates the Better Auth rateLimit table", () => {
    const sql = readFileSync(
      new URL("../../../migrations/0010_auth_rate_limit.sql", import.meta.url),
      "utf8",
    );
    assert.match(sql, /create table if not exists "rateLimit"/);
    assert.match(sql, /"key" text not null unique/);
    assert.match(sql, /"count" integer not null/);
    assert.match(sql, /"lastRequest" bigint not null/);
    assert.match(sql, /No Redis/);
  });
});
