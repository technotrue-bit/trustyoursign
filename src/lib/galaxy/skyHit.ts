/**
 * Primary chrome must win a tap even when the WebGL canvas is the browser's
 * hit target. Stacking puts the buttons above the canvas; this is the
 * backstop for the GPUs that still deliver the event to the canvas.
 */

export const SKY_CHROME_SELECTOR =
  "[data-sky-cta], button, a, summary, input, textarea, select, label, [role='button'], [role='menuitem']";

const CANVAS_SELECTOR = ".canvas-root, canvas";
const TAP_SLOP = 12;

type HitNode = {
  closest: (selector: string) => HitNode | null;
  hasAttribute?: (name: string) => boolean;
  getAttribute?: (name: string) => string | null;
};

function asHitNode(target: EventTarget | null): HitNode | null {
  const el = target as HitNode | null;
  if (!el || typeof el.closest !== "function") return null;
  return el;
}

/** The chrome control under this node, or null when it is inert or disabled. */
export function skyChromeOf(target: EventTarget | null): HitNode | null {
  const el = asHitNode(target);
  if (!el) return null;
  const chrome = el.closest(SKY_CHROME_SELECTOR);
  if (!chrome) return null;
  if (chrome.closest("[inert]")) return null;
  if (chrome.hasAttribute?.("disabled")) return null;
  if (chrome.getAttribute?.("aria-disabled") === "true") return null;
  return chrome;
}

export function tapWithinSlop(dx: number, dy: number, slop = TAP_SLOP) {
  return dx * dx + dy * dy <= slop * slop;
}

/**
 * The canvas stole a tap meant for chrome when the event target is the sky
 * and, with the canvas taken out of hit testing, a control sits at that point.
 * Returns null when the event already landed on that control.
 */
export function stolenSkyChrome(top: EventTarget | null, under: EventTarget | null): HitNode | null {
  if (skyChromeOf(top)) return null;
  const chrome = skyChromeOf(under);
  if (!chrome) return null;
  const topNode = asHitNode(top);
  const onCanvas = Boolean(topNode?.closest(CANVAS_SELECTOR));
  if (!onCanvas) return null;
  return chrome;
}

function punchCanvas(x: number, y: number): Element | null {
  const nodes = [...document.querySelectorAll(".canvas-root, .canvas-root *")].filter(
    (n): n is HTMLElement => n instanceof HTMLElement,
  );
  const prev = nodes.map((n) => [n, n.style.pointerEvents] as const);
  for (const n of nodes) n.style.pointerEvents = "none";
  try {
    return document.elementFromPoint(x, y);
  } finally {
    for (const [n, pe] of prev) n.style.pointerEvents = pe;
  }
}

function setCanvasPointer(value: string) {
  for (const n of document.querySelectorAll(".canvas-root, .canvas-root canvas")) {
    if (n instanceof HTMLElement) n.style.pointerEvents = value;
  }
}

let bound = false;

/** Capture-phase backstop. Registered before fly input so a stolen tap never starts a drag. */
export function ensureSkyHit() {
  if (typeof window === "undefined" || bound) return;
  bound = true;

  let armed: { id: number; x: number; y: number; el: HTMLElement } | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (skyChromeOf(e.target)) return;
    if (!asHitNode(e.target)?.closest(CANVAS_SELECTOR)) return;
    const under = punchCanvas(e.clientX, e.clientY);
    const chrome = stolenSkyChrome(e.target, under);
    if (!chrome || !(chrome instanceof HTMLElement)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setCanvasPointer("none");
    armed = { id: e.pointerId, x: e.clientX, y: e.clientY, el: chrome };
  };

  const onUp = (e: PointerEvent) => {
    const hit = armed;
    if (!hit || hit.id !== e.pointerId) return;
    armed = null;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.setTimeout(() => setCanvasPointer(""), 0);
    if (!tapWithinSlop(e.clientX - hit.x, e.clientY - hit.y)) return;
    if (!hit.el.isConnected) return;
    hit.el.click();
  };

  const onCancel = (e: PointerEvent) => {
    if (!armed || armed.id !== e.pointerId) return;
    armed = null;
    setCanvasPointer("");
  };

  window.addEventListener("pointerdown", onDown, { capture: true, passive: false });
  window.addEventListener("pointerup", onUp, { capture: true, passive: false });
  window.addEventListener("pointercancel", onCancel, { capture: true });
}
