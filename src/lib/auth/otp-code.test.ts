import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OTP_LENGTH,
  cooldownSecondsLeft,
  isCompleteOtp,
  normalizeOtpInput,
} from "./otp-code.ts";

describe("one-time code input", () => {
  it("accepts exactly the configured number of digits", () => {
    assert.equal(OTP_LENGTH, 6);
    assert.equal(isCompleteOtp("123456"), true);
    assert.equal(isCompleteOtp(" 123456 "), true, "pasting the code often brings whitespace");
  });

  it("rejects anything that is not a full code", () => {
    assert.equal(isCompleteOtp("12345"), false);
    assert.equal(isCompleteOtp("1234567"), false);
    assert.equal(isCompleteOtp("12345a"), false);
    assert.equal(isCompleteOtp(""), false);
    assert.equal(isCompleteOtp("  "), false);
  });

  it("strips non-digits and caps the length while typing", () => {
    assert.equal(normalizeOtpInput("12a3"), "123");
    assert.equal(normalizeOtpInput("1234567890"), "123456");
    assert.equal(normalizeOtpInput("12 34 56"), "123456");
    assert.equal(normalizeOtpInput("abc"), "");
  });
});

describe("resend cooldown", () => {
  it("counts down and floors at zero", () => {
    const until = 30_000;
    assert.equal(cooldownSecondsLeft(until, 0), 30);
    assert.equal(cooldownSecondsLeft(until, 29_000), 1);
    assert.equal(cooldownSecondsLeft(until, 30_000), 0);
    assert.equal(cooldownSecondsLeft(until, 45_000), 0, "never negative");
  });
});
