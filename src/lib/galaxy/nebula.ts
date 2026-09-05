import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ShaderMaterial,
} from "three";
import { denseCloud } from "./signVolume";
import { isSmallGpu } from "@/lib/gpu";

const SMALL = typeof window !== "undefined" && isSmallGpu();
/** Birth-only dense; fly phase draws a thin remnant then hides (A4). */
const GAS_N = SMALL ? 700 : 1000;
const SIGN_N = SMALL ? 900 : 1400;
const EMBER_N = 36;
export const NEBULA_N_FULL = GAS_N + SIGN_N + EMBER_N;
export const NEBULA_N_IDLE = SMALL ? 120 : 200;
export const NEBULA_WIDE = 16.5;
export const NEBULA_ASPECT = 16 / 9;

function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function ramFallback(i: number) {
  const u = hash(i, 1);
  const v = hash(i, 2);
  const part = i % 7;
  let x = 0;
  let y = 0;
  if (part < 3) {
    const a = u * Math.PI * 2;
    const r = Math.pow(v, 0.55);
    x = Math.cos(a) * r * 0.34;
    y = Math.sin(a) * r * 0.22 + 0.02;
  } else if (part === 3) {
    x = (u - 0.5) * 0.18;
    y = 0.18 + v * 0.16;
  } else if (part === 4) {
    x = (u < 0.5 ? -1 : 1) * (0.12 + v * 0.22);
    y = 0.28 + u * 0.18;
  } else if (part === 5) {
    x = (u - 0.5) * 0.42;
    y = -0.12 - v * 0.22;
  } else {
    x = (u - 0.5) * 0.5;
    y = (v - 0.45) * 0.55;
  }
  return { x, y, z: (hash(i, 3) - 0.5) * 0.08, mag: 0.35 + hash(i, 4) * 0.5 };
}

const VERT = /* glsl */ `
uniform float uTime;
uniform float uBirth;
uniform float uAssemble;
uniform float uOpacity;
attribute vec3 corePos;
attribute vec3 nebulaPos;
attribute vec3 signPos;
attribute float aKind;
attribute vec3 color;
attribute float aSize;
attribute float aTwinkle;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float b = clamp(uBirth, 0.0, 1.0);
  float a = clamp(uAssemble, 0.0, 1.0);
  float expand = b * b * b * (b * (b * 6.0 - 15.0) + 10.0);
  float swirl = 0.18 * expand * (1.0 - a * 0.85);
  float ang = swirl * (0.7 + aKind * 0.2);
  float cs = cos(ang);
  float sn = sin(ang);

  vec3 cloud = mix(corePos, nebulaPos, expand);
  float cx = cloud.x * cs - cloud.y * sn;
  float cy = cloud.x * sn + cloud.y * cs;
  cloud.x = cx;
  cloud.y = cy;

  vec3 p = cloud;
  if (aKind > 0.5) {
    p = mix(cloud, signPos, a);
  } else {
    vec3 halo = nebulaPos * (0.72 + 0.18 * (1.0 - a));
    p = mix(cloud, halo, a);
  }

  vColor = color;
  float ember = 1.0 - smoothstep(0.0, 0.22, b);
  float gas = expand * (1.0 - a * 0.48);
  float formed = a * (aKind > 0.5 ? 1.0 : 0.18);
  float tw = 0.88 + 0.12 * sin(uTime * 0.35 + aTwinkle);
  vAlpha = uOpacity * tw * (0.22 * ember + 0.62 * gas + 0.85 * formed + (aKind > 1.5 ? 0.4 : 0.0));
  if (aKind < 0.5) vAlpha *= mix(1.0, 0.32, a);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float sz = aSize;
  sz *= mix(1.6, 1.0, expand);
  sz *= mix(1.0, aKind > 0.5 ? 0.85 : 1.35, a);
  sz *= mix(2.4, 1.0, 1.0 - ember);
  gl_PointSize = max(2.0, sz * tw);
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

export function makeNebulaMaterial(map: CanvasTexture) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBirth: { value: 0 },
      uAssemble: { value: 0 },
      uOpacity: { value: 1 },
      uMap: { value: map },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    fog: false,
    toneMapped: false,
    vertexColors: true,
  });
}

export function buildBirthNebula() {
  const cloud = denseCloud("aries", SIGN_N);
  const signSrc = cloud.length ? cloud : Array.from({ length: SIGN_N }, (_, i) => ramFallback(i));
  const n = GAS_N + SIGN_N + EMBER_N;
  const core = new Float32Array(n * 3);
  const neb = new Float32Array(n * 3);
  const sign = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const sz = new Float32Array(n);
  const tw = new Float32Array(n);
  const kind = new Float32Array(n);
  const tall = NEBULA_WIDE / NEBULA_ASPECT;

  const write = (
    i: number,
    k: number,
    c: [number, number, number],
    np: [number, number, number],
    sp: [number, number, number],
    rgb: [number, number, number],
    size: number,
    aKind: number,
  ) => {
    core[i * 3] = c[0];
    core[i * 3 + 1] = c[1];
    core[i * 3 + 2] = c[2];
    neb[i * 3] = np[0];
    neb[i * 3 + 1] = np[1];
    neb[i * 3 + 2] = np[2];
    sign[i * 3] = sp[0];
    sign[i * 3 + 1] = sp[1];
    sign[i * 3 + 2] = sp[2];
    col[i * 3] = rgb[0];
    col[i * 3 + 1] = rgb[1];
    col[i * 3 + 2] = rgb[2];
    sz[i] = size;
    tw[i] = hash(i, 21) * 6.28;
    kind[i] = aKind;
  };

  let w = 0;
  for (let i = 0; i < EMBER_N; i++) {
    const j = (hash(i, 5) - 0.5) * 0.28;
    const k = (hash(i, 6) - 0.5) * 0.22;
    write(w, i, [j, k, 0], [j * 4, k * 3.2, (hash(i, 7) - 0.5) * 0.6], [j * 1.2, k * 0.9, 0.2], [1, 0.86, 0.62], 7 + hash(i, 8) * 5, 2);
    w++;
  }
  for (let i = 0; i < GAS_N; i++) {
    const arm = i % 4;
    const u = hash(i, 9);
    const theta = u * 4.2 + arm * 1.57;
    const r = 1.4 + Math.pow(u, 0.7) * 11.5;
    const jx = (hash(i, 10) - 0.5) * 2.4;
    const jy = (hash(i, 11) - 0.5) * 2.2;
    const x = Math.cos(theta) * r + jx;
    const y = Math.sin(theta) * r * 0.62 + jy;
    const z = (hash(i, 12) - 0.5) * 2.8;
    const violet = hash(i, 13) < 0.22;
    const rgb: [number, number, number] = violet ? [0.62, 0.5, 0.78] : [1, 0.82, 0.58];
    const p = signSrc[i % signSrc.length]!;
    write(
      w,
      i,
      [(hash(i, 14) - 0.5) * 0.35, (hash(i, 15) - 0.5) * 0.28, 0],
      [x, y, z],
      [p.x * NEBULA_WIDE, p.y * tall, p.z * 1.6],
      rgb,
      12 + hash(i, 16) * 14,
      0,
    );
    w++;
  }
  for (let i = 0; i < SIGN_N; i++) {
    const p = signSrc[i % signSrc.length]!;
    const sx = p.x * NEBULA_WIDE;
    const sy = p.y * tall;
    const szz = p.z * 1.6;
    const a = hash(i, 17) * Math.PI * 2;
    const r = 2.2 + hash(i, 18) * 9.5;
    write(
      w,
      i,
      [(hash(i, 19) - 0.5) * 0.4, (hash(i, 20) - 0.5) * 0.32, 0],
      [Math.cos(a) * r, Math.sin(a) * r * 0.58, (hash(i, 22) - 0.5) * 2.2],
      [sx, sy, szz],
      [0.96 + p.mag * 0.04, 0.82, 0.62],
      3.2 + p.mag * 3.4,
      1,
    );
    w++;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("corePos", new BufferAttribute(core, 3));
  geo.setAttribute("nebulaPos", new BufferAttribute(neb, 3));
  geo.setAttribute("signPos", new BufferAttribute(sign, 3));
  geo.setAttribute("color", new BufferAttribute(col, 3));
  geo.setAttribute("aSize", new BufferAttribute(sz, 1));
  geo.setAttribute("aTwinkle", new BufferAttribute(tw, 1));
  geo.setAttribute("aKind", new BufferAttribute(kind, 1));
  geo.setAttribute("position", new BufferAttribute(core.slice(), 3));
  geo.setDrawRange(0, w);
  return geo;
}
