import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ShaderMaterial,
} from "three";

const FIELD_N = 2100;
const ANCHOR_N = 70;
const WISP_N = 220;

function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function ellipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy;
}

/** Quiet: animal body — the station mesh already holds those stars. */
function inRam(x: number, y: number) {
  return ellipse(x, y, 0.05, 0.08, 6.6, 3.9) < 1;
}

/** Quiet: title “what’s your sign”. */
function inTitle(x: number, y: number) {
  return ellipse(x, y, 0, 6.9, 7.4, 2.15) < 1;
}

/** Quiet: strip / Aries–Taurus labels. */
function inStrip(x: number, y: number) {
  return y < -6.35 && y > -10.2 && Math.abs(x) < 13.5;
}

function zonePoint(i: number) {
  const zone = i % 6;
  const u = hash(i, 3);
  const v = hash(i, 4);
  let x = 0;
  let y = 0;
  if (zone === 0) {
    // above the back
    x = (u - 0.5) * 18;
    y = 3.1 + v * 5.4;
  } else if (zone === 1) {
    // left margin
    x = -7.2 - u * 9.5;
    y = (v - 0.5) * 16;
  } else if (zone === 2) {
    // right margin
    x = 7.2 + u * 9.5;
    y = (v - 0.5) * 16;
  } else if (zone === 3) {
    // under the belly
    x = (u - 0.5) * 14;
    y = -2.4 - v * 4.8;
  } else if (zone === 4) {
    // around the legs
    x = (u - 0.5) * 12;
    y = -3.6 - v * 3.4;
  } else {
    // corners
    x = (u < 0.5 ? -1 : 1) * (10 + v * 8);
    y = (hash(i, 5) < 0.5 ? 1 : -1) * (5.5 + hash(i, 6) * 5);
  }
  const z = -2.4 - hash(i, 7) * 4.2 - Math.abs(x) * 0.04;
  return { x, y, z };
}

function keep(x: number, y: number, i: number) {
  if (inRam(x, y) && hash(i, 8) > 0.04) return false;
  if (inTitle(x, y) && hash(i, 9) > 0.1) return false;
  if (inStrip(x, y) && hash(i, 10) > 0.08) return false;
  return true;
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
  float tw = aTwinkle > 0.01 ? 0.84 + 0.16 * sin(uTime * 0.45 + aTwinkle) : 1.0;
  vAlpha = uOpacity * tw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(2.6, aSize * tw);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 s = texture2D(uMap, gl_PointCoord);
  float a = s.a * vAlpha;
  if (a < 0.018) discard;
  gl_FragColor = vec4(vColor * s.rgb * a, a);
}
`;

export function makeNearSkyMaterial(map: CanvasTexture, opacity: number) {
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

export function buildNearSky() {
  const n = FIELD_N + ANCHOR_N + WISP_N;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const sz = new Float32Array(n);
  const tw = new Float32Array(n);
  let w = 0;

  const write = (x: number, y: number, z: number, size: number, gold: number, bright: number, twinkle: number) => {
    pos[w * 3] = x;
    pos[w * 3 + 1] = y;
    pos[w * 3 + 2] = z;
    const g = 0.9 + gold * 0.08;
    col[w * 3] = g * bright;
    col[w * 3 + 1] = (0.86 + gold * 0.08) * bright;
    col[w * 3 + 2] = (0.78 + (1 - gold) * 0.14) * bright;
    sz[w] = size;
    tw[w] = twinkle;
    w++;
  };

  for (let i = 0; i < FIELD_N * 8 && w < FIELD_N; i++) {
    const p = zonePoint(i);
    if (!keep(p.x, p.y, i)) continue;
    const gold = hash(i, 11) < 0.45 ? 1 : 0;
    write(p.x, p.y, p.z, 3 + hash(i, 12) * 2, gold, 0.72 + hash(i, 13) * 0.22, hash(i, 14) * 6.2);
  }

  for (let i = 0; i < ANCHOR_N * 10 && w < FIELD_N + ANCHOR_N; i++) {
    const p = zonePoint(i + 900);
    if (inRam(p.x, p.y) || inTitle(p.x, p.y) || inStrip(p.x, p.y)) continue;
    if (Math.abs(p.x) < 5.5 && Math.abs(p.y) < 3.2) continue;
    write(p.x, p.y, p.z - 0.4, 4.6 + hash(i, 15) * 0.6, hash(i, 16) < 0.55 ? 1 : 0, 1.05, 0.8 + hash(i, 17) * 5);
  }

  const wispStart = w;
  for (let i = 0; i < WISP_N * 8 && w < wispStart + WISP_N; i++) {
    const p = zonePoint(i + 1700);
    if (inRam(p.x, p.y) && hash(i, 19) > 0.12) continue;
    if (inTitle(p.x, p.y) || inStrip(p.x, p.y)) continue;
    const violet = hash(i, 20) < 0.28;
    const gold = violet ? 0 : 1;
    write(
      p.x * 1.15,
      p.y * 1.1,
      p.z - 1.2 - hash(i, 21) * 2.4,
      9 + hash(i, 22) * 11,
      gold,
      violet ? 0.42 : 0.38,
      hash(i, 23) * 4,
    );
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("color", new BufferAttribute(col, 3));
  geo.setAttribute("aSize", new BufferAttribute(sz, 1));
  geo.setAttribute("aTwinkle", new BufferAttribute(tw, 1));
  geo.setDrawRange(0, w);
  return geo;
}
