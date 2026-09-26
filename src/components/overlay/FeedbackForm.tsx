import { useId, useState, type FormEvent } from "react";
import { FEEDBACK_EMAIL } from "@/lib/legal";
import { feedbackMailtoHref, type FeedbackKind } from "@/lib/feedback";

type FormState = "idle" | "sending" | "success" | "error";

/**
 * The product-feedback form. Posts to the existing `/api/feedback` route
 * (Ultron's inbox). Shared by `/contact#feedback` and the sky HUD sheet.
 */
export function FeedbackForm({ compact = false }: { compact?: boolean }) {
  const uid = useId();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [deviceNote, setDeviceNote] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormState("sending");
    setErrorText(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message,
          replyEmail: replyEmail.trim() || undefined,
          deviceNote: deviceNote.trim() || undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setFormState("error");
        setErrorText(
          data?.error ?? "Could not send that note. Email Ultron directly with the link below.",
        );
        return;
      }
      setFormState("success");
      setMessage("");
      setDeviceNote("");
    } catch {
      setFormState("error");
      setErrorText("Could not reach the server. Email Ultron directly with the link below.");
    }
  }

  return (
    <form className={compact ? "space-y-3" : "mt-6 space-y-4"} onSubmit={onSubmit} noValidate>
      <fieldset className="space-y-2">
        <legend className="text-xs tracking-[0.16em] text-fg-subtle uppercase">Kind</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
            <input
              type="radio"
              name={`${uid}-kind`}
              value="bug"
              checked={kind === "bug"}
              onChange={() => setKind("bug")}
            />
            Bug
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
            <input
              type="radio"
              name={`${uid}-kind`}
              value="suggestion"
              checked={kind === "suggestion"}
              onChange={() => setKind("suggestion")}
            />
            Suggestion
          </label>
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
          Message
        </span>
        <textarea
          required
          rows={compact ? 4 : 6}
          className={
            compact
              ? "min-h-24 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-fg"
              : "min-h-32 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-fg"
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What you were doing, what you expected, what happened — or what you wish existed."
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
          Reply email <span className="normal-case tracking-normal">(optional)</span>
        </span>
        <input
          type="email"
          autoComplete="email"
          className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-fg"
          value={replyEmail}
          onChange={(e) => setReplyEmail(e.target.value)}
          placeholder="Only if you want a reply"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
          Device / browser note <span className="normal-case tracking-normal">(optional)</span>
        </span>
        <input
          type="text"
          className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-fg"
          value={deviceNote}
          onChange={(e) => setDeviceNote(e.target.value)}
          placeholder="e.g. iPhone Safari, desktop Chrome"
        />
      </label>

      <button
        type="submit"
        disabled={formState === "sending"}
        className="min-h-11 rounded-md bg-accent px-4 text-xs tracking-[0.2em] text-accent-fg uppercase disabled:opacity-60"
      >
        {formState === "sending" ? "Sending…" : "Send to Ultron"}
      </button>

      {formState === "success" ? (
        <p className="text-sm text-fg" role="status">
          Got it — Ultron will triage this.
        </p>
      ) : null}

      {formState === "error" ? (
        <div className="space-y-2 text-sm" role="alert">
          <p className="text-fg">{errorText}</p>
          <p>
            Fallback:{" "}
            <a href={feedbackMailtoHref(kind)} className="text-fg underline">
              email {FEEDBACK_EMAIL}
            </a>
          </p>
        </div>
      ) : null}
    </form>
  );
}
