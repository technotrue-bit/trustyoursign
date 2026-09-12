import { Link, createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, CONTACT_HANDLE, MIN_AGE, OPERATOR, TERMS_VERSION } from "@/lib/legal";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <article className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[max(2rem,var(--chrome-bottom))] text-sm leading-relaxed text-fg-muted">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">The Vault</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">Terms of Use</h1>
        <p className="mt-2 text-xs tracking-wide text-fg-subtle uppercase">Version {TERMS_VERSION}</p>

        <p className="mt-6">
          By creating an account or using {OPERATOR}, you agree to these terms and the Privacy Policy. The service is
          owned by Devin Norris ({CONTACT_HANDLE}). If you do not agree, do not use the service.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">The service</h2>
        <p className="mt-2">
          We offer a visual fly-through of the zodiac and the option to save natal sketches (sun sign and birth date)
          to your account. The sky is entertainment. It is not professional advice, a substitute for care, or a
          guarantee of meaning.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Accounts</h2>
        <p className="mt-2">
          You must be {MIN_AGE} or older. You are responsible for your password and for what you save. Do not impersonate
          someone else. Do not store another person’s birth date without their permission. We may suspend accounts that
          abuse the service or other people.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Your content</h2>
        <p className="mt-2">
          You keep rights in the names and dates you enter. You grant us a limited licence to store and display them to
          you so the product works. You can delete a chart or all of your data from the account page.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Acceptable use</h2>
        <p className="mt-2">
          No scraping, no attacking the service, no uploading unlawful material, no using saved charts to harass. We
          may remove content that breaks these rules.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Availability</h2>
        <p className="mt-2">
          The service is provided “as is.” We do not promise uninterrupted access. Preview data may be wiped. We are
          not liable for lost charts, downtime, or decisions you make after a reading, to the extent the law allows.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Liability</h2>
        <p className="mt-2">
          To the fullest extent permitted, {OPERATOR} is not liable for indirect or consequential loss. Our total
          liability for a claim is limited to the amount you paid us in the three months before the claim (currently
          zero, as the service is free).
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Changes</h2>
        <p className="mt-2">
          We may update these terms. The version date above is the current one. Continued use after a change is
          acceptance. Questions: {CONTACT_EMAIL}.
        </p>

        <p className="mt-10">
          <Link to="/privacy" className="text-fg underline">
            Privacy
          </Link>
          {" · "}
          <Link to="/login" className="text-fg underline">
            Sign in
          </Link>
          {" · "}
          <Link to="/" className="text-fg underline">
            The sky
          </Link>
        </p>
      </article>
    </main>
  );
}
