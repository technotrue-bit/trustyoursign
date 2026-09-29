/**
 * Closed-beta invite letter. Pure copy — the transport is `sendEmail`.
 * No codes, no chart, no birth data.
 */

const SITE = "https://trustyoursign.com";

export function betaInviteSubject(): string {
  return "You're in the closed beta — Trust Your Sign";
}

/** A display name worth greeting. An email-shaped name is not one. */
export function betaInviteGreeting(name: string, email: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === email.trim().toLowerCase()) return null;
  if (trimmed.includes("@")) return null;
  return trimmed;
}

export function betaInviteText(input: { name: string; email: string }): string {
  const who = betaInviteGreeting(input.name, input.email);
  return [
    "Trust Your Sign",
    "",
    who ? `${who}, you're in the closed beta.` : "You're in the closed beta.",
    "",
    `Sign in with this email at ${SITE}.`,
    "The house is still being built. What you save can change between versions.",
    "",
    "If you didn't expect this, you can ignore it.",
    "",
    "Trust Your Sign · kept by Devin Norris",
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function betaInviteHtml(input: { name: string; email: string }): string {
  const who = betaInviteGreeting(input.name, input.email);
  const lead = who
    ? `${escapeHtml(who)}, you're in the closed beta.`
    : "You're in the closed beta.";
  return `<!doctype html>
<html><body style="margin:0;background:#0c0b0a;color:#efe8dc;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 24px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a097">Trust Your Sign</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5">${lead}</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Sign in with this email at <a href="${SITE}" style="color:#efe8dc">${SITE.replace("https://", "")}</a>.</p>
    <p style="margin:0;font-size:16px;line-height:1.5">The house is still being built. What you save can change between versions.</p>
    <p style="margin:28px 0 0;font-size:12px;color:#a8a097">If you didn't expect this, you can ignore it.</p>
    <p style="margin:12px 0 0;font-size:12px;color:#a8a097">Trust Your Sign · kept by Devin Norris</p>
  </div>
</body></html>`;
}
