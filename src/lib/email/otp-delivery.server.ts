/**
 * Better Auth's email-OTP send endpoint always returns `{ success: true }` even
 * when `sendVerificationOTP` throws — `runInBackgroundOrAwait` swallows the
 * error. We record the real delivery outcome here so the login UI can ask
 * after the BA call and refuse to advance to "code sent" on failure.
 */

export type OtpDeliveryResult = {
  ok: boolean;
  message?: string;
  at: number;
};

const recent = new Map<string, OtpDeliveryResult>();
const TTL_MS = 60_000;

function key(email: string): string {
  return email.trim().toLowerCase();
}

function prune(now = Date.now()) {
  for (const [k, row] of recent) {
    if (now - row.at > TTL_MS) recent.delete(k);
  }
}

export function recordOtpDelivery(email: string, result: { ok: boolean; message?: string }) {
  prune();
  recent.set(key(email), { ...result, at: Date.now() });
}

/** Read and clear the latest delivery result for this address (or null if none/stale). */
export function takeOtpDelivery(email: string): OtpDeliveryResult | null {
  prune();
  const k = key(email);
  const row = recent.get(k) ?? null;
  if (row) recent.delete(k);
  return row;
}

/** Test helper — empty the map between cases. */
export function clearOtpDeliveryForTests() {
  recent.clear();
}
