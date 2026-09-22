/** Chart angles — tropical longitudes. Geometry helpers only; natal angles live under nativities/. */
export type Angles = { asc: number; ic: number; dsc: number; mc: number };

export function wrap360(x: number): number {
  return ((x % 360) + 360) % 360;
}

export function sep(from: number, to: number): number {
  return wrap360(to - from);
}

type Quad = { lon0: number; lon1: number; a0: number; a1: number };

function quads(a: Angles): Quad[] {
  return [
    { lon0: a.asc, lon1: a.ic, a0: 180, a1: 270 },
    { lon0: a.ic, lon1: a.dsc, a0: 270, a1: 360 },
    { lon0: a.dsc, lon1: a.mc, a0: 0, a1: 90 },
    { lon0: a.mc, lon1: a.asc, a0: 90, a1: 180 },
  ];
}

/** Ecliptic longitude → screen degrees (0° = +X / DSC). */
export function lonToScreenDeg(lon: number, angles: Angles): number {
  const L = wrap360(lon);
  for (const q of quads(angles)) {
    const span = sep(q.lon0, q.lon1);
    const d = sep(q.lon0, L);
    if (d <= span + 1e-4) {
      const t = span === 0 ? 0 : d / span;
      return q.a0 + t * (q.a1 - q.a0);
    }
  }
  return 180;
}

/** Horizontal wheel on XZ; +Y up. Returns [x, z]. */
export function lonToXZ(lon: number, radius: number, angles: Angles): [number, number] {
  const a = (lonToScreenDeg(lon, angles) * Math.PI) / 180;
  return [Math.cos(a) * radius, -Math.sin(a) * radius];
}

export function formatDegree(lon: number): string {
  const L = wrap360(lon);
  const signI = Math.floor(L / 30);
  const within = L - signI * 30;
  const deg = Math.floor(within);
  const minutes = Math.round((within - deg) * 60);
  const m = minutes === 60 ? 0 : minutes;
  const d = minutes === 60 ? deg + 1 : deg;
  return `${d}° ${String(m).padStart(2, "0")}′`;
}
