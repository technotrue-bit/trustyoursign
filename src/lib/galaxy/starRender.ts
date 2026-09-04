import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3 } from "three";
import type { MorphPair } from "./constellations";
import type { VolumeStar } from "./signVolume";

/**
 * Station stars — GPU gather, swirl, twinkle.
 * Attributes baked once; uniforms drive the frame.
 */
export const STAR_VERT = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uGather;
uniform float uWide;
uniform float uTall;
uniform float uSwirl;
uniform float uFade;
uniform float uHover;
uniform float uPxScale;
uniform float uBaseSize;
uniform float uMorph;
uniform float uGlyphBiasX;
uniform vec3 uTint;
attribute vec3 signPos;
attribute vec3 glyphPos;
attribute vec3 scatterPos;
attribute float aMag;
attribute float aPhase;
attribute float aKind;
varying vec3 vColor;
varying float vAlpha;
varying float vSpike;
void main() {
  float gath = clamp(uGather, 0.0, 1.0);
  float kind = aKind;
  if (kind > 1.5) gath = mix(0.2, 0.85, gath);
  // Morph only body stars (kind 0) into the glyph; spiral/halo stay ambient.
  float isBody = kind < 0.5 ? 1.0 : 0.0;
  float morphAmt = clamp(uMorph, 0.0, 1.0) * isBody;
  // Right-side bias applied only during morph and only to body stars,
  // so spiral/halo particles don't slide into an artifact circle.
  float bias = uGlyphBiasX * isBody;
  vec3 biasedGlyph = vec3(glyphPos.x + bias, glyphPos.y, glyphPos.z);
  vec3 fig = mix(signPos, biasedGlyph, morphAmt);
  float chest = 1.0 - min(1.0, length(fig.xy) * 1.55);
  float spin = uSwirl * (1.0 - morphAmt * 0.85) * (kind > 0.5 && kind < 1.5 ? 0.2 + chest * 0.12 : chest * 0.055);
  float phase = uTime * (0.35 + mod(aPhase, 5.0) * 0.02) + aPhase;
  if (kind > 0.5 && kind < 1.5) phase = uTime * (0.55 + mod(aPhase, 3.0) * 0.04) + aPhase;
  vec3 p;
  p.x = fig.x * uWide * gath + scatterPos.x * (1.0 - gath) + sin(phase) * spin * uWide;
  p.y = fig.y * uTall * gath + scatterPos.y * (1.0 - gath) + cos(phase * 0.8) * spin * uWide;
  p.z = fig.z * 1.8 * gath + scatterPos.z * (1.0 - gath) * 0.5;
  if (kind > 0.5 && kind < 1.5) {
    float ang = uTime * 0.22 * uSwirl + aPhase;
    float cr = 0.35 + chest * 0.4;
    p.x += cos(ang) * cr * chest * 0.15;
    p.y += sin(ang) * cr * chest * 0.11;
  }

  float breathe = 0.96 + 0.04 * sin(uTime * (0.85 + mod(aPhase, 5.0) * 0.12) + aPhase);
  float flash = pow(0.5 + 0.5 * sin(uTime * (1.7 + mod(aPhase, 7.0) * 0.21) + aPhase * 1.3), 18.0);
  float spark = breathe + flash * (kind > 0.5 && kind < 1.5 ? 0.35 : 0.2);
  float mag = aMag;
  float b = min(1.35, spark * (0.5 + mag * 0.55) * (0.55 + uFade * 0.5));
  vec3 gold = vec3(1.0, 0.9, 0.72);
  vec3 violet = vec3(0.62, 0.55, 0.82);
  if (kind > 0.5 && kind < 1.5) vColor = mix(gold, uTint, 0.28) * b * 1.15;
  else if (kind > 1.5) vColor = mix(uTint, violet, 0.35) * b * 0.7;
  else vColor = uTint * b;
  // Fade spiral (kind 1) and halo (kind 2) out while glyph is forming
  // so only the clean body-star symbol is visible at full morph.
  float ambientFade = kind < 0.5 ? 1.0 : max(0.0, 1.0 - uMorph * 1.4);
  vAlpha = uOpacity * (kind > 1.5 ? 0.55 : 1.0) * ambientFade;
  vSpike = mag > 0.7 ? (mag - 0.7) * 2.2 : 0.0;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float base = uBaseSize + mag * mag * 7.4;
  if (kind > 0.5 && kind < 1.5) base *= 1.25;
  if (kind > 1.5) base *= 1.8;
  gl_PointSize = max(1.2, base * uPxScale * uHover * (0.55 + gath * 0.5));
}
`;

export const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vSpike;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;
  float core = exp(-r2 * 92.0);
  float glow = exp(-r2 * 12.0) * 0.18;
  float ax = abs(d.x);
  float ay = abs(d.y);
  float spikeH = exp(-ay * 28.0) * exp(-ax * 2.8);
  float spikeV = exp(-ax * 28.0) * exp(-ay * 2.8);
  float spike = max(spikeH, spikeV) * vSpike * 0.52;
  float s = (core + glow + spike) * vAlpha;
  if (s < 0.016) discard;
  gl_FragColor = vec4(vColor * s, s);
}
`;

export function makeSparkMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uGather: { value: 1 },
      uWide: { value: 16.5 },
      uTall: { value: 16.5 / (16 / 9) },
      uSwirl: { value: 1 },
      uFade: { value: 1 },
      uHover: { value: 1 },
      uPxScale: { value: 1 },
      uBaseSize: { value: 2.05 },
      uMorph: { value: 0 },
      uGlyphBiasX: { value: 0 },
      uTint: { value: new Color("#f0d4c6") },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    blending: AdditiveBlending,
    vertexColors: false,
  });
}

function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function fillStationCloud(
  geo: BufferGeometry,
  cloud: VolumeStar[],
  scatter: Vector3[],
  count: number,
) {
  const n = count;
  const spiralN = Math.floor(n * 0.16);
  const haloN = Math.floor(n * 0.12);
  const bodyN = Math.max(1, n - spiralN - haloN);
  const sign = new Float32Array(n * 3);
  const scat = new Float32Array(n * 3);
  const mag = new Float32Array(n);
  const phase = new Float32Array(n);
  const kind = new Float32Array(n);

  let cx = 0;
  let cy = 0;
  let cw = 0;
  const body = Math.min(cloud.length, bodyN);
  for (let i = 0; i < body; i++) {
    const p = cloud[i]!;
    cx += p.x * (0.4 + p.mag);
    cy += p.y * (0.4 + p.mag);
    cw += 0.4 + p.mag;
  }
  if (cw > 0.001) {
    cx /= cw;
    cy /= cw;
  }

  for (let i = 0; i < n; i++) {
    const sc = scatter[i] ?? scatter[i % Math.max(1, scatter.length)]!;
    scat[i * 3] = sc.x;
    scat[i * 3 + 1] = sc.y;
    scat[i * 3 + 2] = sc.z;
    phase[i] = i * 0.17;
    mag[i] = 0;
    kind[i] = 0;
  }

  for (let i = 0; i < body; i++) {
    const p = cloud[i]!;
    sign[i * 3] = p.x;
    sign[i * 3 + 1] = p.y;
    sign[i * 3 + 2] = p.z;
    mag[i] = p.mag;
    kind[i] = 0;
  }

  for (let i = 0; i < spiralN; i++) {
    const w = bodyN + i;
    const arm = i % 4;
    const u = hash(i, 1);
    const theta = u * 4.6;
    const r = 0.028 * Math.exp(0.32 * theta);
    const ang = theta + arm * 1.5708;
    const jx = (hash(i, 2) - 0.5) * 0.014;
    const jy = (hash(i, 3) - 0.5) * 0.012;
    sign[w * 3] = cx + Math.cos(ang) * r + jx;
    sign[w * 3 + 1] = cy + Math.sin(ang) * r * 0.7 + jy;
    sign[w * 3 + 2] = (hash(i, 4) - 0.5) * 0.06;
    mag[w] = 0.62 + (1 - u) * 0.38;
    kind[w] = 1;
    phase[w] = hash(i, 5) * 6.28;
    const sr = 1.6 + hash(i, 6) * 2.4;
    const sa = hash(i, 7) * Math.PI * 2;
    scat[w * 3] = Math.cos(sa) * sr;
    scat[w * 3 + 1] = Math.sin(sa) * sr * 0.7;
    scat[w * 3 + 2] = (hash(i, 8) - 0.5) * 2.2;
  }

  for (let i = 0; i < haloN; i++) {
    const w = bodyN + spiralN + i;
    const a = hash(i, 9) * Math.PI * 2;
    const r = 0.38 + hash(i, 10) * 0.42;
    sign[w * 3] = Math.cos(a) * r;
    sign[w * 3 + 1] = Math.sin(a) * r * 0.62;
    sign[w * 3 + 2] = (hash(i, 11) - 0.5) * 0.12;
    mag[w] = 0.22 + hash(i, 12) * 0.28;
    kind[w] = 2;
    phase[w] = hash(i, 13) * 6.28;
    const sr = 6 + hash(i, 14) * 8;
    scat[w * 3] = Math.cos(a) * sr;
    scat[w * 3 + 1] = Math.sin(a) * sr * 0.75;
    scat[w * 3 + 2] = (hash(i, 15) - 0.5) * 4;
  }

  geo.setAttribute("signPos", new BufferAttribute(sign, 3));
  geo.setAttribute("glyphPos", new BufferAttribute(sign.slice(), 3));
  geo.setAttribute("scatterPos", new BufferAttribute(scat, 3));
  geo.setAttribute("aMag", new BufferAttribute(mag, 1));
  geo.setAttribute("aPhase", new BufferAttribute(phase, 1));
  geo.setAttribute("aKind", new BufferAttribute(kind, 1));
  geo.setAttribute("position", new BufferAttribute(sign.slice(), 3));
  geo.setDrawRange(0, n);
  return geo;
}

/** Bakes glyph stroke targets for pick-triggered animal → symbol morph. */
export function fillMorphCloud(
  geo: BufferGeometry,
  cloud: VolumeStar[],
  scatter: Vector3[],
  count: number,
  pairs: MorphPair[],
) {
  fillStationCloud(geo, cloud, scatter, count);
  const n = count;
  const glyph = (geo.getAttribute("glyphPos") as BufferAttribute).array as Float32Array;
  const kind = (geo.getAttribute("aKind") as BufferAttribute).array as Float32Array;
  const bodyN = Math.max(1, n - Math.floor(n * 0.16) - Math.floor(n * 0.12));
  const body = Math.min(cloud.length, bodyN);
  const plen = Math.max(1, pairs.length);
  for (let i = 0; i < body; i++) {
    const pair = pairs[i % plen]!;
    glyph[i * 3] = pair.gx;
    glyph[i * 3 + 1] = pair.gy;
    glyph[i * 3 + 2] = 0;
  }
  for (let i = body; i < n; i++) {
    const w = i;
    glyph[w * 3] = (geo.getAttribute("signPos") as BufferAttribute).array[w * 3]!;
    glyph[w * 3 + 1] = (geo.getAttribute("signPos") as BufferAttribute).array[w * 3 + 1]!;
    glyph[w * 3 + 2] = (geo.getAttribute("signPos") as BufferAttribute).array[w * 3 + 2]!;
    if (kind[w]! > 0.5) {
      const pair = pairs[i % plen]!;
      glyph[w * 3] = pair.gx;
      glyph[w * 3 + 1] = pair.gy;
    }
  }
  geo.attributes.glyphPos!.needsUpdate = true;
  return geo;
}
