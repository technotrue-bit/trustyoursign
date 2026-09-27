import { Link } from "@tanstack/react-router";

/** Holding screen shown to everyone but the site owner while maintenance is on. */
export function MaintenanceScreen() {
  return (
    <main id="main-content" className="vault-page bg-bg text-fg">
      <div className="relative mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg
            className="absolute top-1/2 left-1/2 w-[min(36rem,120vw)] -translate-x-1/2 -translate-y-[58%] opacity-80"
            viewBox="0 0 400 400"
            fill="none"
          >
            <circle cx="200" cy="200" r="148" stroke="#d8cfc0" strokeOpacity="0.28" />
            <circle cx="200" cy="200" r="112" stroke="#c9a15b" strokeOpacity="0.35" />
            <circle cx="200" cy="200" r="4" fill="#efe8dc" />
            <circle cx="200" cy="52" r="2.2" fill="#efe8dc" />
            <circle cx="332" cy="248" r="1.6" fill="#d8cfc0" />
            <circle cx="78" cy="270" r="1.8" fill="#c9a15b" />
            <circle cx="268" cy="96" r="1.4" fill="#efe8dc" />
            <circle cx="120" cy="118" r="1.2" fill="#d8cfc0" />
          </svg>
        </div>
        <div className="relative">
          <p className="text-[0.7rem] tracking-[0.28em] text-accent uppercase">Trust Your Sign</p>
          <h1 className="mt-3 font-display text-5xl tracking-tight text-fg italic">
            The universe is expanding.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
            The sky is closed for a little while. The signs are still there. Check back soon.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex min-h-11 items-center text-xs tracking-[0.18em] text-fg-subtle uppercase"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
