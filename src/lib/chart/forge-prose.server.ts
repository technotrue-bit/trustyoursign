import type { Nativity } from "./schema";
import type { SkyNatal } from "./ephemeris";
import type { ForgeBirth, ForgeProseKey } from "./forge";

const SYSTEM = `You write short natal copy for The Vault. Voice: precise, unsentimental, architectural. Short paragraphs. No slang, emoji, tips lists, or "as an AI."

LAW:
- Use ONLY the tabulated sky provided. Do not invent degrees, houses, aspects, biography, or medical claims.
- Prefer concrete positions (planet in sign/house) already listed.
- Two to four short paragraphs unless asked for one cut.
- Address the native as you/your.`;

function tableCanon(nat: Nativity, sky: SkyNatal, birth: ForgeBirth): string {
  const lines: string[] = [
    `Name: ${nat.meta.name}`,
    `Birth: ${birth.year}-${birth.month}-${birth.day}`,
    `Place: ${birth.place ?? nat.meta.place}`,
    `One cut: ${nat.meta.oneCut}`,
    `Thesis seed: ${nat.meta.thesis}`,
  ];
  for (const b of sky.bodies) {
    lines.push(`${b.name}: ${b.note}`);
  }
  for (const p of nat.planets.slice(0, 12)) {
    lines.push(`${p.name} lon ${p.lon.toFixed(2)} house ${p.house}${p.retrograde ? " Rx" : ""}`);
  }
  return lines.join("\n").slice(0, 12000);
}

const ROOM_ASK: Record<ForgeProseKey, string> = {
  sky: "Write the Sky room: how this natal sky sits as a whole. Name sun, moon, rising if tabled.",
  body: "Write the Body room: how the chart lives in the body — one practice-facing cut from the table.",
  gates: "Write the Gates room: thresholds and doors in this chart from the tabled houses/angles.",
  machine: "Write the Machine room: decision architecture — how this sky chooses, from the table only.",
  readings: "Write a Readings essay: one forged reading in short paragraphs from the table.",
  bones: "Write Bones notes: spare positional reminders a reader should not forget.",
};

/**
 * One mode chunk per call. Returns null when XAI is missing (caller marks partial).
 * Throws on hard API failure after the attempt.
 */
export async function generateForgeProseChunk(
  key: ForgeProseKey,
  nat: Nativity,
  sky: SkyNatal,
  birth: ForgeBirth,
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const messages = [
    { role: "system" as const, content: SYSTEM },
    { role: "system" as const, content: tableCanon(nat, sky, birth) },
    { role: "user" as const, content: ROOM_ASK[key] },
  ];

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      messages,
      temperature: 0.35,
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Prose API ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Empty prose.");
  return text.slice(0, 4000);
}
