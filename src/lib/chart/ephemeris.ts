import { Body, Ecliptic, GeoVector, SiderealTime } from "astronomy-engine";
import type { SignId } from "./types";
import { SIGN_IDS, signName } from "./sign-canon";

export function wrap360(x: number) {
  return ((x % 360) + 360) % 360;
}

export function signFromLon(lon: number): { id: SignId; name: string; deg: number; minute: number } {
  const L = wrap360(lon);
  const i = Math.min(11, Math.floor(L / 30));
  const id = SIGN_IDS[i]!;
  const inSign = L - i * 30;
  const deg = Math.floor(inSign);
  const minute = Math.round((inSign - deg) * 60);
  return { id, name: signName(id), deg, minute: minute === 60 ? 59 : minute };
}

export function formatLon(lon: number) {
  const s = signFromLon(lon);
  return `${s.deg}° ${s.name} ${String(s.minute).padStart(2, "0")}′`;
}

export type GeoPlace = {
  name: string;
  lat: number;
  lon: number;
  timeZone: string;
};

function partsInZone(utcMs: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const bits = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  let hour = Number(bits.hour);
  if (hour === 24) hour = 0;
  return {
    y: Number(bits.year),
    m: Number(bits.month),
    d: Number(bits.day),
    h: hour,
    min: Number(bits.minute),
  };
}

/** Civil clock in an IANA zone → UTC Date (DST-aware, historical). */
export function localToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const p = partsInZone(utc, timeZone);
    const got = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    const want = Date.UTC(year, month - 1, day, hour, minute);
    utc += want - got;
  }
  return new Date(utc);
}

function eclipticLon(body: Body, date: Date) {
  return wrap360(Ecliptic(GeoVector(body, date, true)).elon);
}

function obliquity(date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  return (23.439291111 - 0.013004166 * T) * (Math.PI / 180);
}

function ramcDeg(date: Date, lonEast: number) {
  return wrap360(SiderealTime(date) * 15 + lonEast);
}

function ascendant(ramc: number, latDeg: number, date: Date) {
  const r = (ramc * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const eps = obliquity(date);
  const y = Math.cos(r);
  const x = -(Math.sin(r) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps));
  return wrap360((Math.atan2(y, x) * 180) / Math.PI);
}

function midheaven(ramc: number, date: Date) {
  const r = (ramc * Math.PI) / 180;
  const eps = obliquity(date);
  return wrap360((Math.atan2(Math.sin(r) * Math.cos(eps), Math.cos(r)) * 180) / Math.PI);
}

function wholeSignHouse(bodyLon: number, ascLon: number) {
  const b = Math.floor(wrap360(bodyLon) / 30);
  const a = Math.floor(wrap360(ascLon) / 30);
  return ((b - a + 12) % 12) + 1;
}

export type SkyBody = {
  id: "sun" | "moon" | "asc";
  name: string;
  lon: number;
  signId: SignId;
  signName: string;
  degInSign: number;
  house: number;
  note: string;
  headline: string;
  why: string;
  body: string[];
};

export type SkyNatal = {
  depth: "three" | "vault";
  tone: "vault" | "warm";
  when: string;
  place: string;
  lat: number;
  lon: number;
  timeZone: string;
  bodies: SkyBody[];
  writtenAt: string | null;
};

function blankCopy(): { headline: string; why: string; body: string[] } {
  return { headline: "", why: "", body: [] };
}

/** Classical + outer planets we cast for visitor nativities. */
export type CastPlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "asc"
  | "mc";

export type CastPoint = {
  id: CastPlanetId;
  name: string;
  lon: number;
  signId: SignId;
  signName: string;
  degInSign: number;
  house: number;
  retrograde: boolean;
  note: string;
};

export type NatalCast = {
  place: string;
  lat: number;
  lon: number;
  timeZone: string;
  utcIso: string;
  angles: { asc: number; ic: number; dsc: number; mc: number };
  points: CastPoint[];
};

const MOVING: { id: Exclude<CastPlanetId, "asc" | "mc">; body: Body; name: string }[] = [
  { id: "sun", body: Body.Sun, name: "Sun" },
  { id: "moon", body: Body.Moon, name: "Moon" },
  { id: "mercury", body: Body.Mercury, name: "Mercury" },
  { id: "venus", body: Body.Venus, name: "Venus" },
  { id: "mars", body: Body.Mars, name: "Mars" },
  { id: "jupiter", body: Body.Jupiter, name: "Jupiter" },
  { id: "saturn", body: Body.Saturn, name: "Saturn" },
  { id: "uranus", body: Body.Uranus, name: "Uranus" },
  { id: "neptune", body: Body.Neptune, name: "Neptune" },
  { id: "pluto", body: Body.Pluto, name: "Pluto" },
];

function isRetrograde(body: Body, date: Date, lonNow: number) {
  if (body === Body.Sun || body === Body.Moon) return false;
  const earlier = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const lonThen = eclipticLon(body, earlier);
  let delta = lonNow - lonThen;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

function pointFromLon(id: CastPlanetId, name: string, lon: number, ascL: number, retrograde: boolean): CastPoint {
  const s = signFromLon(lon);
  const house = id === "asc" ? 1 : id === "mc" ? wholeSignHouse(lon, ascL) : wholeSignHouse(lon, ascL);
  const note =
    id === "asc"
      ? `${formatLon(lon)} · first house`
      : id === "mc"
        ? `${formatLon(lon)} · tenth house`
        : `${formatLon(lon)} · house ${house}${retrograde ? " · Rx" : ""}`;
  return {
    id,
    name,
    lon,
    signId: s.id,
    signName: s.name,
    degInSign: s.deg + s.minute / 60,
    house,
    retrograde,
    note,
  };
}

/** Full tropical cast: classical planets, ASC/MC, whole-sign houses from the rising. */
export function computeNatalCast(date: Date, place: GeoPlace): NatalCast {
  const ramc = ramcDeg(date, place.lon);
  const ascL = ascendant(ramc, place.lat, date);
  const mcL = midheaven(ramc, date);
  const points: CastPoint[] = MOVING.map(({ id, body, name }) => {
    const lon = eclipticLon(body, date);
    return pointFromLon(id, name, lon, ascL, isRetrograde(body, date, lon));
  });
  points.push(pointFromLon("asc", "Rising", ascL, ascL, false));
  points.push(pointFromLon("mc", "Midheaven", mcL, ascL, false));
  return {
    place: place.name,
    lat: place.lat,
    lon: place.lon,
    timeZone: place.timeZone,
    utcIso: date.toISOString(),
    angles: {
      asc: ascL,
      mc: mcL,
      dsc: wrap360(ascL + 180),
      ic: wrap360(mcL + 180),
    },
    points,
  };
}

export function bigThreeFromCast(cast: NatalCast): Omit<SkyNatal, "tone" | "depth" | "when" | "writtenAt"> {
  const want = new Set(["sun", "moon", "asc"]);
  const bodies: SkyBody[] = cast.points
    .filter((p) => want.has(p.id))
    .map((p) => ({
      id: p.id as SkyBody["id"],
      name: p.name,
      lon: p.lon,
      signId: p.signId,
      signName: p.signName,
      degInSign: p.degInSign,
      house: p.house,
      note: p.note,
      ...blankCopy(),
    }));
  return {
    place: cast.place,
    lat: cast.lat,
    lon: cast.lon,
    timeZone: cast.timeZone,
    bodies,
  };
}

export function computeBigThree(date: Date, place: GeoPlace): Omit<SkyNatal, "tone" | "depth" | "when" | "writtenAt"> {
  return bigThreeFromCast(computeNatalCast(date, place));
}

const GEOCODE_TTL_MS = 60 * 60 * 1000;
const geocodeCache = new Map<string, { place: GeoPlace; expiresAt: number }>();

export async function geocodePlace(query: string): Promise<GeoPlace> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) throw new Error("Name the place.");
  const key = q.toLowerCase();
  const hitCache = geocodeCache.get(key);
  if (hitCache && hitCache.expiresAt > Date.now()) return hitCache.place;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error("The place could not be found.");
  const body = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string }[];
  };
  const hit = body.results?.[0];
  if (!hit) throw new Error("The place could not be found.");
  const bits = [hit.name, hit.admin1, hit.country].filter(Boolean);
  const place: GeoPlace = {
    name: bits.join(", "),
    lat: hit.latitude,
    lon: hit.longitude,
    timeZone: hit.timezone || "UTC",
  };
  geocodeCache.set(key, { place, expiresAt: Date.now() + GEOCODE_TTL_MS });
  return place;
}
