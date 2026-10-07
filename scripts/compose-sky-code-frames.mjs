#!/usr/bin/env node
/**
 * Build sky-code cards for every sign that already has a site plate.
 *
 * Sagittarius keeps its locked cut (`public/sky-code/sagittarius-frame.png`):
 * wordmark, empty cream pad, stars, and the archer. This script copies that
 * cut, clears the archer's window, and sets each other sign's plate
 * (`assets/sign-plates/{sign}.png`) into the window. It does not draw new
 * pictures and it does not replace the Sagittarius file.
 *
 * A sign with no plate is skipped and named on stdout.
 *
 *   node scripts/compose-sky-code-frames.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync, crc32 } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SHELL = `${ROOT}public/sky-code/sagittarius-frame.png`;
const PLATES = `${ROOT}assets/sign-plates/`;
const OUT = `${ROOT}public/sky-code/`;

/** Aries-first. Sagittarius is the shell, not a plate composite. */
const PLATE_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "capricorn",
  "aquarius",
  "pisces",
];

/** Measured on the locked cut. Modules are stamped here later; leave it cream. */
const PAD = { x: 324, y: 178, size: 552 };
/** Below the pad. The archer occupies this band; plates sit inside it. */
const FIGURE = { y: 748, slotX: 210, slotY: 756, slotW: 780, slotH: 520 };

function decodePng(png) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < png.length) {
    const length = view.getUint32(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    const chunk = png.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      colorType = chunk[9];
    } else if (type === "IDAT") idat.push(chunk);
    else if (type === "IEND") break;
  }
  if (colorType !== 6 && colorType !== 2) throw new Error(`unsupported png color ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let i = 0;
  let prev = Buffer.alloc(stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[i++];
    const row = raw.subarray(i, i + stride);
    i += stride;
    const out = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = prev[x];
      const ul = x >= channels ? prev[x - channels] : 0;
      const v = row[x];
      if (filter === 0) out[x] = v;
      else if (filter === 1) out[x] = (v + left) & 255;
      else if (filter === 2) out[x] = (v + up) & 255;
      else if (filter === 3) out[x] = (v + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) out[x] = (v + paeth(left, up, ul)) & 255;
      else throw new Error(`png filter ${filter}`);
    }
    if (channels === 4) rgba.set(out, y * width * 4);
    else {
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4;
        rgba[o] = out[x * 3];
        rgba[o + 1] = out[x * 3 + 1];
        rgba[o + 2] = out[x * 3 + 2];
        rgba[o + 3] = 255;
      }
    }
    prev = out;
  }
  return { width, height, rgba };
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0);
  return Buffer.concat([len, name, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (width * 4 + 1);
    raw[o] = 0;
    for (let x = 0; x < width * 4; x++) raw[o + 1 + x] = rgba[y * width * 4 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function opaqueBounds(img) {
  let minX = img.width;
  let maxX = 0;
  let minY = img.height;
  let maxY = 0;
  let count = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.rgba[(y * img.width + x) * 4 + 3] < 12) continue;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (count < 100) return null;
  return { minX, minY, maxX, maxY };
}

function clearedShell(frame) {
  const base = new Uint8ClampedArray(frame.rgba);
  for (let y = FIGURE.y; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const i = (y * frame.width + x) * 4;
      base[i] = 0x0c;
      base[i + 1] = 0x0b;
      base[i + 2] = 0x0a;
      base[i + 3] = 255;
    }
  }
  return base;
}

function compositePlate(base, frame, plate) {
  const bounds = opaqueBounds(plate);
  if (!bounds) return false;
  const bw = bounds.maxX - bounds.minX + 1;
  const bh = bounds.maxY - bounds.minY + 1;
  const scale = Math.min(FIGURE.slotW / bw, FIGURE.slotH / bh);
  const dw = bw * scale;
  const dh = bh * scale;
  const ox = FIGURE.slotX + (FIGURE.slotW - dw) / 2;
  const oy = FIGURE.slotY + (FIGURE.slotH - dh) / 2;
  const src = plate.rgba;
  const sw = plate.width;
  for (let y = 0; y < Math.ceil(dh); y++) {
    const dy = Math.floor(oy + y);
    if (dy < FIGURE.y || dy >= frame.height) continue;
    for (let x = 0; x < Math.ceil(dw); x++) {
      const dx = Math.floor(ox + x);
      if (dx < 0 || dx >= frame.width) continue;
      const sx = bounds.minX + (x + 0.5) / scale;
      const sy = bounds.minY + (y + 0.5) / scale;
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(plate.height - 1, Math.floor(sy)));
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(plate.height - 1, y0 + 1);
      const tx = Math.min(1, Math.max(0, sx - x0));
      const ty = Math.min(1, Math.max(0, sy - y0));
      const at = (xx, yy) => (yy * sw + xx) * 4;
      const i00 = at(x0, y0);
      const i10 = at(x1, y0);
      const i01 = at(x0, y1);
      const i11 = at(x1, y1);
      const mix = (k) =>
        src[i00 + k] * (1 - tx) * (1 - ty) +
        src[i10 + k] * tx * (1 - ty) +
        src[i01 + k] * (1 - tx) * ty +
        src[i11 + k] * tx * ty;
      const a = mix(3) / 255;
      if (a < 0.004) continue;
      const i = (dy * frame.width + dx) * 4;
      for (let k = 0; k < 3; k++) base[i + k] = Math.round(base[i + k] * (1 - a) + mix(k) * a);
      base[i + 3] = 255;
    }
  }
  return true;
}

function assertCreamPad(rgba, width) {
  const cream = (x, y) => {
    const i = (y * width + x) * 4;
    return rgba[i] === 0xf5 && rgba[i + 1] === 0xef && rgba[i + 2] === 0xe3 && rgba[i + 3] === 255;
  };
  if (!cream(PAD.x, PAD.y)) throw new Error("cream pad corner moved");
  if (!cream(PAD.x + PAD.size - 1, PAD.y + PAD.size - 1)) throw new Error("cream pad corner moved");
  if (!cream(PAD.x + Math.floor(PAD.size / 2), PAD.y + Math.floor(PAD.size / 2))) {
    throw new Error("cream pad center moved");
  }
}

const frame = decodePng(readFileSync(SHELL));
const shell = clearedShell(frame);
const skipped = [];
const written = [];

for (const id of PLATE_SIGNS) {
  const platePath = `${PLATES}${id}.png`;
  if (!existsSync(platePath)) {
    skipped.push(id);
    continue;
  }
  const plate = decodePng(readFileSync(platePath));
  const card = new Uint8ClampedArray(shell);
  if (!compositePlate(card, frame, plate)) {
    skipped.push(id);
    continue;
  }
  assertCreamPad(card, frame.width);
  const png = encodePng(frame.width, frame.height, card);
  writeFileSync(`${OUT}${id}-frame.png`, png);
  written.push(id);
  console.log(`${id} -> public/sky-code/${id}-frame.png  ${(png.length / 1024).toFixed(0)}KiB`);
}

console.log(`composed ${written.length}: ${written.join(", ") || "(none)"}`);
if (skipped.length) console.log(`skipped (no plate): ${skipped.join(", ")}`);
