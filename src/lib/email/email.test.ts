import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expiryWording, otpHtml, otpSubject, otpText } from "./otp-message.ts";
import { DEFAULT_EMAIL_ENDPOINT, emailDeliveryConfigured, parseEmailConfig } from "./send.server.ts";

describe("the code email", () => {
  it("subject reads per purpose", () => {
    assert.equal(otpSubject("sign-in"), "Your Vault sign-in code");
    assert.match(otpSubject("forget-password"), /reset/);
  });

  it("text leads with the code and states the expiry and the one-use rule", () => {
    const text = otpText({ otp: "481920", purpose: "sign-in", expiresInSeconds: 300 });
    assert.match(text, /481920/);
    assert.match(text, /expires in 5 minutes/);
    assert.match(text, /works once/);
    assert.match(text, /didn't ask for this/);
  });

  it("never promises anything the code does not do", () => {
    const text = otpText({ otp: "1", purpose: "sign-in", expiresInSeconds: 300 });
    assert.equal(/guarantee|secure your account|as an AI/i.test(text), false);
  });

  it("expiry wording is singular at one minute", () => {
    assert.equal(expiryWording(60), "1 minute");
    assert.equal(expiryWording(120), "2 minutes");
    assert.equal(expiryWording(30), "1 minute", "never says 0 minutes");
  });

  it("html carries the code and escapes interpolated content", () => {
    const html = otpHtml({ otp: "481920", purpose: "sign-in", expiresInSeconds: 300 });
    assert.match(html, /481920/);
    assert.match(html, /expires in 5 minutes/);
  });

  it("escapes markup so a hostile address cannot inject into the body", () => {
    // The address is not interpolated into the body today; this pins the helper
    // that guards it if it ever is.
    const html = otpHtml({ otp: '<img src=x onerror="alert(1)">', purpose: "sign-in", expiresInSeconds: 300 });
    assert.equal(html.includes("<img src=x"), false);
    assert.match(html, /&lt;img src=x/);
  });
});

describe("delivery configuration", () => {
  it("requires BOTH the api key and a from-address", () => {
    assert.equal(emailDeliveryConfigured({}), false);
    assert.equal(emailDeliveryConfigured({ RESEND_API_KEY: "re_x" }), false);
    assert.equal(emailDeliveryConfigured({ EMAIL_FROM: "vault@example.com" }), false);
    assert.equal(
      emailDeliveryConfigured({ RESEND_API_KEY: "re_x", EMAIL_FROM: "vault@example.com" }),
      true,
    );
  });

  it("treats blank or whitespace values as unset (deploy UIs make these easy to misconfigure)", () => {
    assert.equal(emailDeliveryConfigured({ RESEND_API_KEY: "   ", EMAIL_FROM: "vault@example.com" }), false);
    assert.equal(emailDeliveryConfigured({ RESEND_API_KEY: "re_x", EMAIL_FROM: "  " }), false);
  });

  it("keeps an optional reply-to, and omits it when absent", () => {
    assert.deepEqual(parseEmailConfig({ RESEND_API_KEY: "k", EMAIL_FROM: "a@b.c" }), {
      apiKey: "k",
      from: "a@b.c",
      endpoint: DEFAULT_EMAIL_ENDPOINT,
    });
    assert.deepEqual(
      parseEmailConfig({ RESEND_API_KEY: "k", EMAIL_FROM: "a@b.c", EMAIL_REPLY_TO: "r@b.c" }),
      { apiKey: "k", from: "a@b.c", replyTo: "r@b.c", endpoint: DEFAULT_EMAIL_ENDPOINT },
    );
  });

  it("points at a different endpoint when EMAIL_API_URL is set (gateway or test stub)", () => {
    assert.equal(
      parseEmailConfig({
        RESEND_API_KEY: "k",
        EMAIL_FROM: "a@b.c",
        EMAIL_API_URL: "http://127.0.0.1:9099/emails",
      })?.endpoint,
      "http://127.0.0.1:9099/emails",
    );
  });
});
