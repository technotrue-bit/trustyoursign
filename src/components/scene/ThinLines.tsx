import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineSegments } from "three";
import { galaxyTravel } from "@/lib/galaxy/travel";

export type Seg = {
  a: [number, number, number];
  b: [number, number, number];
  color: string;
  opacity?: number;
};

export type AspectSeg = {
  a: [number, number, number];
  b: [number, number, number];
  color: string;
  restOpacity: number;
  iron: boolean;
  planetA: string;
  planetB: string;
  phase: number;
};

export type WheelLifeSnapshot = { wake: number; paused: boolean };

const scratch = new Color();

/** One LineSegments + one LineBasicMaterial. Fat Line2 / LineMaterial compile a shader each. */
export function ThinSegments({ segments }: { segments: Seg[] }) {
  const obj = useMemo(() => {
    const geo = new BufferGeometry();
    const mat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    return new LineSegments(geo, mat);
  }, []);

  useLayoutEffect(() => {
    const n = segments.length;
    const pos = new Float32Array(n * 6);
    const col = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const s = segments[i]!;
      const o = i * 6;
      pos[o] = s.a[0];
      pos[o + 1] = s.a[1];
      pos[o + 2] = s.a[2];
      pos[o + 3] = s.b[0];
      pos[o + 4] = s.b[1];
      pos[o + 5] = s.b[2];
      scratch.set(s.color);
      const k = s.opacity ?? 1;
      const r = scratch.r * k;
      const g = scratch.g * k;
      const b = scratch.b * k;
      col[o] = r;
      col[o + 1] = g;
      col[o + 2] = b;
      col[o + 3] = r;
      col[o + 4] = g;
      col[o + 5] = b;
    }
    obj.geometry.setAttribute("position", new BufferAttribute(pos, 3));
    obj.geometry.setAttribute("color", new BufferAttribute(col, 3));
    obj.geometry.computeBoundingSphere();
  }, [obj, segments]);

  useLayoutEffect(
    () => () => {
      obj.geometry.dispose();
      (obj.material as LineBasicMaterial).dispose();
    },
    [obj],
  );

  if (segments.length === 0) return null;
  return <primitive object={obj} frustumCulled={false} />;
}

/**
 * Aspect chords with eased focus opacity + iron shimmer.
 * Geometry rebuilds only when natal aspect endpoints change; colors update per frame.
 */
export function LivingAspectSegments({
  segments,
  focus,
  lifeRef,
}: {
  segments: AspectSeg[];
  focus: string | null;
  lifeRef: MutableRefObject<WheelLifeSnapshot> | null;
}) {
  const obj = useMemo(() => {
    const geo = new BufferGeometry();
    const mat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    return new LineSegments(geo, mat);
  }, []);

  const current = useRef<Float32Array>(new Float32Array(0));
  const baseRgb = useRef<Float32Array>(new Float32Array(0));

  useLayoutEffect(() => {
    const n = segments.length;
    const pos = new Float32Array(n * 6);
    const col = new Float32Array(n * 6);
    const rgb = new Float32Array(n * 3);
    const opac = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = segments[i]!;
      const o = i * 6;
      pos[o] = s.a[0];
      pos[o + 1] = s.a[1];
      pos[o + 2] = s.a[2];
      pos[o + 3] = s.b[0];
      pos[o + 4] = s.b[1];
      pos[o + 5] = s.b[2];
      scratch.set(s.color);
      rgb[i * 3] = scratch.r;
      rgb[i * 3 + 1] = scratch.g;
      rgb[i * 3 + 2] = scratch.b;
      opac[i] = 0;
      col[o] = 0;
      col[o + 1] = 0;
      col[o + 2] = 0;
      col[o + 3] = 0;
      col[o + 4] = 0;
      col[o + 5] = 0;
    }
    current.current = opac;
    baseRgb.current = rgb;
    obj.geometry.setAttribute("position", new BufferAttribute(pos, 3));
    obj.geometry.setAttribute("color", new BufferAttribute(col, 3));
    obj.geometry.computeBoundingSphere();
  }, [obj, segments]);

  useLayoutEffect(
    () => () => {
      obj.geometry.dispose();
      (obj.material as LineBasicMaterial).dispose();
    },
    [obj],
  );

  useFrame((_state, delta) => {
    const n = segments.length;
    if (n === 0) return;
    const attr = obj.geometry.getAttribute("color");
    if (!attr) return;
    const col = attr.array as Float32Array;
    const opac = current.current;
    const rgb = baseRgb.current;
    if (opac.length !== n || rgb.length !== n * 3) return;

    const d = Math.min(delta, 0.1);
    const k = 1 - Math.exp(-d * 9);
    const life = lifeRef?.current;
    const wake = life?.wake ?? 1;
    const paused = life?.paused ?? false;
    const t = galaxyTravel.shaderTime;
    const wakeMul = Math.min(1, Math.max(0, wake));

    for (let i = 0; i < n; i++) {
      const s = segments[i]!;
      const lit = focus === s.planetA || focus === s.planetB;
      const dim = Boolean(focus) && !lit;
      let target = dim ? 0.04 : lit ? 0.85 : s.restOpacity;
      target *= 0.15 + wakeMul * 0.85;

      if (!paused && (s.iron || lit)) {
        const amp = lit ? 0.1 : s.iron ? 0.055 : 0;
        target *= 1 + Math.sin(t * (lit ? 1.35 : 0.85) + s.phase) * amp;
      }

      opac[i] += (target - opac[i]) * k;
      const o = i * 6;
      const r = rgb[i * 3]! * opac[i];
      const g = rgb[i * 3 + 1]! * opac[i];
      const b = rgb[i * 3 + 2]! * opac[i];
      col[o] = r;
      col[o + 1] = g;
      col[o + 2] = b;
      col[o + 3] = r;
      col[o + 4] = g;
      col[o + 5] = b;
    }
    attr.needsUpdate = true;
  });

  if (segments.length === 0) return null;
  return <primitive object={obj} frustumCulled={false} />;
}

export function ThinLoop({
  points,
  color,
  opacity = 1,
}: {
  points: [number, number, number][];
  color: string;
  opacity?: number;
}) {
  const segments = useMemo(() => {
    const segs: Seg[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (!a || !b) continue;
      segs.push({ a, b, color, opacity });
    }
    return segs;
  }, [points, color, opacity]);
  return <ThinSegments segments={segments} />;
}

export function dashBetween(
  a: [number, number, number],
  b: [number, number, number],
  color: string,
  opacity: number,
  dash = 0.08,
  gap = 0.06,
): Seg[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return [];
  const ux = dx / len;
  const uy = dy / len;
  const uz = dz / len;
  const out: Seg[] = [];
  let t = 0;
  while (t < len) {
    const t1 = Math.min(len, t + dash);
    out.push({
      a: [a[0] + ux * t, a[1] + uy * t, a[2] + uz * t],
      b: [a[0] + ux * t1, a[1] + uy * t1, a[2] + uz * t1],
      color,
      opacity,
    });
    t = t1 + gap;
  }
  return out;
}
