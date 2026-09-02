import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { formatBirth, formatClock } from "./sun";
import {
  computeBigThree,
  geocodePlace,
  localToUtc,
  type SkyBody,
  type SkyNatal,
} from "./ephemeris";
import { answerFromSky } from "./bones-ask";

export type { SkyNatal, SkyBody };

function asTone(v: string): "vault" | "warm" {
  return v === "warm" ? "warm" : "vault";
}

function seedCopy(bodies: SkyBody[]): SkyBody[] {
  return bodies.map((b) => {
    if (b.headline) return b;
    return {
      ...b,
      headline: `${b.name} in ${b.signName}.`,
      why: b.note,
      body: [`${b.name} at ${b.note}. The rest of the book is not written yet.`],
    };
  });
}

export const computeSky = createServerFn({ method: "POST" })
  .validator((input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    place: string;
    tone?: string;
  }) => {
    const year = Math.floor(Number(input.year));
    const month = Math.floor(Number(input.month));
    const day = Math.floor(Number(input.day));
    const hour = Math.floor(Number(input.hour));
    const minute = Math.floor(Number(input.minute));
    const place = (input.place ?? "").trim().slice(0, 120);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1926) throw new Error("That date cannot be read.");
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("That time cannot be read.");
    if (place.length < 2) throw new Error("Name the place.");
    return { year, month, day, hour, minute, place, tone: asTone(input.tone ?? "vault") };
  })
  .handler(async ({ data }): Promise<SkyNatal> => {
    const geo = await geocodePlace(data.place);
    const utc = localToUtc(data.year, data.month, data.day, data.hour, data.minute, geo.timeZone);
    const sky = computeBigThree(utc, geo);
    const when = `${formatBirth(data.month, data.day, data.year)} · ${formatClock(data.hour, data.minute)}`;
    return {
      ...sky,
      bodies: seedCopy(sky.bodies),
      depth: "three",
      tone: data.tone,
      when,
      writtenAt: null,
    };
  });

export const getSkyPass = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ last_deep_at: string | null; entitlement: string }>`
      select last_deep_at, entitlement from sky_pass where user_id = ${context.userId}
    `;
    const last = rows[0]?.last_deep_at ? new Date(rows[0].last_deep_at).getTime() : 0;
    const week = 7 * 24 * 60 * 60 * 1000;
    const remainingDeep = last && Date.now() - last < week ? 0 : 1;
    const nextDeep = last && remainingDeep === 0 ? new Date(last + week).toISOString() : null;
    return {
      remainingDeep,
      nextDeep,
      entitlement: rows[0]?.entitlement ?? "free",
    };
  });

export const saveChartTone = createServerFn({ method: "POST" })
  .validator((input: { chartId: string; tone: string }) => ({
    chartId: input.chartId.trim().slice(0, 64),
    tone: asTone(input.tone),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update charts set tone = ${data.tone}, updated_at = now()
      where id = ${data.chartId} and user_id = ${context.userId}
    `;
    return { tone: data.tone };
  });

export const persistNatal = createServerFn({ method: "POST" })
  .validator((input: { chartId?: string; natal: SkyNatal }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.chartId) {
      await sql`
        update charts
        set natal_json = ${JSON.stringify(data.natal)}::jsonb, tone = ${data.natal.tone}, updated_at = now()
        where id = ${data.chartId} and user_id = ${context.userId}
      `;
      return { id: data.chartId };
    }
    return { id: null as string | null };
  });

function parseJsonBodies(text: string, natal: SkyNatal): SkyNatal {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return natal;
  try {
    const blob = JSON.parse(text.slice(start, end + 1)) as Record<string, { headline?: string; why?: string; body?: string[] }>;
    const bodies = natal.bodies.map((b) => {
      const hit = blob[b.id] ?? blob[b.name.toLowerCase()];
      if (!hit) return b;
      return {
        ...b,
        headline: (hit.headline ?? b.headline).toString().slice(0, 240),
        why: (hit.why ?? b.why).toString().slice(0, 400),
        body: Array.isArray(hit.body) ? hit.body.map((p) => String(p).slice(0, 600)).slice(0, 4) : b.body,
      };
    });
    return { ...natal, bodies, writtenAt: new Date().toISOString() };
  } catch {
    return natal;
  }
}

export const writeTheThree = createServerFn({ method: "POST" })
  .validator((input: { natal: SkyNatal }) => ({ natal: input.natal, tone: asTone(input.natal.tone) }))
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const { talkToSky } = await import("./desk.server");
    const table = data.natal.bodies.map((b) => `${b.name}: ${b.note}`).join("\n");
    const asked = `Write JSON only for this Big Three. Keys: sun, moon, asc. Each: headline (one sentence), why (one sentence), body (two short paragraphs).
Tabulated:
${table}
Place: ${data.natal.place}
When: ${data.natal.when}`;
    const spoken = await talkToSky({ kind: "light", tone: data.tone, user: asked, extra: "" });
    if (!spoken.ok) return { natal: { ...data.natal, bodies: seedCopy(data.natal.bodies) }, from: "bones" as const };
    return { natal: parseJsonBodies(spoken.text, data.natal), from: "machine" as const };
  });

export const sitWithTheSky = createServerFn({ method: "POST" })
  .validator((input: { natal: SkyNatal }) => ({ natal: input.natal, tone: asTone(input.natal.tone) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ last_deep_at: string | null; entitlement: string }>`
      select last_deep_at, entitlement from sky_pass where user_id = ${context.userId}
    `;
    const last = rows[0]?.last_deep_at ? new Date(rows[0].last_deep_at).getTime() : 0;
    const paid = rows[0]?.entitlement === "bones" || rows[0]?.entitlement === "vault";
    const week = 7 * 24 * 60 * 60 * 1000;
    if (!paid && last && Date.now() - last < week) {
      throw new Error("The deep cut rests until the week turns.");
    }
    const { talkToSky } = await import("./desk.server");
    const table = data.natal.bodies.map((b) => `${b.name}: ${b.note}`).join("\n");
    const asked = `This is a deep cut of the Big Three. JSON only. Keys sun, moon, asc. Each: headline, why, body (three short paragraphs, architectural, specific to the tabulated degree and house).
Tabulated:
${table}
Place: ${data.natal.place}
When: ${data.natal.when}`;
    const spoken = await talkToSky({ kind: "deep", tone: data.tone, user: asked, extra: "" });
    const natal: SkyNatal = spoken.ok
      ? { ...parseJsonBodies(spoken.text, data.natal), depth: "vault" }
      : { ...data.natal, bodies: seedCopy(data.natal.bodies), depth: "three" };
    await sql`
      insert into sky_pass (user_id, last_deep_at, entitlement, updated_at)
      values (${context.userId}, now(), ${rows[0]?.entitlement ?? "free"}, now())
      on conflict (user_id) do update set last_deep_at = now(), updated_at = now()
    `;
    return { natal, from: spoken.ok ? ("machine" as const) : ("bones" as const) };
  });

export const askTheSky = createServerFn({ method: "POST" })
  .validator((input: { natal: SkyNatal; question: string; focus?: string; history?: { role: "user" | "vault"; text: string }[] }) => {
    const question = (input.question ?? "").trim().slice(0, 500);
    if (question.length < 2) throw new Error("Ask something the bones can answer.");
    return {
      natal: input.natal,
      question,
      focus: (input.focus ?? "").trim().slice(0, 80),
      history: Array.isArray(input.history) ? input.history.slice(-8) : [],
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const bones = answerFromSky(data.natal, data.question, data.focus);
    const { talkToSky } = await import("./desk.server");
    const table = data.natal.bodies.map((b) => `${b.name}: ${b.note}\n${b.headline}\n${b.body.join(" ")}`).join("\n\n");
    const hist = data.history.map((h) => `${h.role}: ${h.text}`).join("\n").slice(0, 2500);
    const user = `${data.focus ? `Looking at ${data.focus}.\n` : ""}Question: ${data.question}\n\nTabulated Big Three:\n${table}\n${hist ? `\nEarlier:\n${hist}` : ""}`;
    const spoken = await talkToSky({ kind: "light", tone: data.natal.tone, user, extra: "Answer the question. Two to five short paragraphs. Quote positions exactly." });
    return { ok: true as const, text: spoken.ok ? spoken.text : bones, from: spoken.ok ? ("machine" as const) : ("bones" as const) };
  });

export const getAiDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const desk = await import("./desk.server");
    await desk.assertOwner(context.userId);
    try {
      return await desk.loadDesk();
    } catch {
      return desk.DEFAULT_DESK;
    }
  });

export const saveAiDesk = createServerFn({ method: "POST" })
  .validator((input: Record<string, unknown>) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const desk = await import("./desk.server");
    await desk.assertOwner(context.userId);
    const next = desk.parseDesk(data);
    await desk.saveDesk(next);
    return next;
  });

export const grantSkyPass = createServerFn({ method: "POST" })
  .validator((input: { userId: string; entitlement: string }) => ({
    userId: input.userId.trim().slice(0, 80),
    entitlement: input.entitlement === "bones" || input.entitlement === "vault" ? input.entitlement : "free",
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const desk = await import("./desk.server");
    await desk.assertOwner(context.userId);
    const sql = await getSql();
    await sql`
      insert into sky_pass (user_id, entitlement, updated_at)
      values (${data.userId}, ${data.entitlement}, now())
      on conflict (user_id) do update set entitlement = ${data.entitlement}, updated_at = now()
    `;
    return { ok: true as const };
  });
