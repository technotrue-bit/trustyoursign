import type { Nativity } from "./schema";
import type { TempleSign } from "@/lib/galaxy/temple";
import type { SkyNatal } from "./ephemeris";

type Hit = { score: number; text: string };

function needle(q: string) {
  return ` ${q.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
}

function has(hay: string, word: string) {
  if (!word) return false;
  return hay.includes(` ${word.toLowerCase()} `);
}

/** Quote the book. Never invent. Always returns at least the one-cut. */
export function answerFromBones(n: Nativity, question: string, focus = ""): string {
  const q = needle(`${focus} ${question}`);
  const hits: Hit[] = [];

  for (const p of n.planets) {
    let score = 0;
    if (has(q, p.id) || has(q, p.name)) score += 8;
    if (focus.toLowerCase().includes(p.name.toLowerCase())) score += 10;
    if (has(q, "house") && has(q, String(p.house))) score += 3;
    if (has(q, p.dignity)) score += 2;
    if (score > 0) {
      const body = p.body[0] ?? p.why;
      hits.push({ score, text: `${p.headline}\n\n${body}` });
    }
  }

  for (const c of n.chakras) {
    let score = 0;
    if (has(q, c.id) || has(q, c.name) || has(q, c.sanskrit)) score += 8;
    if (focus.toLowerCase().includes(c.name.toLowerCase())) score += 10;
    if (c.rulers.some((r) => has(q, r))) score += 2;
    if (score > 0) hits.push({ score, text: `${c.headline}\n\n${c.body[0] ?? c.practice}` });
  }

  for (const g of n.gates) {
    let score = 0;
    if (has(q, g.id) || has(q, g.name) || has(q, "gate") && has(q, g.id)) score += 7;
    if (focus.toLowerCase().includes(g.name.toLowerCase())) score += 10;
    if (score > 0) hits.push({ score, text: `${g.headline}\n\n${g.body[0] ?? ""}`.trim() });
  }

  for (const s of n.signs) {
    let score = 0;
    if (has(q, s.id) || has(q, s.name)) score += 6;
    if (score > 0) hits.push({ score, text: `${s.headline}\n\n${s.inChart}` });
  }

  for (const r of n.readings) {
    let score = 0;
    if (has(q, r.id) || has(q, r.name)) score += 7;
    if (score > 0) hits.push({ score, text: `${r.headline}\n\n${r.body[0] ?? ""}`.trim() });
  }

  for (const s of n.steps) {
    let score = 0;
    if (has(q, "step") && has(q, String(s.n))) score += 8;
    if (has(q, s.title.split(" ")[0] ?? "")) score += 2;
    if (score > 0) hits.push({ score, text: `${s.title}. ${s.body}` });
  }

  for (const a of n.aspects) {
    const aName = a.a.toLowerCase();
    const bName = a.b.toLowerCase();
    if (has(q, aName) && has(q, bName)) {
      hits.push({ score: 5, text: a.text });
    }
  }

  if (has(q, "why") && (has(q, "too") || has(q, "much") || has(q, "feel"))) {
    hits.push({ score: 4, text: n.meta.thesis });
  }

  hits.sort((a, b) => b.score - a.score);
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (seen.has(h.text) || h.score < 2) continue;
    seen.add(h.text);
    picked.push(h.text);
    if (picked.length >= 3) break;
  }

  if (picked.length === 0) {
    return `${n.meta.oneCut}\n\nThe bones do not hold that. Bring the correction.`;
  }
  return picked.join("\n\n");
}

const PLANET_WORDS = ["moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "rising", "ascendant", "house", "houses", "longitude", "degree", "aspect", "natal", "time", "birth time", "place"];

/** Sun-sign sketch only. Never quote Saige or Joey as if they were the querent. */
export function answerFromShelf(sign: TempleSign, question: string, dateLabel: string, who: string, heldClock = false): string {
  const q = needle(question);
  const honest = heldClock
    ? `The sun was in ${sign.name} on ${dateLabel}. The clock and the place are held for ${who}. Offer time and place in BirthChat to open a timed natal.`
    : `The sun was in ${sign.name} on ${dateLabel}. This vault does not hold time, place, planets, or houses for ${who}. Yours is a sun-sign shelf until you bring the clock.`;
  const wantsSky = PLANET_WORDS.some((w) => has(q, w));
  if (wantsSky) {
    return heldClock
      ? `${honest}\n\nThe bones do not hold that yet. Open the timed natal from BirthChat.`
      : `${honest}\n\nThe bones do not hold that. Bring the clock and the place.`;
  }
  if (has(q, "chakra") || has(q, sign.chakra)) {
    return `${honest}\n\n${sign.chakraNote}`;
  }
  return `${honest}\n\n${sign.essence}\n\n${sign.lines.join("\n\n")}\n\n${sign.chakraNote}`;
}

export function answerFromSky(natal: SkyNatal, question: string, focus?: string): string {
  const q = needle(question);
  const listed = natal.bodies
    .map((b) => `${b.name}: ${b.note}${b.headline ? ` — ${b.headline}` : ""}`)
    .join("\n");
  const hits = natal.bodies.filter((b) => {
    if (focus && (focus === b.id || focus.toLowerCase() === b.name.toLowerCase())) return true;
    return has(q, b.id) || has(q, b.name.toLowerCase()) || (b.id === "asc" && (has(q, "rising") || has(q, "ascendant")));
  });
  const pick = hits.length ? hits : natal.bodies;
  const lines: string[] = [];
  for (const b of pick) {
    if (b.headline) lines.push(`${b.name}. ${b.note}. ${b.headline}`);
    else lines.push(`${b.name} at ${b.note}.`);
    if (b.why) lines.push(b.why);
    if (b.body.length) lines.push(b.body.slice(0, 3).join("\n\n"));
  }
  if (lines.length) return lines.join("\n\n");
  return `The Big Three as tabled:\n${listed}\n\nThe bones do not hold that.`;
}
