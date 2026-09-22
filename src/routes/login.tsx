import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  TurnstileWidget,
  resetTurnstile,
  turnstileCaptchaHeaders,
  turnstileSiteKey,
} from "@/components/TurnstileWidget";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import {
  OTP_EXPIRES_SECONDS,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
  SIGN_IN_LINK_EXPIRES_SECONDS,
  confirmOtpDelivery,
  cooldownSecondsLeft,
  isCompleteOtp,
  normalizeOtpInput,
  signInAvailability,
} from "@/lib/auth/email-otp";
import { lookupPasskeyCredentialIds } from "@/lib/auth/passkey-lookup";
import { normalizePasskeyLookupEmail } from "@/lib/auth/passkey-lookup-email";
import {
  hasUsableLocalPasskeyEvidence,
  markLocalPasskeyAutofillOk,
  platformAuthenticatorAvailable,
  rememberLocalPasskeyCredentialIds,
  signInWithPlatformPasskey,
} from "@/lib/auth/passkey-sign-in";
import { MIN_AGE } from "@/lib/legal";
import { SITE_OWNER, isOwnerLogin } from "@/lib/owner";
import { resolveSessionGuardState } from "@/lib/auth/session-guard";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

/** Profile URL after a successful sign-in — never linger on /login. */
function profileHref(opts?: { enablePasskey?: boolean }) {
  return opts?.enablePasskey ? "/account?enablePasskey=1#passkeys" : "/account";
}

/**
 * Confirm the session is readable, then hard-navigate to the profile.
 * Without this, a race after email/OTP can load /account before the cookie is
 * visible — /account treats that as signed out and bounces straight back here,
 * which feels like "I signed in and nothing happened."
 */
async function goToProfileAfterSignIn(opts?: { enablePasskey?: boolean }) {
  if (typeof window === "undefined") return;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        window.location.replace(profileHref(opts));
        return;
      }
    } catch {
      /* retry — a dropped read is not "still signed out" */
    }
    await new Promise((r) => window.setTimeout(r, 120 * (attempt + 1)));
  }
  // Last resort: full navigation still gives the next document a fresh cookie read.
  window.location.assign(profileHref(opts));
}

/** After email/OTP/password: nudge Face ID enroll when this device can do UVPA. */
function goToProfileAfterPasswordlessGate(platformOk: boolean) {
  return goToProfileAfterSignIn({
    enablePasskey: platformOk && !hasUsableLocalPasskeyEvidence(),
  });
}

/** Pull credential id out of Better Auth’s optional webauthn return payload. */
function credentialIdFromWebauthn(result: {
  webauthn?: { response?: { id?: string } };
} | null): string | null {
  const id = result?.webauthn?.response?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export const Route = createFileRoute("/login")({
  component: Login,
  // `?create=1` opens the Create-account tab directly, so a link can carry the
  // intent instead of dropping the visitor on the sign-in form. `?from=account`
  // says the visitor was headed to the account area, so the page can explain
  // why they landed here.
  validateSearch: (search: Record<string, unknown>): { create?: true; from?: string } => ({
    create:
      search.create === true || search.create === "1" || search.create === "true"
        ? true
        : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
  }),
});

function Login() {
  const {
    user,
    isPending: sessionPending,
    isReadFailed: sessionReadFailed,
  } = useCurrentUserState();
  const alreadySignedIn =
    resolveSessionGuardState({
      isPending: sessionPending,
      isReadFailed: sessionReadFailed,
      hasUser: user !== null,
    }) === "signed_in";
  // The route search picks the opening tab; switching tabs after that is local.
  const { create, from } = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">(create ? "up" : "in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hpCompany, setHpCompany] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [legalOk, setLegalOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // ── What this host can actually serve ──────────────────────────────────────
  // One answer from the server drives every option on the page: the code path
  // (needs mail delivery) and the Google/X buttons (need the broker's OAuth
  // plugin, which is what serves `/sign-in/oauth2`). Nothing is rendered that
  // the server cannot finish — no button that merely scrolls, no button that
  // 404s after signing the visitor out.
  const [otpAvailable, setOtpAvailable] = useState(false);
  const [otpSandbox, setOtpSandbox] = useState(false);
  const [servedProviders, setServedProviders] = useState<readonly string[]>([]);
  const [passkeyOk, setPasskeyOk] = useState(false);
  // Platform authenticator (Face ID / Touch ID) — required to offer the modal button.
  const [platformPasskey, setPlatformPasskey] = useState(false);
  // Local credential evidence — without it, Safari opens hybrid QR on discoverable get.
  const [localPasskeyEvidence, setLocalPasskeyEvidence] = useState(false);
  const [otpStage, setOtpStage] = useState<"idle" | "code" | "sent">("idle");
  const [otp, setOtp] = useState("");
  const [codeSentTo, setCodeSentTo] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  // The forgot-password path is a RESET LINK, not a sign-in code — a genuinely
  // different flow from "Email me a code", so it gets its own sent-state.
  const [resetSent, setResetSent] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    signInAvailability()
      .then((status) => {
        if (cancelled) return;
        setOtpAvailable(status.codeAvailable);
        setOtpSandbox(status.codeSandbox);
        setServedProviders(status.providers);
        setPasskeyOk(status.passkeyAvailable);
      })
      .catch(() => {
        /* leave everything hidden rather than offer a path that may not work */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Conditional UI: preload the browser's passkey autofill when the host can
  // finish a passkey sign-in (Safari / iOS offer Face ID in the keyboard bar).
  // Capture the assertion id so modal evidence survives after autofill success.
  useEffect(() => {
    if (!passkeyOk || !authEnabled) return;
    let cancelled = false;
    void authClient
      .signIn.passkey({ autoFill: true, returnWebAuthnResponse: true })
      .then((result) => {
        if (cancelled) return;
        if (result.data) {
          const credId = credentialIdFromWebauthn(
            result as { webauthn?: { response?: { id?: string } } },
          );
          if (credId) rememberLocalPasskeyCredentialIds(credId);
          markLocalPasskeyAutofillOk();
          setLocalPasskeyEvidence(hasUsableLocalPasskeyEvidence());
          void goToProfileAfterSignIn();
        }
      })
      .catch(() => {
        /* autofill abort / no credential is expected — ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [passkeyOk]);

  useEffect(() => {
    if (!passkeyOk) return;
    let cancelled = false;
    setLocalPasskeyEvidence(hasUsableLocalPasskeyEvidence());
    void platformAuthenticatorAvailable().then((ok) => {
      if (!cancelled) setPlatformPasskey(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [passkeyOk]);

  // When localStorage was cleared but the account still has passkeys, re-seed
  // credential IDs once a plausible email is known — then the modal button can
  // safely call WebAuthn with allowCredentials (no hybrid QR).
  useEffect(() => {
    if (!passkeyOk || !authEnabled) return;
    const lookupEmail = normalizePasskeyLookupEmail(email);
    if (!lookupEmail) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lookupPasskeyCredentialIds({ data: lookupEmail })
        .then((result) => {
          if (cancelled) return;
          if (result.credentialIds.length === 0) return;
          rememberLocalPasskeyCredentialIds(result.credentialIds);
          setLocalPasskeyEvidence(true);
        })
        .catch(() => {
          /* keep gated UI — recovery is best-effort */
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [passkeyOk, email]);

  // Modal button only when UVPA + credential IDs — never a naked discoverable get.
  const offerModalPasskey = passkeyOk && platformPasskey && localPasskeyEvidence;

  // Ticks only while a code is on screen, to re-enable "send another code".
  useEffect(() => {
    if (otpStage !== "sent") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [otpStage]);

  const cooldownLeft = cooldownSecondsLeft(cooldownUntil, now);

  /**
   * Guards shared by both sign-in paths. `requireAcceptance` is set for anything
   * that can CREATE an account — and the code path always can, because a
   * first-time code signs the visitor up. So acceptance is a precondition for
   * being sent a code, not merely for the Create-account tab.
   */
  const formProblem = (opts: { requireAcceptance?: boolean } = {}): string | null => {
    if (hpCompany.trim()) return "Could not continue";
    const needsAcceptance = opts.requireAcceptance ?? mode === "up";
    if (needsAcceptance && (!ageOk || !legalOk)) {
      return `Confirm you are ${MIN_AGE} or older and accept the terms — both are needed before a code can be emailed.`;
    }
    if (!email.trim()) return "Enter your email address first.";
    return null;
  };

  /**
   * "Forgot password?" — mints a reset LINK (Better Auth request-password-reset)
   * and mails it. Deliberately distinct from sendCode: the link does not sign
   * anyone in, it only opens /reset-password to choose a new password. The
   * server answers generic success either way, so the copy must not promise
   * an email for an address that has no account.
   */
  const sendResetLink = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw new Error(err.message ?? "Could not send the reset link");
      setResetSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the reset link");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    setError(null);
    const problem = formProblem({ requireAcceptance: true });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
        fetchOptions: { headers: turnstileCaptchaHeaders() },
      });
      if (err) throw new Error(err.message ?? "Could not send the code");
      // Better Auth returns success even when delivery threw — confirm the
      // real outcome recorded by sendVerificationOTP before advancing the UI.
      const delivery = await confirmOtpDelivery({ data: email.trim() });
      if (!delivery.ok) {
        throw new Error(delivery.message ?? "Could not send the code");
      }
      setOtp("");
      setCodeSentTo(email.trim());
      setOtpStage("sent");
      setCooldownUntil(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
    } catch (e) {
      resetTurnstile();
      setError(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (!codeSentTo) {
      setError("Request a code first.");
      return;
    }
    if (!isCompleteOtp(otp)) {
      setError(`Enter the ${OTP_LENGTH}-digit code from the email.`);
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await authClient.signIn.emailOtp({
        // The address the code was actually sent to — the field may have moved on.
        email: codeSentTo,
        otp: otp.trim(),
        fetchOptions: { headers: turnstileCaptchaHeaders() },
      });
      if (err) throw new Error(err.message ?? "That code did not work");
      // Everyone lands on their profile. Nudge Face ID enroll when this device
      // can do UVPA but has no local passkey evidence yet.
      await goToProfileAfterPasswordlessGate(platformPasskey);
    } catch (e) {
      resetTurnstile();
      setError(e instanceof Error ? e.message : "That code did not work");
      setBusy(false);
    }
  };

  /**
   * Apple / iCloud users have no SSO here (the broker federates Google and X
   * only), so their path is a code by email. Tapping the Apple button puts the
   * form into that mode for real: the address field takes focus, and if an
   * address is already typed the code goes out immediately. (Scrolling to a
   * form the visitor can already see is not an action.)
   */
  const startCodeSignIn = (opts: { sendNow?: boolean } = {}) => {
    setError(null);
    setOtpStage("code");
    const field = emailRef.current;
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.focus();
    if (opts.sendNow && email.trim()) void sendCode();
  };

  const social = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      // OAuth / preview popup both use callbackURL=/account — do not navigate
      // here afterward or we overwrite the broker redirect with /account.
      await signIn(id, { callbackURL: "/account" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      // A popup closed by the visitor resolves without throwing — the buttons
      // must come back either way.
      setBusy(false);
    }
  };

  const passkeySignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      // Prefer platform (Face ID / Touch ID) over iOS hybrid QR — see passkey-sign-in.ts.
      const { error: err } = await signInWithPlatformPasskey();
      if (err) throw new Error(err.message ?? "Passkey sign-in failed");
      await goToProfileAfterSignIn();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Passkey sign-in failed";
      // User dismissed the sheet — not an error worth alarming over.
      if (/cancel|abort|notallowed/i.test(message)) {
        setBusy(false);
        return;
      }
      setError(message);
      setBusy(false);
    }
  };

  const emailAuth = async () => {
    setError(null);
    if (hpCompany.trim()) {
      setError("Could not continue");
      return;
    }
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
      const captchaHeaders = turnstileCaptchaHeaders();
      if (mode === "up") {
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
          callbackURL: "/account",
          fetchOptions: {
            headers: captchaHeaders,
          },
        });
        if (err) throw new Error(err.message ?? "Could not sign in");
      }
      await goToProfileAfterPasswordlessGate(platformPasskey);
    } catch (e) {
      resetTurnstile();
      setError(e instanceof Error ? e.message : "Could not continue");
      setBusy(false);
    }
  };

  // A session can outlive the page that made it: a dropped session read bounces
  // a signed-in visitor back here, and this page then has nothing to offer them.
  // Hard-navigate to the profile — soft client routing can leave the form up.
  useEffect(() => {
    if (!alreadySignedIn) return;
    window.location.replace("/account");
  }, [alreadySignedIn]);

  if (alreadySignedIn) {
    return (
      <main className="grid vault-page place-items-center bg-bg px-5 text-fg">
        <div className="mx-auto max-w-sm text-center">
          <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Signed in</p>
          <h1 className="mt-2 font-display text-2xl text-fg italic">Taking you to your profile…</h1>
          <a
            href="/account"
            className="mt-6 inline-flex min-h-11 items-center text-xs tracking-[0.18em] text-fg uppercase underline"
          >
            Go now
          </a>
          <p className="mt-8">
            <Link
              to="/"
              className="back-to-sky inline-flex min-h-11 items-center text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
            >
              Back to the sky
            </Link>
          </p>
        </div>
      </main>
    );
  }

  // Only providers the server said it can start. `GROK_PROVIDERS` supplies the
  // labels and the order; the served ids decide whether a button exists at all.
  const socialProviders = GROK_PROVIDERS.filter((provider) =>
    servedProviders.includes(provider.providerId),
  );

  // The note under the buttons. It must not imply Google/X exist when the
  // broker cannot be served — that is the same lie as a button that 404s.
  // Passkeys are Face ID / iCloud Keychain, not Sign in with Apple.
  // Only mention the modal button when it is actually offered.
  const signInNote = (() => {
    const passkeyHint = offerModalPasskey
      ? " A saved passkey unlocks with Face ID or Touch ID on this device."
      : passkeyOk
        ? " Sign in with email, then enable Face ID under Account."
        : "";
    if (socialProviders.length > 0) {
      return otpAvailable
        ? `Apple Sign-In isn't offered here — use your iCloud or Apple email for a code instead, no password to invent.${passkeyHint}`
        : `Your email works the same way, with a password, below.${passkeyHint}`;
    }
    return otpAvailable
      ? `Google, X, and Apple Sign-In aren't offered on this address. Your iCloud or Apple email gets you a code instead — no password to invent.${passkeyHint}`
      : `Google, X, and Apple Sign-In aren't offered on this address. Use your email and a password below.${passkeyHint}`;
  })();

  return (
    <main id="main-content" className="vault-page relative bg-bg px-5 text-fg">
      <div className="mx-auto w-full max-w-md pt-[var(--chrome-top)] pb-[max(6.5rem,calc(var(--chrome-bottom)+4.25rem))]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">
            Trust Your Sign · {SITE_OWNER.name}
          </p>
          <Link
            to="/"
            className="chrome-glow back-to-sky shrink-0 px-2 py-2 text-[0.65rem] tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
          >
            Back to the sky
          </Link>
        </div>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">Keep the sky.</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Sign in to save your chart, and the charts of people who gave you permission.
        </p>
        {from === "account" ? (
          <p className="mt-2 text-sm leading-relaxed text-fg-subtle">
            You were headed to your account — sign in to open your saved charts.
          </p>
        ) : null}
        <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
          <Link to="/about" className="underline underline-offset-4 hover:text-fg">
            Who keeps this house
          </Link>
        </p>

        {authEnabled ? (
          <div className="mt-8 space-y-3">
            {socialProviders
              .filter((p) => p.idp === "google")
              .map((p) => (
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
            {socialProviders
              .filter((p) => p.idp !== "google")
              .map((p) => (
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
            {/* No Apple SSO exists (the broker federates Google and X only), so
                the Apple path is a code by email. This starts that flow for
                real, and is only rendered when the host can send mail — never a
                button that merely scrolls the page. */}
            {otpAvailable ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => startCodeSignIn({ sendNow: true })}
                className="min-h-12 w-full rounded-md border border-border px-4 text-sm tracking-wide text-fg-muted hover:bg-bg-elevated hover:text-fg disabled:opacity-50"
              >
                Use Apple or iCloud email
              </button>
            ) : null}
            {/* App-owned WebAuthn — only when UVPA + local credential evidence.
                Never call discoverable get without allowCredentials — iOS opens hybrid QR.
                Not Sign in with Apple; Face ID comes from a passkey on this vault. */}
            {passkeyOk && offerModalPasskey ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void passkeySignIn()}
                className="min-h-12 w-full rounded-md border border-border px-4 text-sm tracking-wide text-fg-muted hover:bg-bg-elevated hover:text-fg disabled:opacity-50"
              >
                Face ID on this device
              </button>
            ) : passkeyOk ? (
              <p className="rounded-md border border-border/70 bg-bg-elevated/40 px-4 py-3 text-xs leading-relaxed text-fg-subtle">
                Sign in with email, then enable Face ID under Account. The Face ID button stays
                off until a passkey is enrolled on this device — or until you enter the email
                that already has one — so Safari never opens its Scan QR Code sheet.
              </p>
            ) : null}
            <p className="pt-1 text-xs leading-relaxed text-fg-subtle">{signInNote}</p>
          </div>
        ) : (
          <p className="mt-8 text-sm text-fg-subtle">Sign-in is disabled.</p>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <div className="flex gap-2 text-xs tracking-[0.18em] uppercase">
            <button
              type="button"
              className={cn("min-h-11 px-2", mode === "in" ? "text-fg" : "text-fg-muted")}
              onClick={() => {
                setMode("in");
                setOtpStage("idle");
                setOtp("");
                setError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={cn("min-h-11 px-2", mode === "up" ? "text-fg" : "text-fg-muted")}
              onClick={() => {
                setMode("up");
                setOtpStage("idle");
                setOtp("");
                setError(null);
              }}
            >
              Create account
            </button>
          </div>
          <form
            className="relative mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void (otpStage === "sent"
                ? verifyCode()
                : otpStage === "code"
                  ? sendCode()
                  : emailAuth());
            }}
          >
            {mode === "up" ? (
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
                  Name
                </span>
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
                {mode === "in" ? "Name or email" : "Email"}
              </span>
              <input
                ref={emailRef}
                type={mode === "in" ? "text" : "email"}
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // A code belongs to the address it was sent to: editing the
                  // address invalidates it, so step back and offer a fresh one
                  // instead of failing at verify time.
                  if (otpStage === "sent" && e.target.value.trim() !== codeSentTo) {
                    setOtpStage("code");
                    setOtp("");
                  }
                }}
                className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
                autoComplete={
                  mode === "in" && passkeyOk ? "username webauthn" : mode === "in" ? "username" : "email"
                }
                /* iOS otherwise capitalises the first letter and autocorrects:
                   an email typed on an iPhone arrives as "Technotrue@…". */
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={mode === "in" ? "you@email.com" : "you@icloud.com"}
              />
            </label>
            {otpStage === "sent" ? (
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
                  Code
                </span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(normalizeOtpInput(e.target.value))}
                  className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-center font-mono text-xl tracking-[0.35em] text-fg"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={OTP_LENGTH}
                  aria-label={`${OTP_LENGTH}-digit code sent to ${codeSentTo}`}
                />
                <span className="mt-2 block text-xs leading-relaxed text-fg-subtle">
                  {OTP_LENGTH} digits, sent to {codeSentTo} — or tap the button in that email. The
                  code expires in {Math.round(OTP_EXPIRES_SECONDS / 60)} minutes; the button lasts{" "}
                  {Math.round(SIGN_IN_LINK_EXPIRES_SECONDS / 60)}.
                </span>
              </label>
            ) : otpStage === "idle" ? (
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
                    Password
                  </span>
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
                {mode === "in" && otpAvailable ? (
                  // Same mail gate as "Email me a code": never a button the host
                  // cannot finish. Distinct from the code path — this mails a
                  // reset LINK that opens /reset-password, it does not sign anyone in.
                  resetSent ? (
                    <p className="text-xs leading-relaxed text-fg-subtle">
                      If that address has an account, a reset link is on its way — it lasts about an
                      hour and works once.
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void sendResetLink()}
                      className="min-h-9 text-xs tracking-[0.14em] text-fg-subtle uppercase hover:text-fg disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  )
                ) : null}
              </div>
            ) : null}
            <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <span>Company</span>
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hpCompany}
                onChange={(e) => setHpCompany(e.target.value)}
              />
            </label>
            {/* Shown for anything that can create an account: the Create-account tab, and
                            the code path at any time (a first-time code signs the visitor up).
                            Hidden once a code is out, since acceptance was required to send it. */}
            {(mode === "up" || otpStage === "code") && otpStage !== "sent" ? (
              <div className="space-y-2 pt-1 text-sm text-fg-muted">
                <label className="flex min-h-11 items-start gap-2">
                  <input
                    type="checkbox"
                    checked={ageOk}
                    onChange={(e) => setAgeOk(e.target.checked)}
                    className="mt-1"
                  />
                  <span>I am {MIN_AGE} or older.</span>
                </label>
                <label className="flex min-h-11 items-start gap-2">
                  <input
                    type="checkbox"
                    checked={legalOk}
                    onChange={(e) => setLegalOk(e.target.checked)}
                    className="mt-1"
                  />
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
            {/* A host can be configured to send mail and still be unable to reach
                anyone but the owner (a provider sandbox sender). Saying so beats
                letting a visitor wait for a code that will never arrive — and it
                must not point at a sign-in method this host does not offer. */}
            {otpSandbox &&
            email.trim() &&
            email.trim().toLowerCase() !== SITE_OWNER.email.toLowerCase() ? (
              <p className="text-xs leading-relaxed text-fg-muted">
                Mail on this host is still in trial mode, so only the owner's address can receive a
                code right now.{" "}
                {socialProviders.length > 0
                  ? "Signing in with Google or X works as usual."
                  : "There is no Google, X, or Apple Sign-In on this host to fall back on. Use a password below, or wait until mail is fully open."}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-wine">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy || !authEnabled}
              className="min-h-12 w-full rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase disabled:opacity-50"
            >
              {otpStage === "sent"
                ? "Sign in with code"
                : otpStage === "code"
                  ? "Email me a code"
                  : mode === "up"
                    ? "Create account"
                    : "Sign in with email"}
            </button>

            {/* The password-free path. Only rendered when the host can actually
                            send mail, so it is never a button that cannot finish. */}
            {otpAvailable ? (
              otpStage === "sent" ? (
                <>
                  <button
                    type="button"
                    disabled={busy || cooldownLeft > 0}
                    onClick={() => void sendCode()}
                    className="min-h-11 w-full rounded-md border border-border px-4 text-xs tracking-[0.18em] text-fg-muted uppercase hover:bg-bg-elevated hover:text-fg disabled:opacity-50"
                  >
                    {cooldownLeft > 0 ? `Another code in ${cooldownLeft}s` : "Send another code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStage("idle");
                      setOtp("");
                      setError(null);
                    }}
                    className="min-h-11 w-full px-4 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
                  >
                    Use a password instead
                  </button>
                </>
              ) : otpStage === "code" ? (
                <button
                  type="button"
                  onClick={() => {
                    setOtpStage("idle");
                    setError(null);
                  }}
                  className="min-h-11 w-full px-4 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
                >
                  Use a password instead
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startCodeSignIn({ sendNow: true })}
                  className="min-h-11 w-full rounded-md border border-border px-4 text-xs tracking-[0.18em] text-fg-muted uppercase hover:bg-bg-elevated hover:text-fg disabled:opacity-50"
                >
                  Email me a code instead
                </button>
              )
            ) : null}
          </form>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-fg-muted">
          Birth dates are personal data. We store them only on your account, never sell them, and
          delete them when you ask.{" "}
          <Link to="/privacy" className="text-fg underline">
            Privacy
          </Link>
          {" · "}
          <Link to="/terms" className="text-fg underline">
            Terms
          </Link>
        </p>
      </div>

      <Link
        to="/"
        className="back-to-sky absolute bottom-[max(1.25rem,var(--chrome-bottom))] left-1/2 z-10 -translate-x-1/2 px-5 py-3 font-display text-xl tracking-tight text-fg italic md:text-2xl"
      >
        Back to the sky
      </Link>
    </main>
  );
}
