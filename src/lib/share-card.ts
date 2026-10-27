import type { DailySky } from "@/lib/chart/daily-sky";
import { SIGN_CANON, signIndexOf, signName } from "@/lib/chart/sign-canon";
import { signFromLon } from "@/lib/chart/ephemeris";
import type { SignId } from "@/lib/chart/types";
import { CONSTELLATIONS, ELEMENT_TINT, constellationDust } from "@/lib/galaxy/constellations";

/**
 * Picture cards to post: the Big Three and today's sky, sized for Stories,
 * Reels and TikTok (9:16) and for a feed post (4:5).
 *
 * Layout is pure (positions, type, copy) so it can be tested without a
 * canvas. `paintShareCard` draws a layout onto a 2D context in the browser.
 * A card never carries a birth date, time or place — only signs.
 *
 * Shared the same way as the sky code: the picture alone. The link stays on
 * the page (docs/agent-seams.md).
 */

export type ShareFormat = "story" | "post";

export const SHARE_FORMATS: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
};

/**
 * Text stays out of the bands where Stories and TikTok draw their own
 * buttons, captions and profile row.
 */
const SAFE: Record<ShareFormat, { top: number; bottom: number; side: number }> = {
  story: { top: 260, bottom: 1600, side: 120 },
  post: { top: 90, bottom: 1260, side: 96 },
};

const INK = "#0c0b0a";
const CREAM = "#efe8dc";
const MUTED = "#a59d91";
const QUIET = "#8f877c";

export type FontSpec = {
  family: "display" | "sans";
  size: number;
  weight: 300 | 400 | 500;
  italic?: boolean;
};

export type TextItem = {
  kind: "text";
  text: string;
  x: number;
  /** Baseline for one line. A wrapped block is centred on it. */
  y: number;
  font: FontSpec;
  color: string;
  maxWidth: number;
  maxLines: number;
  /** Letter spacing in em. */
  tracking?: number;
  lineHeight?: number;
};

export type RuleItem = { kind: "rule"; x: number; y: number; width: number; color: string };

export type MoonItem = { kind: "moon"; x: number; y: number; r: number; phaseAngle: number };

export type CardItem = TextItem | RuleItem | MoonItem;

export type CardLayout = {
  width: number;
  height: number;
  safe: { top: number; bottom: number; side: number };
  /** Hex glow colour behind the type. */
  tint: string;
  /** Constellation drawn faintly behind the card. */
  backdrop: SignId;
  items: CardItem[];
};

export type BigThree = { sun: SignId; moon: SignId; rising: SignId };

/** A Big Three needs a rising sign, which needs the birth time. */
export function bigThreeFromLons(lons: {
  sun: number;
  moon: number;
  asc: number | null | undefined;
}): BigThree | null {
  if (lons.asc == null || !Number.isFinite(lons.asc)) return null;
  return {
    sun: signFromLon(lons.sun).id,
    moon: signFromLon(lons.moon).id,
    rising: signFromLon(lons.asc).id,
  };
}

export function shareCardFileName(
  kind: "big-three" | "today",
  signId: SignId,
  format: ShareFormat,
): string {
  return `trust-your-sign-${signId}-${kind}-${format}.png`;
}

function tintOf(signId: SignId): string {
  return ELEMENT_TINT[SIGN_CANON[signId].element];
}

function essenceOf(signId: SignId): string {
  return CONSTELLATIONS[signIndexOf(signId)]?.essence ?? "";
}

function text(
  value: string,
  x: number,
  y: number,
  font: FontSpec,
  color: string,
  maxWidth: number,
  extra: Partial<Pick<TextItem, "maxLines" | "tracking" | "lineHeight">> = {},
): TextItem {
  return { kind: "text", text: value, x, y, font, color, maxWidth, maxLines: 1, ...extra };
}

export function bigThreeCard(three: BigThree, format: ShareFormat): CardLayout {
  const { width, height } = SHARE_FORMATS[format];
  const safe = SAFE[format];
  const cx = width / 2;
  const story = format === "story";
  const inner = width - safe.side * 2;

  const rows: { label: string; signId: SignId }[] = [
    { label: "SUN", signId: three.sun },
    { label: "MOON", signId: three.moon },
    { label: "RISING", signId: three.rising },
  ];
  const centres = story ? [640, 1000, 1360] : [380, 680, 980];
  const nameSize = story ? 132 : 112;

  const items: CardItem[] = [
    text("MY BIG THREE", cx, story ? 340 : 150, { family: "sans", size: story ? 30 : 26, weight: 500 }, QUIET, inner, {
      tracking: 0.34,
    }),
  ];
  rows.forEach((row, i) => {
    const yc = centres[i]!;
    items.push(
      text(row.label, cx, yc - (story ? 100 : 84), { family: "sans", size: story ? 26 : 24, weight: 500 }, tintOf(row.signId), inner, {
        tracking: 0.3,
      }),
      text(signName(row.signId), cx, yc + 10, { family: "display", size: nameSize, weight: 500, italic: true }, CREAM, inner),
      text(essenceOf(row.signId), cx, yc + (story ? 92 : 76), { family: "sans", size: story ? 32 : 28, weight: 300 }, MUTED, Math.min(inner, 820), {
        maxLines: 2,
        lineHeight: 1.35,
      }),
    );
    if (i < rows.length - 1) {
      items.push({ kind: "rule", x: cx, y: (yc + centres[i + 1]!) / 2 + (story ? 30 : 26), width: 72, color: CREAM });
    }
  });
  items.push(
    text("trustyoursign.com", cx, story ? 1560 : 1240, { family: "sans", size: story ? 28 : 24, weight: 400 }, QUIET, inner, {
      tracking: 0.12,
    }),
  );

  return { width, height, safe, tint: tintOf(three.sun), backdrop: three.sun, items };
}

/** `dateLabel` is the viewer's local date in words, e.g. "Monday, October 26". */
export function dailySkyCard(day: DailySky, format: ShareFormat, dateLabel: string): CardLayout {
  const { width, height } = SHARE_FORMATS[format];
  const safe = SAFE[format];
  const cx = width / 2;
  const story = format === "story";
  const inner = width - safe.side * 2;
  const lit = Math.round(day.illumination * 100);
  const colX = [cx - inner / 4 - 8, cx + inner / 4 + 8];
  const colW = inner / 2 - 24;

  const at = story
    ? { kicker: 320, date: 370, name: 530, moon: 660, moonLine: 762, head: 905, body: 1100, label: 1300, value: 1356, phase: 1466, foot: 1560 }
    : { kicker: 120, date: 162, name: 290, moon: 382, moonLine: 460, head: 565, body: 720, label: 890, value: 940, phase: 1060, foot: 1240 };

  const items: CardItem[] = [
    text("TODAY’S SKY", cx, at.kicker, { family: "sans", size: story ? 30 : 26, weight: 500 }, QUIET, inner, { tracking: 0.34 }),
    text(dateLabel.toUpperCase(), cx, at.date, { family: "sans", size: story ? 24 : 22, weight: 400 }, QUIET, inner, { tracking: 0.22 }),
    text(day.signName, cx, at.name, { family: "display", size: story ? 150 : 124, weight: 500, italic: true }, CREAM, inner),
    { kind: "moon", x: cx, y: at.moon, r: story ? 44 : 34, phaseAngle: day.phaseAngle },
    text(`${day.phaseName} in ${day.moonSignName} · ${lit}% lit`, cx, at.moonLine, { family: "sans", size: story ? 30 : 26, weight: 400 }, tintOf(day.moonSignId), inner, {
      tracking: 0.04,
    }),
    text(day.headline, cx, at.head, { family: "display", size: story ? 72 : 60, weight: 500, italic: true }, CREAM, Math.min(inner, 860), {
      maxLines: 2,
      lineHeight: 1.12,
    }),
    text(day.body, cx, at.body, { family: "sans", size: story ? 36 : 31, weight: 300 }, MUTED, Math.min(inner, 820), {
      maxLines: 4,
      lineHeight: 1.42,
    }),
    text("LEAN INTO", colX[0]!, at.label, { family: "sans", size: story ? 22 : 20, weight: 500 }, tintOf(day.signId), colW, { tracking: 0.28 }),
    text(day.leanInto, colX[0]!, at.value, { family: "display", size: story ? 40 : 34, weight: 400, italic: true }, CREAM, colW, {
      maxLines: 2,
      lineHeight: 1.15,
    }),
    text("GO EASY ON", colX[1]!, at.label, { family: "sans", size: story ? 22 : 20, weight: 500 }, tintOf(day.signId), colW, { tracking: 0.28 }),
    text(day.goEasy, colX[1]!, at.value, { family: "display", size: story ? 40 : 34, weight: 400, italic: true }, CREAM, colW, {
      maxLines: 2,
      lineHeight: 1.15,
    }),
    text(day.phaseLine, cx, at.phase, { family: "sans", size: story ? 26 : 24, weight: 300 }, QUIET, Math.min(inner, 800), {
      maxLines: 2,
      lineHeight: 1.4,
    }),
    text("trustyoursign.com/today", cx, at.foot, { family: "sans", size: story ? 28 : 24, weight: 400 }, QUIET, inner, { tracking: 0.12 }),
  ];

  return { width, height, safe, tint: tintOf(day.signId), backdrop: day.signId, items };
}

/* ── Browser painting ─────────────────────────────────────────────── */

const FAMILY = {
  display: "Fraunces, Georgia, serif",
  sans: "Outfit, ui-sans-serif, system-ui, sans-serif",
} as const;

function fontString(font: FontSpec, size = font.size): string {
  return `${font.italic ? "italic " : ""}${font.weight} ${size}px ${FAMILY[font.family]}`;
}

/** Fonts a card uses, for `document.fonts.load` before painting. */
export const SHARE_CARD_FONTS = [
  "italic 500 120px Fraunces",
  "italic 400 40px Fraunces",
  "300 32px Outfit",
  "400 28px Outfit",
  "500 28px Outfit",
];

function hexToRgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function wrap(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Shrink until the text fits its lines, down to 70% of the set size. */
function fit(ctx: CanvasRenderingContext2D, item: TextItem): { lines: string[]; size: number } {
  const min = Math.floor(item.font.size * 0.7);
  for (let size = item.font.size; size >= min; size -= 2) {
    ctx.font = fontString(item.font, size);
    ctx.letterSpacing = `${(item.tracking ?? 0) * size}px`;
    const lines = item.maxLines === 1 ? [item.text] : wrap(ctx, item.text, item.maxWidth);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= item.maxLines && widest <= item.maxWidth) return { lines, size };
  }
  ctx.font = fontString(item.font, min);
  ctx.letterSpacing = `${(item.tracking ?? 0) * min}px`;
  return { lines: wrap(ctx, item.text, item.maxWidth).slice(0, item.maxLines), size: min };
}

function paintBackdrop(ctx: CanvasRenderingContext2D, card: CardLayout) {
  const { width: w, height: h } = card;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, h * 0.62);
  glow.addColorStop(0, hexToRgba(card.tint, 0.2));
  glow.addColorStop(0.55, hexToRgba(card.tint, 0.05));
  glow.addColorStop(1, hexToRgba(card.tint, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const index = signIndexOf(card.backdrop);
  for (const star of constellationDust(index, 160)) {
    const x = w / 2 + (star.x / 5.6) * w * 0.5;
    const y = h / 2 + (star.y / 3.5) * h * 0.5;
    ctx.fillStyle = hexToRgba(CREAM, Math.min(0.6, 0.15 + star.mag * 1.6));
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + star.mag * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // The sign's real constellation, faint, high on the card.
  const figure = CONSTELLATIONS[index];
  if (figure && figure.stars.length > 0) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of figure.stars) {
      minX = Math.min(minX, s.x);
      maxX = Math.max(maxX, s.x);
      minY = Math.min(minY, s.y);
      maxY = Math.max(maxY, s.y);
    }
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const scale = (w * 0.78) / span;
    const ox = w / 2 - ((minX + maxX) / 2) * scale;
    const oy = h * 0.34 + ((minY + maxY) / 2) * scale;
    const at = (s: { x: number; y: number }) => ({ x: ox + s.x * scale, y: oy - s.y * scale });
    ctx.strokeStyle = hexToRgba(card.tint, 0.12);
    ctx.lineWidth = 2;
    for (const [a, b] of figure.lines) {
      const p = figure.stars[a];
      const q = figure.stars[b];
      if (!p || !q) continue;
      const from = at(p);
      const to = at(q);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    for (const s of figure.stars) {
      const p = at(s);
      ctx.fillStyle = hexToRgba(CREAM, 0.2 + s.mag * 0.25);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + s.mag * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Darken the edges so the type sits in the light.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  vignette.addColorStop(0, "rgba(12, 11, 10, 0)");
  vignette.addColorStop(1, "rgba(12, 11, 10, 0.7)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function paintMoon(ctx: CanvasRenderingContext2D, item: MoonItem) {
  const { x, y, r } = item;
  const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.4);
  halo.addColorStop(0, hexToRgba(CREAM, 0.16));
  halo.addColorStop(1, hexToRgba(CREAM, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a2622";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Elongation: 0 new, 180 full. Lit on the right while waxing.
  const angle = ((item.phaseAngle % 360) + 360) % 360;
  const k = Math.cos((angle * Math.PI) / 180);
  const waxing = angle < 180;
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  if (waxing) ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false);
  else ctx.arc(x, y, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  // A crescent's terminator bulges toward the lit side; a gibbous one away from it.
  if (waxing) ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
  else ctx.ellipse(x, y, Math.abs(k) * r, r, 0, -Math.PI / 2, Math.PI / 2, k > 0);
  ctx.closePath();
  ctx.fill();
}

export function paintShareCard(ctx: CanvasRenderingContext2D, card: CardLayout): void {
  paintBackdrop(ctx, card);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const item of card.items) {
    if (item.kind === "moon") {
      paintMoon(ctx, item);
      continue;
    }
    if (item.kind === "rule") {
      ctx.strokeStyle = hexToRgba(item.color, 0.28);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(item.x - item.width / 2, item.y);
      ctx.lineTo(item.x + item.width / 2, item.y);
      ctx.stroke();
      continue;
    }
    const { lines, size } = fit(ctx, item);
    const step = size * (item.lineHeight ?? 1.2);
    const top = item.y - ((lines.length - 1) * step) / 2;
    ctx.fillStyle = item.color;
    // A soft ink halo lets the constellation fall away behind the type.
    ctx.shadowColor = INK;
    ctx.shadowBlur = Math.max(12, size * 0.5);
    lines.forEach((line, i) => {
      // Letter spacing adds a trailing gap; nudge it back so tracked caps stay centred.
      const nudge = ((item.tracking ?? 0) * size) / 2;
      ctx.fillText(line, item.x + nudge, top + i * step);
    });
  }
  ctx.letterSpacing = "0px";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}
