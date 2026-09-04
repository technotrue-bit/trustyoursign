import type { Nativity } from "./schema";
import type { SkyNatal } from "./ephemeris";
import type { SignId } from "./types";

export const FORGE_PROSE_KEYS = ["sky", "body", "gates", "machine", "readings", "bones"] as const;
export type ForgeProseKey = (typeof FORGE_PROSE_KEYS)[number];

export type ForgeStatus = "pending" | "running" | "partial" | "ready" | "abandoned" | "failed";

export type ForgeBirth = {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  place: string | null;
  signId: SignId;
  label?: string;
  tone?: "vault" | "warm";
};

export type ForgeProseChunks = Partial<Record<ForgeProseKey, string>>;

export function birthFingerprint(b: ForgeBirth): string {
  const h = b.hour == null ? "x" : String(b.hour);
  const m = b.minute == null ? "x" : String(b.minute);
  const place = (b.place ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${b.signId}|${b.year}-${b.month}-${b.day}|${h}:${m}|${place}`;
}

export function mergeProseChunks(
  existing: ForgeProseChunks,
  incoming: ForgeProseChunks,
): ForgeProseChunks {
  const out: ForgeProseChunks = { ...existing };
  for (const key of FORGE_PROSE_KEYS) {
    const next = incoming[key];
    if (next == null || next === "") continue;
    if (out[key]) continue; // never overwrite completed chunks
    out[key] = next;
  }
  return out;
}

export function missingProseKeys(chunks: ForgeProseChunks): ForgeProseKey[] {
  return FORGE_PROSE_KEYS.filter((k) => !chunks[k]);
}

export function castReady(castJson: string | null | undefined, nativityJson: string | null | undefined): boolean {
  return Boolean(castJson && nativityJson);
}

export function forgeIsReady(
  castJson: string | null | undefined,
  nativityJson: string | null | undefined,
  chunks: ForgeProseChunks,
  tablesOnly = false,
): boolean {
  if (!castReady(castJson, nativityJson)) return false;
  if (tablesOnly) return true;
  return missingProseKeys(chunks).length === 0;
}

export function parseChunks(raw: string | null | undefined): ForgeProseChunks {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: ForgeProseChunks = {};
    for (const key of FORGE_PROSE_KEYS) {
      const v = o[key];
      if (typeof v === "string" && v.trim()) out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export type ForgeJobView = {
  id: string;
  status: ForgeStatus;
  fingerprint: string;
  signId: SignId;
  birth: ForgeBirth;
  hasCast: boolean;
  chunks: ForgeProseChunks;
  missing: ForgeProseKey[];
  error: string | null;
  sky: SkyNatal | null;
  nativity: Nativity | null;
  proseError?: string | null;
};

export function applyProseToNativity(nat: Nativity, chunks: ForgeProseChunks): Nativity {
  const next: Nativity = {
    ...nat,
    meta: { ...nat.meta },
    chakras: [...nat.chakras],
    gates: [...nat.gates],
    readings: [...nat.readings],
  };
  if (chunks.sky) {
    next.meta = {
      ...next.meta,
      thesis: chunks.sky.slice(0, 400),
      oneCut: next.meta.oneCut || chunks.sky.slice(0, 120),
    };
  }
  if (chunks.readings) {
    const paras = chunks.readings
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paras.length) {
      next.readings = [
        {
          id: "becoming",
          name: "Cut from your sky",
          headline: "Forged from the table.",
          body: paras,
        },
      ];
      next.readingById = { ...nat.readingById, becoming: next.readings[0]! };
    }
  }
  if (chunks.body && next.chakras[0]) {
    const c0 = next.chakras[0]!;
    next.chakras = [{ ...c0, practice: chunks.body.slice(0, 280) }, ...next.chakras.slice(1)];
  }
  if (chunks.gates && next.gates[0]) {
    const g0 = next.gates[0]!;
    next.gates = [
      { ...g0, body: chunks.gates.split(/\n\n+/).filter(Boolean).slice(0, 4) },
      ...next.gates.slice(1),
    ];
  }
  if (chunks.machine) {
    next.decisionClose = chunks.machine.slice(0, 500);
  }
  if (chunks.bones) {
    next.meta = {
      ...next.meta,
      thesis: `${next.meta.thesis}\n\n${chunks.bones}`.slice(0, 900),
    };
  }
  return next;
}
