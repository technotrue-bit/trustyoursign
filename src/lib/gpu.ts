/** One probe, then cache. Software GL (SwiftShader / llvmpipe) is a small GPU. */

let probed = false;
let webglOk = false;
let small = false;
let software = false;

const DPR_APPLE: [number, number] = Object.freeze([1, 1]) as [number, number];
const DPR_SMALL: [number, number] = Object.freeze([1, 1.15]) as [number, number];
const DPR_FULL: [number, number] = Object.freeze([1, 1.5]) as [number, number];

const SOFT_GPU =
  /swiftshader|llvmpipe|softpipe|microsoft basic render|software rasterizer|gdi generic/i;

export function isAppleTouch(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function probe(): void {
  if (probed) return;
  probed = true;
  if (typeof document === "undefined") {
    webglOk = false;
    small = true;
    return;
  }
  const apple = isAppleTouch();
  const touchNarrow =
    typeof navigator !== "undefined" &&
    navigator.maxTouchPoints > 0 &&
    typeof window !== "undefined" &&
    window.innerWidth < 720;

  // iOS: never create-and-kill a throwaway context. Safari shares a tiny
  // GPU budget; WEBGL_lose_context on a probe canvas can take the real one with it.
  if (apple) {
    webglOk = true;
    small = true;
    software = false;
    return;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false, alpha: true }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false, alpha: true });
    if (!gl) {
      webglOk = false;
      small = true;
      software = true;
      return;
    }
    webglOk = true;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "") : "";
    software = SOFT_GPU.test(renderer);
    small = software || touchNarrow;
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    webglOk = false;
    small = true;
    software = true;
  }
}

export function isSoftwareGpu(): boolean {
  probe();
  return software;
}

export function isSmallGpu(): boolean {
  probe();
  return small;
}

export function canWebGL(): boolean {
  probe();
  return webglOk;
}

export function canvasDpr(): [number, number] {
  probe();
  if (isAppleTouch()) return DPR_APPLE;
  if (small) return DPR_SMALL;
  return DPR_FULL;
}

/** One sky everywhere. Width / touch used to force a 2D fork — that made the
 *  phone (and the Grok preview pane) a different product. 2D is only the
 *  tripwire after WebGL actually fails; we never remount a dead context. */
export function shouldUse3D(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return canWebGL();
}

/** Transparent canvas so a lost context never composites as Safari-white. */
export function glContextAttrs(): WebGLContextAttributes {
  const modest = isSmallGpu() || isAppleTouch();
  return {
    alpha: true,
    antialias: !modest,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: modest ? "low-power" : "default",
    failIfMajorPerformanceCaveat: false,
  };
}

/** Hide a dead GL canvas before Safari paints it white. Never restore it. */
export function buryWebGLCanvas(el: EventTarget | null) {
  if (!(el instanceof HTMLCanvasElement)) return;
  el.style.display = "none";
  el.style.visibility = "hidden";
  el.style.opacity = "0";
  el.style.background = "#0c0b0a";
  el.style.zIndex = "-1";
  try {
    el.width = 1;
    el.height = 1;
  } catch {
    /* already gone */
  }
}
