import type { Element, SignId } from "@/lib/chart/types";

export type StarPt = {
  x: number;
  y: number;
  mag: number;
};

export type Figure = {
  stars: StarPt[];
  lines: [number, number][];
};

export type Constellation = {
  id: SignId;
  name: string;
  month: string;
  span: string;
  essence: string;
  element: Element;
  stars: StarPt[];
  lines: [number, number][];
  glyph: Figure;
  animal: Figure;
};

type Pt = [number, number];
type Stroke = { pts: Pt[]; closed?: boolean };

function dist(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return out;
}

/** Sample a glyph stroke into mixed-magnitude stars so the outline reads as a constellation. */
function compile(strokes: Stroke[], spacing = 0.62): { stars: StarPt[]; lines: [number, number][] } {
  const stars: StarPt[] = [];
  const lines: [number, number][] = [];
  const seen = new Map<string, number>();

  const add = (p: Pt, mag: number) => {
    const k = `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    const ex = seen.get(k);
    if (ex != null) {
      if (mag > stars[ex]!.mag) stars[ex]!.mag = mag;
      return ex;
    }
    const i = stars.length;
    stars.push({ x: p[0], y: p[1], mag });
    seen.set(k, i);
    return i;
  };

  for (const stroke of strokes) {
    const pts = stroke.pts.slice();
    if (stroke.closed && pts.length > 2) pts.push(pts[0]!);
    const ids: number[] = [];
    const first = pts[0];
    if (!first) continue;
    ids.push(add(first, 0.92));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const d = dist(a, b);
      const n = Math.max(1, Math.round(d / spacing));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const p: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const joint = k === n;
        const mag = joint ? 0.78 + (i % 3) * 0.07 : 0.3 + (k % 4) * 0.06;
        ids.push(add(p, Math.min(1, mag)));
      }
    }
    for (let i = 1; i < ids.length; i++) {
      if (ids[i] !== ids[i - 1]) lines.push([ids[i - 1]!, ids[i]!]);
    }
  }
  if (stars[0]) stars[0].mag = 1;
  return { stars, lines };
}

const GLYPH = {
  aries: compile([
    { pts: [[0, -0.35], [-0.45, 0.55], [-1.05, 1.4], [-1.75, 2.15], [-2.45, 2.5], [-3.0, 2.05], [-3.15, 1.3]] },
    { pts: [[0, -0.35], [0.45, 0.55], [1.05, 1.4], [1.75, 2.15], [2.45, 2.5], [3.0, 2.05], [3.15, 1.3]] },
  ]),
  taurus: compile([
    { pts: arc(0, -0.55, 1.22, 0, Math.PI * 2, 12), closed: true },
    { pts: [[-0.75, 0.5], [-1.55, 1.45], [-2.35, 2.25], [-2.85, 1.75]] },
    { pts: [[0.75, 0.5], [1.55, 1.45], [2.35, 2.25], [2.85, 1.75]] },
  ]),
  gemini: compile([
    { pts: [[-2.05, 2.25], [2.05, 2.25]] },
    { pts: [[-1.45, 2.25], [-1.45, -2.25]] },
    { pts: [[1.45, 2.25], [1.45, -2.25]] },
    { pts: [[-2.05, -2.25], [2.05, -2.25]] },
  ]),
  cancer: compile([
    { pts: arc(1.05, 1.15, 0.82, -0.35, Math.PI * 1.65, 9) },
    { pts: [[0.28, 0.95], [-0.15, 0.25], [-0.55, -0.35]] },
    { pts: arc(-1.05, -1.15, 0.82, Math.PI - 0.35, Math.PI + Math.PI * 1.65, 9) },
    { pts: [[-0.28, -0.95], [0.15, -0.25], [0.55, 0.35]] },
  ]),
  leo: compile([
    { pts: arc(-1.45, -0.15, 1.12, 0, Math.PI * 2, 11), closed: true },
    {
      pts: [
        [-0.45, 0.7],
        [0.25, 1.65],
        [1.15, 2.3],
        [2.2, 1.9],
        [2.7, 0.75],
        [2.45, -0.45],
        [1.65, -1.15],
      ],
    },
  ]),
  virgo: compile([
    {
      pts: [
        [-2.55, -2.2],
        [-2.55, 2.2],
        [-1.2, -0.3],
        [0.2, 2.2],
        [1.4, -2.2],
        [2.2, -2.4],
        [2.85, -1.55],
        [2.4, -0.6],
        [1.55, -0.85],
      ],
    },
  ]),
  libra: compile([
    { pts: [[-2.75, 0.55], [-0.95, 0.55]] },
    { pts: [[-0.95, 0.55], [0, 1.85], [0.95, 0.55]] },
    { pts: [[0.95, 0.55], [2.75, 0.55]] },
    { pts: [[-2.75, -1.1], [2.75, -1.1]] },
  ]),
  scorpio: compile([
    {
      pts: [
        [-2.55, -2.15],
        [-2.55, 2.15],
        [-1.2, -0.2],
        [0.2, 2.15],
        [1.4, -1.2],
        [2.2, -1.2],
        [2.2, 0.95],
      ],
    },
    { pts: [[1.65, 0.4], [2.2, 0.95], [2.75, 0.4]] },
  ]),
  sagittarius: compile([
    { pts: [[-2.6, -2.25], [2.45, 2.3]] },
    { pts: [[1.55, 2.3], [2.45, 2.3], [2.45, 1.35]] },
    { pts: [[-1.4, 0.55], [0.55, -1.4]] },
  ]),
  capricorn: compile([
    {
      pts: [
        [-2.5, -0.25],
        [-1.55, 2.2],
        [0.2, -0.5],
        [1.05, -2.2],
        [2.2, -2.3],
        [2.9, -1.3],
        [2.55, -0.2],
        [1.6, 0.2],
        [1.2, -0.55],
      ],
    },
  ]),
  aquarius: compile([
    {
      pts: [
        [-2.9, 0.95],
        [-1.9, 1.9],
        [-0.9, 0.95],
        [0.15, 1.9],
        [1.15, 0.95],
        [2.2, 1.9],
        [2.9, 1.15],
      ],
    },
    {
      pts: [
        [-2.9, -0.9],
        [-1.9, 0.05],
        [-0.9, -0.9],
        [0.15, 0.05],
        [1.15, -0.9],
        [2.2, 0.05],
        [2.9, -0.7],
      ],
    },
  ]),
  pisces: compile([
    {
      pts: [
        [0.2, 2.4],
        [-1.05, 1.9],
        [-2.15, 0.95],
        [-2.6, 0],
        [-2.15, -0.95],
        [-1.05, -1.9],
        [0.2, -2.4],
      ],
    },
    {
      pts: [
        [-0.2, 2.4],
        [1.05, 1.9],
        [2.15, 0.95],
        [2.6, 0],
        [2.15, -0.95],
        [1.05, -1.9],
        [-0.2, -2.4],
      ],
    },
    { pts: [[-2.6, 0], [2.6, 0]] },
  ]),
};

const ANIMAL: Record<SignId, Figure> = {
  aries: compile(
    [
      { pts: [[-0.15, 1.25], [-0.85, 2.05], [-1.65, 2.4], [-2.25, 1.85], [-2.05, 1.15]] },
      { pts: [[0.4, 1.3], [1.1, 2.1], [1.9, 2.45], [2.5, 1.9], [2.3, 1.2]] },
      { pts: [[-0.2, 1.05], [0.2, 1.45], [0.65, 1.15], [0.45, 0.65], [0.05, 0.5]] },
      {
        pts: [
          [0.05, 0.45],
          [-0.85, 0.1],
          [-1.45, -0.55],
          [-1.15, -1.3],
          [0.25, -1.4],
          [1.35, -0.8],
          [1.55, 0.05],
          [0.75, 0.5],
        ],
      },
      { pts: [[-1.0, -1.28], [-1.1, -2.2]] },
      { pts: [[-0.3, -1.38], [-0.2, -2.25]] },
      { pts: [[0.75, -1.32], [0.85, -2.22]] },
      { pts: [[1.25, -1.05], [1.5, -2.1]] },
      { pts: [[-1.45, -0.4], [-2.05, -0.1], [-2.35, 0.4]] },
    ],
    0.72,
  ),
  taurus: compile(
    [
      { pts: [[-0.35, 1.35], [-1.15, 2.2], [-1.95, 2.45], [-2.45, 1.85]] },
      { pts: [[0.45, 1.4], [1.25, 2.25], [2.05, 2.5], [2.55, 1.9]] },
      { pts: arc(0.05, 0.85, 0.72, 0.4, Math.PI * 1.7, 7) },
      {
        pts: [
          [-0.55, 0.25],
          [-1.55, -0.15],
          [-1.85, -0.95],
          [-1.15, -1.55],
          [0.85, -1.65],
          [1.95, -1.05],
          [2.05, -0.15],
          [1.15, 0.35],
        ],
      },
      { pts: [[-1.35, -1.5], [-1.55, -2.3]] },
      { pts: [[-0.45, -1.62], [-0.4, -2.35]] },
      { pts: [[0.85, -1.62], [0.95, -2.35]] },
      { pts: [[1.65, -1.25], [1.95, -2.2]] },
    ],
    0.72,
  ),
  gemini: compile(
    [
      { pts: arc(-1.25, 1.85, 0.38, 0, Math.PI * 2, 6), closed: true },
      { pts: [[-1.25, 1.45], [-1.25, -0.35]] },
      { pts: [[-2.05, 0.75], [-1.25, 0.35], [-0.45, 0.75]] },
      { pts: [[-1.25, -0.35], [-1.85, -1.85]] },
      { pts: [[-1.25, -0.35], [-0.65, -1.85]] },
      { pts: arc(1.25, 1.85, 0.38, 0, Math.PI * 2, 6), closed: true },
      { pts: [[1.25, 1.45], [1.25, -0.35]] },
      { pts: [[0.45, 0.75], [1.25, 0.35], [2.05, 0.75]] },
      { pts: [[1.25, -0.35], [0.65, -1.85]] },
      { pts: [[1.25, -0.35], [1.85, -1.85]] },
    ],
    0.7,
  ),
  cancer: compile(
    [
      { pts: arc(0, 0.05, 0.85, 0, Math.PI * 2, 9), closed: true },
      { pts: [[0.7, 0.55], [1.55, 1.35], [2.35, 1.15], [2.15, 0.45], [1.45, 0.65]] },
      { pts: [[-0.7, 0.55], [-1.55, 1.35], [-2.35, 1.15], [-2.15, 0.45], [-1.45, 0.65]] },
      { pts: [[0.75, -0.15], [1.85, -0.35], [2.15, -0.95]] },
      { pts: [[0.55, -0.55], [1.35, -1.15], [1.55, -1.85]] },
      { pts: [[-0.75, -0.15], [-1.85, -0.35], [-2.15, -0.95]] },
      { pts: [[-0.55, -0.55], [-1.35, -1.15], [-1.55, -1.85]] },
    ],
    0.7,
  ),
  leo: compile(
    [
      { pts: arc(-1.15, 0.85, 1.15, 0, Math.PI * 2, 10), closed: true },
      { pts: arc(-1.15, 0.85, 0.45, 0, Math.PI * 2, 6), closed: true },
      {
        pts: [
          [-0.25, 0.25],
          [0.55, -0.15],
          [1.35, -0.55],
          [1.85, -1.25],
          [1.15, -1.75],
          [-0.15, -1.65],
          [-1.05, -1.05],
        ],
      },
      { pts: [[-0.55, -1.55], [-0.65, -2.3]] },
      { pts: [[0.55, -1.7], [0.7, -2.35]] },
      { pts: [[1.85, -1.15], [2.55, -0.35], [2.85, 0.55], [2.45, 1.15]] },
    ],
    0.7,
  ),
  virgo: compile(
    [
      { pts: arc(0, 1.85, 0.42, 0, Math.PI * 2, 6), closed: true },
      { pts: [[0, 1.4], [0, -0.15]] },
      { pts: [[-0.95, 0.65], [0, 0.15], [0.95, 0.65]] },
      { pts: [[0, -0.15], [-0.85, -1.85], [0.85, -1.85], [0, -0.15]] },
      { pts: [[0.95, 0.65], [1.85, 0.15], [2.35, -0.55], [2.05, -1.05]] },
    ],
    0.7,
  ),
  libra: compile(
    [
      { pts: arc(0, 1.55, 0.38, 0, Math.PI * 2, 6), closed: true },
      { pts: [[0, 1.15], [0, -0.55]] },
      { pts: [[-0.75, 0.45], [0.75, 0.45]] },
      { pts: [[0, -0.55], [-0.55, -1.85]] },
      { pts: [[0, -0.55], [0.55, -1.85]] },
      { pts: [[-2.35, 0.85], [2.35, 0.85]] },
      { pts: [[-1.65, 0.85], [-1.65, -0.15], [-2.15, -0.85], [-1.15, -0.85]] },
      { pts: [[1.65, 0.85], [1.65, -0.15], [1.15, -0.85], [2.15, -0.85]] },
    ],
    0.7,
  ),
  scorpio: compile(
    [
      { pts: [[-2.35, 0.85], [-1.65, 1.55], [-1.05, 0.85], [-1.55, 0.25], [-2.15, 0.45]] },
      { pts: [[-2.05, 1.35], [-2.55, 1.85], [-2.85, 1.35]] },
      { pts: [[-1.35, 1.55], [-1.15, 2.15], [-0.65, 1.85]] },
      {
        pts: [
          [-1.05, 0.55],
          [-0.15, 0.25],
          [0.65, 0.05],
          [1.35, 0.35],
          [1.85, 1.05],
          [1.95, 1.85],
          [1.45, 2.35],
        ],
      },
      { pts: [[1.45, 2.35], [1.95, 2.55], [2.35, 2.15]] },
    ],
    0.68,
  ),
  sagittarius: compile(
    [
      { pts: arc(0.35, 1.85, 0.35, 0, Math.PI * 2, 5), closed: true },
      { pts: [[0.35, 1.5], [0.15, 0.35]] },
      { pts: [[0.15, 0.95], [1.15, 1.25]] },
      { pts: [[1.15, 1.25], [2.05, 1.85]] },
      { pts: [[1.15, 1.25], [2.15, 0.55]] },
      { pts: [[1.55, 1.85], [2.05, 1.85], [2.05, 1.35]] },
      {
        pts: [
          [0.15, 0.35],
          [-1.15, 0.15],
          [-2.15, -0.55],
          [-1.85, -1.35],
          [-0.35, -1.45],
          [0.85, -0.95],
          [0.55, 0.15],
        ],
      },
      { pts: [[-1.65, -1.3], [-1.85, -2.2]] },
      { pts: [[-0.85, -1.42], [-0.75, -2.25]] },
      { pts: [[0.15, -1.25], [0.35, -2.15]] },
      { pts: [[0.75, -0.95], [1.15, -1.85]] },
    ],
    0.72,
  ),
  capricorn: compile(
    [
      { pts: [[-0.85, 1.15], [-1.45, 2.05], [-2.05, 1.55]] },
      { pts: [[-0.35, 1.25], [0.15, 2.05], [0.65, 1.55]] },
      { pts: arc(-0.45, 0.75, 0.55, -0.4, Math.PI * 1.5, 6) },
      { pts: [[-0.85, 0.25], [-1.55, -0.85], [-1.35, -1.85]] },
      { pts: [[-0.25, 0.15], [0.15, -0.95], [0.05, -1.85]] },
      {
        pts: [
          [0.15, 0.35],
          [1.05, 0.15],
          [1.85, -0.45],
          [2.45, -1.15],
          [2.15, -1.85],
          [1.25, -1.55],
          [0.85, -0.75],
        ],
      },
    ],
    0.7,
  ),
  aquarius: compile(
    [
      { pts: arc(-0.15, 1.75, 0.38, 0, Math.PI * 2, 6), closed: true },
      { pts: [[-0.15, 1.35], [-0.15, -0.15]] },
      { pts: [[-0.95, 0.65], [-0.15, 0.15], [0.55, 0.55], [1.15, 0.15]] },
      { pts: [[-0.15, -0.15], [-0.65, -1.65]] },
      { pts: [[-0.15, -0.15], [0.45, -1.65]] },
      { pts: [[1.15, 0.15], [1.75, -0.35], [1.45, -0.85]] },
      {
        pts: [
          [-2.35, -1.05],
          [-1.45, -0.25],
          [-0.55, -1.05],
          [0.35, -0.25],
          [1.25, -1.05],
          [2.15, -0.35],
          [2.65, -0.85],
        ],
      },
      {
        pts: [
          [-2.15, -1.85],
          [-1.25, -1.05],
          [-0.35, -1.85],
          [0.55, -1.05],
          [1.45, -1.85],
          [2.35, -1.15],
        ],
      },
    ],
    0.72,
  ),
  pisces: compile(
    [
      {
        pts: [
          [-2.45, 1.55],
          [-1.55, 2.15],
          [-0.65, 1.65],
          [-0.35, 0.75],
          [-0.95, 0.15],
          [-1.85, 0.35],
          [-2.45, 1.05],
        ],
        closed: true,
      },
      { pts: [[-2.45, 1.55], [-2.95, 2.05]] },
      {
        pts: [
          [2.45, -1.55],
          [1.55, -2.15],
          [0.65, -1.65],
          [0.35, -0.75],
          [0.95, -0.15],
          [1.85, -0.35],
          [2.45, -1.05],
        ],
        closed: true,
      },
      { pts: [[2.45, -1.55], [2.95, -2.05]] },
      { pts: [[-0.35, 0.75], [0.35, -0.75]] },
    ],
    0.7,
  ),
};

function withForms(glyph: Figure, animal: Figure): Figure & { glyph: Figure; animal: Figure } {
  return { stars: glyph.stars, lines: glyph.lines, glyph, animal };
}

export type MorphPair = {
  ax: number;
  ay: number;
  am: number;
  gx: number;
  gy: number;
  gm: number;
};

/** Walk each animal star to a glyph star so the ram becomes ♈. */
export function pairFigures(animal: Figure, glyph: Figure): MorphPair[] {
  const aStars = animal.stars;
  const gStars = glyph.stars;
  if (!aStars.length) {
    return gStars.map((g) => ({ ax: g.x, ay: g.y, am: g.mag, gx: g.x, gy: g.y, gm: g.mag }));
  }
  if (!gStars.length) {
    return aStars.map((a) => ({ ax: a.x, ay: a.y, am: a.mag, gx: a.x, gy: a.y, gm: a.mag }));
  }
  const pairs: MorphPair[] = [];
  const used = new Uint8Array(gStars.length);
  let claimed = 0;
  for (const a of aStars) {
    let best = -1;
    let bestD = Infinity;
    const open = claimed < gStars.length;
    for (let j = 0; j < gStars.length; j++) {
      if (open && used[j]) continue;
      const g = gStars[j]!;
      const d = (a.x - g.x) * (a.x - g.x) + (a.y - g.y) * (a.y - g.y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    const g = gStars[best]!;
    if (!used[best]) {
      used[best] = 1;
      claimed += 1;
    }
    pairs.push({ ax: a.x, ay: a.y, am: a.mag, gx: g.x, gy: g.y, gm: g.mag });
  }
  for (let j = 0; j < gStars.length; j++) {
    if (used[j]) continue;
    const g = gStars[j]!;
    let best = aStars[0]!;
    let bestD = Infinity;
    for (const a of aStars) {
      const d = (a.x - g.x) * (a.x - g.x) + (a.y - g.y) * (a.y - g.y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    pairs.push({ ax: best.x, ay: best.y, am: 0.1, gx: g.x, gy: g.y, gm: g.mag });
  }
  return pairs;
}

/** Zodiac glyphs drawn as constellation outlines — stars on the sign, lines as the stroke. */
export const CONSTELLATIONS: Constellation[] = [
  {
    id: "aries",
    name: "Aries",
    month: "March 21 – April 19",
    span: "Mar – Apr",
    essence: "The first heat. A beginning that does not ask.",
    element: "fire",
    ...withForms(GLYPH.aries, ANIMAL.aries),
  },
  {
    id: "taurus",
    name: "Taurus",
    month: "April 20 – May 20",
    span: "Apr – May",
    essence: "The floor. Enough. A body that stays.",
    element: "earth",
    ...withForms(GLYPH.taurus, ANIMAL.taurus),
  },
  {
    id: "gemini",
    name: "Gemini",
    month: "May 21 – June 20",
    span: "May – Jun",
    essence: "Two channels. Talk as a way of arriving.",
    element: "air",
    ...withForms(GLYPH.gemini, ANIMAL.gemini),
  },
  {
    id: "cancer",
    name: "Cancer",
    month: "June 21 – July 22",
    span: "Jun – Jul",
    essence: "The shell. Safety before the room gets you.",
    element: "water",
    ...withForms(GLYPH.cancer, ANIMAL.cancer),
  },
  {
    id: "leo",
    name: "Leo",
    month: "July 23 – August 22",
    span: "Jul – Aug",
    essence: "The will that remains after the performance.",
    element: "fire",
    ...withForms(GLYPH.leo, ANIMAL.leo),
  },
  {
    id: "virgo",
    name: "Virgo",
    month: "August 23 – September 22",
    span: "Aug – Sep",
    essence: "The craft. Make it accurate, then it is sacred.",
    element: "earth",
    ...withForms(GLYPH.virgo, ANIMAL.virgo),
  },
  {
    id: "libra",
    name: "Libra",
    month: "September 23 – October 22",
    span: "Sep – Oct",
    essence: "The in-between. A scale that wants a true weight.",
    element: "air",
    ...withForms(GLYPH.libra, ANIMAL.libra),
  },
  {
    id: "scorpio",
    name: "Scorpio",
    month: "October 23 – November 21",
    span: "Oct – Nov",
    essence: "All-in or out. The hook under the pretty floor.",
    element: "water",
    ...withForms(GLYPH.scorpio, ANIMAL.scorpio),
  },
  {
    id: "sagittarius",
    name: "Sagittarius",
    month: "November 22 – December 21",
    span: "Nov – Dec",
    essence: "The arrow. A life that will not stay small.",
    element: "fire",
    ...withForms(GLYPH.sagittarius, ANIMAL.sagittarius),
  },
  {
    id: "capricorn",
    name: "Capricorn",
    month: "December 22 – January 19",
    span: "Dec – Jan",
    essence: "Time as a mountain. The climb is the point.",
    element: "earth",
    ...withForms(GLYPH.capricorn, ANIMAL.capricorn),
  },
  {
    id: "aquarius",
    name: "Aquarius",
    month: "January 20 – February 18",
    span: "Jan – Feb",
    essence: "Water in the air. A future that will not own you.",
    element: "air",
    ...withForms(GLYPH.aquarius, ANIMAL.aquarius),
  },
  {
    id: "pisces",
    name: "Pisces",
    month: "February 19 – March 20",
    span: "Feb – Mar",
    essence: "Two fish, one cord. The dream that still has a body.",
    element: "water",
    ...withForms(GLYPH.pisces, ANIMAL.pisces),
  },
];

/** Civil-year order for UI (Jan→Dec). Capricorn first — January opens in this sign. */
export const CALENDAR_SIGN_ORDER: SignId[] = [
  "capricorn",
  "aquarius",
  "pisces",
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
];

/** Index into CONSTELLATIONS for each calendar slot. The 3D travel ring stays Aries-first. */
export const CALENDAR_SIGN_INDICES: number[] = CALENDAR_SIGN_ORDER.map((id) =>
  CONSTELLATIONS.findIndex((c) => c.id === id),
);

/** Faint field companions so each sign sits in a real patch of sky. */
export function constellationDust(index: number, count: number): StarPt[] {
  const out: StarPt[] = [];
  for (let i = 0; i < count; i++) {
    const s = Math.sin(index * 12.1 + i * 4.73 + 0.4);
    const c = Math.cos(index * 7.6 + i * 3.11 + 1.2);
    const u = Math.sin(index * 3.9 + i * 8.27);
    const v = Math.cos(index * 5.2 + i * 2.41);
    out.push({
      x: s * 4.7 + v * 0.9,
      y: c * 2.75 + u * 0.72,
      mag: 0.1 + Math.abs(u * c) * 0.16,
    });
  }
  return out;
}

export const ELEMENT_TINT: Record<Element, string> = {
  fire: "#d4b4a4",
  earth: "#c2b49a",
  air: "#d4d6d4",
  water: "#b4c0c8",
};

/** t-distance from one sign to the next. Wider so gather and the plate can land. */
export const SIGN_SPAN = 1.72;
export const RING = 12 * SIGN_SPAN;

export function wrap12(t: number): number {
  return ((t % RING) + RING) % RING;
}

export function signStation(index: number): number {
  const i = ((Math.round(index) % 12) + 12) % 12;
  return i * SIGN_SPAN;
}

export function signedDelta(from: number, to: number) {
  const a = wrap12(from);
  const b = wrap12(to);
  let d = b - a;
  const half = RING / 2;
  if (d > half) d -= RING;
  if (d < -half) d += RING;
  return d;
}

export function nearestSign(t: number): number {
  const w = wrap12(t + SIGN_SPAN * 0.5);
  return Math.floor(w / SIGN_SPAN) % 12;
}

