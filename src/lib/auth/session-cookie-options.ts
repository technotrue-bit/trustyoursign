/**
 * Options safe to pass to TanStack `setCookie` for any cookie name.
 * Strips `domain` on `__Host-` names so Safari/Chrome/Firefox all accept them.
 */

export type HostCookieEmitAttrs = {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none" | string;
  maxAge?: number;
  domain?: string;
};

export function hostCookieSetOptions(
  name: string,
  attrs: HostCookieEmitAttrs,
): {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge?: number;
} {
  const sameSiteRaw = (attrs.sameSite ?? "lax").toLowerCase();
  const sameSite =
    sameSiteRaw === "strict" || sameSiteRaw === "none" ? sameSiteRaw : "lax";
  const options: {
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    maxAge?: number;
  } = {
    path: attrs.path ?? "/",
    httpOnly: attrs.httpOnly ?? true,
    secure: attrs.secure ?? true,
    sameSite,
  };
  if (typeof attrs.maxAge === "number" && Number.isFinite(attrs.maxAge)) {
    options.maxAge = attrs.maxAge;
  }
  // `__Host-` forbids Domain — never forward it (even undefined can confuse
  // some cookie writers into emitting Domain=).
  void name;
  void attrs.domain;
  return options;
}
