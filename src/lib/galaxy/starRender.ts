import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3 } from "three";
import type { MorphPair } from "./constellations";
import type { VolumeStar } from "./signVolume";
import { STAR_APPEARANCE } from "./starAppearance";
import type { Element } from "@/lib/chart/types";

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
// 1 when parked and free to animate, 0 while steering/wheeling/dragging/
// seeking (or reduced motion) — the single kill switch for the halo's
// new-in-this-pass motion, so the one-plate rule's damping covers it too.
uniform float uLife;
// Small pointer-driven offsets, used only for the halo's depth parallax.
uniform float uParX;
uniform float uParY;
// Fire=0, earth=1, air=2, water=3 — drives the element-motion branch below.
uniform float uElement;
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
  float life = clamp(uLife, 0.0, 1.0);
  float shootStreak = 0.0;
  if (kind > 1.5) gath = mix(0.2, 0.85, gath);
  // Morph only body stars (kind 0) into the glyph; spiral/halo stay ambient.
  float isBody = kind < 0.5 ? 1.0 : 0.0;
  float morphAmt = clamp(uMorph, 0.0, 1.0) * isBody;
  // Right-side bias applied only during morph and only to body stars,
  // so spiral/halo particles don't slide into an artifact circle.
  float bias = uGlyphBiasX * isBody;
  vec3 biasedGlyph = vec3(glyphPos.x + bias, glyphPos.y, glyphPos.z);
  vec3 fig = mix(signPos, biasedGlyph, morphAmt);

  // Halo orbit: the ring slowly turns like a galaxy on its own flattened
  // oval, inner stars a little faster than outer ones. Rotating in
  // fig-space (before the uWide/uTall scale) keeps the orbit on the
  // sign's own ellipse. Damped to a stop by life while the camera is
  // moving — the one-plate rule's damping covers this too.
  if (kind > 1.5) {
    float haloR = length(fig.xy);
    float orbitSpeed = mix(0.05, 0.018, clamp((haloR - 0.3) / 0.9, 0.0, 1.0));
    // Water: the ring is a current, not just a ring — run it a touch quicker.
    if (uElement > 2.5) orbitSpeed *= 1.7;
    float orbitAngle = uTime * orbitSpeed * life;
    float oc = cos(orbitAngle);
    float os = sin(orbitAngle);
    vec2 hb = fig.xy;
    fig.xy = vec2(hb.x * oc - hb.y * os, hb.x * os + hb.y * oc);
    // Settling on a sign: the halo gathers in a touch as life ramps up.
    fig.xy *= mix(1.05, 1.0, life);
  }

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

  // Depth parallax: halo stars keep their bake depth (fig.z) as a
  // near/far cue, so layers slide at different speeds as the camera
  // drifts (a slow ambient sway) or the pointer moves (uParX/uParY).
  if (kind > 1.5) {
    float depthSel = fig.z;
    float ambientDrift = sin(uTime * 0.025 + aPhase * 0.4) * 0.05;
    p.x += depthSel * (uParX * 1.6 + ambientDrift) * life;
    p.y += depthSel * uParY * 1.6 * life;
  }

  // Element motion (spiral + halo only — the body glyph stays put): fire
  // embers drift up, earth dust settles, air runs two thin crossing
  // streams. Water's current is folded into the halo orbit boost above.
  if (kind > 0.5) {
    vec2 elemOff = vec2(0.0);
    if (uElement < 0.5) {
      float e = sin(uTime * 0.05 + aPhase * 1.3) * 0.5 + 0.5;
      elemOff = vec2(sin(uTime * 0.03 + aPhase * 2.1) * 0.05, e * 0.5);
    } else if (uElement < 1.5) {
      float e = sin(uTime * 0.045 + aPhase * 1.1) * 0.5 - 0.5;
      elemOff = vec2(0.0, e * 0.35);
    } else if (uElement < 2.5) {
      float dir = mod(aPhase, 2.0) < 1.0 ? 1.0 : -1.0;
      float s = uTime * 0.06 + aPhase * 1.7;
      elemOff = vec2(sin(s) * 0.5 * dir, cos(s) * 0.22 * dir);
    }
    p.x += elemOff.x * life * uWide * 0.04;
    p.y += elemOff.y * life * uTall * 0.04;
  }

  // Pointer hover: a slight lean toward the cursor (uHover already carries
  // the hover boost), damped along with everything else while moving.
  float lean = max(0.0, uHover - 1.0) * life;
  p.x += lean * uWide * 0.01;
  p.y += lean * uTall * 0.006;

  float breathe = 0.96 + 0.04 * sin(uTime * (0.85 + mod(aPhase, 5.0) * 0.12) + aPhase);
  float flash = pow(0.5 + 0.5 * sin(uTime * (1.7 + mod(aPhase, 7.0) * 0.21) + aPhase * 1.3), 18.0);
  float spark = breathe + flash * (kind > 0.5 && kind < 1.5 ? 0.35 : 0.2);
  float mag = aMag;
  float visibility = clamp(uFade, 0.0, 1.0);
  float b = min(1.35, spark * (0.5 + mag * 0.55) * (0.78 + visibility * 0.22));
  vec3 gold = vec3(1.0, 0.9, 0.72);
  vec3 violet = vec3(0.62, 0.55, 0.82);
  // Richer twinkle: a slow, per-star shimmer between gold and violet, on
  // top of the plain breathe above — damped by life like the rest.
  float shimmer = 0.5 + 0.5 * sin(uTime * (0.05 + mod(aPhase, 4.0) * 0.02) + aPhase * 1.9);
  vec3 shimmerTint = mix(gold, violet, shimmer);
  if (kind > 0.5 && kind < 1.5) vColor = mix(gold, uTint, 0.28) * b * 1.15;
  // Settling on a sign: the halo also brightens a little over the same
  // ~1-2s life ramp as the gather above.
  else if (kind > 1.5) vColor = mix(mix(uTint, violet, 0.35), shimmerTint, 0.4 * life) * b * (0.7 + life * 0.22);
  else vColor = mix(uTint, shimmerTint, 0.1 * life) * b;
  // Fade spiral (kind 1) and halo (kind 2) out while glyph is forming
  // so only the clean body-star symbol is visible at full morph.
  float ambientFade = kind < 0.5 ? 1.0 : max(0.0, 1.0 - uMorph * 1.4);
  vAlpha = uOpacity * visibility * (kind > 1.5 ? 0.55 : 1.0) * ambientFade * (1.0 + max(0.0, uHover - 1.0) * 0.35);
  vSpike = mag > 0.7 ? (mag - 0.7) * 2.2 : 0.0;

  // Rare shooting star: kind 3 is one particle per cloud, invisible
  // almost all the time. Every 20-40s (its own hashed period) it streaks
  // across the halo band once, but only while life says the camera is
  // parked — never mid-flight. Fully overrides this particle's position
  // and color while it fires.
  if (kind > 2.5) {
    float period = 20.0 + fract(sin(aPhase * 12.9898) * 43758.5453) * 20.0;
    float cyc = mod(uTime + aPhase * 71.0, period);
    float dur = 0.55;
    float tt = clamp(cyc / dur, 0.0, 1.0);
    float armed = step(0.6, life);
    shootStreak = armed * step(cyc, dur) * (1.0 - tt);
    vec2 dir2 = normalize(vec2(cos(aPhase * 3.1 + 0.6), sin(aPhase * 1.7 + 1.1) * 0.55));
    vec2 startP = -dir2 * 1.05;
    vec2 endP = dir2 * 1.05;
    vec2 streakPos = mix(startP, endP, tt);
    p.x = streakPos.x * uWide;
    p.y = streakPos.y * uTall;
    p.z = 0.3;
    vColor = mix(vec3(1.0, 0.95, 0.85), violet, 0.12) * shootStreak * 2.6;
    vAlpha = uOpacity * shootStreak;
    vSpike = shootStreak > 0.25 ? (shootStreak - 0.25) * 2.4 : 0.0;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float base = uBaseSize + mag * mag * 7.4;
  if (kind > 0.5 && kind < 1.5) base *= 1.25;
  if (kind > 1.5) base *= 1.8;
  if (kind > 2.5) base *= mix(1.0, 2.4, shootStreak);
  gl_PointSize = max(1.2, base * uPxScale * mix(1.0, uHover, ${STAR_APPEARANCE.hoverSizeMix}) * (0.55 + gath * 0.5));
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
  float edge = 1.0 - smoothstep(${STAR_APPEARANCE.spriteEdgeInner}, ${STAR_APPEARANCE.spriteEdgeOuter}, r2);
  float core = exp(-r2 * 92.0);
  float glow = exp(-r2 * 12.0) * 0.18;
  float ax = abs(d.x);
  float ay = abs(d.y);
  float spikeH = exp(-ay * 28.0) * exp(-ax * 2.8);
  float spikeV = exp(-ax * 28.0) * exp(-ay * 2.8);
  float spike = max(spikeH, spikeV) * vSpike * 0.52;
  float s = (core + glow + spike) * vAlpha * edge;
  if (s < ${STAR_APPEARANCE.alphaCutoff}) discard;
  gl_FragColor = vec4(vColor * s, s);
}
`;

/** Fire=0, earth=1, air=2, water=3 — the vertex shader's element-motion branch. */
export const ELEMENT_CODE: Record<Element, number> = {
  fire: 0,
  earth: 1,
  air: 2,
  water: 3,
};

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
      uLife: { value: 1 },
      uParX: { value: 0 },
      uParY: { value: 0 },
      uElement: { value: 0 },
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

/** Share of a station cloud spent on the spiral arms and the outer halo. */
const SPIRAL_FRACTION = 0.14;
const HALO_FRACTION = 0.2;

/** One rare shooting-star candidate per cloud, carved out of the halo budget. */
const SHOOTING_STARS_PER_CLOUD = 1;

/**
 * bodyN/spiralN/haloN/shootN always sum to n — shared by fillStationCloud
 * and fillMorphCloud so the two never drift out of sync on where each
 * kind of star starts in the buffer. haloTotal is haloN + shootN: the
 * ring generator below walks it as one continuous pass.
 */
function splitCloud(n: number) {
  const spiralN = Math.floor(n * SPIRAL_FRACTION);
  const haloTotal = Math.floor(n * HALO_FRACTION);
  const shootN = Math.min(SHOOTING_STARS_PER_CLOUD, haloTotal);
  const haloN = haloTotal - shootN;
  const bodyN = Math.max(1, n - spiralN - haloTotal);
  return { bodyN, spiralN, haloN, shootN, haloTotal };
}

/** Inner/outer radius of the halo ring, in the same unit-figure space as signPos. */
const HALO_R_MIN = 0.34;
const HALO_R_MAX = 1.15;
const HALO_R_SPAN = HALO_R_MAX - HALO_R_MIN;
/** >1 biases sampling toward the inner edge, so density thins outward with no hard rim. */
const HALO_R_BIAS = 1.7;

export function fillStationCloud(
  geo: BufferGeometry,
  cloud: VolumeStar[],
  scatter: Vector3[],
  count: number,
) {
  const n = count;
  const { bodyN, spiralN, haloN, shootN, haloTotal } = splitCloud(n);
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
    // Stable but decorrelated phases avoid visible rows of synchronized twinkles.
    phase[i] = hash(i, 50) * 6.2831853;
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

  // A continuous ring generator, biased toward the inner edge, so the
  // outer fringe thins smoothly into the nebula instead of stopping at a
  // hard rim — fills the empty band above and below the plate. The last
  // `shootN` slots are the rare shooting star (kind 3): the vertex shader
  // fully overrides their position and color, so they only need to look
  // like an ordinary halo star while idle.
  for (let i = 0; i < haloTotal; i++) {
    const w = bodyN + spiralN + i;
    const isShootingStar = i >= haloN;
    const a = hash(i, 9) * Math.PI * 2;
    const rn = Math.pow(hash(i, 10), HALO_R_BIAS);
    const r = HALO_R_MIN + rn * HALO_R_SPAN;
    sign[w * 3] = Math.cos(a) * r;
    sign[w * 3 + 1] = Math.sin(a) * r * 0.62;
    // Wider than a plain jitter on purpose: the vertex shader reads this
    // as a near/far depth cue for parallax (see uParX/uParY below).
    sign[w * 3 + 2] = (hash(i, 11) - 0.5) * 0.9;
    // Dimmer with radius, so the ring fades into the nebula rather than
    // cutting off. A small slice is promoted past 0.7 so it catches the
    // existing cross-spike glint (vSpike in the vertex shader).
    const fadeOuter = 1 - rn;
    const glint = hash(i, 20) > 0.91;
    mag[w] = glint
      ? 0.74 + hash(i, 21) * 0.22
      : 0.14 + fadeOuter * 0.34 + hash(i, 12) * 0.12;
    kind[w] = isShootingStar ? 3 : 2;
    phase[w] = hash(i, 13) * 6.28;
    const sr = 6 + hash(i, 14) * 10;
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

/**
 * Far-station GPU skip. Hiding a cloud by zeroing drawRange must restore
 * `position.count` when the station is live again — otherwise the stars
 * stay gone after you fly past and come back.
 */
export function setCloudDrawRange(geo: BufferGeometry, live: boolean) {
  const pos = geo.getAttribute("position");
  if (!pos) return;
  geo.setDrawRange(0, live ? pos.count : 0);
}

/** Bakes glyph stroke targets for pick-triggered animal → symbol morph. */
export function fillMorphCloud(
  geo: BufferGeometry,
  cloud: VolumeStar[],
  scatter: Vector3[],
  count: number,
  pairs: MorphPair[],
) {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const w = window as Window & { __tysBoot?: { volumeBuilds: number; morphFills: number } };
    if (!w.__tysBoot) w.__tysBoot = { volumeBuilds: 0, morphFills: 0 };
    w.__tysBoot.morphFills += 1;
  }
  fillStationCloud(geo, cloud, scatter, count);
  const n = count;
  const glyph = (geo.getAttribute("glyphPos") as BufferAttribute).array as Float32Array;
  const kind = (geo.getAttribute("aKind") as BufferAttribute).array as Float32Array;
  const { bodyN } = splitCloud(n);
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
