/**
 * One-off: render public/favicon.svg to favicon-16.png, favicon-32.png and a
 * favicon.ico (PNG entries in an ICO directory). The outputs are committed;
 * re-run only when favicon.svg changes: `node scripts/make-favicons.mjs`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);
const svg = readFileSync(new URL("favicon.svg", publicDir));

async function png(size) {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

/** ICO container holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const png16 = await png(16);
const png32 = await png(32);
const png48 = await png(48);
writeFileSync(new URL("favicon-16.png", publicDir), png16);
writeFileSync(new URL("favicon-32.png", publicDir), png32);
writeFileSync(
  new URL("favicon.ico", publicDir),
  ico([
    { size: 16, data: png16 },
    { size: 32, data: png32 },
    { size: 48, data: png48 },
  ]),
);
console.log("wrote favicon-16.png, favicon-32.png, favicon.ico");
