import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { formatBirth, formatClock } from "./sun";
import {
  computeNatalCast,
  geocodePlace,
  localToUtc,
  type GeoPlace,
  type SkyBody,
  type SkyNatal,
} from "./ephemeris";
import { answerFromSky } from "./bones-ask";
import { buildVisitorNativity, skyNatalFromCast } from "./visitor-nativity";
import type { Nativity } from "./schema";

export type { SkyNatal, SkyBody };

function asTone(v: string): "vault" | "warm" {
  return v === "warm" ? "warm" : "vault";
}

function seedCopy(bodies: SkyBody[]): SkyBody[] {
  return bodies.map((b) => {
    if (b.headline) return b;
    return {
      ...b,
      headline: `${b.name} in ${b.signName}, house ${b.house}.`,
      why: b.note,
      body: [
        `${b.name} at ${b.note}.`,
        "Degree and house are tabled. Meaning waits on the bones — not on a blank book.",
      ],
    };
  });
}

function birthInput(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  place: string;
  tone?: string;
  label?: string;
  lat?: number;
  lon?: number;
  timeZone?: string;
}) {
  const year = Math.floor(Number(input.year));
  const month = Math.floor(Number(input.month));
  const day = Math.floor(Number(input.day));
  const hour = Math.floor(Number(input.hour));
  const minute = Math.floor(Number(input.minute));
  const place = (input.place ?? "").trim().slice(0, 120);
  const label = (input.label ?? "Your natal").trim().slice(0, 80) || "Your natal";
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1926) throw new Error("That date cannot be read.");
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("That time cannot be read.");
  if (place.length < 2) throw new Error("Name the place.");

  let lat: number | undefined;
  let lon: number | undefined;
  let timeZone: string | undefined;
  // Only accept real coordinates — never invent them.
  if (
    typeof input.lat === "number" &&
    Number.isFinite(input.lat) &&
    typeof input.lon === "number" &&
    Number.isFinite(input.lon) &&
    typeof input.timeZone === "string" &&
    input.timeZone.trim().length > 0
  ) {
    lat = input.lat;
    lon = input.lon;
    timeZone = input.timeZone.trim().slice(0, 64);
  }

  return { year, month, day, hour, minute, place, tone: asTone(input.tone ?? "vault"), label, lat, lon, timeZone };
}

export type VisitorChartPayload = {
  sky: SkyNatal;
  nativity: Nativity;
};

/** Slim natal for askTheSky — positions + tone + place/when, not full essays. */
export type AskSkyNatal = {
  tone: "vault" | "warm";
  when: string;
  place: string;
  bodies: Pick<SkyBody, "id" | "name" | "lon" | "signId" | "signName" | "degInSign" | "house" | "note">[];
};

function trimNatalForAsk(natal: SkyNatal | AskSkyNatal): AskSkyNatal {
  return {
    tone: asTone(natal.tone),
    when: String(natal.when ?? "").slice(0, 120),
    place: String(natal.place ?? "").slice(0, 120),
    bodies: (natal.bodies ?? []).slice(0, 12).map((b) => ({
      id: b.id,
      name: b.name,
      lon: b.lon,
      signId: b.signId,
      signName: b.signName,
      degInSign: b.degInSign,
      house: b.house,
      note: b.note,
    })),
  };
}

/** Timed visitor chart: Big Three save payload + full room-ready Nativity. */
export const computeVisitorNatal = createServerFn({ method: "POST" })
  .validator((input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    place: string;
    tone?: string;
    label?: string;
    lat?: number;
    lon?: number;
    timeZone?: string;
  }) => birthInput(input))
  .handler(async ({ data }): Promise<VisitorChartPayload> => {
    let geo: GeoPlace;
    if (data.lat != null && data.lon != null && data.timeZone) {
      geo = {
        name: data.place,
        lat: data.lat,
        lon: data.lon,
        timeZone: data.timeZone,
      };
    } else {
      geo = await geocodePlace(data.place);
    }
    const utc = localToUtc(data.year, data.month, data.day, data.hour, data.minute, geo.timeZone);
    const cast = await computeNatalCast(utc, geo);
    const dateLabel = formatBirth(data.month, data.day, data.year);
    const timeLabel = formatClock(data.hour, data.minute);
    const when = `${dateLabel} · ${timeLabel}`;
    const raw = skyNatalFromCast(cast, when, data.tone);
    const sky = { ...raw, bodies: seedCopy(raw.bodies) };
    const nativity = buildVisitorNativity(cast, {
      label: data.label,
      when,
      dateLabel,
      timeLabel,
      tone: data.tone,
    });
    return { sky, nativity };
  });

export const getSkyPass = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db.server");
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
    const { getSql } = await import("@/lib/db.server");
    const sql = await getSql();
    // charts.tone is authoritative; keep natal_json.tone in sync when natal exists.
    await sql`
      update charts
      set
        tone = ${data.tone},
        natal_json = case
          when natal_json is not null then jsonb_set(natal_json, '{tone}', to_jsonb(${data.tone}::text), true)
          else natal_json
        end,
        updated_at = now()
      where id = ${data.chartId} and user_id = ${context.userId}
    `;
    return { tone: data.tone };
  });

export const persistNatal = createServerFn({ method: "POST" })
  .validator((input: { chartId?: string; natal: SkyNatal }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db.server");
    const sql = await getSql();
    if (data.chartId) {
      // Tone column is authoritative; force natal_json.tone from the column after write.
      const tone = asTone(data.natal.tone);
      const natal = { ...data.natal, tone };
      await sql`
        update charts
        set natal_json = ${JSON.stringify(natal)}::jsonb, tone = ${tone}, updated_at = now()
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

export const sitWithTheSky = createServerFn({ method: "POST" })
  .validator((input: { natal: SkyNatal }) => ({ natal: input.natal, tone: asTone(input.natal.tone) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db.server");
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
  .validator((input: {
    natal: SkyNatal | AskSkyNatal;
    question: string;
    focus?: string;
    history?: { role: "user" | "vault"; text: string }[];
    notes?: string[];
  }) => {
    const question = (input.question ?? "").trim().slice(0, 500);
    if (question.length < 2) throw new Error("Ask something the bones can answer.");
    const notes = Array.isArray(input.notes)
      ? input.notes.filter((n) => typeof n === "string").map((n) => n.slice(0, 8000)).slice(-12)
      : [];
    return {
      natal: trimNatalForAsk(input.natal),
      question,
      focus: (input.focus ?? "").trim().slice(0, 80),
      history: Array.isArray(input.history) ? input.history.slice(-8) : [],
      notes,
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    // answerFromSky expects SkyNatal-shaped bodies; trimmed note fields are enough for bones.
    const bonesNatal = {
      depth: "three" as const,
      tone: data.natal.tone,
      when: data.natal.when,
      place: data.natal.place,
      lat: 0,
      lon: 0,
      timeZone: "UTC",
      bodies: data.natal.bodies.map((b) => ({
        ...b,
        headline: "",
        why: "",
        body: [] as string[],
      })),
      writtenAt: null,
    };
    const bones = answerFromSky(bonesNatal, data.question, data.focus);
    const { talkToSky } = await import("./desk.server");
    const table = data.natal.bodies.map((b) => `${b.name}: ${b.note}`).join("\n");
    const hist = data.history.map((h) => `${h.role}: ${h.text}`).join("\n").slice(0, 2500);
    const field = data.notes.length
      ? `\nField notes:\n${data.notes.map((n, i) => `${i + 1}. ${n}`).join("\n").slice(0, 6000)}`
      : "";
    const user = `${data.focus ? `Looking at ${data.focus}.\n` : ""}Question: ${data.question}\n\nTabulated Big Three:\n${table}\nPlace: ${data.natal.place}\nWhen: ${data.natal.when}${field}${hist ? `\nEarlier:\n${hist}` : ""}`;
    const spoken = await talkToSky({
      kind: "light",
      tone: data.natal.tone,
      user,
      extra: "Answer the question. Two to five short paragraphs. Quote positions exactly. Field notes are additional canon.",
    });
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
    const { getSql } = await import("@/lib/db.server");
    const sql = await getSql();
    await sql`
      insert into sky_pass (user_id, entitlement, updated_at)
      values (${data.userId}, ${data.entitlement}, now())
      on conflict (user_id) do update set entitlement = ${data.entitlement}, updated_at = now()
    `;
    return { ok: true as const };
  });
