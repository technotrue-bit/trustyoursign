/**
 * Product feedback intake — validation + email body (pure, side-effect free).
 *
 * Transport and rate-limiting live in `feedback-submit.ts` / the API route.
 * Destination is Ultron's AgentMail inbox (`FEEDBACK_EMAIL`), not privacy@.
 */

import { FEEDBACK_EMAIL } from "./legal.ts";

export const FEEDBACK_KINDS = ["bug", "suggestion"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export type FeedbackRawInput = {
  kind?: unknown;
  message?: unknown;
  replyEmail?: unknown;
  deviceNote?: unknown;
  userAgent?: unknown;
};

export type NormalizedFeedback = {
  kind: FeedbackKind;
  message: string;
  replyEmail: string | null;
  deviceNote: string | null;
  userAgent: string | null;
};

export type FeedbackValidation =
  | { ok: true; value: NormalizedFeedback }
  | { ok: false; error: string; status: 400 };

const MESSAGE_MAX = 4000;
const DEVICE_NOTE_MAX = 240;
const USER_AGENT_MAX = 400;
const EMAIL_MAX = 320;

function asTrimmedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isFeedbackKind(value: unknown): value is FeedbackKind {
  return value === "bug" || value === "suggestion";
}

function plausibleEmail(value: string): boolean {
  if (!value.includes("@") || value.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateFeedback(raw: FeedbackRawInput | null | undefined): FeedbackValidation {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Send a feedback payload.", status: 400 };
  }

  if (!isFeedbackKind(raw.kind)) {
    return { ok: false, error: "Pick bug or suggestion.", status: 400 };
  }

  const message = asTrimmedString(raw.message, MESSAGE_MAX);
  if (message.length < 8) {
    return { ok: false, error: "Write a bit more — what happened or what you wish existed.", status: 400 };
  }

  const replyRaw = asTrimmedString(raw.replyEmail, EMAIL_MAX);
  if (replyRaw && !plausibleEmail(replyRaw)) {
    return { ok: false, error: "That reply email does not look right.", status: 400 };
  }

  const deviceNote = asTrimmedString(raw.deviceNote, DEVICE_NOTE_MAX) || null;
  const userAgent = asTrimmedString(raw.userAgent, USER_AGENT_MAX) || null;

  return {
    ok: true,
    value: {
      kind: raw.kind,
      message,
      replyEmail: replyRaw ? replyRaw.toLowerCase() : null,
      deviceNote,
      userAgent,
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function feedbackSubject(kind: FeedbackKind): string {
  return `[TrustYourSign feedback] ${kind}`;
}

export function feedbackMailtoHref(kind?: FeedbackKind): string {
  const subject = encodeURIComponent(feedbackSubject(kind ?? "bug"));
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}`;
}

/** Build the outbound message for Resend → FEEDBACK_EMAIL. */
export function buildFeedbackEmail(input: NormalizedFeedback): {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
} {
  const lines = [
    `Kind: ${input.kind}`,
    input.replyEmail ? `Reply-to visitor: ${input.replyEmail}` : "Reply-to visitor: (none)",
    input.deviceNote ? `Device/browser note: ${input.deviceNote}` : "Device/browser note: (none)",
    input.userAgent ? `User-Agent: ${input.userAgent}` : "User-Agent: (none)",
    "",
    "Message:",
    input.message,
  ];
  const text = lines.join("\n");

  const html = `<!doctype html>
<html><body style="font-family:Georgia,serif;background:#14110e;color:#efe8dc;padding:24px">
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9186">Trust Your Sign feedback</p>
  <p style="margin:0 0 16px"><strong>Kind:</strong> ${escapeHtml(input.kind)}</p>
  <p style="margin:0 0 8px"><strong>Reply-to visitor:</strong> ${escapeHtml(input.replyEmail ?? "(none)")}</p>
  <p style="margin:0 0 8px"><strong>Device/browser note:</strong> ${escapeHtml(input.deviceNote ?? "(none)")}</p>
  <p style="margin:0 0 16px"><strong>User-Agent:</strong> ${escapeHtml(input.userAgent ?? "(none)")}</p>
  <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.55;margin:0">${escapeHtml(input.message)}</pre>
</body></html>`;

  return {
    to: FEEDBACK_EMAIL,
    subject: feedbackSubject(input.kind),
    text,
    html,
    ...(input.replyEmail ? { replyTo: input.replyEmail } : {}),
  };
}
