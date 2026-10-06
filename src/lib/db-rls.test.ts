import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AppRls } from "./db-rls.server.ts";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC_ROOT = join(REPO_ROOT, "src");

/**
 * The six paths the seam test used to hard-code. The walk must still cover
 * them; dropping one would weaken the check #36 added.
 */
const ORIGINAL_CLIENT_MODULES = [
  "src/lib/site.ts",
  "src/lib/charts.ts",
  "src/lib/chart/sky.ts",
  "src/lib/owner.ts",
  "src/lib/db.ts",
  "src/lib/auth/middleware.ts",
];

/** Node tests that import `*.server.ts` on purpose. They are not client modules. */
const SERVER_IMPORTING_TESTS = [
  "src/lib/db-rls.test.ts",
  "src/lib/email/email.test.ts",
  "src/lib/owner-password.test.ts",
];

/**
 * Static import charts.ts used before #36, pointed at the module that split
 * created. Kept as a string so the check can fail on that shape without
 * putting the import back in the app.
 */
const PRE_36_STATIC_DB_SERVER = [
  'import { createServerFn } from "@tanstack/react-start";',
  'import { getSql } from "@/lib/db.server";',
  'import { authMiddleware } from "@/lib/auth/middleware";',
].join("\n");

const SEAM_HINT =
  "Dynamic-import it inside the server function, as src/lib/db.ts and src/lib/charts.ts already do.";

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function repoPath(abs: string): string {
  return toPosix(relative(REPO_ROOT, abs));
}

/** Every `src` `*.ts` / `*.tsx` that is not a server module and not a test. */
function clientModulePaths(): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(SRC_ROOT, { recursive: true })) {
    const rel = toPosix(String(entry));
    if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) continue;
    const base = rel.slice(rel.lastIndexOf("/") + 1);
    if (base.endsWith(".server.ts") || base.endsWith(".server.tsx")) continue;
    if (base.endsWith(".test.ts") || base.endsWith(".test.tsx")) continue;
    // The auth entry is `server.ts`, not `*.server.ts`. It is the server
    // graph (it may import the driver). This check does not rewrite auth.
    if (base === "server.ts" || base === "server.tsx") continue;
    out.push(join(SRC_ROOT, rel));
  }
  return out;
}

function seamMessage(file: string, spec: string): string {
  return `${file} statically imports "${spec}". ${SEAM_HINT}`;
}

/**
 * Drop comments without joining tokens. Strings stay, so a URL's `//` is not
 * treated as a comment and a real import specifier is still visible.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const n = src[i + 1];
    if (c === '"' || c === "'" || c === "`") {
      out += c;
      i++;
      while (i < src.length) {
        const ch = src[i]!;
        out += ch;
        i++;
        if (ch === "\\") {
          if (i < src.length) {
            out += src[i];
            i++;
          }
          continue;
        }
        if (ch === c) break;
      }
      continue;
    }
    if (c === "/" && n === "/") {
      i += 2;
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

type StaticImport = { spec: string; typeOnly: boolean };

function isTypeOnlyClause(clause: string): boolean {
  const body = clause.trim();
  if (/^type\b/.test(body)) return true;
  const braced = body.match(/^\{([\s\S]*)\}$/);
  if (!braced) return false;
  const parts = braced[1]!
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => /^type\b/.test(part));
}

/** Top-level `import` / `export … from`. Dynamic `import()` has no `from`. */
function staticImports(src: string): StaticImport[] {
  const code = stripComments(src);
  const hits: StaticImport[] = [];
  const re = /(?:^|\n)[ \t]*(import|export)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code))) {
    const kind = match[1]!;
    const start = match.index + match[0].length - kind.length;
    const after = code.slice(start + kind.length);
    if (kind === "import" && /^\s*\(/.test(after)) continue;

    let end = start + kind.length;
    let brace = 0;
    let paren = 0;
    let quote: string | null = null;
    while (end < code.length) {
      const ch = code[end]!;
      if (quote) {
        if (ch === "\\") {
          end += 2;
          continue;
        }
        if (ch === quote) quote = null;
        end++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        end++;
        continue;
      }
      if (ch === "{") brace++;
      else if (ch === "}") brace = Math.max(0, brace - 1);
      else if (ch === "(") paren++;
      else if (ch === ")") paren = Math.max(0, paren - 1);
      else if (ch === ";" && brace === 0 && paren === 0) {
        end++;
        break;
      } else if (ch === "\n" && brace === 0 && paren === 0) {
        const soFar = code.slice(start, end);
        const next = code.slice(end + 1);
        if (/^[ \t]*(?:import|export)\b/.test(next) || /\bfrom\s*["'][^"']+["']\s*$/.test(soFar)) {
          break;
        }
      }
      end++;
    }
    re.lastIndex = end;
    const stmt = code.slice(start, end).trim();
    const side = stmt.match(/^import\s*(["'])([^"']+)\1\s*;?$/);
    if (side) {
      hits.push({ spec: side[2]!, typeOnly: false });
      continue;
    }
    const from = stmt.match(/\bfrom\s*(["'])([^"']+)\1\s*;?\s*$/);
    if (!from) continue;
    const clause = stmt.slice(kind.length, stmt.lastIndexOf(from[0]!)).trim();
    hits.push({ spec: from[2]!, typeOnly: isTypeOnlyClause(clause) });
  }
  return hits;
}

function bareSpecifier(spec: string): string {
  return spec.split("?")[0]!.split("#")[0]!;
}

/** `*.server` module, with or without a file extension. Not `auth/server.ts`. */
function isServerModuleSpecifier(spec: string): boolean {
  return /(?:^|\/)[^/]+\.server(?:\.[a-zA-Z0-9]+)?$/.test(bareSpecifier(spec));
}

function isDbServerSpecifier(spec: string): boolean {
  return /(?:^|\/)db\.server(?:\.[a-zA-Z0-9]+)?$/.test(bareSpecifier(spec));
}

function isDbRlsSpecifier(spec: string): boolean {
  return /(?:^|\/)db-rls(?:\.[a-zA-Z0-9]+)?$/.test(bareSpecifier(spec));
}

function isAsyncHooksSpecifier(spec: string): boolean {
  return bareSpecifier(spec) === "node:async_hooks";
}

/**
 * Value imports of a server module fail. `import type` is erased and stays
 * legal, except the pre-#36 markers (`db.server`, `db-rls`, `node:async_hooks`),
 * which the old string check flagged even inside a type import.
 */
function importIsForbidden(hit: StaticImport): boolean {
  if (
    isAsyncHooksSpecifier(hit.spec) ||
    isDbRlsSpecifier(hit.spec) ||
    isDbServerSpecifier(hit.spec)
  ) {
    return true;
  }
  if (hit.typeOnly) return false;
  return isServerModuleSpecifier(hit.spec);
}

function seamViolations(src: string, file: string): string[] {
  return staticImports(src)
    .filter(importIsForbidden)
    .map((hit) => seamMessage(file, hit.spec));
}

describe("client bundle isolation", () => {
  it("derives the client file list instead of a hand-written six", () => {
    const files = clientModulePaths().map(repoPath);
    for (const required of ORIGINAL_CLIENT_MODULES) {
      assert.ok(files.includes(required), `walk dropped ${required}`);
    }
    for (const testFile of SERVER_IMPORTING_TESTS) {
      assert.equal(files.includes(testFile), false, `${testFile} must stay out of the client walk`);
    }
    assert.equal(files.includes("src/lib/auth/server.ts"), false);
    assert.equal(
      files.some((file) => file.endsWith(".server.ts") || file.endsWith(".test.ts")),
      false,
    );
    assert.ok(files.length > ORIGINAL_CLIENT_MODULES.length);
  });

  it("keeps static server imports out of client modules", () => {
    const problems: string[] = [];
    for (const file of clientModulePaths()) {
      problems.push(...seamViolations(readFileSync(file, "utf8"), repoPath(file)));
    }
    assert.deepEqual(problems, []);
  });

  it("fails on the pre-#36 static db.server import shape", () => {
    const problems = seamViolations(PRE_36_STATIC_DB_SERVER, "src/lib/charts.ts");
    assert.equal(problems.length, 1);
    assert.match(problems[0]!, /statically imports "@\/lib\/db\.server"/);
    assert.match(problems[0]!, /Dynamic-import it inside the server function/);
    assert.match(problems[0]!, /src\/lib\/db\.ts/);
  });

  it("still fails on the other pre-#36 client imports", () => {
    const hooks = seamViolations(
      'import { AsyncLocalStorage } from "node:async_hooks";',
      "src/lib/db-rls.ts",
    );
    const rls = seamViolations('import { AppRls } from "@/lib/db-rls";', "src/lib/site.ts");
    const relativeRls = seamViolations('import { AppRls } from "./db-rls";', "src/lib/db.ts");
    assert.match(hooks[0]!, /node:async_hooks/);
    assert.match(rls[0]!, /@\/lib\/db-rls/);
    assert.match(relativeRls[0]!, /\.\/db-rls/);
    for (const problem of [...hooks, ...rls, ...relativeRls]) {
      assert.match(problem, /Dynamic-import it inside the server function/);
      assert.match(problem, /src\/lib\/db\.ts/);
    }
  });

  it("allows a dynamic import and a type-only server import", () => {
    const dynamic = seamViolations(
      [
        'export const listCharts = createServerFn({ method: "GET" })',
        "  .handler(async () => {",
        '    const { getSql } = await import("@/lib/db.server");',
        "    return getSql();",
        "  });",
      ].join("\n"),
      "src/lib/charts.ts",
    );
    const typeOnly = seamViolations(
      'import type { EmailMessage } from "@/lib/email/send.server";',
      "src/lib/admin/invite-beta.ts",
    );
    const commented = seamViolations(
      '/**\n * import { getSql } from "@/lib/db.server";\n */\nexport const ok = 1;\n',
      "src/lib/auth/middleware.ts",
    );
    assert.deepEqual(dynamic, []);
    assert.deepEqual(typeOnly, []);
    assert.deepEqual(commented, []);
  });

  it("scopes RLS context on Node", async () => {
    let seen: string | undefined;
    await AppRls.run({ userId: "u1" }, async () => {
      seen = AppRls.current()?.userId;
    });
    assert.equal(seen, "u1");
    assert.equal(AppRls.current(), undefined);
  });
});
