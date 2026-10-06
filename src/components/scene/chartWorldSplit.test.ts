import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const CANVAS = fileURLToPath(new URL("./ChartCanvas.tsx", import.meta.url));
const WORLD = fileURLToPath(new URL("./ChartWorld.tsx", import.meta.url));
const HUD = fileURLToPath(new URL("../overlay/SignGalaxyHud.tsx", import.meta.url));

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("natal wheel stays off the corridor download", () => {
  it("loads ChartWorld only when a chart view opens", () => {
    const source = withoutComments(readFileSync(CANVAS, "utf8"));
    assert.match(source, /import\(\s*["']\.\/ChartWorld["']\s*\)/);
    assert.match(source, /const SCENE_GATE_MS = 48/);
    assert.doesNotMatch(source, /from\s+["']@react-three\/drei["']/);
    assert.doesNotMatch(source, /from\s+["']three-stdlib["']/);
    assert.doesNotMatch(source, /\bOrbitControls\b/);
    assert.doesNotMatch(source, /<Stars\b/);
  });

  it("keeps orbit controls and the starfield on the chart module", () => {
    const source = withoutComments(readFileSync(WORLD, "utf8"));
    assert.match(source, /export function ChartWorld/);
    assert.match(
      source,
      /import\s*\{[^}]*\bOrbitControls\b[^}]*\bStars\b[^}]*\}\s*from\s*["']@react-three\/drei["']/,
    );
    assert.match(source, /<OrbitControls\b/);
    assert.match(source, /<Stars\b/);
  });

  it("starts the chart file from Begin birth chart", () => {
    const source = withoutComments(readFileSync(HUD, "utf8"));
    assert.match(source, /import\(\s*["']@\/components\/scene\/ChartWorld["']\s*\)/);
    assert.match(source, /openClaim\(sign\.id\)/);
    assert.match(source, /Begin birth chart/);
  });
});
