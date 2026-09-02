import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from "three";
import type { ChakraId, SignId } from "@/lib/chart/types";
import { isSmallGpu } from "@/lib/gpu";
import { sampleVolumeAlpha, volumeChest } from "./signVolume";

const SMALL = typeof window !== "undefined" && isSmallGpu();
export const DISK_N = SMALL ? 2200 : 4800;

const G = 0.55;
const EPS2 = 0.045;
const DAMP_XZ = 0.992;
const DAMP_Y = 0.985;

export const DISK_CHAKRAS: { id: ChakraId; y: number; mass: number; color: string }[] = [
  { id: "root", y: -0.92, mass: 1.15, color: "#ff2a2a" },
  { id: "sacral", y: -0.62, mass: 1.0, color: "#ff7a1a" },
  { id: "solar", y: -0.32, mass: 1.05, color: "#ffd21a" },
  { id: "heart", y: 0.02, mass: 1.35, color: "#2aff6a" },
  { id: "throat", y: 0.34, mass: 1.0, color: "#2ad0ff" },
  { id: "brow", y: 0.62, mass: 1.2, color: "#4a5bff" },
  { id: "crown", y: 0.9, mass: 1.55, color: "#f0e8ff" },
];

type Preset = {
  inside: string;
  outside: string;
  core: number;
  spin: number;
  arms: number;
  tight: number;
  rand: number;
  r: number;
  th: number;
  w: number[];
};

const PRESET: Record<SignId, Preset> = {
  aries: { inside: "#ff6a1a", outside: "#3a1a6a", core: 2.4, spin: 1.35, arms: 2, tight: 0.85, rand: 0.22, r: 1.35, th: 0.18, w: [1.1, 1.4, 1.6, 0.8, 0.7, 0.9, 0.8] },
  taurus: { inside: "#e8c36a", outside: "#2a4a2a", core: 2.8, spin: 0.72, arms: 3, tight: 1.15, rand: 0.14, r: 1.28, th: 0.16, w: [1.6, 1.3, 0.9, 1.2, 0.7, 0.8, 0.7] },
  gemini: { inside: "#f2e7a0", outside: "#3a5a8a", core: 1.7, spin: 1.85, arms: 4, tight: 0.55, rand: 0.32, r: 1.42, th: 0.22, w: [0.7, 0.8, 1.0, 0.9, 1.7, 1.4, 0.9] },
  cancer: { inside: "#f0d8c8", outside: "#1a2a4a", core: 2.2, spin: 0.95, arms: 2, tight: 1.05, rand: 0.18, r: 1.3, th: 0.2, w: [1.0, 1.1, 0.8, 1.8, 0.8, 1.1, 1.0] },
  leo: { inside: "#ffb01a", outside: "#5a1a1a", core: 3.1, spin: 1.1, arms: 3, tight: 0.7, rand: 0.2, r: 1.48, th: 0.19, w: [0.9, 1.0, 1.7, 1.3, 1.0, 0.9, 1.4] },
  virgo: { inside: "#d8e0c0", outside: "#2a3a2a", core: 2.0, spin: 1.25, arms: 5, tight: 1.25, rand: 0.12, r: 1.22, th: 0.14, w: [1.0, 0.8, 1.1, 0.9, 1.2, 1.6, 0.8] },
  libra: { inside: "#f0c8d8", outside: "#3a2a4a", core: 2.1, spin: 1.05, arms: 2, tight: 0.9, rand: 0.16, r: 1.36, th: 0.17, w: [0.8, 1.2, 0.9, 1.6, 1.3, 1.0, 0.9] },
  scorpio: { inside: "#ff3a4a", outside: "#0a0612", core: 2.7, spin: 1.55, arms: 2, tight: 1.35, rand: 0.19, r: 1.26, th: 0.21, w: [1.4, 1.8, 1.1, 1.2, 0.7, 1.3, 0.8] },
  sagittarius: { inside: "#ff9a3a", outside: "#1a2040", core: 2.0, spin: 1.7, arms: 3, tight: 0.5, rand: 0.28, r: 1.55, th: 0.24, w: [0.8, 0.9, 1.2, 1.0, 1.1, 1.2, 1.7] },
  capricorn: { inside: "#c8c0a0", outside: "#1a1a22", core: 3.0, spin: 0.68, arms: 4, tight: 1.4, rand: 0.1, r: 1.18, th: 0.13, w: [1.8, 0.9, 1.0, 0.8, 0.9, 1.1, 1.2] },
  aquarius: { inside: "#a8e0ff", outside: "#2a1060", core: 1.8, spin: 1.45, arms: 5, tight: 0.6, rand: 0.3, r: 1.5, th: 0.23, w: [0.7, 0.8, 0.9, 1.1, 1.5, 1.6, 1.5] },
  pisces: { inside: "#c8b0ff", outside: "#0a1830", core: 1.6, spin: 0.88, arms: 2, tight: 0.45, rand: 0.36, r: 1.58, th: 0.26, w: [0.8, 1.0, 0.8, 1.4, 1.0, 1.3, 1.8] },
};

const _in = new Color();
const _out = new Color();
const _mixA = new Color();
const _mixB = new Color();

function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type DiskSim = {
  n: number;
  pos: Float32Array;
  vel: Float32Array;
  col: Float32Array;
  geo: BufferGeometry;
  mat: ShaderMaterial;
  from: SignId;
  to: SignId;
  mix: number;
};

export function createDiskSim(): DiskSim {
  const n = DISK_N;
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  seedDisk(pos, vel, size, n, PRESET.aries);
  paintDisk(col, pos, n, PRESET.aries, PRESET.aries, 1);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new BufferAttribute(col, 3));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    fog: false,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 0 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      uniform float uTime;
      uniform float uFade;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        float tw = 0.78 + 0.22 * sin(uTime * 1.4 + position.x * 3.1 + aSize * 9.0);
        vAlpha = uFade * tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(0.8, -mv.z);
        gl_PointSize = clamp(aSize * uPixelRatio * (90.0 / dist), 1.2, 7.5);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float a = pow(1.0 - d, 2.0) * vAlpha;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });
  return { n, pos, vel, col, geo, mat, from: "aries", to: "aries", mix: 1 };
}

function seedDisk(pos: Float32Array, vel: Float32Array, size: Float32Array, n: number, p: Preset) {
  for (let i = 0; i < n; i++) {
    const u = hash(i + 3);
    const v = hash(i + 9);
    const arm = Math.floor(v * p.arms) % Math.max(1, p.arms);
    const ang = u * Math.PI * 2 * p.tight + (arm / p.arms) * Math.PI * 2;
    const rad = Math.pow(hash(i + 21), 0.55) * p.r;
    const x = Math.cos(ang) * rad + (hash(i + 5) - 0.5) * p.rand * 0.4;
    const z = Math.sin(ang) * rad + (hash(i + 7) - 0.5) * p.rand * 0.4;
    const y = (hash(i + 11) - 0.5) * p.th * 2;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    vel[i * 3] = -z * p.spin * 0.12;
    vel[i * 3 + 1] = (hash(i + 13) - 0.5) * 0.02;
    vel[i * 3 + 2] = x * p.spin * 0.12;
    size[i] = 1.1 + hash(i + 17) * 2.2;
  }
}

function paintDisk(col: Float32Array, pos: Float32Array, n: number, a: Preset, b: Preset, mix: number) {
  _in.set(a.inside).lerp(_mixA.set(b.inside), mix);
  _out.set(a.outside).lerp(_mixB.set(b.outside), mix);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3]!;
    const z = pos[i * 3 + 2]!;
    const r = Math.min(1, Math.hypot(x, z) / 1.6);
    _mixA.copy(_in).lerp(_out, r);
    col[i * 3] = _mixA.r;
    col[i * 3 + 1] = _mixA.g;
    col[i * 3 + 2] = _mixA.b;
  }
}

export function stepDisk(
  sim: DiskSim,
  dt: number,
  sign: SignId,
  focus: string | null,
  ptrX: number,
  ptrY: number,
  ptrOn: boolean,
  freeze: boolean,
) {
  const pTo = PRESET[sign] ?? PRESET.aries;
  if (sim.to !== sign) {
    sim.from = sim.to;
    sim.to = sign;
    sim.mix = 0;
  }
  sim.mix = Math.min(1, sim.mix + dt / 1.2);
  const pFrom = PRESET[sim.from] ?? pTo;
  const core = pFrom.core + (pTo.core - pFrom.core) * sim.mix;
  const spin = pFrom.spin + (pTo.spin - pFrom.spin) * sim.mix;
  const tight = pFrom.tight + (pTo.tight - pFrom.tight) * sim.mix;
  const { n, pos, vel, col } = sim;
  const step = Math.min(0.033, Math.max(0.001, dt));
  const stir = ptrOn ? 1 : 0;
  const chest = volumeChest(sign);

  if (!freeze) {
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      let x = pos[o]!;
      let y = pos[o + 1]!;
      let z = pos[o + 2]!;
      let ax = 0;
      let ay = 0;
      let az = 0;
      const r2 = x * x + y * y + z * z + EPS2;
      const inv = 1 / Math.pow(r2, 1.5);
      ax += -G * core * x * inv;
      ay += -G * core * y * inv;
      az += -G * core * z * inv;
      for (let k = 0; k < 7; k++) {
        const well = DISK_CHAKRAS[k]!;
        const w0 = pFrom.w[k]! + (pTo.w[k]! - pFrom.w[k]!) * sim.mix;
        const w = w0 * (focus === well.id ? 2.6 : 1);
        const dx = x - 0;
        const dy = y - well.y * 0.72;
        const dz = z - 0;
        const d2 = dx * dx + dy * dy + dz * dz + EPS2;
        const f = (-G * well.mass * w) / Math.pow(d2, 1.5);
        ax += dx * f;
        ay += dy * f;
        az += dz * f;
      }
      ax += -z * spin * 0.15;
      az += x * spin * 0.15;
      if (stir) {
        ax += ptrX * 0.55;
        ay += -ptrY * 0.4;
        ax += -z * 0.22 * stir;
        az += x * 0.22 * stir;
      }
      const u = x / (pTo.r * 1.35) * 0.5 + 0.5 + chest.x;
      const v = y / (pTo.r * 1.15) * 0.5 + 0.5 + chest.y * 0.2;
      const alpha = sampleVolumeAlpha(sign, u, v);
      if (alpha < 0.08) {
        ax += -x * 2.4 * tight;
        ay += (chest.y * 0.4 - y) * 2.1;
        az += -z * 2.4 * tight;
      }
      const rx = pTo.r * 1.15;
      const ry = pTo.r * 0.55;
      const rz = pTo.r * 1.15;
      const hx = x / rx;
      const hy = y / ry;
      const hz = z / rz;
      if (hx * hx + hy * hy + hz * hz > 1) {
        ax += -x * 1.8;
        ay += -y * 1.8;
        az += -z * 1.8;
      }
      vel[o] = (vel[o]! + ax * step) * DAMP_XZ;
      vel[o + 1] = (vel[o + 1]! + ay * step) * DAMP_Y;
      vel[o + 2] = (vel[o + 2]! + az * step) * DAMP_XZ;
      pos[o] = x + vel[o]! * step;
      pos[o + 1] = y + vel[o + 1]! * step;
      pos[o + 2] = z + vel[o + 2]! * step;
    }
  }
  paintDisk(col, pos, n, pFrom, pTo, sim.mix);
  sim.geo.attributes.position!.needsUpdate = true;
  sim.geo.attributes.aColor!.needsUpdate = true;
}

export function disposeDisk(sim: DiskSim) {
  sim.geo.dispose();
  sim.mat.dispose();
}
