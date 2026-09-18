/**
 * Browser-safe PWA chrome constants (no Node builtins).
 * Imported by the React document shell and by grok-pwa-shared.mjs.
 */
export const PWA_THEME_COLOR = "#0c0b0a";
export const PWA_STATUS_BAR_STYLE = "black-translucent";

/** Manifest + apple-touch icons under public/__grok/. */
export const PWA_ICON_PATHS = {
  appleTouch: "/__grok/icon-180.png",
  any192: "/__grok/icon-192.png",
  any512: "/__grok/icon-512.png",
  maskable512: "/__grok/icon-512-maskable.png",
};
