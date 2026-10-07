/**
 * Whether the login bot check is fully configured.
 *
 * Both the server secret and the public site key must be set. One of them is
 * not enough: the page cannot finish a check the server will not verify, and
 * the server must not demand a check the page cannot show. Empty and
 * whitespace-only values count as unset.
 *
 * Callers pass the env they mean to read. The default is this process. The
 * function returns a boolean only — it never returns the key values.
 */
export function loginBotCheckConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(readSet(env, "TURNSTILE_SECRET_KEY") && readSet(env, "VITE_TURNSTILE_SITE_KEY"));
}

function readSet(env: Record<string, string | undefined>, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
