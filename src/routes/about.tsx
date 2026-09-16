import { Link, createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, CONTACT_HANDLE, MIN_AGE, OPERATOR } from "@/lib/legal";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <article className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)] text-sm leading-relaxed text-fg-muted">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Trust Your Sign</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">About</h1>

        <p className="mt-6">
          {OPERATOR} is a natal fly-through: you pick a sign, fly its sky, and — if you offer a time
          and place — unlock a chart. This page says plainly what it is, who made it, and what is
          still unfinished.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Who built it</h2>
        <p className="mt-2">
          Built by Devin Norris ({CONTACT_HANDLE}). It is a small, independent project — no team, no
          investor, no ad network. If it breaks, there is one person to write to.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What “closed beta” means</h2>
        <p className="mt-2">
          The house is open but not finished. You can use it, and you can save charts, but the shape
          of the product is still changing. That is the trade: you get in early, and you accept that
          things move under your feet. Preview data, including saved charts, may be wiped between
          versions.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What is still rough</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The sky’s rendering and the fly-through timing are still being tuned.</li>
          <li>Saved libraries, paid tiers, and sync are not finished.</li>
          <li>Copy and naming shift as the language settles.</li>
          <li>Mobile is usable but not the polished surface yet.</li>
        </ul>

        <h2 className="mt-8 font-display text-xl text-fg italic">What a natal fly-through is</h2>
        <p className="mt-2">
          A fly-through is the sky as a place you move through, not a diagram you read. The stars you
          pass are points of a life, lit in the order the chart puts them. It is a way of meeting a
          chart by moving, which is how this house prefers to speak.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">How a chart is calculated</h2>
        <p className="mt-2">
          In plain language: we take the date — and, if you give them, the time and place — and ask a
          real astronomy library where the sun, moon, and horizon were at that moment. The zodiac we
          use is tropical, the familiar one. Those three positions become the Big Three: sun, moon,
          rising. Nothing here is random; it is positions computed from a moment in time.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What “timed birth chart” means</h2>
        <p className="mt-2">
          A timed chart has an hour and a place, not just a day. Those two details are what let us
          find the rising sign and the moon’s exact house — the horizon and the moon both move fast,
          so without them we can only speak to the sun sign. A date can stand alone; a full timed
          chart needs the clock and the ground.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Other people’s charts</h2>
        <p className="mt-2">
          You may save a chart for someone else, but only with their permission — and you confirm
          that you have it before the chart is kept. A birth date, time, and place can identify a
          person. Do not store someone else’s without their yes.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Age rule</h2>
        <p className="mt-2">
          This service is for people {MIN_AGE} and older. We do not knowingly keep accounts for
          anyone younger. If you believe one exists, write to {CONTACT_EMAIL} and we will remove it.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Entertainment, not advice</h2>
        <p className="mt-2">
          Readings here are cultural and for entertainment. They are not medical, legal, financial,
          or psychological advice. See the{" "}
          <Link to="/terms" className="text-fg underline">
            Terms
          </Link>
          .
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">How to delete data</h2>
        <p className="mt-2">
          On your account page you can remove a single chart or erase everything we hold — charts,
          Ask threads, and legal records. That cannot be undone. You can also write to{" "}
          {CONTACT_EMAIL} and we will delete it for you.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Contact</h2>
        <p className="mt-2">
          Use the{" "}
          <Link to="/contact" className="text-fg underline">
            contact page
          </Link>{" "}
          or write to {CONTACT_EMAIL}.
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
          <Link to="/how-this-works" className="text-fg underline">
            How this works
          </Link>
          {" · "}
          <Link to="/contact" className="text-fg underline">
            Contact
          </Link>
        </p>
      </article>
    </main>
  );
}
