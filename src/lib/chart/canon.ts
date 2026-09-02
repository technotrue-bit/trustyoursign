import { formatDegree } from "./geometry";
import type { Nativity } from "./schema";
import { signAtLon } from "./signs";

export function buildCanon(n: Nativity, fieldNotes: string[]): string {
  const parts: string[] = [];
  const M = n.meta;
  const who = n.person === "you" ? "you" : M.name;

  parts.push(`This is ${M.name}’s natal, calculated from the sky, not from memory. Treat the data tables as the bones. Treat the rest as how those bones walk.

Name: ${M.name}
Date: ${M.date}
Clock time: ${M.time}
Place: ${M.place}
Coordinates: ${M.coords}
Zone: ${M.zone}
Julian Day: ${M.julian}
Zodiac: ${M.zodiac}
Houses: ${M.houses}
Node: ${M.node}
Engine: ${M.engine}
${M.sunAltitude}

ONE CUT
${M.oneCut}
${M.thesis}

SHAPE
Fire ${n.elements.fire} · Earth ${n.elements.earth} · Air ${n.elements.air} · Water ${n.elements.water}
Cardinal ${n.modalities.cardinal} · Fixed ${n.modalities.fixed} · Mutable ${n.modalities.mutable}`);

  parts.push("NATAL POSITIONS");
  for (const p of n.planets) {
    const sign = signAtLon(p.lon);
    parts.push(
      `${p.name}: ${formatDegree(p.lon)} ${sign.name}${p.retrograde ? " Rx" : ""} · house ${p.house} · Whole Sign ${p.wholeSign} · ${p.dignity}\n${p.note}\n${p.headline}\n${p.why}\n${p.body.join("\n")}`,
    );
  }

  if (n.extraBones.length) {
    parts.push("ADDITIONAL POINTS");
    parts.push(n.extraBones.map((b) => `${b.name}: ${b.pos} · ${b.house} · ${b.note}`).join("\n"));
  }

  parts.push("HOUSE CUSPS");
  parts.push(n.houses.map((h) => `${h.house}. ${h.label}`).join("\n"));

  parts.push("SIGNS IN THIS CHART");
  for (const s of n.signs) {
    parts.push(
      `${s.name} (${s.element}, ${s.modality}${s.intercepted ? ", intercepted" : ""}): ${s.headline}\n${s.body}\nIn this chart: ${s.inChart}`,
    );
  }

  parts.push("THE WIRES (ASPECTS)");
  for (const a of n.aspects) {
    parts.push(
      `${a.a} ${a.type} ${a.b} · orb ${a.orb.toFixed(2)}°${a.iron ? " · iron" : ""}\n${a.text}`,
    );
  }

  parts.push("CHAKRAS MAPPED TO THIS CHART");
  for (const c of n.chakras) {
    parts.push(
      `${c.name} (${c.sanskrit}) · rulers ${c.rulers.join(", ")}\n${c.headline}\n${c.body.join("\n")}\nPractice: ${c.practice}`,
    );
  }

  parts.push("THE THREE GATES");
  for (const g of n.gates) {
    parts.push(`${g.name} · ${g.kicker}\n${g.headline}\n${g.body.join("\n")}`);
  }

  parts.push("HOW THE CHART DECIDES");
  for (const s of n.steps) {
    parts.push(`${s.n}. ${s.title}\n${s.body}`);
  }
  parts.push(n.decisionClose);

  parts.push("READINGS");
  for (const r of n.readings) {
    parts.push(`${r.name}\n${r.headline}\n${r.body.join("\n")}`);
  }

  if (n.canonExtra) parts.push(n.canonExtra);

  const notes = fieldNotes.map((x) => x.trim()).filter(Boolean);
  if (notes.length > 0) {
    parts.push(
      "FIELD NOTES — additional canon, later than the bones. Do not overwrite date, time, place, or tabulated longitudes unless a note explicitly corrects them.",
    );
    notes.forEach((note, i) => {
      parts.push(`Field note ${i + 1}:\n${note}`);
    });
  }

  parts.push(`Address ${who} in the source’s person (${n.person === "you" ? "second person, you/your" : "she/her"}).`);

  return parts.join("\n\n");
}
