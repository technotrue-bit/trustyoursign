import { Body, Ecliptic, GeoVector, SiderealTime } from "astronomy-engine";
import type { SignId } from "./types";

const SIGN_IDS: SignId[] = [
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

const SIGN_NAMES: Record<SignId, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

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
  return { id, name: SIGN_NAMES[id], deg, minute: minute === 60 ? 59 : minute };
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

export function computeBigThree(date: Date, place: GeoPlace): Omit<SkyNatal, "tone" | "depth" | "when" | "writtenAt"> {
  const sunL = eclipticLon(Body.Sun, date);
  const moonL = eclipticLon(Body.Moon, date);
  const ramc = ramcDeg(date, place.lon);
  const ascL = ascendant(ramc, place.lat, date);
  const mcL = midheaven(ramc, date);
  void mcL;
  const sun = signFromLon(sunL);
  const moon = signFromLon(moonL);
  const asc = signFromLon(ascL);
  const bodies: SkyBody[] = [
    {
      id: "sun",
      name: "Sun",
      lon: sunL,
      signId: sun.id,
      signName: sun.name,
      degInSign: sun.deg + sun.minute / 60,
      house: wholeSignHouse(sunL, ascL),
      note: `${formatLon(sunL)} · house ${wholeSignHouse(sunL, ascL)}`,
      ...blankCopy(),
    },
    {
      id: "moon",
      name: "Moon",
      lon: moonL,
      signId: moon.id,
      signName: moon.name,
      degInSign: moon.deg + moon.minute / 60,
      house: wholeSignHouse(moonL, ascL),
      note: `${formatLon(moonL)} · house ${wholeSignHouse(moonL, ascL)}`,
      ...blankCopy(),
    },
    {
      id: "asc",
      name: "Rising",
      lon: ascL,
      signId: asc.id,
      signName: asc.name,
      degInSign: asc.deg + asc.minute / 60,
      house: 1,
      note: `${formatLon(ascL)} · first house`,
      ...blankCopy(),
    },
  ];
  return {
    place: place.name,
    lat: place.lat,
    lon: place.lon,
    timeZone: place.timeZone,
    bodies,
  };
}

export async function geocodePlace(query: string): Promise<GeoPlace> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) throw new Error("Name the place.");
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error("The place could not be found.");
  const body = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string }[];
  };
  const hit = body.results?.[0];
  if (!hit) throw new Error("The place could not be found.");
  const bits = [hit.name, hit.admin1, hit.country].filter(Boolean);
  return {
    name: bits.join(", "),
    lat: hit.latitude,
    lon: hit.longitude,
    timeZone: hit.timezone || "UTC",
  };
}
