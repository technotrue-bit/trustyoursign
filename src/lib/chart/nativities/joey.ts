import { CHAKRAS } from "../chakras";
import type { AspectDef } from "../aspects";
import type { ChakraDef } from "../chakras";
import type { GateDef, ReadingDef, StepDef } from "../copy";
import { JOEY_ANGLES } from "../geometry";
import type { HouseCusp } from "../houses";
import { PLANET_LOOK, type PlanetDef } from "../planets";
import type { Nativity } from "../schema";
import { SIGNS, type SignDef } from "../signs";
import type { PlanetId } from "../types";

const ARI = 0;
const TAU = 30;
const GEM = 60;
const CAN = 90;
const LEO = 120;
const VIR = 150;
const LIB = 180;
const SCO = 210;
const SAG = 240;
const CAP = 270;
const AQU = 300;
const PIS = 330;

function lon(base: number, d: number, m: number): number {
  return base + d + m / 60;
}

function p(
  id: PlanetId,
  fields: Omit<PlanetDef, "id" | "color" | "glow" | "size" | "radius" | "glyph" | "name"> & {
    name: string;
    glyph: string;
  },
): PlanetDef {
  return { id, ...PLANET_LOOK[id], ...fields };
}

const PLANETS: PlanetDef[] = [
  p("asc", {
    name: "Ascendant",
    glyph: "ASC",
    lon: lon(GEM, 2, 14),
    house: 1,
    wholeSign: 1,
    retrograde: false,
    dignity: "angle",
    headline: "The messenger. People meet the talk long before they meet the pilgrim.",
    why: "You do not find yourself alone. You find yourself in conversation, in a counterpart, in an audience.",
    body: [
      "Gemini rising at 2° is early, so the sign is undiluted: fast intake, two channels open, hands and mouth busy, allergic to a dead room.",
      "Neptune is trine this Ascendant at 0.3° — almost exact. The messenger isn’t dry. People project onto you. You can seem mythic, slightly ungraspable, kinder or stranger than you feel on the inside. The cost: you can disappear into other people’s version of you.",
      "Chart ruler is Mercury, sitting on the Descendant. Identity is relational. When you don’t have a worthy other, the Gemini mask starts spinning in place — more tabs, more ideas, more motion, less you.",
    ],
    note: "2° Gemini 14′ · chart face · ruler Mercury on the DSC",
  }),
  p("sun", {
    name: "Sun",
    glyph: "Sun",
    lon: lon(SAG, 21, 25),
    house: 7,
    wholeSign: 7,
    retrograde: false,
    dignity: "domicile",
    headline: "The will is a compass. It lives in the other.",
    why: "Is this true, is this bigger, is this alive, or is this a stall?",
    body: [
      "The Sun is in domicile. This is a strong Sun. Underneath the options, there is a compass. Sagittarius cannot bear a small meaning. You will outgrow rooms, cities, jobs, and even selves that were honest last year. That is not flakiness. That is the Sun doing its job.",
      "It sits in the 7th house. You become most yourself in the field between you and someone. A life with no witness will depress this Sun even if the Aquarius Moon likes the quiet.",
      "Sun conjunct Black Moon Lilith, 0.03°. Exact to the minute. Lilith is the unedited appetite — the part that will not be made polite. Shame, when it shows up, will attach here. The work is not to shrink it. The work is to aim it.",
      "Sabian for 22° Sagittarius: “A Chinese laundry.” Purification as daily labor. Your solar job is not to be a guru on a hill. It is to keep cleaning the meaning until it’s wearable.",
    ],
    note: "21° Sagittarius 25′ · 7th · domicile · partile Lilith",
  }),
  p("moon", {
    name: "Moon",
    glyph: "Moon",
    lon: lon(AQU, 26, 20),
    house: 9,
    wholeSign: 9,
    retrograde: false,
    dignity: "peregrine",
    headline: "A dry Moon. Understood, not handled.",
    why: "You will starve in a clingy bond, and starve equally in a life with no people-of-the-mind.",
    body: [
      "Aquarius is a dry Moon. It does not want to be merged with. It wants to be understood without being handled. You feel first as a thought. “I’m fine” can be true in your head and false in your body for a long time.",
      "When you finally feel it, it arrives as principle: this isn’t fair, this is fake, I have to get out, we should build something be
... 