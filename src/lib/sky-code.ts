import { encode } from "uqr";
import { SIGN_CANON, signIndexOf } from "@/lib/chart/sign-canon";
import type { SignId } from "@/lib/chart/types";
import {
  CONSTELLATIONS,
  ELEMENT_TINT,
  constellationDust,
  type StarPt,
} from "@/lib/galaxy/constellations";

/**
 * A scan opens this person's sun-sign sky. Saved nativities have no public
 * share token — they stay on the signed-in account — so the code uses the
 * existing inside-galaxy deep link (`?sign=&galaxy=true`).
 *
 * The host is always the live site. A code saved from a preview must still
 * open trustyoursign.com.
 *
 * Sagittarius uses the locked surround (`public/sky-code/sagittarius-frame.png`).
 * The cream pad is empty in that cut; modules are stamped into the pad only.
 * Other signs keep the star-glyph frame until their own art exists.
 */
export const SKY_CODE_ORIGIN = "https://trustyoursign.com";

export const SKY_CODE_SIZE = {
  width: 1080,
  height: 1440,
  topBand: 220,
  bottomBand: 260,
} as const;

const INK = [0x0c, 0x0b, 0x0a] as const;
const CREAM = [0xef, 0xe8, 0xdc] as const;

export type SkyCodePaint = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  url: string;
  signId: SignId;
  signName: string;
  /** Inclusive pixel rect of the cream plate (quiet zone included). */
  plate: { x: number; y: number; size: number };
  /** True when the locked surround was composited. False uses the star glyph. */
  framed: boolean;
};

export type SkyCodeFrame = {
  src: string;
  width: number;
  height: number;
  /** Sharp cream square measured on the locked cut. Modules stay inside it. */
  pad: { x: number; y: number; size: number };
};

/**
 * Sagittarius display cut, 1200×1314.
 * Cream pad is 552×552 (46% of the width) at (324, 178) — #f5efe3, empty.
 * "Trust Your Sign" is already set in the art. Do not paint type over it.
 */
const SAGITTARIUS_FRAME: SkyCodeFrame = {
  src: "/sky-code/sagittarius-frame.png",
  width: 1200,
  height: 1314,
  pad: { x: 324, y: 178, size: 552 },
};

const SKY_CODE_FRAMES: Partial<Record<SignId, SkyCodeFrame>> = {
  sagittarius: SAGITTARIUS_FRAME,
};

/** Locked surround for this sign, or null when the star-glyph frame still applies. */
export function skyCodeFrame(signId: SignId): SkyCodeFrame | null {
  return SKY_CODE_FRAMES[signId] ?? null;
}

/** Newest chart saved as the viewer's own. Rows arrive newest first. */
export function ownChartForSkyCode<T extends { relation: string }>(charts: readonly T[]): T | null {
  return charts.find((chart) => chart.relation === "self") ?? null;
}

export type SkyCodeGate =
  | { kind: "loading" }
  | { kind: "draw"; signId: SignId; ownCount: number }
  | { kind: "empty" }
  | { kind: "retry" };

/**
 * What Your sky code should show.
 *
 * A saved chart marked as the viewer's own is drawn (newest first).
 * When there is none, the owner's own sky — the book the account menu calls
 * "The sky" — is drawn from that book's sun sign. Someone else's sky is not
 * used. Place a birth only when neither source exists. A failed read asks
 * to try again instead of claiming the birth is missing.
 */
export function skyCodeGate(input: {
  charts: ReadonlyArray<{ relation: string; signId: SignId }> | null;
  chartsFailed: boolean;
  /** `null` while the owner check is still out. */
  owner: boolean | null;
  /** The owner check failed, so we still do not know whether that sky exists. */
  ownerFailed?: boolean;
  /** `undefined` while that sky is still being read. `null` when it is not there. */
  ownSkySignId?: SignId | null;
  ownSkyFailed?: boolean;
}): SkyCodeGate {
  if (input.charts === null) return { kind: "loading" };

  const chart = ownChartForSkyCode(input.charts);
  if (chart) {
    const ownCount = input.charts.filter((row) => row.relation === "self").length;
    return { kind: "draw", signId: chart.signId, ownCount };
  }

  if (input.owner === null) return input.ownerFailed ? { kind: "retry" } : { kind: "loading" };
  if (input.owner) {
    if (input.ownSkyFailed) return { kind: "retry" };
    if (input.ownSkySignId === undefined) return { kind: "loading" };
    if (input.ownSkySignId) return { kind: "draw", signId: input.ownSkySignId, ownCount: 0 };
  }

  if (input.chartsFailed) return { kind: "retry" };
  return { kind: "empty" };
}

export function skyCodeUrl(signId: SignId): string {
  return `${SKY_CODE_ORIGIN}/?sign=${signId}&galaxy=true`;
}

export function skyCodeFileName(signId: SignId): string {
  return `trust-your-sign-${signId}-sky.png`;
}

/**
 * How to hand someone this sky.
 * A phone that can attach the picture uses the system share sheet with the
 * image. Otherwise the sheet gets the sky link. With no share sheet, the
 * link is copied so it can still be pasted into Messages, Mail, and the rest.
 */
export type SkySharePlan =
  | { kind: "file"; title: string }
  | { kind: "url"; title: string; url: string }
  | { kind: "copy"; url: string };

export function planSkyShare(input: {
  signName: string;
  url: string;
  canShare: boolean;
  canShareFiles: boolean;
}): SkySharePlan {
  const title = `${input.signName} sky`;
  if (input.canShare && input.canShareFiles) return { kind: "file", title };
  if (input.canShare) return { kind: "url", title, url: input.url };
  return { kind: "copy", url: input.url };
}

export function paintSkyCode(signId: SignId, framePixels?: Uint8ClampedArray | null): SkyCodePaint {
  const locked = skyCodeFrame(signId);
  if (locked && framePixels && framePixels.length === locked.width * locked.height * 4) {
    return paintLockedFrame(signId, locked, framePixels);
  }
  return paintGlyphFrame(signId);
}

/** Blit the locked surround, then stamp modules into the cream pad only. */
function paintLockedFrame(
  signId: SignId,
  frame: SkyCodeFrame,
  framePixels: Uint8ClampedArray,
): SkyCodePaint {
  const url = skyCodeUrl(signId);
  const rgba = new Uint8ClampedArray(framePixels);
  const { x, y, size } = frame.pad;
  stampQr(rgba, frame.width, x, y, size, url);
  return {
    width: frame.width,
    height: frame.height,
    rgba,
    url,
    signId,
    signName: SIGN_CANON[signId].name,
    plate: { x, y, size },
    framed: true,
  };
}

function paintGlyphFrame(signId: SignId): SkyCodePaint {
  const { width, height, topBand, bottomBand } = SKY_CODE_SIZE;
  const url = skyCodeUrl(signId);
  const signName = SIGN_CANON[signId].name;
  const rgba = new Uint8ClampedArray(width * height * 4);
  fillRect(rgba, width, 0, 0, width, height, INK);

  const cells = qrGrid(url).size;
  const side = 156;
  const roomW = width - side * 2;
  const roomH = height - topBand - bottomBand - 40;
  const modulePx = Math.max(8, Math.floor(Math.min(roomW, roomH) / cells));
  const plateSize = cells * modulePx;
  const plateX = Math.floor((width - plateSize) / 2);
  const plateY = topBand + Math.floor((height - topBand - bottomBand - plateSize) / 2);
  const pcx = plateX + plateSize / 2;
  const pcy = plateY + plateSize / 2;

  const tint = mix(
    CREAM,
    hexToRgb(ELEMENT_TINT[CONSTELLATIONS[signIndexOf(signId)]!.element]),
    0.42,
  );
  const dust = constellationDust(signIndexOf(signId), 72);
  for (const star of dust) {
    const x = pcx + (star.x / 6) * width * 0.46;
    const y = pcy + (star.y / 4) * (height - topBand - bottomBand) * 0.46;
    if (y < topBand + 12 || y > height - bottomBand - 12) continue;
    fillCircle(rgba, width, height, x, y, 1.2 + star.mag * 5, CREAM, 0.22 + star.mag * 1.4);
  }

  const constellation = CONSTELLATIONS[signIndexOf(signId)]!;
  const frame = mapGlyph(
    constellation.glyph.stars,
    constellation.glyph.lines,
    pcx,
    pcy,
    plateSize / 2 + 108,
  );
  for (const seg of frame.segs) {
    stroke(rgba, width, height, seg.x1, seg.y1, seg.x2, seg.y2, tint, 0.34);
  }
  for (const star of frame.pts) {
    fillCircle(
      rgba,
      width,
      height,
      star.x,
      star.y,
      2.2 + star.mag * 4.4,
      tint,
      0.45 + star.mag * 0.55,
    );
  }

  // Clean bands for the name and the caption. Stars stay in the middle.
  fillRect(rgba, width, 0, 0, width, topBand, INK);
  fillRect(rgba, width, 0, height - bottomBand, width, bottomBand, INK);

  fillRoundRect(rgba, width, height, plateX, plateY, plateSize, plateSize, 28, CREAM);
  stampQr(rgba, width, plateX, plateY, plateSize, url);

  return {
    width,
    height,
    rgba,
    url,
    signId,
    signName,
    plate: { x: plateX, y: plateY, size: plateSize },
    framed: false,
  };
}

function qrGrid(url: string) {
  return encode(url, { ecc: "H", border: 4 });
}

/** Dark modules only. Light modules stay whatever is already in the pad (cream). */
function stampQr(
  rgba: Uint8ClampedArray,
  width: number,
  plateX: number,
  plateY: number,
  plateSize: number,
  url: string,
) {
  const qr = qrGrid(url);
  const cells = qr.size;
  const modulePx = Math.floor(plateSize / cells);
  if (modulePx < 1) return;
  const drawn = cells * modulePx;
  const ox = plateX + Math.floor((plateSize - drawn) / 2);
  const oy = plateY + Math.floor((plateSize - drawn) / 2);
  for (let row = 0; row < cells; row++) {
    const line = qr.data[row];
    if (!line) continue;
    for (let col = 0; col < cells; col++) {
      if (!line[col]) continue;
      fillRect(rgba, width, ox + col * modulePx, oy + row * modulePx, modulePx, modulePx, INK);
    }
  }
}

export type SkyCodeCaption = {
  text: string;
  x: number;
  y: number;
  font: string;
  fill: string;
  tracking?: string;
};

/**
 * Type for the star-glyph frame. A locked surround already carries its title,
 * so captions stay empty — drawing them would cover the plate and the stars.
 */
export function skyCodeCaptions(
  paint: Pick<SkyCodePaint, "width" | "height" | "signId" | "signName" | "framed">,
): SkyCodeCaption[] {
  if (paint.framed) return [];
  const { width, height, signName } = paint;
  const month = SIGN_CANON[paint.signId].month;
  return [
    {
      text: "PREMIUM",
      x: width / 2,
      y: 86,
      font: "500 26px Outfit, ui-sans-serif, sans-serif",
      fill: "#8f877c",
      tracking: "0.32em",
    },
    {
      text: signName,
      x: width / 2,
      y: 168,
      font: "italic 500 84px Fraunces, Georgia, serif",
      fill: "#efe8dc",
    },
    {
      text: month,
      x: width / 2,
      y: height - 188,
      font: "400 28px Outfit, ui-sans-serif, sans-serif",
      fill: "#9a9186",
    },
    {
      text: "Scan to open this sky",
      x: width / 2,
      y: height - 128,
      font: "400 30px Outfit, ui-sans-serif, sans-serif",
      fill: "#efe8dc",
    },
    {
      text: "trustyoursign.com",
      x: width / 2,
      y: height - 76,
      font: "400 24px Outfit, ui-sans-serif, sans-serif",
      fill: "#8f877c",
      tracking: "0.08em",
    },
  ];
}

export function drawSkyCodeCaptions(ctx: CanvasRenderingContext2D, paint: SkyCodePaint): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const caption of skyCodeCaptions(paint)) {
    ctx.fillStyle = caption.fill;
    ctx.font = caption.font;
    ctx.letterSpacing = caption.tracking ?? "0px";
    if (caption.text === paint.signName) {
      let size = 84;
      const max = paint.width - 120;
      while (size > 48 && ctx.measureText(caption.text).width > max) {
        size -= 2;
        ctx.font = `italic 500 ${size}px Fraunces, Georgia, serif`;
      }
    }
    ctx.fillText(caption.text, caption.x, caption.y);
  }
  ctx.letterSpacing = "0px";
}

function mapGlyph(
  stars: StarPt[],
  lines: [number, number][],
  pcx: number,
  pcy: number,
  ring: number,
) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const star of stars) {
    minX = Math.min(minX, star.x);
    maxX = Math.max(maxX, star.x);
    minY = Math.min(minY, star.y);
    maxY = Math.max(maxY, star.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max(maxX - minX, maxY - minY) / 2 || 1;
  const map = (x: number, y: number) => ({
    x: pcx + ((x - cx) / half) * ring,
    y: pcy - ((y - cy) / half) * ring,
  });
  const pts = stars.map((star) => ({ ...map(star.x, star.y), mag: star.mag }));
  const segs = lines.flatMap(([a, b]) => {
    const from = pts[a];
    const to = pts[b];
    if (!from || !to) return [];
    return [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }];
  });
  return { pts, segs };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function idx(width: number, x: number, y: number) {
  return (y * width + x) * 4;
}

function fillRect(
  rgba: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: readonly [number, number, number],
) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(width, x + w);
  const y1 = Math.min(rgba.length / 4 / width, y + h);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const i = idx(width, px, py);
      rgba[i] = rgb[0];
      rgba[i + 1] = rgb[1];
      rgba[i + 2] = rgb[2];
      rgba[i + 3] = 255;
    }
  }
}

function fillRoundRect(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  rgb: readonly [number, number, number],
) {
  const r = Math.min(radius, w / 2, h / 2);
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      if (!inRoundRect(px + 0.5, py + 0.5, x, y, w, h, r)) continue;
      const i = idx(width, px, py);
      rgba[i] = rgb[0];
      rgba[i + 1] = rgb[1];
      rgba[i + 2] = rgb[2];
      rgba[i + 3] = 255;
    }
  }
}

function inRoundRect(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const dx = px < x + r ? x + r - px : px > x + w - r ? px - (x + w - r) : 0;
  const dy = py < y + r ? y + r - py : py > y + h - r ? py - (y + h - r) : 0;
  return dx * dx + dy * dy <= r * r;
}

function fillCircle(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  rgb: readonly [number, number, number],
  alpha: number,
) {
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const d = (px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2;
      if (d > r2) continue;
      const edge = 1 - Math.sqrt(d) / radius;
      blend(rgba, width, px, py, rgb, Math.min(1, alpha * (0.4 + 0.6 * edge)));
    }
  }
}

function stroke(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  alpha: number,
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    blend(rgba, width, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), rgb, alpha);
  }
}

function blend(
  rgba: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rgb: readonly [number, number, number],
  alpha: number,
) {
  if (x < 0 || y < 0 || x >= width) return;
  const i = idx(width, x, y);
  if (i < 0 || i + 3 >= rgba.length) return;
  const a = Math.max(0, Math.min(1, alpha));
  rgba[i] = rgba[i]! * (1 - a) + rgb[0] * a;
  rgba[i + 1] = rgba[i + 1]! * (1 - a) + rgb[1] * a;
  rgba[i + 2] = rgba[i + 2]! * (1 - a) + rgb[2] * a;
  rgba[i + 3] = 255;
}
