import { Link, createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, CONTACT_HANDLE, MIN_AGE, OPERATOR, PRIVACY_VERSION } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (

    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <article className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)] text-sm leading-relaxed text-fg-muted">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">The Vault</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">Privacy Policy</h1>
        <p className="mt-2 text-xs tracking-wide text-fg-subtle uppercase">Version {PRIVACY_VERSION}</p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Who we are</h2>
        <p className="mt-2">
          {OPERATOR} (“we”) provides an astrology fly-through and saved natal sketches. The site is owned and operated
          by Devin Norris ({CONTACT_HANDLE}). Contact: {CONTACT_EMAIL}.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">What we collect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Account: name, email, and a password hash (or Google / X identity via our sign-in broker).</li>
          <li>
            If you offer time and place, we compute your Big Three (sun, moon, rising) and may store that sky with the
            chart you save. Optional tone for how that chart speaks.
          </li>
          <li>
            Ask threads and field notes you write while signed in, stored with that chart so you can continue on another
            device.
          </li>
          <li>Legal acceptances: that you agreed to these terms and this policy, and when.</li>
          <li>A session cookie so you stay signed in. We do not use advertising cookies.</li>
        </ul>
        <p className="mt-2">
          We do not sell personal data. We do not use your charts to train public models.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Why we process it</h2>
        <p className="mt-2">
          To create and keep your account, to save charts you ask us to keep (including other people, only with the
          permission you confirm), to show you that sky again, and to meet legal duties. Lawful bases under UK/EU GDPR:
          contract, consent (birth dates and other people’s charts), and legitimate interests (security, abuse
          prevention).
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Birth dates</h2>
        <p className="mt-2">
          A birth date, time, and place can identify a person. We store them only after you consent, only on your
          account, and only for the charts you save. Time and place are optional; the sun-sign date can stand alone.
          For someone else, you confirm you have their permission. You can delete a chart or all of your data from your
          account at any time.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Children</h2>
        <p className="mt-2">
          The service is for people {MIN_AGE} and older. We do not knowingly create accounts for children. If you believe
          we have, write to {CONTACT_EMAIL} and we will delete the data.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Sharing</h2>
        <p className="mt-2">
          Sign-in with Google or X is handled by a headless identity broker. They receive the fact that you signed in,
          not your saved charts. Hosting and database providers process data on our instructions. We disclose data if
          the law requires it.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Retention and your rights</h2>
        <p className="mt-2">
          We keep account, chart, and Ask conversation data until you delete it or close the account. You may access, correct, export, or
          erase your data, object, or withdraw consent. California residents may also request know / delete / opt-out of
          sale (we do not sell). To exercise rights: {CONTACT_EMAIL}, or use Delete my data on your account page.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Security and transfers</h2>
        <p className="mt-2">
          Passwords are hashed. Sessions use HttpOnly cookies. Data may be processed in the United States. We use
          appropriate safeguards where required.
        </p>

        <h2 className="mt-8 font-display text-xl text-fg italic">Entertainment, not advice</h2>
        <p className="mt-2">
          Readings are cultural and entertainment. They are not medical, legal, financial, or psychological advice.
        </p>

        <p className="mt-10">
          <Link to="/terms" className="text-fg underline">
            Terms
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
