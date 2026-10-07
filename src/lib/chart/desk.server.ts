import { getSql } from "@/lib/db.server";
import { assertSiteOwner } from "@/lib/owner.server";
import { parseDesk, type AiDesk } from "./desk";

export { DEFAULT_DESK, parseDesk, type AiDesk, type Effort } from "./desk";

const DESK_TTL_MS = 30_000;
let deskCache: { desk: AiDesk; expiresAt: number } | null = null;

function clearDeskCache() {
  deskCache = null;
}

export async function loadDesk(): Promise<AiDesk> {
  if (deskCache && deskCache.expiresAt > Date.now()) return deskCache.desk;
  const sql = await getSql();
  const rows = await sql<{ ai_json: unknown }>`select ai_json from site_state where id = 'vault'`;
  const desk = parseDesk(rows[0]?.ai_json);
  deskCache = { desk, expiresAt: Date.now() + DESK_TTL_MS };
  return desk;
}

export async function saveDesk(desk: AiDesk) {
  clearDeskCache();
  const sql = await getSql();
  await sql`
    update site_state set ai_json = ${JSON.stringify(desk)}::jsonb where id = 'vault'
  `;
}

/** @deprecated Prefer assertSiteOwner from @/lib/owner — kept as a re-export for sky.ts callers. */
export const assertOwner = assertSiteOwner;

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
