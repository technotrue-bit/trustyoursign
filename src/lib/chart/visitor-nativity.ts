import type { Nativity } from "./schema";
import type { AspectDef } from "./aspects";
import type { ChakraDef } from "./chakras";
import { CHAKRAS } from "./chakras";
import type { HouseCusp } from "./houses";
import type { PlanetDef } from "./planets";
import { PLANET_LOOK } from "./planets";
import { SIGNS, type SignDef } from "./signs";
import type { NatalCast, CastPoint, SkyNatal } from "./ephemeris";
import { formatLon, signFromLon, wrap360 } from "./ephemeris";
import type { AspectType, Dignity, Element, Modality, PlanetId, SignId } from "./types";

const DOMICILE: Partial<Record<PlanetId, SignId[]>> = {
  sun: ["leo"],
  moon: ["cancer"],
  mercury: ["gemini", "virgo"],
  venus: ["taurus", "libra"],
  mars: ["aries", "scorpio"],
  jupiter: ["sagittarius", "pisces"],
  saturn: ["capricorn", "aquarius"],
  uranus: ["aquarius"],
  neptune: ["pisces"],
  pluto: ["scorpio"],
};

const EXALTATION: Partial<Record<PlanetId, SignId>> = {
  sun: "aries",
  moon: "taurus",
  mercury: "virgo",
  venus: "pisces",
  mars: "capricorn",
  jupiter: "cancer",
  saturn: "libra",
};

const DETRIMENT: Partial<Record<PlanetId, SignId[]>> = {
  sun: ["aquarius"],
  moon: ["capricorn"],
  mercury: ["sagittarius", "pisces"],
  venus: ["scorpio", "aries"],
  mars: ["libra", "taurus"],
  jupiter: ["gemini", "virgo"],
  saturn: ["cancer", "leo"],
};

const FALL: Partial<Record<PlanetId, SignId>> = {
  sun: "libra",
  moon: "scorpio",
  mercury: "pisces",
  venus: "virgo",
  mars: "cancer",
  jupiter: "capricorn",
  saturn: "aries",
};

const ASPECT_DEFS: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "opposition", angle: 180, orb: 8 },
  { type: "square", angle: 90, orb: 7 },
  { type: "trine", angle: 120, orb: 7 },
  { type: "sextile", angle: 60, orb: 5 },
];

const ASPECT_LABEL: Record<AspectType, string> = {
  conjunction: "conjunct",
  opposition: "opposite",
  square: "square",
  trine: "trine",
  sextile: "sextile",
  quincunx: "quincunx",
  sesquare: "sesquare",
  quintile: "quintile",
};

export type VisitorNatalOpts = {
  label?: string;
  when: string;
  dateLabel: string;
  timeLabel: string;
  tone?: "vault" | "warm";
};

function dignityFor(id: PlanetId, signId: SignId): Dignity {
  if (id === "asc" || id === "mc") return "angle";
  if (DOMICILE[id]?.includes(signId)) return "domicile";
  if (EXALTATION[id] === signId) return "exaltation";
  if (FALL[id] === signId) return "fall";
  if (DETRIMENT[id]?.includes(signId)) return "detriment";
  return "peregrine";
}

function seedHeadline(p: CastPoint): string {
  if (p.id === "asc") return `The face the world meets is ${p.signName}.`;
  if (p.id === "mc") return `The midheaven sits in ${p.signName}.`;
  if (p.id === "sun") return `The will burns in ${p.signName}, house ${p.house}.`;
  if (p.id === "moon") return `The feeling-body lives in ${p.signName}, house ${p.house}.`;
  return `${p.name} in ${p.signName}, house ${p.house}.`;
}

function seedWhy(p: CastPoint): string {
  if (p.id === "asc") return `${formatLon(p.lon)}. First house. How the chart walks into a room.`;
  if (p.id === "mc") return `${formatLon(p.lon)}. Tenth house. The public axis of the chart.`;
  return `${p.note}. Read the degree before the story.`;
}

function seedBody(p: CastPoint): string[] {
  const dig = dignityFor(p.id, p.signId);
  const digNote =
    dig === "peregrine" || dig === "angle"
      ? "No traditional dignity claim beyond the table."
      : `Traditional condition: ${dig}.`;
  return [
    `${p.name} at ${formatLon(p.lon)} in house ${p.house}${p.retrograde ? ", retrograde" : ""}.`,
    digNote,
  ];
}

function toPlanetDef(p: CastPoint): PlanetDef {
  const look = PLANET_LOOK[p.id] ?? { color: "#d8cfc0", glow: "#9a9186", size: 0.16, radius: 5.4 };
  return {
    id: p.id,
    name: p.name,
    glyph: p.name.slice(0, 4),
    lon: p.lon,
    house: p.house,
    wholeSign: p.house,
    retrograde: p.retrograde,
    dignity: dignityFor(p.id, p.signId),
    color: look.color,
    glow: look.glow,
    size: look.size,
    radius: look.radius,
    headline: seedHeadline(p),
    why: seedWhy(p),
    body: seedBody(p),
    note: p.note,
  };
}

function wholeSignCusps(ascLon: number): HouseCusp[] {
  const ascSign = Math.floor(wrap360(ascLon) / 30) * 30;
  const labels = ["ASC", "2", "3", "IC", "5", "6", "DSC", "8", "9", "MC", "11", "12"];
  return Array.from({ length: 12 }, (_, i) => {
    const lon = wrap360(ascSign + i * 30);
    const sign = signFromLon(lon);
    const tag = labels[i]!;
    return {
      house: i + 1,
      lon,
      label: i === 0 || i === 3 || i === 6 || i === 9 ? `${tag} · ${sign.name}` : `${tag} · ${sign.name}`,
    };
  });
}

function angleSep(a: number, b: number) {
  let d = Math.abs(wrap360(a) - wrap360(b));
  if (d > 180) d = 360 - d;
  return d;
}

function buildAspects(planets: PlanetDef[]): AspectDef[] {
  const movable = planets.filter((p) => p.id !== "asc" && p.id !== "mc" && p.note !== "not cast");
  const out: AspectDef[] = [];
  for (let i = 0; i < movable.length; i++) {
    for (let j = i + 1; j < movable.length; j++) {
      const a = movable[i]!;
      const b = movable[j]!;
      const sep = angleSep(a.lon, b.lon);
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sep - def.angle);
        if (orb <= def.orb) {
          out.push({
            id: `${a.id}-${b.id}-${def.type}`,
            a: a.id,
            b: b.id,
            type: def.type,
            orb: Number(orb.toFixed(2)),
            iron: orb <= 1,
            text: `${a.name} ${ASPECT_LABEL[def.type]} ${b.name} · orb ${orb.toFixed(1)}°.`,
          });
          break;
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

function countElements(planets: PlanetDef[]) {
  const el: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const mo: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of planets) {
    if (p.id === "asc" || p.id === "mc" || p.note === "not cast") continue;
    const s = SIGNS.find((x) => x.id === signFromLon(p.lon).id);
    if (!s) continue;
    el[s.element] += 1;
    mo[s.modality] += 1;
  }
  return { elements: el, modalities: mo };
}

function visitorSigns(planets: PlanetDef[], ascLon: number): SignDef[] {
  const occupied = new Map<SignId, PlanetDef[]>();
  for (const p of planets) {
    if (p.note === "not cast") continue;
    const id = signFromLon(p.lon).id;
    const list = occupied.get(id) ?? [];
    list.push(p);
    occupied.set(id, list);
  }
  const ascSign = Math.floor(wrap360(ascLon) / 30);
  return SIGNS.map((s, i) => {
    const held = occupied.get(s.id) ?? [];
    const inChart =
      held.length === 0
        ? `No natal point in ${s.name} in this cast.`
        : held.map((p) => `${p.name} at ${formatLon(p.lon)}`).join("; ") + ".";
    const rising = i === ascSign;
    return {
      id: s.id,
      name: s.name,
      abbr: s.abbr,
      startLon: s.startLon,
      element: s.element,
      modality: s.modality,
      intercepted: false,
      headline: rising ? `${s.name} rises.` : held.length ? `${s.name} holds chart points.` : `${s.name}.`,
      body: `${s.element} · ${s.modality}. Geometry only — not a research essay.`,
      inChart,
    };
  });
}

function visitorChakras(planets: PlanetDef[]): ChakraDef[] {
  const byId = Object.fromEntries(planets.map((p) => [p.id, p])) as Partial<Record<PlanetId, PlanetDef>>;
  return CHAKRAS.map((c) => {
    const rulers = c.rulers
      .map((id) => byId[id])
      .filter((p): p is PlanetDef => p != null && p.note !== "not cast");
    const lines =
      rulers.length > 0
        ? rulers.map((p) => `${p.name} · ${p.note}`)
        : ["No cast ruler for this center in the visitor sky."];
    return {
      id: c.id,
      name: c.name,
      sanskrit: c.sanskrit,
      y: c.y,
      color: c.color,
      glow: c.glow,
      rulers: c.rulers,
      headline: `${c.name} · from the tabled rulers.`,
      body: lines,
      practice: "Read the degrees on the rulers before inventing a story.",
    };
  });
}

function coordsLabel(lat: number, lon: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

function oneCutFrom(planets: PlanetDef[]) {
  const sun = planets.find((p) => p.id === "sun");
  const moon = planets.find((p) => p.id === "moon");
  const asc = planets.find((p) => p.id === "asc");
  if (!sun || !moon || !asc) return "A timed natal, tabled from the sky.";
  return `Sun in ${signFromLon(sun.lon).name}, Moon in ${signFromLon(moon.lon).name}, ${signFromLon(asc.lon).name} rising.`;
}

/** Build a research-shaped Nativity from a computed cast — tables first, seed prose only. */
export function buildVisitorNativity(cast: NatalCast, opts: VisitorNatalOpts): Nativity {
  const planets = cast.points.map(toPlanetDef);
  // Only cast points — no fake node/chiron/lilith stubs.
  const planetById = Object.fromEntries(planets.map((p) => [p.id, p])) as Partial<
    Record<PlanetId, PlanetDef>
  >;

  const { elements, modalities } = countElements(planets);
  const aspects = buildAspects(planets);
  const houses = wholeSignCusps(cast.angles.asc);
  const chakras = visitorChakras(planets);
  const cut = oneCutFrom(planets);

  return {
    id: "visitor",
    person: "you",
    meta: {
      name: opts.label ?? "Your natal",
      date: opts.dateLabel,
      time: opts.timeLabel,
      place: cast.place,
      coords: coordsLabel(cast.lat, cast.lon),
      zone: cast.timeZone,
      julian: cast.utcIso,
      zodiac: "Tropical",
      houses: "Whole Sign",
      node: "Not cast",
      engine: "astronomy-engine",
      sunAltitude: "—",
      oneCut: cut,
      thesis: `${cut} Degrees and houses are calculated. Essays are not invented past the table.`,
    },
    angles: cast.angles,
    planets,
    planetById,
    houses,
    elements,
    modalities,
    signs: visitorSigns(planets, cast.angles.asc),
    aspects,
    chakras,
    chakraById: Object.fromEntries(chakras.map((c) => [c.id, c])) as Nativity["chakraById"],
    gates: [],
    gateById: {} as Nativity["gateById"],
    steps: [],
    decisionClose: "The machine rooms stay on research books. Your sky is the table.",
    readings: [],
    readingById: {},
    suggested: [
      "What is my sun holding?",
      "What is my moon holding?",
      "What does my rising face do?",
      "Which aspect is tightest?",
    ],
    alwaysLabel: ["sun", "moon", "asc", "mercury", "venus", "mars"],
    extraBones: [],
    canonExtra: "Visitor natal. Quote positions exactly. Do not invent research-book prose.",
    machineTitle: "The machine",
    readingsTitle: "Readings",
  };
}

/** Keep Big Three SkyNatal in sync for deep-cut / legacy save paths. */
export function skyNatalFromCast(cast: NatalCast, when: string, tone: "vault" | "warm" = "vault"): SkyNatal {
  const want = new Set(["sun", "moon", "asc"]);
  return {
    depth: "three",
    tone,
    when,
    place: cast.place,
    lat: cast.lat,
    lon: cast.lon,
    timeZone: cast.timeZone,
    bodies: cast.points
      .filter((p) => want.has(p.id))
      .map((p) => ({
        id: p.id as "sun" | "moon" | "asc",
        name: p.name,
        lon: p.lon,
        signId: p.signId,
        signName: p.signName,
        degInSign: p.degInSign,
        house: p.house,
        note: p.note,
        headline: seedHeadline(p),
        why: seedWhy(p),
        body: seedBody(p),
      })),
    writtenAt: null,
  };
}
