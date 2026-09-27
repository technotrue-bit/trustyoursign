/** Pages that must stay reachable so the owner can sign in while the sky is closed. */
const EXEMPT_EXACT = new Set(["/login", "/signup", "/register", "/reset-password", "/maintenance"]);

export function isMaintenanceExemptPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (EXEMPT_EXACT.has(path)) return true;
  if (path.startsWith("/api/")) return true;
  if (path.startsWith("/auth/")) return true;
  return false;
}
