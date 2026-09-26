import { Link, createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, CONTACT_HANDLE, FEEDBACK_EMAIL } from "@/lib/legal";
import { feedbackMailtoHref } from "@/lib/feedback";
import { FeedbackForm } from "@/components/overlay/FeedbackForm";

export const Route = createFileRoute("/contact")({ component: Contact });

function Contact() {
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

        <FeedbackForm />

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
