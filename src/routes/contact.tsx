import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CONTACT_EMAIL, CONTACT_HANDLE, FEEDBACK_EMAIL } from "@/lib/legal";
import { feedbackMailtoHref, type FeedbackKind } from "@/lib/feedback";

export const Route = createFileRoute("/contact")({ component: Contact });

type FormState = "idle" | "sending" | "success" | "error";

function Contact() {
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
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setFormState("error");
        setErrorText(
          data?.error ??
            "Could not send that note. Email Ultron directly with the link below.",
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
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <article className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)] text-sm leading-relaxed text-fg-muted">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Trust Your Sign</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">Contact</h1>

        <p className="mt-6">
          Two inboxes, both read by people. Privacy and data requests go to {CONTACT_EMAIL} (Devin,{" "}
          {CONTACT_HANDLE}). Product bugs and beta feedback go to Ultron eng intake at{" "}
          <a href={feedbackMailtoHref()} className="text-fg underline">
            {FEEDBACK_EMAIL}
          </a>
          , or use the form below.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Privacy and your data</h2>
        <p className="mt-2">
          For access, correction, export, or deletion requests, or any question about what we hold,
          write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-fg underline">
            {CONTACT_EMAIL}
          </a>
          . If you want your data gone, you can also do it yourself from your{" "}
          <Link to="/account" className="text-fg underline">
            account page
          </Link>
          . See the{" "}
          <Link to="/privacy" className="text-fg underline">
            Privacy Policy
          </Link>{" "}
          for the detail.
        </p>

        <h2
          id="feedback"
          className="mt-8 scroll-mt-[calc(var(--chrome-top)+1rem)] font-display text-xl text-fg italic"
        >
          Product bugs and beta feedback
        </h2>
        <p className="mt-2">
          Something broke, rendered wrong, or felt confusing? Ultron triages eng intake at{" "}
          <a href={feedbackMailtoHref()} className="text-fg underline">
            {FEEDBACK_EMAIL}
          </a>
          . Honest beta notes count too — what felt good, what you wished existed. If you are not
          sure whether it is a bug or intended, the{" "}
          <Link to="/faq" className="text-fg underline">
            FAQ
          </Link>{" "}
          may already answer it.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <fieldset className="space-y-2">
            <legend className="text-xs tracking-[0.16em] text-fg-subtle uppercase">Kind</legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
                <input
                  type="radio"
                  name="kind"
                  value="bug"
                  checked={kind === "bug"}
                  onChange={() => setKind("bug")}
                />
                Bug
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
                <input
                  type="radio"
                  name="kind"
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
              rows={6}
              className="min-h-32 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-fg"
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

        <h2 className="mt-10 font-display text-xl text-fg italic">What to include</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The email on your account, if the question is about your data (privacy inbox).</li>
          <li>Your device and browser, if it is a bug.</li>
          <li>Whatever you are willing to share about what you were trying to do.</li>
        </ul>

        <p className="mt-8">
          For what the reading is and is not, see{" "}
          <Link to="/about" className="text-fg underline">
            About
          </Link>{" "}
          and the{" "}
          <Link to="/terms" className="text-fg underline">
            Terms
          </Link>
          .
        </p>

        <p className="mt-10">
          <Link to="/privacy" className="text-fg underline">
            Privacy
          </Link>
          {" · "}
          <Link to="/terms" className="text-fg underline">
            Terms
          </Link>
          {" · "}
          <Link to="/about" className="text-fg underline">
            About
          </Link>
          {" · "}
          <Link to="/faq" className="text-fg underline">
            FAQ
          </Link>
        </p>
      </article>
    </main>
  );
}
