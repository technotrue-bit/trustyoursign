import { computeNatalCast, localToUtc } from "../src/lib/chart/ephemeris.ts";
import { buildVisitorNativity } from "../src/lib/chart/visitor-nativity.ts";
import { digestPlanet } from "../src/lib/chart/digest.ts";
import type { PlanetDef } from "../src/lib/chart/planets.ts";

const PLACE = {
  name: "Port Huron, Michigan, United States",
  lat: 42.97,
  lon: -82.42,
  timeZone: "America/Detroit",
};
const utc = localToUtc(2004, 7, 26, 18, 21, PLACE.timeZone);
const cast = await computeNatalCast(utc, PLACE);
const nat = buildVisitorNativity(cast, {
  label: "Visitor natal",
  when: "26 Jul 2004 · 6:21 pm",
  dateLabel: "26 Jul 2004",
  timeLabel: "6:21 pm",
});

function block(title: string, p: PlanetDef) {
  const d = digestPlanet(p, "you");
  process.stdout.write(`\n=== ${title} ===\n`);
  process.stdout.write(`IN PLAIN  ${d.street}\n`);
  process.stdout.write(`LIVED     ${d.lived}\n`);
  process.stdout.write(`CANON     ${d.canon}\n`);
}

process.stdout.write(`ONE CUT\n${nat.meta.oneCut}\n`);
process.stdout.write(`\nGATES (${nat.gates.length})\n`);
for (const g of nat.gates) {
  process.stdout.write(`\n-- ${g.name} · ${g.kicker}\nheadline: ${g.headline}\nIN PLAIN: ${g.street}\n`);
}

block("SUN", nat.planetById.sun!);
block("MOON", nat.planetById.moon!);
block("RISING", nat.planetById.asc!);
block("VENUS", nat.planetById.venus!);

process.stdout.write(`\nREADINGS (${nat.readings.map((r) => r.id).join(", ")})\n`);
for (const r of nat.readings) {
  process.stdout.write(`\n-- ${r.name}\nheadline: ${r.headline}\nIN PLAIN: ${r.street}\nbody[0]:  ${r.body[0]}\n`);
}
