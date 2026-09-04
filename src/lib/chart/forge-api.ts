import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { formatBirth, formatClock } from "./sun";
import { computeNatalCast, geocodePlace, localToUtc } from "./ephemeris";
import { buildVisitorNativity, skyNatalFromCast } from "./visitor-nativity";
import type { Nativity } from "./schema";
import type { SkyNatal } from "./ephemeris";
import type { SignId } from "./types";
import {
  applyProseToNativity,
  birthFingerprint,
  castReady,
  forgeIsReady,
  mergeProseChunks,
  missingProseKeys,
  parseChunks,
  type ForgeBirth,
  type ForgeJobView,
  type ForgeProseChunks,
  type ForgeStatus,
} from "./forge";

type ForgeRow = {
  id: string;
  user_id: string | null;
  anon_key: string;
  fingerprint: string;
  status: string;
  sign_id: string;
  birth_json: string;
  cast_json: string | null;
  nativity_json: string | null;
  prose_chunks: string;
  error: string | null;
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `forge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function asStatus(s: string): ForgeStatus {
  if (
    s === "pending" ||
    s === "running" ||
    s === "partial" ||
    s === "ready" ||
    s === "abandoned" ||
    s === "failed"
  ) {
    return s;
  }
  return "pending";
}

function parseBirth(raw: string, signId: SignId): ForgeBirth {
  try {
    const o = JSON.parse(raw) as ForgeBirth;
    return { ...o, signId };
  } catch {
    return {
      signId,
      year: 2000,
      month: 1,
      day: 1,
      hour: null,
      minute: null,
      place: null,
    };
  }
}

function viewFromRow(row: ForgeRow, proseError?: string | null): ForgeJobView {
  const birth = parseBirth(row.birth_json, row.sign_id as SignId);
  const chunks = parseChunks(row.prose_chunks);
  let sky: SkyNatal | null = null;
  let nativity: Nativity | null = null;
  try {
    if (row.cast_json) sky = JSON.parse(row.cast_json) as SkyNatal;
  } catch {
    sky = null;
  }
  try {
    if (row.nativity_json) nativity = JSON.parse(row.nativity_json) as Nativity;
  } catch {
    nativity = null;
  }
  return {
    id: row.id,
    status: asStatus(row.status),
    fingerprint: row.fingerprint,
    signId: row.sign_id as SignId,
    birth,
    hasCast: castReady(row.cast_json, row.nativity_json),
    chunks,
    missing: missingProseKeys(chunks),
    error: row.error,
    sky,
    nativity: nativity && Object.keys(chunks).length ? applyProseToNativity(nativity, chunks) : nativity,
    proseError: proseError ?? null,
  };
}

async function loadActiveJob(anonKey: string, fingerprint: string, userId: string | null) {
  const sql = await getSql();
  if (userId) {
    const rows = await sql.query<ForgeRow>(
      `select * from chart_forge
       where fingerprint = $1 and status <> 'abandoned'
         and (user_id = $2 or anon_key = $3)
       order by updated_at desc limit 1`,
      [fingerprint, userId, anonKey],
    );
    return rows[0] ?? null;
  }
  const rows = await sql.query<ForgeRow>(
    `select * from chart_forge
     where fingerprint = $1 and anon_key = $2 and status <> 'abandoned'
     order by updated_at desc limit 1`,
    [fingerprint, anonKey],
  );
  return rows[0] ?? null;
}

async function loadById(id: string, anonKey: string) {
  const sql = await getSql();
  const rows = await sql.query<ForgeRow>(
    `select * from chart_forge where id = $1 and (anon_key = $2 or anon_key = $2) limit 1`,
    [id, anonKey],
  );
  return rows[0] ?? null;
}

function validateBirth(input: {
  anonKey: string;
  birth: ForgeBirth;
  userId?: string | null;
}): { anonKey: string; birth: ForgeBirth; userId: string | null } {
  const anonKey = (input.anonKey ?? "").trim().slice(0, 80);
  if (anonKey.length < 8) throw new Error("Missing forge session.");
  const b = input.birth;
  const year = Math.floor(Number(b.year));
  const month = Math.floor(Number(b.month));
  const day = Math.floor(Number(b.day));
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1926) throw new Error("That date cannot be read.");
  return {
    anonKey,
    userId: input.userId ?? null,
    birth: {
      signId: b.signId,
      year,
      month,
      day,
      hour: b.hour == null ? null : Math.floor(Number(b.hour)),
      minute: b.minute == null ? null : Math.floor(Number(b.minute)),
      place: b.place ? String(b.place).trim().slice(0, 120) : null,
      label: b.label,
      tone: b.tone === "warm" ? "warm" : "vault",
    },
  };
}

export const startOrResumeForge = createServerFn({ method: "POST" })
  .validator((input: {
    anonKey: string;
    birth: ForgeBirth;
    userId?: string | null;
    sky?: SkyNatal | null;
    nativity?: Nativity | null;
  }) => ({
    ...validateBirth(input),
    sky: input.sky ?? null,
    nativity: input.nativity ?? null,
  }))
  .handler(async ({ data }): Promise<ForgeJobView> => {
    const fingerprint = birthFingerprint(data.birth);
    const existing = await loadActiveJob(data.anonKey, fingerprint, data.userId);
    if (existing) return viewFromRow(existing);

    const id = newId();
    const sql = await getSql();
    const hasSeed = Boolean(data.sky && data.nativity);
    await sql.query(
      `insert into chart_forge (id, user_id, anon_key, fingerprint, status, sign_id, birth_json, cast_json, nativity_json, prose_chunks)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{}')`,
      [
        id,
        data.userId,
        data.anonKey,
        fingerprint,
        hasSeed ? "running" : "pending",
        data.birth.signId,
        JSON.stringify(data.birth),
        hasSeed ? JSON.stringify(data.sky) : null,
        hasSeed ? JSON.stringify(data.nativity) : null,
      ],
    );
    const row = await loadById(id, data.anonKey);
    if (!row) throw new Error("Forge job could not be created.");
    return viewFromRow(row);
  });

export const getForgeStatus = createServerFn({ method: "POST" })
  .validator((input: { anonKey: string; jobId: string }) => ({
    anonKey: String(input.anonKey ?? "").trim().slice(0, 80),
    jobId: String(input.jobId ?? "").trim().slice(0, 80),
  }))
  .handler(async ({ data }): Promise<ForgeJobView> => {
    if (data.anonKey.length < 8 || !data.jobId) throw new Error("Missing forge session.");
    const row = await loadById(data.jobId, data.anonKey);
    if (!row) throw new Error("Forge job not found.");
    return viewFromRow(row);
  });

export const findActiveForge = createServerFn({ method: "POST" })
  .validator((input: { anonKey: string; userId?: string | null }) => ({
    anonKey: String(input.anonKey ?? "").trim().slice(0, 80),
    userId: input.userId ?? null,
  }))
  .handler(async ({ data }): Promise<ForgeJobView | null> => {
    if (data.anonKey.length < 8) return null;
    const sql = await getSql();
    const rows = data.userId
      ? await sql.query<ForgeRow>(
          `select * from chart_forge
           where status in ('pending','running','partial','ready')
             and (user_id = $1 or anon_key = $2)
           order by updated_at desc limit 1`,
          [data.userId, data.anonKey],
        )
      : await sql.query<ForgeRow>(
          `select * from chart_forge
           where status in ('pending','running','partial','ready') and anon_key = $1
           order by updated_at desc limit 1`,
          [data.anonKey],
        );
    const row = rows[0];
    return row ? viewFromRow(row) : null;
  });

export const abandonForge = createServerFn({ method: "POST" })
  .validator((input: { anonKey: string; jobId: string }) => ({
    anonKey: String(input.anonKey ?? "").trim().slice(0, 80),
    jobId: String(input.jobId ?? "").trim().slice(0, 80),
  }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql.query(
      `update chart_forge set status = 'abandoned', updated_at = now()
       where id = $1 and anon_key = $2 and status <> 'abandoned'`,
      [data.jobId, data.anonKey],
    );
    return { ok: true };
  });

async function runCast(birth: ForgeBirth): Promise<{ sky: SkyNatal; nativity: Nativity }> {
  if (birth.hour == null || birth.minute == null || !birth.place || birth.place.length < 2) {
    throw new Error("Time and place are required to forge a natal.");
  }
  const geo = await geocodePlace(birth.place);
  const utc = localToUtc(birth.year, birth.month, birth.day, birth.hour, birth.minute, geo.timeZone);
  const cast = computeNatalCast(utc, geo);
  const dateLabel = formatBirth(birth.month, birth.day, birth.year);
  const timeLabel = formatClock(birth.hour, birth.minute);
  const when = `${dateLabel} · ${timeLabel}`;
  const sky = skyNatalFromCast(cast, when, birth.tone ?? "vault");
  const nativity = buildVisitorNativity(cast, {
    label: birth.label ?? "Your natal",
    when,
    dateLabel,
    timeLabel,
    tone: birth.tone ?? "vault",
  });
  return { sky, nativity };
}

export const advanceForge = createServerFn({ method: "POST" })
  .validator((input: { anonKey: string; jobId: string; tablesOnly?: boolean }) => ({
    anonKey: String(input.anonKey ?? "").trim().slice(0, 80),
    jobId: String(input.jobId ?? "").trim().slice(0, 80),
    tablesOnly: Boolean(input.tablesOnly),
  }))
  .handler(async ({ data }): Promise<ForgeJobView> => {
    if (data.anonKey.length < 8 || !data.jobId) throw new Error("Missing forge session.");
    const row = await loadById(data.jobId, data.anonKey);
    if (!row) throw new Error("Forge job not found.");
    if (row.status === "abandoned") throw new Error("This forge was stopped.");
    if (row.status === "ready") return viewFromRow(row);

    const sql = await getSql();
    const birth = parseBirth(row.birth_json, row.sign_id as SignId);
    let proseError: string | null = null;

    if (!castReady(row.cast_json, row.nativity_json)) {
      try {
        const { sky, nativity } = await runCast(birth);
        await sql.query(
          `update chart_forge
           set cast_json = $1, nativity_json = $2, status = 'running', error = null, updated_at = now()
           where id = $3`,
          [JSON.stringify(sky), JSON.stringify(nativity), row.id],
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Cast failed.";
        await sql.query(
          `update chart_forge set status = 'failed', error = $1, updated_at = now() where id = $2`,
          [msg, row.id],
        );
      }
      const next = await loadById(data.jobId, data.anonKey);
      return viewFromRow(next!);
    }

    const chunks = parseChunks(row.prose_chunks);
    if (data.tablesOnly) {
      await sql.query(
        `update chart_forge set status = 'ready', updated_at = now() where id = $1`,
        [row.id],
      );
      const next = await loadById(data.jobId, data.anonKey);
      return viewFromRow(next!);
    }

    const missing = missingProseKeys(chunks);
    if (missing.length === 0) {
      await sql.query(`update chart_forge set status = 'ready', updated_at = now() where id = $1`, [row.id]);
      const next = await loadById(data.jobId, data.anonKey);
      return viewFromRow(next!);
    }

    const key = missing[0]!;
    let nativity = JSON.parse(row.nativity_json!) as Nativity;
    const sky = JSON.parse(row.cast_json!) as SkyNatal;
    try {
      const { generateForgeProseChunk } = await import("./forge-prose.server");
      const text = await generateForgeProseChunk(key, nativity, sky, birth);
      if (!text) {
        proseError = "Prose could not be written for this room.";
        await sql.query(
          `update chart_forge set status = 'partial', error = $1, updated_at = now() where id = $2`,
          [proseError, row.id],
        );
      } else {
        const merged: ForgeProseChunks = mergeProseChunks(chunks, { [key]: text });
        nativity = applyProseToNativity(nativity, merged);
        const ready = forgeIsReady(row.cast_json, JSON.stringify(nativity), merged);
        await sql.query(
          `update chart_forge
           set prose_chunks = $1, nativity_json = $2, status = $3, error = null, updated_at = now()
           where id = $4`,
          [JSON.stringify(merged), JSON.stringify(nativity), ready ? "ready" : "running", row.id],
        );
      }
    } catch (e) {
      proseError = e instanceof Error ? e.message : "Prose failed.";
      await sql.query(
        `update chart_forge set status = 'partial', error = $1, updated_at = now() where id = $2`,
        [proseError, row.id],
      );
    }

    const next = await loadById(data.jobId, data.anonKey);
    return viewFromRow(next!, proseError);
  });
