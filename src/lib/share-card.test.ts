import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeDailySky } from "./chart/daily-sky.ts";
import {
  SHARE_FORMATS,
  bigThreeCard,
  bigThreeFromLons,
  dailySkyCard,
  shareCardFileName,
  type CardLayout,
} from "./share-card.ts";

const day = composeDailySky({
  signId: "scorpio",
  dateKey: "2026-10-26",
  phaseName: "Full Moon",
  phaseAngle: 180,
  illumination: 0.99,
  moonSignId: "taurus",
  sunSignId: "scorpio",
  nextMoon: null,
});

function texts(card: CardLayout): string[] {
  return card.items.flatMap((item) => (item.kind === "text" ? [item.text] : []));
}

describe("share card formats", () => {
  it("are the sizes TikTok and Instagram expect", () => {
    assert.deepEqual(SHARE_FORMATS.story, { width: 1080, height: 1920 });
    assert.deepEqual(SHARE_FORMATS.post, { width: 1080, height: 1350 });
  });
});

describe("bigThreeFromLons", () => {
  it("reads sun, moon and rising signs from longitudes", () => {
    assert.deepEqual(bigThreeFromLons({ sun: 125, moon: 335, asc: 160 }), {
      sun: "leo",
      moon: "pisces",
      rising: "virgo",
    });
  });

  it("is null without a rising, since a Big Three needs the birth time", () => {
    assert.equal(bigThreeFromLons({ sun: 125, moon: 335, asc: null }), null);
  });
});

describe("bigThreeCard", () => {
  const three = { sun: "leo", moon: "pisces", rising: "virgo" } as const;

  for (const format of ["story", "post"] as const) {
    it(`lays out the three signs in order on a ${format}`, () => {
      const card = bigThreeCard(three, format);
      assert.equal(card.width, SHARE_FORMATS[format].width);
      assert.equal(card.height, SHARE_FORMATS[format].height);
      const t = texts(card);
      const order = ["Leo", "Pisces", "Virgo"].map((name) => t.indexOf(name));
      assert.ok(order.every((i) => i >= 0), t.join(" | "));
      assert.deepEqual([...order].sort((a, b) => a - b), order);
      assert.ok(t.includes("SUN") && t.includes("MOON") && t.includes("RISING"));
      assert.ok(t.includes("trustyoursign.com"));
    });

    it(`keeps every line inside the app-safe area on a ${format}`, () => {
      const card = bigThreeCard(three, format);
      for (const item of card.items) {
        if (item.kind !== "text") continue;
        assert.ok(item.y >= card.safe.top && item.y <= card.safe.bottom, `${item.text} at ${item.y}`);
        assert.ok(item.maxWidth <= card.width - 2 * card.safe.side, item.text);
      }
    });
  }

  it("carries no birth date, time or place", () => {
    const t = texts(bigThreeCard(three, "story")).join(" ");
    assert.doesNotMatch(t, /\d{1,2}:\d{2}|\b(19|20)\d{2}\b/);
  });
});

describe("dailySkyCard", () => {
  it("shows the sign, the Moon, today's reading and the date", () => {
    const card = dailySkyCard(day, "story", "Monday, October 26");
    const t = texts(card);
    assert.ok(t.includes("Scorpio"));
    assert.ok(t.some((line) => line.includes("Full Moon") && line.includes("Taurus")));
    assert.ok(t.includes(day.headline));
    assert.ok(t.includes(day.body));
    assert.ok(t.some((line) => line.toUpperCase().includes("MONDAY, OCTOBER 26")));
    assert.ok(card.items.some((item) => item.kind === "moon"));
  });

  it("keeps every line inside the app-safe area", () => {
    for (const format of ["story", "post"] as const) {
      const card = dailySkyCard(day, format, "Monday, October 26");
      for (const item of card.items) {
        if (item.kind !== "text") continue;
        assert.ok(item.y >= card.safe.top && item.y <= card.safe.bottom, `${format} ${item.text}`);
      }
    }
  });
});

describe("shareCardFileName", () => {
  it("names the file after what it shows", () => {
    assert.equal(shareCardFileName("big-three", "leo", "story"), "trust-your-sign-leo-big-three-story.png");
    assert.equal(shareCardFileName("today", "scorpio", "post"), "trust-your-sign-scorpio-today-post.png");
  });
});
