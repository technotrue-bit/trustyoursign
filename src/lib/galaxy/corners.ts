import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from "three";
import { TEMPLE_SIGNS } from "./temple";

const PER = 400;
const BULGE_N = 24;
const ARM_N = 216;
const STAR_N = PER - BULGE_N - ARM_N;
export const CORNER_N = PER * 4;

function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uMaxSize;
uniform float uMix;
uniform float uFade[4];
uniform vec3 uColorA[4];
uniform vec3 uColorB[4];
attribute float aSize;
attribute vec3 aColor;
attribute float aSeed;
attribute float aCorner;
attribute float aKind;
varying vec3 vColor;
varying float vAlpha;
void main() {
  int c = int(aCorner + 0.5);
  vec3 palA = uColorA[0];
  vec3 palB = uColorB[0];
  float fade = uFade[0];
  if (c == 1) { palA = uColorA[1]; palB = uColorB[1]; fade = uFade[1]; }
  else if (c == 2) { palA = uColorA[2]; palB = uColorB[2]; fade = uFade[2]; }
  else if (c == 3) { palA = uColorA[3]; palB = uColorB[3]; fade = uFade[3]; }
  vec3 pal = mix(palA, palB, clamp(uMix, 0.0, 1.0));
  vColor = mix(pal, aColor, 0.22);
  float tw = 1.0;
  if (aKind < 0.5) {
    tw = 0.82 + 0.18 * sin(uTime * 0.42 + aSeed);
  }
  vAlpha = fade * tw * (aKind > 1.5 ? 0.55 : aKind > 0.5 ? 0.42 : 0.7);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(1.0, -mv.z);
  float px = aSize * uPixelRatio * (140.0 / dist);
  gl_PointSize = clamp(px, 1.4, uMaxSize);
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  float alpha = (1.0 - d) * (1.0 - d) * vAlpha;
  if (alpha < 0.016) discard;
  gl_FragColor = vec4(vColor * alpha, alpha);
}
`;

export function makeCornerMaterial() {
  const fade = [1, 1, 1, 1];
  const colorA = [new Color("#e8c49a"), new Color("#f0d4c6"), new Color("#fff4dc"), new Color("#c4a06a")];
  const colorB = colorA.map((c) => c.clone());
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uMaxSize: { value: 9 },
      uMix: { value: 1 },
      uFade: { value: fade },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    fog: false,
    toneMapped: false,
  });
}

export function paletteForSign(index: number) {
  const s = TEMPLE_SIGNS[((index % 12) + 12) % 12]!;
  return {
    a: [
      new Color(s.palette.accent),
      new Color(s.palette.particle),
      new Color(s.palette.chest),
      new Color(s.palette.accent).lerp(new Color(s.palette.particle), 0.45),
    ],
    b: [
      new Color(s.palette.chest),
      new Color(s.palette.accent),
      new Color(s.palette.particle),
      new Color("#c9d4ff").lerp(new Color(s.palette.chest), 0.55),
    ],
  };
}

export function buildCornerGalaxies() {
  const n = CORNER_N;
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const col = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const corner = new Float32Array(n);
  const kind = new Float32Array(n);

  const seats: [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];

  let w = 0;
  const write = (
    x: number,
    y: number,
    z: number,
    s: number,
    rgb: [number, number, number],
    c: number,
    k: number,
    sd: number,
  ) => {
    pos[w * 3] = x;
    pos[w * 3 + 1] = y;
    pos[w * 3 + 2] = z;
    size[w] = s;
    col[w * 3] = rgb[0];
    col[w * 3 + 1] = rgb[1];
    col[w * 3 + 2] = rgb[2];
    seed[w] = sd;
    corner[w] = c;
    kind[w] = k;
    w++;
  };

  for (let c = 0; c < 4; c++) {
    const ox = seats[c]![0] * 11.6;
    const oy = seats[c]![1] * 6.35;
    const oz = -16.8;
    const tilt = (c * 0.37 + 0.2) % 1;

    for (let i = 0; i < BULGE_N; i++) {
      const a = hash(i + c * 17, 1) * Math.PI * 2;
      const r = Math.pow(hash(i, 2), 0.6) * 1.15;
      write(
        ox + Math.cos(a) * r,
        oy + Math.sin(a) * r * 0.72,
        oz + (hash(i, 3) - 0.5) * 0.4,
        7.2 + hash(i, 4) * 3.4,
        [1, 0.9, 0.72],
        c,
        2,
        hash(i, 5) * 6.28,
      );
    }
    for (let i = 0; i < ARM_N; i++) {
      const arm = i % 4;
      const u = hash(i + c * 31, 6);
      const theta = u * 3.2;
      const r = 0.55 * Math.exp(0.28 * theta);
      const ang = theta + arm * 1.5708 + tilt;
      const jx = (hash(i, 7) - 0.5) * 0.55;
      const jy = (hash(i, 8) - 0.5) * 0.5;
      write(
        ox + Math.cos(ang) * r + jx,
        oy + Math.sin(ang) * r * 0.7 + jy,
        oz + (hash(i, 9) - 0.5) * 0.55,
        2.1 + hash(i, 10) * 1.4,
        [0.85 + hash(i, 11) * 0.12, 0.82, 0.7 + hash(i, 12) * 0.2],
        c,
        1,
        hash(i, 13) * 6.28,
      );
    }
    for (let i = 0; i < STAR_N; i++) {
      const a = hash(i + c * 53, 14) * Math.PI * 2;
      const r = 1.6 + hash(i, 15) * 3.4;
      write(
        ox + Math.cos(a) * r,
        oy + Math.sin(a) * r * 0.78,
        oz + (hash(i, 16) - 0.5) * 1.2,
        1.15 + hash(i, 17) * 1.1,
        [0.92, 0.9, 0.86],
        c,
        0,
        hash(i, 18) * 6.28,
      );
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  geo.setAttribute("aColor", new BufferAttribute(col, 3));
  geo.setAttribute("aSeed", new BufferAttribute(seed, 1));
  geo.setAttribute("aCorner", new BufferAttribute(corner, 1));
  geo.setAttribute("aKind", new BufferAttribute(kind, 1));
  geo.setDrawRange(0, w);
  return geo;
}
