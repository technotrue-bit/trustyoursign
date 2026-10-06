import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const PREDICATE = fileURLToPath(new URL("./wantsMeshReview.ts", import.meta.url));
const VAULT = fileURLToPath(new URL("./VaultApp.tsx", import.meta.url));
const SHELL = fileURLToPath(new URL("./MeshReviewShell.tsx", import.meta.url));

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("mesh review stays off the first sky download", () => {
  it("keeps the URL check in a module that does not import the canvas", () => {
    const source = withoutComments(readFileSync(PREDICATE, "utf8"));
    assert.match(source, /export function wantsMeshReview/);
    assert.match(source, /import\.meta\.env\.DEV/);
    assert.match(source, /q === "sagittarius"/);
    assert.match(source, /q === "1"/);
    assert.match(source, /q === "sagitarius"/);
    assert.doesNotMatch(
      source,
      /from\s+["'](?:three|@react-three\/fiber|@react-three\/drei|three-stdlib)["']/,
    );
    assert.doesNotMatch(source, /MeshReviewShell|MeshReviewCanvas/);
  });

  it("lazy-loads the shell from VaultApp", () => {
    const source = withoutComments(readFileSync(VAULT, "utf8"));
    assert.match(source, /from\s+["']\.\/wantsMeshReview["']/);
    assert.match(source, /import\(\s*["']\.\/MeshReviewShell["']\s*\)/);
    assert.doesNotMatch(
      source,
      /import\s+(?:type\s+)?\{[^}]*\bMeshReviewShell\b[^}]*\}\s*from\s*["']\.\/MeshReviewShell["']/,
    );
    assert.doesNotMatch(
      source,
      /import\s+MeshReviewShell\s+from\s*["']\.\/MeshReviewShell["']/,
    );
    assert.match(source, /Mesh review failed to load\./);
    assert.match(source, /<Suspense fallback=\{<MeshReviewLoading/);
  });

  it("keeps the canvas failure sentence on the shell", () => {
    const source = withoutComments(readFileSync(SHELL, "utf8"));
    assert.match(source, /Mesh review failed to load\./);
    assert.doesNotMatch(source, /export function wantsMeshReview/);
  });
});
