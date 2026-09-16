import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expiryWording,
  otpHtml,
  otpSubject,
  otpText,
  signInLinkHtml,
  signInLinkSubject,
  signInLinkText,
} from "./otp-message.ts";
import {
  DEFAULT_EMAIL_ENDPOINT,
  emailDeliveryConfigured,
  emailSenderIsSandbox,
  parseEmailConfig,
} from "./send.server.ts";

describe("mail settings survive a dashboard's casing", () => {
  it("accepts a lowercased key and from (the Vercel footgun)", () => {
    assert.equal(
      emailDeliveryConfigured({ resend_api_key: "re_x", email_from: "vault@example.com" }),
      true,
    );
  });

  it("accepts mixed casing", () => {
    const config = parseEmailConfig({ resend_api_key: "re_x", Email_From: "vault@example.com" });
    assert.equal(config?.apiKey, "re_x");
    assert.equal(config?.from, "vault@example.com");
  });

  it("accepts every spelling of the optional settings too", () => {
    const config = parseEmailConfig({
      resend_api_key: "re_x",
      Email_From: "vault@example.com",
      email_reply_to: "reply@example.com",
      Email_Api_Url: "http://127.0.0.1:9099/emails",
    });
    assert.equal(config?.replyTo, "reply@example.com");
    assert.equal(config?.endpoint, "http://127.0.0.1:9099/emails");
  });

  it("prefers the canonical spelling when a host has both", () => {
    const config = parseEmailConfig({
      RESEND_API_KEY: "canonical",
      resend_api_key: "lowercase",
      EMAIL_FROM: "canonical@example.com",
      Email_From: "lowercase@example.com",
    });
    assert.equal(config?.apiKey, "canonical");
    assert.equal(config?.from, "canonical@example.com");
  });

  it("is still unconfigured when a value is blank, whatever the casing", () => {
    assert.equal(emailDeliveryConfigured({ resend_api_key: "   ", Email_From: "a@b.c" }), false);
    assert.equal(emailDeliveryConfigured({ RESEND_API_KEY: "re_x", email_from: "" }), false);
  });
});

describe("the code email", () => {
  it("subject reads per purpose", () => {
    assert.equal(otpSubject("sign-in"), "Your Trust Your Sign sign-in code");
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
    const html = otpHtml({
      otp: '<img src=x onerror="alert(1)">',
      purpose: "sign-in",
      expiresInSeconds: 300,
    });
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
    assert.equal(
      emailDeliveryConfigured({ RESEND_API_KEY: "   ", EMAIL_FROM: "vault@example.com" }),
      false,
    );
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

describe("the sign-in link the code email can carry", () => {
  const link =
    "https://trustyoursign.vercel.app/api/auth/magic-link/verify?token=abc&callbackURL=/account";

  it("rides in the same message as the code, in both bodies", () => {
    const text = otpText({
      otp: "481920",
      purpose: "sign-in",
      expiresInSeconds: 300,
      signInUrl: link,
    });
    assert.match(text, /481920/, "the code is still there to type");
    assert.match(text, /lasts 15 minutes/, "a tap gets longer than a code");

    const html = otpHtml({
      otp: "481920",
      purpose: "sign-in",
      expiresInSeconds: 300,
      signInUrl: link,
    });
    assert.match(html, /481920/);
    assert.match(
      html,
      /href="https:\/\/trustyoursign\.vercel\.app\/api\/auth\/magic-link\/verify\?token=abc&amp;callbackURL=\/account"/,
      "the button points straight at the verify endpoint",
    );
  });

  it("is simply absent when no link could be minted — never a dead button", () => {
    const html = otpHtml({ otp: "481920", purpose: "sign-in", expiresInSeconds: 300 });
    const text = otpText({ otp: "481920", purpose: "sign-in", expiresInSeconds: 300 });
    assert.equal(html.includes("magic-link"), false);
    assert.equal(html.includes("Sign in to Trust Your Sign"), false);
    assert.equal(text.includes("Open this link"), false);
  });

  it("escapes a hostile URL in the button and the paste-this line alike", () => {
    const html = otpHtml({
      otp: "1",
      purpose: "sign-in",
      expiresInSeconds: 300,
      signInUrl: 'https://x.test/"><script>alert(1)</script>',
    });
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&quot;&gt;&lt;script&gt;/);
  });

  it("stands alone when it is the whole message", () => {
    assert.match(signInLinkSubject(), /link/);
    assert.match(signInLinkText({ url: link, expiresInSeconds: 900 }), /expires in 15 minutes/);
    assert.match(signInLinkHtml({ url: link, expiresInSeconds: 900 }), /Sign in to Trust Your Sign/);
  });
});

describe("detecting a sandbox sender", () => {
  const base = { RESEND_API_KEY: "re_x" };

  it("spots the provider's sandbox domain, however EMAIL_FROM is written", () => {
    assert.equal(emailSenderIsSandbox({ ...base, EMAIL_FROM: "onboarding@resend.dev" }), true);
    assert.equal(
      emailSenderIsSandbox({ ...base, EMAIL_FROM: "Trust Your Sign <onboarding@resend.dev>" }),
      true,
    );
    assert.equal(emailSenderIsSandbox({ ...base, EMAIL_FROM: "MAIL@SEND.RESEND.DEV" }), true);
  });

  it("treats a domain of your own as real delivery", () => {
    assert.equal(emailSenderIsSandbox({ ...base, EMAIL_FROM: "vault@trustyoursign.com" }), false);
    assert.equal(
      emailSenderIsSandbox({ ...base, EMAIL_FROM: "Trust Your Sign <vault@trustyoursign.com>" }),
      false,
      "a display name never changes the answer",
    );
    assert.equal(emailSenderIsSandbox({ ...base, EMAIL_FROM: "vault@notresend.dev" }), false);
  });

  it("is false when delivery is not configured at all", () => {
    assert.equal(emailSenderIsSandbox({}), false);
    assert.equal(
      emailSenderIsSandbox({ EMAIL_FROM: "onboarding@resend.dev" }),
      false,
      "a from-address alone cannot deliver anything",
    );
  });
});
