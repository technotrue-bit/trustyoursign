import type { Sql } from "@/lib/db";
import { betaInviteHtml, betaInviteSubject, betaInviteText } from "@/lib/email/beta-invite";
import type { EmailMessage } from "@/lib/email/send.server";

export type BetaInviteResult =
  | { ok: true; role: "beta"; emailed: true }
  | { ok: true; role: "beta"; emailed: false; mailNote: string }
  | { ok: false; error: string };

export type BetaInviteMail = {
  configured: boolean;
  sandbox: boolean;
  send: (message: EmailMessage) => Promise<void>;
};

const MAIL_UNCONFIGURED = "Marked beta. Mail isn’t set up, so no letter went out.";
const MAIL_SANDBOX =
  "Marked beta. Mail is still in trial mode, so this address can’t receive a letter yet.";

function mailFailureNote(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Could not send the letter.";
  if (/bearer|api[_-]?key|re_[a-z0-9]/i.test(raw)) return "The letter could not be sent.";
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 180) : "The letter could not be sent.";
}

/**
 * Owner invite. Marks the signup beta, then letters that account's own email.
 * The address is read from the row — never from the caller.
 */
export async function inviteRegisteredAccountToBeta(
  sql: Sql,
  userId: string,
  mail: BetaInviteMail,
): Promise<BetaInviteResult> {
  const id = userId.trim();
  if (!id) return { ok: false, error: "No such account" };
  const found = await sql<{ id: string; email: string; name: string }>`
    select "id", "email", "name" from "user" where "id" = ${id} limit 1
  `;
  const account = found[0];
  if (!account?.email) return { ok: false, error: "No such account" };

  const updated = await sql<{ id: string }>`
    update "user"
    set "role" = ${"beta"}, "updatedAt" = now()
    where "id" = ${account.id}
    returning "id"
  `;
  if (!updated[0]) return { ok: false, error: "No such account" };

  if (!mail.configured) return { ok: true, role: "beta", emailed: false, mailNote: MAIL_UNCONFIGURED };
  if (mail.sandbox) return { ok: true, role: "beta", emailed: false, mailNote: MAIL_SANDBOX };

  try {
    await mail.send({
      to: account.email,
      subject: betaInviteSubject(),
      text: betaInviteText({ name: account.name, email: account.email }),
      html: betaInviteHtml({ name: account.name, email: account.email }),
    });
    return { ok: true, role: "beta", emailed: true };
  } catch (err) {
    return { ok: true, role: "beta", emailed: false, mailNote: mailFailureNote(err) };
  }
}
