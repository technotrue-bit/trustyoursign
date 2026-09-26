import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, beforeEach } from "node:test";
import {
  buildFeedbackEmail,
  feedbackMailtoHref,
  feedbackSubject,
  validateFeedback,
} from "./feedback.ts";
import { FEEDBACK_EMAIL } from "./legal.ts";
import {
  createMemoryFeedbackRateLimitStore,
  createPostgresFeedbackRateLimitStore,
  FEEDBACK_RATE_MAX,
  FEEDBACK_RATE_WINDOW_MS,
  hashFeedbackClientKey,
} from "./feedback-rate-limit.ts";
import {
  submitFeedback,
  type FeedbackSubmitResult,
} from "./feedback-submit.ts";
import { feedbackMethodNotAllowedResponse, handleFeedbackPost } from "./feedback-http.ts";
import type { Sql } from "./db.ts";

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
  let rateLimitStore: ReturnType<typeof createMemoryFeedbackRateLimitStore>;

  beforeEach(() => {
    rateLimitStore = createMemoryFeedbackRateLimitStore();
  });

  it("returns a clear 503 when email is not configured — never pretends success", async () => {
    let sent = 0;
    const result: FeedbackSubmitResult = await submitFeedback(
      { kind: "bug", message: "Something clearly broke in the sky." },
      {
        clientKey: "test-unconfigured",
        env: {},
        rateLimitStore,
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
        rateLimitStore,
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
        rateLimitStore,
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
    for (let i = 0; i < FEEDBACK_RATE_MAX; i++) {
      const r = await submitFeedback(
        { kind: "bug", message: `Repeated note number ${i} with enough text.` },
        { clientKey: "same-ip", env, sendEmail, rateLimitStore },
      );
      assert.equal(r.ok, true);
    }
    const blocked = await submitFeedback(
      { kind: "bug", message: "One more that should be refused by the soft ceiling." },
      { clientKey: "same-ip", env, sendEmail, rateLimitStore },
    );
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.status, 429);
  });

  it("turns a throwing rate-limit store into 503 and does not send mail", async () => {
    let sent = 0;
    const result = await submitFeedback(
      { kind: "bug", message: "The sky froze after I opened the note form." },
      {
        clientKey: "limiter-down",
        env: { RESEND_API_KEY: "re_x", EMAIL_FROM: "vault@trustyoursign.com" },
        rateLimitStore: {
          consume() {
            throw new Error("connection refused");
          },
        },
        sendEmail: async () => {
          sent += 1;
        },
      },
    );
    assert.equal(sent, 0);
    assert.deepEqual(result, {
      ok: false,
      error: "Feedback is temporarily unavailable. Try again in a bit, or email directly.",
      status: 503,
    });
  });

  it("does not share budget across different client keys", async () => {
    const env = { RESEND_API_KEY: "re_x", EMAIL_FROM: "vault@trustyoursign.com" };
    const sendEmail = async () => {};
    for (let i = 0; i < FEEDBACK_RATE_MAX; i++) {
      const r = await submitFeedback(
        { kind: "bug", message: `Note A ${i} with enough text here.` },
        { clientKey: "ip-a", env, sendEmail, rateLimitStore },
      );
      assert.equal(r.ok, true);
    }
    const other = await submitFeedback(
      { kind: "bug", message: "Note from a different place should still send." },
      { clientKey: "ip-b", env, sendEmail, rateLimitStore },
    );
    assert.equal(other.ok, true);
  });
});

describe("feedback durable rate limit store", () => {
  it("hashes client keys so raw IPs are not the table key", () => {
    const a = hashFeedbackClientKey("203.0.113.9");
    const b = hashFeedbackClientKey("203.0.113.9");
    const c = hashFeedbackClientKey("198.51.100.1");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 64);
    assert.equal(a.includes("203"), false);
  });

  it("memory store resets the window after FEEDBACK_RATE_WINDOW_MS", () => {
    const store = createMemoryFeedbackRateLimitStore();
    const t0 = 1_000_000;
    for (let i = 0; i < FEEDBACK_RATE_MAX; i++) {
      assert.equal(store.consume("window-ip", t0), true);
    }
    assert.equal(store.consume("window-ip", t0), false);
    assert.equal(store.consume("window-ip", t0 + FEEDBACK_RATE_WINDOW_MS), true);
  });

  it("postgres store upserts and enforces the budget without a live DB", async () => {
    type Row = { hit_count: number; window_start_ms: number; client_key_hash: string };
    const table = new Map<string, Row>();

    const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
      if (/^\s*delete from feedback_rate_limit/i.test(text)) {
        table.clear();
        return [] as T[];
      }
      if (!/insert into feedback_rate_limit/i.test(text)) {
        throw new Error(`unexpected sql: ${text}`);
      }
      const hash = String(params[0]);
      const now = Number(params[1]);
      // Tagged template rebuilds $1,$2,$3,$4,$5 for hash, now, window, now, window branches —
      // createPostgresFeedbackRateLimitStore passes: hash, now, WINDOW, now, WINDOW, now
      // Actually looking at the template:
      // values (${hash}, ${now}, 1)
      // on conflict ... ${FEEDBACK_RATE_WINDOW_MS} <= ${now} ... ${now}
      // ... ${FEEDBACK_RATE_WINDOW_MS} <= ${now} then 1 else hit_count + 1
      // So params: [hash, now, WINDOW, now, now, WINDOW, now]
      const existing = table.get(hash);
      if (!existing || existing.window_start_ms + FEEDBACK_RATE_WINDOW_MS <= now) {
        const row = { client_key_hash: hash, window_start_ms: now, hit_count: 1 };
        table.set(hash, row);
        return [{ hit_count: 1 }] as T[];
      }
      existing.hit_count += 1;
      return [{ hit_count: existing.hit_count }] as T[];
    };

    const sql = Object.assign(
      async <T = Record<string, unknown>>(
        strings: TemplateStringsArray,
        ...values: unknown[]
      ): Promise<T[]> => {
        let text = strings[0] ?? "";
        for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
        return run<T>(text, values);
      },
      {
        query: <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
          run<T>(text, params),
      },
    ) as Sql;

    const store = createPostgresFeedbackRateLimitStore(sql);
    const t0 = 5_000_000;
    for (let i = 0; i < FEEDBACK_RATE_MAX; i++) {
      assert.equal(await store.consume("pg-ip", t0), true);
    }
    assert.equal(await store.consume("pg-ip", t0), false);
    assert.equal(await store.consume("pg-ip", t0 + FEEDBACK_RATE_WINDOW_MS), true);
    assert.equal(table.size, 1);
    const only = [...table.values()][0]!;
    assert.equal(only.client_key_hash, hashFeedbackClientKey("pg-ip"));
  });

  it("postgres store fails closed when SQL throws", async () => {
    const sql = Object.assign(
      async () => {
        throw new Error("connection refused");
      },
      { query: async () => {
        throw new Error("connection refused");
      } },
    ) as unknown as Sql;
    let saw = 0;
    const store = createPostgresFeedbackRateLimitStore(sql, {
      onError: () => {
        saw += 1;
      },
    });
    assert.equal(await store.consume("x"), false);
    assert.equal(saw, 1);
  });
});

describe("feedback HTTP methods", () => {
  const env = { RESEND_API_KEY: "re_x", EMAIL_FROM: "vault@trustyoursign.com" };

  function post(body: string) {
    return new Request("https://trustyoursign.com/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  }

  it("answers GET, OPTIONS, HEAD, and other methods with 405 and never a send status", async () => {
    for (const method of ["GET", "OPTIONS", "PUT", "PATCH", "DELETE"] as const) {
      const res = feedbackMethodNotAllowedResponse(method);
      assert.equal(res.status, 405, method);
      assert.equal(res.headers.get("allow"), "POST");
      assert.match(res.headers.get("content-type") ?? "", /json/);
      const body = (await res.json()) as { ok: boolean; status: number; error: string };
      assert.equal(body.ok, false);
      assert.equal(body.status, 405);
      assert.match(body.error, /POST/);
    }

    const head = feedbackMethodNotAllowedResponse("HEAD");
    assert.equal(head.status, 405);
    assert.equal(head.headers.get("allow"), "POST");
    assert.equal(await head.text(), "");
  });

  it("rejects an invalid POST before the limiter or the mailer", async () => {
    let consumed = 0;
    let sent = 0;
    const deps = {
      env,
      clientKey: "probe",
      rateLimitStore: {
        consume() {
          consumed += 1;
          return true;
        },
      },
      sendEmail: async () => {
        sent += 1;
      },
    };

    const badJson = await handleFeedbackPost(post("not-json"), deps);
    assert.equal(badJson.status, 400);
    const badJsonBody = (await badJson.json()) as { error: string };
    assert.match(badJsonBody.error, /JSON/);

    const badKind = await handleFeedbackPost(post("{}"), deps);
    assert.equal(badKind.status, 400);
    const badKindBody = (await badKind.json()) as { error: string; status: number };
    assert.equal(badKindBody.error, "Pick bug or suggestion.");
    assert.equal(badKindBody.status, 400);

    assert.equal(consumed, 0);
    assert.equal(sent, 0);
  });

  it("keeps 502 for a real submit the provider rejects, and 503 when the limiter throws", async () => {
    const note = JSON.stringify({
      kind: "bug",
      message: "Labels overlap after opening the support sheet.",
    });

    let sent = 0;
    const rejected = await handleFeedbackPost(post(note), {
      env,
      clientKey: "real-submit",
      rateLimitStore: createMemoryFeedbackRateLimitStore(),
      sendEmail: async () => {
        sent += 1;
        throw new Error("Email provider rejected the message (429): quota");
      },
    });
    assert.equal(sent, 1);
    assert.equal(rejected.status, 502);
    const rejectedBody = (await rejected.json()) as { ok: boolean; status: number; error: string };
    assert.equal(rejectedBody.ok, false);
    assert.equal(rejectedBody.status, 502);
    assert.match(rejectedBody.error, /Could not send feedback/);

    let sentAfter = 0;
    const limited = await handleFeedbackPost(post(note), {
      env,
      clientKey: "limiter-down",
      rateLimitStore: {
        consume() {
          throw new Error("connection refused");
        },
      },
      sendEmail: async () => {
        sentAfter += 1;
      },
    });
    assert.equal(sentAfter, 0);
    assert.equal(limited.status, 503);
    const limitedBody = (await limited.json()) as { status: number };
    assert.equal(limitedBody.status, 503);
  });
});

describe("feedback route registers non-POST handlers", () => {
  it("lists GET, OPTIONS, HEAD, and ANY beside POST", () => {
    const src = readFileSync(new URL("../routes/api/feedback.ts", import.meta.url), "utf8");
    for (const method of ["POST", "GET", "OPTIONS", "PUT", "PATCH", "DELETE", "HEAD", "ANY"]) {
      assert.match(src, new RegExp(`\\b${method}:`));
    }
    assert.match(src, /handleFeedbackPost/);
    assert.match(src, /feedbackMethodNotAllowedResponse/);
  });
});
