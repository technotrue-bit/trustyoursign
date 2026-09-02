import { getSql } from "@/lib/db";
import { OWNER_USER_ID, isSiteOwner, SITE_OWNER } from "@/lib/owner";

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

export async function loadDesk(): Promise<AiDesk> {
  const sql = await getSql();
  const rows = await sql<{ ai_json: unknown }>`select ai_json from site_state where id = 'vault'`;
  return parseDesk(rows[0]?.ai_json);
}

export async function saveDesk(desk: AiDesk) {
  const sql = await getSql();
  await sql`
    update site_state set ai_json = ${JSON.stringify(desk)}::jsonb where id = 'vault'
  `;
}

export async function assertOwner(userId: string) {
  if (userId === OWNER_USER_ID) return;
  const sql = await getSql();
  const rows = await sql<{ email: string | null; name: string | null }>`
    select email, name from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  if (isSiteOwner({ displayName: row?.name, primaryEmail: row?.email })) return;
  if (row?.email?.toLowerCase() === SITE_OWNER.email) return;
  throw new Error("Not found");
}

export async function talkToSky(opts: {
  kind: "light" | "deep";
  tone: "vault" | "warm";
  user: string;
  extra: string;
}): Promise<{ ok: true; text: string } | { ok: false; text: string }> {
  const desk = await loadDesk();
  if (desk.kill) return { ok: false, text: "The machine is resting." };
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, text: "The machine is quiet." };
  const model = opts.kind === "deep" ? desk.deepModel : desk.lightModel;
  const effort = opts.kind === "deep" ? desk.deepEffort : desk.lightEffort;
  const max_tokens = opts.kind === "deep" ? desk.deepTokens : desk.lightTokens;
  const system = opts.tone === "warm" ? desk.systemWarm : desk.systemVault;
  const timeout = opts.kind === "deep" ? 55000 : 12000;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: opts.user.slice(0, 8000) },
          ...(opts.extra ? [{ role: "system" as const, content: opts.extra.slice(0, 2000) }] : []),
        ],
        max_tokens,
        reasoning_effort: effort,
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return { ok: false, text: "The machine is quiet." };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false, text: "The machine is quiet." };
    return { ok: true, text };
  } catch {
    return { ok: false, text: "The machine is quiet." };
  }
}
