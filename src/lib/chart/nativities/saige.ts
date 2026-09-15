import { ASPECTS } from "../aspects";
import { CHAKRA_BY_ID, CHAKRAS } from "../chakras";
import {
  DECISION_CLOSE,
  DECISION_STEPS,
  GATE_BY_ID,
  GATES,
  READING_BY_ID,
  READINGS,
} from "../copy";
import { SAIGE_ANGLES } from "../geometry";
import { ELEMENTS, HOUSE_CUSPS, META, MODALITIES } from "../houses";
import { PLANET_BY_ID, PLANETS } from "../planets";
import type { Nativity } from "../schema";
import { SIGNS } from "../signs";

export const SAIGE: Nativity = {
  id: "saige",
  person: "she",
  meta: META,
  angles: SAIGE_ANGLES,
  planets: PLANETS,
  planetById: PLANET_BY_ID,
  houses: HOUSE_CUSPS,
  elements: ELEMENTS,
  modalities: MODALITIES,
  signs: SIGNS,
  aspects: ASPECTS,
  chakras: CHAKRAS,
  chakraById: CHAKRA_BY_ID,
  gates: GATES,
  gateById: GATE_BY_ID,
  steps: DECISION_STEPS,
  decisionClose: DECISION_CLOSE,
  readings: READINGS,
  readingById: READING_BY_ID,
  suggested: [
    "Was Venus driving?",
    "Did the 8th house vote?",
    "Did Mercury sign?",
    "Did the Scorpio Moon get a veto?",
    "Did Saturn in the 7th get a structure?",
    "Is this south-node proving, or north-node housing?",
    "Why does she feel too much?",
    "What is the wound under “I’m too much”?",
    "How does she choose in love?",
    "What work does this chart actually want?",
  ],
  alwaysLabel: ["sun", "moon", "venus", "pluto", "asc"],
  extraBones: [],
  canonExtra: "",
  machineTitle: "How she decides.",
  readingsTitle: "Love, work, body, clothes, wound, becoming.",
};
