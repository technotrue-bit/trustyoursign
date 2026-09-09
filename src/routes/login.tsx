import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  TurnstileWidget,
  resetTurnstile,
  turnstileCaptchaHeaders,
  turnstileSiteKey,
} from "@/components/TurnstileWidget";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { MIN_AGE } from "@/lib/legal";
import { SITE_OWNER, isOwnerLogin } from "@/lib/owner";
import { primeOwner } from "@/lib/site";
import { cn } from "@/lib/utils";

type LoginSearch = {
  create?: boolean;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    create: search.create === true || search.create === "1" || search.create === "true" ? true : undefined,
  }),
  beforeLoad: async () => {
    await primeOwner();
  },
  component: Login,
});

function Login() {
  const { create } = Route.useSearch();
  const signingUp = Boolean(create);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [legalOk, setLegalOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const social = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await signIn(id, { callbackURL: "/account" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(false);
    }
  };

  const emailAuth = async () => {
    setError(null);
    if (signingUp && (!ageOk || !legalOk)) {
      setError(`Confirm you are ${MIN_AGE} or older and accept the terms.`);
      return;
    }
    if (signingUp && password.length < 8) {
      setError("Password needs at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const ident = email.trim();
      const owner = isOwnerLogin(ident);
      const addr = owner ? SITE_OWNER.email : ident;
      const captchaHeaders = turnstileCaptchaHeaders();
      if (signingUp) {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim(),
          callbackURL: "/account",
          fetchOptions: {
            headers: captchaHeaders,
          },
        });
        if (err) throw new Error(err.message ?? "Could not create the account");
      } else {
        const { error: err } = await authClient.signIn.email({
          email: addr,
          password,
          callbackURL: owner ? "/admin" : "/account",
          fetchOptions: {
            headers: captchaHeaders,
          },
        });
        if (err) throw new Error(err.message ?? "Could not sign in");
      }
      window.location.href = signingUp ? "/account" : isOwnerLogin(email.trim()) ? "/admin" : "/account";
    } catch (e) {
      resetTurnstile();
      setError(e instanceof Error ? e.message : "Could not continue");
      setBusy(false);
    }
  };

  return (
    <main className="vault-page bg-bg px-5 text-fg">
      <div className="mx-auto w-full max-w-md pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)]">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
        >
          Back to the sky
        </Link>

        <p className="mt-8 text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">The Vault</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">Keep the sky.</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          {signingUp
            ? "Create an account to save your chart, and any chart someone has given you permission to keep."
            : "Sign in to save your chart, and any chart someone has given you permission to keep."}
        </p>

        <div className="relative z-10 mt-8 grid grid-cols-2 gap-1 rounded-lg bg-bg-subtle p-2">
          <Link
            to="/login"
            search={{}}
            replace
            resetScroll={false}
            aria-current={!signingUp ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center justify-center rounded-md px-3 text-center text-xs tracking-[0.18em] uppercase",
              !signingUp ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            Sign in
          </Link>
          <Link
            to="/login"
            search={{ create: true }}
            replace
            resetScroll={false}
            aria-current={signingUp ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center justify-center rounded-md px-3 text-center text-xs tracking-[0.18em] uppercase",
              signingUp ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            Create account
          </Link>
        </div>

        {authEnabled ? (
          <div className="mt-8 space-y-3">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                disabled={busy}
                onClick={() => social(p.providerId)}
                className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-4 text-sm tracking-wide text-fg hover:bg-bg-subtle disabled:opacity-50"
              >
                Continue with {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-fg-subtle">Sign-in is unavailable right now.</p>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-4 text-center text-[0.65rem] tracking-[0.2em] text-fg-subtle uppercase">
            Or use email
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void emailAuth();
            }}
          >
            {signingUp ? (
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg outline-none focus:border-accent"
                  autoComplete="name"
                  autoCapitalize="words"
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Email</span>
              <input
                type={signingUp ? "email" : "text"}
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg outline-none focus:border-accent"
                autoComplete={signingUp ? "email" : "username"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg outline-none focus:border-accent"
                autoComplete={signingUp ? "new-password" : "current-password"}
                minLength={signingUp ? 8 : 1}
              />
            </label>
            {signingUp ? (
              <div className="space-y-2 pt-1 text-sm leading-relaxed text-fg-muted">
                <label className="flex min-h-11 items-start gap-2">
                  <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} className="mt-1" />
                  <span>I am {MIN_AGE} or older.</span>
                </label>
                <label className="flex min-h-11 items-start gap-2">
                  <input type="checkbox" checked={legalOk} onChange={(e) => setLegalOk(e.target.checked)} className="mt-1" />
                  <span>
                    I agree to the{" "}
                    <Link to="/terms" className="text-fg underline">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-fg underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              </div>
            ) : null}
            {turnstileSiteKey() ? <TurnstileWidget /> : null}
            {error ? <p className="text-sm text-wine">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !authEnabled}
              className="min-h-12 w-full rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase disabled:opacity-50"
            >
              {signingUp ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-fg-subtle">
          Birth dates stay on your account. We do not sell them.
          {" · "}
          <Link to="/privacy" className="underline hover:text-fg">
            Privacy
          </Link>
          {" · "}
          <Link to="/terms" className="underline hover:text-fg">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
