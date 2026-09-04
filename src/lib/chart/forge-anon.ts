const KEY = "vault-forge-anon";

export function getForgeAnonKey(): string {
  if (typeof window === "undefined") return "server-anon-placeholder";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return `anon-mem-${Date.now()}`;
  }
}
