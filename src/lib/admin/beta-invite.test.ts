import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { betaInviteHtml, betaInviteSubject, betaInviteText } from "../email/beta-invite.ts";
import type { EmailMessage } from "../email/send.server.ts";
import { inviteRegisteredAccountToBeta, type BetaInviteMail } from "./invite-beta.ts";

const ADA = { id: "ada-1", email: "ada@example.com", name: "Ada Lovelace" };

function fakeSql(account: { id: string; email: string; name: string } | null) {
  const calls: string[] = [];
  const sql = (async (strings: TemplateStringsArray) => {
    const text = strings.join(" ");
    calls.push(text);
    if (/update "user"/i.test(text)) return account ? [{ id: account.id }] : [];
    if (/from "user"/i.test(text)) return account ? [account] : [];
    return [];
  }) as Sql;
  sql.query = async () => [];
  return { sql, calls };
}

function mail(partial: Partial<BetaInviteMail> & { send?: BetaInviteMail["send"] }): {
  mail: BetaInviteMail;
  sent: EmailMessage[];
} {
  const sent: EmailMessage[] = [];
  return {
    sent,
    mail: {
      configured: partial.configured ?? true,
      sandbox: partial.sandbox ?? false,
      send:
        partial.send ??
        (async (message) => {
          sent.push(message);
        }),
    },
  };
}

describe("closed-beta invite letter", () => {
  it("names the house and the site, and carries no chart or secret", () => {
    const text = betaInviteText({ name: "Ada <script>", email: "ada@example.com" });
    assert.match(betaInviteSubject(), /closed beta/i);
    assert.match(text, /https:\/\/trustyoursign\.com/);
    assert.match(text, /Ada <script>/);
    assert.equal(/password|token|birth|degree/i.test(text), false);
    const html = betaInviteHtml({ name: "Ada <script>", email: "ada@example.com" });
    assert.match(html, /Ada &lt;script&gt;/);
    assert.equal(html.includes("<script>"), false);
  });
});

describe("inviteRegisteredAccountToBeta", () => {
  it("marks the signup beta and letters that row's email", async () => {
    const { sql, calls } = fakeSql(ADA);
    const box = mail({});
    const result = await inviteRegisteredAccountToBeta(sql, " ada-1 ", box.mail);
    assert.deepEqual(result, { ok: true, role: "beta", emailed: true });
    assert.match(calls[0], /from "user"/);
    assert.match(calls[1], /update "user"/);
    assert.equal(box.sent.length, 1);
    assert.equal(box.sent[0]?.to, "ada@example.com");
  });

  it("does not write or send when the signup is missing", async () => {
    const { sql, calls } = fakeSql(null);
    const box = mail({});
    const result = await inviteRegisteredAccountToBeta(sql, "missing", box.mail);
    assert.deepEqual(result, { ok: false, error: "No such account" });
    assert.equal(calls.some((text) => /update "user"/i.test(text)), false);
    assert.equal(box.sent.length, 0);
  });

  it("marks beta without sending when mail is not configured", async () => {
    const { sql } = fakeSql(ADA);
    const box = mail({ configured: false });
    const result = await inviteRegisteredAccountToBeta(sql, ADA.id, box.mail);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.emailed, false);
    assert.equal(box.sent.length, 0);
  });

  it("marks beta without sending while the sender is a trial sandbox", async () => {
    const { sql } = fakeSql(ADA);
    const box = mail({ sandbox: true });
    const result = await inviteRegisteredAccountToBeta(sql, ADA.id, box.mail);
    assert.equal(result.ok, true);
    if (result.ok && !result.emailed) assert.match(result.mailNote, /trial mode/);
    assert.equal(box.sent.length, 0);
  });

  it("keeps the beta mark and reports a letter that failed", async () => {
    const { sql } = fakeSql(ADA);
    const box = mail({
      send: async () => {
        throw new Error("Email provider rejected the message (403): domain");
      },
    });
    const result = await inviteRegisteredAccountToBeta(sql, ADA.id, box.mail);
    assert.deepEqual(result, {
      ok: true,
      role: "beta",
      emailed: false,
      mailNote: "Email provider rejected the message (403): domain",
    });
  });
});
