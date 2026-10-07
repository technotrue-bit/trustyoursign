export type Effort = "low" | "medium" | "high" | "xhigh";

export type AiDesk = {
  kill: boolean;
  lightModel: string;
  lightEffort: Effort;
  lightTokens: number;
  deepModel: string;
  deepEffort: Effort;
  deepTokens: number;
  systemVault: string;
  systemWarm: string;
};

export const DEFAULT_DESK: AiDesk = {
  kill: false,
  lightModel: "grok-4.5",
  lightEffort: "low",
  lightTokens: 520,
  deepModel: "grok-4.6",
  deepEffort: "xhigh",
  deepTokens: 2200,
  systemVault: `You are the natal machine of The Vault. Voice: precise, unsentimental, architectural. Short paragraphs. No slang, no emoji, no tips, no “as an AI,” no horoscope-column cheer.
LAW: Use ONLY the tabulated positions given. Do not invent degrees, houses, orbs, biography, or medical claims. If it is not tabled, say the bones do not hold that.
Person: you/your. Cadence like: “The sky does not argue.”`,
  systemWarm: `You are the natal machine of The Vault, speaking more softly. Same LAW: do not invent degrees, houses, orbs, or medical claims. Use only what is tabled.
Cadence may be warmer, spacious, a little new-age — porch at dusk, not a deposition. Still no slang soup, no guarantees, no “the universe promised.” Person: you/your.`,
};

function asEffort(v: unknown, fallback: Effort): Effort {
  return v === "low" || v === "medium" || v === "high" || v === "xhigh" ? v : fallback;
}

/** Keep only the desk settings the owner form shows. Extra fields are dropped. */
export function parseDesk(raw: unknown): AiDesk {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DESK };
  const o = raw as Record<string, unknown>;
  return {
    kill: Boolean(o.kill),
    lightModel: typeof o.lightModel === "string" && o.lightModel.startsWith("grok-") ? o.lightModel.slice(0, 32) : DEFAULT_DESK.lightModel,
    lightEffort: asEffort(o.lightEffort, DEFAULT_DESK.lightEffort),
    lightTokens: Math.min(2000, Math.max(120, Number(o.lightTokens) || DEFAULT_DESK.lightTokens)),
    deepModel: typeof o.deepModel === "string" && o.deepModel.startsWith("grok-") ? o.deepModel.slice(0, 32) : DEFAULT_DESK.deepModel,
    deepEffort: asEffort(o.deepEffort, DEFAULT_DESK.deepEffort),
    deepTokens: Math.min(8000, Math.max(400, Number(o.deepTokens) || DEFAULT_DESK.deepTokens)),
    systemVault: typeof o.systemVault === "string" && o.systemVault.trim() ? o.systemVault.slice(0, 4000) : DEFAULT_DESK.systemVault,
    systemWarm: typeof o.systemWarm === "string" && o.systemWarm.trim() ? o.systemWarm.slice(0, 4000) : DEFAULT_DESK.systemWarm,
  };
}
