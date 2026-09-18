/**
 * Cross-browser durable session cookie delivery.
 *
 * Safari / iOS drop cookies that never land or lack Max-Age. TanStack Start
 * does not always forward Better Auth's Set-Cookie bag, and
 * `tanstackStartCookies` swallows `setCookie` errors — so email/OAuth sign-in
 * can look signed-in in-memory until reload. Gate already dual-emitted; this
 * module is the shared path for every sign-in.
 */

import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { parseSetCookieHeader } from "better-auth/cookies";
import { SESSION_TOKEN_COOKIE } from "./session-cookie-names.ts";
import {
  hostCookieSetOptions,
  type HostCookieEmitAttrs,
} from "./session-cookie-options.ts";

export {
  hostCookieSetOptions,
  type HostCookieEmitAttrs,
} from "./session-cookie-options.ts";

const LOG = "[host-session-cookie]";

type EmitCtx = {
  setSignedCookie: (
    name: string,
    value: string,
    secret: string,
    attributes: Record<string, unknown>,
  ) => Promise<string>;
  context: {
    secret: string;
    responseHeaders?: Headers;
    authCookies: {
      sessionToken: { attributes: HostCookieEmitAttrs };
    };
    sessionConfig: { expiresIn: number };
  };
};

/**
 * Sign + dual-emit the session token: TanStack response store + Better Auth
 * responseHeaders (so `tanstackStartCookies` can forward if it runs).
 */
export async function emitHostSessionCookie(
  ctx: EmitCtx,
  sessionTokenName: string,
  sessionToken: string,
  maxAgeOverride?: number,
): Promise<string | null> {
  const attributes = ctx.context.authCookies.sessionToken.attributes;
  const maxAge = maxAgeOverride ?? ctx.context.sessionConfig.expiresIn;
  const cookieOptions = {
    ...attributes,
    maxAge,
  };

  let signedCookie: string;
  try {
    signedCookie = await ctx.setSignedCookie(
      sessionTokenName,
      sessionToken,
      ctx.context.secret,
      cookieOptions,
    );
  } catch (err) {
    console.error(`${LOG} setSignedCookie failed`, err);
    return null;
  }

  const sessionValue = parseSetCookieHeader(signedCookie).get(sessionTokenName)?.value;
  if (!sessionValue) {
    console.error(`${LOG} signed Set-Cookie missing session token value`, {
      cookiePreview: signedCookie.slice(0, 120),
    });
    return null;
  }

  try {
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(
      sessionTokenName,
      sessionValue,
      hostCookieSetOptions(sessionTokenName, {
        ...cookieOptions,
        maxAge,
      }),
    );
  } catch (err) {
    console.error(`${LOG} TanStack setCookie failed`, err);
  }

  try {
    const responseHeaders = ctx.context.responseHeaders;
    if (responseHeaders) {
      responseHeaders.append("set-cookie", signedCookie);
    } else {
      console.error(`${LOG} ctx.context.responseHeaders is missing`);
    }
  } catch (err) {
    console.error(`${LOG} responseHeaders.append(set-cookie) failed`, err);
  }

  return sessionValue;
}

/**
 * Re-emit any `__Host-` session token already on responseHeaders through TanStack
 * with sanitized options. Runs before `tanstackStartCookies` (which stays last).
 */
export function hostSessionCookieEmit(): BetterAuthPlugin {
  return {
    id: "host-session-cookie-emit",
    hooks: {
      after: [
        {
          matcher() {
            return true;
          },
          handler: createAuthMiddleware(async (ctx) => {
            const headers = ctx.context.responseHeaders;
            if (!(headers instanceof Headers)) return;
            const setCookies = headers.get("set-cookie");
            if (!setCookies) return;

            const sessionName =
              ctx.context.authCookies.sessionToken.name || SESSION_TOKEN_COOKIE;
            const parsed = parseSetCookieHeader(setCookies);
            const entry = parsed.get(sessionName);
            if (!entry?.value) return;

            const maxAge =
              typeof entry["max-age"] === "number"
                ? entry["max-age"]
                : ctx.context.sessionConfig.expiresIn;

            try {
              const { setCookie } = await import("@tanstack/react-start/server");
              setCookie(
                sessionName,
                entry.value,
                hostCookieSetOptions(sessionName, {
                  path: entry.path ?? "/",
                  httpOnly: entry.httponly ?? true,
                  secure: entry.secure ?? true,
                  sameSite: entry.samesite,
                  maxAge,
                }),
              );
            } catch (err) {
              console.error(`${LOG} after-hook TanStack setCookie failed`, err);
            }
          }),
        },
      ],
    },
  };
}
