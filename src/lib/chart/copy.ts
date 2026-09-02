import type { GateId, ReadingId } from "./types";

export type GateDef = {
  id: GateId;
  name: string;
  kicker: string;
  headline: string;
  body: string[];
};

export const GATES: GateDef[] = [
  {
    id: "rising",
    name: "Rising",
    kicker: "24° Sagittarius 34′",
    headline: "The face the world gets.",
    body: [
      "Heat, horizon, honesty, a future-tense walk. People meet the archer first.",
      "Most people with this rising look like they are easy to know. They are not. Pluto sits 4°43′ behind the ascendant in the 12th — the life-force that rose just before she did.",
      "Chart ruler is Jupiter, in Virgo in the 9th, in detriment. The path is not lucky wanderer. It is the craft of meaning: study, skill, apprenticeship, a faith that has to be earned with the hands.",
    ],
  },
  {
    id: "sun",
    name: "Sun",
    kicker: "4° Leo 14′ · 8th · domicile",
    headline: "The will is royal. It lives in the vault.",
    body: [
      "Leo Sun is the need to be the authentic center. In the 8th, the center is not a stage. It is a locked room.",
      "She does things because she will not be owned. Because she wants to be the one who can walk into a crisis and still have a self left.",
      "Vertex at 6° Leo sits on this Sun. Fated people arrive through fusion. Whole Sign says 9th: belief. Placidus says 8th: death. Lived: belief that has been through a death.",
    ],
  },
  {
    id: "moon",
    name: "Moon",
    kicker: "27° Scorpio 21′ · 11th · fall",
    headline: "I do not feel halfway. I either bind or I vanish.",
    body: [
      "The most important discomfort in the chart. Ordinary lunar functions do not work in the factory setting. Comfort is a foreign country. Devotion is the native tongue.",
      "This feeling-nature plays out through friends, allies, the future, the scene. Her people are her home. When a group feels fake, she would rather be alone in the underworld than liked in the cafeteria.",
      "Wide applying trine to the Sun. Pride and depth can be one animal. When they aren’t, she performs Leo and feels Scorpio, and nobody in the room can tell which one is driving.",
    ],
  },
];

export type StepDef = {
  n: number;
  title: string;
  body: string;
};

export const DECISION_STEPS: StepDef[] = [
  {
    n: 1,
    title: "Venus drives",
    body: "Something relating happens first. A person, a voice, a “we,” a contract, a betrayal, a yes in someone else’s mouth. She is not a closed system.",
  },
  {
    n: 2,
    title: "The 8th house votes",
    body: "Sun, Mercury, Mars. What does this cost? Who has the power? What dies if I say yes? What in me gets to live? If she ignores this vote, she feels dirty later, even if the thing looked pretty.",
  },
  {
    n: 3,
    title: "Mercury signs",
    body: "If she cannot explain it to herself in clean sentences, it is not ready. This can delay her. It also saves her. The exalted mind is the adult in the room.",
  },
  {
    n: 4,
    title: "The Moon vetoes",
    body: "The Moon in fall will not be talked out of a true no. She can override it for a week. She cannot override it for a year. If a decision violates loyalty or her need to not be naive, it comes back up through the floor.",
  },
  {
    n: 5,
    title: "Saturn asks for a house",
    body: "Is this a structure I can live inside? Not is this exciting. Is this a house. Is this a vow she will not hate in winter.",
  },
  {
    n: 6,
    title: "Jupiter wants meaning",
    body: "Jupiter in detriment tries to make it meaningful too soon. She may dress a wound as a philosophy. Let Virgo-Jupiter be a craft, not a sermon.",
  },
];

export const DECISION_CLOSE =
  "When these six agree, her decisions are almost eerily right. When she skips 2–4 and follows only 1 and 6 — chemistry plus meaning — she gets the Venus-Pluto story: fated, educational, expensive.";

export type ReadingDef = {
  id: ReadingId;
  name: string;
  headline: string;
  body: string[];
};

export const READINGS: ReadingDef[] = [
  {
    id: "love",
    name: "Love",
    headline: "Not built for casual, even when Gemini Venus knows how to sound casual.",
    body: [
      "The descendant is Gemini, so the type is: quick, clever, dual, young-in-the-mouth, a sibling-soul, someone who can talk. Then Pluto opposes that Venus, so the type also is: total, jealous, healing, dangerous, not a game.",
      "The person who lasts can do both — stay interesting, and not flinch when the vault opens.",
      "Saturn in the 7th says the real marriage (legal or not) is a grown-up thing: caretaking, time, the unglamorous weather of two nervous systems. If she only chases Pluto and never lets Saturn in, she gets intensity without a house. If she only lets Saturn in and starves Pluto, she gets a house without a pulse.",
      "Lilith on the descendant: do not marry the person who is ashamed of her intensity. Marry the person who is oriented by it.",
    ],
  },
  {
    id: "work",
    name: "Work",
    headline: "Known for how she handles other people under pressure.",
    body: [
      "Midheaven in Libra: the public story wants harmony, design, law, counsel, the art of the in-between, being the one who can sit between two sides.",
      "Saturn squares it exact: the public story is earned in the 7th. Partnerships, clients, audience, the other chair.",
      "Jupiter ruler in the 9th Virgo: teacher, editor, analyst, itinerant craftsperson of truth, someone whose job is a standard of quality. 8th-house Sun / Mercury / Mars: psychology, research, finance, crisis work, medicine of the hidden, sex / death / power as subject matter, other people’s resources.",
      "She does not thrive in a job that is only performance (pure 10th-house Scorpio south node). She thrives in a job that is real in the body (Taurus node) and true in the vault (8th-house Sun).",
    ],
  },
  {
    id: "wound",
    name: "Wound",
    headline: "Not “sad childhood” as a slogan. A specific geometry.",
    body: [
      "Chiron retrograde in intercepted Capricorn in the 1st: I must already be solid.",
      "Moon in fall: comfort is a foreign country.",
      "Saturn in detriment in the 7th: belonging has a price.",
      "Jupiter in detriment: faith has to be built by hand.",
      "The medicine is not more intensity. She already has more intensity than the room. The medicine is Taurus 4th Node: enough, slow, edible, housed, boring in the holy way. The exalted Mercury can help her get there if she lets it schedule the nervous system instead of only autopsying other people.",
    ],
  },
  {
    id: "becoming",
    name: "Becoming",
    headline: "This chart is not a light Leo. It is not a carefree Sagittarius. It is not cursed.",
    body: [
      "Detriment and fall are how the power is trained, not a verdict. It is not a lone-wolf chart. The engine is Venus. The square to the MC is Saturn in the 7th. She becomes herself with and against other people.",
      "Solitude (12th Pluto) is the well she draws from. It is not the whole country.",
      "When she doesn’t understand a decision, ask: Was Venus driving? Did the 8th house vote? Did Mercury sign? Did the Scorpio Moon get a veto? Did Saturn in the 7th get a structure? Is this south-node proving, or north-node housing?",
      "When she feels too much: that is Pluto on the rising plus Moon in fall. The work is not to become less. The work is to give the weather a house.",
      "When she feels fake: Leo Sun in the 8th is being asked to perform 10th-house Scorpio. Go back to the vault. The real Sun is the self that remains after the fusion.",
    ],
  },
];

export const GATE_BY_ID = Object.fromEntries(GATES.map((g) => [g.id, g])) as Record<
  GateId,
  GateDef
>;
export const READING_BY_ID = Object.fromEntries(READINGS.map((r) => [r.id, r])) as Record<
  ReadingId,
  ReadingDef
>;
