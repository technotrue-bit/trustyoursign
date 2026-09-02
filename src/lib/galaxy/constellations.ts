import type { Element, SignId } from "@/lib/chart/types";

export type StarXY = [number, number];
export type StarPt = { x: number; y: number; mag: number };
export type Figure = { stars: StarPt[] };

export type Constellation = {
  id: SignId;
  name: string;
  month: string;
  span: string;
  essence: string;
  element: Element;
  glyph: string;
  animal: Figure;
  figure: Figure;
};

function pts(pairs: [number, number, number?][], scale = 1): Figure {
  return {
    stars: pairs.map(([x, y, mag]) => ({ x: x * scale, y: y * scale, mag: mag ?? 0.72 })),
  };
}

function glyphOf(kind: SignId): Figure {
  const G: Record<SignId, [number, number, number?][]> = {
    aries: [[-1.6, 1.4], [-0.7, 2.1], [0, 0.2], [0.7, 2.1], [1.6, 1.4], [0, -1.8, 0.9]],
    taurus: [[-2.1, 1.6], [-1.2, 2.15], [-0.4, 1.1], [0.4, 1.1], [1.2, 2.15], [2.1, 1.6], [0, -0.4, 1], [0, -1.9, 0.85]],
    gemini: [[-1.3, 2], [-1.3, -1.8], [1.3, 2], [1.3, -1.8], [-1.3, 0.4], [1.3, 0.4], [-1.3, 2, 0.4], [1.3, 2, 0.4]],
    cancer: [[-1.8, 0.9], [-0.6, 1.4], [0.2, 0.4], [-0.5, -0.3], [1.8, -0.9], [0.6, -1.4], [-0.2, -0.4], [0.5, 0.3]],
    leo: [[-0.2, 2.1], [0.9, 1.7], [1.6, 0.6], [0.7, -0.2], [-0.6, -0.5], [-1.5, -1.3], [-0.7, -2], [0.6, -1.8]],
    virgo: [[-2.1, 1.9], [-1.1, 1.2], [-0.2, 0.3], [0.8, -0.6], [1.8, -1.5], [2.6, -2.2], [1.2, 0.9], [2.2, 0.2]],
    libra: [[0, 2], [-2.2, 0.3], [2.2, 0.3], [-2.4, -1.5], [-0.8, -1.5], [0.8, -1.5], [2.4, -1.5]],
    scorpio: [[-2.8, 0.8], [-1.6, 0.5], [-0.4, 0.3], [0.8, 0.1], [1.9, -0.3], [2.7, -1.1], [2.1, -2], [1.1, -2.3]],
    sagittarius: [[-2.2, -1.4], [-0.8, -0.4], [0.4, 0.5], [1.6, 1.5], [2.4, 2.1], [0.9, 1.9], [1.9, 0.6], [-0.2, -1.6]],
    capricorn: [[-2.4, 0.2], [-1.3, 0.8], [-0.2, 0.3], [0.9, -0.6], [2.1, -1.4], [2.8, -0.2], [2.2, 1.1], [0.4, -1.8]],
    aquarius: [[-2.4, 0.7], [-1.2, 1.1], [0, 0.6], [1.2, 1.1], [2.4, 0.7], [-1.8, -0.8], [-0.4, -0.4], [1.1, -0.9], [2.3, -0.5]],
    pisces: [[-2.3, 1.6], [-1.6, 0.2], [-2.1, -1.5], [2.3, 1.6], [1.6, 0.2], [2.1, -1.5], [-0.6, 0.15], [0.6, -0.15]],
  };
  return pts(G[kind], 0.92);
}

function animalOf(kind: SignId): Figure {
  const A: Record<SignId, [number, number, number?][]> = {
    aries: [[-2.2, 1.9], [-1.5, 2.4], [-0.3, 1.2], [0.3, 1.25], [1.5, 2.4], [2.2, 1.9], [0, 0.4], [-0.9, -0.8], [0.9, -0.8], [0, -1.7]],
    taurus: [[-2.4, 1.9], [-1.7, 2.45], [-0.5, 1.1], [0.5, 1.1], [1.7, 2.45], [2.4, 1.9], [0, 0.2], [-1.1, -1.2], [1.2, -1.2], [0, -2]],
    gemini: [[-1.6, 2.1], [-1.6, 0.4], [-1.6, -1.8], [-2.3, 0.6], [-0.9, 0.6], [1.6, 2.1], [1.6, 0.4], [1.6, -1.8], [0.9, 0.6], [2.3, 0.6]],
    cancer: [[-2, 1.2], [-1, 1.6], [0.1, 0.5], [-0.7, -0.4], [2, -1.1], [1, -1.6], [-0.1, -0.5], [0.7, 0.4]],
    leo: [[-0.4, 2.2], [0.8, 2], [1.8, 1.1], [1.3, 0.1], [0.1, -0.3], [-1.2, -0.7], [-1.8, -1.6], [-0.5, -2.1], [0.9, -1.7]],
    virgo: [[-2.3, 2], [-1.3, 1.2], [-0.3, 0.3], [0.7, -0.6], [1.7, -1.4], [2.5, -2.1], [1.1, 1], [2.1, 0.3]],
    libra: [[0, 2.2], [-2.4, 0.4], [2.4, 0.4], [-2.6, -1.6], [-1.1, -1.6], [1.1, -1.6], [2.6, -1.6]],
    scorpio: [[-3, 1], [-1.8, 0.6], [-0.6, 0.35], [0.6, 0.15], [1.8, -0.25], [2.8, -1.15], [2.2, -2.15], [1.1, -2.4]],
    sagittarius: [[-2.4, -1.5], [-1, -0.5], [0.3, 0.5], [1.5, 1.5], [2.5, 2.2], [0.8, 2], [2, 0.5], [-0.4, -1.8]],
    capricorn: [[-2.5, 0.3], [-1.4, 0.9], [-0.2, 0.35], [0.9, -0.55], [2.2, -1.45], [2.9, -0.15], [2.3, 1.2], [0.3, -1.85]],
    aquarius: [[-2.5, 0.8], [-1.2, 1.2], [0, 0.7], [1.2, 1.2], [2.5, 0.8], [-1.9, -0.9], [-0.4, -0.45], [1.1, -1], [2.4, -0.55]],
    pisces: [[-2.4, 1.7], [-1.7, 0.2], [-2.2, -1.6], [2.4, 1.7], [1.7, 0.2], [2.2, -1.6], [-0.5, 0.2], [0.5, -0.2]],
  };
  return pts(A[kind], 1);
}

export const CONSTELLATIONS: Constellation[] = [
  { id: "aries", name: "Aries", month: "March 21 – April 19", span: "Mar – Apr", essence: "The first heat. A beginning that does not ask.", element: "fire", glyph: "♈" },
  { id: "taurus", name: "Taurus", month: "April 20 – May 20", span: "Apr – May", essence: "The floor. Enough. A body that stays.", element: "earth", glyph: "♉" },
  { id: "gemini", name: "Gemini", month: "May 21 – June 20", span: "May – Jun", essence: "Two channels. Talk as a way of arriving.", element: "air", glyph: "♊" },
  { id: "cancer", name: "Cancer", month: "June 21 – July 22", span: "Jun – Jul", essence: "The shell. Safety before the room gets you.", element: "water", glyph: "♋" },
  { id: "leo", name: "Leo", month: "July 23 – August 22", span: "Jul – Aug", essence: "The will that remains after the performance.", element: "fire", glyph: "♌" },
  { id: "virgo", name: "Virgo", month: "August 23 – September 22", span: "Aug – Sep", essence: "The craft. Make it accurate, then it is sacred.", element: "earth", glyph: "♍" },
  { id: "libra", name: "Libra", month: "September 23 – October 22", span: "Sep – Oct", essence: "The in-between. A scale that wants a true weight.", element: "air", glyph: "♎" },
  { id: "scorpio", name: "Scorpio", month: "October 23 – November 21", span: "Oct – Nov", essence: "All-in or out. The hook under the pretty floor.", element: "water", glyph: "♏" },
  { id: "sagittarius", name: "Sagittarius", month: "November 22 – December 21", span: "Nov – Dec", essence: "The arrow. A life that will not stay small.", element: "fire", glyph: "♐" },
  { id: "capricorn", name: "Capricorn", month: "December 22 – January 19", span: "Dec – Jan", essence: "Climb it. Structure is how the mountain remembers you.", element: "earth", glyph: "♑" },
  { id: "aquarius", name: "Aquarius", month: "January 20 – February 18", span: "Jan – Feb", essence: "The future leaking in. A current that will not stay private.", element: "air", glyph: "♒" },
  { id: "pisces", name: "Pisces", month: "February 19 – March 20", span: "Feb – Mar", essence: "Two fish, one ocean. Dissolve, then return with the dream intact.", element: "water", glyph: "♓" },
].map((c) => ({
  ...c,
  animal: animalOf(c.id),
  figure: glyphOf(c.id),
}));

export function wrap12(t: number) {
  return ((t % 12) + 12) % 12;
}

export function nearestSign(t: number) {
  const u = wrap12(t);
  return Math.round(u) % 12;
}

export function signStation(index: number) {
  return ((Math.round(index) % 12) + 12) % 12;
}

export function signedDelta(from: number, to: number) {
  const a = wrap12(from);
  const b = wrap12(to);
  let d = b - a;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d;
}

export function constellationDust(index: number, n: number) {
  const out: StarPt[] = [];
  for (let i = 0; i < n; i++) {
    const a = index * 1.73 + i * 2.399;
    const r = 2.4 + (i % 5) * 0.55;
    out.push({
      x: Math.cos(a) * r,
      y: Math.sin(a * 0.82) * r * 0.62,
      mag: 0.28 + (i % 4) * 0.08,
    });
  }
  return out;
}

export type Pair = { ax: number; ay: number; am: number; gx: number; gy: number; gm: number };

export function pairFigures(animal: Figure, glyph: Figure): Pair[] {
  const a = animal.stars;
  const g = glyph.stars;
  const n = Math.max(a.length, g.length);
  const pairs: Pair[] = [];
  for (let i = 0; i < n; i++) {
    const as = a[i % a.length]!;
    const gs = g[i % g.length]!;
    pairs.push({ ax: as.x, ay: as.y, am: as.mag, gx: gs.x, gy: gs.y, gm: gs.mag });
  }
  return pairs;
}
