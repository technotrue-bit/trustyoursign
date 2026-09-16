import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

/**
 * Round star sprites for `pointsMaterial`.
 *
 * A `points` material with no `map` draws `gl_PointCoord`-square dots — the
 * field's node markers read as little squares, which is a defect, not a style.
 * One shared canvas texture per look keeps this cheap.
 */
const cache = new Map<string, CanvasTexture>();

function make(size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (ctx) paint(ctx, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/** Soft orb: hot centre, quick falloff, wide faint halo. */
export function starSprite(): CanvasTexture {
  const hit = cache.get("star");
  if (hit) return hit;
  const tex = make(128, (ctx, s) => {
    const r = s / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.12, "rgba(255,248,236,0.96)");
    g.addColorStop(0.26, "rgba(255,240,214,0.42)");
    g.addColorStop(0.5, "rgba(255,236,206,0.1)");
    g.addColorStop(1, "rgba(255,236,206,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  cache.set("star", tex);
  return tex;
}

/** Bright node: orb plus soft diffraction cross, the way a real bright star blooms. */
export function starSpikeSprite(): CanvasTexture {
  const hit = cache.get("spike");
  if (hit) return hit;
  const tex = make(256, (ctx, s) => {
    const r = s / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.1, "rgba(255,250,240,0.9)");
    g.addColorStop(0.24, "rgba(255,244,222,0.3)");
    g.addColorStop(0.55, "rgba(255,240,214,0.07)");
    g.addColorStop(1, "rgba(255,240,214,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.globalCompositeOperation = "lighter";
    const spike = ctx.createLinearGradient(0, r, s, r);
    spike.addColorStop(0, "rgba(255,248,236,0)");
    spike.addColorStop(0.5, "rgba(255,248,236,0.5)");
    spike.addColorStop(1, "rgba(255,248,236,0)");
    ctx.fillStyle = spike;
    ctx.fillRect(0, r - 1.5, s, 3);
    const spikeV = ctx.createLinearGradient(r, 0, r, s);
    spikeV.addColorStop(0, "rgba(255,248,236,0)");
    spikeV.addColorStop(0.5, "rgba(255,248,236,0.5)");
    spikeV.addColorStop(1, "rgba(255,248,236,0)");
    ctx.fillStyle = spikeV;
    ctx.fillRect(r - 1.5, 0, 3, s);
    ctx.globalCompositeOperation = "source-over";
  });
  cache.set("spike", tex);
  return tex;
}
