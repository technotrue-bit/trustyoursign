import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from "three";

/**
 * Flight dust — the volume the camera flies through on the way to the hub.
 *
 * The station's star cloud is a thin slab sitting on the plate, so the middle of
 * the dive had nothing in it: the frame went nearly black between the painted
 * figure and the core. This is a ring of faint dust around the flight axis
 * (a clear channel through the middle so the core reads), spread over the depth
 * the camera actually travels — so dust streams past the lens during the rush.
 *
 * Deterministic (seeded hash), so the dust is identical on every reload.
 */
export const DUST_Z_NEAR = 2;
export const DUST_Z_FAR = 12.5;
export const DUST_R_MIN = 1.7;
export const DUST_R_MAX = 12.5;

function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type DustCloud = { count: number; positions: Float32Array; zRange: [number, number]; rRange: [number, number] };

/**
 * Ring-biased cloud around the +z flight axis win station-local space: u is in
 * `DUST_R_MIN..DUST_R_MAX`, angle uniform, y flattened so it reads as a disc
 * rather than a tube.
 */
export function dustPoints(count: number): DustCloud {
  const n = Math.max(1, Math.floor(count));
  const positions = new Float32Array(n * 3);
  let minZ = Infinity;
  let maxZ = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;
  for (let i = 0; i < n; i++) {
    const u = hash(i, 1);
    // Bias to mid radii: dense periphery, thin centre.
    const r = DUST_R_MIN + (DUST_R_MAX - DUST_R_MIN) * Math.pow(u, 0.62);
    const a = hash(i, 2) * Math.PI * 2;
    const z = DUST_Z_NEAR + (DUST_Z_FAR - DUST_Z_NEAR) * hash(i, 3);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.78;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
    minR = Math.min(minR, Math.hypot(x, y));
    maxR = Math.max(maxR, Math.hypot(x, y));
  }
  return { count: n, positions, zRange: [minZ, maxZ], rRange: [minR, maxR] };
}

export function buildFlightDust(count: number): BufferGeometry {
  const cloud = dustPoints(count);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(cloud.positions, 3));
  const size = new Float32Array(cloud.count);
  const mag = new Float32Array(cloud.count);
  const phase = new Float32Array(cloud.count);
  for (let i = 0; i < cloud.count; i++) {
    size[i] = 0.5 + hash(i, 7) * 2.1;
    mag[i] = 0.12 + hash(i, 11) * 0.72;
    phase[i] = hash(i, 13) * 6.283;
  }
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  geo.setAttribute("aMag", new BufferAttribute(mag, 1));
  geo.setAttribute("aPhase", new BufferAttribute(phase, 1));
  return geo;
}

const DUST_VERT = /* glsl */ `
attribute float aSize;
attribute float aMag;
attribute float aPhase;
uniform float uTime;
uniform float uOpacity;
uniform float uPx;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.82 + 0.18 * sin(uTime * (0.7 + mod(aPhase, 3.0) * 0.3) + aPhase);
  vAlpha = uOpacity * aMag * twinkle;
  gl_PointSize = max(1.0, aSize * uPx * (14.0 / max(0.6, -mv.z)));
}
`;

const DUST_FRAG = /* glsl */ `
uniform vec3 uTint;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.02, r) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uTint * (0.55 + a * 0.7), a);
}
`;

export function makeDustMaterial(tint: string, pxScale = 1) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPx: { value: pxScale },
      uTint: { value: new Color(tint) },
    },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    blending: AdditiveBlending,
  });
}

/**
 * Dust opacity through the dive: invisible while the painted plate is the hero,
 * rising as the figure takes over, easing back once you are parked at the core
 * (close dust would otherwise read as noise around the hub).
 */
export function dustOpacity(form: number, inside: boolean) {
  if (inside) return 0.34;
  const f = Math.min(1, Math.max(0, form));
  return 0.9 * Math.pow(f, 0.8);
}