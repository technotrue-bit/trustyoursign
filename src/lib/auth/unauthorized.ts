/**
 * Client-safe check for the session middleware's refusal.
 *
 * `requireUserId` throws `UnauthorizedError` with the message exactly
 * `"Unauthorized"`. TanStack delivers that message to the browser. A lapsed
 * or unverifiable cookie must send the visitor to sign-in — it is not a
 * failed chart read.
 */
export function isUnauthorizedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return msg === "Unauthorized" || /\bunauthorized\b/i.test(msg);
}
