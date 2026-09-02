import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace } from "three";

type AnchorX = "left" | "center" | "right";
type AnchorY = "top" | "middle" | "bottom" | "top-baseline" | "bottom-baseline";

type Props = {
  children?: ReactNode;
  fontSize?: number;
  color?: string;
  anchorX?: AnchorX;
  anchorY?: AnchorY;
  letterSpacing?: number;
  maxWidth?: number;
  textAlign?: string;
  position?: [number, number, number];
};

type Entry = { tex: CanvasTexture; mat: SpriteMaterial; aspect: number };

const cache = new Map<string, Entry>();

function asText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(asText).join("");
  return "";
}

function getLabel(text: string, color: string): Entry {
  const key = `${text}\0${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pad = 12;
  const fontPx = 64;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `600 ${fontPx}px "Fraunces", "Iowan Old Style", Palatino, Georgia, serif`;
  ctx.font = font;
  const tw = Math.ceil(ctx.measureText(text).width);
  const th = Math.ceil(fontPx * 1.35);
  canvas.width = Math.max(2, tw + pad * 2);
  canvas.height = Math.max(2, th + pad * 2);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const entry = { tex, mat, aspect: canvas.width / canvas.height };
  cache.set(key, entry);
  return entry;
}

/** Canvas sprites — no troika SDF atlas, no ReadPixels stall. */
export function Label({
  children,
  fontSize = 0.16,
  color = "#efe8dc",
  anchorX = "center",
  anchorY = "middle",
  position,
}: Props) {
  const text = asText(children);
  const sprite = useRef<Sprite>(null);
  const entry = useMemo(() => (text ? getLabel(text, color) : null), [text, color]);
  const cx = anchorX === "left" ? 0 : anchorX === "right" ? 1 : 0.5;
  const cy =
    anchorY === "bottom" || anchorY === "bottom-baseline"
      ? 0
      : anchorY === "top" || anchorY === "top-baseline"
        ? 1
        : 0.5;

  useLayoutEffect(() => {
    const s = sprite.current;
    if (!s || !entry) return;
    s.center.set(cx, cy);
    const h = fontSize * 1.35;
    s.scale.set(h * entry.aspect, h, 1);
    if (position) s.position.set(position[0], position[1], position[2]);
  }, [entry, fontSize, cx, cy, position]);

  if (!text || !entry) return null;
  return <sprite ref={sprite} material={entry.mat} frustumCulled={false} />;
}
