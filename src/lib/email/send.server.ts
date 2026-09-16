import {
  otpHtml,
  otpSubject,
  otpText,
  resetPasswordHtml,
  resetPasswordSubject,
  resetPasswordText,
  signInLinkHtml,
  signInLinkSubject,
  signInLinkText,
  type OtpPurpose,
} from "./otp-message";
import { SIGN_IN_LINK_EXPIRES_SECONDS } from "../auth/sign-in-link";

/**
 * Outbound email for sign-in codes (server-only).
 *
 * Transport is whichever HTTP API the host is configured for — today Resend,
 * which needs no SDK (one `fetch`, no dependency to keep patched). To move to
 * another provider, replace `sendEmail` only: everything above it deals in
 * `EmailMessage`, and `parseEmailConfig` is the single place that reads env.
 *
 * Nothing here runs at import time, so importing this module is safe.
 */

export type EmailConfig = { apiKey: string; from: string; replyTo?: string; endpoint: string };

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Default provider endpoint (Resend). Override with `EMAIL_API_URL`. */
export const DEFAULT_EMAIL_ENDPOINT = "https://api.resend.com/emails";

/**
 * Read one setting, tolerating the spelling the host actually received.
 *
 * Environment variable names are case-sensitive, and a dashboard makes it easy
 * to save `resend_api_key` or `Email_From` where the docs say `RESEND_API_KEY`
 * and `EMAIL_FROM`. The misspelling is invisible — the app just reports "not
 * configured" and hides the feature, which is a baffling failure for a
 * plausible typo. So match names case-insensitively, with the canonical
 * uppercase spelling winning when both are present.
 */
export function readEnvSetting(
  env: Record<string, string | undefined>,
  canonicalName: string,
): string | undefined {
  const canonical = env[canonicalName]?.trim();
  if (canonical) return canonical;
  const wanted = canonicalName.toLowerCase();
  for (const [key, value] of Object.entries(env)) {
    if (key.toLowerCase() !== wanted) continue;
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/**
 * Read the delivery config from an env bag. Returns null when unconfigured.
 *
 * `EMAIL_API_URL` points the same request shape at a different endpoint — a
 * regional host, a self-hosted gateway, or a stub in a test.
 */
export function parseEmailConfig(env: Record<string, string | undefined>): EmailConfig | null {
  const apiKey = readEnvSetting(env, "RESEND_API_KEY");
  const from = readEnvSetting(env, "EMAIL_FROM");
  if (!apiKey || !from) return null;
  const replyTo = readEnvSetting(env, "EMAIL_REPLY_TO");
  const endpoint = readEnvSetting(env, "EMAIL_API_URL") || DEFAULT_EMAIL_ENDPOINT;
  return replyTo ? { apiKey, from, replyTo, endpoint } : { apiKey, from, endpoint };
}

/** True when one-time-code delivery can actually happen. */
export function emailDeliveryConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return parseEmailConfig(env) !== null;
}

/**
 * Sender domains that are a provider's SANDBOX: the mail is accepted but only
 * deliverable to the provider account's own address. Resend's `resend.dev` is
 * one, and a host configured with it can promise nobody else a code — every
 * other recipient is refused.
 */
const SANDBOX_SENDER_DOMAINS = ["resend.dev"] as const;

/** The bare address out of an `EMAIL_FROM` value (`Name <a@b.c>` or `a@b.c`). */
function senderAddress(from: string): string {
  const bracketed = from.match(/<([^>]+)>/);
  return (bracketed ? bracketed[1] : from).trim().toLowerCase();
}

/**
 * True when configured delivery can only reach the provider account's own
 * address. The sign-in UI must not tell a visitor a code is on its way when the
 * host cannot deliver it — that is exactly how a one-line misconfiguration
 * becomes a silent product outage.
 */
export function emailSenderIsSandbox(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const config = parseEmailConfig(env);
  if (!config) return false;
  const address = senderAddress(config.from);
  const domain = address.slice(address.lastIndexOf("@") + 1);
  return SANDBOX_SENDER_DOMAINS.some(
    (sandbox) => domain === sandbox || domain.endsWith(`.${sandbox}`),
  );
}

const SEND_TIMEOUT_MS = 10_000;

/**
 * Send one message. Throws with a status + provider message on failure — never
 * with the key. The caller decides whether a failure breaks the request.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const config = parseEmailConfig(process.env);
  if (!config) {
    throw new Error(
      "Email delivery is not configured — set RESEND_API_KEY and EMAIL_FROM in the host environment.",
    );
  }

  const body: Record<string, unknown> = {
    from: config.from,
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
  if (config.replyTo) body.reply_to = config.replyTo;

  let res: Response;
  try {
    res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not reach the email provider: ${reason}`);
  }

  if (!res.ok) {
    // Provider errors are useful (bad from-address, unverified domain, quota),
    // and none of them echo the key back.
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Email provider rejected the message (${res.status}): ${detail}`);
  }
}

/** Build and send the one-time code email for a sign-in attempt. */
export async function sendOtpEmail(opts: {
  email: string;
  otp: string;
  type: OtpPurpose;
  expiresInSeconds: number;
  /** When present, the same message also carries a one-tap sign-in button. */
  signInUrl?: string;
}): Promise<void> {
  const input = {
    otp: opts.otp,
    purpose: opts.type,
    expiresInSeconds: opts.expiresInSeconds,
    signInUrl: opts.signInUrl,
  };
  await sendEmail({
    to: opts.email,
    subject: otpSubject(input.purpose),
    text: otpText(input),
    html: otpHtml(input),
  });
}

/** Build and send the password-reset link email (Better Auth sendResetPassword). */
export async function sendResetPasswordEmail(opts: { email: string; url: string }): Promise<void> {
  await sendEmail({
    to: opts.email,
    subject: resetPasswordSubject(),
    text: resetPasswordText({ url: opts.url }),
    html: resetPasswordHtml({ url: opts.url }),
  });
}

/**
 * A sign-in link with no code — the message for a link minted outside a code
 * sign-in (a direct call to `/sign-in/magic-link`).
 */
export async function sendSignInLinkEmail(opts: { email: string; url: string }): Promise<void> {
  const input = { url: opts.url, expiresInSeconds: SIGN_IN_LINK_EXPIRES_SECONDS };
  await sendEmail({
    to: opts.email,
    subject: signInLinkSubject(),
    text: signInLinkText(input),
    html: signInLinkHtml(input),
  });
}
