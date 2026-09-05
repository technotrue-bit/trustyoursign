import { CatmullRomCurve3, Color, Vector3 } from "three";
import {
  STATION_N,
  NAVE,
  TEMPLE_SIGNS,
  clamp01,
} from "./temple-data";

export {
  STATION_N,
  NAVE,
  PLATE_WIDE,
  PLATE_ASPECT,
  TEMPLE_SIGNS,
  TEMPLE_CHAKRAS,
  stationT,
  stationFromT,
  clamp01,
  viewAspect,
  heroFrame,
} from "./temple-data";
export type { TemplePalette, TempleSign } from "./temple-data";

const _pts: Vector3[] = [];
for (let i = 0; i < STATION_N; i++) {
  const z = -i * NAVE;
  const x = Math.sin(i * 0.34) * 3.6;
  const y = 1.35 + Math.cos(i * 0.2) * 0.4;
  _pts.push(new Vector3(x, y, z));
}

export const TEMPLE_CURVE = new CatmullRomCurve3(_pts, false, "catmullrom", 0.28);
export const TEMPLE_STATIONS = _pts.map((p) => p.clone());

const _fogA = new Color();
const _fogB = new Color();
const _accA = new Color();
const _accB = new Color();

export function lerpFog(t: number, out: Color) {
  const u = clamp01(t) * (STATION_N - 1);
  const i = Math.floor(u);
  const f = u - i;
  const a = TEMPLE_SIGNS[i] ?? TEMPLE_SIGNS[0]!;
  const b = TEMPLE_SIGNS[Math.min(11, i + 1)] ?? a;
  _fogA.set(a.palette.fog);
  _fogB.set(b.palette.fog);
  return out.copy(_fogA).lerp(_fogB, f);
}

export function lerpAccent(t: number, out: Color) {
  const u = clamp01(t) * (STATION_N - 1);
  const i = Math.floor(u);
  const f = u - i;
  const a = TEMPLE_SIGNS[i] ?? TEMPLE_SIGNS[0]!;
  const b = TEMPLE_SIGNS[Math.min(11, i + 1)] ?? a;
  _accA.set(a.palette.accent);
  _accB.set(b.palette.accent);
  return out.copy(_accA).lerp(_accB, f);
}
