import { Body, Ecliptic, GeoVector, Illumination, MoonPhase } from "astronomy-engine";
import type { SignId } from "./types";
import { signFromLon, wrap360 } from "./ephemeris";

export type MoonDayBrief = {
  /** Local civil date YYYY-MM-DD */
  dateKey: string;
  phaseName: string;
  /** 0..1 illuminated fraction */
  illumination: number;
  moonSignId: SignId;
  moonSignName: string;
};

/** Civil YYYY-MM-DD in the viewer's local timezone. */
export function localDateKey(when: Date = new Date()): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, "0");
  const d = String(when.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Astronomy-engine MoonPhase is elongation in degrees [0, 360):
 * 0 new → 90 first quarter → 180 full → 270 last quarter.
 */
export function phaseNameFromAngle(deg: number): string {
  const a = wrap360(deg);
  if (a < 22.5 || a >= 337.5) return "New Moon";
  if (a < 67.5) return "Waxing Crescent";
  if (a < 112.5) return "First Quarter";
  if (a < 157.5) return "Waxing Gibbous";
  if (a < 202.5) return "Full Moon";
  if (a < 247.5) return "Waning Gibbous";
  if (a < 292.5) return "Last Quarter";
  return "Waning Crescent";
}

function moonEclipticLon(when: Date): number {
  return wrap360(Ecliptic(GeoVector(Body.Moon, when, true)).elon);
}

/** Honest sky facts for a civil moment — no network. */
export function moonDayBrief(when: Date = new Date()): MoonDayBrief {
  const lon = moonEclipticLon(when);
  const sign = signFromLon(lon);
  const ill = Illumination(Body.Moon, when);
  const phaseAngle = MoonPhase(when);
  return {
    dateKey: localDateKey(when),
    phaseName: phaseNameFromAngle(phaseAngle),
    illumination: Math.min(1, Math.max(0, ill.phase_fraction)),
    moonSignId: sign.id,
    moonSignName: sign.name,
  };
}
