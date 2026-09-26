/**
 * Plan a research-nativity seed from private JSON. No database, no logging
 * of file bodies. The CLI is `scripts/seed-research-nativities.mjs`.
 */

export const RESEARCH_IDS = ["joey", "saige"];

export function gitignoreCoversPrivateSeeds(gitignoreText) {
  return gitignoreText.split("\n").some((line) => {
    const trimmed = line.trim();
    return trimmed === "seeds/private/" || trimmed === "seeds/private";
  });
}

/**
 * @param {{ name: string, text: string }[]} files
 * @returns {{ id: "joey" | "saige", payload: Record<string, unknown> }[]}
 */
export function planResearchSeed(files) {
  const planned = [];
  for (const file of files) {
    if (!file.name.endsWith(".json")) continue;
    let parsed;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      throw new Error(`${file.name} is not JSON`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${file.name} must be one nativity object`);
    }
    const id = typeof parsed.id === "string" ? parsed.id : "";
    const stem = file.name.slice(0, -".json".length);
    if (!RESEARCH_IDS.includes(id) || id !== stem) {
      throw new Error(`${file.name} must be joey.json or saige.json and its id must match`);
    }
    planned.push({ id, payload: parsed });
  }
  if (planned.length === 0) {
    throw new Error("no joey.json or saige.json in the private seed directory");
  }
  return planned;
}
