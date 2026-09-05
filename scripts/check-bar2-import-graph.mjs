import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";

const visited = new Map();
const threeHits = [];

function resolveImport(fromFile, spec) {
  if (spec.startsWith("@/")) return resolve("src", spec.slice(2));
  if (spec.startsWith(".")) return resolve(dirname(fromFile), spec);
  return null;
}

function tryFiles(base) {
  const cands = [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")];
  for (const c of cands) {
    if (existsSync(c)) return c;
  }
  return null;
}

function walk(file, stack) {
  const abs = tryFiles(file) || file;
  if (visited.has(abs)) return;
  visited.set(abs, stack.slice());
  let src;
  try {
    src = readFileSync(abs, "utf8");
  } catch {
    return;
  }
  const re =
    /(?:import|export)\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1] || m[2];
    if (!spec) continue;
    const isDynamic = m[0].startsWith("import(");
    if (spec === "three" || spec.startsWith("three/") || spec.startsWith("@react-three")) {
      const stmtStart = src.lastIndexOf("import", m.index);
      const stmt = src.slice(stmtStart, Math.min(src.length, m.index + spec.length + 4));
      if (/^import\s+type\b/.test(stmt)) continue;
      threeHits.push({
        file: abs.replace(/\\/g, "/"),
        spec,
        dynamic: isDynamic,
        via: stack.map((s) => s.replace(/\\/g, "/").split("/src/")[1] || s),
      });
      continue;
    }
    if (isDynamic) continue;
    const resolved = resolveImport(abs, spec);
    if (!resolved) continue;
    const next = tryFiles(resolved);
    if (!next) continue;
    walk(next, [...stack, abs]);
  }
}

for (const e of [
  resolve("src/lib/galaxy/store.ts"),
  resolve("src/components/overlay/VaultApp.tsx"),
]) {
  walk(e, []);
}

const rel = (p) => p.replace(/\\/g, "/").split("/src/")[1] || p;
console.log(
  JSON.stringify(
    {
      modulesVisited: visited.size,
      threeValueImports: threeHits.filter((h) => !h.dynamic).length,
      threeDynamicOnly: threeHits.filter((h) => h.dynamic).length,
      hits: threeHits.map((h) => ({
        file: rel(h.file),
        spec: h.spec,
        dynamic: h.dynamic,
        via: h.via.slice(-4).map(rel),
      })),
    },
    null,
    2,
  ),
);
