import type { SkyBody, SkyNatal } from "./ephemeris";
import { isSignId, signName } from "./sign-canon";

/**
 * What a saved Big Three may hold. Same cuts the deep-cut writer already uses
 * for headline, why, and paragraphs, so a real reading still fits.
 */
const HEADLINE_MAX = 240;
const WHY_MAX = 400;
const PARAGRAPH_MAX = 600;
const PARAGRAPHS_MAX = 4;
const NOTE_MAX = 160;
const WHEN_MAX = 120;
const PLACE_MAX = 120;
const ZONE_MAX = 64;
const WRITTEN_AT_MAX = 40;

const BODY_IDS = ["sun", "moon", "asc"] as const;
type BodyId = (typeof BODY_IDS)[number];

const BODY_NAMES: Record<BodyId, string> = {
  sun: "Sun",
  moon: "Moon",
  asc: "Rising",
};

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function reject(): never {
  throw new Error("That chart cannot be stored.");
}

function finite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) reject();
  return value;
}

function inRange(value: unknown, min: number, max: number): number {
  const n = finite(value);
  if (n < min || n > max) reject();
  return n;
}

function asBodyId(value: unknown): BodyId | null {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (BODY_IDS as readonly string[]).includes(id) ? (id as BodyId) : null;
}

function normalizeBody(raw: unknown): SkyBody | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = asBodyId(row.id);
  if (!id) return null;
  const signRaw = typeof row.signId === "string" ? row.signId.trim().toLowerCase() : "";
  if (!isSignId(signRaw)) reject();
  const paragraphs = Array.isArray(row.body) ? row.body : [];
  return {
    id,
    name: BODY_NAMES[id],
    lon: inRange(row.lon, 0, 360),
    signId: signRaw,
    signName: signName(signRaw),
    degInSign: inRange(row.degInSign, 0, 30),
    house: (() => {
      const house = finite(row.house);
      if (!Number.isInteger(house) || house < 1 || house > 12) reject();
      return house;
    })(),
    note: clip(row.note, NOTE_MAX),
    headline: clip(row.headline, HEADLINE_MAX),
    why: clip(row.why, WHY_MAX),
    body: paragraphs.slice(0, PARAGRAPHS_MAX).map((p) => clip(p, PARAGRAPH_MAX)),
  };
}

/**
 * Rebuild a chart from the fields the sky actually stores. Extra fields are
 * dropped. A shape that is not a Big Three is refused.
 */
export function normalizePersistedNatal(input: unknown): SkyNatal {
  if (!input || typeof input !== "object" || Array.isArray(input)) reject();
  const raw = input as Record<string, unknown>;
  const place = clip(raw.place, PLACE_MAX);
  const timeZone = clip(raw.timeZone, ZONE_MAX);
  if (place.length < 1 || timeZone.length < 1) reject();
  if (!Array.isArray(raw.bodies)) reject();

  const byId = new Map<BodyId, SkyBody>();
  for (const item of raw.bodies) {
    const body = normalizeBody(item);
    if (body) byId.set(body.id, body);
  }
  const bodies = BODY_IDS.map((id) => byId.get(id) ?? reject());

  const written =
    typeof raw.writtenAt === "string" && raw.writtenAt.trim().length > 0
      ? clip(raw.writtenAt, WRITTEN_AT_MAX)
      : null;

  return {
    depth: raw.depth === "vault" ? "vault" : "three",
    tone: raw.tone === "warm" ? "warm" : "vault",
    when: clip(raw.when, WHEN_MAX),
    place,
    lat: inRange(raw.lat, -90, 90),
    lon: inRange(raw.lon, -180, 180),
    timeZone,
    bodies,
    writtenAt: written,
  };
}
