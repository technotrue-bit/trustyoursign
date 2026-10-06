import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Account, Your sky code, the owner desk, and the users page.
 * Confirmed in the plan as these four route files.
 */
const SESSION_PAGES = [
  "src/routes/account.tsx",
  "src/routes/sky-code.tsx",
  "src/routes/admin.tsx",
  "src/routes/admin_.users.tsx",
] as const;

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** A value import of RequireSession from the shared gate. The rest of the file is ignored. */
function importsRequireSession(source: string): boolean {
  const pattern =
    /import\s+(?!type\b)\{([^}]*)\}\s*from\s*["']@\/lib\/auth\/gates["']/g;
  for (const match of withoutComments(source).matchAll(pattern)) {
    const names = match[1] ?? "";
    if (/\btype\s+RequireSession\b/.test(names)) continue;
    if (/\bRequireSession\b/.test(names)) return true;
  }
  return false;
}

describe("the four account pages keep the one sign-in screen", () => {
  for (const page of SESSION_PAGES) {
    it(`${page} imports RequireSession from @/lib/auth/gates`, () => {
      const source = readFileSync(join(REPO_ROOT, page), "utf8");
      assert.equal(
        importsRequireSession(source),
        true,
        `${page} must import RequireSession from @/lib/auth/gates so this page keeps the one sign-in screen.`,
      );
    });
  }
});
