import { buryWebGLCanvas } from "../gpu";

/** Fired once per loss. The sky listens and pauses instead of reloading. */
export const SKY_LOST_EVENT = "vault-webgl-lost";
/** Fired after a fresh canvas has been drawing long enough to trust. */
export const SKY_READY_EVENT = "vault-webgl-ready";

/**
 * How many losses we absorb with “tap to retry” before giving the visitor
 * the flat sky. The count includes the loss that opened the pause.
 */
export const SKY_LOST_RETRY_LIMIT = 3;

export function skyAfterContextLost(strikes: number): "retry" | "flat" {
  if (strikes >= SKY_LOST_RETRY_LIMIT) return "flat";
  return "retry";
}

let lastLostAt = 0;

/**
 * Keep the context restorable and hide the dead canvas before it flashes
 * white. The window and the canvas both hear the same loss — only the first
 * one opens the pause.
 */
export function acknowledgeContextLost(event: Event, canvas?: HTMLCanvasElement | null) {
  if (event.cancelable) event.preventDefault();
  const el = canvas ?? (event.target instanceof HTMLCanvasElement ? event.target : null);
  if (el && el.closest(".canvas-root")) buryWebGLCanvas(el);
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastLostAt < 500) return;
  lastLostAt = now;
  window.dispatchEvent(new Event(SKY_LOST_EVENT));
}

/** Test helper — the debounce must not leak between cases. */
export function resetContextLostForTests() {
  lastLostAt = 0;
}
