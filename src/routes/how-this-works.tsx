import { Link, createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/lib/legal";

export const Route = createFileRoute("/how-this-works")({ component: HowThisWorks });

function HowThisWorks() {
  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <article className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)] text-sm leading-relaxed text-fg-muted">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Trust Your Sign</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">How this works</h1>

        <p className="mt-6">
          This page is the mechanism, not the meaning. It says how a chart is computed, what the
          fly-through is doing, and what we keep versus what we work out on the fly.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">How the chart is calculated</h2>
        <p className="mt-2">
          We use the tropical zodiac — the signs as most people know them, measured from the spring
          point rather than the constellations’ current drift. Positions come from{" "}
          <span className="text-fg">astronomy-engine</span>, a real ephemeris library, not from a
          lookup table of sun-sign dates. From your date, time, and place we take three things: where
          the sun was, where the moon was, and which sign was rising on the eastern horizon. Those
          are the Big Three.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What “timed birth chart” means</h2>
        <p className="mt-2">
          The date alone gives the sun sign — that is the one that moves a step roughly every month.
          The moon changes sign every couple of days, and the rising sign changes every couple of
          hours, so both need the clock and the ground. Give us a time and a place and the rising and
          moon unlock; give us only the day and the sun sign still stands on its own.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What the fly-through is doing</h2>
        <p className="mt-2">
          The fly-through moves you past stars as points of a life, in the order the chart places
          them. The stars are not decoration on top of the reading — they are the reading’s own
          furniture, lit where the chart puts them. The motion is meant to carry a chart you would
          otherwise read flat.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Sun, moon, rising in this house’s language</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="text-fg">Sun</span> — the through-line, what you are building toward.
          </li>
          <li>
            <span className="text-fg">Moon</span> — the tide, what moves you when no one is watching.
          </li>
          <li>
            <span className="text-fg">Rising</span> — the door, the face the room meets first.
          </li>
        </ul>
        <p className="mt-2">
          When a chart is timed, the moon and rising carry as much weight as the sun; when it is not,
          we lean on the sun and say so.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What is optional</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="text-fg">Time</span> — optional. Without it we cannot place the rising or
            the moon’s house.
          </li>
          <li>
            <span className="text-fg">Place</span> — optional. Without it the horizon is a guess, so
            we do not guess.
          </li>
          <li>
            <span className="text-fg">Tone</span> — optional. How a chart speaks is yours to set;
            leave it and you get the house’s default voice.
          </li>
        </ul>
        <p className="mt-2">Anything you leave out, we leave out too — we do not fill the gaps silently.</p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What is stored vs computed</h2>
        <p className="mt-2">
          The sky you are looking at is computed live from your moment — it is not a saved picture.
          What we store, and only after you consent and only on your account, is the chart you choose
          to save: the date (and, if you gave them, the time and place), the Big Three we derived
          from it, the tone you set, and any Ask threads or field notes you write. Time and place are
          optional; the sun-sign date can stand alone. You can delete a chart or everything at any
          time from your account.
        </p>
        <p className="mt-2">
          Questions about any of this: {CONTACT_EMAIL}.
        </p>

        <p className="mt-10">
          <Link to="/about" className="text-fg underline">
            About
          </Link>
          {" · "}
          <Link to="/faq" className="text-fg underline">
            FAQ
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
