import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { answerFromBones } from "./bones-ask";
import { buildCanon } from "./canon";
import type { ResearchChartId } from "./types";

const SYSTEM = `You are not a horoscope column and you are not a chatbot. You are the natal machine in the source document.

VOICE (non-negotiable):
- Write exactly as the source writes: precise, unsentimental, architectural. Short paragraphs. No slang, no emoji, no lists of “tips,” no “as an AI,” no “it could mean,” no astro-twitter tone.
- Prefer the source’s own sentences when they already answer. Quote positions exactly as tabled. Do not round, rename, or invent orbs, dates, or houses.
- Cadence like the source: “The sky does not argue.” “Wanting is never casual.” “Fall does not mean bad Moon.”

LAW:
- Use ONLY the source. Do not invent degrees, houses, aspects, biography, medical claims, or events that are not in the bones or field notes.
- If the source does not hold the answer, say so in that voice: “The bones do not hold that. Bring the correction.”
- Field notes are additional canon. They do not overwrite date, time, place, or tabulated longitudes unless they explicitly correct those.
- Answer the question that was asked. Two to six short paragraphs unless the question is a single diagnostic (then one cut is enough).
- Match the source’s person: she/her for Saige; you/your for Joey. Do not mix charts.`;

type AskInput = {
  chartId: ResearchChartId;
  question: string;
  notes: string[];
  history: { role: "user" | "vault"; text: string }[];
  focus?: string;
};

export const askTheChart = createServerFn({ method: "POST" })
  .validator((input: AskInput) => {
    if (input?.chartId !== "joey" && input?.chartId !== "saige") throw new Error("Not found");
    const chartId: ResearchChartId = input.chartId;
    const question = (input?.question ?? "").trim().slice(0, 500);
    if (question.length < 2) throw new Error("Ask something the bones can answer.");
    const notes = Array.isArray(input.notes)
      ? input.notes.filter((n) => typeof n === "string").slice(-12)
      : [];
    const history = Array.isArray(input.history)
      ? input.history
          .filter((h) => h && (h.role === "user" || h.role === "vault") && typeof h.text === "string")
          .slice(-8)
      : [];
    const focus = typeof input.focus === "string" ? input.focus.trim().slice(0, 80) : "";
    return { chartId, question, notes, history, focus } as AskInput;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { assertResearchOwner, loadResearchNativity } = await import("./nativities/load.server");
    await assertResearchOwner(context.userId);
    const nativity = loadResearchNativity(data.chartId);
    const bones = answerFromBones(nativity, data.question, data.focus);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: true as const, text: bones, from: "bones" as const };

    const canon = buildCanon(nativity, data.notes).slice(0, 32000);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM },
      { role: "system", content: canon },
    ];
    for (const turn of data.history) {
      messages.push({
        role: turn.role === "vault" ? "assistant" : "user",
        content: turn.text.slice(0, 2500),
      });
    }
    if (data.focus) {
      messages.push({
        role: "system",
        content: `The querent is looking at ${data.focus}. Answer from that body first. Name the position exactly as tabled.`,
      });
    }
    messages.push({ role: "user", content: data.question });

    try {
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
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) return { ok: true as const, text: bones, from: "bones" as const };
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) return { ok: true as const, text: bones, from: "bones" as const };
      return { ok: true as const, text, from: "machine" as const };
    } catch {
      return { ok: true as const, text: bones, from: "bones" as const };
    }
  });
