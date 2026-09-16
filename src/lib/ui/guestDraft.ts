import type { SignId } from "@/lib/chart/types";
import type { BirthFacts } from "@/lib/chart/session/types";

/**
 * The in-progress guest birth input, kept alive across reloads and sign-in
 * redirects within this tab (build plan D2 / F7: never throw away in-progress
 * birth input when someone bounces to Google / X / an email code).
 *
 * sessionStorage, not localStorage: birth data is personal, and the stated
 * privacy posture is that birth facts are stored only after consent, on the
 * account. This is an in-tab working buffer — it dies with the tab and never
 * persists to disk beyond the browser session.
 */

const KEY = "vault.guest-draft.v1";

export type GuestDraft = {
  signId: SignId;
  birth: BirthFacts | null;
};

export function saveGuestDraft(signId: SignId, birth: BirthFacts | null): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ signId, birth }));
  } catch {
    /* private mode — the in-memory claim still works */
  }
}

export function readGuestDraft(): GuestDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestDraft;
    if (!parsed || typeof parsed.signId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}
