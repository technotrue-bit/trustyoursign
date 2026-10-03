import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import { SIGN_IDS } from "./chart/sign-canon.ts";
import { placeFromSearch, parseSkyPlaceSearch } from "./ui/skyPlace.ts";
import {
  SKY_CODE_ORIGIN,
  SKY_CODE_SIZE,
  ownChartForSkyCode,
  paintSkyCode,
  skyCodeCaptions,
  skyCodeFileName,
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

  it("sits in the account menu and on the account page", () => {
    const src = join(dirname(fileURLToPath(import.meta.url)), "..");
    const menu = readFileSync(join(src, "components/overlay/AccountMenu.tsx"), "utf8");
    const account = readFileSync(join(src, "routes/account.tsx"), "utf8");
    const card = readFileSync(join(src, "components/overlay/SkyCodeCard.tsx"), "utf8");
    const skyCodeAt = menu.indexOf("Your sky code");
    const linkAt = menu.lastIndexOf("<Link", skyCodeAt);
    const profileAt = menu.indexOf("Profile", skyCodeAt);
    assert.ok(linkAt > 0 && skyCodeAt > linkAt && profileAt > skyCodeAt);
    const block = menu.slice(linkAt, profileAt);
    assert.match(block, /hash="sky-code"/);
    assert.match(block, /Premium/);
    assert.match(account, /<SkyCodeSection/);
    assert.match(card, /id="sky-code"/);
    assert.match(card, /Save image/);
  });

  it("scans for every sign", () => {
    for (const id of SIGN_IDS) {
      const paint = paintSkyCode(id);
      assert.equal(decode(paint), skyCodeUrl(id), id);
    }
  });
});

function decode(paint: { rgba: Uint8ClampedArray; width: number; height: number }) {
  return jsQR(paint.rgba, paint.width, paint.height)?.data ?? null;
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
