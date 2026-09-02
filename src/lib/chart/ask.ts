import { createServerFn } from "@tanstack/react-start";
import { buildCanon } from "./canon";
import { getNativity } from "./nativity";
import type { ChartId } from "./types";

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
  chartId: ChartId;
  question: string;
  notes: string[];
  history: { role: "user" | "vault"; text: string }[];
};

export const askTheChart = createServerFn({ method: "POST" })
  .validator((input: AskInput) => {
    const chartId = input?.chartId === "joey" ? "joey" : "saige";
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
    return { chartId, question, notes, history } as AskInput;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "The machine is quiet in this environment." };
    }

    const nativity = getNativity(data.chartId);
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
    messages.push({ role: "user", content: data.question });

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
    });

    if (!res.ok) {
      return { ok: false as const, error: "The machine did not answer. Try again." };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "The machine returned silence." };
    return { ok: true as const, text };
  });
