import { computeNatalCast, localToUtc } from "../src/lib/chart/ephemeris.ts";
import { buildVisitorNativity } from "../src/lib/chart/visitor-nativity.ts";
import { answerFromBones } from "../src/lib/chart/bones-ask.ts";
import { JOEY } from "../src/lib/chart/nativities/joey.ts";
import { SAIGE } from "../src/lib/chart/nativities/saige.ts";

const q = "what about the music choices I choose, how does that work with my sign?";

const PLACE = {
  name: "Port Huron, Michigan, United States",
  lat: 42.97,
  lon: -82.42,
  timeZone: "America/Detroit",
};
const utc = localToUtc(2004, 7, 26, 18, 21, PLACE.timeZone);
const visitor = buildVisitorNativity(computeNatalCast(utc, PLACE), {
  label: "Visitor natal",
  when: "26 Jul 2004 · 6:21 pm",
  dateLabel: "26 Jul 2004",
  timeLabel: "6:21 pm",
});

process.stdout.write("VISITOR ASK\n");
process.stdout.write(answerFromBones(visitor, q) + "\n");
process.stdout.write("\n--- JOEY ASK ---\n");
process.stdout.write(answerFromBones(JOEY, q) + "\n");
process.stdout.write("\n--- SAIGE ASK ---\n");
process.stdout.write(answerFromBones(SAIGE, q) + "\n");
process.stdout.write("\n--- JOEY ASK if they said venus ---\n");
process.stdout.write(answerFromBones(JOEY, "how does venus choose music") + "\n");
