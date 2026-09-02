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
    headline: 
... 