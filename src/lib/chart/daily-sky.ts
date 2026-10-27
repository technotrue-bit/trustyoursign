import { loadAstronomy, signFromLon, wrap360 } from "./ephemeris";
import { localDateKey, phaseNameFromAngle } from "./moon-day";
import { SIGN_CANON, SIGN_IDS, signName } from "./sign-canon";
import type { Element, SignId } from "./types";

/**
 * Today's sky for one sign: the Moon's phase and sign, the Sun's sign, and
 * how the Moon's sign sits against yours. The reading is picked from fixed
 * copy by the date, so it holds all day and turns over at local midnight.
 * Entertainment, not advice — the same law as the rest of the vault.
 */

/** The Moon's sign against yours, by steps around the wheel. */
export type DailyRelation = "home" | "sextile" | "square" | "trine" | "opposite" | "quiet";

export type PhaseMode = "begin" | "build" | "reveal" | "release";

export function moonRelation(yours: SignId, moon: SignId): DailyRelation {
  const a = SIGN_IDS.indexOf(yours);
  const b = SIGN_IDS.indexOf(moon);
  const raw = Math.abs(a - b) % 12;
  const steps = Math.min(raw, 12 - raw);
  if (steps === 0) return "home";
  if (steps === 2) return "sextile";
  if (steps === 3) return "square";
  if (steps === 4) return "trine";
  if (steps === 6) return "opposite";
  return "quiet";
}

export function phaseMode(phaseName: string): PhaseMode {
  if (phaseName === "New Moon") return "begin";
  if (phaseName === "Full Moon") return "reveal";
  if (phaseName.startsWith("Waxing") || phaseName === "First Quarter") return "build";
  return "release";
}

type Reading = { headline: string; body: string };

/**
 * Placeholders: {sign} your sign, {moon} the Moon's sign, {element} the
 * Moon's element as a noun ("fire", "earth", "air", "water").
 */
export const DAILY_COPY: Record<DailyRelation, Reading[]> = {
  home: [
    {
      headline: "The Moon is home with you.",
      body: "The Moon walks {sign} today, your own ground. What you feel is louder than usual and closer to true. Let it be read, not performed.",
    },
    {
      headline: "Your weather, your rules.",
      body: "With the Moon in {sign}, the room tilts your way. Instinct arrives before reason does. Trust the first read and check it once.",
    },
    {
      headline: "A day that knows your name.",
      body: "The Moon in {sign} turns the volume up on the part of you that never explains itself. Say the plain thing. It lands.",
    },
  ],
  trine: [
    {
      headline: "An easy current.",
      body: "The Moon in {moon} shares your {element}. Things that usually take a push take a nudge. Spend the ease on something that matters.",
    },
    {
      headline: "The door is already open.",
      body: "{moon} and {sign} speak the same {element}. The day agrees with you. Agreement is a gift, not a reason to coast.",
    },
    {
      headline: "Flow, not force.",
      body: "With the Moon moving through {moon}, your instincts and the day's mood line up. Follow the thread you already have in hand.",
    },
  ],
  sextile: [
    {
      headline: "A small opening.",
      body: "The Moon in {moon} sits a friendly two signs from {sign}. Nothing will be handed over, but a light ask gets a yes.",
    },
    {
      headline: "Good company in the air.",
      body: "{moon} and {sign} get along without trying. Make the call, send the note, start the small thing. The day helps if you move first.",
    },
    {
      headline: "Say yes to the side door.",
      body: "The Moon in {moon} offers {sign} an angle, not a highway. Take the detour you would usually skip.",
    },
  ],
  square: [
    {
      headline: "Friction with a purpose.",
      body: "The Moon in {moon} pushes against {sign}. Something rubs. The rub shows where the shape is wrong, not that you are.",
    },
    {
      headline: "Hold your ground lightly.",
      body: "{moon} and {sign} want different things today. You do not have to win the argument to keep your footing.",
    },
    {
      headline: "Pressure makes the edge.",
      body: "With the Moon in {moon}, {sign} meets resistance. Use it like a whetstone. Short words, clean decisions.",
    },
  ],
  opposite: [
    {
      headline: "The mirror is out.",
      body: "The Moon sits across the wheel in {moon}. Other people show you yourself today, plainly. Look before you answer.",
    },
    {
      headline: "Across the table.",
      body: "{moon} faces {sign} head on. Someone wants what you have, or has what you want. Name the trade out loud.",
    },
    {
      headline: "Balance is the work.",
      body: "With the Moon opposite in {moon}, {sign} is pulled toward the other side of itself. Meet it halfway. Not further.",
    },
  ],
  quiet: [
    {
      headline: "A background day.",
      body: "The Moon in {moon} passes {sign} without much talk. Quiet is not empty. Tend the small things no one sees.",
    },
    {
      headline: "Adjust the angle.",
      body: "{moon} and {sign} do not share a language today. Small corrections beat big statements. Turn a degree, not the whole wheel.",
    },
    {
      headline: "Room to think.",
      body: "With the Moon in {moon}, the day leaves {sign} alone. Use the space. Finish one thing before you open another.",
    },
  ],
};

const LEAN_INTO: Record<DailyRelation, string[]> = {
  home: ["Your first instinct", "Saying it plainly", "Time alone with it"],
  trine: ["What already works", "Momentum", "Generous plans"],
  sextile: ["A light ask", "A new conversation", "The small start"],
  square: ["Clean decisions", "Fixing the shape", "Short answers"],
  opposite: ["Listening first", "A fair trade", "Honest mirrors"],
  quiet: ["Unseen work", "Finishing", "Rest without guilt"],
};

const GO_EASY: Record<DailyRelation, string[]> = {
  home: ["Taking it all personally", "Overexplaining", "Moods as facts"],
  trine: ["Coasting", "Saying yes to everything", "Skipping the hard part"],
  sextile: ["Waiting to be asked", "Overplanning", "Talking yourself out of it"],
  square: ["Winning the argument", "Pushing harder", "Old grudges"],
  opposite: ["Keeping score", "Giving too much ground", "Assuming you know"],
  quiet: ["Big announcements", "Restlessness", "Starting three things"],
};

const PHASE_LINES: Record<PhaseMode, string[]> = {
  begin: [
    "New Moon. A dark sky is a clean page. Name one thing you are starting.",
    "New Moon. Plant it quietly. Tell no one yet.",
  ],
  build: [
    "The Moon is growing. Add, gather, repeat.",
    "The light is building. Effort now compounds.",
  ],
  reveal: [
    "Full Moon. What was hidden has the lights on. Look at it.",
    "Full Moon. A peak, not a verdict. See it whole.",
  ],
  release: [
    "The Moon is shrinking. Let something go on purpose.",
    "The light is draining. Clear the shelf before the next start.",
  ],
};

const ELEMENT_NOUN: Record<Element, string> = {
  fire: "fire",
  earth: "earth",
  air: "air",
  water: "water",
};

export type DailySkyInput = {
  signId: SignId;
  /** Viewer's local civil date, YYYY-MM-DD. */
  dateKey: string;
  phaseName: string;
  /** Moon phase elongation in degrees, 0 new → 180 full. */
  phaseAngle: number;
  illumination: number;
  moonSignId: SignId;
  sunSignId: SignId;
  nextMoon: { signId: SignId; at: Date } | null;
};

export type DailySky = DailySkyInput & {
  signName: string;
  moonSignName: string;
  sunSignName: string;
  relation: DailyRelation;
  headline: string;
  body: string;
  leanInto: string;
  goEasy: string;
  phaseLine: string;
  nextMoon: { signId: SignId; signName: string; at: Date } | null;
};

/** Whole days since 1970-01-01 for a YYYY-MM-DD key. */
function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** Next day picks the next variant, so two days in the same relation never repeat. */
function pick<T>(list: readonly T[], day: number, salt: number): T {
  return list[(((day + salt) % list.length) + list.length) % list.length]!;
}

export function composeDailySky(input: DailySkyInput): DailySky {
  const relation = moonRelation(input.signId, input.moonSignId);
  const day = dayNumber(input.dateKey);
  const salt = SIGN_IDS.indexOf(input.signId);
  const fill = (text: string) =>
    text
      .replaceAll("{sign}", signName(input.signId))
      .replaceAll("{moon}", signName(input.moonSignId))
      .replaceAll("{element}", ELEMENT_NOUN[SIGN_CANON[input.moonSignId].element]);
  const reading = pick(DAILY_COPY[relation], day, salt);
  return {
    ...input,
    signName: signName(input.signId),
    moonSignName: signName(input.moonSignId),
    sunSignName: signName(input.sunSignId),
    relation,
    headline: fill(reading.headline),
    body: fill(reading.body),
    leanInto: pick(LEAN_INTO[relation], day, salt + 1),
    goEasy: pick(GO_EASY[relation], day, salt + 2),
    phaseLine: pick(PHASE_LINES[phaseMode(input.phaseName)], day, salt),
    nextMoon: input.nextMoon
      ? { ...input.nextMoon, signName: signName(input.nextMoon.signId) }
      : null,
  };
}

/** Real sky for `when`. Lazy-loads astronomy-engine; no network. */
export async function dailySky(signId: SignId, when: Date = new Date()): Promise<DailySky> {
  const { Body, Ecliptic, GeoVector, Illumination, MoonPhase } = await loadAstronomy();
  const lonOf = (body: typeof Body.Moon | typeof Body.Sun, at: Date) =>
    wrap360(Ecliptic(GeoVector(body, at, true)).elon);

  const moonLon = lonOf(Body.Moon, when);
  const moonSign = signFromLon(moonLon);
  const phaseAngle = wrap360(MoonPhase(when));

  // Newton steps on the Moon's longitude to the next sign boundary.
  const boundary = (Math.floor(moonLon / 30) + 1) * 30;
  let at = when.getTime();
  for (let i = 0; i < 4; i++) {
    const t = new Date(at);
    const lon = lonOf(Body.Moon, t);
    const ahead = lonOf(Body.Moon, new Date(at + 3_600_000));
    const perHour = wrap360(ahead - lon) || 0.55;
    const left = wrap360(boundary - lon);
    // A step past the boundary reads as ~360° left; walk back instead.
    const signed = left > 180 ? left - 360 : left;
    at += (signed / perHour) * 3_600_000;
  }
  const nextSignId = SIGN_IDS[(SIGN_IDS.indexOf(moonSign.id) + 1) % 12]!;

  return composeDailySky({
    signId,
    dateKey: localDateKey(when),
    phaseName: phaseNameFromAngle(phaseAngle),
    phaseAngle,
    illumination: Math.min(1, Math.max(0, Illumination(Body.Moon, when).phase_fraction)),
    moonSignId: moonSign.id,
    sunSignId: signFromLon(lonOf(Body.Sun, when)).id,
    nextMoon: at > when.getTime() ? { signId: nextSignId, at: new Date(at) } : null,
  });
}
