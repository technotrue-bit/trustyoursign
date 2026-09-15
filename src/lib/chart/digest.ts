import type { GateDef, ReadingDef, StepDef } from "./copy";
import { formatLon, signFromLon } from "./ephemeris";
import type { PlanetDef } from "./planets";
import type { Dignity, PlanetId, SignId } from "./types";

export type Person = "you" | "she";

export type Digest = {
  /** Newcomer. What this is doing in a life. No homework required. */
  street: string;
  /** Lived. Weather, not a slogan. */
  lived: string;
  /** The sky. Degree, house, dignity. Bones first. */
  canon: string;
};

type Voice = {
  s: string;
  p: string;
  S: string;
  P: string;
  is: string;
  has: string;
  does: string;
  self: string;
};

function voice(person: Person): Voice {
  return person === "you"
    ? { s: "you", p: "your", S: "You", P: "Your", is: "are", has: "have", does: "do", self: "yourself" }
    : { s: "she", p: "her", S: "She", P: "Her", is: "is", has: "has", does: "does", self: "herself" };
}

function nth(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function housePhrase(p: Pick<PlanetDef, "house" | "wholeSign">): string {
  if (p.house === p.wholeSign) return `the ${nth(p.house)} house`;
  return `the ${nth(p.house)} house (Whole Sign ${nth(p.wholeSign)})`;
}

/** What the planet *does*. Not a character. A job. */
export const JOB: Record<
  PlanetId,
  { street: string; lived: string }
> = {
  sun: {
    street: "the will — the self when nobody is performing",
    lived: "the compass. True, larger, alive — or a stall.",
  },
  moon: {
    street: "the feeling-body — what must be true before kindness to the self is possible",
    lived: "the weather of the life. Safety, hunger, the private yes.",
  },
  mercury: {
    street: "the mind and the mouth — thought, talk, and the decision",
    lived: "the sentence. If it cannot be said cleanly, it is not ready.",
  },
  venus: {
    street: "bond, taste, worth — love, beauty, and what gets kept",
    lived: "the engine of relating. Desire, money-as-love, the keep.",
  },
  mars: {
    street: "heat and action — motion, fight, and the start",
    lived: "the strike. When the idea is live, the body goes.",
  },
  jupiter: {
    street: "faith and growth — how a life opens",
    lived: "the blessing. Meaning, excess, a larger map.",
  },
  saturn: {
    street: "time and the wall — what lasts, what costs, what is a house",
    lived: "the exam. Delay, proof, the adult in the room.",
  },
  uranus: {
    street: "shock and freedom — what will not stay the same",
    lived: "lightning. A sudden cut, a new machine, a refusal to copy.",
  },
  neptune: {
    street: "dream and fog — vision, music, and the leak",
    lived: "the maybe people believe. Holy, or a beautiful lie.",
  },
  pluto: {
    street: "power and the underworld — what transforms or consumes",
    lived: "the vault. Fusion, the thing that cannot stay lukewarm.",
  },
  node: {
    street: "the hunger — where the life is trying to go",
    lived: "north is housing. South is the old craft done in sleep.",
  },
  chiron: {
    street: "the wound that teaches — a limp that becomes medicine",
    lived: "the place that cannot fake being already solid.",
  },
  lilith: {
    street: "the refusal that will not be domesticated",
    lived: "shame’s opposite. Intensity someone is oriented by, or afraid of.",
  },
  asc: {
    street: "the face at the door — how the room meets the body before a word",
    lived: "the body arriving. Not a mask chosen. The greeting.",
  },
  mc: {
    street: "the public roof — the story the world tells",
    lived: "work, reputation, what they put on the door.",
  },
};

/** Climate of a sign. Costume is a lie. Weather is not. */
export const SIGN_CLIMATE: Record<
  SignId,
  { street: string; lived: string; body: string; cloth: string }
> = {
  aries: {
    street: "first heat — a start, a fight worth having",
    lived: "the match. Beginnings. A head that goes through.",
    body: "head, the first strike, a body that starts",
    cloth: "something you can move in now — not a costume of war",
  },
  taurus: {
    street: "weight, enough, slow worth — a body allowed to stay",
    lived: "the floor. Food, land, a Tuesday that still exists.",
    body: "throat, neck, the voice you swallow, the body that wants to stay",
    cloth: "real fabric, texture, weight — boring in the holy way",
  },
  gemini: {
    street: "talk, twins, hands, motion — two channels open",
    lived: "the messenger. Allergic to a dead room. Hands free.",
    body: "hands, lungs, nerves, the twin channels",
    cloth: "twins, not costumes — sleeves that work, a mouth that can move",
  },
  cancer: {
    street: "home, care, belonging — the chest wall",
    lived: "the tide. Need, mother, a house that keeps you.",
    body: "chest, stomach, the caretaking wall",
    cloth: "softness that is a vow, not a slogan — a coat that is actually a parent",
  },
  leo: {
    street: "a true center — pride that wants to be seen as real, not performed",
    lived: "the hearth. Heat. The self that remains after the show.",
    body: "heart, spine, the center of the chest",
    cloth: "one real piece of heat or gold — not a lion costume",
  },
  virgo: {
    street: "craft, edit, the gut — a useful holy thing",
    lived: "the apprenticeship. Fit, mend, a standard of quality.",
    body: "gut, hands, digestion as information",
    cloth: "edited. Fabric that does a job. The sacred ordinary.",
  },
  libra: {
    street: "the other chair — proportion, design, the in-between",
    lived: "counsel. Harmony with a pulse. Not too nice.",
    body: "the in-between of the body — kidneys, the paired life",
    cloth: "proportion with a pulse — design, not decoration",
  },
  scorpio: {
    street: "all or nothing — the vault, fusion, not casual",
    lived: "devotion as a first language. Lukewarm reads as insult.",
    body: "the vault of the body — sex, the underworld, the private heat",
    cloth: "something that will not be domesticated — not a nice-girl costume",
  },
  sagittarius: {
    street: "horizon, meaning, a future-tense walk",
    lived: "the archer. Heat that needs distance. A life that means something.",
    body: "hips, thighs, the long line of a person who can leave",
    cloth: "it can walk. If you cannot leave in it, it is a cage",
  },
  capricorn: {
    street: "bone, time, the adult — a wall you can live in",
    lived: "the load-bearing body. Competence as weather. Rest has to be earned, or stolen.",
    body: "bone, joints, knees, the load-bearing frame",
    cloth: "a wall in the cut — gravity, not costume-adult",
  },
  aquarius: {
    street: "space, principle, the future — not being owned",
    lived: "understood without being handled. Lightning in a system.",
    body: "circulation, the nervous spark, the future in the blood",
    cloth: "original, not a copy — something that looks like the future, not a brand",
  },
  pisces: {
    street: "dream, merge, music — fog that can be holy or a leak",
    lived: "the dissolve. Vision. Feet on a floor that might be water.",
    body: "feet, sleep, the dissolve, the dream-body",
    cloth: "atmosphere — a lining, a scent, something no one votes on",
  },
};

/** Twelve rooms of a life. Sign is climate. House is address. */
export const HOUSE_ROOM: Record<number, { street: string; lived: string }> = {
  1: { street: "the body at the door — how life arrives", lived: "identity, the greeting, the first five seconds" },
  2: { street: "worth, money, what is held", lived: "the movable goods. What will and will not be sold." },
  3: { street: "voice, the near road, siblings, first motion", lived: "the next sentence. Hands. The local word." },
  4: { street: "the floor — home, private weather, what is come back to", lived: "the house actually slept in" },
  5: { street: "making, joy, play, children of the mind", lived: "what is created that is not a job" },
  6: { street: "the daily work of the body — craft, service, the Tuesday", lived: "labor as devotion. The body as a practice." },
  7: { street: "the other chair — partnership, the open enemy, the vow", lived: "the self becomes in company" },
  8: { street: "shared life-force — sex, death, other people’s resources, the vault", lived: "fusion. What dies if yes is said." },
  9: { street: "the far road — belief, teaching, the bigger map", lived: "meaning. Distance. A philosophy that makes feeling make sense." },
  10: { street: "the public roof — work the world can name", lived: "reputation. The story on the door." },
  11: { street: "allies, the scene, the future tribe", lived: "the people building the next thing" },
  12: { street: "the hidden — sleep, undoing, the room behind the door", lived: "the well. Solitude. What does not go on the resume." },
};

export const DIGNITY_STREET: Record<Dignity, string> = {
  domicile: "at home — this job speaks its first language",
  exaltation: "honoured here — unusually good at this climate, sometimes too good",
  detriment: "overtime — the job still works, it spends more to do the same thing",
  fall: "a second country — ordinary comfort did not ship from the factory",
  peregrine: "a guest — no home-field, no exile, improvises",
  angle: "a door of the chart — not a wandering planet, a hinge",
};

const RULER: Record<SignId, PlanetId> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

function jobStreet(id: PlanetId, _person: Person): string {
  return JOB[id]?.street ?? "a job the life keeps doing";
}

export function streetForPlanet(p: Pick<PlanetDef, "id" | "name" | "lon" | "house" | "wholeSign" | "dignity" | "retrograde">, person: Person): string {
  const v = voice(person);
  const sign = signFromLon(p.lon);
  const climate = SIGN_CLIMATE[sign.id];
  const room = HOUSE_ROOM[p.house] ?? HOUSE_ROOM[1]!;
  const job = jobStreet(p.id, person);
  const dig = DIGNITY_STREET[p.dignity];
  const rx = p.retrograde ? " Retrograde: the job is doing a second draft, not performing for the room." : "";
  if (p.id === "asc") {
    return `Rising is ${climate.street}. That is the face the room meets. ${v.S} ${v.does} not have to earn that weather. It arrived with the body.`;
  }
  if (p.id === "mc") {
    return `The midheaven — ${job} — sits in ${sign.name}: ${climate.street}. That is the public roof, not the private Sun.`;
  }
  return `${p.name} is ${job}. It sits in ${sign.name}, in ${housePhrase(p)}. ${sign.name} is ${climate.street}. ${nth(p.house)} house is ${room.street}. Traditional condition: ${p.dignity} — ${dig}.${rx}`;
}

export function livedForPlanet(p: Pick<PlanetDef, "id" | "lon" | "house">, person: Person): string {
  const v = voice(person);
  const sign = signFromLon(p.lon);
  const climate = SIGN_CLIMATE[sign.id];
  const room = HOUSE_ROOM[p.house] ?? HOUSE_ROOM[1]!;
  const job = JOB[p.id]?.lived ?? "a function of the life.";
  return `${v.P} ${p.id === "asc" ? "greeting" : p.id === "mc" ? "roof" : "job"}: ${job} Climate: ${climate.lived} Room: ${room.lived}`.replace(/\.\./g, ".");
}

export function canonForPlanet(p: Pick<PlanetDef, "lon" | "house" | "wholeSign" | "dignity" | "retrograde">): string {
  const sign = signFromLon(p.lon);
  const ws = p.house === p.wholeSign ? "" : ` · Whole Sign ${p.wholeSign}`;
  return `${formatLon(p.lon)} ${sign.name} · house ${p.house}${ws} · ${p.dignity}${p.retrograde ? " · Rx" : ""}`;
}

export function digestPlanet(p: PlanetDef, person: Person): Digest {
  return {
    street: streetForPlanet(p, person),
    lived: livedForPlanet(p, person),
    canon: canonForPlanet(p),
  };
}

function byId(planets: PlanetDef[], id: PlanetId): PlanetDef | undefined {
  return planets.find((p) => p.id === id && p.note !== "not cast");
}

export function digestGates(planets: PlanetDef[], person: Person): GateDef[] {
  const v = voice(person);
  const rising = byId(planets, "asc");
  const sun = byId(planets, "sun");
  const moon = byId(planets, "moon");
  const out: GateDef[] = [];
  if (rising) {
    const sign = signFromLon(rising.lon);
    const rulerId = RULER[sign.id];
    const ruler = rulerId ? byId(planets, rulerId) : undefined;
    const rulerBit = ruler
      ? ` Chart ruler is ${ruler.name} in ${signFromLon(ruler.lon).name}, ${housePhrase(ruler)}.`
      : "";
    out.push({
      id: "rising",
      name: "Rising",
      kicker: formatLon(rising.lon),
      headline: `The face the world gets is ${sign.name}.`,
      street: streetForPlanet(rising, person),
      body: [
        `${sign.name} rising: ${SIGN_CLIMATE[sign.id].lived} ${v.S} walk into a room as that weather.${rulerBit}`,
        `People meet this first. They do not meet the Sun until they stay. Tap a word ${v.s} ${v.does} not know — rising, house, chart ruler — and the vault will open it.`,
      ],
    });
  }
  if (sun) {
    const sign = signFromLon(sun.lon);
    out.push({
      id: "sun",
      name: "Sun",
      kicker: `${formatLon(sun.lon)} · ${nth(sun.house)} · ${sun.dignity}`,
      headline: `The will sits in ${sign.name}, ${housePhrase(sun)}.`,
      street: streetForPlanet(sun, person),
      body: [
        `${SIGN_CLIMATE[sign.id].lived} ${HOUSE_ROOM[sun.house]?.lived ?? ""} Dignity: ${DIGNITY_STREET[sun.dignity]}.`,
        `The Sun is not a horoscope column. It is who ${v.s} ${v.is} when nobody is performing.`,
      ],
    });
  }
  if (moon) {
    const sign = signFromLon(moon.lon);
    out.push({
      id: "moon",
      name: "Moon",
      kicker: `${formatLon(moon.lon)} · ${nth(moon.house)} · ${moon.dignity}`,
      headline: `The feeling-body lives in ${sign.name}.`,
      street: streetForPlanet(moon, person),
      body: [
        `${SIGN_CLIMATE[sign.id].lived} ${HOUSE_ROOM[moon.house]?.lived ?? ""} If the Moon says no, ${v.s} will saboteur later even if ${v.s} signed.`,
        `Comfort is not the same as devotion. Dignity: ${DIGNITY_STREET[moon.dignity]}.`,
      ],
    });
  }
  return out;
}

export function digestSteps(planets: PlanetDef[], person: Person): { steps: StepDef[]; close: string } {
  const v = voice(person);
  const rising = byId(planets, "asc");
  const sun = byId(planets, "sun");
  const moon = byId(planets, "moon");
  const mercury = byId(planets, "mercury");
  const saturn = byId(planets, "saturn");
  const steps: StepDef[] = [
    {
      n: 1,
      title: "The door speaks",
      body: rising
        ? `${signFromLon(rising.lon).name} rising moves first: gather, greet, start. Useful. Fatal if it never becomes a yes.`
        : `The first move is the face. Don’t let it spin in place.`,
    },
    {
      n: 2,
      title: "The Sun asks if it is true",
      body: sun
        ? `Sun in ${signFromLon(sun.lon).name}, ${housePhrase(sun)}: does this make the life larger, or is it a stall?`
        : `The will wants a life that means something.`,
    },
    {
      n: 3,
      title: "The Moon vetoes",
      body: moon
        ? `Moon in ${signFromLon(moon.lon).name}: will ${v.s} still belong to ${v.self}? A true no cannot be talked out of for a year.`
        : `If the feeling-body says no, do not override it for a year.`,
    },
    {
      n: 4,
      title: mercury ? "Mercury signs" : "Say it in a sentence",
      body: mercury
        ? `Mercury in ${signFromLon(mercury.lon).name}: if ${v.s} cannot explain it in clean sentences, it is not ready.`
        : `If it cannot be said cleanly, it is not ready.`,
    },
  ];
  if (saturn) {
    steps.push({
      n: 5,
      title: "Saturn asks for a house",
      body: `Saturn in ${signFromLon(saturn.lon).name}, ${housePhrase(saturn)}: is this a structure ${v.s} can live inside — not only exciting?`,
    });
  }
  const close = `When the door, the will, the feeling-body, and the sentence agree, the decision holds. When ${v.s} skip the Moon or Saturn and follow only heat plus meaning, the life gets educational and expensive.`;
  return { steps, close };
}

export function digestReadings(planets: PlanetDef[], person: Person): ReadingDef[] {
  const v = voice(person);
  const rising = byId(planets, "asc");
  const sun = byId(planets, "sun");
  const moon = byId(planets, "moon");
  const venus = byId(planets, "venus");
  const mars = byId(planets, "mars");
  const mc = byId(planets, "mc");
  const saturn = byId(planets, "saturn");
  const out: ReadingDef[] = [];

  if (venus && rising) {
    const vSign = signFromLon(venus.lon);
    const rSign = signFromLon(rising.lon);
    out.push({
      id: "love",
      name: "Love",
      headline: `${v.S} ${v.does} not do lukewarm, even when the mouth knows how to sound casual.`,
      street: `Venus is how ${v.s} ${person === "you" ? "bond" : "bonds"}. It sits in ${vSign.name}, ${housePhrase(venus)}: ${SIGN_CLIMATE[vSign.id].street}. The other chair is the descendant, opposite ${rSign.name} rising.`,
      body: [
        `Venus in ${vSign.name}: ${SIGN_CLIMATE[vSign.id].lived} In ${housePhrase(venus)}, love shows up as ${HOUSE_ROOM[venus.house]?.street ?? "a room of life"}.`,
        moon
          ? `The Moon in ${signFromLon(moon.lon).name} vetoes. If a bond owns the nervous system, it will not last — even if it is intense.`
          : `If a bond owns the nervous system, it will not last.`,
        `The person who lasts can stay interesting and not flinch when the vault opens. That is not a shopping list. It is the geometry.`,
      ],
    });
  }

  if (mc && sun) {
    const mSign = signFromLon(mc.lon);
    const sSign = signFromLon(sun.lon);
    out.push({
      id: "work",
      name: "Work",
      headline: `Engine plus myth. The roof is ${mSign.name}. The will is ${sSign.name}.`,
      street: `The midheaven is the public story. It sits in ${mSign.name}: ${SIGN_CLIMATE[mSign.id].street}. The Sun (the actual will) lives in ${sSign.name}, ${housePhrase(sun)} — that is who ${v.s} ${v.is} when the door shuts.`,
      body: [
        `${SIGN_CLIMATE[mSign.id].lived} Saturn ${saturn ? `in ${signFromLon(saturn.lon).name}, ${housePhrase(saturn)}, ` : ""}asks whether the work is a house or only a launch.`,
        `A job that is only performance will starve this chart. A job that is real in the body and true in the will will not.`,
      ],
    });
  }

  if (rising && moon && mars) {
    out.push(digestBodyReading(planets, person));
  }
  if (rising && venus) {
    out.push(digestClothesReading(planets, person));
  }

  if (sun && moon && rising) {
    out.push({
      id: "becoming",
      name: "Becoming",
      headline: `This chart is not a costume of ${signFromLon(sun.lon).name}. It is not cursed.`,
      street: `Three names: Sun in ${signFromLon(sun.lon).name} (will), Moon in ${signFromLon(moon.lon).name} (need), ${signFromLon(rising.lon).name} rising (face). They are not the same job. Confusion starts when ${v.s} ask one of them to do all three.`,
      body: [
        `When ${v.s} ${v.does} not understand a decision: was Venus driving? Did the will vote? Did Mercury sign? Did the Moon get a veto? Did Saturn get a house?`,
        `When ${v.s} feel fake: the Sun is being asked to perform the midheaven. Go back to the will. The real Sun is who remains after the fusion.`,
        `Detriment and fall are how the power is trained, not a verdict. This is an attention map, not a cage.`,
      ],
    });
  }

  return out;
}

export function digestBodyReading(planets: PlanetDef[], person: Person): ReadingDef {
  const v = voice(person);
  const rising = byId(planets, "asc")!;
  const moon = byId(planets, "moon");
  const mars = byId(planets, "mars");
  const venus = byId(planets, "venus");
  const rSign = signFromLon(rising.lon);
  const climate = SIGN_CLIMATE[rSign.id];
  const sixth = venus && venus.house === 6 ? venus : planets.find((p) => p.house === 6);
  return {
    id: "body",
    name: "Body",
    headline: `The body is built for ${climate.body}.`,
    street: `Rising is the body at the door. ${rSign.name}: ${climate.body}. That is not a diagnosis. It is an attention map — where heat, rest, and motion actually live.`,
    body: [
      `${rSign.name} rising: ${climate.lived} Clothes, chairs, and days that cage that walk will feel like a lie even if the mirror likes them.`,
      moon
        ? `Moon in ${signFromLon(moon.lon).name}, ${housePhrase(moon)}: ${SIGN_CLIMATE[signFromLon(moon.lon).id].body}. The feeling-body ${moon.dignity === "fall" ? "did not get comfort as a factory setting. Devotion was the first language." : `is ${DIGNITY_STREET[moon.dignity]}.`}`
        : `The Moon is the feeling-body. Protect the conditions it named.`,
      mars
        ? `Mars in ${signFromLon(mars.lon).name}, ${housePhrase(mars)}: how ${v.s} actually act. ${SIGN_CLIMATE[signFromLon(mars.lon).id].lived}`
        : `Mars is the strike. Heat with nowhere to go turns inward.`,
      sixth
        ? `The 6th house is the daily machine of the body. ${sixth.name} lives there: ${SIGN_CLIMATE[signFromLon(sixth.lon).id].street}. Hands, craft, Tuesday. Use them.`
        : `The 6th house is the daily machine. Work the body like a craft, not a slogan.`,
      `This is not medical advice. If the body is speaking in pain, a doctor is the other chair. The sky only names the weather.`,
    ],
  };
}

export function digestClothesReading(planets: PlanetDef[], person: Person): ReadingDef {
  const v = voice(person);
  const rising = byId(planets, "asc")!;
  const venus = byId(planets, "venus");
  const mc = byId(planets, "mc");
  const sun = byId(planets, "sun");
  const rSign = signFromLon(rising.lon);
  const vSign = venus ? signFromLon(venus.lon) : null;
  return {
    id: "clothes",
    name: "Clothes",
    headline: `Clothes are not a hobby. They are how the life starts a sentence.`,
    street: `The room already meets ${v.s} as ${rSign.name} rising: ${SIGN_CLIMATE[rSign.id].cloth}. The outfit cannot invent that weather. It can house it — or fight it.`,
    body: [
      `If the cloth cages the walk, the body will reject it as a lie. ${rSign.name} on the door wants: ${SIGN_CLIMATE[rSign.id].cloth}.`,
      vSign && venus
        ? `Venus in ${vSign.name}, ${housePhrase(venus)}: taste is ${SIGN_CLIMATE[vSign.id].street}. Getting dressed is already relating. ${v.S} dress toward someone, even when ${v.s} ${v.is} alone.`
        : `Venus is taste. Without it tabled, follow the rising.`,
      mc
        ? `The public roof is ${signFromLon(mc.lon).name}: ${SIGN_CLIMATE[signFromLon(mc.lon).id].cloth}. ${v.S} cannot wear a professional self the private bond contradicts.`
        : `The midheaven is the public look. Proportion. A pulse.`,
      sun
        ? `Do not dress the Sun as a stage if it does not live on one. Sun in ${signFromLon(sun.lon).name}, ${housePhrase(sun)}: one real thing, not a costume of the sign.`
        : `One real thing. Not a costume of the sun-sign column.`,
      `A true no in the closet cannot be talked out of for a year. If ${v.s} cannot explain the outfit in clean sentences, it is not ready — same rule as every other decision.`,
    ],
  };
}

export function applyDigestToPlanet(p: PlanetDef, person: Person): PlanetDef {
  const d = digestPlanet(p, person);
  return {
    ...p,
    headline: d.lived,
    why: d.street,
    body: [d.lived, d.canon],
    note: d.canon,
  };
}

export const ENTERTAINMENT_NOTE =
  "Entertainment and an attention map — not medical, legal, or financial advice. Degrees before meaning.";
