import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { insightsForSign } from "@/lib/galaxy/signInsights";
import { isSignId, signName } from "./sign-canon";
import { moonDayBrief, type MoonDayBrief } from "./moon-day";
import type { SignId } from "./types";

const enrichCache = new Map<string, { text: string; expiresAt: number }>();
const ENRICH_TTL_MS = 24 * 60 * 60 * 1000;

export type MoonSignBriefResult = {
  moon: MoonDayBrief;
  effect: string;
  from: "bones" | "machine";
};

/** Deterministic sky bulletin: moon facts + first lore line for the explored sign. */
export function deterministicMoonEffect(moon: MoonDayBrief, exploredSignId: SignId): string {
  const explored = signName(exploredSignId);
  const lore = insightsForSign(exploredSignId)[0]?.body?.trim() ?? "";
  const lit = Math.round(moon.illumination * 100);
  const lead = `${moon.phaseName}. The Moon is in ${moon.moonSignName} (${lit}% lit).`;
  const land =
    lore.length > 0
      ? ` For ${explored}: ${lore}`
      : ` For ${explored}: hold the weather of this moon without mistaking it for the whole chart.`;
  const close = ` When the Moon walks ${moon.moonSignName}, ${explored} feels that climate in the body first — not as a headline, as a tide.`;
  return `${lead}${land}${close}`.slice(0, 900);
}

async function enrichWithXai(
  moon: MoonDayBrief,
  exploredSignId: SignId,
  bones: string,
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const cacheKey = `${moon.dateKey}:${exploredSignId}`;
  const hit = enrichCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.text;

  const explored = signName(exploredSignId);
  const system = `You write a two-to-four sentence sky bulletin for Trust Your Sign.
VOICE: precise, unsentimental, architectural. No slang, emoji, tips lists, or "as an AI."
LAW: Use ONLY the facts and lore provided. Do not invent news, events, biography, medical claims, or degrees not given.
Name the explored sign and the Moon's phase and sign. End on how this moon lands on that sign.`;

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Facts:\n- Date: ${moon.dateKey}\n- Phase: ${moon.phaseName}\n- Illumination: ${Math.round(moon.illumination * 100)}%\n- Moon sign: ${moon.moonSignName}\n- Explored sign: ${explored}\n\nGrounded draft:\n${bones}\n\nRewrite tightly. Same facts only.`,
          },
        ],
        temperature: 0.35,
        max_tokens: 280,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (text.length < 40) return null;
    const clipped = text.slice(0, 900);
    enrichCache.set(cacheKey, { text: clipped, expiresAt: Date.now() + ENRICH_TTL_MS });
    return clipped;
  } catch {
    return null;
  }
}

export type MoonBriefSpeaker = (
  moon: MoonDayBrief,
  exploredSignId: SignId,
  bones: string,
) => Promise<string | null>;

/**
 * The open moon line is always the local draft. The paid rewrite runs only
 * when a signed-in caller asked for it. `speak` is the paid writer; tests
 * pass a stand-in so this never calls the live service.
 */
export async function resolveMoonBrief(input: {
  moon: MoonDayBrief;
  signId: SignId;
  enrich: boolean;
  signedIn: boolean;
  speak?: MoonBriefSpeaker;
}): Promise<MoonSignBriefResult> {
  const bones = deterministicMoonEffect(input.moon, input.signId);
  if (!input.enrich || !input.signedIn) {
    return { moon: input.moon, effect: bones, from: "bones" };
  }
  const spoken = input.speak ? await input.speak(input.moon, input.signId, bones) : null;
  if (!spoken) return { moon: input.moon, effect: bones, from: "bones" };
  return { moon: input.moon, effect: spoken, from: "machine" };
}

function signIdInput(input: { signId: string }): { signId: SignId } {
  const raw = String(input?.signId ?? "").trim().toLowerCase();
  if (!isSignId(raw)) throw new Error("Unknown sign.");
  return { signId: raw };
}

/**
 * Today's moon for an explored sign galaxy. Open to everyone.
 * This path never calls the paid writer, even if a caller asks it to.
 */
export const getMoonSignBrief = createServerFn({ method: "POST" })
  .validator(signIdInput)
  .handler(async ({ data }): Promise<MoonSignBriefResult> => {
    const moon = await moonDayBrief(new Date());
    return resolveMoonBrief({
      moon,
      signId: data.signId,
      enrich: false,
      signedIn: false,
    });
  });

/**
 * Rewrite today's moon in the house voice. Same sign-in check as the other
 * paid sky calls. A signed-out caller never reaches the writer.
 */
export const enrichMoonSignBrief = createServerFn({ method: "POST" })
  .validator(signIdInput)
  .middleware([authMiddleware])
  .handler(async ({ data }): Promise<MoonSignBriefResult> => {
    const moon = await moonDayBrief(new Date());
    return resolveMoonBrief({
      moon,
      signId: data.signId,
      enrich: true,
      signedIn: true,
      speak: enrichWithXai,
    });
  });
