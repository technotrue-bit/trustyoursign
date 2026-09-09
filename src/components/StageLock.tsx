import { useEffect } from "react";
import { resolveAppHeight } from "@/lib/stage-height";

const PATH_FIELD_ROOT = ".birth-chat";
/** Safari / in-app toolbars land in this band; a keyboard is much taller. */
const TOOLBAR_MAX = 140;

function isPathField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.matches("input, textarea, select")) return false;
  return Boolean(el.closest(PATH_FIELD_ROOT));
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as { standalone?: boolean }).standalone)
  );
}

/** Pin the stage to the visual viewport so iOS / in-app browsers don't leave a dead band.
 *  While BirthChat path fields are focused, freeze --app-h so the keyboard does not shrink WebGL. */
export function StageLock() {
  useEffect(() => {
    const root = document.documentElement;
    let pathFieldFocused = false;
    let frozenHeight: number | null = null;

    const apply = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv?.width ?? window.innerWidth);
      const liveH = Math.round(vv?.height ?? window.innerHeight);
      const t = Math.round(vv?.offsetTop ?? 0);
      const resolved = resolveAppHeight({
        vvHeight: liveH,
        innerHeight: window.innerHeight,
        pathFieldFocused,
        frozenHeight,
      });
      frozenHeight = resolved.nextFrozen;
      const h = resolved.height;
      const a = h > 0 ? w / h : 1;
      const rawBottom = Math.max(0, Math.round(window.innerHeight - t - liveH));
      const vvBottom =
        pathFieldFocused || isStandalone() || rawBottom > TOOLBAR_MAX ? 0 : rawBottom;
      const key = `${w}x${h}+${t}+${vvBottom}`;
      if (root.dataset.stage === key) return;
      root.dataset.stage = key;
      root.style.setProperty("--app-w", `${w}px`);
      root.style.setProperty("--app-h", `${h}px`);
      root.style.setProperty("--app-top", `${t}px`);
      root.style.setProperty("--vv-bottom", `${vvBottom}px`);
      root.style.setProperty("--app-aspect", String(Math.round(a * 1000) / 1000));
      window.dispatchEvent(new Event("resize"));
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isPathField(e.target)) return;
      if (!pathFieldFocused) {
        const vv = window.visualViewport;
        frozenHeight = Math.round(vv?.height ?? window.innerHeight);
      }
      pathFieldFocused = true;
      apply();
    };

    const onFocusOut = (e: FocusEvent) => {
      if (!isPathField(e.target)) return;
      queueMicrotask(() => {
        const active = document.activeElement;
        pathFieldFocused = isPathField(active);
        if (!pathFieldFocused) frozenHeight = null;
        apply();
      });
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);
  return null;
}
