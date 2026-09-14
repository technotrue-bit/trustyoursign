/**
 * The tap-to-sign-in link: its constants, and the one-shot relay that lets a
 * single email carry both the code and the link.
 *
 * Better Auth's `magicLink` plugin builds the URL (token + callback, on the
 * request's own origin) and hands it to `sendMagicLink`. A code sign-in must not
 * produce a second message, so `sendVerificationOTP` opens a claim for that
 * address, the plugin's handler offers the URL here instead of mailing it, and
 * the code email carries both.
 *
 * Keyed by address, so two visitors in flight on the same instance can never be
 * handed each other's link; one-shot, so a claimed link is never offered twice.
 * A URL nobody claims still becomes an email (`sendSignInLinkEmail`), so calling
 * `/sign-in/magic-link` directly keeps working.
 *
 * Dependency-free: the sign-in UI, the mail copy and the tests all import this
 * without pulling the server module graph in.
 */

/** How long a sign-in link stays valid. Longer than a code — a link is one tap. */
export const SIGN_IN_LINK_EXPIRES_SECONDS = 900;

/** Where a link lands once it has signed someone in. */
export const SIGN_IN_LINK_CALLBACK_PATH = "/account";

export type SignInLinkClaim = (url: string) => void;

const key = (email: string) => email.trim().toLowerCase();

export function createSignInLinkRelay() {
  let pending: { email: string; claim: SignInLinkClaim } | null = null;

  return {
    /** Take the next link minted for `email` instead of letting it be emailed. */
    absorb(email: string, claim: SignInLinkClaim): void {
      pending = { email: key(email), claim };
    },

    /** Drop an unclaimed absorption — the mint failed, or the send is over. */
    release(): void {
      pending = null;
    },

    /**
     * Offer a freshly minted link. `true` means the address that asked for it
     * claimed it, and the caller must not send anything itself.
     */
    offer(email: string, url: string): boolean {
      if (!pending || pending.email !== key(email) || !url) return false;
      const { claim } = pending;
      pending = null;
      claim(url);
      return true;
    },
  };
}

export type SignInLinkRelay = ReturnType<typeof createSignInLinkRelay>;
