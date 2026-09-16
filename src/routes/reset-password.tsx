import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";

export const Route = createFileRoute("/reset-password")({
  // Better Auth's token relay lands here as `/reset-password?token=…` (valid)
  // or `?error=INVALID_TOKEN` (expired / already used).
  validateSearch: (search: Record<string, unknown>): { token?: string; error?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token, error } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const ready = password.length >= 8 && password === confirm && !busy;

  if (done) {
    return (
      <main id="main-content" className="vault-page grid bg-bg place-items-center px-5 text-fg">
        <div className="mx-auto max-w-sm text-center">
          <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Password kept</p>
          <h1 className="mt-2 font-display text-2xl text-fg italic">New password saved.</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Sign in with the new password to open your vault.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <div className="mx-auto w-full max-w-md pt-[var(--chrome-top)] pb-[max(2.5rem,var(--chrome-bottom))]">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Trust Your Sign</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">
          Choose a new password.
        </h1>

        {error === "INVALID_TOKEN" || !token ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-relaxed text-fg-muted">
              {error === "INVALID_TOKEN"
                ? "That reset link has expired or was already used. Ask for a fresh one — they last about an hour."
                : "This link is missing its key — open it again from the email, or ask for a fresh one."}
            </p>
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!ready) return;
              setBusy(true);
              setFailed(null);
              try {
                const { error: err } = await authClient.resetPassword({
                  newPassword: password,
                  token,
                });
                if (err) throw new Error(err.message ?? "The new password did not take");
                setDone(true);
              } catch (e) {
                setFailed(e instanceof Error ? e.message : "The new password did not take");
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-sm leading-relaxed text-fg-muted">
              Pick something you have not used here before. Eight characters minimum.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
                New password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
                Again, to be sure
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                aria-invalid={mismatch || undefined}
                className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
              />
              {mismatch ? (
                <span className="mt-1.5 block text-xs text-wine">
                  The two do not match yet.
                </span>
              ) : null}
            </label>
            {failed ? (
              <p role="alert" className="text-sm text-wine">
                {failed}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!ready || !authEnabled}
              className="min-h-12 w-full rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
