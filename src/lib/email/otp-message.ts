/**
 * The one-time-code email, as pure functions.
 *
 * Kept dependency-free and side-effect-free so the copy, the expiry wording and
 * the escaping can be tested without a mail provider or a request. The transport
 * lives in `send.server.ts`.
 */

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
};

/** Plain-text body. */
export function otpText({ otp, purpose, expiresInSeconds }: OtpEmailInput): string {
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

/**
 * HTML body. Inline styles only (mail clients strip <style>), the code in a
 * monospace cell so it is unambiguous when read off a phone.
 */
export function otpHtml(input: OtpEmailInput): string {
  const { otp, expiresInSeconds } = input;
  const lead =
    input.purpose === "sign-in"
      ? "Your sign-in code"
      : input.purpose === "forget-password"
        ? "Your password-reset code"
        : "Your confirmation code";
  return `<!doctype html>
<html><body style="margin:0;background:#0c0b0a;color:#efe8dc;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 24px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a097">The Vault</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#efe8dc">${escapeHtml(lead)}:</p>
    <p style="margin:0 0 20px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;letter-spacing:0.28em;color:#efe8dc">${escapeHtml(otp)}</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#c9c1b6">It expires in ${expiryWording(expiresInSeconds)} and works once.</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#c9c1b6">If you didn't ask for this, ignore this message — nobody can get in without the code.</p>
    <p style="margin:28px 0 0;font-size:12px;color:#a8a097">The Vault · kept by Devin Norris</p>
  </div>
</body></html>`;
}
