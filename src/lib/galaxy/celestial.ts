import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  LinearFilter,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { TEMPLE_CURVE } from "./temple";
import { isSmallGpu } from "@/lib/gpu";

const SMALL = typeof window !== "undefined" && isSmallGpu();
const BULGE_N = SMALL ? 900 : 1600;
const ARM_N = SMALL ? 4200 : 8000;
const FIELD_N = SMALL ? 1400 : 2400;
const CLEAR = 50;
const CLEAR2 = CLEAR * CLEAR;

const GALAXY_POS = new Vector3(0, 40, -180);
const RX = -0.45;
const COS = Math.cos(RX);
const SIN = Math.sin(RX);

const PATH: Vector3[] = [];
for (let i = 0; i <= 64; i++) PATH.push(TEMPLE_CURVE.getPoint(i / 64));

function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function nearPath(x: number, y: number, z: number) {
  for (let i = 0; i < PATH.length; i++) {
    const p = PATH[i]!;
    const dx = x - p.x;
    const dy = y - p.y;
    const dz = z - p.z;
    if (dx * dx + dy * dy + dz * dz < CLEAR2) return true;
  }
  return false;
}

/** Local galaxy point → world, with the group transform. */
function toWorld(lx: number, ly: number, lz: number, out: Vector3) {
  const y = ly * COS - lz * SIN;
  const z = ly * SIN + lz * COS;
  out.set(GALAXY_POS.x + lx, GALAXY_POS.y + y, GALAXY_POS.z + z);
}

const _w = new Vector3();

function acceptLocal(lx: number, ly: number, lz: number) {
  toWorld(lx, ly, lz, _w);
  return !nearPath(_w.x, _w.y, _w.z);
}

export function makeStarSprite() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255, 248, 236, 1)");
  g.addColorStop(0.16, "rgba(255, 228, 186, 0.62)");
  g.addColorStop(0.4, "rgba(232, 210, 170, 0.18)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function makeHazeSprite() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255, 236, 210, 0.55)");
  g.addColorStop(0.22, "rgba(240, 214, 170, 0.22)");
  g.addColorStop(0.55, "rgba(200, 176, 140, 0.06)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const VERT = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
attribute vec3 color;
attribute float aSize;
attribute float aTwinkle;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = color;
  float tw = aTwinkle > 0.01 ? 0.82 + 0.18 * sin(uTime * 0.4 + aTwinkle) : 1.0;
  vAlpha = uOpacity * tw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float att = 420.0 / max(48.0, -mv.z);
  float px = aSize * att * tw;
  float cap = aSize > 6.0 ? 11.0 : 7.5;
  gl_PointSize = clamp(px, 2.2, cap);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 s = texture2D(uMap, gl_PointCoord);
  float a = s.a * vAlpha;
  if (a < 0.016) discard;
  gl_FragColor = vec4(vColor * s.rgb * a, a);
}
`;

export function makeGalaxyMaterial(map: CanvasTexture, opacity: number) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uMap: { value: map },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    fog: false,
    toneMapped: false,
    vertexColors: true,
  });
}

function fill(
  count: number,
  place: (i: number) => { x: number; y: number; z: number; ok: boolean },
  colorAt: (i: number, o: number, col: Float32Array) => void,
  size: number | ((i: number) => number),
  twinkle = false,
) {
  const geo = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  const tw = new Float32Array(count);
  let w = 0;
  for (let i = 0; i < count * 6 && w < count; i++) {
    const p = place(i);
    if (!p.ok) continue;
    pos[w * 3] = p.x;
    pos[w * 3 + 1] = p.y;
    pos[w * 3 + 2] = p.z;
    colorAt(w, w * 3, col);
    sz[w] = typeof size === "number" ? size : size(w);
    tw[w] = twinkle ? hash(w, 41) * 6.28 : 0;
    w++;
  }
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("color", new BufferAttribute(col, 3));
  geo.setAttribute("aSize", new BufferAttribute(sz, 1));
  geo.setAttribute("aTwinkle", new BufferAttribute(tw, 1));
  geo.setDrawRange(0, w);
  return geo;
}

export function buildGalaxy() {
  const bulge = fill(
    BULGE_N,
    (i) => {
      const a = hash(i, 1) * Math.PI * 2;
      const r = Math.pow(hash(i, 2), 0.55) * 14.5;
      const z = (hash(i, 3) - 0.5) * 3.2 * (1 - r / 15);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      return { x, y, z, ok: acceptLocal(x, y, z) };
    },
    (_i, o, col) => {
      col[o] = 1;
      col[o + 1] = 0.85;
      col[o + 2] = 0.627;
    },
    8,
  );

  const arms = fill(
    ARM_N,
    (i) => {
      const arm = i % 4;
      const u = hash(i, 10);
      const theta = u * 3.35;
      const a = 3.2;
      const b = 0.31;
      const r = Math.min(100, a * Math.exp(b * theta));
      const spread = 6 * (0.35 + r / 140);
      const jx = (hash(i, 11) - 0.5) * spread;
      const jy = (hash(i, 12) - 0.5) * spread;
      const ang = theta + arm * (Math.PI * 0.5);
      const x = Math.cos(ang) * r + jx;
      const y = Math.sin(ang) * r + jy;
      const z = (hash(i, 13) - 0.5) * 2.4 * (0.3 + r / 100);
      return { x, y, z, ok: acceptLocal(x, y, z) };
    },
    (i, o, col) => {
      const mix = hash(i, 14);
      // #c9d4ff and #f0e6c8
      col[o] = 0.788 + (0.941 - 0.788) * mix;
      col[o + 1] = 0.831 + (0.902 - 0.831) * mix;
      col[o + 2] = 1.0 + (0.784 - 1.0) * mix;
    },
    3.5,
  );

  const field = fill(
    FIELD_N,
    (i) => {
      const u = hash(i, 20);
      const v = hash(i, 21);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 200;
      const x = GALAXY_POS.x + r * Math.sin(phi) * Math.cos(theta);
      const y = GALAXY_POS.y + r * Math.sin(phi) * Math.sin(theta);
      const z = GALAXY_POS.z + r * Math.cos(phi);
      return { x, y, z, ok: !nearPath(x, y, z) };
    },
    (i, o, col) => {
      const gold = hash(i, 22) < 0.16;
      if (gold) {
        col[o] = 0.96;
        col[o + 1] = 0.86;
        col[o + 2] = 0.66;
      } else {
        const w = 0.82 + hash(i, 23) * 0.12;
        col[o] = w * 0.92;
        col[o + 1] = w * 0.95;
        col[o + 2] = w;
      }
    },
    2.2,
    true,
  );

  return { bulge, arms, field };
}

export const GALAXY_ORIGIN = GALAXY_POS;
export const GALAXY_TILT = RX;
