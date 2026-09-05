import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import type { SignId } from "@/lib/chart/types";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { FieldNote, ThreadTurn } from "@/lib/field-notes";
import { asChartKey } from "@/lib/charts-saved";

const SIGNS: SignId[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

export type SavedChart = {
  id: string;
  label: string;
  relation: "self" | "other";
  personName: string | null;
  signId: SignId;
  birthMonth: number;
  birthDay: number;
  birthYear: number;
  birthHour: number | null;
  birthMinute: number | null;
  birthPlace: string | null;
  natal: SkyNatal | null;
  tone: "vault" | "warm";
  createdAt: string;
};

function asSign(id: string): SignId {
  if ((SIGNS as string[]).includes(id)) return id as SignId;
  throw new Error("Unknown sign");
}

function asRelation(r: string): "self" | "other" {
  if (r === "self" || r === "other") return r;
  throw new Error("Unknown relation");
}

type ChartRow = {
  id: string;
  label: string;
  relation: string;
  person_name: string | null;
  sign_id: string;
  birth_month: number;
  birth_day: number;
  birth_year: number;
  birth_hour: number | null;
  birth_minute: number | null;
  birth_place: string | null;
  natal_json: unknown;
  tone: string | null;
  created_at: string;
};

function mapRow(row: ChartRow): SavedChart {
  return {
    id: row.id,
    label: row.label,
    relation: asRelation(row.relation),
    personName: row.person_name,
    signId: asSign(row.sign_id),
    birthMonth: Number(row.birth_month),
    birthDay: Number(row.birth_day),
    birthYear: Number(row.birth_year),
    birthHour: row.birth_hour == null ? null : Number(row.birth_hour),
    birthMinute: row.birth_minute == null ? null : Number(row.birth_minute),
    birthPlace: row.birth_place ? String(row.birth_place) : null,
    natal: row.natal_json && typeof row.natal_json === "object" ? (row.natal_json as SkyNatal) : null,
    tone: row.tone === "warm" ? "warm" : "vault",
    createdAt: String(row.created_at),
  };
}

type ChartWriteInput = {
  label: string;
  relation: "self" | "other";
  personName?: string;
  signId: SignId;
  birthMonth: number;
  birthDay: number;
  birthYear: number;
  consent: boolean;
  otherPermission?: boolean;
  birthHour?: number | null;
  birthMinute?: number | null;
  birthPlace?: string | null;
  natal?: SkyNatal | null;
  tone?: "vault" | "warm";
};

type NormalizedChartWrite = {
  label: string;
  relation: "self" | "other";
  personName: string | null;
  signId: SignId;
  birthMonth: number;
  birthDay: number;
  birthYear: number;
  birthHour: number | null;
  birthMinute: number | null;
  birthPlace: string | null;
  natal: SkyNatal | null;
  tone: "vault" | "warm";
};

function normalizeChartWrite(input: ChartWriteInput): NormalizedChartWrite {
  const label = input.label.trim().slice(0, 80);
  if (!label) throw new Error("Give this chart a name.");
  if (!input.consent) throw new Error("Consent is required to save a birth date.");
  if (input.relation === "other" && !input.otherPermission) {
    throw new Error("You need permission to store someone else’s birth date.");
  }
  const personName = input.relation === "other" ? (input.personName ?? "").trim().slice(0, 80) : null;
  if (input.relation === "other" && !personName) throw new Error("Name the person whose chart this is.");
  const month = Math.floor(Number(input.birthMonth));
  const day = Math.floor(Number(input.birthDay));
  const year = Math.floor(Number(input.birthYear));
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1926 || year > new Date().getFullYear()) {
    throw new Error("That date cannot be stored.");
  }
  let birthHour: number | null = null;
  let birthMinute: number | null = null;
  if (input.birthHour != null && input.birthMinute != null) {
    const h = Math.floor(Number(input.birthHour));
    const m = Math.floor(Number(input.birthMinute));
    if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("That time cannot be stored.");
    birthHour = h;
    birthMinute = m;
  }
  const birthPlace = input.birthPlace ? input.birthPlace.trim().slice(0, 120) : null;
  const natal = input.natal && typeof input.natal === "object" ? input.natal : null;
  const tone = input.tone === "warm" ? "warm" : "vault";
  return {
    label,
    relation: asRelation(input.relation),
    personName,
    signId: asSign(input.signId),
    birthMonth: month,
    birthDay: day,
    birthYear: year,
    birthHour,
    birthMinute,
    birthPlace,
    natal,
    tone,
  };
}

async function persistChart(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  data: NormalizedChartWrite & { id?: string },
): Promise<SavedChart> {
  if (data.id) {
    // full-row replace; callers must send complete fields
    const updated = await sql<ChartRow>`
      update charts set
        label = ${data.label},
        relation = ${data.relation},
        person_name = ${data.personName},
        sign_id = ${data.signId},
        birth_month = ${data.birthMonth},
        birth_day = ${data.birthDay},
        birth_year = ${data.birthYear},
        birth_hour = ${data.birthHour},
        birth_minute = ${data.birthMinute},
        birth_place = ${data.birthPlace},
        natal_json = ${data.natal ? JSON.stringify(data.natal) : null}::jsonb,
        tone = ${data.tone}
      where id = ${data.id} and user_id = ${userId}
      returning id, label, relation, person_name, sign_id, birth_month, birth_day, birth_year,
                birth_hour, birth_minute, birth_place, natal_json, tone, created_at
    `;
    const row = updated[0];
    if (!row) throw new Error("Chart not found");
    return mapRow(row);
  }
  const id = crypto.randomUUID();
  const inserted = await sql<ChartRow>`
    insert into charts (id, user_id, label, relation, person_name, sign_id, birth_month, birth_day, birth_year, birth_hour, birth_minute, birth_place, natal_json, tone, consent_at)
    values (
      ${id},
      ${userId},
      ${data.label},
      ${data.relation},
      ${data.personName},
      ${data.signId},
      ${data.birthMonth},
      ${data.birthDay},
      ${data.birthYear},
      ${data.birthHour},
      ${data.birthMinute},
      ${data.birthPlace},
      ${data.natal ? JSON.stringify(data.natal) : null}::jsonb,
      ${data.tone},
      now()
    )
    returning id, label, relation, person_name, sign_id, birth_month, birth_day, birth_year,
              birth_hour, birth_minute, birth_place, natal_json, tone, created_at
  `;
  return mapRow(inserted[0]!);
}

export const listCharts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<ChartRow>`
      select id, label, relation, person_name, sign_id, birth_month, birth_day, birth_year,
             birth_hour, birth_minute, birth_place, natal_json, tone, created_at
      from charts
      where user_id = ${context.userId}
      order by created_at desc
    `;
    return rows.map(mapRow);
  });

export const upsertChart = createServerFn({ method: "POST" })
  .validator((input: ChartWriteInput & { id?: string }) => {
    const id = input.id?.trim() || undefined;
    if (id && !/^[0-9a-f-]{8,64}$/i.test(id)) throw new Error("Unknown chart");
    return { id, ...normalizeChartWrite(input) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return persistChart(sql, context.userId, data);
  });

export const deleteChart = createServerFn({ method: "POST" })
  .validator((id: string) => {
    const v = id.trim();
    if (!v) throw new Error("Missing chart");
    return v;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from charts where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const deleteAllMyData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`delete from charts where user_id = ${context.userId}`;
    await sql`delete from chart_ask where user_id = ${context.userId}`;
    await sql`delete from legal_acceptances where user_id = ${context.userId}`;
    return { ok: true };
  });

export const acceptLegal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      insert into legal_acceptances (user_id, terms_version, privacy_version)
      values (${context.userId}, ${TERMS_VERSION}, ${PRIVACY_VERSION})
      on conflict (user_id, terms_version, privacy_version) do nothing
    `;
    return { ok: true };
  });


function cleanThread(rows: unknown): ThreadTurn[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((t): t is ThreadTurn => Boolean(t && (t.role === "user" || t.role === "vault") && typeof t.text === "string"))
    .slice(-24)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 4000) }));
}

function cleanNotes(rows: unknown): FieldNote[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((n): n is FieldNote => Boolean(n && typeof n.id === "string" && typeof n.text === "string"))
    .slice(-20)
    .map((n) => ({ id: n.id.slice(0, 40), text: n.text.slice(0, 8000), at: Number(n.at) || 0 }));
}

export const loadAsk = createServerFn({ method: "GET" })
  .validator((chartKey: string) => asChartKey(chartKey))
  .middleware([authMiddleware])
  .handler(async ({ context, data: chartKey }) => {
    const sql = await getSql();
    const rows = await sql<{ thread_json: string; notes_json: string }>`
      select thread_json, notes_json from chart_ask
      where user_id = ${context.userId} and chart_key = ${chartKey}
      limit 1
    `;
    const row = rows[0];
    if (!row) return { thread: [] as ThreadTurn[], notes: [] as FieldNote[] };
    try {
      return {
        thread: cleanThread(JSON.parse(row.thread_json)),
        notes: cleanNotes(JSON.parse(row.notes_json)),
      };
    } catch {
      return { thread: [] as ThreadTurn[], notes: [] as FieldNote[] };
    }
  });

export const saveAsk = createServerFn({ method: "POST" })
  .validator((input: { chartKey: string; thread: ThreadTurn[]; notes: FieldNote[] }) => ({
    chartKey: asChartKey(input.chartKey),
    thread: cleanThread(input.thread),
    notes: cleanNotes(input.notes),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const threadJson = JSON.stringify(data.thread);
    const notesJson = JSON.stringify(data.notes);
    await sql`
      insert into chart_ask (user_id, chart_key, thread_json, notes_json, updated_at)
      values (${context.userId}, ${data.chartKey}, ${threadJson}, ${notesJson}, now())
      on conflict (user_id, chart_key) do update set
        thread_json = excluded.thread_json,
        notes_json = excluded.notes_json,
        updated_at = now()
    `;
    return { ok: true };
  });
