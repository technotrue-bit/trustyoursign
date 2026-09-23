import { Link, createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, MIN_AGE } from "@/lib/legal";

export const Route = createFileRoute("/faq")({ component: Faq });

function Faq() {
  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <article className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)] text-sm leading-relaxed text-fg-muted">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Trust Your Sign</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">
          Frequently asked
        </h1>

        <p className="mt-6">
          Short answers to the things people ask most. Tap a question to open it.
        </p>

        <div className="mt-8 space-y-4">
          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              Is this entertainment or advice?
            </summary>
            <p className="mt-2">
              Entertainment — cultural, not clinical. It is not medical, legal, financial, or
              psychological advice, and it is no substitute for a professional who knows your
              situation. See the{" "}
              <Link to="/terms" className="text-fg underline">
                Terms
              </Link>
              .
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              Do you sell my data?
            </summary>
            <p className="mt-2">
              No. We do not sell personal data, and there are no advertising cookies. Details are in
              the{" "}
              <Link to="/privacy" className="text-fg underline">
                Privacy Policy
              </Link>
              .
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              Do you train models on my chart?
            </summary>
            <p className="mt-2">
              No. We do not use your charts to train public models. What you save is kept so the
              product can show it back to you.
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              Can I save someone else’s chart?
            </summary>
            <p className="mt-2">
              Only with their permission. You confirm you have it before the chart is kept. A birth
              date, time, and place can identify a person, so we do not take someone else’s without
              their yes.
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              How do I delete data?
            </summary>
            <p className="mt-2">
              From your{" "}
              <Link to="/account" className="text-fg underline">
                account page
              </Link>{" "}
              you can remove a single chart or erase everything we hold — charts, Ask threads, and
              legal records. You can also write to {CONTACT_EMAIL} and we will delete it for you.
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              What does closed beta mean for my data?
            </summary>
            <p className="mt-2">
              The product is still changing shape, and preview data — including saved charts — may be
              wiped between versions. Do not treat a beta save as permanent storage.
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              Why do you want time and place?
            </summary>
            <p className="mt-2">
              For the Big Three. The sun sign comes from the date, but the rising sign changes every
              couple of hours and the moon changes sign every couple of days — so both the rising and
              the moon need a time and a place.
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              What if I only know the day?
            </summary>
            <p className="mt-2">
              That is fine. You get the sun sign, which is the sign most people mean when they say
              “my sign.” Time and place are optional; we will not invent the rising or the moon to
              fill the gap.
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              Is there an age rule?
            </summary>
            <p className="mt-2">
              Yes — this service is for people {MIN_AGE} and older. We do not knowingly keep accounts
              for anyone younger. If you believe one exists, write to {CONTACT_EMAIL}.
            </p>
          </details>

          <details className="border-b border-border pb-3">
            <summary className="cursor-pointer py-2 font-display text-xl text-fg italic md:py-0">
              How do I report a problem?
            </summary>
            <p className="mt-2">
              Email {CONTACT_EMAIL}, or use the{" "}
              <Link to="/contact" className="text-fg underline">
                contact page
              </Link>{" "}
              for what to send.
            </p>
          </details>
        </div>

        <p className="mt-10">
          <Link to="/about" className="text-fg underline">
            About
          </Link>
          {" · "}
          <Link to="/how-this-works" className="text-fg underline">
            How this works
          </Link>
          {" · "}
          <Link to="/privacy" className="text-fg underline">
            Privacy
          </Link>
          {" · "}
          <Link to="/terms" className="text-fg underline">
            Terms
          </Link>
        </p>
      </article>
    </main>
  );
}
