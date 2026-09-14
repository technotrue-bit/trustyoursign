/**
 * The one-time-code email, as pure functions.
 *
 * Kept dependency-free and side-effect-free so the copy, the expiry wording and
 * the escaping can be tested without a mail provider or a request. The transport
 * lives in `send.server.ts`.
 */

import { SIGN_IN_LINK_EXPIRES_SECONDS } from "../auth/sign-in-link";

export type OtpPurpose = "sign-in" | "email-verification" | "forget-password" | "change-email";

export const OTP_SUBJECTS: Record<OtpPurpose, string> = {
  "sign-in": "Your Vault sign-in code",
  "email-verification": "Confirm your Vault email",
  "forget-password": "Your Vault reset code",
  "change-email": "Confirm your new Vault email",
};

export function otpSubject(purpose: OtpPurpose): string {
  return OTP_SUBJECTS[purpose] ?? OTP_SUBJECTS["sign-in"];
}

/** "5 minutes" / "1 minute" — used in both bodies. */
export function expiryWording(expiresInSeconds: number): string {
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export type OtpEmailInput = {
  otp: string;
  purpose: OtpPurpose;
  expiresInSeconds: number;
  /** Tap-to-sign-in URL. Carried on a sign-in message when one could be minted. */
  signInUrl?: string;
};

/** Plain-text body. */
export function otpText({ otp, purpose, expiresInSeconds, signInUrl }: OtpEmailInput): string {
  const lead =
    purpose === "sign-in"
      ? "Your sign-in code is"
      : purpose === "forget-password"
        ? "Your password-reset code is"
        : "Your confirmation code is";
  return [
    "The Vault",
    "",
    `${lead} ${otp}.`,
    "",
    ...(signInUrl
      ? [
          "Rather not type it? Open this link instead — it signs you in, works",
          `once, and lasts ${expiryWording(SIGN_IN_LINK_EXPIRES_SECONDS)}:`,
          signInUrl,
          "",
        ]
      : []),
    `It expires in ${expiryWording(expiresInSeconds)} and works once.`,
    "If you didn't ask for this, ignore this message — nobody can get in without the code.",
    "",
    "The Vault · kept by Devin Norris",
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The dark shell both messages share. `body` carries its own trailing newline. */
function messageShell(body: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#0c0b0a;color:#efe8dc;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 24px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a097">The Vault</p>
${body}    <p style="margin:28px 0 0;font-size:12px;color:#a8a097">The Vault · kept by Devin Norris</p>
  </div>
</body></html>`;
}

/**
 * The tappable button and the paste-this fallback. Inline styles only; the URL is
 * escaped in both places so a mangled token can never break the markup.
 */
function signInLinkBlock(url: string, expiresInSeconds: number): string {
  const href = escapeHtml(url);
  return `    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#c9c1b6">Rather not type it? Tap this and you are in — once, and only for the next ${expiryWording(expiresInSeconds)}:</p>
    <p style="margin:0 0 12px"><a href="${href}" style="display:inline-block;padding:14px 22px;border-radius:6px;background:#efe8dc;color:#0c0b0a;font-size:15px;font-weight:600;text-decoration:none">Sign in to The Vault</a></p>
    <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#a8a097">Button not working? Paste this into your browser:<br><span style="color:#c9c1b6;word-break:break-all">${href}</span></p>
`;
}

/**
 * HTML body. Inline styles only (mail clients strip <style>), the code in a
 * monospace cell so it is unambiguous when read off a phone.
 */
export function otpHtml(input: OtpEmailInput): string {
  const { otp, expiresInSeconds, signInUrl } = input;
  const lead =
    input.purpose === "sign-in"
      ? "Your sign-in code"
      : input.purpose === "forget-password"
        ? "Your password-reset code"
        : "Your confirmation code";
  return messageShell(
    `    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#efe8dc">${escapeHtml(lead)}:</p>
    <p style="margin:0 0 20px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;letter-spacing:0.28em;color:#efe8dc">${escapeHtml(otp)}</p>
` +
      (signInUrl ? signInLinkBlock(signInUrl, SIGN_IN_LINK_EXPIRES_SECONDS) : "") +
      `    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#c9c1b6">It expires in ${expiryWording(expiresInSeconds)} and works once.</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#c9c1b6">If you didn't ask for this, ignore this message — nobody can get in without the code.</p>
`,
  );
}

/** Subject for a link sent on its own. */
export function signInLinkSubject(): string {
  return "Your Vault sign-in link";
}

export type SignInLinkEmailInput = {
  url: string;
  expiresInSeconds: number;
};

/** Plain-text body for a link sent on its own. */
export function signInLinkText({ url, expiresInSeconds }: SignInLinkEmailInput): string {
  return [
    "The Vault",
    "",
    "Open this link and you are signed in:",
    url,
    "",
    `It works once and expires in ${expiryWording(expiresInSeconds)}.`,
    "If you didn't ask for this, ignore this message — nobody can get in without the link.",
    "",
    "The Vault · kept by Devin Norris",
  ].join("\n");
}

/** HTML body for a link sent on its own. */
export function signInLinkHtml({ url, expiresInSeconds }: SignInLinkEmailInput): string {
  return messageShell(
    signInLinkBlock(url, expiresInSeconds) +
      `    <p style="margin:0;font-size:14px;line-height:1.6;color:#c9c1b6">If you didn't ask for this, ignore this message — nobody can get in without the link.</p>
`,
  );
}
