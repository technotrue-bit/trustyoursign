import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  buildFeedbackEmail,
  feedbackMailtoHref,
  feedbackSubject,
  validateFeedback,
} from "./feedback.ts";
import { FEEDBACK_EMAIL } from "./legal.ts";
import {
  resetFeedbackRateLimit,
  submitFeedback,
  type FeedbackSubmitResult,
} from "./feedback-submit.ts";

describe("feedback validation", () => {
  it("requires kind and a real message", () => {
    assert.equal(validateFeedback({}).ok, false);
    assert.equal(validateFeedback({ kind: "bug", message: "short" }).ok, false);
    const ok = validateFeedback({
      kind: "suggestion",
      message: "The fly-through felt inverted on mobile.",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value.kind, "suggestion");
      assert.equal(ok.value.replyEmail, null);
    }
  });

  it("rejects a bad optional reply email and accepts a good one", () => {
    const bad = validateFeedback({
      kind: "bug",
      message: "Wheel labels overlap on a narrow phone.",
      replyEmail: "not-an-email",
    });
    assert.equal(bad.ok, false);

    const good = validateFeedback({
      kind: "bug",
      message: "Wheel labels overlap on a narrow phone.",
      replyEmail: " Visitor@Example.COM ",
      deviceNote: "iPhone Safari",
    });
    assert.equal(good.ok, true);
    if (good.ok) {
      assert.equal(good.value.replyEmail, "visitor@example.com");
      assert.equal(good.value.deviceNote, "iPhone Safari");
    }
  });

  it("builds a subject and mailto aimed at the AgentMail inbox", () => {
    assert.equal(feedbackSubject("bug"), "[TrustYourSign feedback] bug");
    assert.equal(feedbackSubject("suggestion"), "[TrustYourSign feedback] suggestion");
    assert.match(feedbackMailtoHref("bug"), new RegExp(`^mailto:${FEEDBACK_EMAIL}`));
    assert.equal(FEEDBACK_EMAIL, "tys-feedback@agentmail.to");
  });

  it("puts kind, UA, and message in the outbound body and sets Reply-To", () => {
    const mail = buildFeedbackEmail({
      kind: "bug",
      message: 'Broke on <script>alert(1)</script>',
      replyEmail: "you@example.com",
      deviceNote: "Pixel Chrome",
      userAgent: "TestAgent/1.0",
    });
    assert.equal(mail.to, FEEDBACK_EMAIL);
    assert.equal(mail.subject, "[TrustYourSign feedback] bug");
    assert.equal(mail.replyTo, "you@example.com");
    assert.match(mail.text, /Kind: bug/);
    assert.match(mail.text, /User-Agent: TestAgent\/1\.0/);
    assert.match(mail.text, /Broke on/);
    assert.equal(mail.html.includes("<script>"), false);
    assert.match(mail.html, /&lt;script&gt;/);
  });
});

describe("feedback submit", () => {
  beforeEach(() => {
    resetFeedbackRateLimit();
  });

  it("returns a clear 503 when email is not configured — never pretends success", async () => {
    let sent = 0;
    const result: FeedbackSubmitResult = await submitFeedback(
      { kind: "bug", message: "Something clearly broke in the sky." },
      {
        clientKey: "test-unconfigured",
        env: {},
        sendEmail: async () => {
          sent += 1;
        },
      },
    );
    assert.deepEqual(result, {
      ok: false,
      error:
        "Feedback email is not configured on this host (need RESEND_API_KEY and EMAIL_FROM). Use the mailto link instead.",
      status: 503,
    });
    assert.equal(sent, 0);
  });

  it("sends when configured and surfaces provider failure without inventing success", async () => {
    const sent: unknown[] = [];
    const ok = await submitFeedback(
      {
        kind: "suggestion",
        message: "A quieter enter for returning visitors would help.",
        replyEmail: "beta@example.com",
        userAgent: "UnitTest",
      },
      {
        clientKey: "test-ok",
        env: { RESEND_API_KEY: "re_x", EMAIL_FROM: "vault@trustyoursign.com" },
        sendEmail: async (msg) => {
          sent.push(msg);
        },
      },
    );
    assert.deepEqual(ok, { ok: true });
    assert.equal(sent.length, 1);
    const msg = sent[0] as { to: string; replyTo?: string; subject: string };
    assert.equal(msg.to, FEEDBACK_EMAIL);
    assert.equal(msg.replyTo, "beta@example.com");
    assert.equal(msg.subject, "[TrustYourSign feedback] suggestion");

    const fail = await submitFeedback(
      { kind: "bug", message: "Still broken after the last note." },
      {
        clientKey: "test-fail",
        env: { RESEND_API_KEY: "re_x", EMAIL_FROM: "vault@trustyoursign.com" },
        sendEmail: async () => {
          throw new Error("Email provider rejected the message (429): quota");
        },
      },
    );
    assert.equal(fail.ok, false);
    if (!fail.ok) {
      assert.equal(fail.status, 502);
      assert.match(fail.error, /Could not send feedback/);
    }
  });

  it("rate-limits after a handful of notes from the same client key", async () => {
    const env = { RESEND_API_KEY: "re_x", EMAIL_FROM: "vault@trustyoursign.com" };
    const sendEmail = async () => {};
    for (let i = 0; i < 5; i++) {
      const r = await submitFeedback(
        { kind: "bug", message: `Repeated note number ${i} with enough text.` },
        { clientKey: "same-ip", env, sendEmail },
      );
      assert.equal(r.ok, true);
    }
    const blocked = await submitFeedback(
      { kind: "bug", message: "One more that should be refused by the soft ceiling." },
      { clientKey: "same-ip", env, sendEmail },
    );
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.status, 429);
  });
});
