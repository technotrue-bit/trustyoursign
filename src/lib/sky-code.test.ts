import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import jsQR from "jsqr";
import { encode } from "uqr";
import { SIGN_IDS } from "./chart/sign-canon.ts";
import { placeFromSearch, parseSkyPlaceSearch } from "./ui/skyPlace.ts";
import {
  SKY_CODE_ORIGIN,
  SKY_CODE_SIZE,
  ownChartForSkyCode,
  paintSkyCode,
  planSkyShare,
  skyCodeCaptions,
  skyCodeFileName,
  skyCodeFrame,
  skyCodeUrl,
} from "./sky-code.ts";

describe("sky code", () => {
  it("encodes the live inside-galaxy link for that sign", () => {
    const url = skyCodeUrl("sagittarius");
    assert.equal(url, `${SKY_CODE_ORIGIN}/?sign=sagittarius&galaxy=true`);
    const parsed = new URL(url);
    const place = placeFromSearch(
      parseSkyPlaceSearch({
        sign: parsed.searchParams.get("sign"),
        galaxy: parsed.searchParams.get("galaxy"),
      }),
    );
    assert.deepEqual(place, { kind: "inside", signId: "sagittarius", star: 0 });
  });

  it("names the download after the sign", () => {
    assert.equal(skyCodeFileName("leo"), "trust-your-sign-leo-sky.png");
  });

  it("uses the viewer's own chart, not someone else saved in the vault", () => {
    // listCharts returns newest first, so the first self row is the one to draw.
    const charts = [
      { id: "newer-other", relation: "other", signId: "pisces" },
      { id: "newest-self", relation: "self", signId: "sagittarius" },
      { id: "older-self", relation: "self", signId: "leo" },
    ];
    assert.equal(ownChartForSkyCode(charts)?.id, "newest-self");
    assert.equal(ownChartForSkyCode([{ id: "a", relation: "other" }]), null);
    assert.equal(ownChartForSkyCode([]), null);
  });

  it("keeps the name and caption off the code", () => {
    const paint = paintSkyCode("sagittarius");
    const { plate } = paint;
    assert.ok(plate.y >= SKY_CODE_SIZE.topBand);
    assert.ok(plate.y + plate.size <= paint.height - SKY_CODE_SIZE.bottomBand);
    for (const caption of skyCodeCaptions(paint)) {
      const above = caption.y < plate.y;
      const below = caption.y > plate.y + plate.size;
      assert.equal(above || below, true, caption.text);
    }
  });

  it("scans back to that sign's sky, and the frame changes with the sign", () => {
    const sag = paintSkyCode("sagittarius");
    const leo = paintSkyCode("leo");
    assert.equal(decode(sag), sag.url);
    assert.equal(decode(leo), leo.url);
    assert.equal(buffersDifferOutsidePlate(sag, leo), true);
    assert.deepEqual(paintSkyCode("sagittarius").rgba, sag.rgba);
  });

  it("opens a dedicated page from the account menu", () => {
    const src = join(dirname(fileURLToPath(import.meta.url)), "..");
    const menu = readFileSync(join(src, "components/overlay/AccountMenu.tsx"), "utf8");
    const account = readFileSync(join(src, "routes/account.tsx"), "utf8");
    const page = readFileSync(join(src, "routes/sky-code.tsx"), "utf8");
    const card = readFileSync(join(src, "components/overlay/SkyCodeCard.tsx"), "utf8");
    const skyCodeAt = menu.indexOf("Your sky code");
    const linkAt = menu.lastIndexOf("<Link", skyCodeAt);
    const profileAt = menu.indexOf("Profile", skyCodeAt);
    assert.ok(linkAt > 0 && skyCodeAt > linkAt && profileAt > skyCodeAt);
    const block = menu.slice(linkAt, profileAt);
    assert.match(block, /to="\/sky-code"/);
    assert.doesNotMatch(block, /hash="sky-code"/);
    assert.match(block, /Premium/);
    assert.match(page, /<SkyCodeSection/);
    assert.doesNotMatch(account, /SkyCodeSection/);
    assert.match(account, /to="\/sky-code"/);
    assert.match(account, /window\.location\.hash/);
    assert.match(card, /Place your birth first/);
    assert.match(card, /Save image/);
    assert.match(card, /skyCodeFrame/);
    assert.match(card, /paintSkyCode\(signId, framePixels\)/);
    assert.match(card, /aria-label="Share your sky code"/);
    assert.match(card, /navigator\.canShare\?\.\(\{ files: \[file\] \}\)/);
    assert.match(card, /navigator\.share\(\{ files: \[file\], title: plan\.title \}\)/);
    assert.match(card, /navigator\.share\(\{ title: plan\.title, url: plan\.url \}\)/);
    assert.match(card, /navigator\.share\(\{ title: urlPlan\.title, url: urlPlan\.url \}\)/);
  });

  it("shares the picture when the phone can, otherwise the sky link", () => {
    const url = skyCodeUrl("sagittarius");
    assert.deepEqual(
      planSkyShare({ signName: "Sagittarius", url, canShare: true, canShareFiles: true }),
      { kind: "file", title: "Sagittarius sky" },
    );
    assert.deepEqual(planSkyShare({ signName: "Leo", url, canShare: true, canShareFiles: false }), {
      kind: "url",
      title: "Leo sky",
      url,
    });
    assert.deepEqual(planSkyShare({ signName: "Leo", url, canShare: false, canShareFiles: true }), {
      kind: "copy",
      url,
    });
    assert.deepEqual(
      planSkyShare({ signName: "Leo", url, canShare: false, canShareFiles: false }),
      { kind: "copy", url },
    );
  });

  it("scans for every sign", () => {
    for (const id of SIGN_IDS) {
      const paint = paintSkyCode(id);
      assert.equal(paint.framed, false, id);
      assert.equal(decode(paint), skyCodeUrl(id), id);
    }
  });

  it("prints the sagittarius code inside the locked cream pad and leaves the surround alone", () => {
    const frame = skyCodeFrame("sagittarius");
    assert.ok(frame);
    assert.equal(frame.src, "/sky-code/sagittarius-frame.png");
    assert.equal(frame.pad.size / frame.width, 0.46);
    for (const id of SIGN_IDS) {
      if (id === "sagittarius") continue;
      assert.equal(skyCodeFrame(id), null, id);
    }

    const src = decodePng(
      readFileSync(
        join(
          dirname(fileURLToPath(import.meta.url)),
          "../../public/sky-code/sagittarius-frame.png",
        ),
      ),
    );
    assert.equal(src.width, frame.width);
    assert.equal(src.height, frame.height);
    assertCreamPad(src, frame.pad);

    const paint = paintSkyCode("sagittarius", src.rgba);
    assert.equal(paint.framed, true);
    assert.equal(paint.url, skyCodeUrl("sagittarius"));
    assert.deepEqual(paint.plate, frame.pad);
    assert.equal(skyCodeCaptions(paint).length, 0);
    assert.equal(decode(paint), paint.url);

    const { x: padX, y: padY, size } = frame.pad;
    let modules = 0;
    let art = 0;
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const i = (y * src.width + x) * 4;
        const inside = x >= padX && x < padX + size && y >= padY && y < padY + size;
        if (!inside) {
          if (
            paint.rgba[i] !== src.rgba[i] ||
            paint.rgba[i + 1] !== src.rgba[i + 1] ||
            paint.rgba[i + 2] !== src.rgba[i + 2] ||
            paint.rgba[i + 3] !== src.rgba[i + 3]
          ) {
            assert.fail(`surround pixel changed at ${x},${y}`);
          }
          if (src.rgba[i] !== 0x0c || src.rgba[i + 1] !== 0x0b || src.rgba[i + 2] !== 0x0a) art++;
          continue;
        }
        const changed =
          paint.rgba[i] !== src.rgba[i] ||
          paint.rgba[i + 1] !== src.rgba[i + 1] ||
          paint.rgba[i + 2] !== src.rgba[i + 2];
        if (!changed) continue;
        modules++;
        assert.equal(paint.rgba[i], 0x0c, `${x},${y}`);
        assert.equal(paint.rgba[i + 1], 0x0b);
        assert.equal(paint.rgba[i + 2], 0x0a);
      }
    }
    assert.ok(modules > 100, "modules were drawn in the pad");
    assert.ok(art > 1000, "title, plate, and stars stay outside the pad");

    const qr = encode(paint.url, { ecc: "H", border: 4 });
    const modulePx = Math.floor(size / qr.size);
    const drawn = qr.size * modulePx;
    const ox = padX + Math.floor((size - drawn) / 2);
    const oy = padY + Math.floor((size - drawn) / 2);
    assert.ok(modulePx >= 4);
    assert.ok(ox + drawn <= padX + size);
    assert.ok(oy + drawn <= padY + size);
    for (let row = 0; row < qr.size; row++) {
      for (let col = 0; col < qr.size; col++) {
        const quiet = row < 4 || col < 4 || row >= qr.size - 4 || col >= qr.size - 4;
        if (!quiet) continue;
        assert.equal(Boolean(qr.data[row]?.[col]), false, `quiet module ${col},${row}`);
        const i = ((oy + row * modulePx) * src.width + (ox + col * modulePx)) * 4;
        assert.equal(paint.rgba[i], src.rgba[i], `quiet ${col},${row}`);
        assert.equal(paint.rgba[i + 1], src.rgba[i + 1]);
        assert.equal(paint.rgba[i + 2], src.rgba[i + 2]);
      }
    }

    const leo = paintSkyCode("leo", src.rgba);
    assert.equal(leo.framed, false);
    assert.equal(leo.width, SKY_CODE_SIZE.width);
    assert.equal(decode(leo), leo.url);
    assert.ok(skyCodeCaptions(leo).some((caption) => caption.text === "Leo"));

    const fallback = paintSkyCode("sagittarius");
    assert.equal(fallback.framed, false);
    assert.equal(decode(fallback), fallback.url);
    assert.equal(paintSkyCode("sagittarius", new Uint8ClampedArray(16)).framed, false);
  });
});

function decode(paint: { rgba: Uint8ClampedArray; width: number; height: number }) {
  return jsQR(paint.rgba, paint.width, paint.height)?.data ?? null;
}

function assertCreamPad(
  src: { rgba: Uint8ClampedArray; width: number },
  pad: { x: number; y: number; size: number },
) {
  const cream = (x: number, y: number) => {
    const i = (y * src.width + x) * 4;
    assert.deepEqual(
      [src.rgba[i], src.rgba[i + 1], src.rgba[i + 2], src.rgba[i + 3]],
      [0xf5, 0xef, 0xe3, 255],
      `${x},${y}`,
    );
  };
  const ink = (x: number, y: number) => {
    const i = (y * src.width + x) * 4;
    assert.deepEqual(
      [src.rgba[i], src.rgba[i + 1], src.rgba[i + 2]],
      [0x0c, 0x0b, 0x0a],
      `${x},${y}`,
    );
  };
  cream(pad.x, pad.y);
  cream(pad.x + pad.size - 1, pad.y + pad.size - 1);
  cream(pad.x + Math.floor(pad.size / 2), pad.y + Math.floor(pad.size / 2));
  ink(pad.x - 1, pad.y + Math.floor(pad.size / 2));
  ink(pad.x + pad.size, pad.y + Math.floor(pad.size / 2));
  ink(pad.x + Math.floor(pad.size / 2), pad.y - 1);
  ink(pad.x + Math.floor(pad.size / 2), pad.y + pad.size);
}

/** RGBA PNG, 8-bit, no interlace. Enough for the locked surround. */
function decodePng(png: Buffer) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (pos < png.length) {
    const length = view.getUint32(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    const chunk = png.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      assert.equal(chunk[8], 8);
      assert.equal(chunk[9], 6);
      assert.equal(chunk[12], 0);
    } else if (type === "IDAT") {
      idat.push(chunk);
    } else if (type === "IEND") {
      break;
    }
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let i = 0;
  let prev = Buffer.alloc(stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[i++]!;
    const row = raw.subarray(i, i + stride);
    i += stride;
    const out = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? out[x - bpp]! : 0;
      const up = prev[x]!;
      const ul = x >= bpp ? prev[x - bpp]! : 0;
      const v = row[x]!;
      if (filter === 0) out[x] = v;
      else if (filter === 1) out[x] = (v + left) & 255;
      else if (filter === 2) out[x] = (v + up) & 255;
      else if (filter === 3) out[x] = (v + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) out[x] = (v + paeth(left, up, ul)) & 255;
      else assert.fail(`png filter ${filter}`);
    }
    rgba.set(out, y * stride);
    prev = out;
  }
  return { width, height, rgba };
}

function buffersDifferOutsidePlate(
  a: ReturnType<typeof paintSkyCode>,
  b: ReturnType<typeof paintSkyCode>,
): boolean {
  const { width } = a;
  const plate = a.plate;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= plate.x && x < plate.x + plate.size && y >= plate.y && y < plate.y + plate.size) {
        continue;
      }
      const i = (y * width + x) * 4;
      if (a.rgba[i] !== b.rgba[i] || a.rgba[i + 1] !== b.rgba[i + 1]) return true;
    }
  }
  return false;
}
