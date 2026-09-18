/**
 * Recover platform passkey credential IDs once the visitor’s email is known.
 *
 * Better Auth’s unauthenticated `/passkey/generate-authenticate-options`
 * returns an empty allowCredentials list (discoverable get). On iOS that opens
 * Scan QR. After Face ID enroll we normally keep IDs in localStorage + cookie;
 * when Safari drops that store, this lookup re-seeds IDs so the modal button
 * can call WebAuthn with `hints: ["client-device"]` + allowCredentials again.
 *
 * Credential IDs are picker hints (also sent in allowCredentials during auth),
 * not session secrets. Empty list for unknown emails — same shape always.
 */
import { createServerFn } from "@tanstack/react-start";
import { normalizePasskeyLookupEmail } from "./passkey-lookup-email";

export { normalizePasskeyLookupEmail } from "./passkey-lookup-email";

export type PasskeyCredentialLookup = {
  credentialIds: string[];
};

/**
 * Look up this email’s stored passkey credential IDs (public picker hints).
 * Always returns `{ credentialIds }` — empty when none / unknown / passkeys off.
 */
export const lookupPasskeyCredentialIds = createServerFn({ method: "POST" })
  .validator((email: string) => email)
  .handler(async ({ data: raw }): Promise<PasskeyCredentialLookup> => {
    const email = normalizePasskeyLookupEmail(typeof raw === "string" ? raw : "");
    if (!email) return { credentialIds: [] };

    const { passkeysConfigured } = await import("@/lib/auth/server");
    if (!passkeysConfigured) return { credentialIds: [] };

    try {
      const { getSql } = await import("@/lib/db.server");
      const sql = await getSql();
      const rows = await sql<{ credentialID: string }>`
        select p."credentialID" as "credentialID"
        from passkey p
        inner join "user" u on u."id" = p."userId"
        where lower(u."email") = ${email}
      `;
      const credentialIds = rows
        .map((r) => r.credentialID)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      return { credentialIds: [...new Set(credentialIds)] };
    } catch {
      // Table missing / DB down — treat as no recovery path, keep gated UI.
      return { credentialIds: [] };
    }
  });
