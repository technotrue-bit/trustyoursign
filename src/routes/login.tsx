import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { MIN_AGE } from "@/lib/legal";
import { SITE_OWNER, isOwnerLogin } from "@/lib/owner";
import { primeOwner } from "@/lib/site";
import { VaultPageShell } from "@/components/overlay/VaultPageShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    await primeOwner();
  },
  component: Login,
});

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
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
    if (mode === "up" && (!ageOk || !legalOk)) {
      setError(`Confirm you are ${MIN_AGE} or older and accept the terms.`);
      return;
    }
    if (mode === "up" && password.length < 8) {
      setError("Password needs at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const ident = email.trim();
      const owner = isOwnerLogin(ident);
      const addr = owner ? SITE_OWNER.email : ident;
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim(),
          callbackURL: "/account",
        });
        if (err) throw new Error(err.message ?? "Could not create the account");
      } else {
        const { error: err } = await authClient.signIn.email({
          email: addr,
          password,
          callbackURL: owner ? "/admin" : "/account",
        });
        if (err) throw new Error(err.message ?? "Could not sign in");
      }
      window.location.href = mode === "up" ? "/account" : isOwnerLogin(email.trim()) ? "/admin" : "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue");
      setBusy(false);
    }
  };

  return (
    <VaultPageShell className="px-5">
      <div className="mx-auto w-full max-w-md pt-[var(--chrome-top)] pb-[max(2.5rem,var(--chrome-bottom))]">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">The Vault · {SITE_OWNER.name}</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">Keep the sky.</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Sign in to save your chart, and the charts of people who gave you permission. This house belongs to{" "}
          {SITE_OWNER.name} ({SITE_OWNER.handle}).
        </p>

        {authEnabled ? (
          <div className="mt-8 space-y-3">
            {GROK_PROVIDERS.filter((p) => p.idp === "google").map((p) => (
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
            {GROK_PROVIDERS.filter((p) => p.idp !== "google").map((p) => (
              <button
                key={p.providerId}
                type="button"
                disabled={busy}
                onClick={() => social(p.providerId)}
                className="min-h-12 w-full rounded-md border border-border px-4 text-sm tracking-wide text-fg-muted hover:bg-bg-elevated hover:text-fg disabled:opacity-50"
              >
                Continue with {p.label}
              </button>
            ))}
            <p className="pt-2 text-xs leading-relaxed text-fg-subtle">
              Apple Sign-In is not offered. Use Google, or your iCloud / Apple email with a password below.
            </p>
          </div>
        ) : (
          <p className="mt-8 text-sm text-fg-subtle">Sign-in is disabled.</p>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <div className="flex gap-2 text-xs tracking-[0.18em] uppercase">
            <button
              type="button"
              className={cn("min-h-11 px-2", mode === "in" ? "text-fg" : "text-fg-subtle")}
              onClick={() => setMode("in")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={cn("min-h-11 px-2", mode === "up" ? "text-fg" : "text-fg-subtle")}
              onClick={() => setMode("up")}
            >
              Create account
            </button>
          </div>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void emailAuth();
            }}
          >
            {mode === "up" ? (
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
                  autoComplete="name"
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
                {mode === "in" ? "Owner or email" : "Email"}
              </span>
              <input
                type={mode === "in" ? "text" : "email"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
                autoComplete={mode === "in" ? "username" : "email"}
                placeholder={mode === "in" ? "ADMIN" : "you@icloud.com"}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                minLength={mode === "up" ? 8 : 1}
              />
            </label>
            {mode === "up" ? (
              <div className="space-y-2 pt-1 text-sm text-fg-muted">
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
            {error ? <p className="text-sm text-wine">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !authEnabled}
              className="min-h-12 w-full rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase disabled:opacity-50"
            >
              {mode === "up" ? "Create account" : "Sign in with email"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-fg-subtle">
          Birth dates are personal data. We store them only on your account, never sell them, and delete them when you
          ask.{" "}
          <Link to="/privacy" className="underline">
            Privacy
          </Link>
          {" · "}
          <Link to="/terms" className="underline">
            Terms
          </Link>
          {" · "}
          <Link to="/" className="underline">
            Back to the sky
          </Link>
        </p>
      </div>
    </VaultPageShell>
  );
}
